import { sameDesign, setPath, type Section } from "./studioModel";

export function updateBlocks(section: Section, key: string, update: (blocks: any[]) => any[]) {
  const blocks = section.settings[key] || section.settings.blocks || [];
  return { [key]: update(blocks) };
}

export function applyPageStyle(design: any, surface: string, path: string, value: any) {
  return { ...design, [surface]: setPath(design[surface] || {}, path, value) };
}

/** Build the single authoritative snapshot sent to the storefront iframe. */
export function buildPreviewState(settings: any, design: any, pages: any[], books: any[]) {
  return {
    type: "STUDIO_PREVIEW_STATE" as const,
    settings: { ...settings, design, draftDesign: design },
    design,
    pages: pages.filter((page) => page.status === "published"),
    books,
  };
}

/** One in-flight write, with an immutable baseline even if editing continues. */
export function createSnapshotWriter() {
  let busy = false;
  return {
    async run<T>(design: T, persist: (snapshot: T) => Promise<unknown>): Promise<T | null> {
      if (busy) return null;
      busy = true;
      try {
        const snapshot = JSON.parse(JSON.stringify(design)) as T;
        await persist(snapshot);
        return snapshot;
      } finally { busy = false; }
    },
  };
}

export type Recovery = { version: 1; design: Record<string, any>; base: string; savedAt: number };
export function parseRecovery(raw: string | null, baseline: any): (Recovery & { conflict: boolean }) | null {
  try {
    const data = JSON.parse(raw || "null");
    if (data?.version !== 1 || !data.design || typeof data.design !== "object" || Array.isArray(data.design)
      || typeof data.base !== "string" || !Number.isFinite(data.savedAt) || sameDesign(data.design, baseline)) return null;
    return { ...data, conflict: data.base !== JSON.stringify(baseline) };
  } catch { return null; }
}

export function previewRoute(href: string, base: string) {
  const url = new URL(href, "https://preview.invalid");
  const prefix = base.endsWith("/") ? base : `${base}/`;
  if (!url.pathname.startsWith(prefix)) return null;
  const path = url.pathname.slice(prefix.length).replace(/\/$/, "");
  if (!path) return { templateId: url.searchParams.get("catalog") === "true" ? "storefront" : "heroPage" };
  if (path.startsWith("books/")) return { templateId: "productPage", product: decodeURIComponent(path.slice(6)) };
  if (path.startsWith("collections/")) return { templateId: "collectionPage", collection: decodeURIComponent(path.slice(12)) };
  if (path.startsWith("page/")) return { templateId: `page:${decodeURIComponent(path.slice(5))}` };
  if (path === "checkout") return { templateId: "cartPage" };
  return null;
}

// These groups are consumed through per-page theme tokens. Other controls stay
// explicitly global until their storefront consumers support local overrides.
export const PAGE_STYLE_GROUPS = new Set(["colors", "buttons", "type", "layout"]);
