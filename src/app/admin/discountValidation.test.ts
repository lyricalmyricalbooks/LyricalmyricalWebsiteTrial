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
    expect(validateDiscountDraft({ ...valid, type: "tiered", tiers: [{ minSpend: 20, value: 150, type: "percentage" }] })).toHaveProperty("tiers");
    expect(validateDiscountDraft({ ...valid, type: "tiered", tiers: [{ minSpend: 20, value: 150, type: "fixed" }] })).not.toHaveProperty("tiers");
  });
  it("rejects an end date before the start date", () => expect(validateDiscountDraft({ ...valid, startDate: "2026-12-10", expiryDate: "2026-12-01" }, "2026-09-29")).toMatchObject({ expiryDate: expect.any(String) }));
});

describe("maximum discount cap", () => {
  it("accepts blank or positive caps and rejects zero or negative", () => {
    expect(validateDiscountDraft({ ...valid, maxDiscountAmount: "" }, "2026-01-01").maxDiscountAmount).toBeUndefined();
    expect(validateDiscountDraft({ ...valid, maxDiscountAmount: "15" }, "2026-01-01").maxDiscountAmount).toBeUndefined();
    expect(validateDiscountDraft({ ...valid, maxDiscountAmount: "0" }, "2026-01-01").maxDiscountAmount).toBeTruthy();
    expect(validateDiscountDraft({ ...valid, maxDiscountAmount: "-3" }, "2026-01-01").maxDiscountAmount).toBeTruthy();
  });
});
