// Demo test: exercises auth, quest claims, rules and leaderboard against the
// LOCAL Firebase emulators only (project "demo-bps"). Uses the app's own client
// modules (src/firebase/*.js) so the real code paths run.
//
// Prerequisite: `npm run emulators` running (Auth 9099, Firestore 8080).
// Run:          node demo-test/emulator-scenarios.mjs
// Output:       console + demo-test/results-emulator.json
//
// Safety: refuses to run unless both emulator hosts answer on 127.0.0.1.
// It wipes and re-seeds ONLY the emulator project "demo-bps". Fake data only.
//
// Branch fix/pilot-blockers: rule line references point at this branch's
// firestore.rules; LB-09a/b expect the displayName shape check, and DN-01,
// DN-02 and LB-09c cover sign-up name normalization and quote-only names.

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PROJECT = 'demo-bps';
const FS_HOST = '127.0.0.1:8080';
const AUTH_HOST = '127.0.0.1:9099';

// ---- Environment for the app modules (fake values, emulator only) ----------
Object.assign(process.env, {
  FIRESTORE_EMULATOR_HOST: FS_HOST,
  FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
  GCLOUD_PROJECT: PROJECT,
  VITE_FIREBASE_API_KEY: 'fake-api-key',
  VITE_FIREBASE_PROJECT_ID: PROJECT,
  VITE_FIREBASE_STORAGE_BUCKET: 'demo-bps.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  VITE_FIREBASE_APP_ID: '1:000000000000:web:demo',
  VITE_USE_EMULATORS: 'true'
});

const results = [];
function record(id, group, name, expected, actual, pass, evidence = '') {
  const status = pass === null ? 'BLOCKED' : (pass ? 'PASS' : 'FAIL');
  results.push({ id, group, name, expected, actual, status, evidence });
  console.log(`[${status}] ${id} ${name}\n    expected: ${expected}\n    actual:   ${actual}${evidence ? `\n    evidence: ${evidence}` : ''}`);
}
const code = (e) => (e && (e.code || e.message)) || String(e);
async function attempt(fn) {
  try { const v = await fn(); return { ok: true, v }; } catch (e) { return { ok: false, e }; }
}

// ---- Preflight: emulators must be local and up ----------------------------
for (const h of [FS_HOST, AUTH_HOST]) {
  try { await fetch(`http://${h}/`); } catch (e) {
    console.error(`Emulator at ${h} is not reachable. Start "npm run emulators" first.`);
    process.exit(2);
  }
}

// ---- Reset + seed (emulator project demo-bps only) -------------------------
await fetch(`http://${FS_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
const seed = spawnSync(process.execPath, ['scripts/seed.js'], {
  cwd: ROOT, env: { ...process.env, VITE_FIREBASE_PROJECT_ID: PROJECT }, encoding: 'utf8'
});
if (seed.status !== 0) { console.error(seed.stderr); process.exit(3); }

// Admin SDK (emulator) for test fixtures only: extra fake allowlist entries.
const { initializeApp: adminInit } = await import('firebase-admin/app');
const { getFirestore: adminFs } = await import('firebase-admin/firestore');
const adminApp = adminInit({ projectId: PROJECT }, 'demo-admin');
const adminDb = adminFs(adminApp);
const { getAuth: adminAuthOf } = await import('firebase-admin/auth');
const adminAuth = adminAuthOf(adminApp);
const FIXTURE_EMAILS = {
  'belum.verif@bps.go.id': { displayName: 'Penguji Verifikasi', unit: 'biro-sdm', role: 'employee' },
  'xss.tester@bps.go.id': { displayName: 'Penguji XSS', unit: 'biro-sdm', role: 'employee' },
  'levelup@bps.go.id': { displayName: 'Penguji Level', unit: 'biro-sdm', role: 'employee' },
  'rollover@bps.go.id': { displayName: 'Penguji Rollover', unit: 'biro-sdm', role: 'employee' },
  'forger@bps.go.id': { displayName: 'Penguji Profil', unit: 'biro-sdm', role: 'employee' },
  'kutip.tester@bps.go.id': { displayName: 'Penguji Kutip', unit: 'biro-sdm', role: 'employee' },
  'nama.kotor@bps.go.id': { displayName: '  <b>Nama</b>   Kotor  ', unit: 'biro-sdm', role: 'employee' },
  'tanpa.nama@bps.go.id': { displayName: '', unit: 'biro-sdm', role: 'employee' },
  'balapan@bps.go.id': { displayName: 'Penguji Balapan', unit: 'biro-sdm', role: 'employee' },
  'google.tester@bps.go.id': { displayName: 'Penguji Google', unit: 'biro-sdm', role: 'employee' }
};
for (const [email, data] of Object.entries(FIXTURE_EMAILS)) {
  await adminDb.collection('allowedEmails').doc(email).set(data);
}

// ---- App modules (real code paths) ----------------------------------------
const { auth, db } = await import('../src/firebase/client.js');
const authMod = await import('../src/firebase/auth.js');
const questsMod = await import('../src/firebase/quests.js');
const lbMod = await import('../src/firebase/leaderboard.js');
const cfg = await import('../src/config.js');
const fa = await import('firebase/auth');
const ff = await import('firebase/firestore');
const { doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, collection, query, orderBy, limit, where, serverTimestamp } = ff;

const PW = 'rahasia-uji-123';
const now = new Date();
const today = cfg.dailyPeriodKeyJakarta(now);
const curWeek = cfg.weekKeyJakarta(now);
const curMonth = cfg.monthKeyJakarta(now);

async function signIn(email) {
  await authMod.logout().catch(() => {});
  return authMod.loginWithEmail(email, PW);
}

// Marks an emulator account as verified (stands in for clicking the email link).
async function markVerified(email) {
  const u = await adminAuth.getUserByEmail(email);
  await adminAuth.updateUser(u.uid, { emailVerified: true });
}

// Real sign-up flow: register (sends link, signs out) -> verify -> first login creates profile.
async function registerVerified(email) {
  const r = await attempt(() => authMod.registerWithEmail(email, PW));
  if (r.ok || r.e.code !== 'app/email-not-verified') throw new Error(`register ${email}: ${code(r.e)}`);
  await markVerified(email);
  return authMod.loginWithEmail(email, PW);
}

// Raw account for forged-write tests: create, verify, refresh token claims.
async function rawVerifiedUser(email) {
  const cred = await fa.createUserWithEmailAndPassword(auth, email, PW);
  await markVerified(email);
  await cred.user.getIdToken(true);
  return cred;
}

async function oobCount(email) {
  const res = await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/oobCodes`);
  const body = await res.json();
  return (body.oobCodes || []).filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').length;
}

