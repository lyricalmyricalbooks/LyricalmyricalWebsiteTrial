import { describe, expect, it } from "vitest";
const { checkoutCarrierRates } = require("./checkoutRates");

describe("checkout Canada Post rates", () => {
  it("excludes other carriers and invalid prices, keeps cheapest duplicate and caps after sorting", () => {
    const rates = [
      { provider: "UPS", amount: "1", servicelevel: { name: "Ground" } },
      ...[100, 20, 9, 5, 12, 7].map((amount, index) => ({ provider: "Canada Post", amount: String(amount), servicelevel: { name: `Service ${index}` } })),
      { provider: "Canada Post", amount: "3", servicelevel: { name: "Service 0" }, estimated_days: 2 },
      { provider: "Canada Post", amount: "bad", servicelevel: { name: "Invalid" } },
      { provider: "Canada Post", amount: "-1", servicelevel: { name: "Negative" } },
    ];
    const result = checkoutCarrierRates(rates);
    expect(result.map(rate => rate.price)).toEqual([3, 5, 7, 9, 12]);
    expect(result[0].deliveryDays).toBe("2");
    expect(result.every(rate => rate.name.startsWith("Canada Post"))).toBe(true);
  });
  it("returns no alternatives when Canada Post is unavailable", () => {
    expect(checkoutCarrierRates([{ provider: "UPS", amount: "5" }])).toEqual([]);
  });
});
