import { describe, it, expect } from "vitest";
import { addSavedTheme, removeSavedTheme, savedThemesBytes, savedThemesFit, MAX_SAVED_THEMES, SAVED_THEMES_BUDGET_BYTES } from "./savedThemes";

describe("saved themes", () => {
  it("stores a detached, undefined-free copy", () => {
    const d: any = { a: 1, b: undefined, s: [{ id: "x" }] };
    const [t] = addSavedTheme([], " Autumn ", d);
    expect(t.name).toBe("Autumn");
    expect(t.design).toEqual({ a: 1, s: [{ id: "x" }] });
    d.s[0].id = "changed";
    expect(t.design.s[0].id).toBe("x");
  });
  it("replaces a theme with the same name and caps the list", () => {
    let l = addSavedTheme([], "A", { v: 1 });
    l = addSavedTheme(l, "a", { v: 2 });
    expect(l).toHaveLength(1);
    expect(l[0].design.v).toBe(2);
    for (let i = 0; i < 15; i++) l = addSavedTheme(l, `T${i}`, {});
    expect(l).toHaveLength(MAX_SAVED_THEMES);
    expect(l[0].name).toBe("T14");
  });
  it("removes by id and names blanks", () => {
    const l = addSavedTheme([], "  ", {});
    expect(l[0].name).toBe("Untitled theme");
    expect(removeSavedTheme(l, l[0].id)).toEqual([]);
  });
  it("refuses to grow past the Firestore-safe budget", () => {
    // A realistic design is ~75 KB; seven of them would blow the 500 KB budget.
    const big = { blob: "x".repeat(75_000) };
    let l = addSavedTheme([], "T0", big);
    expect(savedThemesFit(l)).toBe(true);
    for (let i = 1; i < 7; i++) l = addSavedTheme(l, `T${i}`, big);
    expect(savedThemesBytes(l)).toBeGreaterThan(SAVED_THEMES_BUDGET_BYTES);
    expect(savedThemesFit(l)).toBe(false);
    // deleting one gets back under budget
    expect(savedThemesFit(removeSavedTheme(l, l[0].id).slice(0, 5))).toBe(true);
  });
});
