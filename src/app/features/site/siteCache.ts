import { SITE_CACHE_KEY } from "./constants";
import type { Book, Page, SiteSettings } from "./types";

export type SiteCachePayload = {
  books: Book[];
  settings: SiteSettings;
  pages: Page[];
  cachedAt: string;
};

export function readSiteCache(): SiteCachePayload | null {
  try {
    const cached = sessionStorage.getItem(SITE_CACHE_KEY);
    if (!cached) return null;

    const parsed: unknown = JSON.parse(cached);
    // This cache survives client-side navigation and may have been written by
    // an older release. Never allow a stale or partially-written snapshot to
    // become authoritative component state: product and checkout pages both
    // iterate these collections during their first render.
    if (!parsed || typeof parsed !== "object") return null;
    const payload = parsed as Partial<SiteCachePayload>;
    if (!Array.isArray(payload.books) || !Array.isArray(payload.pages)) return null;
    if (!payload.settings || typeof payload.settings !== "object" || Array.isArray(payload.settings)) return null;

    return payload as SiteCachePayload;
  } catch {
    return null;
  }
}

export const SITE_CACHE_EVENT = "fm:site-cache-updated";

export function writeSiteCache(payload: SiteCachePayload) {
  try {
    sessionStorage.setItem(SITE_CACHE_KEY, JSON.stringify(payload));
    // Chrome outside the data pipeline (under-construction wall, cookie banner) refreshes from this.
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SITE_CACHE_EVENT));
  } catch {
    // Ignore quota and private-mode errors; Firestore remains the fallback.
  }
}
