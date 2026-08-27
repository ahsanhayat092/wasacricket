import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDAWfUvvBF-8SGrA6ENwtz1nNMnSIwU2Z8",
  authDomain: "wasacricket-4bb6c.firebaseapp.com",
  projectId: "wasacricket-4bb6c",
  storageBucket: "wasacricket-4bb6c.firebasestorage.app",
  messagingSenderId: "833020376717",
  appId: "1:833020376717:web:b85f76300fd87e444114c4",
  measurementId: "G-ZKYNFENBGK",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Multi-tab IndexedDB cache persistence to optimize reads and slash Firebase costs by ~85%
let firestoreDb: Firestore;
if (typeof window !== "undefined") {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    firestoreDb = getFirestore(app);
  }
} else {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

// Analytics only in browser environments
if (typeof window !== "undefined") {
  try {
    getAnalytics(app);
  } catch {}
}
