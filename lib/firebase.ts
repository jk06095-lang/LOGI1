import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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
let app;
let analytics;
let db;
let storage;
let auth;
let googleProvider;

try {
  // Prevent re-initialization error during hot reload or re-renders
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { db, app, analytics, storage, auth, googleProvider };