import { describe, expect, it } from "vitest";
import { STYLE_GROUPS } from "./styleSchema";
import { COPY_SCHEMA } from "../../features/site/storeCopy";
import {
  EXTRA_STYLE_CATEGORIES, GROUP_BLURBS, MORE_SETTINGS, STYLE_SUBSECTIONS, TEXT_BLURBS, TEXT_HEADINGS, THEME_HEADINGS,
  blurbFor, changedCopyCount, changedCounts, changedFields, isChanged, subsectionsFor,
} from "./settingsMap";

// The friendlier Studio layout must never hide a control: these checks fail if a category, a text
// group or a single field stops being reachable from the Theme settings / Text & labels home.

describe("Theme settings home", () => {
  const placed = THEME_HEADINGS.flatMap((h) => h.groups);

  it("puts every Style category (and the Studio-only ones) under exactly one heading", () => {
    const all = [...STYLE_GROUPS.map((g) => g.id), ...Object.keys(EXTRA_STYLE_CATEGORIES)];
    expect([...placed].sort()).toEqual([...all].sort());
    expect(new Set(placed).size).toBe(placed.length);
  });

  it("only lists categories that exist", () => {
    const known = new Set([...STYLE_GROUPS.map((g) => g.id), ...Object.keys(EXTRA_STYLE_CATEGORIES)]);
    expect(placed.filter((id) => !known.has(id))).toEqual([]);
  });

  it("gives every everyday category a one-line description", () => {
    const everyday = THEME_HEADINGS.filter((h) => !h.advanced).flatMap((h) => h.groups);
    const missing = everyday.filter((id) => !blurbFor(STYLE_GROUPS.find((g) => g.id === id), id));
    expect(missing).toEqual([]);
    expect(Object.keys(GROUP_BLURBS).filter((id) => !STYLE_GROUPS.some((g) => g.id === id))).toEqual([]);
  });
});

describe("sub-sections inside big categories", () => {
  it("never lose or duplicate a field", () => {
    for (const g of STYLE_GROUPS) {
      const keys = subsectionsFor(g).flatMap((s) => s.fields.map((f) => f.key));
      expect(keys.sort(), g.id).toEqual(g.fields.map((f) => f.key).sort());
    }
  });

  it("only name keys that exist, so typos are caught", () => {
    for (const [id, subs] of Object.entries(STYLE_SUBSECTIONS)) {
      const group = STYLE_GROUPS.find((g) => g.id === id);
      expect(group, id).toBeTruthy();
      const keys = new Set(group!.fields.map((f) => f.key));
      expect(subs.flatMap((s) => s.keys).filter((k) => !keys.has(k)), id).toEqual([]);
    }
  });

  it("puts unlisted fields under More settings", () => {
    const fake = { id: "header", title: "Header", fields: [{ key: "headerBg", label: "Bg", kind: "color" as const }, { key: "brandNew", label: "New", kind: "toggle" as const }] };
    const subs = subsectionsFor(fake);
    expect(subs.map((s) => s.title)).toEqual(["Header colours", MORE_SETTINGS]);
    expect(subs[1].fields[0].key).toBe("brandNew");
  });

  it("keeps the big categories (20+ controls) broken into short lists", () => {
    for (const g of STYLE_GROUPS.filter((x) => x.fields.length >= 20 && !THEME_HEADINGS.find((h) => h.advanced)!.groups.includes(x.id))) {
      expect(STYLE_SUBSECTIONS[g.id], g.id).toBeTruthy();
      expect(subsectionsFor(g).find((s) => s.title === MORE_SETTINGS), g.id).toBeUndefined();
    }
  });
});

describe("changed from default", () => {
  const field = { key: "headerBg", label: "Header background", kind: "color" as const };
  it("compares against the default design, then the control's own default", () => {
    expect(isChanged(field, { headerBg: "#000" }, { headerBg: "#000" })).toBe(false);
    expect(isChanged(field, { headerBg: "#111" }, { headerBg: "#000" })).toBe(true);
    expect(isChanged(field, {}, { headerBg: "#000" })).toBe(false);
    expect(isChanged(field, { headerBg: "" }, {})).toBe(false);
    expect(isChanged(field, { headerBg: "" }, { headerBg: "#000" })).toBe(true);
    const slider = { key: "navLinkSize", label: "Link size", kind: "range" as const, min: 8, max: 20, defaultValue: 10 };
    expect(isChanged(slider, { navLinkSize: 10 }, {})).toBe(false);
    expect(isChanged(slider, { navLinkSize: 14 }, {})).toBe(true);
  });

  it("reads nested keys and counts per category", () => {
    const g = STYLE_GROUPS.find((x) => x.id === "footer")!;
    const design = { social: { instagram: "https://instagram.com/x" }, footerBg: "#123456" };
    expect(changedFields(g, design, {}).map((f) => f.key).sort()).toEqual(["footerBg", "social.instagram"]);
    const counts = changedCounts(STYLE_GROUPS, design, {});
    expect(counts.byGroup.footer).toBe(2);
    expect(counts.total).toBe(2);
  });
});

describe("Text & labels home", () => {
  it("puts every text group under exactly one heading, with a description", () => {
    const placed = TEXT_HEADINGS.flatMap((h) => h.groups);
    expect([...placed].sort()).toEqual(COPY_SCHEMA.map((g) => g.group).sort());
    expect(new Set(placed).size).toBe(placed.length);
    expect(COPY_SCHEMA.filter((g) => !TEXT_BLURBS[g.group]).map((g) => g.group)).toEqual([]);
  });

  it("counts rewritten labels, including deliberately blank ones", () => {
    expect(changedCopyCount([{ key: "a" }, { key: "b" }, { key: "c" }], { copy: { a: "Hi", b: "" } })).toBe(2);
    expect(changedCopyCount([{ key: "a" }], {})).toBe(0);
  });
});
