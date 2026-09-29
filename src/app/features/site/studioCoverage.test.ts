import { describe, it, expect } from "vitest";
import { RISO_NOIR_TOKENS } from "./risoNoir";
import { STYLE_GROUPS } from "../../admin/studio/styleSchema";

// Every design key the default look sets must be adjustable in the Studio editor's Style tab,
// otherwise a merchant can see the effect but has no control to change it.
const EDITED_ELSEWHERE = new Set([
  // Studio › Menus / Sections / Text & labels, or fixed by the preset itself
  "themeStyle", "font", "letterSpacing", "wordmarkStyle",
]);

describe("Studio covers the default look", () => {
  it("has a Style control for every Riso Noir token", () => {
    const controlled = new Set(STYLE_GROUPS.flatMap((g) => g.fields.map((f) => f.key)));
    const missing = Object.keys(RISO_NOIR_TOKENS).filter((k) => !controlled.has(k) && !EDITED_ELSEWHERE.has(k));
    expect(missing).toEqual([]);
  });
});
