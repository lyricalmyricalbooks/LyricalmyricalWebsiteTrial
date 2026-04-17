/**
 * legacyFirebase.ts
 *
 * Initializes a SECONDARY Firebase app connected to the legacy
 * Lyricalmyrical inventory project (lyricalmyrical-37c46).
 *
 * This is read-only from the website's perspective — we only pull
 * stock levels from the RTDB and write them into the main Firestore.
 * The legacy app's auth is signed into separately using the same
 * Google account (lyricalmyricalbooks@gmail.com).
 */
import { initializeApp, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const LEGACY_APP_NAME = "lyricalmyrical-legacy";

const legacyConfig = {
  apiKey: "AIzaSyB0BTOjfUFZKCVth9eR8iN0mvfkpRIFKSI",
  authDomain: "lyricalmyrical-37c46.firebaseapp.com",
  databaseURL: "https://lyricalmyrical-37c46-default-rtdb.firebaseio.com",
  projectId: "lyricalmyrical-37c46",
  storageBucket: "lyricalmyrical-37c46.firebasestorage.app",
  messagingSenderId: "448719824639",
  appId: "1:448719824639:web:2aa79291b13bf6716ececa",
};

function getLegacyApp() {
  try {
    return getApp(LEGACY_APP_NAME);
  } catch {
    return initializeApp(legacyConfig, LEGACY_APP_NAME);
  }
}

export const legacyApp = getLegacyApp();
export const legacyDb = getDatabase(legacyApp);
export const legacyAuth = getAuth(legacyApp);
