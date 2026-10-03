import { moveBlockBefore, patchSectionSettings, sameDesign, setPath, type Section } from "./studioModel";
import { REGION_GROUPS } from "../../features/site/storefrontRegions";

/** Finds section ownership in the current design, including globals and page:<slug>. */
export function sectionEntries(design: any): { surface: string; sections: Section[] }[] {
  return [
    ...(Array.isArray(design?.globalSections) ? [{ surface: "globalSections", sections: design.globalSections }] : []),
    ...Object.entries(design || {}).flatMap(([surface, value]: [string, any]) =>
      Array.isArray(value?.sections) ? [{ surface, sections: value.sections }] : []),
  ];
}

export function findSectionOwner(design: any, sectionId: string) {
  const owner = sectionEntries(design).find(entry => entry.sections.some(section => section.id === sectionId));
  return owner && { ...owner, section: owner.sections.find(section => section.id === sectionId)! };
}

/** Applies preview drag actions against the latest immutable design snapshot. */
export function applyCanvasAction(design: any, action: {
  type: string; sectionId: string; blockId?: string; beforeId?: string;
}, blocksKey: (type: string) => string, newBlock?: any) {
  const owner = findSectionOwner(design, action.sectionId);
  if (!owner) return design;
  let sections = owner.sections;
  if (action.type === "SECTION_MOVE") {
    const from = sections.findIndex(section => section.id === action.sectionId);
    const to = sections.findIndex(section => section.id === action.beforeId);
    if (to < 0 || from === to) return design;
    sections = [...sections];
    const [moving] = sections.splice(from, 1);
    sections.splice(from < to ? to - 1 : to, 0, moving);
  } else {
    const key = blocksKey(owner.section.type);
    const blocks = owner.section.settings[key] || owner.section.settings.blocks || [];
    if (action.type === "ADD_BLOCK" && newBlock) sections = patchSectionSettings(sections, action.sectionId, { [key]: [...blocks, newBlock] });
    else if (action.type === "BLOCK_MOVE" && action.blockId && action.beforeId) {
      sections = patchSectionSettings(sections, action.sectionId, { [key]: moveBlockBefore(blocks, action.blockId, action.beforeId) });
    } else return design;
  }
  return owner.surface === "globalSections" ? { ...design, globalSections: sections }
    : { ...design, [owner.surface]: { ...design[owner.surface], sections } };
}

/** Advance server fields while retaining edits made since the request started. */
export function reconcileSavedPage<T extends Record<string, any>>(current: T | null, captured: T, saved: T): T | null {
  if (!current) return null;
  if (JSON.stringify(current) === JSON.stringify(captured)) return saved;
  return { ...saved, ...current, id: saved.id, createdAt: saved.createdAt, updatedAt: saved.updatedAt };
}

export function updateBlocks(section: Section, key: string, update: (blocks: any[]) => any[]) {
  const blocks = section.settings[key] || section.settings.blocks || [];
  return { [key]: update(blocks) };
}

export function applyPageStyle(design: any, surface: string, path: string, value: any) {
  return { ...design, [surface]: setPath(design[surface] || {}, path, value) };
}

/**
 * Plain, structured-clone-safe copy for postMessage/BroadcastChannel. Admin book/page lists carry
 * `_lastDoc` (a live Firestore snapshot with functions), which makes postMessage throw a
 * DataCloneError — silently stopping every preview update once books have loaded.
 */
export function toCloneable<T>(value: T): T {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value, (key, v) => (key === "_lastDoc" ? undefined : v)));
}

/** Build the single authoritative snapshot sent to the storefront iframe. */
export function buildPreviewState(settings: any, design: any, pages: any[], books: any[]) {
  return toCloneable({
    type: "STUDIO_PREVIEW_STATE" as const,
    settings: { ...settings, design, draftDesign: design },
    design,
    pages: (pages || []).filter((page) => page.status === "published"),
    books: books || [],
  });
}

/** Channel that carries the unsaved snapshot to a full-screen "Preview in new tab" window. */
export { PREVIEW_CHANNEL } from "../../features/site/previewTab";

/**
 * Overlay the page being edited in Studio › Pages (unsaved) onto the page list, for the preview
 * snapshot only — nothing is written. Matches by id, else by slug for a page not yet created.
 */
export function withDraftPage(pages: any[], draft: any | null | undefined) {
  if (!draft || !draft.slug) return pages;
  const match = (p: any) => (draft.id ? p.id === draft.id : p.slug === draft.slug);
  return pages.some(match) ? pages.map((p) => (match(p) ? { ...p, ...draft } : p)) : [...pages, { ...draft, id: draft.id || `draft-${draft.slug}` }];
}

/** Deliver through postMessage plus a same-origin fallback for iframe load races. */
export function deliverPreviewState(
  frame: Window | null | undefined,
  state: ReturnType<typeof buildPreviewState>,
  origin: string,
) {
  if (!frame) return;
  try {
    frame.postMessage(state, origin);
  } catch (err) {
    // Never let one undeliverable post stop the direct same-origin dispatch below.
    console.warn("[Studio] preview postMessage failed", err);
  }
  try {
    if (frame.location.origin !== origin) return;
    const source = typeof window === "undefined" ? null : window;
    frame.dispatchEvent(new MessageEvent("message", { data: state, origin, source }));
  } catch {
    // Cross-origin frames still receive the normal postMessage above.
  }
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
  if (path === "wishlist") return { templateId: "wishlistPage" };
  if (path === "account" || path.startsWith("account/")) return { templateId: "accountPage" };
  if (path === "track") return { templateId: "trackingPage" };
  return { templateId: "page404" };
}

// These groups are consumed through per-page theme tokens. Other controls stay
// explicitly global until their storefront consumers support local overrides.
export const PAGE_STYLE_GROUPS = new Set(["colors", "buttons", "type", "layout", ...REGION_GROUPS.map(g => g.id)]);
