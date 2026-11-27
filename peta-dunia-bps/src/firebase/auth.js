// Authentication and user profile management service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './client.js';
import { AppState } from '../state/index.js';
import { weekKeyJakarta, monthKeyJakarta, normalizeDisplayName } from '../config.js';
import bpsStructure from '../data/bps-structure.json' with { type: 'json' };

export const NOT_ALLOWED_MESSAGE = 'Email kamu belum terdaftar. Hubungi admin Biro SDM.';
export const INACTIVE_ACCOUNT_MESSAGE = 'Akun dinonaktifkan. Hubungi super admin.';
export const VERIFY_SENT_MESSAGE = 'Akun dibuat. Buka tautan verifikasi yang dikirim ke email kamu, lalu masuk.';
export const NOT_VERIFIED_MESSAGE = 'Email kamu belum diverifikasi. Kami kirim ulang tautan verifikasi; buka tautan itu lalu masuk lagi.';

const STATIC_UNITS_BY_ID = new Map(bpsStructure.units.map((u) => [u.id, u]));

async function computeUnitPath(unitId) {
  if (!unitId) return [];
  try {
    const unitSnap = await getDoc(doc(db, 'units', unitId));
    if (unitSnap.exists()) {
      const data = unitSnap.data();
      if (Array.isArray(data.ancestorIds)) {
        return [...data.ancestorIds, unitId];
      }
    }
  } catch (_) {
    // Fall back to static structure below when offline or units collection is empty.
  }
  const staticUnit = STATIC_UNITS_BY_ID.get(unitId);
  if (staticUnit && Array.isArray(staticUnit.ancestorIds)) {
    return [...staticUnit.ancestorIds, unitId];
  }
  return [unitId];
}

// Marker so callers can tell the "verify your email first" case apart.
function verificationError(message) {
  const err = new Error(message);
  err.code = 'app/email-not-verified';
  return err;
}

let userSnapshotUnsubscribe = null;
// True while registerWithEmail runs, so the auth listener does not race it.
let registrationInProgress = false;

export function stopListeningToUserProfile() {
  if (userSnapshotUnsubscribe) {
    userSnapshotUnsubscribe();
    userSnapshotUnsubscribe = null;
  }
}

export function startListeningToUserProfile(uid) {
  stopListeningToUserProfile();
  if (!uid) return;

  const userDocRef = doc(db, 'users', uid);
  userSnapshotUnsubscribe = onSnapshot(userDocRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      if (data.active === false) {
        stopListeningToUserProfile();
        AppState.clearUser();
        signOut(auth).catch(() => {});
        return;
      }
      AppState.setUserProfile(data);
    }
  }, (err) => {
    console.warn('User profile onSnapshot error:', err);
  });
}

export function mapAuthError(error) {
  if (!error) return 'Terjadi kesalahan tidak dikenal.';
  if (typeof error === 'string') return error;

  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email atau kata sandi salah.';
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar. Silakan masuk.';
    case 'auth/weak-password':
      return 'Kata sandi minimal 6 karakter.';
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan masuk yang gagal. Silakan coba beberapa saat lagi.';
    case 'auth/popup-closed-by-user':
      return 'Jendela masuk dengan Google ditutup sebelum selesai.';
    default:
      if (error.message && error.message.includes(INACTIVE_ACCOUNT_MESSAGE)) {
        return INACTIVE_ACCOUNT_MESSAGE;
      }
      if (error.message && error.message.includes(NOT_ALLOWED_MESSAGE)) {
        return NOT_ALLOWED_MESSAGE;
      }
      return error.message || 'Gagal melakukan autentikasi.';
  }
}

// On sign-in, both the login call and the auth listener ensure the profile.
// They share one run per uid; otherwise on first login both try to create
// users/{uid} and the loser's write is denied by the rules.
const profileRuns = new Map();

/**
 * Ensures a user profile exists in Firestore.
 * If user exists in users/{uid}, loads it into AppState.
 * If first login: checks allowedEmails/{lowercasedEmail}. If allowed, provisions users/{uid}.
 * If not allowed or inactive: signs out immediately and throws an Indonesian error message.
 */
export function ensureUserProfile(user) {
  const uid = user && user.uid;
  if (!uid) return provisionUserProfile(user);
  if (!profileRuns.has(uid)) {
    profileRuns.set(uid, provisionUserProfile(user).finally(() => profileRuns.delete(uid)));
  }
  return profileRuns.get(uid);
}

