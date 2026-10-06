import { describe, it, expect } from "vitest";
import { buildAdminAlerts, alertSignature } from "./adminAlerts";

const now = Date.parse("2026-10-06T21:00:00Z");
const ago = (min: number) => new Date(now - min * 60000).toISOString();
const ids = (a: any[]) => a.map((x) => x.id);

describe("buildAdminAlerts", () => {
  it("flags an unpaid order with a Stripe payment after 10 minutes", () => {
    const orders = [
      { id: "A", paymentStatus: "unpaid", stripePaymentIntentId: "pi_1", createdAt: ago(30) },
      { id: "B", paymentStatus: "unpaid", stripePaymentIntentId: "pi_2", createdAt: ago(2) },   // too new
      { id: "C", paymentStatus: "unpaid", createdAt: ago(30) },                               // never started paying
      { id: "D", paymentStatus: "unpaid", stripePaymentIntentId: "pi_4", createdAt: ago(30), isTest: true },
    ];
    const a = buildAdminAlerts(orders, null, now);
    expect(ids(a)).toEqual(["unpaid-stripe"]);
    expect(a[0]).toMatchObject({ tone: "danger", orderIds: ["A"], action: "order" });
  });

  it("puts amount mismatches and disputes first and leaves mismatched orders out of 'unpaid'", () => {
    const orders = [
      { id: "M", paymentStatus: "unpaid", stripePaymentIntentId: "pi_1", createdAt: ago(30), paymentMismatch: { ok: false } },
      { id: "X", paymentStatus: "paid", disputeStatus: "needs_response", status: "completed", createdAt: ago(9000) },
    ];
    expect(ids(buildAdminAlerts(orders, null, now))).toEqual(["mismatch", "dispute"]);
  });

  it("warns about late shipping, oversold and old manual payments", () => {
    const orders = [
      { id: "L", paymentStatus: "paid", fulfillmentStatus: "paid", createdAt: ago(5 * 1440) },
      { id: "S", paymentStatus: "paid", fulfillmentStatus: "shipped", createdAt: ago(5 * 1440) },
      { id: "O", paymentStatus: "paid", oversold: true, createdAt: ago(60) },
      { id: "P", paymentStatus: "pending", status: "pending_payment", createdAt: ago(3 * 1440) },
    ];
    const a = buildAdminAlerts(orders, null, now);
    expect(ids(a)).toEqual(["oversold", "ship-late", "manual-pending"]);
    expect(a.find((x) => x.id === "ship-late")!.orderIds).toEqual(["L"]);
  });

  it("alerts when the latest webhook was rejected, not once one succeeds after", () => {
    expect(ids(buildAdminAlerts([], { lastFailureAt: ago(60), lastReceivedAt: ago(120) }, now))).toEqual(["webhook"]);
    expect(buildAdminAlerts([], { lastFailureAt: ago(120), lastReceivedAt: ago(60) }, now)).toEqual([]);
  });

  it("signature changes when a new order joins an alert", () => {
    const one = buildAdminAlerts([{ id: "A", paymentStatus: "unpaid", stripePaymentIntentId: "pi_1", createdAt: ago(30) }], null, now)[0];
    const two = buildAdminAlerts([{ id: "A", paymentStatus: "unpaid", stripePaymentIntentId: "pi_1", createdAt: ago(30) }, { id: "B", paymentStatus: "unpaid", stripePaymentIntentId: "pi_2", createdAt: ago(30) }], null, now)[0];
    expect(alertSignature(one)).not.toBe(alertSignature(two));
    expect(two.action).toBe("orders");
  });

  it("warns about a partial refund on an order not yet shipped", () => {
    const a = buildAdminAlerts([{ id: "R", paymentStatus: "paid", partiallyRefunded: true, createdAt: ago(60) }], null, now);
    expect(ids(a)).toEqual(["partial-refund"]);
  });
});
