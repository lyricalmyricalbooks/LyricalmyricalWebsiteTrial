import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_ATTEMPT_REUSE_MS, intentIdOf, mayHaveGoneThrough, paymentSettled, reusableCardOrder, type PendingCardOrder } from "./cardAttempt";

const NOW = Date.parse("2026-10-09T12:00:00Z");
const attempt = (ageMs: number): PendingCardOrder => ({ key: "bag", orderId: "ORD1", clientSecret: "pi_1_secret_x", createdAt: NOW - ageMs, amount: 7311, currency: "cad" });

describe("reusableCardOrder (stock holds last 30 minutes)", () => {
  it("reuses a young PaymentIntent for the same bag", () => {
    expect(reusableCardOrder(attempt(60_000), "bag", NOW)).toMatchObject({ orderId: "ORD1", clientSecret: "pi_1_secret_x", amount: 7311 });
  });
  it("keeps the order but drops a PaymentIntent whose holds may have expired", () => {
    const stale = reusableCardOrder(attempt(CARD_ATTEMPT_REUSE_MS), "bag", NOW);
    expect(stale).toMatchObject({ orderId: "ORD1", clientSecret: "" });
    expect(reusableCardOrder(attempt(29 * 60_000), "bag", NOW)?.clientSecret).toBe("");
    // An attempt saved without a time is treated as stale, never reused blindly.
    expect(reusableCardOrder({ ...attempt(0), createdAt: undefined as any }, "bag", NOW)?.clientSecret).toBe("");
    expect(CARD_ATTEMPT_REUSE_MS).toBeLessThan(30 * 60_000);
  });
  it("reuses nothing for a different bag", () => {
    expect(reusableCardOrder(attempt(0), "other", NOW)).toBeNull();
    expect(reusableCardOrder(null, "bag", NOW)).toBeNull();
  });
});

describe("payment recovery helpers", () => {
  it("reads the PaymentIntent id from its client secret", () => {
    expect(intentIdOf("pi_3Abc_secret_xyz")).toBe("pi_3Abc");
    expect(intentIdOf("seti_1_secret_x")).toBe("");
  });
  it("treats only non-card errors as 'may have gone through'", () => {
    expect(mayHaveGoneThrough("card_error")).toBe(false);
    expect(mayHaveGoneThrough("validation_error")).toBe(false);
    expect(mayHaveGoneThrough("invalid_request_error")).toBe(true);
    expect(mayHaveGoneThrough("api_connection_error")).toBe(true);
    expect(mayHaveGoneThrough(undefined)).toBe(false);
  });
  it("counts complete and processing as paid", () => {
    expect(paymentSettled("complete")).toBe(true);
    expect(paymentSettled("processing")).toBe(true);
    expect(paymentSettled("open")).toBe(false);
  });
});

// Checkout.tsx is not rendered in tests (Firebase, Stripe, router); these pin its card path wiring.
describe("Checkout card path", () => {
  const src = readFileSync(join(__dirname, "..", "..", "Checkout.tsx"), "utf8");
  const pay = src.slice(src.indexOf("if (payingByCardForm) {\n        // Lock recovery"));
  it("pins the card form to the server intent amount before every confirm, including a reused one", () => {
    const setAt = pay.indexOf("cardFormRef.current!.setAmount(");
    const confirmAt = pay.indexOf("cardFormRef.current!.confirm(");
    expect(setAt).toBeGreaterThan(-1);
    expect(setAt).toBeLessThan(confirmAt);
    // The reused attempt carries the intent's own amount.
    expect(pay).toMatch(/let intentAmount = reuse\?\.clientSecret \? reuse\.amount/);
  });
  it("re-checks a reused payment with the server before asking for another try", () => {
    expect(pay).toMatch(/mayHaveGoneThrough\(result\.errorType\)[\s\S]*action: "status"[\s\S]*paymentSettled\(/);
  });
  it("uses the age-limited reuse rule", () => {
    expect(src).toContain("reusableCardOrder(pendingCardOrder.current, cardKey)");
  });
  it("sends the shopper to the earlier paid order instead of charging again", () => {
    expect(src).toMatch(/data\?\.code === "previous_attempt_paid"/);
    expect(src).toMatch(/previous_paid=true/);
    expect(src).toMatch(/c\("coPreviousPaid"\)/);
  });
});
