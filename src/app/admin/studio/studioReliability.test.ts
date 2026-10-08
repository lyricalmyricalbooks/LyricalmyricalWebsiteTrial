import { describe, expect, it } from "vitest";
import { applyCanvasAction, reconcileSavedPage } from "./studioWorkflow";
import { designChecks } from "./studioChecks";

const checkSchema = {
  sectionFields: (type: string) => type === "HeroSection" ? [{ key: "title", kind: "text" }] : [],
  blockFields: (type: string) => type === "CompositionSection" ? [
    { key: "imageUrl", kind: "image" }, { key: "alt", kind: "text" },
  ] : [],
  blocksKey: () => "items",
};

describe("Studio editing reliability", () => {
  const key = () => "items";
  it("moves global sections from their current owner without replacing newer content", () => {
    const design = { globalSections: [
      { id: "a", type: "FAQSection", settings: { title: "Latest edit" } },
      { id: "b", type: "FAQSection", settings: {} },
    ], heroPage: { sections: [{ id: "home", type: "HeroSection", settings: {} }] } };
    const next = applyCanvasAction(design, { type: "SECTION_MOVE", sectionId: "b", beforeId: "a" }, key);
    expect(next.globalSections.map((s: any) => s.id)).toEqual(["b", "a"]);
    expect(next.globalSections[1].settings.title).toBe("Latest edit");
    expect(next.heroPage).toBe(design.heroPage);
    expect(design.globalSections[0].id).toBe("a");
  });
  it("appends to legacy block arrays and preserves repeated additions on custom pages", () => {
    const design: any = { "page:about": { sections: [{ id: "faq", type: "FAQSection", settings: {
      blocks: [{ id: "existing", question: "Latest question" }],
    } }] } };
    const first = applyCanvasAction(design, { type: "ADD_BLOCK", sectionId: "faq" }, key, { id: "new-1" });
    const second = applyCanvasAction(first, { type: "ADD_BLOCK", sectionId: "faq" }, key, { id: "new-2" });
    expect(second["page:about"].sections[0].settings.items.map((b: any) => b.id)).toEqual(["existing", "new-1", "new-2"]);
    expect(second["page:about"].sections[0].settings.items[0].question).toBe("Latest question");
  });
  it("moves blocks within the message's section while preserving other blocks and sections", () => {
    const design = { storefront: { sections: [{ id: "faq", type: "FAQSection", settings: {
      items: [{ id: "group", children: [{ id: "a", title: "Updated" }, { id: "b" }] }],
    } }] } };
    const next = applyCanvasAction(design, { type: "BLOCK_MOVE", sectionId: "faq", blockId: "b", beforeId: "a" }, key);
    expect(next.storefront.sections[0].settings.items[0].children).toEqual([{ id: "b" }, { id: "a", title: "Updated" }]);
    expect(applyCanvasAction(next, { type: "SECTION_MOVE", sectionId: "missing", beforeId: "faq" }, key)).toBe(next);
  });
  it("preserves edits made during a new-page save while taking server identity", () => {
    const captured = { title: "Before", slug: "before", body: "Original" };
    const current = { ...captured, title: "After", body: "Newer content" };
    const saved = { ...captured, id: "server-id", createdAt: "created", updatedAt: "saved" };
    expect(reconcileSavedPage(current, captured, saved)).toEqual({
      id: "server-id", title: "After", slug: "before", body: "Newer content", createdAt: "created", updatedAt: "saved",
    });
    expect(reconcileSavedPage(captured, captured, saved)).toEqual(saved);
    expect(reconcileSavedPage(null, captured, saved)).toBeNull();
  });
  it("checks nested global and custom-page images and reports manual checks as warnings", () => {
    const checks = designChecks({
      globalSections: [{ id: "global", type: "CompositionSection", settings: { items: [
        { id: "group", type: "group", children: [{ id: "image", type: "image", imageUrl: "/cover.jpg", alt: "" }] },
      ] } }],
      "page:about": { sections: [{ id: "about", type: "HeroSection", settings: { title: "About" } }] },
    }, checkSchema);
    expect(checks.find(result => result.text.includes("description"))).toMatchObject({ tone: "warn" });
    expect(checks.filter(result => /not measured|not automatically measured/.test(result.text))).toHaveLength(2);
  });
  it("flags sections with only empty rich text markup", () => {
    const checks = designChecks({ heroPage: { sections: [{ id: "empty", type: "HeroSection", settings: { title: "<p><br></p>" } }] } }, checkSchema);
    expect(checks[0]).toMatchObject({ tone: "warn" });
  });
});

describe("design size guard", () => {
  it("measures the stored design and refuses one that cannot be saved", async () => {
    const { designSize, DESIGN_MAX_BYTES } = await import("./studioChecks");
    expect(designSize({ a: 1 })).toMatchObject({ tone: "ok", tooBig: false });
    expect(designSize({ big: "x".repeat(DESIGN_MAX_BYTES) })).toMatchObject({ tone: "warn", tooBig: true });
  });
});
