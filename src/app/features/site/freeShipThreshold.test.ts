import { describe, expect, it } from "vitest";
import { bagFreeShipThreshold, shippingFreeThresholds } from "./freeShipThreshold";

describe("bag free-shipping threshold", () => {
  const profiles = [
    { id: "a", freeShippingOver: 120, zones: [{ rates: [{ freeOver: 80 }, { freeOver: 0 }] }] },
    { id: "b", freeThreshold: "150" },
  ];
  it("collects every real free-shipping rule, lowest first", () => {
    expect(shippingFreeThresholds(profiles)).toEqual([80, 120, 150]);
  });
  it("uses the lowest rule for a bag with printed books", () => {
    expect(bagFreeShipThreshold(profiles, true)).toBe(80);
  });
  it("hides the bar when no rule exists, rules are still loading, or the bag is e-books only", () => {
    expect(bagFreeShipThreshold([{ id: "x", zones: [{ rates: [{ price: 10 }] }] }], true)).toBeNull();
    expect(bagFreeShipThreshold(null, true)).toBeNull();
    expect(bagFreeShipThreshold(profiles, false)).toBeNull();
  });
});
