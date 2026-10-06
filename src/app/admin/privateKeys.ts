// Secret API keys must never live in the public-readable `settings/*` docs.
// They are written to the admin-only `adminSecrets/*` docs instead (see firestore.rules),
// and the public copy is blanked on every save so older leaked values are removed.

export type SecretPatch = {
  stripe?: { secretKey?: string; testSecretKey?: string };
  resend?: { apiKey?: string };
};

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Split a `settings/website` write into a public payload with no secrets and the secrets to store privately. */
export function splitWebsiteSecrets(settings: Record<string, any>): { publicSettings: Record<string, any>; secrets: SecretPatch } {
  const publicSettings = JSON.parse(JSON.stringify(settings));
  const secrets: SecretPatch = {};
  const stripe = publicSettings.payments?.stripe;
  if (stripe) {
    const secretKey = clean(stripe.secretKey);
    const testSecretKey = clean(stripe.testSecretKey);
    if (secretKey || testSecretKey) {
      secrets.stripe = {};
      if (secretKey) secrets.stripe.secretKey = secretKey;
      if (testSecretKey) secrets.stripe.testSecretKey = testSecretKey;
    }
    stripe.secretKey = "";
    stripe.testSecretKey = "";
    delete stripe.secretKeyStored;
    delete stripe.testSecretKeyStored;
  }
  const comms = publicSettings.communications;
  if (comms) {
    const apiKey = clean(comms.resendApiKey);
    if (apiKey) secrets.resend = { apiKey };
    comms.resendApiKey = "";
    delete comms.resendApiKeyStored;
  }
  return { publicSettings, secrets };
}

/** Same for `settings/notifications` (Resend key under `brand`). */
export function splitNotificationSecrets(data: Record<string, any>): { publicData: Record<string, any>; secrets: SecretPatch } {
  const publicData = JSON.parse(JSON.stringify(data));
  const secrets: SecretPatch = {};
  const apiKey = clean(publicData.brand?.resendApiKey) || clean(publicData.resendApiKey);
  if (apiKey) secrets.resend = { apiKey };
  if (publicData.brand) { publicData.brand.resendApiKey = ""; delete publicData.brand.resendApiKeyStored; }
  if ("resendApiKey" in publicData) publicData.resendApiKey = "";
  return { publicData, secrets };
}
