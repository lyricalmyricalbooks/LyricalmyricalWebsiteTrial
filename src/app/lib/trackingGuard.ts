import { consentAllows } from "./consent";
import { auth } from "../../lib/firebase";

/** The Studio preview iframe / new-tab preview runs the real storefront; it must not count as shopper traffic. */
export const inEditorPreview = () =>
  typeof window !== "undefined" && window.location.search.includes("preview=true");

/**
 * Whether this page view may be counted in the daily `analytics/<date>` doc: the shopper has not declined
 * analytics, it is not the Studio preview, and nobody is signed in as admin in this browser (the owner
 * clicking around their own shop is not traffic). Waits briefly for Firebase Auth to restore a saved
 * session so an admin is not counted just because auth had not finished loading.
 */
export async function trackingAllowed(): Promise<boolean> {
  if (inEditorPreview() || !consentAllows("analytics")) return false;
  try {
    if (typeof (auth as any).authStateReady === "function") {
      await Promise.race([(auth as any).authStateReady(), new Promise(resolve => setTimeout(resolve, 1500))]);
    }
    if (auth.currentUser) return false;
  } catch {
    // Auth unavailable: count the visit rather than lose it.
  }
  return true;
}
