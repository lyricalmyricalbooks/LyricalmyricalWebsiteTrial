import { useLocation } from "react-router";
import { resolveSurfaceDesign } from "./surfaceDesign";
import { useEffect, useState } from "react";
import { adminApi } from "../../admin/api";
import { DEFAULT_BOOKS, DEFAULT_SETTINGS, SITE_CACHE_KEY } from "./constants";
import type { Book, SiteSettings, Page } from "./types";
import { RISO_NOIR_TOKENS, withRisoNoirDefault } from "./risoNoir";

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
  const location = useLocation();
  const cached = typeof window !== "undefined" ? readCache() : null;
  const [books, setBooks] = useState<Book[]>(cached?.books || DEFAULT_BOOKS);
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const base = cached?.settings || DEFAULT_SETTINGS;
    const preview = new URLSearchParams(window.location.search).get("preview") === "true" ? (window as any).__studioPreviewDesign : null;
    return preview ? { ...base, design: preview } : base;
  });
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
        
        // Never let the late Firestore load overwrite what the Studio has already sent.
        if (isPreview) {
          safeSettings.design = (window as any).__studioPreviewDesign || safeSettings.draftDesign || safeSettings.design;
        }

        // Scheduled publishing: once the scheduled time passes, shoppers see
        // the scheduled design (preview keeps showing the editor's draft).
        const sched = safeSettings.scheduledPublish;
        if (!isPreview && sched?.at && sched?.design && new Date(sched.at).getTime() <= Date.now()) {
          safeSettings.design = sched.design;
        }

        const safePages = Array.isArray(pagesResponse) ? (pagesResponse as Page[]) : [];

        setBooks(safeBooks);
        setSettings(safeSettings);
        setPages(safePages);
        if (!isPreview) writeCache({
          books: safeBooks, 
          settings: safeSettings, 
          pages: safePages,
          cachedAt: new Date().toISOString() 
        });

        const sessionKey = `fm_visit_${new Date().toISOString().split("T")[0]}`;
        if (!isPreview && !sessionStorage.getItem(sessionKey)) {
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

    // Live Preview Listener
    const handleMessage = (event: MessageEvent) => {
      // BroadcastChannel events have an empty origin; only enforce the origin
      // check for window postMessage events.
      if (new URLSearchParams(window.location.search).get("preview") !== "true") return;
      if (event.origin && (event.origin !== window.location.origin || (window.parent !== window && event.source !== window.parent))) return;
      if (!event.data) return;

      if (event.data.type === "STUDIO_PREVIEW_STATE") {
        const preview = event.data;
        if (preview.design && typeof preview.design === "object") {
          (window as any).__studioPreviewDesign = preview.design;
          setSettings((prev) => ({ ...prev, ...(preview.settings || {}), design: preview.design }));
        }
        if (Array.isArray(preview.books)) setBooks(preview.books);
        if (Array.isArray(preview.pages)) setPages(preview.pages);
      } else if (event.data.type === "THEME_UPDATE" && event.data.design && typeof event.data.design === "object") {
        (window as any).__studioPreviewDesign = event.data.design;
        setSettings((prev) => ({
          ...prev,
          design: event.data.design
        }));
      }

      if (event.data.type === "BOOK_PREVIEW_UPDATE" && event.data.book) {
        setBooks((prev) => {
          const updatedBook = event.data.book;
          const index = prev.findIndex(b => b.id === updatedBook.id);
          if (index !== -1) {
            const newBooks = [...prev];
            newBooks[index] = { ...newBooks[index], ...updatedBook };
            return newBooks;
          } else {
            return [updatedBook, ...prev];
          }
        });
      }

      if (event.data.type === "PAGE_PREVIEW_UPDATE" && event.data.page) {
        setPages((prev) => {
          const updatedPage = event.data.page;
          const index = prev.findIndex(p => p.id === updatedPage.id);
          if (index !== -1) {
            const newPages = [...prev];
            newPages[index] = { ...newPages[index], ...updatedPage };
            return newPages;
          } else {
            return [updatedPage, ...prev];
          }
        });
      }
    };

    window.addEventListener("message", handleMessage);

    // BroadcastChannel for cross-tab updates
    const bc = new BroadcastChannel("site_preview_updates");
    bc.onmessage = (event) => {
      handleMessage(event);
    };

    return () => {
      cancelled = true;
      window.removeEventListener("message", handleMessage);
      bc.close();
    };
  }, []);

  return { books, settings: { ...settings, design: resolveSurfaceDesign(settings.design, location.pathname) }, pages, loading };
}

/**
 * Design for chrome that renders outside the site-data pipeline (boot splash, cookie banner).
 * Reads the session cache written by useSiteData — no extra Firestore reads — and falls back
 * to the Riso Noir defaults on a first-ever visit.
 */
export function readCachedDesign(): Record<string, any> {
  const design = readCache()?.settings?.design as Record<string, any> | undefined;
  const base = design && typeof design === "object" ? design : RISO_NOIR_TOKENS;
  return withRisoNoirDefault(base) || RISO_NOIR_TOKENS;
}
