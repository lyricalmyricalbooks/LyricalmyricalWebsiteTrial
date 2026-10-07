import { orderAccessHeaders } from "./orderAccessClient";
import { getToken } from "firebase/app-check";
import { appCheck } from "../../lib/firebase";
import { AppVerificationError } from "../../lib/appVerification";

// Central resolver for Cloud Function endpoints so the project/region is
// defined in exactly one place. Override with VITE_FUNCTIONS_BASE when the
// backend moves (e.g. a different project or a proxy domain).
const PROJECT_ID = "lyricalmyrical-web-v2";
const REGION = "us-central1";

export function functionUrl(name: string): string {
  const override = import.meta.env.VITE_FUNCTIONS_BASE as string | undefined;
  if (override) return `${override.replace(/\/$/, "")}/${name}`;
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/${name}`;
  }
  return `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${name}`;
}

/** Only the named shop Function receives the attestation token; external fetches stay separate. */
export async function functionFetch(name: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.delete("X-Firebase-AppCheck");
  if (["createStripeCheckoutSession", "createPayPalOrder", "capturePayPalOrder"].includes(name) && typeof init.body === "string") {
    let body: any = null;
    try { body = JSON.parse(init.body); } catch { /* The endpoint validates malformed requests. */ }
    if (typeof body?.orderId === "string") {
      const access = await orderAccessHeaders(body.orderId, body.key);
      for (const [key, value] of Object.entries(access)) if (!headers.has(key)) headers.set(key, value);
    }
  }
  const enforced = import.meta.env.VITE_APP_CHECK_MODE === "enforce";
  if (appCheck && import.meta.env.VITE_APP_CHECK_MODE !== "off") {
    try {
      const result = await getToken(appCheck, false);
      if (!result.token) throw new AppVerificationError();
      headers.set("X-Firebase-AppCheck", result.token);
    } catch {
      if (enforced) throw new AppVerificationError();
      // Monitoring/rollback must not strand shoppers when the provider is unavailable.
    }
  } else if (enforced) {
    throw new AppVerificationError();
  }
  const response = await fetch(functionUrl(name), { ...init, headers });
  if (response.status === 401 || response.status === 503) {
    const data = await response.clone().json().catch(() => null);
    if (data?.code === "APP_CHECK_REQUIRED" || data?.code === "APP_CHECK_CONFIG_ERROR") throw new AppVerificationError();
  }
  return response;
}
