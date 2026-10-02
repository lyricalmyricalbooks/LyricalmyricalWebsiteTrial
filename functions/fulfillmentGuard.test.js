import { describe, expect, it } from "vitest";
const { labelProblem } = require("./fulfillmentGuard");
const o = { paymentStatus: "paid", status: "open", customer: { address: { street: "A" } }, items: [{ id: "b", quantity: 1 }] };
const operations = { addressReviewed: JSON.stringify(o.customer.address), packed: JSON.stringify([["b", "", 1]]) };
describe("label purchase guard", () => {
 it("requires active paid orders and completed preparation", () => { expect(labelProblem(o, operations)).toBe(""); expect(labelProblem({ ...o, paymentStatus: "unpaid" }, operations)).toBeTruthy(); expect(labelProblem(o, {})).toBeTruthy(); expect(labelProblem(o, { ...operations, hold: "Stock issue" })).toBeTruthy(); });
 it("rejects duplicate labels and dispatched orders", () => { expect(labelProblem({ ...o, labelUrl: "existing" }, operations)).toBeTruthy(); expect(labelProblem({ ...o, fulfillmentStatus: "shipped" }, operations)).toBeTruthy(); expect(labelProblem(o, { ...operations, labelPurchasePending: true })).toBeTruthy(); });
 it("invalidates preparation after order changes", () => { expect(labelProblem({ ...o, items: [{ id: "b", quantity: 2 }] }, operations)).toBeTruthy(); });
});
