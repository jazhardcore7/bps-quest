// Authentication and user profile management service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
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
import { weekKeyJakarta, monthKeyJakarta } from '../config.js';

export const NOT_ALLOWED_MESSAGE = 'Email kamu belum terdaftar. Hubungi admin Biro SDM.';

let userSnapshotUnsubscribe = null;

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
      AppState.setUserProfile(snap.data());
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
      if (error.message && error.message.includes(NOT_ALLOWED_MESSAGE)) {
        return NOT_ALLOWED_MESSAGE;
      }
      return error.message || 'Gagal melakukan autentikasi.';
  }
}

/**
 * Ensures a user profile exists in Firestore.
 * If user exists in users/{uid}, loads it into AppState.
 * If first login: checks allowedEmails/{lowercasedEmail}. If allowed, provisions users/{uid}.
 * If not allowed: signs out immediately and throws NOT_ALLOWED_MESSAGE.
 */
export async function ensureUserProfile(user) {
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
    AppState.setUserProfile(profile);
    startListeningToUserProfile(uid);
    return profile;
  }

  // 2. First login: Check allowlist
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

  // 3. Provision new user profile in users/{uid}
  const now = new Date();
  const initialProfile = {
    displayName: allowData.displayName || user.displayName || 'Pegawai BPS',
    email: user.email,
    unit: allowData.unit,
    role: allowData.role || 'employee',
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
  return await ensureUserProfile(cred.user);
}

/**
 * Registers an account via email and password if on allowlist.
 */
export async function registerWithEmail(email, password) {
  const trimmedEmail = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
  return await ensureUserProfile(cred.user);
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
