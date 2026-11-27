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
import { dailyPeriodKeyJakarta } from '../src/config.js';

const PROJECT_ID = 'demo-bps-rules-test';
// Daily claims are only valid for the current Asia/Jakarta date (firestore.rules).
const TODAY = dailyPeriodKeyJakarta(new Date());
const RULES = fs.readFileSync('firestore.rules', 'utf8');
const STRUCTURE = JSON.parse(fs.readFileSync('src/data/bps-structure.json', 'utf8'));

async function assertDenied(promise) {
  let caught;
  try {
    await promise;
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, 'Expected operation to fail with permission-denied, but it succeeded');
  assert.equal(caught.code, 'permission-denied', `Expected permission-denied, got ${caught.code}: ${caught.message}`);
  return caught;
}

function unitPathFor(unitId) {
  const unit = STRUCTURE.units.find((u) => u.id === unitId);
  return unit ? [...unit.ancestorIds, unitId] : [unitId];
}

function makeUser(overrides) {
  const unit = overrides.unit || 'biro-sdm';
  return {
    displayName: 'Pegawai Uji',
    email: 'uji@bps.go.id',
    unit,
    unitPath: unitPathFor(unit),
    role: 'employee',
    active: true,
    xp: 0,
    level: 1,
    avatarId: 'default',
    weekKey: '2026-W46',
    xpWeek: 0,
    monthKey: '2026-11',
    xpMonth: 0,
    createdAt: new Date(),
    ...overrides
  };
}

function makeDailyQuest(overrides = {}) {
  return {
    unitId: 'biro-sdm',
    title: 'Quest Harian Uji',
    description: 'Deskripsi quest harian',
    type: 'daily',
    xp: 25,
    active: true,
    createdBy: 'uid_admin',
    createdAt: serverTimestamp(),
    updatedBy: 'uid_admin',
    updatedAt: serverTimestamp(),
    ...overrides
  };
}

