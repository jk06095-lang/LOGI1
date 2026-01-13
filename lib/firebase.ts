import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getMessaging, Messaging } from "firebase/messaging";
import { getFunctions, Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBLnVbFSz2jpXIVCG0D_P57S4qlzDCKi0E",
  authDomain: "fisco2.firebaseapp.com",
  projectId: "fisco2",
  storageBucket: "fisco2.firebasestorage.app",
  messagingSenderId: "902148266352",
  appId: "1:902148266352:web:761ae1544fc94ec69c17b5",
  measurementId: "G-T9QV3S5DQX"
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