// Raw claim that bypasses the client-side duplicate check (simulates a modified client).
async function rawClaim({ quest, periodKey, xpOverride, userXpDelta }) {
  const uid = auth.currentUser.uid;
  const userRef = doc(db, 'users', uid);
  const u = (await getDoc(userRef)).data();
  const xp = xpOverride ?? quest.xp;
  const delta = userXpDelta ?? xp;
  const compId = `${uid}_${quest.id}_${periodKey}`;
  const newXp = u.xp + delta;
  const b = writeBatch(db);
  b.set(doc(db, 'completions', compId), {
    uid, questId: quest.id, unitId: quest.unitId, xp, periodKey, createdAt: serverTimestamp()
  });
  b.update(userRef, {
    xp: newXp,
    level: cfg.calculateLevel(newXp),
    weekKey: curWeek,
    xpWeek: (u.weekKey === curWeek ? u.xpWeek : 0) + delta,
    monthKey: curMonth,
    xpMonth: (u.monthKey === curMonth ? u.xpMonth : 0) + delta,
    lastCompletionId: compId
  });
  await b.commit();
  return { compId, newXp };
}

// ======================= AUTH ==============================================
{
  const r = await attempt(() => registerVerified('pegawai1@bps.go.id'));
  record('AUTH-01', 'Auth', 'Daftar pegawai allowlist (Biro SDM), verifikasi, login pertama',
    'Profil users/{uid} dibuat setelah verifikasi, unit biro-sdm, role employee',
    r.ok ? `profil dibuat: unit=${r.v.unit}, role=${r.v.role}, xp=${r.v.xp}` : `error ${code(r.e)}`,
    r.ok && r.v.unit === 'biro-sdm' && r.v.role === 'employee');
  await authMod.logout();
}
{
  const email = 'belum.verif@bps.go.id';
  // The emulator keeps oob codes across runs (deleting accounts does not clear
  // them), so count only the emails sent during this run.
  const sentBefore = await oobCount(email);
  const reg = await attempt(() => authMod.registerWithEmail(email, PW));
  const sentAfterRegister = await oobCount(email) - sentBefore;
  const afterReg = auth.currentUser;
  const login = await attempt(() => authMod.loginWithEmail(email, PW));
  const sentAfterLogin = await oobCount(email) - sentBefore;
  const u = await adminAuth.getUserByEmail(email);
  const profile = await adminDb.collection('users').doc(u.uid).get();
  // Direct profile write by the unverified account (bypassing the client check)
  const cred = await fa.signInWithEmailAndPassword(auth, email, PW);
  const raw = await attempt(() => setDoc(doc(db, 'users', cred.user.uid), {
    displayName: 'Penguji Verifikasi', email, unit: 'biro-sdm', role: 'employee', xp: 0, level: 1,
    avatarId: 'default', weekKey: curWeek, xpWeek: 0, monthKey: curMonth, xpMonth: 0, createdAt: serverTimestamp()
  }));
  await authMod.logout();
  record('AUTH-02', 'Auth', 'Daftar dengan email allowlist TANPA verifikasi email',
    'Email verifikasi terkirim, tidak login, profil tidak dibuat (klien maupun tulis langsung)',
    `daftar: "${reg.ok ? 'BERHASIL' : reg.e.message}"; email verifikasi=${sentAfterRegister}; currentUser=${afterReg ? 'ada' : 'null'}; ` +
    `login: "${login.ok ? 'BERHASIL' : login.e.message}" (email dikirim ulang, total ${sentAfterLogin}); profil ada=${profile.exists}; tulis langsung: ${raw.ok ? 'DIIZINKAN' : code(raw.e)}`,
    !reg.ok && reg.e.code === 'app/email-not-verified' && sentAfterRegister === 1 && !afterReg &&
      !login.ok && sentAfterLogin === 2 && !profile.exists && !raw.ok,
    'src/firebase/auth.js (registerWithEmail, ensureUserProfile), firestore.rules (isEmailVerified)');
}
{
  await authMod.logout();
  const r = await attempt(() => authMod.loginWithEmail('  PeGaWai1@BPS.GO.ID ', PW));
  record('AUTH-03', 'Auth', 'Login dengan huruf besar/kecil campur dan spasi',
    'Login berhasil (email dinormalisasi ke huruf kecil)',
    r.ok ? `berhasil, email profil=${r.v.email}` : `error ${code(r.e)}`, r.ok, 'src/firebase/auth.js:183');
}
{
  await authMod.logout();
  const r = await attempt(() => authMod.loginWithEmail('pegawai1@bps.go.id', 'salah-total'));
  const msg = r.ok ? 'login berhasil (tidak diharapkan)' : `${code(r.e)} -> "${authMod.mapAuthError(r.e)}"`;
  record('AUTH-04', 'Auth', 'Kata sandi salah', 'Ditolak, pesan "Email atau kata sandi salah."', msg,
    !r.ok && authMod.mapAuthError(r.e) === 'Email atau kata sandi salah.');
}
{
  await authMod.logout().catch(() => {});
  const r = await attempt(() => authMod.registerWithEmail('orang.luar@contoh.com', PW));
  const after = auth.currentUser;
  const again = await attempt(() => fa.signInWithEmailAndPassword(auth, 'orang.luar@contoh.com', PW));
  record('AUTH-05', 'Auth', 'Daftar dengan email di luar allowlist',
    'Ditolak dengan NOT_ALLOWED_MESSAGE, tidak login, akun Auth dihapus',
    `${r.ok ? 'BERHASIL (tidak diharapkan)' : `"${authMod.mapAuthError(r.e)}"`}; currentUser=${after ? 'ada' : 'null'}; login ulang: ${again.ok ? 'berhasil (akun masih ada)' : code(again.e)}`,
    !r.ok && !after && !again.ok);
  await authMod.logout().catch(() => {});
}
{
  const questData = { unitId: 'biro-sdm', title: 'Quest palsu', description: 'uji', type: 'daily', xp: 1000, active: true };
  const reg = await attempt(() => authMod.registerWithEmail('admin@bps.go.id', PW));
  // Worst case: an admin profile already exists (e.g. legacy data) but the token is unverified.
  const adminUser = await adminAuth.getUserByEmail('admin@bps.go.id');
  await adminDb.collection('users').doc(adminUser.uid).set({
    displayName: 'Admin Utama', email: 'admin@bps.go.id', unit: 'biro-sdm', role: 'admin', xp: 0, level: 1,
    avatarId: 'default', weekKey: curWeek, xpWeek: 0, monthKey: curMonth, xpMonth: 0
  });
  await fa.signInWithEmailAndPassword(auth, 'admin@bps.go.id', PW);
  const unverifiedWrite = await attempt(() => setDoc(doc(db, 'quests', 'quest-dibuat-admin-palsu'), questData));
  await authMod.logout();
  record('AUTH-06', 'Auth', 'Admin allowlist daftar tanpa verifikasi lalu menulis quest',
    'Pendaftaran butuh verifikasi; token admin belum terverifikasi tidak bisa menulis quest',
    `daftar: "${reg.ok ? 'BERHASIL' : reg.e.message}"; tulis quests (xp 1000) dengan token belum terverifikasi: ${unverifiedWrite.ok ? 'DIIZINKAN' : code(unverifiedWrite.e)}`,
    !reg.ok && !unverifiedWrite.ok, 'firestore.rules (isUserAdmin memakai isEmailVerified)');

  await markVerified('admin@bps.go.id');
  const login = await attempt(() => authMod.loginWithEmail('admin@bps.go.id', PW));
  const verifiedWrite = await attempt(() => setDoc(doc(db, 'quests', 'quest-dibuat-admin-palsu'), questData));
  record('AUTH-06b', 'Auth', 'Admin terverifikasi menulis quest', 'Diizinkan',
    `login role=${login.ok ? login.v.role : code(login.e)}; tulis quests: ${verifiedWrite.ok ? 'diizinkan' : code(verifiedWrite.e)}`,
    login.ok && login.v.role === 'admin' && verifiedWrite.ok);
  await authMod.logout();
  // Remove the test quest so later scenarios see only the seeded quests.
  await adminDb.collection('quests').doc('quest-dibuat-admin-palsu').delete();
}
{
  const r = await attempt(() => registerVerified('pegawai2@bps.go.id'));
  record('AUTH-07', 'Auth', 'Daftar pegawai allowlist unit lain (Biro Umum)', 'Profil unit biro-umum',
    r.ok ? `unit=${r.v.unit}` : code(r.e), r.ok && r.v.unit === 'biro-umum');
  await authMod.logout();
}
{
  // Forged profile creation: valid allowlist but tampered fields
  const cred = await rawVerifiedUser('forger@bps.go.id');
  const base = { displayName: 'Penguji Profil', email: 'forger@bps.go.id', unit: 'biro-sdm', role: 'employee', xp: 0, level: 1,
    avatarId: 'default', weekKey: curWeek, xpWeek: 0, monthKey: curMonth, xpMonth: 0, createdAt: serverTimestamp() };
  const ref = doc(db, 'users', cred.user.uid);
  const asAdmin = await attempt(() => setDoc(ref, { ...base, role: 'admin' }));
  const richXp = await attempt(() => setDoc(ref, { ...base, xp: 5000, level: 11 }));
  const otherUnit = await attempt(() => setDoc(ref, { ...base, unit: 'biro-umum' }));
  record('AUTH-08', 'Auth', 'Buat profil sendiri dengan role admin / xp 5000 / unit lain',
    'Ketiganya ditolak rules',
    `role admin: ${asAdmin.ok ? 'DIIZINKAN' : code(asAdmin.e)}; xp 5000: ${richXp.ok ? 'DIIZINKAN' : code(richXp.e)}; unit lain: ${otherUnit.ok ? 'DIIZINKAN' : code(otherUnit.e)}`,
    !asAdmin.ok && !richXp.ok && !otherUnit.ok, 'firestore.rules:104-117');
  await authMod.logout();
}
{
  // Sign-up name normalization through the real flow (allowlist name with HTML and extra spaces).
  const r = await attempt(() => registerVerified('nama.kotor@bps.go.id'));
  record('DN-01', 'Auth', 'Daftar dengan nama allowlist berisi HTML dan spasi ganda',
    'Profil dibuat; displayName dinormalisasi menjadi "bNama/b Kotor"',
    r.ok ? `profil dibuat, displayName="${r.v.displayName}"` : `DITOLAK ${code(r.e)}`,
    r.ok && r.v.displayName === 'bNama/b Kotor', 'src/config.js (normalizeDisplayName), src/firebase/auth.js:159, firestore.rules:108-111');
  await authMod.logout();
}
{
  // Empty allowlist name and no Auth displayName: falls back to the email local part.
  const r = await attempt(() => registerVerified('tanpa.nama@bps.go.id'));
  record('DN-02', 'Auth', 'Daftar dengan nama allowlist kosong', 'Profil dibuat; displayName = "tanpa.nama"',
    r.ok ? `profil dibuat, displayName="${r.v.displayName}"` : `DITOLAK ${code(r.e)}`,
    r.ok && r.v.displayName === 'tanpa.nama', 'src/config.js (normalizeDisplayName)');
  await authMod.logout();
}
{
  // First login runs ensureUserProfile twice at once (login call + auth listener).
  const email = 'balapan@bps.go.id';
  const reg = await attempt(() => authMod.registerWithEmail(email, PW));
  await markVerified(email);
  const cred = await fa.signInWithEmailAndPassword(auth, email, PW);
  const both = await Promise.allSettled([authMod.ensureUserProfile(cred.user), authMod.ensureUserProfile(cred.user)]);
  const errors = both.filter((x) => x.status === 'rejected').map((x) => code(x.reason));
  const profile = await adminDb.collection('users').doc(cred.user.uid).get();
  record('AUTH-14', 'Auth', 'Login pertama: dua panggilan ensureUserProfile bersamaan (login + listener auth)',
    'Keduanya berhasil dengan profil yang sama; tidak ada permission-denied',
    `daftar: ${reg.ok ? 'BERHASIL' : 'verifikasi dikirim'}; hasil: ${both.map((x) => x.status).join(', ')}${errors.length ? `; error: ${errors.join(', ')}` : ''}; profil ada=${profile.exists}`,
    errors.length === 0 && profile.exists, 'src/firebase/auth.js (ensureUserProfile), src/router.js:42-64');
  await authMod.logout();
}
{
  // Google sign-in through the auth emulator's test id_token (same profile logic as loginWithGoogle).
  const g = (email) => fa.GoogleAuthProvider.credential(JSON.stringify({ sub: `g-${email}`, email, email_verified: true }));
  const okCred = await attempt(() => fa.signInWithCredential(auth, g('google.tester@bps.go.id')));
  const okProfile = okCred.ok ? await attempt(() => authMod.ensureUserProfile(okCred.v.user)) : okCred;
  await authMod.logout().catch(() => {});
  const outCred = await attempt(() => fa.signInWithCredential(auth, g('google.luar@gmail.com')));
  const outProfile = outCred.ok ? await attempt(() => authMod.ensureUserProfile(outCred.v.user)) : outCred;
  const outLeft = await attempt(() => adminAuth.getUserByEmail('google.luar@gmail.com'));
  record('AUTH-13s', 'Auth', 'Login Google (kredensial uji emulator): email allowlist dan email luar',
    'Allowlist: profil dibuat dari allowlist; luar: pesan allowlist, akun Auth dihapus, tidak login',
    `allowlist: ${okProfile.ok ? `profil displayName="${okProfile.v.displayName}", unit=${okProfile.v.unit}` : code(okProfile.e)}; ` +
    `luar: ${outProfile.ok ? 'DIIZINKAN' : `"${authMod.mapAuthError(outProfile.e)}"`}, akun tersisa=${outLeft.ok}, currentUser=${auth.currentUser ? 'ada' : 'null'}`,
    okProfile.ok && okProfile.v.displayName === 'Penguji Google' && !outProfile.ok && !outLeft.ok && !auth.currentUser,
    'src/firebase/auth.js (ensureUserProfile); popup UI tetap MANUAL');
  await authMod.logout().catch(() => {});
}

