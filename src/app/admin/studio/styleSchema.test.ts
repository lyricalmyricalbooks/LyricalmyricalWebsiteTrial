import { describe, expect, it } from "vitest";
import { STYLE_GROUPS, STYLE_TARGET_FIELDS, applyGlobalStyle, readStyle } from "./styleSchema";

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
  it("controls that read as 0/off when unset declare the storefront's real default", () => {
    const f = (k: string) => STYLE_GROUPS.flatMap((g) => g.fields).find((x) => x.key === k) as any;
    expect(f("catalogImageFocalX").defaultValue).toBe(50);
    expect(f("newBadgeDays").defaultValue).toBe(30);
    expect(f("productColumnsMobile").defaultValue).toBe(1);
    expect(f("cardTitleSizeMobile").defaultValue).toBe(16);
    expect(f("cardPriceSizeMobile").defaultValue).toBe(16);
    // a default must sit inside its own slider range
    for (const g of STYLE_GROUPS) for (const x of g.fields as any[]) {
      if (x.kind === "range" && x.defaultValue !== undefined) {
        expect(x.defaultValue, x.key).toBeGreaterThanOrEqual(x.min);
        expect(x.defaultValue, x.key).toBeLessThanOrEqual(x.max);
      }
    }
  });
});

describe("Studio style schema structure", () => {
  it("has unique group ids", () => {
    const ids = STYLE_GROUPS.map((g) => g.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it("names the group of any key that appears twice", () => {
    // Two controls for one value fight each other, and one is usually misplaced
    // (e.g. a shop-card colour hiding under "Product page layout").
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const g of STYLE_GROUPS) {
      for (const f of g.fields) {
        const prev = seen.get(f.key);
        if (prev) dupes.push(`${f.key} (${prev} and ${g.id})`);
        else seen.set(f.key, g.id);
      }
    }
    expect(dupes).toEqual([]);
  });

  it("every click-to-edit field pattern matches at least one control", () => {
    const keys = STYLE_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
    for (const [label, re] of Object.entries(STYLE_TARGET_FIELDS)) {
      expect(keys.some((k) => re.test(k)), `no control matches "${label}"`).toBe(true);
    }
  });
});
