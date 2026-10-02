import { describe, expect, it } from "vitest";
import { normalizeCheckoutRates as clientRates } from "./checkoutCarrierRates";
// @ts-ignore CommonJS module shared with Firebase Functions
import * as server from "../../../../functions/checkoutCarrierRates.js";
const { checkoutCarrierRates, normalizeCheckoutRates } = (server as any).default ?? server;

describe("checkout carrier choices", () => {
  const rate = (provider: string, name: string, amount: string) => ({ provider, servicelevel: { name }, amount, estimated_days: 2 });
  it("excludes other carriers, deduplicates services and returns the five cheapest numeric prices", () => {
    const rates = [rate("UPS", "Ground", "1"), ...[30, 9, 20, 12, 40, 15].map((price, i) => rate("Canada Post", `Service ${i}`, String(price))), rate("Canada Post", "Service 0", "10")];
    const quotes = checkoutCarrierRates(rates);
    expect(quotes.map((q: any) => q.price)).toEqual([9, 10, 12, 15, 20]);
    expect(quotes.every((q: any) => q.name.startsWith("Canada Post "))).toBe(true);
    expect(quotes[0].deliveryDays).toBe("2");
  });
  it("rejects invalid amounts and recognizes CanadaPost spelling", () => {
    expect(checkoutCarrierRates([rate("CanadaPost", "Express", "7"), rate("Canada Post", "Bad", "NaN"), rate("Canada Post", "Bad", "-2"), rate("Canada Post", "Bad", "")]).map((q: any) => q.price)).toEqual([7]);
  });
  it("defensively normalizes old endpoint responses and sorts the displayed choices", () => {
    const rates = [{ name: "UPS Ground", price: 1 }, { name: "Canada Post Express", base: "20" }, { name: "Canada Post Regular", price: "9" }];
    expect(clientRates(rates).map((q: any) => q.price)).toEqual([9, 20]);
    expect(clientRates(rates)).toEqual(normalizeCheckoutRates(rates));
  });
});
