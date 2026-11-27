// Demo seed script targeting local Firebase Auth & Firestore Emulators ONLY
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Guard: Target EMULATOR ONLY
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('\n❌ ERROR: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must both be set!');
  console.error('This script targets the local Firebase emulators ONLY and refuses to run against production.');
  console.error('Example (PowerShell):');
  console.error('  $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"; $env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"; npm run demo:reset\n');
  process.exit(1);
}

// Emulator project used by `npm run emulators` (`firebase emulators:start --project demo-bps`)
const DEMO_PROJECT_ID = 'demo-bps';
const DEMO_PASSWORD = 'DemoPassword123!';

const structurePath = path.resolve(__dirname, '../src/data/bps-structure.json');
const bpsStructure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
const UNITS = bpsStructure.units;
const UNITS_BY_ID = new Map(UNITS.map((u) => [u.id, u]));

function unitPathFor(unitId) {
  const unit = UNITS_BY_ID.get(unitId);
  return unit ? [...unit.ancestorIds, unitId] : [unitId];
}

function getJakartaDateParts(date = new Date()) {
  return new Date(date.getTime() + (7 * 60 + date.getTimezoneOffset()) * 60000);
}

function weekKeyJakarta(date = new Date()) {
  const jkt = getJakartaDateParts(date);
  const d = new Date(Date.UTC(jkt.getFullYear(), jkt.getMonth(), jkt.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function monthKeyJakarta(date = new Date()) {
  const jkt = getJakartaDateParts(date);
  return `${jkt.getFullYear()}-${String(jkt.getMonth() + 1).padStart(2, '0')}`;
}

function dailyKeyJakarta(date = new Date()) {
  const jkt = getJakartaDateParts(date);
  return `${jkt.getFullYear()}-${String(jkt.getMonth() + 1).padStart(2, '0')}-${String(jkt.getDate()).padStart(2, '0')}`;
}

const now = new Date();
const CURRENT_WEEK = weekKeyJakarta(now);
const CURRENT_MONTH = monthKeyJakarta(now);
const TODAY_KEY = dailyKeyJakarta(now);

// Primary demo accounts (Auth + allowlist + Firestore profile)
const PRIMARY_DEMO_ACCOUNTS = [
  {
    uid: 'demo_superadmin',
    email: 'superadmin@demo.bps.local',
    displayName: 'Raka Pratama (Demo Super Admin)',
    unit: 'bps-pusat',
    role: 'super_admin',
    jabatan: 'Pengelola Sistem Demo',
    xp: 320,
    xpWeek: 90,
    xpMonth: 210
  },
  {
    uid: 'demo_kepala',
    email: 'kepala@demo.bps.local',
    displayName: 'Hendra Wijaya (Demo Pimpinan Tertinggi)',
    unit: 'bps-pusat',
    role: 'head_top',
    jabatan: 'Kepala BPS (Demo)',
    xp: 480,
    xpWeek: 110,
    xpMonth: 260
  },
  {
    uid: 'demo_sestama',
    email: 'sestama@demo.bps.local',
    displayName: 'Ratna Kusuma (Demo Sestama)',
    unit: 'sestama',
    role: 'head_e1',
    jabatan: 'Sekretaris Utama (Demo)',
    xp: 540,
    xpWeek: 120,
    xpMonth: 300
  },
  {
    uid: 'demo_deputi_sosial',
    email: 'deputi.sosial@demo.bps.local',
    displayName: 'Bambang Santosa (Demo Deputi Sosial)',
    unit: 'deputi-sosial',
    role: 'head_e1',
    jabatan: 'Deputi Bidang Statistik Sosial (Demo)',
    xp: 410,
    xpWeek: 80,
    xpMonth: 240
  },
  {
    uid: 'demo_kabiro_sdm',
    email: 'kabiro.sdm@demo.bps.local',
    displayName: 'Dina Maharani (Demo Kabiro SDM)',
    unit: 'biro-sdm',
    role: 'head_e2',
    jabatan: 'Kepala Biro Sumber Daya Manusia (Demo)',
    xp: 520,
    xpWeek: 140,
    xpMonth: 310
  },
  {
    uid: 'demo_direktur_harga',
    email: 'direktur.harga@demo.bps.local',
    displayName: 'Arif Nugroho (Demo Direktur Harga)',
    unit: 'dir-harga',
    role: 'head_e2',
    jabatan: 'Direktur Statistik Harga (Demo)',
    xp: 390,
    xpWeek: 95,
    xpMonth: 220
  },
  {
    uid: 'demo_pegawai_sdm1',
    email: 'pegawai.sdm1@demo.bps.local',
    displayName: 'Nadia Putri',
    unit: 'biro-sdm',
    role: 'employee',
    jabatan: 'Analis SDM Aparatur Ahli Pertama',
    xp: 180,
    xpWeek: 60,
    xpMonth: 180
  },
  {
    uid: 'demo_pegawai_sdm2',
    email: 'pegawai.sdm2@demo.bps.local',
    displayName: 'Bagus Setiawan',
    unit: 'biro-sdm',
    role: 'employee',
    jabatan: 'Analis SDM Aparatur Ahli Muda',
    xp: 420,
    xpWeek: 150,
    xpMonth: 320
  },
  {
    uid: 'demo_pegawai_sdm3',
    email: 'pegawai.sdm3@demo.bps.local',
    displayName: 'Tania Permata',
    unit: 'biro-sdm',
    role: 'employee',
    jabatan: 'Pranata SDM Aparatur Penyelia',
    xp: 610,
    xpWeek: 110,
    xpMonth: 280
  },
  {
    uid: 'demo_pegawai_umum',
    email: 'pegawai.umum@demo.bps.local',
    displayName: 'Fajar Ramadhan',
    unit: 'biro-umum',
    role: 'employee',
    jabatan: 'Pranata Hubungan Masyarakat Ahli Pertama',
    xp: 240,
    xpWeek: 80,
    xpMonth: 160
  },
  {
    uid: 'demo_pegawai_harga',
    email: 'pegawai.harga@demo.bps.local',
    displayName: 'Larasati Dewi',
    unit: 'dir-harga',
    role: 'employee',
    jabatan: 'Statistisi Ahli Pertama',
    xp: 310,
    xpWeek: 100,
    xpMonth: 220
  }
];

// 25 clearly fictional employees distributed across units for lively Leaderboard & Tim Saya
const EXTRA_FICTIONAL_EMPLOYEES = [
  ['pegawai.demo01', 'Gilang Mahendra', 'biro-perencanaan-kerja-sama', 'Perencana Ahli Pertama', 530, 130, 290],
  ['pegawai.demo02', 'Sari Puspita', 'biro-perencanaan-kerja-sama', 'Perencana Ahli Muda', 290, 70, 190],
  ['pegawai.demo03', 'Dimas Prasetyo', 'biro-keuangan-bmn', 'Analis Pengelolaan Keuangan APBN', 460, 120, 260],
  ['pegawai.demo04', 'Wulan Anggraini', 'biro-keuangan-bmn', 'Penata Laksana Barang Mahir', 140, 40, 140],
  ['pegawai.demo05', 'Reza Pahlevi', 'biro-hukum-organisasi', 'Analis Hukum Ahli Pertama', 370, 95, 220],
  ['pegawai.demo06', 'Maya Puspitasari', 'biro-umum', 'Arsiparis Ahli Muda', 580, 160, 340],
  ['pegawai.demo07', 'Ilham Akbar', 'pusdiklat', 'Widyaiswara Ahli Muda', 410, 100, 250],
  ['pegawai.demo08', 'Intan Kartika', 'dir-metodologi-sains-data', 'Statistisi Ahli Muda', 640, 175, 380],
  ['pegawai.demo09', 'Yusuf Maulana', 'dir-metodologi-sains-data', 'Pranata Komputer Ahli Pertama', 260, 80, 180],
  ['pegawai.demo10', 'Rina Oktaviani', 'dir-diseminasi-pemberdayaan-evaluasi', 'Statistisi Ahli Pertama', 330, 90, 210],
  ['pegawai.demo11', 'Bayu Saputra', 'dir-sistem-informasi', 'Pranata Komputer Ahli Muda', 550, 140, 310],
  ['pegawai.demo12', 'Putri Wulandari', 'dir-sistem-informasi', 'Pranata Komputer Ahli Pertama', 190, 50, 150],
  ['pegawai.demo13', 'Aditya Kurnia', 'dir-kependudukan-ketenagakerjaan', 'Statistisi Ahli Pertama', 280, 85, 200],
  ['pegawai.demo14', 'Nisa Rahmawati', 'dir-kesejahteraan-rakyat', 'Statistisi Ahli Muda', 510, 125, 290],
  ['pegawai.demo15', 'Rizki Ramadhan', 'dir-ketahanan-sosial', 'Statistisi Ahli Pertama', 210, 60, 170],
  ['pegawai.demo16', 'Dewi Anggraeni', 'dir-sumber-daya-hayati', 'Statistisi Ahli Muda', 360, 90, 230],
  ['pegawai.demo17', 'Taufik Hidayat', 'dir-sumber-daya-mineral-konstruksi', 'Statistisi Ahli Pertama', 150, 30, 150],
  ['pegawai.demo18', 'Citra Lestari', 'dir-industri', 'Statistisi Ahli Muda', 440, 115, 270],
  ['pegawai.demo19', 'Farhan Hakim', 'dir-distribusi', 'Statistisi Ahli Pertama', 230, 65, 180],
  ['pegawai.demo20', 'Kania Azzahra', 'dir-jasa', 'Statistisi Ahli Pertama', 300, 75, 210],
  ['pegawai.demo21', 'Nanda Permana', 'dir-neraca-produksi', 'Statistisi Ahli Muda', 490, 130, 295],
  ['pegawai.demo22', 'Melati Kusuma', 'dir-neraca-pengeluaran', 'Statistisi Ahli Pertama', 270, 70, 190],
  ['pegawai.demo23', 'Hafiz Pratama', 'dir-analisis-neraca-satelit', 'Statistisi Ahli Muda', 620, 165, 360],
  ['pegawai.demo24', 'Vina Maharani', 'inspektorat-1', 'Auditor Ahli Muda', 380, 105, 240],
  ['pegawai.demo25', 'Rama Aditya', 'itama-bagian-umum', 'Analis Anggaran Ahli Pertama', 160, 45, 160]
].map(([handle, displayName, unit, jabatan, xp, xpWeek, xpMonth], idx) => ({
  uid: `demo_extra_${String(idx + 1).padStart(2, '0')}`,
  email: `${handle}@demo.bps.local`,
  displayName,
  unit,
  role: 'employee',
  jabatan,
  xp,
  xpWeek,
  xpMonth
}));

function buildQuestsForStructure() {
  const quests = [];
  const otherUnits = UNITS.filter((u) => u.id !== 'bps-pusat');

  UNITS.forEach((unit, idx) => {
    if (!unit.verified) return;

    // 1. Daily quest for every verified unit
    quests.push({
      id: `demo-daily-${unit.id}`,
      data: {
        unitId: unit.id,
        title: 'Baca papan informasi',
        description: `Buka dan baca ringkasan profil serta pengumuman terbaru pada ${unit.shortName}.`,
        type: 'daily',
        xp: 20,
        active: true,
        createdBy: 'demo-seed',
        createdAt: FieldValue.serverTimestamp(),
        updatedBy: 'demo-seed',
        updatedAt: FieldValue.serverTimestamp()
      }
    });

    // 2. Checkpoint quiz derived strictly from bps-structure.json facts
    if (unit.parentId) {
      const parent = UNITS_BY_ID.get(unit.parentId);
      const distractors = otherUnits
        .filter((cand) => cand.id !== unit.parentId && cand.id !== unit.id)
        .slice(idx % 5, (idx % 5) + 2);
      const options = [parent.name, distractors[0].name, distractors[1].name];
      quests.push({
        id: `demo-quiz-${unit.id}`,
        data: {
          unitId: unit.id,
          title: `Struktur ${unit.shortName}`.slice(0, 80),
          description: `Uji pengetahuan hierarki organisasi ${unit.name} berdasarkan Peraturan BPS 2/2025.`,
          type: 'checkpoint',
          xp: 50,
          active: true,
          quiz: {
            question: `Unit induk langsung dari ${unit.name} adalah...`.slice(0, 200),
            options: options.map((o) => o.slice(0, 100)),
            correctIndex: 0
          },
          createdBy: 'demo-seed',
          createdAt: FieldValue.serverTimestamp(),
          updatedBy: 'demo-seed',
          updatedAt: FieldValue.serverTimestamp()
        }
      });
    } else {
      quests.push({
        id: `demo-quiz-${unit.id}`,
        data: {
          unitId: unit.id,
          title: `Kepemimpinan ${unit.shortName}`.slice(0, 80),
          description: `Uji pemahaman susunan pimpinan tertinggi pada ${unit.name}.`,
          type: 'checkpoint',
          xp: 50,
          active: true,
          quiz: {
            question: `Sebutan pimpinan tertinggi pada ${unit.name} adalah...`,
            options: ['Kepala BPS', 'Sekretaris Utama', 'Inspektur Utama'],
            correctIndex: 0
          },
          createdBy: 'demo-seed',
          createdAt: FieldValue.serverTimestamp(),
          updatedBy: 'demo-seed',
          updatedAt: FieldValue.serverTimestamp()
        }
      });
    }
  });

  // Extra 3rd quest for Biro SDM (derived strictly from bps-structure.json)
  const biroSdm = UNITS_BY_ID.get('biro-sdm');
  quests.push({
    id: 'demo-quiz-biro-sdm-2',
    data: {
      unitId: 'biro-sdm',
      title: 'Jabatan Pimpinan Biro SDM',
      description: 'Kenali sebutan jabatan pimpinan serta rumpun pulau Biro Sumber Daya Manusia.',
      type: 'checkpoint',
      xp: 40,
      active: true,
      quiz: {
        question: `Sebutan jabatan pimpinan pada ${biroSdm.name} adalah...`,
        options: ['Direktur', biroSdm.headTitle, 'Inspektur'],
        correctIndex: 1
      },
      createdBy: 'demo-seed',
      createdAt: FieldValue.serverTimestamp(),
      updatedBy: 'demo-seed',
      updatedAt: FieldValue.serverTimestamp()
    }
  });

  return quests;
}

function getDemoApp() {
  const appName = `demo-seed-${DEMO_PROJECT_ID}`;
  try {
    return getApp(appName);
  } catch (_) {
    return initializeApp({ projectId: DEMO_PROJECT_ID }, appName);
  }
}

async function clearCollection(db, colName) {
  const snap = await db.collection(colName).get();
  if (snap.empty) return 0;
  let count = 0;
  let batch = db.batch();
  let ops = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    ops++;
    count++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return count;
}

async function wipeEmulator(auth, db) {
  console.log(`[demo-seed] Wiping Auth & Firestore emulators for '${DEMO_PROJECT_ID}'...`);

  // Clear Auth emulator users
  let pageToken;
  let authDeleted = 0;
  do {
    const res = await auth.listUsers(1000, pageToken);
    if (res.users.length > 0) {
      await auth.deleteUsers(res.users.map((u) => u.uid));
      authDeleted += res.users.length;
    }
    pageToken = res.pageToken;
  } while (pageToken);

  const cols = ['allowedEmails', 'units', 'quests', 'users', 'completions'];
  const counts = {};
  for (const c of cols) {
    counts[c] = await clearCollection(db, c);
  }
  console.log(`  ✓ Deleted ${authDeleted} Auth users and Firestore docs:`, counts);
}

async function seedDemo(auth, db) {
  console.log(`[demo-seed] Seeding emulator project '${DEMO_PROJECT_ID}'...`);

  // 1. Seed all units from bps-structure.json with 1 neutral demo announcement each
  for (const unit of UNITS) {
    await db.collection('units').doc(unit.id).set({
      ...unit,
      archived: false,
      announcements: [
        {
          id: `ann-demo-${unit.id}`,
          text: `Selamat datang di papan informasi demo ${unit.shortName}.`,
          createdAt: TODAY_KEY,
          createdBy: 'demo-seed'
        }
      ],
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'demo-seed'
    });
  }
  console.log(`  ✓ Seeded ${UNITS.length} units`);

  // 2. Seed quests (2 per verified unit + 1 extra for biro-sdm)
  const quests = buildQuestsForStructure();
  for (const q of quests) {
    await db.collection('quests').doc(q.id).set(q.data);
  }
  console.log(`  ✓ Seeded ${quests.length} quests`);

  // 3. Seed Auth users (primary demo accounts) + allowlist + Firestore profiles (primary + 25 fictional)
  for (const acc of PRIMARY_DEMO_ACCOUNTS) {
    try {
      await auth.createUser({
        uid: acc.uid,
        email: acc.email,
        password: DEMO_PASSWORD,
        displayName: acc.displayName,
        emailVerified: true
      });
    } catch (err) {
      if (err && err.code === 'auth/uid-already-exists') {
        await auth.updateUser(acc.uid, {
          email: acc.email,
          password: DEMO_PASSWORD,
          displayName: acc.displayName,
          emailVerified: true
        });
      } else {
        throw err;
      }
    }
  }
  console.log(`  ✓ Seeded ${PRIMARY_DEMO_ACCOUNTS.length} verified Auth emulator accounts`);

  const allProfiles = [...PRIMARY_DEMO_ACCOUNTS, ...EXTRA_FICTIONAL_EMPLOYEES];
  for (const acc of allProfiles) {
    const email = acc.email.toLowerCase();
    await db.collection('allowedEmails').doc(email).set({
      email,
      displayName: acc.displayName,
      unit: acc.unit,
      role: acc.role,
      jabatan: acc.jabatan,
      active: true
    });

    await db.collection('users').doc(acc.uid).set({
      displayName: acc.displayName,
      email,
      unit: acc.unit,
      unitPath: unitPathFor(acc.unit),
      role: acc.role,
      jabatan: acc.jabatan,
      active: true,
      xp: acc.xp,
      level: Math.floor(acc.xp / 500) + 1,
      avatarId: 'default',
      weekKey: CURRENT_WEEK,
      xpWeek: acc.xpWeek,
      monthKey: CURRENT_MONTH,
      xpMonth: acc.xpMonth,
      createdAt: FieldValue.serverTimestamp()
    });
  }
  console.log(`  ✓ Seeded ${allProfiles.length} allowlist entries & user profiles`);
}

function scanForForbiddenText(value, pathLabel, badHits) {
  if (typeof value === 'string') {
    if (value.includes('[') || value.includes(']') || /\bTODO\b/i.test(value)) {
      badHits.push(`${pathLabel}: ${value}`);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, idx) => scanForForbiddenText(item, `${pathLabel}[${idx}]`, badHits));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      scanForForbiddenText(v, `${pathLabel}.${k}`, badHits);
    }
  }
}

async function checkDemoSeed(auth, db) {
  console.log(`[demo-seed] Checking emulator project '${DEMO_PROJECT_ID}'...`);
  const badHits = [];

  const [unitsSnap, questsSnap, usersSnap, allowSnap] = await Promise.all([
    db.collection('units').get(),
    db.collection('quests').get(),
    db.collection('users').get(),
    db.collection('allowedEmails').get()
  ]);

  if (unitsSnap.size < UNITS.length) {
    throw new Error(`Expected >= ${UNITS.length} units, found ${unitsSnap.size}`);
  }
  const verifiedCount = UNITS.filter((u) => u.verified).length;
  const expectedMinQuests = verifiedCount * 2 + 1;
  if (questsSnap.size < expectedMinQuests) {
    throw new Error(`Expected >= ${expectedMinQuests} quests, found ${questsSnap.size}`);
  }
  if (usersSnap.size < 36) {
    throw new Error(`Expected >= 36 users, found ${usersSnap.size}`);
  }

  for (const acc of PRIMARY_DEMO_ACCOUNTS) {
    const authUser = await auth.getUserByEmail(acc.email);
    if (!authUser.emailVerified) {
      throw new Error(`Auth user ${acc.email} is not emailVerified`);
    }
  }

  for (const [colName, snap] of [
    ['units', unitsSnap],
    ['quests', questsSnap],
    ['users', usersSnap],
    ['allowedEmails', allowSnap]
  ]) {
    snap.forEach((d) => {
      scanForForbiddenText(d.data(), `${colName}/${d.id}`, badHits);
    });
  }

  if (badHits.length > 0) {
    console.error('❌ Forbidden placeholder text ("[", "]", or "TODO") found in seeded data:');
    for (const hit of badHits) console.error('  -', hit);
    process.exit(1);
  }

  console.log(
    `  ✓ Check passed: ${unitsSnap.size} units, ${questsSnap.size} quests, ${usersSnap.size} users, ` +
    `${allowSnap.size} allowlist entries, ${PRIMARY_DEMO_ACCOUNTS.length} Auth accounts, 0 placeholder hits.`
  );
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const app = getDemoApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (args.has('--check')) {
    await checkDemoSeed(auth, db);
    return;
  }
  if (args.has('--reset')) {
    await wipeEmulator(auth, db);
  }
  await seedDemo(auth, db);
  console.log('[demo-seed] Done.\n');
}

main().catch((err) => {
  console.error('❌ [demo-seed] Error:', err);
  process.exit(1);
});
