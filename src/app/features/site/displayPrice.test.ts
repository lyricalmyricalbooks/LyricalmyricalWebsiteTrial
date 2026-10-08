import { describe, expect, it } from "vitest";
import { displayPrice, editionPrices, showsSale } from "./displayPrice";

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

describe("books sold in editions", () => {
  it("show the cheapest edition, never the book's own sale price that is never charged", () => {
    const book = { retailPrice: 20, isOnSale: true, salePrice: 15, variants: [{ id: "p", price: 20 }, { id: "h", price: 35 }] };
    expect(displayPrice(book)).toBe(20);
    expect(showsSale(book)).toBe(false);
  });
  it("other books show a sale only when it is below the regular price", () => {
    expect(showsSale({ retailPrice: 20, isOnSale: true, salePrice: 15 })).toBe(true);
    expect(showsSale({ retailPrice: 20, isOnSale: true, salePrice: 25 })).toBe(false);
    expect(showsSale({ retailPrice: 20, isOnSale: false, salePrice: 15 })).toBe(false);
  });
});
