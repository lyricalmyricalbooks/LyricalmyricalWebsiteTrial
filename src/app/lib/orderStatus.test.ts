import { describe, expect, it } from "vitest";
import { FULFILLMENT_FLOW, FULFILLMENT_LABELS, orderApi } from "./commerce";

describe("order fulfillment states", () => {
  it("has a human label for every state, including terminal ones", () => {
    for (const key of Object.keys(FULFILLMENT_LABELS)) expect((FULFILLMENT_LABELS as any)[key]).toBeTruthy();
    expect(Object.keys(FULFILLMENT_LABELS)).toEqual(expect.arrayContaining(["pending_payment", "paid", "shipped", "delivered", "cancelled", "refunded"]));
  });

  it("orders the progress flow from unpaid to delivered", () => {
    expect(FULFILLMENT_FLOW[0]).toBe("pending_payment");
    expect(FULFILLMENT_FLOW.at(-1)).toBe("delivered");
    expect(FULFILLMENT_FLOW.indexOf("paid")).toBeLessThan(FULFILLMENT_FLOW.indexOf("shipped"));
    for (const step of FULFILLMENT_FLOW) expect((FULFILLMENT_LABELS as any)[step]).toBeTruthy();
  });
});

describe("orders CSV export", () => {
  const base = { createdAt: "2026-09-20", customer: { name: 'Ada "The" Lovelace,\nJr', email: "a@x.com" }, status: "open", subtotal: 10, shipping: 5, total: 15, items: [{}, {}] };

  it("never exports marked test orders", () => {
    const csv = orderApi.exportToCsv([{ ...base, orderId: "LM-1" }, { ...base, orderId: "LM-TEST", isTest: true }]);
    expect(csv).toContain("LM-1");
    expect(csv).not.toContain("LM-TEST");
  });

  it("strips characters that would break CSV cells from customer names", () => {
    const csv = orderApi.exportToCsv([{ ...base, orderId: "LM-2" }]);
    const dataRow = csv.split("\n").slice(1).join("\n");
    expect(dataRow).not.toContain('"The"');
    expect(dataRow.split("\n")).toHaveLength(1);
  });
});
