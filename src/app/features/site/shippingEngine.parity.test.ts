import { describe, it, expect } from "vitest";
import { quoteShipping, pickQuote, parseWeightGrams } from "./shippingEngine";
// @ts-ignore - CommonJS server module
import * as server from "../../../../functions/shippingEngine.js";
const srv: any = (server as any).default ?? server;

const profiles = [
  { id: "general-profile", handlingFee: 1, zones: [
    { id: "ca", countries: ["CA"], rates: [
      { id: "std", name: "Standard", base: 15, additional: 5, deliveryDays: "3-7" },
      { id: "exp", name: "Express", type: "order", base: 30, handlingFee: 2 },
      { id: "free", name: "Free over 75", type: "free", minPrice: 75 },
      { id: "pick", name: "Pickup", type: "pickup" },
    ] },
    { id: "row", restOfWorld: true, countries: [], rates: [
      { id: "w", name: "Intl", type: "weight", base: 10, perKg: 8, maxWeight: 5000 },
      { id: "p", name: "Pct", type: "percent", base: 3, percent: 10, freeOver: 200 },
      { id: "off", name: "Off", enabled: false, base: 1 },
    ] },
  ] },
  { id: "heavy", zones: [{ id: "all", restOfWorld: true, countries: [], rates: [
    { id: "std2", name: "Standard", base: 25, additional: 8 }, { id: "intl2", name: "Intl", type: "weight", base: 20, perKg: 12 },
  ] }] },
  { id: "legacy", base: 12, additional: 4 },
];
const carts: any[] = [
  [{ price: 20, quantity: 3, shippingProfileId: "general-profile", weightGrams: 300 }],
  [{ price: 40, quantity: 2, shippingProfileId: "general-profile", weightGrams: 500 }, { price: 10, quantity: 1, shippingProfileId: "heavy" }],
  [{ price: 250, quantity: 1, weightGrams: 6000 }],
  [{ price: 30, quantity: 2, shippingProfileId: "legacy" }],
];

describe("shipping engine parity + behaviour", () => {
  for (const country of ["Canada", "France", "United States"]) {
    carts.forEach((cart, i) => it(`client == server: ${country} cart ${i}`, () => {
      expect(quoteShipping(cart, { country }, profiles)).toEqual(srv.quoteShipping(cart, { country }, profiles));
    }));
  }
  it("flat: base + additional per extra item, plus profile handling", () => {
    const q = quoteShipping(carts[0], { country: "Canada" }, profiles);
    expect(pickQuote(q, "Standard")!.price).toBe(15 + 5 * 2 + 1);
  });
  it("offers free rate only above its min order and pickup at 0", () => {
    const small = quoteShipping(carts[0], { country: "Canada" }, profiles).map((x) => x.name);
    expect(small).not.toContain("Free over 75");
    const big = quoteShipping([{ price: 80, quantity: 1, shippingProfileId: "general-profile" }], { country: "Canada" }, profiles);
    expect(pickQuote(big, "Free over 75")!.price).toBe(1); // profile handling still applies
    expect(pickQuote(big, "Pickup")!.price).toBe(0);
  });
  it("weight rate respects maxWeight and disabled rates are hidden", () => {
    const names = quoteShipping(carts[2], { country: "France" }, profiles).map((x) => x.name);
    expect(names).not.toContain("Off");
    expect(names).not.toContain("Intl");
  });
  it("falls back to cheapest when the selected method is unknown", () => {
    const q = quoteShipping(carts[0], { country: "Canada" }, profiles);
    expect(pickQuote(q, "Nonexistent")).toBe(q[0]);
  });
  it("parses weights", () => {
    expect(parseWeightGrams("0.5kg")).toBe(500);
    expect(parseWeightGrams("300 g")).toBe(300);
    expect(Math.round(parseWeightGrams("1lb")!)).toBe(454);
    expect(parseWeightGrams("heavy")).toBeNull();
  });
});
