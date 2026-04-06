// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGC3bLyAq1vL7ITPyPHCntjQs221mGfeo",
  authDomain: "aura-d7b10.firebaseapp.com",
  projectId: "aura-d7b10",
  storageBucket: "aura-d7b10.firebasestorage.app",
  messagingSenderId: "994616119535",
  appId: "1:994616119535:web:29c417bb000ac968918b1a",
  measurementId: "G-GTSCMHXGPC"
};

// Initialize Firebase
const _app = initializeApp(firebaseConfig);
export const auth = getAuth(_app);
export const db = getFirestore(_app);

// Export analytics safely for browser environments only
export let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(_app);
}

console.log('[Firebase] Initialized Successfully');
