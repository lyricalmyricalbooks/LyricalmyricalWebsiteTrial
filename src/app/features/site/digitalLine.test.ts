import { describe, expect, it } from "vitest";
import { lineIsDigital } from "./digitalLine";

describe("lineIsDigital", () => {
  const book = { digitalFileName: "book.epub", variants: [{ id: "pb", name: "Paperback" }, { id: "eb", name: "E-book", digital: true }] };
  it("never offers a download for a book without a file", () => {
    expect(lineIsDigital({ format: "E-book" }, { variants: [] })).toBe(false);
    expect(lineIsDigital({ format: "E-book" }, undefined)).toBe(false);
  });
  it("trusts what the order line recorded", () => {
    expect(lineIsDigital({ format: "Paperback" }, book)).toBe(false);
    expect(lineIsDigital({ format: "EPUB" }, book)).toBe(true);
    expect(lineIsDigital({ digital: true }, book)).toBe(true);
  });
  it("falls back to the catalog edition for older lines", () => {
    expect(lineIsDigital({ variantId: "pb" }, book)).toBe(false);
    expect(lineIsDigital({ variantId: "eb" }, book)).toBe(true);
    expect(lineIsDigital({}, book)).toBe(false);
    expect(lineIsDigital({}, { ...book, digital: true })).toBe(true);
  });
});
