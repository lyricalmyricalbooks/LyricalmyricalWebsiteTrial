import { describe, expect, it } from "vitest";
import { cartRecommendations } from "./cartRecommendations";

const book = (id: string, extra: any = {}) =>
  ({ id, title: id, retailPrice: 10, stockLevel: 5, status: "published", ...extra }) as any;

describe("cartRecommendations", () => {
  it("skips cart items, drafts, sold-out books and books with variants", () => {
    const books = [
      book("a"),
      book("draft", { status: "draft" }),
      book("gone", { stockLevel: 0 }),
      book("multi", { variants: [{ id: "v" }] }),
      book("ok"),
    ];
    expect(cartRecommendations(books, [{ id: "a" }], 5).map((b) => b.id)).toEqual(["ok"]);
  });

  it("ranks same author, then same category, then featured", () => {
    const books = [
      book("cart", { authorId: "x", categories: ["poetry"] }),
      book("plain"),
      book("featured", { isFeatured: true }),
      book("cat", { categories: ["poetry"] }),
      book("author", { authorId: "x" }),
    ];
    expect(cartRecommendations(books, [{ id: "cart" }], 4).map((b) => b.id)).toEqual(["author", "cat", "featured", "plain"]);
  });

  it("honours the count and returns nothing for 0", () => {
    const books = [book("a"), book("b"), book("c")];
    expect(cartRecommendations(books, [], 2)).toHaveLength(2);
    expect(cartRecommendations(books, [], 0)).toEqual([]);
    expect(cartRecommendations(undefined, [], 3)).toEqual([]);
  });
});