function makeCheckpointQuest(overrides = {}) {
  return {
    unitId: 'biro-sdm',
    title: 'Quest Kuis Uji',
    description: 'Deskripsi quest kuis',
    type: 'checkpoint',
    xp: 50,
    active: true,
    quiz: {
      question: 'Apa tugas utama unit ini?',
      options: ['Opsi A', 'Opsi B'],
      correctIndex: 0
    },
    createdBy: 'uid_admin',
    createdAt: serverTimestamp(),
    updatedBy: 'uid_admin',
    updatedAt: serverTimestamp(),
    ...overrides
  };
}

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
          email: 'budi@bps.go.id',
          displayName: 'Budi Santoso',
          unit: 'biro-sdm',
          role: 'employee',
          active: true
        });
        await setDoc(doc(adminDb, 'allowedEmails', 'admin@bps.go.id'), {
          email: 'admin@bps.go.id',
          displayName: 'Admin Utama',
          unit: 'biro-sdm',
          role: 'admin',
          active: true
        });
        await setDoc(doc(adminDb, 'allowedEmails', 'umum@bps.go.id'), {
          email: 'umum@bps.go.id',
          displayName: 'Pegawai Umum',
          unit: 'biro-umum',
          role: 'employee',
          active: true
        });
        await setDoc(doc(adminDb, 'allowedEmails', 'superadmin@bps.go.id'), {
          email: 'superadmin@bps.go.id',
          displayName: 'Super Admin',
          unit: 'bps-pusat',
          role: 'super_admin',
          active: true
        });
        await setDoc(doc(adminDb, 'allowedEmails', 'inactive@bps.go.id'), {
          email: 'inactive@bps.go.id',
          displayName: 'Pegawai Nonaktif',
          unit: 'biro-sdm',
          role: 'employee',
          active: false
        });

        // 2. Seed units from bps-structure.json
        for (const u of STRUCTURE.units) {
          await setDoc(doc(adminDb, 'units', u.id), {
            ...u,
            archived: false,
            announcements: []
          });
        }

        // 3. Seed active quests
        await setDoc(doc(adminDb, 'quests', 'quest-daily-1'), {
          unitId: 'biro-sdm',
          title: 'Presensi Harian',
          description: 'Isi presensi tepat waktu',
          type: 'daily',
          xp: 20,
          active: true,
          createdBy: 'uid_admin',
          createdAt: new Date()
        });

        await setDoc(doc(adminDb, 'quests', 'quest-checkpoint-1'), {
          unitId: 'biro-sdm',
          title: 'Pola Karir Pegawai',
          description: 'Kuis pola karir',
          type: 'checkpoint',
          xp: 50,
          active: true,
          quiz: {
            question: 'Apa prinsip sistem merit?',
            options: ['Kualifikasi dan kinerja', 'Senioritas semata'],
            correctIndex: 0
          },
          createdBy: 'uid_admin',
          createdAt: new Date()
        });

        await setDoc(doc(adminDb, 'quests', 'quest-harga-1'), {
          unitId: 'dir-harga',
          title: 'Pemantauan Harga Konsumen',
          description: 'Survei harga harian',
          type: 'daily',
          xp: 20,
          active: true,
          createdBy: 'uid_head_e2_harga',
          createdAt: new Date()
        });

        // 4. Seed user docs across all roles
        await setDoc(doc(adminDb, 'users', 'uid_budi'), makeUser({
          displayName: 'Budi Santoso',
          email: 'budi@bps.go.id',
          unit: 'biro-sdm',
          role: 'employee'
        }));
        await setDoc(doc(adminDb, 'users', 'uid_admin'), makeUser({
          displayName: 'Admin Utama',
          email: 'admin@bps.go.id',
          unit: 'biro-sdm',
          role: 'admin'
        }));
        await setDoc(doc(adminDb, 'users', 'uid_umum'), makeUser({
          displayName: 'Pegawai Umum',
          email: 'umum@bps.go.id',
          unit: 'biro-umum',
          role: 'employee'
        }));
        await setDoc(doc(adminDb, 'users', 'uid_super_admin'), makeUser({
          displayName: 'Super Admin',
          email: 'superadmin@bps.go.id',
          unit: 'bps-pusat',
          role: 'super_admin'
        }));
        await setDoc(doc(adminDb, 'users', 'uid_head_top'), makeUser({
          displayName: 'Kepala BPS',
          email: 'kepala@bps.go.id',
          unit: 'bps-pusat',
          role: 'head_top'
        }));
        await setDoc(doc(adminDb, 'users', 'uid_head_e1'), makeUser({
          displayName: 'Sekretaris Utama',
          email: 'sestama@bps.go.id',
          unit: 'sestama',
          role: 'head_e1'
        }));
        await setDoc(doc(adminDb, 'users', 'uid_head_e2_sdm'), makeUser({
          displayName: 'Kepala Biro SDM',
          email: 'karo.sdm@bps.go.id',
          unit: 'biro-sdm',
          role: 'head_e2'
        }));
        await setDoc(doc(adminDb, 'users', 'uid_head_e2_harga'), makeUser({
          displayName: 'Direktur Statistik Harga',
          email: 'dir.harga@bps.go.id',
          unit: 'dir-harga',
          role: 'head_e2'
        }));
        await setDoc(doc(adminDb, 'users', 'uid_inactive'), makeUser({
          displayName: 'Pegawai Nonaktif',
          email: 'inactive@bps.go.id',
          unit: 'biro-sdm',
          role: 'employee',
          active: false
        }));
      });
    }
  });

  describe('Quests and Units Permissions', () => {
    it('allows signed-in users to read quests and units', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      const qSnap = await assertSucceeds(getDoc(doc(db, 'quests', 'quest-daily-1')));
      assert.equal(qSnap.exists(), true);
      const uSnap = await assertSucceeds(getDoc(doc(db, 'units', 'biro-sdm')));
      assert.equal(uSnap.exists(), true);
    });

    it('denies non-admin users from creating or updating quests and units', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertDenied(setDoc(doc(db, 'quests', 'quest-new'), makeDailyQuest({ createdBy: 'uid_budi' })));
      await assertDenied(updateDoc(doc(db, 'units', 'biro-sdm'), {
        summary: 'Diubah pegawai'
      }));
    });

    it('allows admin users to write quests and units', async () => {
      const db = testEnv.authenticatedContext('uid_admin', { email: 'admin@bps.go.id', email_verified: true }).firestore();
      await assertSucceeds(setDoc(doc(db, 'quests', 'quest-admin-created'), makeDailyQuest({
        title: 'Quest Baru Admin',
        createdBy: 'uid_admin'
      })));
      await assertSucceeds(updateDoc(doc(db, 'units', 'biro-sdm'), {
        summary: 'Profil Biro SDM diperbarui oleh admin',
        updatedBy: 'uid_admin',
        updatedAt: serverTimestamp()
      }));
    });
  });

  describe('Quest Claiming and Tamper Resistance', () => {
    it('allows valid atomic quest claim batch (completion + user progression update)', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      const completionId = 'uid_budi_quest-daily-1_' + TODAY;
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_budi');

      const batch = writeBatch(db);
      batch.set(compRef, {
        uid: 'uid_budi',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: TODAY,
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
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      const completionId = 'uid_budi_quest-daily-1_' + TODAY;
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_budi');

      const batch = writeBatch(db);
      batch.set(compRef, {
        uid: 'uid_budi',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 999,
        periodKey: TODAY,
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
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      const completionId = 'uid_admin_quest-daily-1_' + TODAY;
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_admin');

      const batch = writeBatch(db);
      batch.set(compRef, {
        uid: 'uid_admin',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: TODAY,
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
      const db = testEnv.authenticatedContext('uid_umum', { email: 'umum@bps.go.id', email_verified: true }).firestore();
      const completionId = 'uid_umum_quest-daily-1_' + TODAY;
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_umum');

      const batch = writeBatch(db);
      batch.set(compRef, {
        uid: 'uid_umum',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: TODAY,
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
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      const completionId = 'uid_budi_quest-daily-1_' + TODAY;
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_budi');

      const batch1 = writeBatch(db);
      batch1.set(compRef, {
        uid: 'uid_budi',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: TODAY,
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

      const batch2 = writeBatch(db);
      batch2.set(compRef, {
        uid: 'uid_budi',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: TODAY,
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

    function claimBatch(db, questId, xp, periodKey) {
      const completionId = 'uid_budi_' + questId + '_' + periodKey;
      const batch = writeBatch(db);
      batch.set(doc(db, 'completions', completionId), {
        uid: 'uid_budi',
        questId,
        unitId: 'biro-sdm',
        xp,
        periodKey,
        createdAt: serverTimestamp()
      });
      batch.update(doc(db, 'users', 'uid_budi'), {
        xp,
        level: 1,
        weekKey: '2026-W46',
        xpWeek: xp,
        monthKey: '2026-11',
        xpMonth: xp,
        lastCompletionId: completionId
      });
      return batch;
    }

    it('denies a daily claim whose periodKey is not today (Jakarta)', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertFails(claimBatch(db, 'quest-daily-1', 20, '2020-01-01').commit());
      await assertFails(claimBatch(db, 'quest-daily-1', 20, 'once').commit());
      await assertFails(claimBatch(db, 'quest-daily-1', 20, TODAY + 'x').commit());
    });

    it('allows a checkpoint claim only with periodKey "once"', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertFails(claimBatch(db, 'quest-checkpoint-1', 50, 'once-lagi').commit());
      await assertFails(claimBatch(db, 'quest-checkpoint-1', 50, TODAY).commit());
      await assertSucceeds(claimBatch(db, 'quest-checkpoint-1', 50, 'once').commit());
    });

    it('denies direct XP edit without completion creation', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      const userRef = doc(db, 'users', 'uid_budi');

      await assertFails(updateDoc(userRef, {
        xp: 100,
        level: 1
      }));
    });

    it('correctly handles week rollover when claiming quest', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'users', 'uid_budi'), makeUser({
          displayName: 'Budi Santoso',
          email: 'budi@bps.go.id',
          unit: 'biro-sdm',
          role: 'employee',
          xp: 100,
          level: 1,
          weekKey: '2026-W45',
          xpWeek: 100,
          monthKey: '2026-11',
          xpMonth: 100
        }));
      });

      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      const completionId = 'uid_budi_quest-daily-1_' + TODAY;
      const compRef = doc(db, 'completions', completionId);
      const userRef = doc(db, 'users', 'uid_budi');

      const batch = writeBatch(db);
      batch.set(compRef, {
        uid: 'uid_budi',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: TODAY,
        createdAt: serverTimestamp()
      });
      batch.update(userRef, {
        xp: 120,
        level: 1,
        weekKey: '2026-W46',
        xpWeek: 20,
        monthKey: '2026-11',
        xpMonth: 120,
        lastCompletionId: completionId
      });

      await assertSucceeds(batch.commit());
    });
  });

  describe('Users Collection Allowlist & Protected Field Controls', () => {
    function newProfile(displayName, overrides = {}) {
      return {
        displayName,
        email: 'budi@bps.go.id',
        unit: 'biro-sdm',
        unitPath: unitPathFor('biro-sdm'),
        role: 'employee',
        active: true,
        xp: 0,
        level: 1,
        avatarId: 'default',
        weekKey: '2026-W46',
        xpWeek: 0,
        monthKey: '2026-11',
        xpMonth: 0,
        createdAt: serverTimestamp(),
        ...overrides
      };
    }

    it('allows client to create user document if email matches allowlist', async () => {
      const db = testEnv.authenticatedContext('uid_new_user', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertSucceeds(setDoc(doc(db, 'users', 'uid_new_user'), newProfile('Budi Santoso')));
    });

    it('denies creating a user document before the email is verified', async () => {
      const db = testEnv.authenticatedContext('uid_unverified', { email: 'budi@bps.go.id', email_verified: false }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'uid_unverified'), newProfile('Budi Santoso')));
    });

    it('denies admin writes from an unverified admin token', async () => {
      const db = testEnv.authenticatedContext('uid_admin', { email: 'admin@bps.go.id', email_verified: false }).firestore();
      await assertFails(setDoc(doc(db, 'quests', 'quest-from-unverified'), makeDailyQuest({
        xp: 100,
        createdBy: 'uid_admin'
      })));
    });

    it('denies client from creating user document if email is NOT in allowlist', async () => {
      const db = testEnv.authenticatedContext('uid_stranger', { email: 'stranger@gmail.com', email_verified: true }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'uid_stranger'), newProfile('Stranger', {
        email: 'stranger@gmail.com'
      })));
    });

    it('denies client from creating user document with mismatched unit or role', async () => {
      const db = testEnv.authenticatedContext('uid_cheat', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'uid_cheat'), newProfile('Budi Hacker', {
        role: 'admin'
      })));
    });

    it('denies client from updating protected fields (role, unit, email)', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertFails(updateDoc(doc(db, 'users', 'uid_budi'), { role: 'admin' }));
      await assertFails(updateDoc(doc(db, 'users', 'uid_budi'), { unit: 'biro-umum' }));
      await assertFails(updateDoc(doc(db, 'users', 'uid_budi'), { email: 'hacked@bps.go.id' }));
    });

    it('allows client to update avatarId without XP changes', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertSucceeds(updateDoc(doc(db, 'users', 'uid_budi'), { avatarId: 'avatar-blue' }));
    });

    it('denies creating a user document with an HTML displayName', async () => {
      const db = testEnv.authenticatedContext('uid_new_user', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'uid_new_user'), newProfile('<img src=x onerror=alert(1)>')));
    });

    it('denies creating a user document with a 61-character displayName', async () => {
      const db = testEnv.authenticatedContext('uid_new_user', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'uid_new_user'), newProfile('A'.repeat(61))));
    });

    it('denies creating a user document with an empty displayName', async () => {
      const db = testEnv.authenticatedContext('uid_new_user', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'uid_new_user'), newProfile('')));
    });

    it('allows a normal displayName that differs from the allowlist value', async () => {
      const db = testEnv.authenticatedContext('uid_new_user', { email: 'budi@bps.go.id', email_verified: true }).firestore();
      await assertSucceeds(setDoc(doc(db, 'users', 'uid_new_user'), newProfile('Budi S. Wijaya')));
    });
  });

  describe('Role & Hierarchy Matrix (Part 2)', () => {
    function ctx(uid, email) {
      return testEnv.authenticatedContext(uid, { email, email_verified: true }).firestore();
    }

    it('enforces quest create/update/deactivate/delete scope across every role', async () => {
      const budiDb = ctx('uid_budi', 'budi@bps.go.id');
      const e2SdmDb = ctx('uid_head_e2_sdm', 'karo.sdm@bps.go.id');
      const e1Db = ctx('uid_head_e1', 'sestama@bps.go.id');
      const topDb = ctx('uid_head_top', 'kepala@bps.go.id');
      const superDb = ctx('uid_super_admin', 'superadmin@bps.go.id');
      const legacyAdminDb = ctx('uid_admin', 'admin@bps.go.id');

      // Employee denied everywhere
      await assertDenied(setDoc(doc(budiDb, 'quests', 'q-emp'), makeDailyQuest({ createdBy: 'uid_budi' })));
      await assertDenied(updateDoc(doc(budiDb, 'quests', 'quest-daily-1'), { active: false }));
      await assertDenied(deleteDoc(doc(budiDb, 'quests', 'quest-daily-1')));

      // head_e2 on biro-sdm: allowed in biro-sdm, denied in biro-umum & dir-harga, denied hard delete
      await assertSucceeds(setDoc(doc(e2SdmDb, 'quests', 'q-e2-sdm'), makeDailyQuest({
        unitId: 'biro-sdm',
        createdBy: 'uid_head_e2_sdm',
        updatedBy: 'uid_head_e2_sdm'
      })));
      await assertSucceeds(updateDoc(doc(e2SdmDb, 'quests', 'q-e2-sdm'), {
        active: false,
        updatedBy: 'uid_head_e2_sdm',
        updatedAt: serverTimestamp()
      }));
      await assertDenied(setDoc(doc(e2SdmDb, 'quests', 'q-e2-umum'), makeDailyQuest({
        unitId: 'biro-umum',
        createdBy: 'uid_head_e2_sdm'
      })));
      await assertDenied(updateDoc(doc(e2SdmDb, 'quests', 'quest-harga-1'), { active: false }));
      await assertDenied(deleteDoc(doc(e2SdmDb, 'quests', 'q-e2-sdm')));

      // head_e1 on sestama: allowed in sestama, biro-sdm, biro-umum; denied in dir-harga; denied hard delete
      await assertSucceeds(setDoc(doc(e1Db, 'quests', 'q-e1-umum'), makeDailyQuest({
        unitId: 'biro-umum',
        createdBy: 'uid_head_e1',
        updatedBy: 'uid_head_e1'
      })));
      await assertSucceeds(updateDoc(doc(e1Db, 'quests', 'quest-daily-1'), {
        title: 'Presensi Harian Diperbarui',
        updatedBy: 'uid_head_e1',
        updatedAt: serverTimestamp()
      }));
      await assertDenied(setDoc(doc(e1Db, 'quests', 'q-e1-harga'), makeDailyQuest({
        unitId: 'dir-harga',
        createdBy: 'uid_head_e1'
      })));
      await assertDenied(deleteDoc(doc(e1Db, 'quests', 'q-e1-umum')));

      // head_top on bps-pusat: allowed in bps-pusat & dir-harga; denied hard delete
      await assertSucceeds(setDoc(doc(topDb, 'quests', 'q-top-harga'), makeDailyQuest({
        unitId: 'dir-harga',
        createdBy: 'uid_head_top',
        updatedBy: 'uid_head_top'
      })));
      await assertSucceeds(updateDoc(doc(topDb, 'quests', 'q-top-harga'), {
        active: false,
        updatedBy: 'uid_head_top',
        updatedAt: serverTimestamp()
      }));
      await assertDenied(deleteDoc(doc(topDb, 'quests', 'q-top-harga')));

      // super_admin & legacy admin alias: allowed everywhere including hard delete
      await assertSucceeds(setDoc(doc(superDb, 'quests', 'q-super-harga'), makeDailyQuest({
        unitId: 'dir-harga',
        createdBy: 'uid_super_admin',
        updatedBy: 'uid_super_admin'
      })));
      await assertSucceeds(deleteDoc(doc(superDb, 'quests', 'q-super-harga')));
      await assertSucceeds(setDoc(doc(legacyAdminDb, 'quests', 'q-legacy-harga'), makeDailyQuest({
        unitId: 'dir-harga',
        createdBy: 'uid_admin',
        updatedBy: 'uid_admin'
      })));
      await assertSucceeds(deleteDoc(doc(legacyAdminDb, 'quests', 'q-legacy-harga')));
    });

    it('enforces XP caps (100 for heads, 500 for super_admin/admin) and quiz/type rules', async () => {
      const e2SdmDb = ctx('uid_head_e2_sdm', 'karo.sdm@bps.go.id');
      const superDb = ctx('uid_super_admin', 'superadmin@bps.go.id');
      const legacyAdminDb = ctx('uid_admin', 'admin@bps.go.id');

      // Heads: 100 allowed, 101 denied
      await assertSucceeds(setDoc(doc(e2SdmDb, 'quests', 'q-xp-100'), makeDailyQuest({
        xp: 100,
        createdBy: 'uid_head_e2_sdm'
      })));
      await assertDenied(setDoc(doc(e2SdmDb, 'quests', 'q-xp-101'), makeDailyQuest({
        xp: 101,
        createdBy: 'uid_head_e2_sdm'
      })));

      // super_admin and admin alias: 500 allowed, 501 denied
      await assertSucceeds(setDoc(doc(superDb, 'quests', 'q-xp-500'), makeDailyQuest({
        xp: 500,
        createdBy: 'uid_super_admin'
      })));
      await assertDenied(setDoc(doc(superDb, 'quests', 'q-xp-501'), makeDailyQuest({
        xp: 501,
        createdBy: 'uid_super_admin'
      })));
      await assertSucceeds(setDoc(doc(legacyAdminDb, 'quests', 'q-xp-500-alias'), makeDailyQuest({
        xp: 500,
        createdBy: 'uid_admin'
      })));
      await assertDenied(setDoc(doc(legacyAdminDb, 'quests', 'q-xp-501-alias'), makeDailyQuest({
        xp: 501,
        createdBy: 'uid_admin'
      })));

      // checkpoint without quiz denied; daily with quiz denied
      const noQuiz = makeCheckpointQuest({ createdBy: 'uid_super_admin' });
      delete noQuiz.quiz;
      await assertDenied(setDoc(doc(superDb, 'quests', 'q-no-quiz'), noQuiz));

      await assertDenied(setDoc(doc(superDb, 'quests', 'q-daily-quiz'), makeDailyQuest({
        createdBy: 'uid_super_admin',
        quiz: { question: 'Boleh?', options: ['Ya', 'Tidak'], correctIndex: 0 }
      })));

      // Tampering createdBy on update denied
      await assertDenied(updateDoc(doc(e2SdmDb, 'quests', 'q-xp-100'), {
        createdBy: 'uid_super_admin',
        title: 'Diubah'
      }));
    });

    it('enforces unit content vs structural permissions and blocks unit delete', async () => {
      const budiDb = ctx('uid_budi', 'budi@bps.go.id');
      const e2SdmDb = ctx('uid_head_e2_sdm', 'karo.sdm@bps.go.id');
      const e1Db = ctx('uid_head_e1', 'sestama@bps.go.id');
      const superDb = ctx('uid_super_admin', 'superadmin@bps.go.id');
      const legacyAdminDb = ctx('uid_admin', 'admin@bps.go.id');

      // Content edit inside scope allowed for heads (including max list lengths: 6 tugas, 8 services, 5 announcements)
      await assertSucceeds(updateDoc(doc(e2SdmDb, 'units', 'biro-sdm'), {
        summary: 'Ringkasan baru Biro SDM',
        tugas: ['Tugas 1', 'Tugas 2', 'Tugas 3', 'Tugas 4', 'Tugas 5', 'Tugas 6'],
        services: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'],
        announcements: [
          { id: 'ann-1', text: 'Info 1', createdAt: '2026-11-27', createdBy: 'uid_head_e2_sdm' },
          { id: 'ann-2', text: 'Info 2', createdAt: '2026-11-27', createdBy: 'uid_head_e2_sdm' },
          { id: 'ann-3', text: 'Info 3', createdAt: '2026-11-27', createdBy: 'uid_head_e2_sdm' },
          { id: 'ann-4', text: 'Info 4', createdAt: '2026-11-27', createdBy: 'uid_head_e2_sdm' },
          { id: 'ann-5', text: 'Info 5', createdAt: '2026-11-27', createdBy: 'uid_head_e2_sdm' }
        ],
        updatedBy: 'uid_head_e2_sdm',
        updatedAt: serverTimestamp()
      }));
      await assertSucceeds(updateDoc(doc(e1Db, 'units', 'biro-umum'), {
        summary: 'Ringkasan baru Biro Umum',
        updatedBy: 'uid_head_e1',
        updatedAt: serverTimestamp()
      }));

      // Content edit outside scope denied for heads & employees
      await assertDenied(updateDoc(doc(e2SdmDb, 'units', 'biro-umum'), {
        summary: 'Tidak berhak'
      }));
      await assertDenied(updateDoc(doc(e1Db, 'units', 'dir-harga'), {
        summary: 'Tidak berhak'
      }));
      await assertDenied(updateDoc(doc(budiDb, 'units', 'biro-sdm'), {
        summary: 'Pegawai tidak berhak'
      }));

      // Structural edit denied for heads, allowed for super_admin and admin alias
      await assertDenied(updateDoc(doc(e2SdmDb, 'units', 'biro-sdm'), {
        name: 'Biro SDM Baru'
      }));
      await assertDenied(updateDoc(doc(e1Db, 'units', 'biro-sdm'), {
        archived: true
      }));
      await assertSucceeds(updateDoc(doc(superDb, 'units', 'biro-umum'), {
        shortName: 'Biro Umum',
        archived: false
      }));
      await assertSucceeds(updateDoc(doc(legacyAdminDb, 'units', 'biro-umum'), {
        archived: true
      }));

      // Hard delete unit denied for all including super_admin
      await assertDenied(deleteDoc(doc(superDb, 'units', 'biro-umum')));
    });

    it('enforces user management, self-role protection, inactive user block, and unitPath check', async () => {
      const superDb = ctx('uid_super_admin', 'superadmin@bps.go.id');
      const legacyAdminDb = ctx('uid_admin', 'admin@bps.go.id');
      const e1Db = ctx('uid_head_e1', 'sestama@bps.go.id');
      const inactiveDb = ctx('uid_inactive', 'inactive@bps.go.id');

      // super_admin and admin alias update another user's role/unit/unitPath/active/jabatan/displayName
      await assertSucceeds(updateDoc(doc(superDb, 'users', 'uid_budi'), {
        role: 'head_e2',
        unit: 'biro-umum',
        unitPath: unitPathFor('biro-umum'),
        active: true,
        jabatan: 'Kepala Biro Umum',
        displayName: 'Budi Santoso, S.Stat'
      }));
      await assertSucceeds(updateDoc(doc(legacyAdminDb, 'users', 'uid_umum'), {
        role: 'employee',
        active: false
      }));

      // super_admin cannot change own role or active
      await assertDenied(updateDoc(doc(superDb, 'users', 'uid_super_admin'), {
        role: 'employee'
      }));
      await assertDenied(updateDoc(doc(superDb, 'users', 'uid_super_admin'), {
        active: false
      }));

      // Head cannot write any user doc
      await assertDenied(updateDoc(doc(e1Db, 'users', 'uid_budi'), {
        jabatan: 'Diubah Sestama'
      }));

      // Inactive user cannot claim completion or update avatarId
      const compId = 'uid_inactive_quest-daily-1_' + TODAY;
      const batch = writeBatch(inactiveDb);
      batch.set(doc(inactiveDb, 'completions', compId), {
        uid: 'uid_inactive',
        questId: 'quest-daily-1',
        unitId: 'biro-sdm',
        xp: 20,
        periodKey: TODAY,
        createdAt: serverTimestamp()
      });
      batch.update(doc(inactiveDb, 'users', 'uid_inactive'), {
        xp: 20,
        level: 1,
        weekKey: '2026-W46',
        xpWeek: 20,
        monthKey: '2026-11',
        xpMonth: 20,
        lastCompletionId: compId
      });
      await assertDenied(batch.commit());
      await assertDenied(updateDoc(doc(inactiveDb, 'users', 'uid_inactive'), {
        avatarId: 'avatar-red'
      }));

      // Tampering with unitPath on user creation denied
      const newBudiDb = ctx('uid_tamper_path', 'budi@bps.go.id');
      await assertDenied(setDoc(doc(newBudiDb, 'users', 'uid_tamper_path'), {
        displayName: 'Budi Santoso',
        email: 'budi@bps.go.id',
        unit: 'biro-sdm',
        unitPath: ['bps-pusat', 'biro-sdm'], // missing 'sestama'
        role: 'employee',
        active: true,
        xp: 0,
        level: 1,
        avatarId: 'default',
        weekKey: '2026-W46',
        xpWeek: 0,
        monthKey: '2026-11',
        xpMonth: 0,
        createdAt: serverTimestamp()
      }));
    });

    it('enforces allowedEmails permissions and email validation', async () => {
      const budiDb = ctx('uid_budi', 'budi@bps.go.id');
      const e1Db = ctx('uid_head_e1', 'sestama@bps.go.id');
      const superDb = ctx('uid_super_admin', 'superadmin@bps.go.id');
      const legacyAdminDb = ctx('uid_admin', 'admin@bps.go.id');

      // Employee can read own allowlist doc only; cannot list or write
      await assertSucceeds(getDoc(doc(budiDb, 'allowedEmails', 'budi@bps.go.id')));
      await assertDenied(getDoc(doc(budiDb, 'allowedEmails', 'umum@bps.go.id')));
      await assertDenied(getDocs(collection(budiDb, 'allowedEmails')));
      await assertDenied(getDocs(collection(e1Db, 'allowedEmails')));
      await assertDenied(setDoc(doc(budiDb, 'allowedEmails', 'baru@bps.go.id'), {
        email: 'baru@bps.go.id',
        unit: 'biro-sdm',
        role: 'employee',
        active: true
      }));

      // super_admin and admin alias can list, create, update, delete allowlist
      await assertSucceeds(getDocs(collection(superDb, 'allowedEmails')));
      await assertSucceeds(setDoc(doc(superDb, 'allowedEmails', 'pegawai.baru@bps.go.id'), {
        email: 'Pegawai.Baru@bps.go.id',
        displayName: 'Pegawai Baru',
        unit: 'biro-sdm',
        role: 'employee',
        jabatan: 'Statistisi Ahli Pertama',
        active: true
      }));
      await assertSucceeds(updateDoc(doc(legacyAdminDb, 'allowedEmails', 'pegawai.baru@bps.go.id'), {
        role: 'head_e2',
        active: false
      }));
      await assertSucceeds(deleteDoc(doc(superDb, 'allowedEmails', 'pegawai.baru@bps.go.id')));

      // Invalid email doc id or mismatch denied even for super_admin
      await assertDenied(setDoc(doc(superDb, 'allowedEmails', 'bukan-email'), {
        email: 'bukan-email',
        unit: 'biro-sdm',
        role: 'employee'
      }));
      await assertDenied(setDoc(doc(superDb, 'allowedEmails', 'satu@bps.go.id'), {
        email: 'dua@bps.go.id',
        unit: 'biro-sdm',
        role: 'employee'
      }));
    });
  });
});
