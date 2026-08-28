import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Vite replaces these at build time. Keeping the values in this module (rather
// than reading process.env) makes them available from Electron's packaged
// renderer as well as from the web build.
const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: env.VITE_FIREBASE_APP_ID?.trim(),
};

export const isFirebaseConfigured = () => Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
const app = isFirebaseConfigured() ? (getApps().length ? getApp() : initializeApp(config)) : null;
export const firebaseAuth = app ? getAuth(app) : null;
// Persist authenticated cloud data in IndexedDB. Firestore reads this cache
// after an offline restart and automatically synchronizes queued changes when
// connectivity returns. Multi-tab management also covers the web build safely.
export const firestore = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null;
export const storage = app ? getStorage(app) : null;
