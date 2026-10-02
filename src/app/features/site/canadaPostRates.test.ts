import { describe, expect, it } from "vitest";
import { canadaPostRates } from "./canadaPostRates";

describe("Canada Post checkout choices", () => {
  it("excludes other carriers, invalid prices and duplicate expensive quotes, then caps at five", () => {
    const rates = [
      { name: "UPS Standard", price: 1 },
      { name: "Canada Post Regular Parcel", price: 14.14 },
      { name: "Canada Post Priority", price: 30.07 },
      { name: "Canada Post Regular Parcel", price: 11.74 },
      { name: "Canada Post Xpresspost", price: 12.07 },
      { name: "Canada Post Expedited Parcel", price: 11.74 },
      { name: "Canada Post Priority", price: 17.13 },
      { name: "Canada Post Tracked Packet", price: 15 },
      { name: "Canada Post Small Packet", price: 8 },
      { name: "Canada Post Invalid", price: NaN },
    ];
    expect(canadaPostRates(rates).map(rate => rate.price)).toEqual([8, 11.74, 11.74, 12.07, 15]);
    expect(rates[0].name).toBe("UPS Standard");
  });
});
