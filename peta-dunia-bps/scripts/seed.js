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

  for (const entry of ALLOWED_EMAILS) {
    const docRef = db.collection('allowedEmails').doc(entry.email.toLowerCase());
    await docRef.set(entry.data, { merge: true });
    console.log(`  ✓ [${projectId}] allowedEmails/${entry.email.toLowerCase()} ->`, entry.data);
  }
}

async function seedAll() {
  console.log(`[Seed] Connecting to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}...`);
  for (const proj of targetProjects) {
    await seedProject(proj);
  }
  console.log(`[Seed] Successfully seeded allowlist entries for all target projects!\n`);
}

seedAll().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
