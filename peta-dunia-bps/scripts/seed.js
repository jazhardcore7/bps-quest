// Seed script targeting Firestore emulator only
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Guard: Target EMULATOR ONLY
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('\n❌ ERROR: FIRESTORE_EMULATOR_HOST environment variable is not set!');
  console.error('This seed script targets the local emulator suite ONLY and refuses to run against remote production.');
  console.error('Please run with: $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"; npm run seed\n');
  process.exit(1);
}

const structurePath = path.resolve(__dirname, '../src/data/bps-structure.json');
const bpsStructure = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
const UNITS_BY_ID = new Map(bpsStructure.units.map((u) => [u.id, u]));

function unitPathFor(unitId) {
  const unit = UNITS_BY_ID.get(unitId);
  return unit ? [...unit.ancestorIds, unitId] : [unitId];
}

const targetProjects = Array.from(new Set([
  'peta-dunia-bps',
  'demo-bps',
  process.env.GCLOUD_PROJECT,
  process.env.VITE_FIREBASE_PROJECT_ID
].filter(Boolean)));

function getJakartaDateParts(date = new Date()) {
  const d = new Date(date.getTime() + (7 * 60 + date.getTimezoneOffset()) * 60000);
  return d;
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
  const year = jkt.getFullYear();
  const month = String(jkt.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const now = new Date();
const currentWeek = weekKeyJakarta(now);
const currentMonth = monthKeyJakarta(now);

const ALLOWED_EMAILS = [
  // Existing demo accounts (kept working)
  {
    email: 'pegawai1@bps.go.id',
    data: {
      email: 'pegawai1@bps.go.id',
      displayName: 'Budi Santoso',
      unit: 'biro-sdm',
      role: 'employee',
      jabatan: 'Analis SDM Aparatur Ahli Pertama',
      active: true
    }
  },
  {
    email: 'pegawai2@bps.go.id',
    data: {
      email: 'pegawai2@bps.go.id',
      displayName: 'Siti Rahma',
      unit: 'biro-umum',
      role: 'employee',
      jabatan: 'Pranata Humas Ahli Pertama',
      active: true
    }
  },
  {
    email: 'admin@bps.go.id',
    data: {
      email: 'admin@bps.go.id',
      displayName: 'Admin Utama',
      unit: 'biro-sdm',
      role: 'admin',
      jabatan: 'Administrator Sistem',
      active: true
    }
  },
  // Role matrix demo accounts
  {
    email: 'superadmin@bps.go.id',
    data: {
      email: 'superadmin@bps.go.id',
      displayName: 'Super Admin BPS',
      unit: 'bps-pusat',
      role: 'super_admin',
      jabatan: 'Pengelola Sistem Utama',
      active: true
    }
  },
  {
    email: 'kepala@bps.go.id',
    data: {
      email: 'kepala@bps.go.id',
      displayName: 'Pimpinan Tertinggi Demo',
      unit: 'bps-pusat',
      role: 'head_top',
      jabatan: 'Kepala BPS',
      active: true
    }
  },
  {
    email: 'sestama@bps.go.id',
    data: {
      email: 'sestama@bps.go.id',
      displayName: 'Sekretaris Utama Demo',
      unit: 'sestama',
      role: 'head_e1',
      jabatan: 'Sekretaris Utama',
      active: true
    }
  },
  {
    email: 'karo.sdm@bps.go.id',
    data: {
      email: 'karo.sdm@bps.go.id',
      displayName: 'Kepala Biro SDM Demo',
      unit: 'biro-sdm',
      role: 'head_e2',
      jabatan: 'Kepala Biro Sumber Daya Manusia',
      active: true
    }
  },
  {
    email: 'dir.harga@bps.go.id',
    data: {
      email: 'dir.harga@bps.go.id',
      displayName: 'Direktur Statistik Harga Demo',
      unit: 'dir-harga',
      role: 'head_e2',
      jabatan: 'Direktur Statistik Harga',
      active: true
    }
  },
  {
    email: 'nonaktif@bps.go.id',
    data: {
      email: 'nonaktif@bps.go.id',
      displayName: 'Pegawai Nonaktif',
      unit: 'biro-sdm',
      role: 'employee',
      jabatan: 'Pranata Komputer Pelaksana',
      active: false
    }
  }
];

const QUESTS = [
  {
    id: 'quest-daily-1',
    data: {
      unitId: 'biro-sdm',
      title: 'Presensi dan Rencana Harian',
      description: 'Catat presensi serta rencana aktivitas kerja harian pegawai Biro SDM.',
      type: 'daily',
      xp: 20,
      active: true,
      createdBy: 'seed',
      createdAt: FieldValue.serverTimestamp(),
      updatedBy: 'seed',
      updatedAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'quest-checkpoint-1',
    data: {
      unitId: 'biro-sdm',
      title: 'Pemahaman Pola Karir Pegawai',
      description: 'Pelajari panduan pola karir ASN BPS dan selesaikan kuis pemahaman.',
      type: 'checkpoint',
      xp: 50,
      active: true,
      createdBy: 'seed',
      createdAt: FieldValue.serverTimestamp(),
      updatedBy: 'seed',
      updatedAt: FieldValue.serverTimestamp(),
      quiz: {
        question: 'Apa prinsip utama dalam implementasi sistem merit manajemen ASN di BPS?',
        options: [
          'Kualifikasi, kompetensi, dan kinerja secara adil dan wajar',
          'Senioritas dan masa kerja tanpa evaluasi kinerja',
          'Kedekatan personal dan rekomendasi subjektif',
          'Tingkat pendidikan formal semata'
        ],
        correctIndex: 0
      }
    }
  },
  {
    id: 'quest-checkpoint-2',
    data: {
      unitId: 'biro-sdm',
      title: 'Kode Etik BerAKHLAK',
      description: 'Pahami nilai-nilai dasar BerAKHLAK dalam pelaksanaan tugas sehari-hari.',
      type: 'checkpoint',
      xp: 30,
      active: true,
      createdBy: 'seed',
      createdAt: FieldValue.serverTimestamp(),
      updatedBy: 'seed',
      updatedAt: FieldValue.serverTimestamp(),
      quiz: {
        question: 'Dalam core values BerAKHLAK, perilaku saling peduli dan menghargai perbedaan mencerminkan nilai...',
        options: [
          'Berorientasi Pelayanan',
          'Harmonis',
          'Loyal',
          'Adaptif'
        ],
        correctIndex: 1
      }
    }
  }
];

const ROLE_PROFILES = [
  {
    id: 'uid_super_admin',
    data: {
      displayName: 'Super Admin BPS',
      email: 'superadmin@bps.go.id',
      unit: 'bps-pusat',
      unitPath: unitPathFor('bps-pusat'),
      role: 'super_admin',
      jabatan: 'Pengelola Sistem Utama',
      active: true,
      xp: 0,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 0,
      monthKey: currentMonth,
      xpMonth: 0,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'uid_head_top',
    data: {
      displayName: 'Pimpinan Tertinggi Demo',
      email: 'kepala@bps.go.id',
      unit: 'bps-pusat',
      unitPath: unitPathFor('bps-pusat'),
      role: 'head_top',
      jabatan: 'Kepala BPS',
      active: true,
      xp: 0,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 0,
      monthKey: currentMonth,
      xpMonth: 0,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'uid_head_e1_sestama',
    data: {
      displayName: 'Sekretaris Utama Demo',
      email: 'sestama@bps.go.id',
      unit: 'sestama',
      unitPath: unitPathFor('sestama'),
      role: 'head_e1',
      jabatan: 'Sekretaris Utama',
      active: true,
      xp: 0,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 0,
      monthKey: currentMonth,
      xpMonth: 0,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'uid_head_e2_sdm',
    data: {
      displayName: 'Kepala Biro SDM Demo',
      email: 'karo.sdm@bps.go.id',
      unit: 'biro-sdm',
      unitPath: unitPathFor('biro-sdm'),
      role: 'head_e2',
      jabatan: 'Kepala Biro Sumber Daya Manusia',
      active: true,
      xp: 0,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 0,
      monthKey: currentMonth,
      xpMonth: 0,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'uid_head_e2_harga',
    data: {
      displayName: 'Direktur Statistik Harga Demo',
      email: 'dir.harga@bps.go.id',
      unit: 'dir-harga',
      unitPath: unitPathFor('dir-harga'),
      role: 'head_e2',
      jabatan: 'Direktur Statistik Harga',
      active: true,
      xp: 0,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 0,
      monthKey: currentMonth,
      xpMonth: 0,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'uid_pegawai_sdm',
    data: {
      displayName: 'Budi Santoso',
      email: 'pegawai1@bps.go.id',
      unit: 'biro-sdm',
      unitPath: unitPathFor('biro-sdm'),
      role: 'employee',
      jabatan: 'Analis SDM Aparatur Ahli Pertama',
      active: true,
      xp: 50,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 50,
      monthKey: currentMonth,
      xpMonth: 50,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'uid_pegawai_umum',
    data: {
      displayName: 'Siti Rahma',
      email: 'pegawai2@bps.go.id',
      unit: 'biro-umum',
      unitPath: unitPathFor('biro-umum'),
      role: 'employee',
      jabatan: 'Pranata Humas Ahli Pertama',
      active: true,
      xp: 75,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 75,
      monthKey: currentMonth,
      xpMonth: 75,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'uid_pegawai_inactive',
    data: {
      displayName: 'Pegawai Nonaktif',
      email: 'nonaktif@bps.go.id',
      unit: 'biro-sdm',
      unitPath: unitPathFor('biro-sdm'),
      role: 'employee',
      jabatan: 'Pranata Komputer Pelaksana',
      active: false,
      xp: 0,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 0,
      monthKey: currentMonth,
      xpMonth: 0,
      createdAt: FieldValue.serverTimestamp()
    }
  }
];

const MOCK_USERS = [
  {
    id: 'mock_user_1',
    data: {
      displayName: 'Andi Pratama',
      email: 'andi@bps.go.id',
      unit: 'biro-sdm',
      unitPath: unitPathFor('biro-sdm'),
      role: 'employee',
      active: true,
      xp: 450,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 120,
      monthKey: currentMonth,
      xpMonth: 250,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'mock_user_2',
    data: {
      displayName: 'Dewi Lestari',
      email: 'dewi@bps.go.id',
      unit: 'biro-sdm',
      unitPath: unitPathFor('biro-sdm'),
      role: 'employee',
      active: true,
      xp: 350,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 80,
      monthKey: currentMonth,
      xpMonth: 180,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'mock_user_3',
    data: {
      displayName: 'Rian Hidayat',
      email: 'rian@bps.go.id',
      unit: 'biro-umum',
      unitPath: unitPathFor('biro-umum'),
      role: 'employee',
      active: true,
      xp: 200,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 80,
      monthKey: currentMonth,
      xpMonth: 150,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'mock_user_past',
    data: {
      displayName: 'Hendra Veteran',
      email: 'hendra@bps.go.id',
      unit: 'biro-sdm',
      unitPath: unitPathFor('biro-sdm'),
      role: 'employee',
      active: true,
      xp: 600,
      level: 2,
      avatarId: 'default',
      weekKey: '2026-W01', // Past weekKey
      xpWeek: 100,
      monthKey: currentMonth,
      xpMonth: 100,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'mock_user_tie_alpha',
    data: {
      displayName: 'Citra Ayu',
      email: 'citra@bps.go.id',
      unit: 'biro-sdm',
      unitPath: unitPathFor('biro-sdm'),
      role: 'employee',
      active: true,
      xp: 100,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 40,
      monthKey: currentMonth,
      xpMonth: 100,
      createdAt: FieldValue.serverTimestamp()
    }
  },
  {
    id: 'mock_user_tie_beta',
    data: {
      displayName: 'Doni Kurniawan',
      email: 'doni@bps.go.id',
      unit: 'biro-sdm',
      unitPath: unitPathFor('biro-sdm'),
      role: 'employee',
      active: true,
      xp: 100,
      level: 1,
      avatarId: 'default',
      weekKey: currentWeek,
      xpWeek: 40,
      monthKey: currentMonth,
      xpMonth: 100,
      createdAt: FieldValue.serverTimestamp()
    }
  }
];

async function seedProject(projectId) {
  const appName = `seed-${projectId}`;
  let app;
  try {
    app = getApp(appName);
  } catch (_) {
    app = initializeApp({ projectId }, appName);
  }

  const db = getFirestore(app);
  console.log(`[Seed] Seeding project '${projectId}'...`);

  // Seed allowedEmails
  for (const entry of ALLOWED_EMAILS) {
    const docRef = db.collection('allowedEmails').doc(entry.email.toLowerCase());
    await docRef.set(entry.data, { merge: true });
    console.log(`  ✓ [${projectId}] allowedEmails/${entry.email.toLowerCase()} ->`, entry.data.displayName, `(${entry.data.role})`);
  }

  // Seed all units from src/data/bps-structure.json
  for (const u of bpsStructure.units) {
    const docRef = db.collection('units').doc(u.id);
    await docRef.set({
      ...u,
      archived: false,
      announcements: [],
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'seed'
    }, { merge: true });
  }
  console.log(`  ✓ [${projectId}] units (${bpsStructure.units.length} units from bps-structure.json)`);

  // Seed quests
  for (const q of QUESTS) {
    const docRef = db.collection('quests').doc(q.id);
    await docRef.set(q.data, { merge: true });
    console.log(`  ✓ [${projectId}] quests/${q.id} ->`, q.data.title, `(+${q.data.xp} XP)`);
  }

  // Seed role profiles + mock leaderboard users
  for (const m of [...ROLE_PROFILES, ...MOCK_USERS]) {
    const docRef = db.collection('users').doc(m.id);
    await docRef.set(m.data, { merge: true });
    console.log(`  ✓ [${projectId}] users/${m.id} ->`, m.data.displayName, `(${m.data.role})`);
  }
}

async function seedAll() {
  console.log(`[Seed] Connecting to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}...`);
  for (const proj of targetProjects) {
    await seedProject(proj);
  }
  console.log(`[Seed] Successfully seeded all data (allowlist, ${bpsStructure.units.length} units, quests, role profiles, leaderboard users)!\n`);
}

seedAll().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
