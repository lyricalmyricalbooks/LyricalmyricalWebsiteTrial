// Pure, UI-free helpers for the Studio theme editor. Everything the editor does
// to a `design` object goes through here so it can be unit-tested and so the
// editor never mutates state in place.

export type Section = { id: string; type: string; visible?: boolean; settings: Record<string, any> };
export type StudioBlock = {
  id: string;
  type?: "group" | "text" | "image" | "button";
  children?: StudioBlock[];
  sharedBlockId?: string;
  responsive?: Record<"desktop" | "tablet" | "mobile", Record<string, any>>;
  grid?: Record<"desktop" | "tablet" | "mobile", Record<string, number>>;
  [key: string]: any;
};
export type SharedBlock = { id: string; name: string; sectionType?: string; block: StudioBlock; updatedAt: string };

/** Where a list of sections lives inside `design`. */
export type SectionTarget = { kind: "template"; id: string } | { kind: "global" };

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? null));

export const MAX_BLOCK_DEPTH = 3;

/** Normalizes legacy flat blocks and recursive composition blocks without mutating. */
export function normalizeBlocks(blocks: any[], parent = "block", depth = 0): StudioBlock[] {
  if (!Array.isArray(blocks) || depth >= MAX_BLOCK_DEPTH) return [];
  return blocks.filter(b => b && typeof b === "object").map((block, index) => {
    const id = block.id || `${parent}-${index}`;
    const children = normalizeBlocks(block.children, id, depth + 1);
    return { ...block, id, ...(children.length ? { children } : { children: undefined }) };
  });
}

export function findBlock(blocks: StudioBlock[], id: string): StudioBlock | undefined {
  for (const block of blocks || []) {
    if (block.id === id) return block;
    const child = findBlock(block.children || [], id);
    if (child) return child;
  }
}

export function mapBlock(blocks: StudioBlock[], id: string, fn: (block: StudioBlock) => StudioBlock): StudioBlock[] {
  return (blocks || []).map(block => block.id === id
    ? fn(block)
    : block.children?.length ? { ...block, children: mapBlock(block.children, id, fn) } : block);
}

export function removeBlock(blocks: StudioBlock[], id: string): StudioBlock[] {
  return (blocks || []).filter(block => block.id !== id).map(block => block.children?.length
    ? { ...block, children: removeBlock(block.children, id) } : block);
}

export function addChildBlock(blocks: StudioBlock[], parentId: string, child: StudioBlock): StudioBlock[] {
  return mapBlock(blocks, parentId, block => ({ ...block, children: [...(block.children || []), child] }));
}

/** Moves a block before a sibling at the same nesting level. */
export function moveBlockBefore(blocks: StudioBlock[], movingId: string, beforeId: string): StudioBlock[] {
  const from = blocks.findIndex(block => block.id === movingId), to = blocks.findIndex(block => block.id === beforeId);
  if (from >= 0 && to >= 0 && from !== to) {
    const next = [...blocks], [moving] = next.splice(from, 1);
    next.splice(from < to ? to - 1 : to, 0, moving); return next;
  }
  return blocks.map(block => block.children?.length
    ? { ...block, children: moveBlockBefore(block.children, movingId, beforeId) } : block);
}

export function freshBlockIds(block: StudioBlock): StudioBlock {
  return { ...clone(block), id: newId(), children: (block.children || []).map(freshBlockIds) };
}

/** Linked shared blocks inherit source content while keeping placement/layout overrides. */
export function resolveSharedBlocks(blocks: StudioBlock[], library: SharedBlock[] = [], depth = 0): StudioBlock[] {
  if (depth >= MAX_BLOCK_DEPTH) return [];
  return normalizeBlocks(blocks, "block", depth).map(block => {
    const source = block.sharedBlockId ? library.find(item => item.id === block.sharedBlockId)?.block : undefined;
    const merged = source ? { ...clone(source), ...block, id: block.id, sharedBlockId: block.sharedBlockId,
      children: block.children ?? source.children } : block;
    return { ...merged, children: resolveSharedBlocks(merged.children || [], library, depth + 1) };
  });
}

/** Immutable deep set: setPath(obj, "a.b.c", 1). `undefined` deletes the key. */
export function setPath<T extends Record<string, any>>(obj: T, path: string, value: any): T {
  const keys = path.split(".");
  const rec = (node: any, i: number): any => {
    const base = node && typeof node === "object" ? node : {};
    const k = keys[i];
    const next = { ...base };
    if (i === keys.length - 1) {
      if (value === undefined) delete next[k];
      else next[k] = value;
    } else {
      next[k] = rec(base[k], i + 1);
    }
    return next;
  };
  return rec(obj, 0);
}

