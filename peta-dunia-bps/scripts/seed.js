// Seed script targeting Firestore emulator only
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Guard: Target EMULATOR ONLY
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('\n❌ ERROR: FIRESTORE_EMULATOR_HOST environment variable is not set!');
  console.error('This seed script targets the local emulator suite ONLY and refuses to run against remote production.');
  console.error('Please run with: $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"; npm run seed\n');
  process.exit(1);
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
  {
    email: 'pegawai1@bps.go.id',
    data: {
      displayName: 'Budi Santoso',
      unit: 'biro-sdm',
      role: 'employee'
    }
  },
  {
    email: 'pegawai2@bps.go.id',
    data: {
      displayName: 'Siti Rahma',
      unit: 'biro-umum',
      role: 'employee'
    }
  },
  {
    email: 'admin@bps.go.id',
    data: {
      displayName: 'Admin Utama',
      unit: 'biro-sdm',
      role: 'admin'
    }
  }
];

const UNITS = [
  {
    id: 'biro-sdm',
    data: {
      name: 'Biro Sumber Daya Manusia',
      parentUnit: 'Sekretariat Utama',
      description: 'Biro yang mengelola perencanaan, mutasi, pengembangan, dan kesejahteraan pegawai BPS',
      level: 2
    }
  }
];

const QUESTS = [
  {
    id: 'quest-daily-1',
    data: {
      unitId: 'biro-sdm',
      title: '[Judul quest 1] Presensi & Rencana Harian',
      description: '[Deskripsi quest harian pengisian presensi dan log aktivitas harian pegawai]',
      type: 'daily',
      xp: 20,
      active: true
    }
  },
  {
    id: 'quest-checkpoint-1',
    data: {
      unitId: 'biro-sdm',
      title: '[Judul quest 2] Pemahaman Pola Karir Pegawai',
      description: '[Pelajari panduan pola karir ASN BPS dan selesaikan kuis pemahaman]',
      type: 'checkpoint',
      xp: 50,
      active: true,
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
      title: '[Judul quest 3] Kode Etik BerAKHLAK',
      description: '[Pahami nilai-nilai dasar BerAKHLAK dalam pelaksanaan tugas sehari-hari]',
      type: 'checkpoint',
      xp: 30,
      active: true,
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

const MOCK_USERS = [
  {
    id: 'mock_user_1',
    data: {
      displayName: 'Andi Pratama',
      email: 'andi@bps.go.id',
      unit: 'biro-sdm',
      role: 'employee',
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
      role: 'employee',
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
      role: 'employee',
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
      role: 'employee',
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
      role: 'employee',
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
      role: 'employee',
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
    console.log(`  ✓ [${projectId}] allowedEmails/${entry.email.toLowerCase()} ->`, entry.data.displayName);
  }

  // Seed units
  for (const u of UNITS) {
    const docRef = db.collection('units').doc(u.id);
    await docRef.set(u.data, { merge: true });
    console.log(`  ✓ [${projectId}] units/${u.id} ->`, u.data.name);
  }

  // Seed quests
  for (const q of QUESTS) {
    const docRef = db.collection('quests').doc(q.id);
    await docRef.set(q.data, { merge: true });
    console.log(`  ✓ [${projectId}] quests/${q.id} ->`, q.data.title, `(+${q.data.xp} XP)`);
  }

  // Seed mock users for leaderboard
  for (const m of MOCK_USERS) {
    const docRef = db.collection('users').doc(m.id);
    await docRef.set(m.data, { merge: true });
    console.log(`  ✓ [${projectId}] users/${m.id} ->`, m.data.displayName, `(xp: ${m.data.xp}, xpWeek: ${m.data.xpWeek})`);
  }
}

async function seedAll() {
  console.log(`[Seed] Connecting to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}...`);
  for (const proj of targetProjects) {
    await seedProject(proj);
  }
  console.log(`[Seed] Successfully seeded all data (allowlist, units, quests, leaderboard users)!\n`);
}

seedAll().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
