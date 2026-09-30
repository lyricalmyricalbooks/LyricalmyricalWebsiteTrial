import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { STYLE_GROUPS } from "../../admin/studio/styleSchema";
import { COPY_SCHEMA } from "./storeCopy";

// Clicking a built-in storefront region in the Studio preview opens the panel named by its
// data-studio-target (see previewBridge.ts / StudioEditor.tsx STUDIO_TARGET). Every target must
// point at a real panel, and the main shell regions must stay clickable.
const APP_DIR = join(__dirname, "..", "..");
const PANELS = new Set(["menus:categories", "menus:header-order", "menus:header", "menus:footer", "pages", "style:paymentIcons"]);

function sources(dir: string, out: string[] = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== "admin") sources(p, out); }
    else if (/\.tsx$/.test(n) && !/\.test\./.test(n)) out.push(p);
  }
  return out;
}

const found: { file: string; target: string; label: string }[] = [];
for (const file of sources(APP_DIR)) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/data-studio-target="([^"]+)"(?:\s+data-studio-label="([^"]*)")?/g)) {
    for (const target of m[1].split("|")) found.push({ file: relative(APP_DIR, file), target, label: m[2] || "" });
  }
}

describe("Studio click-to-edit targets", () => {
  it("every target opens a real Studio panel", () => {
    const styleIds = new Set(STYLE_GROUPS.map((g) => `style:${g.id}`));
    const copyGroups = new Set(COPY_SCHEMA.map((g) => `copy:${g.group}`));
    const bad = found.filter(({ target }) => !styleIds.has(target) && !copyGroups.has(target) && !PANELS.has(target));
    expect(bad.map((b) => `${b.file}: ${b.target}`)).toEqual([]);
  });

  it("every target has a label shown in the preview", () => {
    expect(found.filter((f) => !f.label).map((f) => `${f.file}: ${f.target}`)).toEqual([]);
  });

  it("the storefront shell regions stay clickable", () => {
    const labels = new Set(found.map((f) => f.label));
    for (const l of ["Header", "Category bar", "Logo", "Product grid", "Newsletter box", "Footer", "Cart drawer", "Product page", "Checkout", "Cookie banner"]) {
      expect(labels.has(l), `missing click-to-edit region: ${l}`).toBe(true);
    }
  });
});