async function provisionUserProfile(user) {
  if (!user || !user.email) {
    throw new Error('Pengguna tidak valid atau tidak memiliki email.');
  }

  const uid = user.uid;
  const lowerEmail = user.email.toLowerCase();

  // 1. Check if user document already exists
  const userDocRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const profile = userSnap.data();
    if (profile.active === false) {
      await signOut(auth);
      throw new Error(INACTIVE_ACCOUNT_MESSAGE);
    }
    AppState.setUserProfile(profile);
    startListeningToUserProfile(uid);
    return profile;
  }

  // 2. First login: check allowlist
  let allowSnap;
  try {
    const allowDocRef = doc(db, 'allowedEmails', lowerEmail);
    allowSnap = await getDoc(allowDocRef);
  } catch (err) {
    console.error('Allowlist check failed:', err);
    await signOut(auth);
    throw new Error(NOT_ALLOWED_MESSAGE);
  }

  if (!allowSnap.exists()) {
    // Attempt to delete auth user if it was just registered
    try {
      if (typeof user.delete === 'function') {
        await user.delete();
      }
    } catch (_) {}
    await signOut(auth);
    throw new Error(NOT_ALLOWED_MESSAGE);
  }

  const allowData = allowSnap.data();

  if (allowData.active === false) {
    await signOut(auth);
    throw new Error(INACTIVE_ACCOUNT_MESSAGE);
  }

  // 3. A verified email is required before the profile is created
  //    (firestore.rules enforces this as well).
  if (!user.emailVerified) {
    await signOut(auth);
    throw verificationError(NOT_VERIFIED_MESSAGE);
  }

  // 4. Provision new user profile in users/{uid}
  const unitPath = await computeUnitPath(allowData.unit);
  const now = new Date();
  const initialProfile = {
    displayName: normalizeDisplayName(allowData.displayName || user.displayName, user.email),
    email: user.email,
    unit: allowData.unit,
    unitPath,
    role: allowData.role || 'employee',
    active: allowData.active !== false,
    ...(typeof allowData.jabatan === 'string' && allowData.jabatan.trim()
      ? { jabatan: allowData.jabatan.trim().slice(0, 80) }
      : {}),
    xp: 0,
    level: 1,
    avatarId: 'default',
    weekKey: weekKeyJakarta(now),
    xpWeek: 0,
    monthKey: monthKeyJakarta(now),
    xpMonth: 0,
    createdAt: serverTimestamp()
  };

  await setDoc(userDocRef, initialProfile);
  AppState.setUserProfile(initialProfile);
  startListeningToUserProfile(uid);
  return initialProfile;
}

/**
 * Signs in using email and password.
 */
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  try {
    return await ensureUserProfile(cred.user);
  } catch (err) {
    if (err && err.code === 'app/email-not-verified') {
      // Re-send the link; ignore rate-limit errors so the message still shows.
      try { await sendEmailVerification(cred.user); } catch (_) {}
    }
    throw err;
  }
}

/**
 * Registers an account via email and password. The profile is created on the
 * first login after the email address is verified.
 */
export async function registerWithEmail(email, password) {
  const trimmedEmail = email.trim().toLowerCase();
  registrationInProgress = true;
  try {
    return await registerAndSendVerification(trimmedEmail, password);
  } finally {
    registrationInProgress = false;
  }
}

async function registerAndSendVerification(trimmedEmail, password) {
  const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

  // Only active allowlisted addresses get a verification email; others are removed.
  let allowSnap = null;
  try {
    allowSnap = await getDoc(doc(db, 'allowedEmails', trimmedEmail));
  } catch (_) {
    allowSnap = null;
  }
  if (!allowSnap || !allowSnap.exists()) {
    try { await cred.user.delete(); } catch (_) {}
    await signOut(auth);
    throw new Error(NOT_ALLOWED_MESSAGE);
  }
  if (allowSnap.data().active === false) {
    try { await cred.user.delete(); } catch (_) {}
    await signOut(auth);
    throw new Error(INACTIVE_ACCOUNT_MESSAGE);
  }

  try {
    await sendEmailVerification(cred.user);
  } finally {
    stopListeningToUserProfile();
    await signOut(auth);
  }
  throw verificationError(VERIFY_SENT_MESSAGE);
}

/**
 * Signs in using Google Popup provider.
 */
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return await ensureUserProfile(cred.user);
}

/**
 * Signs out current user and clears AppState.
 */
export async function logout() {
  stopListeningToUserProfile();
  await signOut(auth);
  AppState.clearUser();
}

/**
 * Subscribes to Firebase Auth state changes.
 */
export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user && registrationInProgress) {
      // registerWithEmail signs this user out itself once the email is sent;
      // the sign-out event then reaches the callback as usual.
      return;
    }
    if (user) {
      try {
        await ensureUserProfile(user);
        callback(user, AppState.user);
      } catch (err) {
        console.warn('Auth state change allowlist error:', err);
        stopListeningToUserProfile();
        callback(null, null);
      }
    } else {
      stopListeningToUserProfile();
      AppState.clearUser();
      callback(null, null);
    }
  });
}
