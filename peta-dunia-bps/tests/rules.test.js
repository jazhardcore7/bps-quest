import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

const PROJECT_ID = 'demo-bps-rules-test';
const RULES = fs.readFileSync('firestore.rules', 'utf8');

describe('Firestore Security Rules', () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: RULES,
        host: '127.0.0.1',
        port: 8080
      }
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();

      // Seed allowlist, units, quests, and initial users with admin context
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();

        // 1. Seed allowlist
        await setDoc(doc(adminDb, 'allowedEmails', 'budi@bps.go.id'), {
          displayName: 'Budi Santoso',
          unit: 'biro-sdm',
          role: 'employee'
        });
        await setDoc(doc(adminDb, 'allowedEmails', 'admin@bps.go.id'), {
          displayName: 'Admin Utama',
          unit: 'biro-sdm',
          role: 'admin'
        });
        await setDoc(doc(adminDb, 'allowedEmails', 'umum@bps.go.id'), {
          displayName: 'Pegawai Umum',
          unit: 'biro-umum',
          role: 'employee'
        });

        // 2. Seed unit
        await setDoc(doc(adminDb, 'units', 'biro-sdm'), {
          name: 'Biro Sumber Daya Manusia',
          parentUnit: 'Sekretariat Utama',
          description: 'Biro SDM BPS',
          level: 2
        });

        // 3. Seed active quest
        await setDoc(doc(adminDb, 'quests', 'quest-daily-1'), {
          unitId: 'biro-sdm',
          title: '[Judul quest 1] Presensi Harian',
          description: 'Isi presensi tepat waktu',
          type: 'daily',
          xp: 20,
          active: true
        });

        await setDoc(doc(adminDb, 'quests', 'quest-checkpoint-1'), {
          unitId: 'biro-sdm',
          title: '[Judul quest 2] Pola Karir',
          description: 'Kuis pola karir',
          type: 'checkpoint',
          xp: 50,
          active: true,
          quiz: {
            question: 'Apa prinsip sistem merit?',
            options: ['Kualifikasi dan kinerja', 'Senioritas semata'],
            correctIndex: 0
          }
        });

        // 4. Seed user docs
        await setDoc(doc(adminDb, 'users', 'uid_budi'), {
          displayName: 'Budi Santoso',
          email: 'budi@bps.go.id',
          unit: 'biro-sdm',
          role: 'employee',
          xp: 0,
          level: 1,
          avatarId: 'default',
          weekKey: '2026-W46',
          xpWeek: 0,
          monthKey: '2026-11',
          xpMonth: 0,
          createdAt: new Date()
        });

        await setDoc(doc(adminDb, 'users', 'uid_admin'), {
          displayName: 'Admin Utama',
          email: 'admin@bps.go.id',
          unit: 'biro-sdm',
          role: 'admin',
          xp: 0,
          level: 1,
          avatarId: 'default',
          weekKey: '2026-W46',
          xpWeek: 0,
          monthKey: '2026-11',
          xpMonth: 0,
          createdAt: new Date()
        });

        await setDoc(doc(adminDb, 'users', 'uid_umum'), {
          displayName: 'Pegawai Umum',
          email: 'umum@bps.go.id',
          unit: 'biro-umum',
          role: 'employee',
          xp: 0,
          level: 1,
          avatarId: 'default',
          weekKey: '2026-W46',
          xpWeek: 0,
          monthKey: '2026-11',
          xpMonth: 0,
          createdAt: new Date()
        });
      });
    }
  });

  describe('Quests and Units Permissions', () => {
    it('allows signed-in users to read quests and units', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      const qSnap = await assertSucceeds(getDoc(doc(db, 'quests', 'quest-daily-1')));
      assert.equal(qSnap.exists(), true);
      const uSnap = await assertSucceeds(getDoc(doc(db, 'units', 'biro-sdm')));
      assert.equal(uSnap.exists(), true);
    });

    it('denies non-admin users from creating or updating quests and units', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertFails(setDoc(doc(db, 'quests', 'quest-new'), {
        unitId: 'biro-sdm',
        xp: 100
      }));
      await assertFails(updateDoc(doc(db, 'units', 'biro-sdm'), {
        level: 3
      }));
    });

    it('allows admin users to write quests and units', async () => {
      const db = testEnv.authenticatedContext('uid_admin', { email: 'admin@bps.go.id' }).firestore();
      await assertSucceeds(setDoc(doc(db, 'quests', 'quest-admin-created'), {
        unitId: 'biro-sdm',
        title: 'Quest Baru Admin',
        xp: 25,
        active: true
      }));
    });
  });

  describe('Quest Claiming and Tamper Resistance', () => {
    it('allows valid atomic quest claim batch (completion + user progression update)', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      const completionId = 'uid_budi_quest-daily-1_2026-11-09';
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_budi');

      const batch = writeBatch(db);
      batch.set(compRef, {
        uid: 'uid_budi',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: '2026-11-09',
        createdAt: serverTimestamp()
      });
      batch.update(userRef, {
        xp: 20,
        level: 1,
        weekKey: '2026-W46',
        xpWeek: 20,
        monthKey: '2026-11',
        xpMonth: 20,
        lastCompletionId: completionId
      });

      await assertSucceeds(batch.commit());
    });

    it('denies claim batch with altered/tampered XP amount', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      const completionId = 'uid_budi_quest-daily-1_2026-11-09';
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_budi');

      // Attempting to inflate XP to 999 instead of 20
      const batch = writeBatch(db);
      batch.set(compRef, {
        uid: 'uid_budi',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 999, // Mismatched with quest.xp (20)
        periodKey: '2026-11-09',
        createdAt: serverTimestamp()
      });
      batch.update(userRef, {
        xp: 999,
        level: 2,
        weekKey: '2026-W46',
        xpWeek: 999,
        monthKey: '2026-11',
        xpMonth: 999,
        lastCompletionId: completionId
      });

      await assertFails(batch.commit());
    });

    it('denies claim for another user (uid mismatch)', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      const completionId = 'uid_admin_quest-daily-1_2026-11-09';
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_admin');

      const batch = writeBatch(db);
      batch.set(compRef, {
        uid: 'uid_admin', // Mismatched auth uid!
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: '2026-11-09',
        createdAt: serverTimestamp()
      });
      batch.update(userRef, {
        xp: 20,
        level: 1,
        weekKey: '2026-W46',
        xpWeek: 20,
        monthKey: '2026-11',
        xpMonth: 20,
        lastCompletionId: completionId
      });

      await assertFails(batch.commit());
    });

    it('denies claim by a user from another unit (unitId mismatch)', async () => {
      // uid_umum belongs to 'biro-umum', quest belongs to 'biro-sdm'
      const db = testEnv.authenticatedContext('uid_umum', { email: 'umum@bps.go.id' }).firestore();
      const completionId = 'uid_umum_quest-daily-1_2026-11-09';
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_umum');

      const batch = writeBatch(db);
      batch.set(compRef, {
        uid: 'uid_umum',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: '2026-11-09',
        createdAt: serverTimestamp()
      });
      batch.update(userRef, {
        xp: 20,
        level: 1,
        weekKey: '2026-W46',
        xpWeek: 20,
        monthKey: '2026-11',
        xpMonth: 20,
        lastCompletionId: completionId
      });

      await assertFails(batch.commit());
    });

    it('denies duplicate claim for the same periodKey', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      const completionId = 'uid_budi_quest-daily-1_2026-11-09';
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_budi');

      // First claim succeeds
      const batch1 = writeBatch(db);
      batch1.set(compRef, {
        uid: 'uid_budi',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: '2026-11-09',
        createdAt: serverTimestamp()
      });
      batch1.update(userRef, {
        xp: 20,
        level: 1,
        weekKey: '2026-W46',
        xpWeek: 20,
        monthKey: '2026-11',
        xpMonth: 20,
        lastCompletionId: completionId
      });
      await assertSucceeds(batch1.commit());

      // Second claim with identical periodKey MUST fail
      const batch2 = writeBatch(db);
      batch2.set(compRef, {
        uid: 'uid_budi',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: '2026-11-09',
        createdAt: serverTimestamp()
      });
      batch2.update(userRef, {
        xp: 40,
        level: 1,
        weekKey: '2026-W46',
        xpWeek: 40,
        monthKey: '2026-11',
        xpMonth: 40,
        lastCompletionId: completionId
      });
      await assertFails(batch2.commit());
    });

    it('denies direct XP edit without completion creation', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      const userRef = doc(db, 'users', 'uid_budi');

      // Direct client update without creating a completion doc
      await assertFails(updateDoc(userRef, {
        xp: 100,
        level: 1
      }));
    });

    it('correctly handles week rollover when claiming quest', async () => {
      // Seed user with past weekKey (Week 45)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'users', 'uid_budi'), {
          displayName: 'Budi Santoso',
          email: 'budi@bps.go.id',
          unit: 'biro-sdm',
          role: 'employee',
          xp: 100,
          level: 1,
          avatarId: 'default',
          weekKey: '2026-W45', // Past week
          xpWeek: 100,
          monthKey: '2026-11',
          xpMonth: 100,
          createdAt: new Date()
        });
      });

      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      const completionId = 'uid_budi_quest-daily-1_2026-11-09';
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_budi');

      const batch = writeBatch(db);
      batch.set(compRef, {
        uid: 'uid_budi',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: '2026-11-09',
        createdAt: serverTimestamp()
      });
      batch.update(userRef, {
        xp: 120, // 100 + 20
        level: 1,
        weekKey: '2026-W46', // Rollover to new week
        xpWeek: 20, // Resets to quest.xp (20)
        monthKey: '2026-11', // Month unchanged
        xpMonth: 120, // 100 + 20
        lastCompletionId: completionId
      });

      await assertSucceeds(batch.commit());
    });
  });

  describe('Users Collection Allowlist & Protected Field Controls', () => {
    it('denies client from updating protected fields (role, unit, email)', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertFails(updateDoc(doc(db, 'users', 'uid_budi'), { role: 'admin' }));
      await assertFails(updateDoc(doc(db, 'users', 'uid_budi'), { unit: 'biro-umum' }));
      await assertFails(updateDoc(doc(db, 'users', 'uid_budi'), { email: 'hacked@bps.go.id' }));
    });

    it('allows client to update avatarId without XP changes', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertSucceeds(updateDoc(doc(db, 'users', 'uid_budi'), { avatarId: 'avatar-blue' }));
    });
  });
});
