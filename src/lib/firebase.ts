import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Analytics only in browser environments
if (typeof window !== "undefined") {
  getAnalytics(app);
}
