import { describe, expect, it } from "vitest";
import { emailLogBadge, emailLogDetail } from "./emailLogDisplay";

describe("Recent deliveries rows", () => {
  it("shows a Gmail→backup switch as a warning, not a failure or a plain success", () => {
    expect(emailLogBadge({ status: "fallback" })).toEqual({ tone: "warning", label: "Gmail missed · used backup" });
    expect(emailLogBadge({ status: "failed" }).tone).toBe("danger");
    expect(emailLogBadge({ status: "sent" })).toEqual({ tone: "success", label: "Sent" });
    expect(emailLogBadge({ status: "sent", note: "sandbox" }).label).toBe("Sent (sandbox)");
  });
  it("names the provider that accepted the email", () => {
    expect(emailLogDetail({ keySource: "gmail" })).toBe("Accepted by Gmail");
    expect(emailLogDetail({ keySource: "settings" })).toBe("Accepted by Resend");
    expect(emailLogDetail({ error: "Gmail SMTP rejected" })).toBe("Gmail SMTP rejected");
  });
});
