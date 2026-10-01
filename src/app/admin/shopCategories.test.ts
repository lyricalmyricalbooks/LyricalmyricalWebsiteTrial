import { describe, expect, it } from "vitest";
import { shopCategoryWrite } from "./shopCategories";

describe("shopCategoryWrite", () => {
  it("targets only live and draft category fields", () => {
    const categories = [{ id: "zines", name: "ZINES", showInNav: true }];
    const write = shopCategoryWrite(categories);

    expect(write.options.mergeFields).toEqual(["design.categories", "draftDesign.categories"]);
    expect(write.payload.design.categories).toEqual(categories);
    expect(write.payload.draftDesign.categories).toEqual(categories);
  });

  it("takes a detached snapshot so later UI changes cannot mutate the queued write", () => {
    const categories = [{ id: "books", name: "BOOKS" }];
    const write = shopCategoryWrite(categories);
    categories[0].name = "CHANGED";

    expect(write.payload.design.categories[0].name).toBe("BOOKS");
    expect(write.payload.draftDesign.categories[0].name).toBe("BOOKS");
  });
});
