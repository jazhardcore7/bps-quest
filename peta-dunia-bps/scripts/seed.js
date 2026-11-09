// Seed script targeting Firestore emulator only
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
}

async function seedAll() {
  console.log(`[Seed] Connecting to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}...`);
  for (const proj of targetProjects) {
    await seedProject(proj);
  }
  console.log(`[Seed] Successfully seeded all data (allowlist, units, quests)!\n`);
}

seedAll().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
