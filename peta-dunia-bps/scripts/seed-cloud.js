// Seed script targeting Remote / Cloud Firestore
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Guard: Ensure NOT running with emulator host
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('ℹ️  FIRESTORE_EMULATOR_HOST is set (' + process.env.FIRESTORE_EMULATOR_HOST + ').');
  console.log('Unsetting FIRESTORE_EMULATOR_HOST to target Remote Cloud Firestore...\n');
  delete process.env.FIRESTORE_EMULATOR_HOST;
}

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

if (!projectId) {
  console.error('\n❌ ERROR: VITE_FIREBASE_PROJECT_ID tidak ditemukan di lingkungan.');
  console.error('Pastikan berkas .env Anda telah berisi VITE_FIREBASE_PROJECT_ID=<project-id-anda>.\n');
  process.exit(1);
}

// Check for service account key
let credentialOption;
const possibleKeyPaths = [
  path.resolve('./serviceAccountKey.json'),
  path.resolve('./serviceAccount.json'),
  process.env.GOOGLE_APPLICATION_CREDENTIALS
].filter(Boolean);

let foundKey = possibleKeyPaths.find((p) => fs.existsSync(p));

if (foundKey) {
  console.log(`✓ Menggunakan service account key: ${foundKey}`);
  const serviceAccount = JSON.parse(fs.readFileSync(foundKey, 'utf8'));
  credentialOption = cert(serviceAccount);
} else {
  try {
    credentialOption = applicationDefault();
    console.log('✓ Menggunakan Application Default Credentials (ADC)');
  } catch (e) {
    console.log('\n⚠️  Kredensial Service Account belum ditemukan.');
    console.log('Untuk menulis langsung ke Cloud Firestore via script Node.js Admin SDK:');
    console.log('1. Buka Firebase Console > Project Settings > Service accounts.');
    console.log('2. Klik "Generate new private key" dan simpan sebagai "serviceAccountKey.json" di folder peta-dunia-bps/.');
    console.log('   (Berkas ini sudah otomatis masuk ke .gitignore dan aman).');
    console.log('3. Atau jalankan: gcloud auth application-default login\n');
    console.log('Sebagai alternatif, Anda juga dapat menambahkan data unit, quest, dan email Anda langsung melalui Firebase Console > Firestore Database.');
    process.exit(1);
  }
}

const app = getApps().length === 0 ? initializeApp({
  credential: credentialOption,
  projectId
}) : getApps()[0];

const db = getFirestore(app);

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

// Check if user passed an email to add as allowed email
// Usage: node scripts/seed-cloud.js [email] [displayName] [unit] [role]
const args = process.argv.slice(2);
const customEmail = args[0] ? args[0].trim().toLowerCase() : null;
const customName = args[1] || 'Pegawai BPS';
const customUnit = args[2] || 'biro-sdm';
const customRole = args[3] || 'employee';

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
    email: 'admin@bps.go.id',
    data: {
      displayName: 'Admin Utama',
      unit: 'biro-sdm',
      role: 'admin'
    }
  }
];

if (customEmail) {
  ALLOWED_EMAILS.push({
    email: customEmail,
    data: {
      displayName: customName,
      unit: customUnit,
      role: customRole
    }
  });
}

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

async function seedCloud() {
  console.log(`\n🚀 Seeding data awal ke Cloud Firestore project '${projectId}'...`);

  // 1. Seed Allowed Emails
  console.log('\n--- 1. Seeding allowedEmails ---');
  for (const item of ALLOWED_EMAILS) {
    await db.collection('allowedEmails').doc(item.email.toLowerCase()).set(item.data, { merge: true });
    console.log(`  ✓ allowedEmails/${item.email} -> ${item.data.displayName} (${item.data.role})`);
  }

  // 2. Seed Units
  console.log('\n--- 2. Seeding units ---');
  for (const item of UNITS) {
    await db.collection('units').doc(item.id).set(item.data, { merge: true });
    console.log(`  ✓ units/${item.id} -> ${item.data.name}`);
  }

  // 3. Seed Quests
  console.log('\n--- 3. Seeding quests ---');
  for (const item of QUESTS) {
    await db.collection('quests').doc(item.id).set(item.data, { merge: true });
    console.log(`  ✓ quests/${item.id} -> ${item.data.title}`);
  }

  console.log('\n✅ Seeding ke Cloud Firestore selesai dengan sukses!');
  if (customEmail) {
    console.log(`Email Anda (${customEmail}) telah ditambahkan ke allowlist dengan unit '${customUnit}' dan peran '${customRole}'.`);
  }
}

seedCloud().catch((err) => {
  console.error('\n❌ Gagal melakukan seed ke Cloud Firestore:', err);
  process.exit(1);
});
