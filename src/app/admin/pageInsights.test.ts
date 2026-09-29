import { describe, expect, it } from "vitest";
import { duplicatePage, movePage, seoHints } from "./pageInsights";

describe("pageInsights", () => {
  it("gives SEO hints", () => {
    expect(seoHints("", "", "").every((h) => h.level === "warn")).toBe(true);
    const good = seoHints("About the press and its history", "", "x".repeat(100));
    expect(good.every((h) => h.level === "good")).toBe(true);
    expect(seoHints("t".repeat(70), "", "x".repeat(100))[0].level).toBe("warn");
  });
  it("duplicates as draft with a unique slug and no id", () => {
    const d = duplicatePage({ id: "1", title: "About", slug: "about", status: "published", body: "b" }, [{ slug: "about" }, { slug: "about-copy" }]);
    expect(d).toMatchObject({ title: "About (copy)", slug: "about-copy-2", status: "draft", body: "b" });
    expect(d).not.toHaveProperty("id");
  });
  it("moves by position even when orders tie", () => {
    const s = [{ id: "a", order: 0 }, { id: "b", order: 0 }, { id: "c", order: 0 }];
    expect(movePage(s, "b", -1)).toEqual([{ id: "a", order: 1 }, { id: "c", order: 2 }]);
    expect(movePage(s, "a", -1)).toEqual([]);
    expect(movePage(s, "c", 1)).toEqual([]);
  });
});
