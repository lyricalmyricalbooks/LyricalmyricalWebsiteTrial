import { describe, expect, it } from "vitest";
import { normalizeDesign } from "./studioModel";
import { applyPageStyle, createSnapshotWriter, parseRecovery, previewRoute, updateBlocks } from "./studioWorkflow";

describe("Studio workflow", () => {
  it("normalization is idempotent and never nests page surfaces inside one another", () => {
    const initial = { primaryColor: "red", productPage: { sections: [] }, heroPage: { sections: [] } };
    const once = normalizeDesign(initial);
    expect(normalizeDesign(once)).toEqual(once);
    expect(once.heroPage).not.toHaveProperty("productPage");
  });
  it("gives legacy hidden and visible blocks stable identity across normalization", () => {
    const input = { heroPage: { sections: [{ id: "faq", type: "FAQSection", settings: { items: [{ hidden: true, question: "Hidden" }, { question: "Visible" }] } }] } };
    const a = normalizeDesign(input);
    const b = normalizeDesign(input);
    const blocks = a.heroPage.sections[0].settings.items;
    expect(blocks[0].id).toBeTruthy();
    expect(blocks[1].id).toBeTruthy();
    expect(blocks[1].id).not.toBe(blocks[0].id);
    expect(b.heroPage.sections).toEqual(a.heroPage.sections);
    expect(input.heroPage.sections[0].settings.items[0]).not.toHaveProperty("id");
  });
  it("edits a legacy blocks array without losing it or affecting siblings", () => {
    const section = { id: "s", type: "FAQSection", settings: { blocks: [{ id: "a", question: "A" }, { id: "b", question: "B" }] } };
    const next = updateBlocks(section, "items", blocks => blocks.map(b => b.id === "b" ? { ...b, question: "Edited" } : b));
    expect(next.items.map((b: any) => b.question)).toEqual(["A", "Edited"]);
    expect(section.settings.blocks[1].question).toBe("B");
  });
  it("page overrides preserve global values, other pages and section stacks", () => {
    const d = { primaryColor: "red", heroPage: { sections: [1] }, storefront: { primaryColor: "blue" } };
    const n = applyPageStyle(d, "heroPage", "primaryColor", "green");
    expect(n.primaryColor).toBe("red");
    expect(n.heroPage).toEqual({ sections: [1], primaryColor: "green" });
    expect(n.storefront).toEqual({ primaryColor: "blue" });
    expect(applyPageStyle(n, "heroPage", "primaryColor", undefined).heroPage).toEqual({ sections: [1] });
  });
  it("saves the captured snapshot and excludes edits made while awaiting persistence", async () => {
    let finish!: () => void;
    const pending = new Promise<void>(resolve => { finish = resolve; });
    const writer = createSnapshotWriter();
    const design = { title: "Before" };
    let stored: any;
    const first = writer.run(design, async snapshot => { await pending; stored = snapshot; });
    design.title = "After";
    expect(await writer.run(design, async () => { throw new Error("must not run"); })).toBeNull();
    finish();
    expect(await first).toEqual({ title: "Before" });
    expect(stored).toEqual({ title: "Before" });
    expect(await writer.run(design, async () => {})).toEqual({ title: "After" });
  });
  it("unlocks after failed persistence so the draft can be retried", async () => {
    const writer = createSnapshotWriter();
    await expect(writer.run({ a: 1 }, async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    expect(await writer.run({ a: 2 }, async () => {})).toEqual({ a: 2 });
  });
  it("rejects malformed recovery and recognizes a changed server baseline", () => {
    expect(parseRecovery("{broken", { title: "Live" })).toBeNull();
    expect(parseRecovery(JSON.stringify({ version: 1, design: "bad" }), {})).toBeNull();
    const recovery = JSON.stringify({ version: 1, design: { title: "Local" }, base: JSON.stringify({ title: "Old" }), savedAt: 1 });
    expect(parseRecovery(recovery, { title: "New" })?.conflict).toBe(true);
    expect(parseRecovery(recovery, { title: "Local" })).toBeNull();
  });
  it("maps preview navigation under the deployed subpath", () => {
    expect(previewRoute("/LyricalmyricalWebsiteTrial/books/poems?preview=true", "/LyricalmyricalWebsiteTrial/")).toEqual({ templateId: "productPage", product: "poems" });
    expect(previewRoute("/LyricalmyricalWebsiteTrial/?catalog=true", "/LyricalmyricalWebsiteTrial/")).toEqual({ templateId: "storefront" });
    expect(previewRoute("/LyricalmyricalWebsiteTrial/page/about", "/LyricalmyricalWebsiteTrial/")).toEqual({ templateId: "page:about" });
    expect(previewRoute("/outside", "/LyricalmyricalWebsiteTrial/")).toBeNull();
  });
});
