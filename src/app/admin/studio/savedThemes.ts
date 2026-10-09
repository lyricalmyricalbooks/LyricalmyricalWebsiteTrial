// "My themes": complete copies of the design (style, text, menus AND sections) that the merchant
// saved from Studio, each stored as its own admin-only `savedThemes/{id}` document (admin/themeStore.ts). Applying one replaces the
// working draft (undoable) — nothing goes live until Publish.

export type SavedTheme = { id: string; name: string; savedAt: string; design: any };

export const MAX_SAVED_THEMES = 10;

export function addSavedTheme(list: SavedTheme[] | undefined, name: string, design: any, now = new Date()): SavedTheme[] {
  const clean = name.trim().slice(0, 60) || "Untitled theme";
  const entry: SavedTheme = {
    id: `theme_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: clean,
    savedAt: now.toISOString(),
    // JSON round-trip drops undefined (Firestore rejects it) and detaches from live state.
    design: JSON.parse(JSON.stringify(design ?? {})),
  };
  // same name replaces the older copy instead of piling up
  const rest = (list || []).filter((t) => t.name.toLowerCase() !== clean.toLowerCase());
  return [entry, ...rest].slice(0, MAX_SAVED_THEMES);
}

export const removeSavedTheme = (list: SavedTheme[] | undefined, id: string) => (list || []).filter((t) => t.id !== id);

const clone = (v: any) => JSON.parse(JSON.stringify(v ?? {}));

export function renameSavedTheme(list: SavedTheme[] | undefined, id: string, name: string): SavedTheme[] {
  const clean = name.trim().slice(0, 60);
  if (!clean) return list || [];
  // renaming onto another theme's name would make two identical names; the other one is replaced
  return (list || [])
    .filter((t) => t.id === id || t.name.toLowerCase() !== clean.toLowerCase())
    .map((t) => (t.id === id ? { ...t, name: clean } : t));
}

export function duplicateSavedTheme(list: SavedTheme[] | undefined, id: string, now = new Date()): SavedTheme[] {
  const src = (list || []).find((t) => t.id === id);
  if (!src) return list || [];
  const names = new Set((list || []).map((t) => t.name.toLowerCase()));
  let name = `${src.name.slice(0, 50)} copy`;
  for (let n = 2; names.has(name.toLowerCase()); n++) name = `${src.name.slice(0, 48)} copy ${n}`;
  return addSavedTheme(list, name, src.design, now);
}

const FILE_KIND = "lyricalmyrical-theme";

export const themeFileName = (t: Pick<SavedTheme, "name">) =>
  `${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "theme"}.theme.json`;

export const serializeThemeFile = (t: Pick<SavedTheme, "name" | "design">, now = new Date()) =>
  JSON.stringify({ kind: FILE_KIND, version: 1, name: t.name, exportedAt: now.toISOString(), design: clone(t.design) }, null, 2);

/** Reads a downloaded theme file. Returns an error string instead of throwing so the UI can show it. */
export function parseThemeFile(text: string): { name: string; design: any } | { error: string } {
  let raw: any;
  try { raw = JSON.parse(text); } catch { return { error: "That file isn't valid JSON." }; }
  const design = raw && raw.kind === FILE_KIND ? raw.design : raw?.design ?? null;
  if (!design || typeof design !== "object" || Array.isArray(design)) return { error: "That file isn't a Lyricalmyrical theme export." };
  return { name: String(raw.name || "Imported theme").slice(0, 60), design };
}
