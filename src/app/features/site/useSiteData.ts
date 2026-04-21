import { useEffect, useState } from "react";
import { adminApi } from "../../admin/api";
import { DEFAULT_BOOKS, DEFAULT_SETTINGS, SITE_CACHE_KEY } from "./constants";
import type { Book, SiteSettings, Page } from "./types";

type CachePayload = {
  books: Book[];
  settings: SiteSettings;
  pages: Page[];
  cachedAt: string;
};

function readCache(): CachePayload | null {
  try {
    const cached = sessionStorage.getItem(SITE_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached) as CachePayload;
  } catch {
    return null;
  }
}

function writeCache(payload: CachePayload) {
  try {
    sessionStorage.setItem(SITE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota and private-mode errors
  }
}

export function useSiteData() {
  const cached = typeof window !== "undefined" ? readCache() : null;
  const [books, setBooks] = useState<Book[]>(cached?.books || DEFAULT_BOOKS);
  const [settings, setSettings] = useState<SiteSettings>(cached?.settings || DEFAULT_SETTINGS);
  const [pages, setPages] = useState<Page[]>(cached?.pages || []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [bookResponse, settingsResponse, pagesResponse] = await Promise.all([
          adminApi.getBooks(12),
          adminApi.getSettings(),
          adminApi.getPublishedPages(),
        ]);

        if (cancelled) return;

        const safeBooks = Array.isArray(bookResponse) ? (bookResponse as unknown as Book[]) : DEFAULT_BOOKS;
        const isPreview = typeof window !== 'undefined' && window.location.search.includes('preview=true');
        const safeSettings = (settingsResponse || DEFAULT_SETTINGS) as any;
        
        if (isPreview && safeSettings.draftDesign) {
          safeSettings.design = safeSettings.draftDesign;
        }

        const safePages = Array.isArray(pagesResponse) ? (pagesResponse as Page[]) : [];

        setBooks(safeBooks);
        setSettings(safeSettings);
        setPages(safePages);
        writeCache({ 
          books: safeBooks, 
          settings: safeSettings, 
          pages: safePages,
          cachedAt: new Date().toISOString() 
        });

        const sessionKey = `fm_visit_${new Date().toISOString().split("T")[0]}`;
        if (!sessionStorage.getItem(sessionKey)) {
          adminApi.recordVisit();
          sessionStorage.setItem(sessionKey, "true");
        }
      } catch {
        if (cancelled) return;
        console.warn("Using fallback data - backend connection unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  return { books, settings, pages, loading };
}
