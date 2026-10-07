import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB9V866zhYfSoXplpzK1oaK7dTuXV7yDxA",
  authDomain: "lyricalmyrical-web-v2.firebaseapp.com",
  projectId: "lyricalmyrical-web-v2",
  storageBucket: "lyricalmyrical-web-v2.firebasestorage.app",
  messagingSenderId: "248894589273",
  appId: "1:248894589273:web:8bf4b06399c0931f1b6448"
};

const app = initializeApp(firebaseConfig);

// Firebase App Check (bot protection). Switches on only when the build has a reCAPTCHA v3
// site key (VITE_APP_CHECK_SITE_KEY, see docs/APP_CHECK.md); without one the site runs as before.
const appCheckKey = (import.meta as any).env?.VITE_APP_CHECK_SITE_KEY;
if (typeof window !== "undefined" && appCheckKey) {
  try {
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckKey), isTokenAutoRefreshEnabled: true });
  } catch (err) {
    console.warn("App Check could not start", err);
  }
}
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
