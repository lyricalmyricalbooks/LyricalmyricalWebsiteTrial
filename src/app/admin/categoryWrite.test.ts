import { describe, expect, it } from "vitest";
import { shopCategoryWrite } from "./categoryWrite";

describe("shopCategoryWrite", () => {
  it("updates the published and draft category paths in one merge", () => {
    const categories = [{ id: "cat-zines", name: "Zines", showInNav: true }];
    const write = shopCategoryWrite(categories);

    expect(write).toEqual({
      payload: {
        design: { categories },
        draftDesign: { categories },
      },
      options: { mergeFields: ["design.categories", "draftDesign.categories"] },
    });
  });

  it("takes a detached snapshot so later form edits cannot change the write", () => {
    const categories = [{ id: "cat-books", name: "Books" }];
    const write = shopCategoryWrite(categories);
    categories[0].name = "Changed";

    expect(write.payload.design.categories[0].name).toBe("Books");
    expect(write.payload.draftDesign.categories[0].name).toBe("Books");
  });
});
