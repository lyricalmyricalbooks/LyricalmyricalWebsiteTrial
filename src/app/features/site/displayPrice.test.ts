import { describe, expect, it } from "vitest";
import { displayPrice, editionPrices } from "./displayPrice";

describe("displayPrice", () => {
  it("uses the book's own (sale) price when it has one", () => {
    expect(displayPrice({ retailPrice: 20 })).toBe(20);
    expect(displayPrice({ retailPrice: 20, isOnSale: true, salePrice: 15 })).toBe(15);
    expect(displayPrice({ retailPrice: 20, isOnSale: true, salePrice: 15 }, true)).toBe(20);
    expect(displayPrice({ retailPrice: 20, isOnSale: true, salePrice: "0" })).toBe(20);
  });
  it("shows the cheapest edition for a book sold only in editions instead of 0.00", () => {
    const book = { retailPrice: 0, variants: [{ id: "h", price: 35 }, { id: "p", price: "18" }, { id: "x", price: "" }] };
    expect(editionPrices(book)).toEqual([35, 18]);
    expect(displayPrice(book)).toBe(18);
    expect(displayPrice({ variants: [{ price: null }] })).toBe(0);
    expect(displayPrice(null)).toBe(0);
  });
});
