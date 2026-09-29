// Pure, UI-free helpers for the Studio theme editor. Everything the editor does
// to a `design` object goes through here so it can be unit-tested and so the
// editor never mutates state in place.

export type Section = { id: string; type: string; visible?: boolean; settings: Record<string, any> };

/** Where a list of sections lives inside `design`. */
export type SectionTarget = { kind: "template"; id: string } | { kind: "global" };

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? null));

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
  const { heroPage: _h, storefront: _s, ...surfaceBase } = merged;
  return {
    ...merged,
    heroPage: {
      ...surfaceBase,
      sections: inc.heroPage?.sections || inc.heroPage?.homepageSections || inc.homepageSections || [],
      ...(inc.heroPage || {}),
    },
    storefront: {
      ...surfaceBase,
      sections: inc.storefront?.sections || inc.storefront?.homepageSections || [],
      ...(inc.storefront || {}),
    },
  };
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
      copy.settings[key] = v.map((b: any) => ({ ...b, id: newId() }));
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
      if (Array.isArray(arr) && arr.some((b) => b && b.id === blockId)) {
        settings[k] = arr.map((b: any) => (b.id === blockId ? { ...b, [key]: value } : b));
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
