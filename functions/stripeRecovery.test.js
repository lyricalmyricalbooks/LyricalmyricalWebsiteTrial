import { describe, it, expect } from "vitest";
import { REQUIRED_WEBHOOK_EVENTS, modesToTry, intentAsSession, paidIntentOrderId, webhookEndpointReport, signingSecrets } from "./stripeRecovery.js";

const URL = "https://us-central1-lyricalmyrical-web-v2.cloudfunctions.net/stripeWebhook";

describe("modesToTry", () => {
  it("asks the account the order was created in first, then the other", () => {
    expect(modesToTry({ stripeMode: "test" }, false)).toEqual(["test", "live"]);
    expect(modesToTry({ stripeMode: "live" }, true)).toEqual(["live", "test"]);
  });
  it("falls back to the shop's mode for older orders without stripeMode", () => {
    expect(modesToTry({}, true)).toEqual(["test", "live"]);
    expect(modesToTry({}, false)).toEqual(["live", "test"]);
  });
});

describe("paidIntentOrderId", () => {
  const ev = (metadata, type = "payment_intent.succeeded") => ({ type, data: { object: { id: "pi_1", metadata } } });
  it("accepts a succeeded intent for an order from either checkout path", () => {
    expect(paidIntentOrderId(ev({ order_id: "ABC", checkout: "payment_element" }))).toBe("ABC");
    expect(paidIntentOrderId(ev({ order_id: "ABC" }))).toBe("ABC");
  });
  it("ignores other events, intents without an order, and path-like ids", () => {
    expect(paidIntentOrderId(ev({ order_id: "ABC" }, "payment_intent.created"))).toBeNull();
    expect(paidIntentOrderId(ev({}))).toBeNull();
    expect(paidIntentOrderId(ev({ order_id: "a/b" }))).toBeNull();
  });
});

describe("intentAsSession", () => {
  it("uses the amount actually received", () => {
    const s = intentAsSession({ id: "pi_1", metadata: { order_id: "X" }, livemode: false, amount: 1520, amount_received: 1520, currency: "cad" });
    expect(s).toMatchObject({ client_reference_id: "X", payment_intent: "pi_1", payment_status: "paid", amount_total: 1520, currency: "cad" });
  });
});

describe("webhookEndpointReport", () => {
  it("reports a missing endpoint", () => {
    expect(webhookEndpointReport([], URL)).toMatchObject({ found: false, missingEvents: REQUIRED_WEBHOOK_EVENTS });
  });
  it("finds events the endpoint does not send (the 'paid in Stripe, unpaid in shop' cause)", () => {
    const r = webhookEndpointReport([{ id: "we_1", url: URL, status: "enabled", enabled_events: ["checkout.session.completed"] }], URL);
    expect(r.found).toBe(true);
    expect(r.missingEvents).toContain("payment_intent.succeeded");
  });
  it("treats '*' as every event and notices a disabled endpoint", () => {
    const r = webhookEndpointReport([{ id: "we_1", url: URL + "/", status: "disabled", enabled_events: ["*"] }], URL);
    expect(r).toMatchObject({ missingEvents: [], enabled: false, wrongUrl: false });
  });
});

describe("signingSecrets", () => {
  it("keeps only distinct whsec_ values", () => {
    expect(signingSecrets("whsec_a", "", undefined, "whsec_a", "sk_x", " whsec_b ")).toEqual(["whsec_a", "whsec_b"]);
  });
});
