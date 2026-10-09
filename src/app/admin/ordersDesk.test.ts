import { describe, it, expect } from "vitest";
import { deskOrders, deskCounts, nextToOpen, rowStatus } from "./ordersDesk";

const reviewed = (o: any) => ({ ...o, customer: { name: "Reader", email: "r@x.com", address: { street: "1 Main", city: "Toronto", state: "ON", zip: "M1M1M1", country: "Canada" } } });
const paid = (id: string, paidAt: string, extra: any = {}) => {
  const o: any = reviewed({ id, orderId: id, paymentStatus: "paid", paidAt, items: [{ id: "b", title: "Book", quantity: 1 }], ...extra });
  o.operations = { addressReviewed: JSON.stringify(["1 Main", "Toronto", "ON", "M1M1M1", "Canada"]), ...(extra.operations || {}) };
  return o;
};

describe("orders desk", () => {
  const orders = [
    paid("NEW", "2026-10-06T10:00:00Z"),
    paid("OLD", "2026-10-04T10:00:00Z"),
    paid("SHIPPED", "2026-10-03T10:00:00Z", { fulfillmentStatus: "shipped" }),
    { id: "UNPAID", paymentStatus: "pending", createdAt: "2026-10-05T00:00:00Z", items: [{ id: "b", quantity: 1 }] },
    paid("TEST", "2026-10-01T10:00:00Z", { isTest: true }),
  ];

  it("Needs me: work to do, oldest first; test orders hidden unless asked", () => {
    expect(deskOrders(orders, "needs").map((o) => o.id)).toEqual(["OLD", "NEW"]);
    expect(deskOrders(orders, "needs", "", true).map((o) => o.id)).toContain("TEST");
  });

  it("Shipped and All, newest first; search matches name, email, order and book", () => {
    expect(deskOrders(orders, "shipped").map((o) => o.id)).toEqual(["SHIPPED"]);
    expect(deskOrders(orders, "all").map((o) => o.id)[0]).toBe("NEW");
    expect(deskOrders(orders, "all", "old").map((o) => o.id)).toEqual(["OLD"]);
    expect(deskOrders(orders, "needs", "book").length).toBe(2);
  });

  it("counts, including manual payments still to arrive", () => {
    expect(deskCounts(orders)).toMatchObject({ needs: 2, shipped: 1, waitingPayment: 1 });
  });

  it("opens the current order while it is listed, else the first", () => {
    const list = deskOrders(orders, "needs");
    expect(nextToOpen(list, "NEW")).toBe("NEW");
    expect(nextToOpen(list, "SHIPPED")).toBe("OLD");
    expect(nextToOpen([], null)).toBeNull();
  });

  it("row status names the next job and puts payment problems first", () => {
    expect(rowStatus(paid("X", "2026-10-06T00:00:00Z")).text).toMatch(/Pack/);
    expect(rowStatus({ ...paid("X", "2026-10-06T00:00:00Z"), disputeStatus: "needs_response" }).tone).toBe("danger");
    expect(rowStatus({ paymentStatus: "unpaid", paymentMismatch: { ok: false } }).text).toMatch(/doesn't match/);
    expect(rowStatus(orders[3]).text).toMatch(/Waiting on payment/);
    const conflict = { id: "GC", paymentStatus: "unpaid", giftCardConflict: { reason: "balance" }, items: [{ id: "b", quantity: 1 }] };
    expect(rowStatus(conflict)).toMatchObject({ tone: "danger", text: expect.stringMatching(/Gift card/) });
    expect(deskOrders([conflict], "needs").map((o) => o.id)).toEqual(["GC"]);
  });
});
