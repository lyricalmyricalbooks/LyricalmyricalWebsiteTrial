import { describe, expect, it } from "vitest";
import { addressIssues, addressKey, packingKey, queueOf, dispatchProblem, buildPickList } from "./fulfillment";
const order = () => ({ id: "a", paymentStatus: "paid", status: "open", customer: { address: { street: "1 Main", city: "Toronto", state: "ON", zip: "M6G3H1", country: "Canada" } }, items: [{ id: "book", title: "Book", quantity: 2 }] });
const reviewed = () => { const o: any = order(); o.operations = { addressReviewed: addressKey(o) }; return o; };
const packed = () => { const o = reviewed(); o.operations.packed = packingKey(o); return o; };
describe("publisher fulfillment", () => {
 it("routes unchecked addresses to attention and reviewed orders to packing", () => { expect(queueOf(order())).toBe("Needs attention"); expect(queueOf(reviewed())).toBe("Ready to pack"); expect(queueOf(packed())).toBe("Ready to ship"); });
 it("flags country and province contradictions even if verified", () => { const o = order(); o.customer.address.country = "United States"; expect(addressIssues(o).join(" ")).toContain("country"); });
 it("invalidates review and packing when their source changes", () => { const o = packed(); o.customer.address.zip = "M5V1A1"; expect(queueOf(o)).toBe("Needs attention"); const p = packed(); p.items[0].quantity = 3; expect(queueOf(p)).toBe("Ready to pack"); });
 it("treats address maps with different key order as the same address", () => { const a = order(); const b = order(); b.customer.address = { country: "Canada", zip: "M6G3H1", state: "ON", city: "Toronto", street: "1 Main" }; expect(addressKey(a)).toBe(addressKey(b)); });
 it("never considers unpaid, refunded, held or test orders dispatchable", () => { for (const patch of [{ paymentStatus: "unpaid" }, { paymentStatus: "refund_pending" }, { status: "cancelled" }, { isTest: true }, { operations: { hold: "Contact customer" } }]) expect(dispatchProblem({ ...packed(), ...patch })).toBeTruthy(); });
 it("keeps shipped orders in transit even with legacy completed status", () => { expect(queueOf({ ...packed(), status: "completed", fulfillmentStatus: "shipped" })).toBe("In transit"); expect(queueOf({ ...packed(), fulfillmentStatus: "delivered" })).toBe("Completed"); });
 it("a label does not dispatch a packed order", () => { expect(queueOf({ ...packed(), labelUrl: "https://example.com/label" })).toBe("Ready to ship"); expect(dispatchProblem(packed())).toBe(""); });
 it("aggregates book quantities without conflating editions", () => { expect(buildPickList([order(), { ...order(), items: [{ id: "book", title: "Book", quantity: 1 }, { id: "other", title: "Book", quantity: 1 }] }]).map(i => i.quantity)).toEqual([3, 1]); });
});

it("does not send digital-only orders to a shipping queue", () => { const o = order(); o.items = [{ id: "ebook", title: "Book", quantity: 1, format: "EPUB" } as any]; expect(queueOf(o)).toBe("Completed"); expect(dispatchProblem(o)).toBeTruthy(); });
it("requires actual order items before packing", () => { const o = reviewed(); o.items = []; expect(queueOf(o)).toBe("Needs attention"); });

