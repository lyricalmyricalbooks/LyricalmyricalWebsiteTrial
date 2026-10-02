import { describe, expect, it } from "vitest";
import { checkoutLiveRates } from "./checkoutRates";
import { createRequire } from "node:module";
const { checkoutCarrierRates } = createRequire(import.meta.url)("../../../../functions/checkoutRates.js");

describe("shopper shipping choices", () => {
  it("filters a legacy endpoint response and orders numeric prices before limiting", () => {
    const rates = [
      { name: "UPS Ground", price: 1 },
      ...[20, 9, 5, 12, 7, 3].map((price, i) => ({ name: `Canada Post Service ${i}`, price: String(price) })),
      { name: "Canada Post Service 0", price: 2 },
      { name: "Canada Post Invalid", price: "bad" },
    ];
    expect(checkoutLiveRates(rates).map(rate => rate.price)).toEqual([2, 3, 5, 7, 9]);
  });
  it("preserves the server's service names and prices", () => {
    const rates = checkoutCarrierRates([5, 2, 10].map((amount, i) => ({ provider: "Canada Post", amount, servicelevel: { name: `Service ${i}` } })));
    expect(checkoutLiveRates(rates)).toEqual(rates);
  });
});
