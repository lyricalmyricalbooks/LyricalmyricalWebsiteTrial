// Pure, UI-free "Find anything" index for the Studio. It lists every Style control, every piece of
// shopper-facing text, the Menus panels, each page, the sections on each page and the main actions,
// and ranks them against what a (non-developer) shop owner types — "price colour", "footer words",
// "phone", "publish". Studio turns a chosen result into navigation (see StudioEditor `goToResult`).

import type { Section } from "./studioModel";
import { regionFieldDevice } from "../../features/site/storefrontRegions";

export type StudioTab = "sections" | "style" | "text" | "menus" | "pages";
export type StudioActionId =
  | "save" | "publish" | "discard" | "history" | "check" | "preview-tab" | "undo" | "redo"
  | "device-desktop" | "device-tablet" | "device-mobile" | "mode-toggle" | "autofit-page" | "add-section";

export type SearchTarget =
  | { type: "style"; groupId: string; key?: string }
  | { type: "copy"; group: string; key?: string }
  | { type: "tab"; tab: StudioTab }
  | { type: "menus"; panel: string }
  | { type: "template"; id: string }
  | { type: "section"; templateId: string; sectionId: string }
  | { type: "page"; slug: string }
  | { type: "action"; id: StudioActionId };

export type SearchKind = "action" | "page" | "section" | "style" | "text" | "menu" | "area";
export type SearchEntry = {
  id: string;
  kind: SearchKind;
  title: string;
  /** Where it lives, in the words used on screen: "Style › Product page". */
  where: string;
  /** Extra words that should find this entry but aren't shown. */
  keywords: string;
  target: SearchTarget;
};

export const KIND_LABEL: Record<SearchKind, string> = {
  action: "Action", page: "Page", section: "Section", style: "Style", text: "Text", menu: "Menu", area: "Area",
};

type StyleGroupLike = { id: string; title: string; hint?: string; fields: { key: string; label: string }[] };
type CopyGroupLike = { group: string; fields: { key: string; label: string; default?: string; hint?: string }[] };
type TemplateLike = { id: string; label: string; pageSlug?: string };

export type IndexInput = {
  styleGroups: StyleGroupLike[];
  copySchema: CopyGroupLike[];
  templates: TemplateLike[];
  pages: { slug?: string; title?: string; status?: string }[];
  /** Sections per template id; the global (header/footer) stack is under "__global". */
  sectionsByTemplate: Record<string, Section[]>;
  sectionLabel: (type: string) => string;
};

