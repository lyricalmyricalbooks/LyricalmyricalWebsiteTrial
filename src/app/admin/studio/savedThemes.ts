// "My themes": complete copies of the design (style, text, menus AND sections) that the merchant
// saved from Studio, stored on the settings doc as `savedThemes`. Applying one replaces the
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
