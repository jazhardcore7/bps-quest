// Firebase client initialization and emulator wiring
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFirebaseConfig, useEmulators } from '../config.js';

const config = getFirebaseConfig();

export const app = getApps().length === 0 ? initializeApp(config) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

if (useEmulators) {
  // Connect to local Firebase Emulators (Auth: 9099, Firestore: 8080)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
