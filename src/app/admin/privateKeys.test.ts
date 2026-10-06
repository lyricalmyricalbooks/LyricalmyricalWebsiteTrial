import { describe, it, expect } from "vitest";
import { splitWebsiteSecrets, splitNotificationSecrets } from "./privateKeys";

describe("private keys never reach public settings", () => {
  it("moves Stripe and Resend keys out of settings/website", () => {
    const { publicSettings, secrets } = splitWebsiteSecrets({
      payments: { testMode: true, stripe: { publicKey: "pk_live_x", secretKey: " sk_live_1 ", testSecretKey: "sk_test_2", secretKeyStored: true } },
      communications: { fromName: "Shop", resendApiKey: "re_3" },
    });
    expect(secrets).toEqual({ stripe: { secretKey: "sk_live_1", testSecretKey: "sk_test_2" }, resend: { apiKey: "re_3" } });
    expect(JSON.stringify(publicSettings)).not.toMatch(/sk_|re_3|Stored/);
    expect(publicSettings.payments.stripe.publicKey).toBe("pk_live_x");
  });

  it("blanking without a new key stores nothing new", () => {
    const { secrets, publicSettings } = splitWebsiteSecrets({ payments: { stripe: { secretKey: "" } } });
    expect(secrets).toEqual({});
    expect(publicSettings.payments.stripe.secretKey).toBe("");
  });

  it("moves the Resend key out of settings/notifications", () => {
    const { publicData, secrets } = splitNotificationSecrets({ brand: { logoUrl: "a", resendApiKey: "re_9", resendApiKeyStored: true } });
    expect(secrets).toEqual({ resend: { apiKey: "re_9" } });
    expect(publicData.brand).toEqual({ logoUrl: "a", resendApiKey: "" });
  });
});
