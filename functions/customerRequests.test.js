import { test, expect } from "vitest";
import { createRequire } from "node:module";
const { orderRequestProblem, orderRequestRecord, privacyRequestRecord } = createRequire(import.meta.url)("./customerRequests");

test("cancel is allowed only before the order ships", () => {
  expect(orderRequestProblem({ paymentStatus: "paid", fulfillmentStatus: "paid" }, "cancel")).toBeNull();
  expect(orderRequestProblem({ paymentStatus: "paid", fulfillmentStatus: "shipped" }, "cancel")).toBe("already_shipped");
  expect(orderRequestProblem({ paymentStatus: "paid", trackingNumber: "1Z" }, "cancel")).toBe("already_shipped");
});

test("returns need a paid order; closed orders and open requests are refused", () => {
  expect(orderRequestProblem({ paymentStatus: "unpaid" }, "return")).toBe("not_paid");
  expect(orderRequestProblem({ paymentStatus: "paid", fulfillmentStatus: "delivered" }, "return")).toBeNull();
  expect(orderRequestProblem({ status: "cancelled" }, "return")).toBe("closed");
  expect(orderRequestProblem({ paymentStatus: "paid", customerRequest: { status: "open" } }, "cancel")).toBe("already_open");
  expect(orderRequestProblem({ paymentStatus: "paid" }, "bogus")).toBe("invalid");
});

test("records trim and cap what the shopper typed", () => {
  expect(orderRequestRecord("cancel", " x".repeat(800), "t").message.length).toBe(1000);
  expect(privacyRequestRecord("A@B.CO", "delete", "", "t")).toEqual({ email: "a@b.co", type: "delete", message: "", status: "open", createdAt: "t" });
  expect(privacyRequestRecord("nope", "delete")).toBeNull();
  expect(privacyRequestRecord("a@b.co", "wipe")).toBeNull();
});
