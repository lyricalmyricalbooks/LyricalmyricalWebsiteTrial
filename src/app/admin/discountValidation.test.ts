import { describe, expect, it } from "vitest";
import { validateDiscountDraft } from "./discountValidation";

const valid = { code: "SAVE10", type: "percentage", value: 10, appliesTo: "all", expiryDate: "", usageLimit: "", minOrderAmount: "", minQuantity: "" };

describe("validateDiscountDraft", () => {
  it("accepts a safe basic promotion", () => expect(validateDiscountDraft(valid, "2026-09-29")).toEqual({}));
  it("rejects malformed codes and expired dates", () => expect(validateDiscountDraft({ ...valid, code: "x!", expiryDate: "2026-09-28" }, "2026-09-29")).toMatchObject({ code: expect.any(String), expiryDate: expect.any(String) }));
  it("requires integer limits and non-negative thresholds", () => expect(validateDiscountDraft({ ...valid, usageLimit: "1.5", minQuantity: "2.2", minOrderAmount: -1 })).toMatchObject({ usageLimit: expect.any(String), minQuantity: expect.any(String), minOrderAmount: expect.any(String) }));
  it("validates BOGO and ordered tier structures", () => {
    expect(validateDiscountDraft({ ...valid, type: "bogo", buyQuantity: 0, getQuantity: 1, getDiscountValue: 101 })).toHaveProperty("bogo");
    expect(validateDiscountDraft({ ...valid, type: "tiered", tiers: [{ minSpend: 50, value: 10 }, { minSpend: 20, value: 5 }] })).toHaveProperty("tiers");
  });
});
