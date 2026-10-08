import { useLocation } from "react-router";
import { consentAllows, CONSENT_EVENT } from "../../lib/consent";
import { isLiveBook } from "./liveBook";
import { resolveSurfaceDesign } from "./surfaceDesign";
import { dueScheduledDesign } from "./scheduledDesign.mjs";
import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../admin/api";
import { funnelApi } from "../../lib/commerce";
import { DEFAULT_SETTINGS } from "./constants";
import { readSiteCache, writeSiteCache, SITE_CACHE_EVENT } from "./siteCache";
import type { Book, SiteSettings, Page } from "./types";
import { RISO_NOIR_TOKENS, withRisoNoirDefault } from "./risoNoir";
import { setSiteIdentity } from "../../lib/seo";
import { applyCustomCode } from "./customCode";
import { applyBackorderPolicy } from "./backorder";
import { resolveProductRoutes } from "./productRoutes";
import { loadCatalog, newestFirst } from "./loadCatalog";

const isPreviewUrl = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "true";

/**
 * Latest Studio snapshot (preview only). Kept on window so components that mount later (cart drawer,
 * product page after navigation) start from the unsaved state, and so the late Firestore load never
 * overwrites what Studio sent.
 */
type PreviewSnapshot = { settings?: any; books?: Book[]; pages?: Page[] };
const previewSnapshot = (): PreviewSnapshot | null => (isPreviewUrl() ? (window as any).__studioPreviewState || null : null);

// One bootstrap request for the whole storefront, including route changes and
// StrictMode remounts. This is display data only; checkout still validates on the server.
const SITE_DATA_FRESH_MS = 30_000;
let siteDataRequest: Promise<[any[], any, any]> | null = null;
let siteDataLoadedAt = 0;
function loadSiteData() {
  if (!siteDataRequest || Date.now() - siteDataLoadedAt >= SITE_DATA_FRESH_MS) {
    // Infinity marks an in-flight request, which every consumer should join.
    siteDataLoadedAt = Infinity;
    siteDataRequest = Promise.all([
      loadCatalog((size, cursor) => adminApi.getStorefrontBooks(size, cursor)).then(newestFirst),
      adminApi.getSettings(),
      adminApi.getPublishedPages(),
    ]).then(result => {
      siteDataLoadedAt = Date.now();
      return result;
    }, error => {
      siteDataRequest = null;
      siteDataLoadedAt = 0;
      throw error;
    });
  }
  return siteDataRequest;
}

