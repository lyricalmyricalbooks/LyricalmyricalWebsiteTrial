import { describe, expect, it } from "vitest";
import { resolveProductRoutes, findProduct } from "./productRoutes";

describe("product destinations", () => {
  const books = [
    { id: "copy", title: "Altrove (Copy)", slug: "altrove", status: "published" },
    { id: "original", title: "Altrove", slug: "altrove", status: "published" },
    { id: "unique", title: "Other", slug: "other", status: "published" },
  ];
  it("gives colliding products independent destinations without mutating catalog data", () => {
    const routed = resolveProductRoutes(books);
    expect(routed.map(b => b.slug)).toEqual(["copy", "original", "other"]);
    expect(findProduct(routed, "original")?.title).toBe("Altrove");
    expect(books[0].slug).toBe("altrove");
  });
  it("resolves an exact ID before another product's slug", () => {
    expect(findProduct([{id:"a",slug:"b"},{id:"b",slug:"c"}], "b")?.id).toBe("b");
  });
  it("does not expose unpublished products or arbitrarily resolve an ambiguous old slug", () => {
    expect(findProduct(books, "altrove")).toBeUndefined();
    expect(findProduct([{id:"draft",status:"draft",title:"Hidden"}], "draft")).toBeUndefined();
  });
  it("does not let another product's slug shadow an ID or use a blank destination", () => {
    expect(resolveProductRoutes([{id:"a",slug:"b"},{id:"b",title:""}]).map(b=>b.slug)).toEqual(["a", "b"]);
  });
});
