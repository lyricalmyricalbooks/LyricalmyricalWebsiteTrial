import { describe, expect, it } from "vitest";
import { buildStudioIndex, normalizeSearchText, searchStudio } from "./studioSearch";
import { STYLE_GROUPS } from "./styleSchema";
import { COPY_SCHEMA } from "../../features/site/storeCopy";

const index = buildStudioIndex({
  styleGroups: STYLE_GROUPS,
  copySchema: COPY_SCHEMA,
  templates: [{ id: "heroPage", label: "Home" }, { id: "productPage", label: "Product page" }, { id: "page:about", label: "About", pageSlug: "about" }],
  pages: [{ slug: "about", title: "About us", status: "published" }, { slug: "about", title: "dupe" }],
  sectionsByTemplate: {
    heroPage: [{ id: "s1", type: "HeroSection", visible: true, settings: { title: "Spring list" } }],
    __global: [{ id: "g1", type: "AnnouncementBar", visible: false, settings: {} }],
  },
  sectionLabel: (t) => (t === "HeroSection" ? "Hero Banner" : t),
});

describe("normalizeSearchText", () => {
  it("splits camelCase keys and unifies spellings", () => {
    expect(normalizeSearchText("pdpCardBg")).toBe("pdp card bg");
    expect(normalizeSearchText("Page Colour")).toBe("page color");
  });
});

describe("searchStudio", () => {
  it("returns shortcuts for an empty query", () => {
    const r = searchStudio(index, "");
    expect(r.length).toBeGreaterThan(5);
    expect(r.every((e) => ["action", "area", "page"].includes(e.kind))).toBe(true);
  });

  it("finds actions by their on-screen name and by plain words", () => {
    expect(searchStudio(index, "publish")[0].target).toEqual({ type: "action", id: "publish" });
    expect(searchStudio(index, "go live").some((e) => e.target.type === "action" && e.target.id === "publish")).toBe(true);
  });

  it("requires every typed word to match", () => {
    expect(searchStudio(index, "publish zzzqqq")).toEqual([]);
  });

  it("finds Style controls through British spelling and synonyms", () => {
    const r = searchStudio(index, "background colour");
    expect(r.some((e) => e.target.type === "style" && e.target.key === "backgroundColor")).toBe(true);
    // "phone" finds phone-sized settings via the mobile synonym
    expect(searchStudio(index, "phone").some((e) => e.target.type === "action" && e.target.id === "device-mobile")).toBe(true);
  });

  it("finds shopper text by its label and its current default wording", () => {
    const sample = COPY_SCHEMA[0].fields[0];
    const hit = searchStudio(index, sample.label).find((e) => e.target.type === "copy" && e.target.key === sample.key);
    expect(hit).toBeTruthy();
    expect(hit!.where).toContain("Text & labels");
  });

  it("lists pages once and the sections on each page", () => {
    expect(searchStudio(index, "about").filter((e) => e.target.type === "page")).toHaveLength(1);
    const sec = searchStudio(index, "spring").find((e) => e.kind === "section");
    expect(sec?.target).toEqual({ type: "section", templateId: "heroPage", sectionId: "s1" });
    expect(searchStudio(index, "announcement")[0].where).toContain("hidden");
  });

  it("ranks a title that starts with the query above looser hits", () => {
    const r = searchStudio(index, "save draft");
    expect(r[0].title).toBe("Save draft");
  });

  it("caps the number of results", () => {
    expect(searchStudio(index, "color", { limit: 5 }).length).toBeLessThanOrEqual(5);
  });
});

describe("search index size", () => {
  it("indexes each element setting once, not once per screen size, and still finds phone settings", async () => {
    const { buildStudioIndex, searchStudio } = await import("./studioSearch");
    const { STYLE_GROUPS } = await import("./styleSchema");
    const { COPY_SCHEMA } = await import("../../features/site/storeCopy");
    const index = buildStudioIndex({ templates: [], pages: [], sectionsByTemplate: {}, sectionLabel: (t: string) => t, styleGroups: STYLE_GROUPS, copySchema: COPY_SCHEMA } as any);
    const all = STYLE_GROUPS.reduce((n, g) => n + g.fields.length, 0);
    const styleEntries = index.filter(e => e.kind === "style").length;
    expect(styleEntries).toBeLessThan(all / 2);
    expect(index.some(e => /Mobile|Tablet/.test(e.id) && e.id.startsWith("style:") && e.id.includes("regions."))).toBe(false);
    expect(searchStudio(index, "newsletter button phone padding", { limit: 10 }).some(r => r.id.includes("regions.newsletterButton"))).toBe(true);
  });
});
