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

    // Live Preview Listener
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data) return;

      if (event.data.type === "THEME_UPDATE") {
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

  return { books, settings, pages, loading };
}
