import { describe, expect, it } from "vitest";
import { bookInCategory, buildNavItems, moveNavItem, renameCategory } from "./navItems";

const cats = [
  { id: "a", name: "PUBLICATIONS", showInNav: true },
  { id: "b", name: "EPHEMERA", showInNav: true },
  { id: "c", name: "HIDDEN", showInNav: false },
];
const pages = [
  { id: "p1", slug: "history", title: "history", status: "published", showInNav: true },
  { id: "p2", slug: "draft", title: "draft", status: "draft", showInNav: true },
  { id: "p3", slug: "quiet", title: "quiet", status: "published", showInNav: false },
];

describe("buildNavItems", () => {
  it("lists visible categories then in-menu published pages", () => {
    expect(buildNavItems(cats, pages).map((i) => i.label)).toEqual(["PUBLICATIONS", "EPHEMERA", "history"]);
  });
  it("honours navOrder and appends unlisted items", () => {
    const order = ["page:p1", "cat:b"];
    expect(buildNavItems(cats, pages, order).map((i) => i.label)).toEqual(["history", "EPHEMERA", "PUBLICATIONS"]);
  });
  it("moves items within the visible list", () => {
    const items = buildNavItems(cats, pages);
    expect(moveNavItem(items, 2, -1)).toEqual(["cat:a", "page:p1", "cat:b"]);
    expect(moveNavItem(items, 0, -1)).toEqual(["cat:a", "cat:b", "page:p1"]);
  });
});

describe("renameCategory", () => {
  it("remembers the old name so tagged books still match", () => {
    const next = renameCategory(cats, 1, "ZINES");
    expect(next[1]).toMatchObject({ id: "b", name: "ZINES", aliases: ["EPHEMERA"] });
    expect(bookInCategory({ categories: ["EPHEMERA"] }, next[1])).toBe(true);
    expect(bookInCategory({ categories: ["ZINES"] }, next[1])).toBe(true);
    expect(bookInCategory({ categories: ["OTHER"] }, next[1])).toBe(false);
  });
  it("drops an alias when renamed back and ignores blanks", () => {
    const once = renameCategory(cats, 1, "ZINES");
    const back = renameCategory(once, 1, "EPHEMERA");
    expect(back[1].aliases).toEqual(["ZINES"]);
    expect(renameCategory(cats, 1, "  ")[1].name).toBe("EPHEMERA");
  });
  it("keeps PUBLICATIONS as the show-everything category even after a rename", () => {
    const next = renameCategory(cats, 0, "ALL BOOKS");
    expect(bookInCategory({ categories: [] }, next[0])).toBe(true);
  });
});
