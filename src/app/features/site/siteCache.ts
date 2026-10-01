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
    return cached ? JSON.parse(cached) as SiteCachePayload : null;
  } catch {
    return null;
  }
}

export function writeSiteCache(payload: SiteCachePayload) {
  try {
    sessionStorage.setItem(SITE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota and private-mode errors; Firestore remains the fallback.
  }
}
