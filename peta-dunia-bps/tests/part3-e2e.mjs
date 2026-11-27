// End-to-end emulator verification of Part 3 client services + Firestore rules
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_FIREBASE_API_KEY = 'demo-api-key';
process.env.VITE_FIREBASE_PROJECT_ID = 'demo-bps';
process.env.VITE_FIREBASE_STORAGE_BUCKET = 'demo-bps.appspot.com';
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.VITE_FIREBASE_APP_ID = '1:123456789:web:demo';
process.env.VITE_USE_EMULATORS = 'true';

const { loginWithEmail, logout, INACTIVE_ACCOUNT_MESSAGE } = await import('../src/firebase/auth.js');
const { AppState } = await import('../src/state/index.js');
const { loadUnits, refreshUnits } = await import('../src/firebase/units.js');
const { fetchUnitQuests, claimQuest } = await import('../src/firebase/quests.js');
const {
  saveQuest,
  fetchTeamMembers,
  saveUnitContent,
  fetchAccountsAndAllowlist,
  saveAccountEntry,
  toggleAccountActive
} = await import('../src/firebase/manage.js');
const { auth } = await import('../src/firebase/client.js');
const { isHeadRole, isSuperAdminRole } = await import('../src/config.js');

const DEMO_PASS = 'DemoPassword123!';

describe('Part 3 E2E Client Flows on Firebase Emulators', () => {
  let createdQuestId = null;

  before(async () => {
    await logout().catch(() => {});
  });

  after(async () => {
    await logout().catch(() => {});
  });

  it('head_e2 on biro-sdm creates a quest in scope and is denied out of scope', async () => {
    await loginWithEmail('karo.sdm@bps.go.id', DEMO_PASS);
    const units = await loadUnits({ force: true });
    assert.ok(units.length >= 33);

    const scopedUnits = units.filter((u) => u.archived !== true && AppState.canManageUnit(u.id, units));
    assert.deepEqual(scopedUnits.map((u) => u.id), ['biro-sdm']);

    createdQuestId = await saveQuest({
      formInput: {
        unitId: 'biro-sdm',
        title: 'Quest E2E Client Biro SDM',
        description: 'Verifikasi pembuatan quest oleh head_e2',
        type: 'daily',
        xp: 25,
        active: true
      },
      uid: auth.currentUser.uid,
      isSuperAdmin: false
    });
    assert.ok(createdQuestId);

    // Attempting out-of-scope write directly against Firestore rules fails
    await assert.rejects(
      saveQuest({
        formInput: {
          unitId: 'biro-umum',
          title: 'Out of scope quest',
          description: 'Harus ditolak',
          type: 'daily',
          xp: 20,
          active: true
        },
        uid: auth.currentUser.uid,
        isSuperAdmin: false
      }),
      (err) => err && err.code === 'permission-denied'
    );

    // Tim Saya for head_e2 shows only biro-sdm users
    const team = await fetchTeamMembers({ role: AppState.player.role, unitId: AppState.player.unit });
    assert.ok(team.length >= 1);
    assert.equal(team.every((m) => Array.isArray(m.unitPath) && m.unitPath.includes('biro-sdm')), true);
    assert.equal(team.some((m) => m.unit === 'biro-umum'), false);

    // Edit unit content in scope and refresh cache
    const updatedUnits = await saveUnitContent('biro-sdm', {
      summary: 'Ringkasan Biro SDM terverifikasi saat E2E.',
      tugas: ['Membina SDM BPS'],
      services: ['Layanan Kepegawaian'],
      announcements: []
    }, auth.currentUser.uid);
    const sdm = updatedUnits.find((u) => u.id === 'biro-sdm');
    assert.equal(sdm.summary, 'Ringkasan Biro SDM terverifikasi saat E2E.');

    await logout();
  });

  it('biro-sdm employee has no manage access, sees the new quest, and claims it', async () => {
    await loginWithEmail('pegawai1@bps.go.id', DEMO_PASS);
    assert.equal(isHeadRole(AppState.player.role), false);
    assert.equal(isSuperAdminRole(AppState.player.role), false);
    assert.equal(AppState.canManageUnit('biro-sdm'), false);

    const quests = await fetchUnitQuests('biro-sdm');
    const created = quests.find((q) => q.id === createdQuestId);
    assert.ok(created, 'Employee should see the quest created by head_e2');

    const res = await claimQuest(created);
    assert.equal(res.success, true);
    assert.equal(res.xp, 25);

    await logout();
  });

  it('head_e1 on sestama sees descendants in Tim Saya (biro-sdm and biro-umum)', async () => {
    await loginWithEmail('sestama@bps.go.id', DEMO_PASS);
    const team = await fetchTeamMembers({ role: AppState.player.role, unitId: AppState.player.unit });
    assert.ok(team.some((m) => m.unit === 'biro-sdm'));
    assert.ok(team.some((m) => m.unit === 'biro-umum'));
    assert.equal(team.some((m) => m.unit === 'dir-harga'), false);
    await logout();
  });

  it('super_admin edits user role and deactivates another user, blocking their login', async () => {
    await loginWithEmail('superadmin@bps.go.id', DEMO_PASS);
    const units = await refreshUnits();
    const entries = await fetchAccountsAndAllowlist();
    const target = entries.find((e) => e.email === 'pegawai2@bps.go.id');
    assert.ok(target && target.profile);

    await saveAccountEntry({
      formInput: {
        email: 'pegawai2@bps.go.id',
        displayName: 'Siti Rahma',
        unit: 'biro-umum',
        role: 'head_e2',
        jabatan: 'Plt. Kepala Biro Umum',
        active: true
      },
      units,
      existingProfile: target.profile,
      currentUid: auth.currentUser.uid
    });

    const refreshedEntries = await fetchAccountsAndAllowlist();
    const updatedTarget = refreshedEntries.find((e) => e.email === 'pegawai2@bps.go.id');
    assert.equal(updatedTarget.profile.role, 'head_e2');

    const nextActive = await toggleAccountActive({
      entry: updatedTarget,
      units,
      currentUid: auth.currentUser.uid
    });
    assert.equal(nextActive, false);
    await logout();

    // Deactivated user is blocked on login
    await assert.rejects(
      loginWithEmail('pegawai2@bps.go.id', DEMO_PASS),
      (err) => err && err.message === INACTIVE_ACCOUNT_MESSAGE
    );
  });
});
