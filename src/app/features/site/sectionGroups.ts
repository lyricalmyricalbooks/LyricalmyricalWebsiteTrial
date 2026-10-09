// Section groups (Studio 2.2): stacks of sections that appear on every page, edited in Studio ›
// Page layout like a page's own sections. Each group is a root design key so nothing older moves:
// `globalSections` (above the footer) is the group shops already have.
//
// Also the announcement-bar messages and the pop-up rules, kept pure so the storefront, Studio and
// tests share one reading of them.

export type SectionGroupKey = "headerSections" | "globalSections" | "overlaySections";

export const SECTION_GROUPS: { key: SectionGroupKey; label: string; hint: string }[] = [
  { key: "headerSections", label: "Under the header", hint: "Shown on every page, right below the header (e.g. a promo strip)." },
  { key: "globalSections", label: "Above the footer", hint: "Shown on every page, just above the footer." },
  { key: "overlaySections", label: "Pop-up", hint: "Shown on every page in a pop-up shoppers can close (e.g. a newsletter offer)." },
];

export const SECTION_GROUP_KEYS = SECTION_GROUPS.map(g => g.key);

export const isGroupSurface = (surface: string): surface is SectionGroupKey =>
  (SECTION_GROUP_KEYS as string[]).includes(surface);

export const groupLabel = (key: string) => SECTION_GROUPS.find(g => g.key === key)?.label || key;

/** The visible sections of a group. */
export function groupSections(design: any, key: SectionGroupKey): any[] {
  const list = design?.[key];
  return Array.isArray(list) ? list.filter((s: any) => s && s.visible !== false) : [];
}

// ── Announcement bar ───────────────────────────────────────────────────────────────────────────
export type Announcement = { id: string; text: string; link?: string; from?: string; until?: string };

/** "YYYY-MM-DD" in the shop's calendar (Toronto), matching how discounts and releases count days. */
export function shopDay(now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * The messages the bar shows today. With a message list (Studio › Header & announcement bar ›
 * Announcement messages) only the ones inside their show-from / show-until days count; without a
 * list, the single Announcement text is used, as before.
 */
export function activeAnnouncements(design: any, now = new Date()): { text: string; link?: string }[] {
  const list: Announcement[] = Array.isArray(design?.announcements) ? design.announcements : [];
  if (!list.length) {
    const text = typeof design?.announcementText === "string" ? design.announcementText : "";
    return text.trim() ? [{ text }] : [];
  }
  const day = shopDay(now);
  return list
    .filter(a => a && typeof a.text === "string" && a.text.trim())
    .filter(a => (!a.from || a.from <= day) && (!a.until || a.until >= day))
    .map(a => ({ text: a.text, ...(a.link ? { link: a.link } : {}) }));
}

// ── Pop-up group ───────────────────────────────────────────────────────────────────────────────
export type PopupFrequency = "session" | "once" | "always";
export const POPUP_SEEN_KEY = "lm:popup-seen";
/** Session flag the HTML prerender sets, so no pop-up is frozen into the crawlable page snapshots. */
export const POPUP_SUPPRESS_KEY = "lm:popup-suppressed";

/** Whether the pop-up may open, given how often it should show and what this browser remembers. */
export function popupAllowed(frequency: PopupFrequency | undefined, seen: { session?: boolean; ever?: boolean }): boolean {
  if (frequency === "always") return true;
  if (frequency === "once") return !seen.ever;
  return !seen.session;
}

/** A stable fingerprint of the pop-up's sections, so editing them shows it again to returning shoppers. */
export function popupVersion(sections: any[]): string {
  const text = JSON.stringify(sections.map(s => [s.id, s.type, s.settings]));
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return String(h >>> 0);
}
