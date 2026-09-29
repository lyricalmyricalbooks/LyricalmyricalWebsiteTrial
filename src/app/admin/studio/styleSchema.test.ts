import { describe, expect, it } from "vitest";
import { STYLE_GROUPS, applyGlobalStyle, readStyle } from "./styleSchema";

describe("applyGlobalStyle", () => {
  const design = {
    buttonColor: "#111",
    heroPage: { buttonColor: "#222", sections: [1] },
    storefront: { buttonColor: "#333", sections: [2] },
  };
  it("writes root and every surface, keeping surface sections", () => {
    const n = applyGlobalStyle(design, "buttonColor", "#fff", ["heroPage", "storefront", "productPage"]);
    expect(n.buttonColor).toBe("#fff");
    expect(n.heroPage).toEqual({ buttonColor: "#fff", sections: [1] });
    expect(n.storefront.buttonColor).toBe("#fff");
    expect(n.productPage).toEqual({ buttonColor: "#fff" });
    expect(design.heroPage.buttonColor).toBe("#222");
  });
  it("handles dotted paths and clearing", () => {
    const n = applyGlobalStyle({ social: { instagram: "a", tiktok: "b" }, heroPage: {} }, "social.instagram", "", ["heroPage"]);
    expect(n.social).toEqual({ tiktok: "b" });
    expect(n.heroPage.social).toEqual({ tiktok: "b" });
    const c = applyGlobalStyle({ copy: { a: "x" }, heroPage: { copy: { a: "x" } } }, "cartTitle", undefined, ["heroPage"]);
    expect("cartTitle" in c).toBe(false);
  });
  it("style keys are unique and readable", () => {
    const keys = STYLE_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(readStyle({ social: { x: 1 } }, "social.x")).toBe(1);
  });
});
