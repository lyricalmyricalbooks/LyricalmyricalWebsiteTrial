import { describe, it, expect } from "vitest";
import { getFilteredItems } from "./selectors";
import type { Book } from "./types";

describe("getFilteredItems", () => {
  const nowISO = "2024-01-01T12:00:00.000Z";

  it("filters by 'published' status", () => {
    const books: Book[] = [
      { id: "1", title: "Book 1", retailPrice: 10, stockLevel: 10, status: "published", categories: ["Fiction"] },
      { id: "2", title: "Book 2", retailPrice: 10, stockLevel: 10, status: "draft", categories: ["Fiction"] },
    ];
    const result = getFilteredItems(books, "Fiction", nowISO);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("includes books with missing scheduleDate if published", () => {
    const books: Book[] = [
      { id: "1", title: "Book 1", retailPrice: 10, stockLevel: 10, status: "published", categories: ["Fiction"] },
    ];
    const result = getFilteredItems(books, "Fiction", nowISO);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters out books with scheduleDate in the future relative to nowISO", () => {
    const books: Book[] = [
      { id: "1", title: "Book 1", retailPrice: 10, stockLevel: 10, status: "published", categories: ["Fiction"], scheduleDate: "2024-01-02T12:00:00.000Z" },
    ];
    const result = getFilteredItems(books, "Fiction", nowISO);
    expect(result).toHaveLength(0);
  });

  it("includes books with scheduleDate in the past relative to nowISO", () => {
    const books: Book[] = [
      { id: "1", title: "Book 1", retailPrice: 10, stockLevel: 10, status: "published", categories: ["Fiction"], scheduleDate: "2023-12-31T12:00:00.000Z" },
    ];
    const result = getFilteredItems(books, "Fiction", nowISO);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("handles activeCategory as an object with a name property", () => {
    const books: Book[] = [
      { id: "1", title: "Book 1", retailPrice: 10, stockLevel: 10, status: "published", categories: ["Science"] },
    ];
    const result = getFilteredItems(books, { name: "Science" }, nowISO);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("includes books that match the categoryName in their categories array", () => {
    const books: Book[] = [
      { id: "1", title: "Book 1", retailPrice: 10, stockLevel: 10, status: "published", categories: ["Math"] },
      { id: "2", title: "Book 2", retailPrice: 10, stockLevel: 10, status: "published", categories: ["Science"] },
    ];
    const result = getFilteredItems(books, "Science", nowISO);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("includes all published and appropriately scheduled books if categoryName is 'PUBLICATIONS'", () => {
    const books: Book[] = [
      { id: "1", title: "Book 1", retailPrice: 10, stockLevel: 10, status: "published", categories: ["Math"] },
      { id: "2", title: "Book 2", retailPrice: 10, stockLevel: 10, status: "published", categories: ["Science"] },
      { id: "3", title: "Book 3", retailPrice: 10, stockLevel: 10, status: "draft", categories: ["History"] },
      { id: "4", title: "Book 4", retailPrice: 10, stockLevel: 10, status: "published", categories: ["Art"], scheduleDate: "2024-01-02T12:00:00.000Z" },
    ];
    const result = getFilteredItems(books, "PUBLICATIONS", nowISO);
    expect(result).toHaveLength(2);
    expect(result.map(b => b.id)).toEqual(["1", "2"]);
  });
});
