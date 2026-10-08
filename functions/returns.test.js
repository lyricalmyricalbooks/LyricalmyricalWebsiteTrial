import { expect, test } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { returnTransition, publicReturn, returnRestockItems } = require("./returns");
const order = { customerRequest: { type: "return", status: "open" }, paymentStatus: "paid", items: [{ id: "a", quantity: 2, format: "Paperback" }, { id: "b", variantId: "ed", quantity: 1, format: "Paperback" }, { id: "pdf", quantity: 1, isDigital: true }] };
const advance = (current, state, input = {}) => returnTransition(order, current, state, input, "now", "admin");
test("requires approval instructions and sequential receipt/inspection", () => { expect(() => advance(null, "received")).toThrow("out of order"); expect(() => advance(null, "approved")).toThrow("instructions"); const approved = advance(null, "approved", { instructions: "Send to confirmed address" }); expect(advance(approved, "approved")).toBe(approved); const received = advance(approved, "received"); expect(() => advance(received, "inspected", { inspection: [{ index: 0, quantity: 1, condition: "resellable" }] })).toThrow(); });
test("selective restock includes resellable physical copies only", () => { const received = advance(advance(null, "approved", { instructions: "Return" }), "received"); const inspected = advance(received, "inspected", { inspection: [{ index: 0, quantity: 2, condition: "resellable" }, { index: 1, quantity: 1, condition: "damaged" }] }); expect(returnRestockItems({ ...order, returnProgress: { state: "inspected" } }, inspected)).toEqual([{ id: "a", variantId: null, quantity: 2 }]); expect(publicReturn(inspected)).not.toHaveProperty("inspection"); expect(publicReturn(inspected)).not.toHaveProperty("actor"); });
test("no restock before inspection or for an unapproved return request", () => { expect(returnRestockItems(order, null)).toEqual([]); expect(returnRestockItems({ ...order, returnProgress: { state: "received" } }, { state: "received" })).toEqual([]); });
test("payment and refund claims prevent return changes", () => { expect(() => returnTransition({ ...order, paymentStatus: "unpaid" }, null, "approved", {}, "now", "admin")).toThrow("paid"); expect(() => returnTransition({ ...order, refundRequest: {} }, null, "approved", {}, "now", "admin")).toThrow("refund"); });

test("mixed-condition lines restock only the confirmed resellable count", () => {
  const received = advance(advance(null, "approved", { instructions: "Return" }), "received");
  const inspection = [{ index: 0, quantity: 2, condition: "mixed", restockQuantity: 1 }, { index: 1, quantity: 1, condition: "damaged" }];
  const next = advance(received, "inspected", { inspection });
  expect(returnRestockItems({ ...order, returnProgress: { state: "inspected" } }, next)).toEqual([{ id: "a", variantId: null, quantity: 1 }]);
  for (const count of [-1, 3, 0.5, null]) expect(() => advance(received, "inspected", { inspection: [{ ...inspection[0], restockQuantity: count }, inspection[1]] })).toThrow("resold");
});
