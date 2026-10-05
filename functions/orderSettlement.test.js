import { describe, it, expect } from "vitest";
const { settlementWrites } = require("./orderSettlement");

const now = "2026-10-05T19:00:00.000Z";
const order = (over = {}) => ({
  paymentStatus: "unpaid",
  total: 42,
  items: [{ id: "b1", quantity: 2 }, { id: "b2", variantId: "hc", quantity: 1 }],
  activity: [{ type: "event", message: "Order created", createdAt: "x" }],
  ...over,
});
const books = [
  { trackInventory: true, stockLevel: 10 },
  { trackInventory: true, stockLevel: 5, variants: [{ id: "hc", stock: 3 }] },
];
const settle = (o, opts = {}) => settlementWrites(o, books, { usageCount: 4 }, { message: "Paid", now, downloadToken: "tok", ...opts });

describe("settling an order", () => {
  it("writes the same paid fields, stock and discount for a Stripe payment as for a manual one", () => {
    const manual = settle(order(), { message: "Payment confirmed manually by admin." });
    const stripe = settle(order(), { message: "Payment completed (Stripe Webhook)", fields: { stripePaymentIntentId: "pi_1" } });

    const strip = ({ activity, stripePaymentIntentId, ...rest }) => rest;
    expect(strip(stripe.orderPatch)).toEqual(strip(manual.orderPatch));
    expect(stripe.bookPatches).toEqual(manual.bookPatches);
    expect(stripe.discountPatch).toEqual(manual.discountPatch);
    expect(stripe.paidTotal).toBe(manual.paidTotal);
    expect(stripe.orderPatch.stripePaymentIntentId).toBe("pi_1");
  });

  it("marks the order paid, open and ready to fulfil", () => {
    const { orderPatch, paidTotal } = settle(order());
    expect(orderPatch).toMatchObject({
      paymentStatus: "paid", fulfillmentStatus: "paid", status: "open",
      paidAt: now, downloadToken: "tok",
    });
    expect(orderPatch.activity.at(-1)).toEqual({ type: "event", message: "Paid", createdAt: now });
    expect(paidTotal).toBe(42);
  });

  it("stamps the stock as taken so the order trigger does not take it again", () => {
    expect(settle(order()).orderPatch.inventoryDecrementedAt).toBe(now);
  });

  it("takes each item off its book, variants included", () => {
    const { bookPatches } = settle(order());
    expect(bookPatches[0]).toMatchObject({ stockLevel: 8 });
    expect(bookPatches[1].variants[0]).toMatchObject({ stock: 2, stockLevel: 2 });
  });

  it("counts the discount code once", () => {
    expect(settle(order()).discountPatch).toMatchObject({ usageCount: 5 });
    expect(settlementWrites(order(), books, null, { message: "Paid", now }).discountPatch).toBeNull();
  });

  it("skips a book that no longer exists", () => {
    expect(settlementWrites(order(), [null, books[1]], null, { message: "Paid", now }).bookPatches[0]).toBeNull();
  });

  it("never settles an already-paid order twice", () => {
    const again = settle(order({ paymentStatus: "paid" }), { fields: { stripePaymentIntentId: "pi_1" } });
    expect(again).toMatchObject({ alreadyPaid: true, orderPatch: null, bookPatches: [], discountPatch: null, paidTotal: null });
  });

  it("still notes a late Stripe reference on an already-paid order when asked", () => {
    const again = settle(order({ paymentStatus: "paid" }), { fields: { stripePaymentIntentId: "pi_1" }, refreshWhenPaid: true });
    expect(again.orderPatch).toEqual({ stripePaymentIntentId: "pi_1", updatedAt: now });
    expect(again.paidTotal).toBeNull();
  });
});
