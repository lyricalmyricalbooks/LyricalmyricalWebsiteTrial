import { describe, expect, it } from "vitest";
const { canadaPostLabelRates, isCanadaPostRate } = require("./labelRates");

describe("Canada Post label rates", () => {
  it("recognizes Canada Post without matching other carriers", () => {
    expect(isCanadaPostRate({ provider: "Canada Post" })).toBe(true);
    expect(isCanadaPostRate({ carrier: "CANADA_POST" })).toBe(true);
    expect(isCanadaPostRate({ provider: "UPS" })).toBe(false);
  });

  it("returns only the five cheapest Canada Post rates", () => {
    const rates = [{ object_id: "ups", provider: "UPS", amount: "1.00" }, ...[9, 2, 7, 3, 5, 4].map(amount => ({ object_id: String(amount), provider: "Canada Post", servicelevel: { token: `service-${amount}` }, amount: String(amount) }))];
    expect(canadaPostLabelRates(rates).map(rate => rate.object_id)).toEqual(["2", "3", "4", "5", "7"]);
  });

  it("keeps only the cheapest quote when Shippo repeats a service", () => {
    const rates = [
      { object_id: "high", provider: "Canada Post", servicelevel: { token: "xpresspost" }, amount: "14.55" },
      { object_id: "low", provider: "Canada Post", servicelevel: { token: "xpresspost" }, amount: "12.07" },
    ];
    expect(canadaPostLabelRates(rates).map(rate => rate.object_id)).toEqual(["low"]);
  });
});