export function useSiteData() {
  const location = useLocation();
  const [cached] = useState(() => typeof window !== "undefined" ? readSiteCache() : null);
  const snap = previewSnapshot();
  const [books, setBooks] = useState<Book[]>(snap?.books || cached?.books || []);
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const base = { ...(cached?.settings || DEFAULT_SETTINGS), ...(snap?.settings || {}) };
    const preview = isPreviewUrl() ? (window as any).__studioPreviewDesign : null;
    return preview ? { ...base, design: preview } : base;
  });
  const [pages, setPages] = useState<Page[]>(snap?.pages || cached?.pages || []);
  const [loading, setLoading] = useState(!cached && !snap);
  // True once this mount's own load has finished (cached content may be shown before that).
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [bookResponse, settingsResponse, pagesResponse] = await loadSiteData();

        if (cancelled) return;

        const safeBooks = Array.isArray(bookResponse) ? (bookResponse as unknown as Book[]) : [];
        const isPreview = typeof window !== 'undefined' && window.location.search.includes('preview=true');
        const safeSettings = { ...(settingsResponse || DEFAULT_SETTINGS) } as any;
        
        // Never let the late Firestore load overwrite what the Studio has already sent.
        if (isPreview) {
          safeSettings.design = (window as any).__studioPreviewDesign || safeSettings.draftDesign || safeSettings.design;
        }

        // Scheduled publishing: once the scheduled time passes, shoppers see
        // the scheduled design (preview keeps showing the editor's draft).
        const scheduled = isPreview ? null : dueScheduledDesign(safeSettings);
        if (scheduled) safeSettings.design = scheduled;

        const safePages = Array.isArray(pagesResponse) ? (pagesResponse as Page[]) : [];

        // Preview: whatever Studio already sent (all books, unsaved page edits, settings) wins.
        const snapNow = previewSnapshot();
        setBooks(snapNow?.books || safeBooks);
        setSettings(snapNow?.settings ? { ...safeSettings, ...snapNow.settings, design: safeSettings.design } : safeSettings);
        setPages(snapNow?.pages || safePages);
        if (!isPreview) writeSiteCache({
          books: safeBooks, 
          settings: safeSettings, 
          pages: safePages,
          cachedAt: new Date().toISOString() 
        });

        const sessionKey = `fm_visit_${new Date().toISOString().split("T")[0]}`;
        if (!isPreview && consentAllows("analytics") && !sessionStorage.getItem(sessionKey)) {
          adminApi.recordVisit();
          // Where the session came from and on what kind of screen (its own best-effort write).
          funnelApi.trackSession();
          sessionStorage.setItem(sessionKey, "true");
        }
      } catch {
        if (cancelled) return;
        console.warn("Using fallback data - backend connection unavailable.");
      } finally {
        if (!cancelled) { setLoading(false); setFresh(true); }
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
        (window as any).__studioPreviewState = {
          settings: preview.settings,
          books: Array.isArray(preview.books) ? preview.books : undefined,
          pages: Array.isArray(preview.pages) ? preview.pages : undefined,
        };
        if (preview.design && typeof preview.design === "object") {
          (window as any).__studioPreviewDesign = preview.design;
          setSettings((prev) => ({ ...prev, ...(preview.settings || {}), design: preview.design }));
        }
        if (Array.isArray(preview.books)) setBooks(preview.books);
        if (Array.isArray(preview.pages)) setPages(preview.pages);
        setLoading(false);
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

  // Site name / default title / share image (Studio › Text & labels › Site & sharing) feed every page's <head>.
  useEffect(() => { setSiteIdentity(settings.design); }, [settings.design]);
  // Studio › Style › Custom code (public pages only; see customCode.ts).
  // Custom snippets are usually trackers: they wait for the shopper's analytics choice
  // and are re-applied the moment that choice changes.
  const [consentVersion, setConsentVersion] = useState(0);
  useEffect(() => {
    const bump = () => setConsentVersion(v => v + 1);
    window.addEventListener(CONSENT_EVENT, bump);
    return () => window.removeEventListener(CONSENT_EVENT, bump);
  }, []);
  useEffect(() => {
    applyCustomCode(consentAllows("analytics") ? settings.design : null, location.pathname);
  }, [settings.design, location.pathname, consentVersion]);

  // Shoppers only ever see live books. Drafts/scheduled books show only inside a real
  // Studio preview (the editor's snapshot is present) — "?preview=true" alone isn't enough.
  const studioPreview = isPreviewUrl() && Boolean((window as any).__studioPreviewState);
  const sellableBooks = useMemo(() => {
    const now = new Date().toISOString();
    const visible = studioPreview ? books : books.filter(book => isLiveBook(book as any, now));
    return resolveProductRoutes(visible).map(applyBackorderPolicy);
  }, [books, studioPreview]);

  return { books: sellableBooks, settings: { ...settings, design: resolveSurfaceDesign(settings.design, location.pathname) }, pages, loading, fresh };
}

/**
 * Design for chrome that renders outside the site-data pipeline (boot splash, cookie banner).
 * Reads the session cache written by useSiteData — no extra Firestore reads — and falls back
 * to the Riso Noir defaults on a first-ever visit.
 */
export function readCachedDesign(): Record<string, any> {
  const previewDesign = isPreviewUrl() ? (window as any).__studioPreviewDesign : null;
  const design = (previewDesign || readSiteCache()?.settings?.design) as Record<string, any> | undefined;
  const base = design && typeof design === "object" ? design : RISO_NOIR_TOKENS;
  return withRisoNoirDefault(base) || RISO_NOIR_TOKENS;
}

/**
 * readCachedDesign() that also follows Studio's unsaved design while previewing (cookie banner,
 * boot splash). Outside preview it is the cached published design, exactly as before.
 */
export function useLiveDesign(): Record<string, any> {
  const [design, setDesign] = useState<Record<string, any>>(() => readCachedDesign());
  // Live site: follow fresh settings as soon as they load (a first visit has no cache
  // yet, and a stale one could keep the under-construction wall up after it's switched off).
  useEffect(() => {
    if (isPreviewUrl()) return;
    const refresh = () => setDesign(readCachedDesign());
    window.addEventListener(SITE_CACHE_EVENT, refresh);
    return () => window.removeEventListener(SITE_CACHE_EVENT, refresh);
  }, []);
  useEffect(() => {
    if (!isPreviewUrl()) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || (window.parent !== window && event.source !== window.parent)) return;
      const d = event.data;
      if ((d?.type === "STUDIO_PREVIEW_STATE" || d?.type === "THEME_UPDATE") && d.design && typeof d.design === "object") {
        setDesign(withRisoNoirDefault(d.design) || d.design);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return design;
}
