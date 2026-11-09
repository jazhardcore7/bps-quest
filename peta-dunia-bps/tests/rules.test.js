import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';

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

      // Seed allowlist data using admin context
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
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
      });
    }
  });

  describe('Unauthenticated access', () => {
    it('denies unauthenticated read/write to users', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'users', 'any-uid')));
      await assertFails(setDoc(doc(db, 'users', 'any-uid'), { xp: 0 }));
    });

    it('denies unauthenticated read/write to allowedEmails', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'allowedEmails', 'budi@bps.go.id')));
      await assertFails(setDoc(doc(db, 'allowedEmails', 'budi@bps.go.id'), { unit: 'biro-sdm' }));
    });
  });

  describe('allowedEmails collection', () => {
    it('allows a signed-in user to get their own lowercased email doc', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      const snap = await assertSucceeds(getDoc(doc(db, 'allowedEmails', 'budi@bps.go.id')));
      assert.equal(snap.exists(), true);
      assert.equal(snap.data().displayName, 'Budi Santoso');
    });

    it('denies a user from reading another user email doc in allowedEmails', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertFails(getDoc(doc(db, 'allowedEmails', 'admin@bps.go.id')));
    });

    it('denies any user from listing or writing to allowedEmails', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertFails(getDocs(collection(db, 'allowedEmails')));
      await assertFails(setDoc(doc(db, 'allowedEmails', 'hacker@bps.go.id'), { role: 'admin' }));
      await assertFails(deleteDoc(doc(db, 'allowedEmails', 'budi@bps.go.id')));
    });
  });

  describe('users collection profile creation', () => {
    it('allows an allowed user to create their user doc matching allowlist with zero XP', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertSucceeds(setDoc(doc(db, 'users', 'uid_budi'), {
        displayName: 'Budi Santoso',
        email: 'budi@bps.go.id',
        unit: 'biro-sdm',
        role: 'employee',
        xp: 0,
        xpWeek: 0,
        xpMonth: 0,
        level: 1,
        avatarId: 'default'
      }));
    });

    it('denies creating user doc with mismatched role', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'uid_budi'), {
        displayName: 'Budi Santoso',
        email: 'budi@bps.go.id',
        unit: 'biro-sdm',
        role: 'admin', // Mismatched! In allowlist budi is 'employee'
        xp: 0,
        xpWeek: 0,
        xpMonth: 0,
        level: 1
      }));
    });

    it('denies creating user doc with mismatched unit', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'uid_budi'), {
        displayName: 'Budi Santoso',
        email: 'budi@bps.go.id',
        unit: 'biro-umum', // Mismatched!
        role: 'employee',
        xp: 0,
        xpWeek: 0,
        xpMonth: 0,
        level: 1
      }));
    });

    it('denies creating user doc with non-zero XP or level > 1', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'uid_budi'), {
        displayName: 'Budi Santoso',
        email: 'budi@bps.go.id',
        unit: 'biro-sdm',
        role: 'employee',
        xp: 500, // Must be 0
        xpWeek: 0,
        xpMonth: 0,
        level: 2
      }));
    });

    it('denies user creation when email is NOT in allowlist', async () => {
      const db = testEnv.authenticatedContext('uid_stranger', { email: 'stranger@gmail.com' }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'uid_stranger'), {
        displayName: 'Stranger',
        email: 'stranger@gmail.com',
        unit: 'biro-sdm',
        role: 'employee',
        xp: 0,
        xpWeek: 0,
        xpMonth: 0,
        level: 1
      }));
    });

    it('denies creating a user doc for a different uid', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertFails(setDoc(doc(db, 'users', 'other_uid'), {
        displayName: 'Budi Santoso',
        email: 'budi@bps.go.id',
        unit: 'biro-sdm',
        role: 'employee',
        xp: 0,
        xpWeek: 0,
        xpMonth: 0,
        level: 1
      }));
    });
  });

  describe('users collection profile updates and reading', () => {
    beforeEach(async () => {
      // Seed initial valid user doc
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'users', 'uid_budi'), {
          displayName: 'Budi Santoso',
          email: 'budi@bps.go.id',
          unit: 'biro-sdm',
          role: 'employee',
          xp: 0,
          xpWeek: 0,
          xpMonth: 0,
          level: 1,
          avatarId: 'default'
        });
      });
    });

    it('allows client to update permitted profile fields like avatarId and xp', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertSucceeds(updateDoc(doc(db, 'users', 'uid_budi'), {
        avatarId: 'avatar-custom',
        xp: 50
      }));
    });

    it('denies client from updating protected fields (role, unit, email)', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertFails(updateDoc(doc(db, 'users', 'uid_budi'), {
        role: 'admin'
      }));
      await assertFails(updateDoc(doc(db, 'users', 'uid_budi'), {
        unit: 'biro-umum'
      }));
      await assertFails(updateDoc(doc(db, 'users', 'uid_budi'), {
        email: 'hacked@bps.go.id'
      }));
    });

    it('allows any signed-in user to read any user profile in users collection', async () => {
      const db = testEnv.authenticatedContext('uid_admin', { email: 'admin@bps.go.id' }).firestore();
      const snap = await assertSucceeds(getDoc(doc(db, 'users', 'uid_budi')));
      assert.equal(snap.exists(), true);
      assert.equal(snap.data().displayName, 'Budi Santoso');
    });

    it('denies deleting a user doc', async () => {
      const db = testEnv.authenticatedContext('uid_budi', { email: 'budi@bps.go.id' }).firestore();
      await assertFails(deleteDoc(doc(db, 'users', 'uid_budi')));
    });
  });
});
