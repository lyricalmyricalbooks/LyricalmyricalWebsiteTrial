import { describe, expect, it } from "vitest";
import { paymentHealth } from "./paymentHealth";

describe("paymentHealth", () => {
  it("reports the launch blockers and operational warnings", () => {
    expect(paymentHealth({}).map(i => i.id)).toContain("no-gateway");
    const ids = paymentHealth({ testMode: true, stripe: { connected: true, secretKey: "redacted" }, manualMethods: [{ id: "wire", name: "Wire", enabled: true }] }).map(i => i.id);
    expect(ids).toEqual(expect.arrayContaining(["test-mode", "stripe-publishable", "client-secret", "manual:wire"]));
  });
  it("accepts a configured live provider", () => expect(paymentHealth({ stripe: { connected: true, publicKey: "pk_live_example" } })).toEqual([]));
});
