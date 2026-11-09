// Environment configuration, game constants, and time helpers
const env = (typeof import.meta !== 'undefined' && import.meta.env && Object.keys(import.meta.env).length > 0)
  ? import.meta.env
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const REQUIRED_FIREBASE_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

export function getFirebaseConfig() {
  const missing = [];
  for (const varName of REQUIRED_FIREBASE_VARS) {
    if (!env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required Firebase environment variables: ${missing.join(', ')}`);
  }

  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : undefined);

  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  };
}

export const useEmulators = env.DEV && env.VITE_USE_EMULATORS === 'true';

// Unit ID mapping for MVP
export const UNIT_IDS = {
  BIRO_SDM: 'biro-sdm'
};

export const UNIT_MAPPINGS = {
  'Biro SDM': 'biro-sdm',
  'biro-sdm': 'biro-sdm'
};

export function toUnitId(unit) {
  if (!unit) return '';
  return UNIT_MAPPINGS[unit] || String(unit).toLowerCase().replace(/[\s_]+/g, '-');
}

// Gamification Level Constants & Helpers
export const XP_PER_LEVEL = 500;

export function calculateLevel(xp) {
  return Math.floor(Math.max(0, xp || 0) / XP_PER_LEVEL) + 1;
}

// Time helpers computed in Asia/Jakarta (UTC+7)
export function getJakartaDate(date) {
  const d = new Date(date instanceof Date ? date.getTime() : (date ? new Date(date).getTime() : Date.now()));
  // Asia/Jakarta is fixed UTC+7 (no daylight saving time)
  return new Date(d.getTime() + 7 * 60 * 60 * 1000);
}

/**
 * Returns the ISO 8601 week key (Monday-start, format "YYYY-Www") in Asia/Jakarta time.
 */
export function weekKeyJakarta(date) {
  const d = getJakartaDate(date);
  // ISO day: Mon = 1, Tue = 2, ..., Sun = 7
  const day = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  // Target Thursday of the current week determines ISO year
  const targetThursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (4 - day)));
  const isoYear = targetThursday.getUTCFullYear();

  // First Thursday of the ISO year (week 1 contains Jan 4)
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const ftDay = firstThursday.getUTCDay() === 0 ? 7 : firstThursday.getUTCDay();
  firstThursday.setUTCDate(firstThursday.getUTCDate() + (4 - ftDay));

  const weekNum = 1 + Math.round((targetThursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${isoYear}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Returns the month key (format "YYYY-MM") in Asia/Jakarta time.
 */
export function monthKeyJakarta(date) {
  const d = getJakartaDate(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns the daily period key (format "YYYY-MM-DD") in Asia/Jakarta time.
 */
export function dailyPeriodKeyJakarta(date) {
  const d = getJakartaDate(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
