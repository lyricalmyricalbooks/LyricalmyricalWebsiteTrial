import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

import { initializeBrowserAppCheck } from "./appCheck";

const firebaseConfig = {
  apiKey: "AIzaSyB9V866zhYfSoXplpzK1oaK7dTuXV7yDxA",
  authDomain: "lyricalmyrical-web-v2.firebaseapp.com",
  projectId: "lyricalmyrical-web-v2",
  storageBucket: "lyricalmyrical-web-v2.firebasestorage.app",
  messagingSenderId: "248894589273",
  appId: "1:248894589273:web:8bf4b06399c0931f1b6448"
};

const app = initializeApp(firebaseConfig);

// One Enterprise provider; legacy v3 keys are no longer used.
export const appCheck = initializeBrowserAppCheck(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