// ======================= QUESTS & XP =======================================
await signIn('pegawai1@bps.go.id');
const quests = await questsMod.fetchUnitQuests('Biro SDM');
const daily = quests.find((q) => q.id === 'quest-daily-1');
const cp1 = quests.find((q) => q.id === 'quest-checkpoint-1');
const cp2 = quests.find((q) => q.id === 'quest-checkpoint-2');
{
  const hasAnswer = quests.filter((q) => q.quiz && typeof q.quiz.correctIndex === 'number').map((q) => `${q.id}.correctIndex=${q.quiz.correctIndex}`);
  record('QX-00', 'Quests', 'Pegawai membaca quest unit', '3 quest aktif terbaca',
    `${quests.length} quest: ${quests.map((q) => q.id).join(', ')}`, quests.length === 3);
  record('QX-01', 'Quests', 'Jawaban kuis tidak boleh terbaca klien',
    'quiz.correctIndex tidak ada di data yang dibaca klien',
    hasAnswer.length ? `terbaca: ${hasAnswer.join('; ')}` : 'tidak terbaca', hasAnswer.length === 0,
    'firestore.rules:70-71, src/ui/panel.js:421');
}
{
  const r = await attempt(() => questsMod.claimQuest(daily));
  const u = (await getDoc(doc(db, 'users', auth.currentUser.uid))).data();
  const comp = await getDoc(doc(db, 'completions', `${auth.currentUser.uid}_quest-daily-1_${today}`));
  record('QX-02', 'Quests', 'Klaim quest harian (claimQuest)', `+20 XP, completion ${'{uid}'}_quest-daily-1_${today} dibuat`,
    r.ok ? `xp=${u.xp}, xpWeek=${u.xpWeek}, xpMonth=${u.xpMonth}, completion ada=${comp.exists()}` : code(r.e),
    r.ok && u.xp === 20 && u.xpWeek === 20 && u.xpMonth === 20 && comp.exists());
}
{
  const r = await attempt(() => questsMod.claimQuest(daily));
  record('QX-03', 'Quests', 'Klaim harian kedua di hari yang sama (claimQuest)', 'Ditolak: "Quest sudah diselesaikan pada periode ini."',
    r.ok ? 'BERHASIL (tidak diharapkan)' : r.e.message, !r.ok && /sudah diselesaikan/.test(r.e.message));
  const raw = await attempt(() => rawClaim({ quest: daily, periodKey: today }));
  record('QX-04', 'Quests', 'Klaim harian kedua lewat batch langsung (lewati cek klien)', 'Ditolak rules (completion sudah ada)',
    raw.ok ? 'DIIZINKAN' : code(raw.e), !raw.ok, 'firestore.rules:82');
}
{
  const before = (await getDoc(doc(db, 'users', auth.currentUser.uid))).data().xp;
  const forged = [];
  for (const pk of ['2020-01-01', '2020-01-02', '1999-12-31']) {
    const r = await attempt(() => rawClaim({ quest: daily, periodKey: pk }));
    forged.push(`${pk}: ${r.ok ? 'DIIZINKAN' : code(r.e)}`);
  }
  const after = (await getDoc(doc(db, 'users', auth.currentUser.uid))).data().xp;
  record('QX-05', 'Quests', 'Klaim harian dengan periodKey palsu (3x)', 'Semua ditolak rules',
    `${forged.join('; ')}; xp ${before} -> ${after}`, after === before, 'firestore.rules:43-47, :86-88 (isValidPeriodKey)');
}
{
  const r = await attempt(() => questsMod.claimQuest(cp1));
  const again = await attempt(() => questsMod.claimQuest(cp1));
  const forged = await attempt(() => rawClaim({ quest: cp1, periodKey: 'once-lagi' }));
  record('QX-06', 'Quests', 'Klaim checkpoint (setelah jawaban benar di UI)', '+50 XP sekali',
    r.ok ? `+${r.v.xp}, xp baru ${r.v.newXp}` : code(r.e), r.ok && r.v.xp === 50);
  record('QX-07', 'Quests', 'Klaim checkpoint kedua (claimQuest)', 'Ditolak', again.ok ? 'BERHASIL' : again.e.message, !again.ok);
  record('QX-08', 'Quests', 'Klaim checkpoint ulang dengan periodKey palsu "once-lagi"', 'Ditolak rules',
    forged.ok ? 'DIIZINKAN (+50 XP lagi)' : code(forged.e), !forged.ok, 'firestore.rules:43-47');
}
{
  const ref = doc(db, 'users', auth.currentUser.uid);
  const direct = await attempt(() => updateDoc(ref, { xp: 99999, level: 200 }));
  const u = (await getDoc(ref)).data();
  const reuse = await attempt(() => updateDoc(ref, { xp: u.xp + 20, level: cfg.calculateLevel(u.xp + 20), xpWeek: u.xpWeek + 20, xpMonth: u.xpMonth + 20, lastCompletionId: u.lastCompletionId }));
  const inflate = await attempt(() => rawClaim({ quest: daily, periodKey: '2021-05-05', userXpDelta: 500 }));
  const badXp = await attempt(() => rawClaim({ quest: daily, periodKey: '2021-05-06', xpOverride: 999 }));
  const nameEdit = await attempt(() => updateDoc(ref, { displayName: 'Nama Baru' }));
  const avatar = await attempt(() => updateDoc(ref, { avatarId: 'avatar-2' }));
  record('QX-09', 'Quests', 'Edit xp langsung (updateDoc xp=99999)', 'Ditolak', direct.ok ? 'DIIZINKAN' : code(direct.e), !direct.ok);
  record('QX-10', 'Quests', 'Naikkan xp dengan lastCompletionId lama (pakai ulang)', 'Ditolak', reuse.ok ? 'DIIZINKAN' : code(reuse.e), !reuse.ok, 'firestore.rules:135');
  record('QX-11', 'Quests', 'Batch dengan completion 20 XP tapi user +500 XP', 'Ditolak', inflate.ok ? 'DIIZINKAN' : code(inflate.e), !inflate.ok, 'firestore.rules:136');
  record('QX-12', 'Quests', 'Completion dengan xp 999 (beda dari quest)', 'Ditolak', badXp.ok ? 'DIIZINKAN' : code(badXp.e), !badXp.ok, 'firestore.rules:89');
  record('QX-13', 'Quests', 'Ubah displayName sendiri setelah profil dibuat', 'Ditolak', nameEdit.ok ? 'DIIZINKAN' : code(nameEdit.e), !nameEdit.ok, 'firestore.rules:121-123');
  record('QX-14', 'Quests', 'Ubah avatarId saja', 'Diizinkan', avatar.ok ? 'diizinkan' : code(avatar.e), avatar.ok);
}
{
  const w1 = await attempt(() => setDoc(doc(db, 'quests', 'quest-buatan-pegawai'), { unitId: 'biro-sdm', title: 'x', type: 'daily', xp: 999, active: true }));
  const w2 = await attempt(() => updateDoc(doc(db, 'quests', 'quest-daily-1'), { xp: 999 }));
  const w3 = await attempt(() => setDoc(doc(db, 'units', 'biro-sdm'), { name: 'diubah' }, { merge: true }));
  const w4 = await attempt(() => getDocs(collection(db, 'allowedEmails')));
  const w5 = await attempt(() => getDoc(doc(db, 'allowedEmails', 'admin@bps.go.id')));
  const w6 = await attempt(() => getDoc(doc(db, 'allowedEmails', 'pegawai1@bps.go.id')));
  record('QX-15', 'Quests', 'Pegawai non-admin menulis quests (buat baru / ubah xp) dan units', 'Semua ditolak',
    `buat: ${w1.ok ? 'DIIZINKAN' : code(w1.e)}; ubah xp: ${w2.ok ? 'DIIZINKAN' : code(w2.e)}; units: ${w3.ok ? 'DIIZINKAN' : code(w3.e)}`,
    !w1.ok && !w2.ok && !w3.ok, 'firestore.rules:66, :72');
  record('QX-16', 'Quests', 'Baca allowlist: list / email orang lain / email sendiri', 'list ditolak, orang lain ditolak, sendiri boleh',
    `list: ${w4.ok ? 'DIIZINKAN' : code(w4.e)}; admin: ${w5.ok ? 'DIIZINKAN' : code(w5.e)}; sendiri: ${w6.ok ? 'boleh' : code(w6.e)}`,
    !w4.ok && !w5.ok && w6.ok, 'firestore.rules:153-156');
}
await authMod.logout();
{
  await signIn('pegawai2@bps.go.id');
  const r = await attempt(() => questsMod.claimQuest(daily));
  const r2 = await attempt(async () => {
    const uid = auth.currentUser.uid; const compId = `${uid}_quest-daily-1_${today}`;
    const b = writeBatch(db);
    b.set(doc(db, 'completions', compId), { uid, questId: 'quest-daily-1', unitId: 'biro-umum', xp: 20, periodKey: today, createdAt: serverTimestamp() });
    await b.commit();
  });
  record('QX-17', 'Quests', 'Pegawai Biro Umum klaim quest Biro SDM', 'Ditolak rules', r.ok ? 'DIIZINKAN' : code(r.e), !r.ok, 'firestore.rules:91');
  record('QX-18', 'Quests', 'Pegawai Biro Umum memalsukan unitId completion', 'Ditolak rules', r2.ok ? 'DIIZINKAN' : code(r2.e), !r2.ok, 'firestore.rules:90');
  await authMod.logout();
}
{
  // Level-up: fixture sets xp to 490 via admin (emulator), then a real claim crosses 500.
  const reg = await registerVerified('levelup@bps.go.id');
  await adminDb.collection('users').doc(auth.currentUser.uid).update({ xp: 490, level: 1 });
  const r = await attempt(() => questsMod.claimQuest(daily));
  const u = (await getDoc(doc(db, 'users', auth.currentUser.uid))).data();
  record('QX-19', 'Quests', 'Naik level saat melewati 500 XP (490 -> 510)', 'Klaim diterima rules, level=2, levelUp=true',
    r.ok ? `levelUp=${r.v.levelUp}, oldLevel=${r.v.oldLevel}, newLevel=${r.v.newLevel}, tersimpan xp=${u.xp} level=${u.level}` : `DITOLAK ${code(r.e)}`,
    r.ok && r.v.levelUp && u.level === 2 && reg.unit === 'biro-sdm', 'firestore.rules:137, src/firebase/quests.js:117-120');
  // exactly 500 boundary
  await adminDb.collection('users').doc(auth.currentUser.uid).update({ xp: 450, level: 1 });
  const r2 = await attempt(() => questsMod.claimQuest(cp1)); // 450 + 50 = 500
  const u2 = (await getDoc(doc(db, 'users', auth.currentUser.uid))).data();
  record('QX-20', 'Quests', 'Tepat 500 XP (450 + 50)', 'Level 2', r2.ok ? `xp=${u2.xp}, level=${u2.level}` : `DITOLAK ${code(r2.e)}`, r2.ok && u2.level === 2);
  await authMod.logout();
}
{
  await registerVerified('rollover@bps.go.id');
  await adminDb.collection('users').doc(auth.currentUser.uid).update({ xp: 300, level: 1, weekKey: '2026-W01', xpWeek: 300, monthKey: '2026-01', xpMonth: 300 });
  const r = await attempt(() => questsMod.claimQuest(daily));
  const u = (await getDoc(doc(db, 'users', auth.currentUser.uid))).data();
  record('QX-21', 'Quests', 'Rollover minggu & bulan (weekKey/monthKey lama)', `xpWeek=20, xpMonth=20, weekKey=${curWeek}, monthKey=${curMonth}, xp=320`,
    r.ok ? `xp=${u.xp}, weekKey=${u.weekKey}, xpWeek=${u.xpWeek}, monthKey=${u.monthKey}, xpMonth=${u.xpMonth}` : `DITOLAK ${code(r.e)}`,
    r.ok && u.xpWeek === 20 && u.xpMonth === 20 && u.weekKey === curWeek && u.monthKey === curMonth && u.xp === 320);
  const r2 = await attempt(() => questsMod.claimQuest(cp2));
  const u2 = (await getDoc(doc(db, 'users', auth.currentUser.uid))).data();
  record('QX-22', 'Quests', 'Increment dalam periode yang sama (+30)', 'xpWeek=50, xpMonth=50',
    r2.ok ? `xpWeek=${u2.xpWeek}, xpMonth=${u2.xpMonth}` : code(r2.e), r2.ok && u2.xpWeek === 50 && u2.xpMonth === 50);
  await authMod.logout();
}
{
  const r = await attempt(() => getDocs(collection(db, 'users')));
  record('QX-23', 'Quests', 'Baca users tanpa login', 'Ditolak', r.ok ? 'DIIZINKAN' : code(r.e), !r.ok);
}