export function getPath(obj: any, path: string, fallback?: any) {
  const v = path.split(".").reduce((n, k) => (n == null ? undefined : n[k]), obj);
  return v === undefined ? fallback : v;
}

/**
 * Merge stored design over defaults, and make sure the two legacy surfaces
 * (heroPage / storefront) carry a `sections` array. Idempotent.
 */
export function normalizeDesign(incoming: any, defaults: any = {}) {
  const inc = incoming || {};
  const merged = { ...defaults, ...inc };
  const normalized: any = {
    ...merged,
    heroPage: {
      sections: inc.heroPage?.sections || inc.heroPage?.homepageSections || inc.homepageSections || [],
      ...(inc.heroPage || {}),
    },
    storefront: {
      sections: inc.storefront?.sections || inc.storefront?.homepageSections || [],
      ...(inc.storefront || {}),
    },
  };
  const identify = (sections: any[]) => sections.map((section, index) => {
    const id = section.id || `legacy-section-${index}`;
    const settings = { ...(section.settings || {}) };
    for (const key of ["items", "slides", "blocks"]) {
      if (Array.isArray(settings[key])) settings[key] = normalizeBlocks(settings[key], `${id}-${key}`);
    }
    return { ...section, id, settings };
  });
  if (Array.isArray(normalized.globalSections)) normalized.globalSections = identify(normalized.globalSections);
  for (const key of Object.keys(normalized)) {
    if (Array.isArray(normalized[key]?.sections)) normalized[key] = { ...normalized[key], sections: identify(normalized[key].sections) };
  }
  return normalized;
}

export function targetKey(t: SectionTarget) {
  return t.kind === "global" ? "globalSections" : `${t.id}.sections`;
}

export function getSections(design: any, t: SectionTarget): Section[] {
  const list = getPath(design, targetKey(t));
  return Array.isArray(list) ? list : [];
}

export function setSections(design: any, t: SectionTarget, next: Section[]) {
  return setPath(design, targetKey(t), next);
}

export function makeSection(type: string, defaults: Record<string, any> = {}): Section {
  return { id: newId(), type, visible: true, settings: clone(defaults) };
}

export function insertSection(list: Section[], section: Section, index = list.length): Section[] {
  const i = Math.max(0, Math.min(list.length, index));
  return [...list.slice(0, i), section, ...list.slice(i)];
}

export function moveSection(list: Section[], from: number, to: number): Section[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item);
  return next;
}

export function duplicateSection(list: Section[], id: string): { list: Section[]; newId?: string } {
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return { list };
  const copy: Section = clone(list[i]);
  copy.id = newId();
  // Nested blocks need fresh ids too, or drag/sort keys collide.
  for (const key of Object.keys(copy.settings || {})) {
    const v = copy.settings[key];
    if (Array.isArray(v) && v.every((b) => b && typeof b === "object" && "id" in b)) {
      copy.settings[key] = v.map((b: any) => freshBlockIds(b));
    }
  }
  return { list: insertSection(list, copy, i + 1), newId: copy.id };
}

export const removeSection = (list: Section[], id: string) => list.filter((s) => s.id !== id);

export const toggleSection = (list: Section[], id: string) =>
  list.map((s) => (s.id === id ? { ...s, visible: s.visible === false } : s));

export const patchSectionSettings = (list: Section[], id: string, patch: Record<string, any>) =>
  list.map((s) => {
    if (s.id !== id) return s;
    const settings = { ...(s.settings || {}), ...patch };
    for (const k of Object.keys(patch)) if (patch[k] === undefined) delete settings[k];
    return { ...s, settings };
  });

/** Sets one field of one block inside a section (used by inline preview edits). */
export function patchBlockField(list: Section[], sectionId: string, blockId: string, key: string, value: any) {
  return list.map((s) => {
    if (s.id !== sectionId) return s;
    const settings = { ...(s.settings || {}) };
    for (const k of Object.keys(settings)) {
      const arr = settings[k];
      if (Array.isArray(arr) && findBlock(arr, blockId)) {
        settings[k] = mapBlock(arr, blockId, (b) => ({ ...b, [key]: value }));
      }
    }
    return { ...s, settings };
  });
}

// ── Undo / redo ────────────────────────────────────────────────────────────
export type History<T> = { past: T[]; present: T; future: T[] };
export const HISTORY_LIMIT = 100;

export const initHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [] });

export function commit<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] };
}
export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  const past = h.past.slice(0, -1);
  return { past, present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}
export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}

export const sameDesign = (a: any, b: any) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
