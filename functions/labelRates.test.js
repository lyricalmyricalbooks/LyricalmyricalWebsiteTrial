import { describe, expect, it } from "vitest";
const { canadaPostLabelRates, isCanadaPostRate } = require("./labelRates");

describe("Canada Post label rates", () => {
  it("recognizes Canada Post without matching other carriers", () => {
    expect(isCanadaPostRate({ provider: "Canada Post" })).toBe(true);
    expect(isCanadaPostRate({ carrier: "CANADA_POST" })).toBe(true);
    expect(isCanadaPostRate({ provider: "UPS" })).toBe(false);
  });

  it("returns only the five cheapest Canada Post rates", () => {
    const rates = [{ object_id: "ups", provider: "UPS", amount: "1.00" }, ...[9, 2, 7, 3, 5, 4].map(amount => ({ object_id: String(amount), provider: "Canada Post", amount: String(amount) }))];
    expect(canadaPostLabelRates(rates).map(rate => rate.object_id)).toEqual(["2", "3", "4", "5", "7"]);
  });

  it("does not offer malformed rates that cannot be purchased", () => {
    const rates = [
      { object_id: "valid", provider: "Canada Post", amount: "12.50" },
      { provider: "Canada Post", amount: "4.00" },
      { object_id: "invalid-price", provider: "Canada Post", amount: "unknown" },
      { object_id: "negative", provider: "Canada Post", amount: "-1" },
    ];

    expect(canadaPostLabelRates(rates).map(rate => rate.object_id)).toEqual(["valid"]);
  });
});
