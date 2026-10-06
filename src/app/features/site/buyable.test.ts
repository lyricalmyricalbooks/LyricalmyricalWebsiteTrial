import { describe, expect, it } from "vitest";
import { quickAddChoice } from "./buyable";

describe("quickAddChoice", () => {
  it("picks the first edition with stock", () => {
    const book = { variants: [{ id: "a", stock: 0 }, { id: "b", stockLevel: 3 }] };
    expect(quickAddChoice(book)).toEqual({ variant: book.variants[1], inStock: true });
  });
  it("reports a book whose editions are all sold out as out of stock", () => {
    expect(quickAddChoice({ stockLevel: 5, variants: [{ id: "a", stock: 0 }] }).inStock).toBe(false);
  });
  it("uses the book's own stock when it has no editions", () => {
    expect(quickAddChoice({ stockLevel: 0 }).inStock).toBe(false);
    expect(quickAddChoice({})).toEqual({ inStock: true });
  });
});
