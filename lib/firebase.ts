import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getMessaging, Messaging } from "firebase/messaging";
import { getFunctions, Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const analytics: Analytics = getAnalytics(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const auth: Auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Messaging and Functions
// Check if window is defined to avoid SSR/build errors
let messaging: Messaging | undefined;
let functions: Functions | undefined;

if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
    functions = getFunctions(app);
  } catch (err) {
    console.warn("Firebase Messaging/Functions initialization failed (probably unsupported env):", err);
  }
}

console.log("Firebase initialized successfully");

export { db, app, analytics, storage, auth, googleProvider, messaging, functions };