/** "pdpCardBg" → "pdp card bg", "Colour" → "color": the form both index and query are compared in. */
export function normalizeSearchText(text: string): string {
  return String(text || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._:/›·|-]+/g, " ")
    .toLowerCase()
    .replace(/colour/g, "color")
    .replace(/centre/g, "center")
    .replace(/[^a-z0-9£$€% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Owner-friendly alternates: any word on the left also matches the words on the right.
const SYNONYMS: Record<string, string[]> = {
  phone: ["mobile"], mobile: ["phone"], bg: ["background"], background: ["bg"],
  heading: ["title"], headline: ["title"], font: ["typeface", "typography"], typeface: ["font"],
  words: ["text", "label", "copy"], wording: ["text", "label", "copy"], text: ["words", "label"],
  cart: ["bag", "basket"], bag: ["cart"], basket: ["cart"], buy: ["add to bag", "cta"],
  save: ["draft"], live: ["publish"], undo: ["revert"], menu: ["nav", "navigation"], nav: ["menu"],
  link: ["links"], links: ["link"], image: ["photo", "picture"], photo: ["image"], picture: ["image"],
  pic: ["image"], shipping: ["delivery"], delivery: ["shipping"], search: ["find"], button: ["buttons", "cta"],
};

const staticEntry = (id: string, kind: SearchKind, title: string, where: string, keywords: string, target: SearchTarget): SearchEntry =>
  ({ id, kind, title, where, keywords: normalizeSearchText(keywords), target });

const ACTIONS: { id: StudioActionId; title: string; keywords: string }[] = [
  { id: "save", title: "Save draft", keywords: "keep store changes ctrl s" },
  { id: "publish", title: "Publish to the live shop", keywords: "go live release push shoppers" },
  { id: "discard", title: "Discard draft", keywords: "throw away reset revert to live" },
  { id: "history", title: "Version history", keywords: "restore previous older versions" },
  { id: "check", title: "Pre-publish check", keywords: "review accessibility problems warnings" },
  { id: "preview-tab", title: "Preview in new tab", keywords: "full screen window open" },
  { id: "undo", title: "Undo", keywords: "step back ctrl z" },
  { id: "redo", title: "Redo", keywords: "step forward" },
  { id: "device-desktop", title: "Desktop preview", keywords: "computer wide screen size" },
  { id: "device-tablet", title: "Tablet preview", keywords: "ipad medium size" },
  { id: "device-mobile", title: "Phone preview", keywords: "mobile small screen size" },
  { id: "mode-toggle", title: "Switch Edit / Browse mode", keywords: "click links navigate storefront" },
  { id: "autofit-page", title: "Auto-fit this page for phones", keywords: "responsive mobile layout generate stack small screen" },
  { id: "add-section", title: "Add a section", keywords: "new block library insert hero banner" },
];

const TABS: { tab: StudioTab; title: string; keywords: string }[] = [
  { tab: "sections", title: "Page layout", keywords: "page structure sections blocks homepage outline header footer announcement pop-overs shared global" },
  { tab: "style", title: "Style", keywords: "colors fonts spacing look design theme" },
  { tab: "text", title: "Text & labels", keywords: "words wording copy messages" },
  { tab: "menus", title: "Menus", keywords: "navigation header footer categories links" },
  { tab: "pages", title: "Pages", keywords: "about journal custom page content" },
];

const MENU_PANELS: { panel: string; title: string; keywords: string }[] = [
  { panel: "menus:categories", title: "Shop categories", keywords: "category bar sits under sub drop-down publications books zines" },
  { panel: "menus:header-order", title: "Header order (pages & categories)", keywords: "reorder navigation top bar" },
  { panel: "menus:links", title: "Header & footer links", keywords: "menu items mega menu social" },
];

/** Every searchable thing. Cheap enough to rebuild when the design changes (a few hundred rows). */
export function buildStudioIndex(input: IndexInput): SearchEntry[] {
  const out: SearchEntry[] = [];

  for (const a of ACTIONS) out.push(staticEntry(`action:${a.id}`, "action", a.title, "Studio", a.keywords, { type: "action", id: a.id }));
  for (const t of TABS) out.push(staticEntry(`tab:${t.tab}`, "area", t.title, "Studio", t.keywords, { type: "tab", tab: t.tab }));
  for (const m of MENU_PANELS) out.push(staticEntry(m.panel, "menu", m.title, "Menus", m.keywords, { type: "menus", panel: m.panel }));

  for (const t of input.templates) {
    out.push(staticEntry(`template:${t.id}`, "page", t.label, "Pages you can design", `edit sections ${t.pageSlug || ""}`, { type: "template", id: t.id }));
  }
  const seenSlug = new Set<string>();
  for (const p of input.pages) {
    if (!p.slug || seenSlug.has(p.slug)) continue;
    seenSlug.add(p.slug);
    out.push(staticEntry(`page:${p.slug}`, "page", p.title || p.slug, `Pages › ${p.status === "published" ? "Published" : "Draft"}`, `write edit content custom page ${p.slug}`, { type: "page", slug: p.slug }));
  }

  const nameOf = (id: string) => id === "__global" ? "Header / footer sections" : input.templates.find(t => t.id === id)?.label || id;
  for (const [templateId, list] of Object.entries(input.sectionsByTemplate)) {
    (list || []).forEach((s, i) => {
      const label = input.sectionLabel(s.type);
      const st = s.settings || {};
      const snippet = [st.title, st.heading, st.headline, st.text].find(v => typeof v === "string" && v.trim());
      out.push(staticEntry(`section:${s.id}`, "section", snippet ? `${label} — ${String(snippet).slice(0, 48)}` : label,
        `${nameOf(templateId)} › section ${i + 1}${s.visible === false ? " (hidden)" : ""}`, `${label} ${s.type}`, { type: "section", templateId, sectionId: s.id }));
    });
  }

  for (const g of input.styleGroups) {
    out.push(staticEntry(`style-group:${g.id}`, "style", g.title, "Style", `${g.hint || ""} all settings group`, { type: "style", groupId: g.id }));
    for (const f of g.fields) {
      // An element setting exists once per screen size; index it once (the desktop field) and let
      // "tablet"/"phone" match it — the element's controls follow the previewed size anyway.
      const region = f.key.startsWith("regions.");
      if (region && regionFieldDevice(f.key) !== "desktop") continue;
      out.push(staticEntry(`style:${g.id}:${f.key}`, "style", f.label, `Style › ${g.title}`, `${f.key} ${g.title}${region ? " tablet phone mobile" : ""}`, { type: "style", groupId: g.id, key: f.key }));
    }
  }

  for (const g of input.copySchema) {
    out.push(staticEntry(`copy-group:${g.group}`, "text", g.group, "Text & labels", "words wording group", { type: "copy", group: g.group }));
    for (const f of g.fields) {
      out.push(staticEntry(`copy:${f.key}`, "text", f.label, `Text & labels › ${g.group}`, `${f.key} ${f.default || ""} ${f.hint || ""}`, { type: "copy", group: g.group, key: f.key }));
    }
  }
  return out;
}

const KIND_ORDER: Record<SearchKind, number> = { action: 0, area: 1, page: 2, section: 3, menu: 4, style: 5, text: 6 };

const expand = (token: string): string[] => [token, ...(SYNONYMS[token] || []).map(normalizeSearchText)];

/** Score one query token against one entry (0 = no match). Title beats location beats hidden keywords. */
function tokenScore(entry: { t: string; w: string; k: string }, token: string): number {
  let best = 0;
  for (const alt of expand(token)) {
    const words = alt.split(" ");
    const hit = (hay: string) => words.every(w => hay.includes(w));
    if (hit(entry.t)) {
      const startsWord = entry.t.split(" ").some(w => w.startsWith(words[0]));
      best = Math.max(best, startsWord ? 4 : 3);
    } else if (hit(entry.w)) best = Math.max(best, 2);
    else if (hit(entry.k)) best = Math.max(best, 1);
  }
  return best;
}

export type SearchOptions = { limit?: number };

/**
 * Ranks the index for a query. Every typed word must match somewhere; titles that start with the
 * query rank first, then more title hits, then the area (actions before pages before settings).
 * An empty query returns the shortcuts worth showing before anyone types.
 */
export function searchStudio(index: SearchEntry[], query: string, { limit = 24 }: SearchOptions = {}): SearchEntry[] {
  const q = normalizeSearchText(query);
  if (!q) return index.filter(e => e.kind === "action" || e.kind === "area" || e.kind === "page").slice(0, limit);
  const tokens = q.split(" ");
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of index) {
    const prepared = { t: normalizeSearchText(e.title), w: normalizeSearchText(e.where), k: e.keywords };
    let score = 0, ok = true;
    for (const token of tokens) {
      const s = tokenScore(prepared, token);
      if (!s) { ok = false; break; }
      score += s;
    }
    if (!ok) continue;
    if (prepared.t === q) score += 12;
    else if (prepared.t.startsWith(q)) score += 6;
    else if (prepared.t.includes(q)) score += 3;
    scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score || KIND_ORDER[a.e.kind] - KIND_ORDER[b.e.kind] || a.e.title.localeCompare(b.e.title));
  return scored.slice(0, limit).map(s => s.e);
}
