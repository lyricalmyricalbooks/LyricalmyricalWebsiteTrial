import { describe, it, expect } from "vitest";
import { addSavedTheme, removeSavedTheme, MAX_SAVED_THEMES } from "./savedThemes";

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
});