// ======================= LEADERBOARD =======================================
{
  // Stored XSS precondition: an allowlisted user creates a profile with an HTML displayName.
  const cred = await rawVerifiedUser('xss.tester@bps.go.id');
  const payload = '<img src=x onerror=alert(1)>';
  const r = await attempt(() => setDoc(doc(db, 'users', cred.user.uid), {
    displayName: payload, email: 'xss.tester@bps.go.id', unit: 'biro-sdm', role: 'employee', xp: 0, level: 1,
    avatarId: 'default', weekKey: curWeek, xpWeek: 0, monthKey: curMonth, xpMonth: 0, createdAt: serverTimestamp()
  }));
  if (r.ok) await attempt(() => questsMod.claimQuest(daily));
  record('LB-09a', 'Leaderboard', 'Rules: buat profil dengan displayName berisi HTML', 'Ditolak (displayName 1-60 karakter, tanpa < atau >)',
    r.ok ? 'DIIZINKAN; nama tersimpan apa adanya' : code(r.e), !r.ok, 'firestore.rules:108-111');
  await authMod.logout();
}
{
  // A name without < or > passes the rule by design, so rendering must escape it (browser LBU-07b).
  const cred = await rawVerifiedUser('kutip.tester@bps.go.id');
  const payload = 'Uji" onmouseover="alert(1)';
  const r = await attempt(() => setDoc(doc(db, 'users', cred.user.uid), {
    displayName: payload, email: 'kutip.tester@bps.go.id', unit: 'biro-sdm', role: 'employee', xp: 0, level: 1,
    avatarId: 'default', weekKey: curWeek, xpWeek: 0, monthKey: curMonth, xpMonth: 0, createdAt: serverTimestamp()
  }));
  const claimed = r.ok ? await attempt(() => questsMod.claimQuest(daily)) : { ok: false };
  record('LB-09c', 'Leaderboard', 'Rules: nama dengan tanda kutip (tanpa < >) diterima dan tersimpan apa adanya',
    'Diizinkan (sesuai aturan); aman hanya jika tampilan meng-escape nama (LBU-07b)',
    r.ok ? `diizinkan; klaim harian ${claimed.ok ? 'berhasil' : 'gagal'}` : code(r.e), r.ok && claimed.ok, 'firestore.rules:108-111');
  await authMod.logout();
}
await signIn('pegawai1@bps.go.id');
{
  lbMod.clearLeaderboardCache();
  const tabs = {};
  for (const t of ['all-time', 'weekly', 'monthly']) {
    const users = await lbMod.fetchLeaderboard(t, true);
    const sorted = lbMod.sortLeaderboardUsers(users, t);
    const field = t === 'weekly' ? 'xpWeek' : (t === 'monthly' ? 'xpMonth' : 'xp');
    tabs[t] = { users, sorted, field };
  }
  const fmt = (t) => tabs[t].sorted.filter((u) => (u[tabs[t].field] || 0) > 0).map((u) => `${u.displayName}(${u[tabs[t].field]})`).join(' > ');
  const ordered = (t) => tabs[t].sorted.every((u, i, a) => i === 0 || (a[i - 1][tabs[t].field] || 0) >= (u[tabs[t].field] || 0));
  record('LB-01', 'Leaderboard', 'Tab Sepanjang Waktu: urutan xp desc', 'Terurut xp desc, tie -> xp total -> nama', fmt('all-time'), ordered('all-time'));
  record('LB-02', 'Leaderboard', 'Tab Mingguan: urutan xpWeek desc', 'Terurut', fmt('weekly'), ordered('weekly'));
  record('LB-03', 'Leaderboard', 'Tab Bulanan: urutan xpMonth desc', 'Terurut', fmt('monthly'), ordered('monthly'));
  const hendraWeekly = tabs.weekly.users.some((u) => u.uid === 'mock_user_past');
  const hendraAll = tabs['all-time'].users.some((u) => u.uid === 'mock_user_past');
  record('LB-04', 'Leaderboard', 'User dengan weekKey lama (Hendra, 2026-W01) tidak muncul di Mingguan',
    'Tidak ada di Mingguan, ada di Sepanjang Waktu', `Mingguan: ${hendraWeekly ? 'ADA' : 'tidak ada'}; Sepanjang Waktu: ${hendraAll ? 'ada' : 'tidak ada'}`,
    !hendraWeekly && hendraAll);
  const tie = tabs.weekly.sorted.filter((u) => u.xpWeek === 40).map((u) => u.displayName);
  record('LB-05', 'Leaderboard', 'Tie-break (Citra vs Doni, xpWeek 40, xp 100)', 'Citra Ayu sebelum Doni Kurniawan (alfabet)', tie.join(', '),
    tie.indexOf('Citra Ayu') < tie.indexOf('Doni Kurniawan'));
  const sdm = lbMod.filterUsersByUnit(tabs['all-time'].users, 'Biro SDM');
  record('LB-06', 'Leaderboard', 'Filter unit Biro SDM', 'Hanya unit biro-sdm',
    `${sdm.length}/${tabs['all-time'].users.length} user, unit: ${[...new Set(sdm.map((u) => u.unit))].join(',')}`, sdm.every((u) => u.unit === 'biro-sdm') && sdm.length > 0);

  // Cache: same reference within 60 s, new fetch after 60 s or forceReload
  const a = await lbMod.fetchLeaderboard('all-time');
  const b = await lbMod.fetchLeaderboard('all-time');
  const realNow = Date.now;
  Date.now = () => realNow() + 61000;
  const c = await lbMod.fetchLeaderboard('all-time');
  Date.now = realNow;
  const d = await lbMod.fetchLeaderboard('all-time', true);
  record('LB-07', 'Leaderboard', 'Cache 60 detik dan Segarkan', 'Panggilan ke-2 dari cache; setelah 61 detik dan forceReload ambil ulang',
    `ke-2 sama (cache)=${a === b}; setelah 61 dtk baru=${c !== b}; forceReload baru=${d !== c}`, a === b && c !== b && d !== c,
    'src/firebase/leaderboard.js:37-43');

  // Read counts: documents returned per tab query (billed reads = docs returned, min 1)
  const counts = [];
  for (const t of ['all-time', 'weekly', 'monthly']) counts.push(`${t}=${tabs[t].users.length}`);
  record('LB-08', 'Leaderboard', 'Jumlah dokumen dibaca per tab (data seed)', '<= 60 per tab', counts.join(', '),
    Object.values(tabs).every((x) => x.users.length <= 60));

  const xss = tabs['all-time'].users.find((u) => typeof u.displayName === 'string' && u.displayName.includes('<img'));
  record('LB-09b', 'Leaderboard', 'Nama HTML tidak sampai ke data leaderboard', 'Tidak ada (profil ditolak di LB-09a)',
    xss ? `ADA: uid ${xss.uid.slice(0, 6)}..., xp=${xss.xp}` : 'tidak ada', !xss);
}
await authMod.logout();
{
  // Limit 60: add 70 fake users, then count docs returned per tab
  const batch = adminDb.batch();
  for (let i = 0; i < 70; i++) {
    batch.set(adminDb.collection('users').doc(`lb_bulk_${String(i).padStart(2, '0')}`), {
      displayName: `Pegawai Uji ${i}`, email: `uji${i}@contoh.test`, unit: i % 2 ? 'biro-sdm' : 'biro-umum', role: 'employee',
      xp: 10 + i, level: 1, avatarId: 'default', weekKey: curWeek, xpWeek: 5 + i, monthKey: curMonth, xpMonth: 5 + i
    });
  }
  await batch.commit();
  await signIn('pegawai1@bps.go.id');
  lbMod.clearLeaderboardCache();
  const out = [];
  let ok = true;
  for (const t of ['all-time', 'weekly', 'monthly']) {
    const users = await lbMod.fetchLeaderboard(t, true);
    out.push(`${t}=${users.length}`);
    if (users.length > 60) ok = false;
  }
  record('LB-10', 'Leaderboard', 'Batas 60 dokumen per tab dengan 80+ user', '<= 60 dokumen per tab', out.join(', '), ok,
    'src/firebase/leaderboard.js:55, :63, :70 (limit 60)');
  // Clean bulk users so the dataset stays small
  const del = adminDb.batch();
  for (let i = 0; i < 70; i++) del.delete(adminDb.collection('users').doc(`lb_bulk_${String(i).padStart(2, '0')}`));
  await del.commit();
  await authMod.logout();
}

writeFileSync(path.join(HERE, 'results-emulator.json'), JSON.stringify(results, null, 2));
const tally = results.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
console.log('\nTOTAL', JSON.stringify(tally));
process.exit(0);
