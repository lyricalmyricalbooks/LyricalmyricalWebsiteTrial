import { useLocation } from "react-router";
import { useEffect, useSyncExternalStore } from "react";
import { getCopy } from "../features/site/storeCopy";

import { canonicalUrl } from "./bookSeo";

type SEO = {
  exactTitle?: boolean;
  noindex?: boolean;
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product" | "book";
  /** One schema object, or several emitted together as one @graph. */
  jsonLd?: Record<string, any> | Record<string, any>[];
};

// Site identity (name, default title/description, share image) is edited in Studio
// (Text & labels › Site & sharing, Style › Logo & wordmark › Share image). useSiteData
// publishes the loaded design here so every page's tags follow it.
let siteDesign: any = null;
const listeners = new Set<() => void>();
export function setSiteIdentity(design: any) {
  if (design === siteDesign) return;
  siteDesign = design;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSiteDesign = () => siteDesign;

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    const [, key] = selector.match(/\[(name|property)="([^"]+)"\]/) ?? [];
    if (selector.includes("name=")) {
      el.setAttribute("name", selector.match(/name="([^"]+)"/)![1]);
    } else if (selector.includes("property=")) {
      el.setAttribute("property", selector.match(/property="([^"]+)"/)![1]);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setJsonLd(id: string, data: Record<string, any>) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Several schema objects share the one page script (the prerenderer keeps only that id). */
export function jsonLdDocument(data: Record<string, any> | Record<string, any>[]): Record<string, any> {
  if (!Array.isArray(data)) return data;
  const items = data.filter(Boolean);
  if (items.length === 1) return items[0];
  return { "@context": "https://schema.org", "@graph": items.map(({ "@context": _context, ...rest }) => rest) };
}

function clearJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

export function useSEO(seo: SEO) {
  const location = useLocation();
  const design = useSyncExternalStore(subscribe, getSiteDesign, getSiteDesign);
  useEffect(() => {
    const title = seo.title
      ? (seo.exactTitle ? seo.title : getCopy(design, "siteTitleFormat", { title: seo.title }))
      : getCopy(design, "siteDefaultTitle");
    const description = seo.description || getCopy(design, "siteDefaultDescription");
    const rawImage = seo.image || design?.shareImageUrl || "";
    const image = rawImage ? new URL(rawImage, window.location.href).href : "";
    const url = canonicalUrl(seo.url || window.location.href);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;
    const preview = new URLSearchParams(location.search).get("preview") === "true";
    setMeta('meta[name="robots"]', "content", seo.noindex || preview || /^\/(admin|checkout|account|wishlist|cart|track)(\/|$)/.test(location.pathname) ? "noindex, follow" : "index, follow");
    const type = seo.type || "website";

    const verification = getCopy(design, "googleSiteVerification").trim();
    if (verification) setMeta('meta[name="google-site-verification"]', "content", verification);
    else document.head.querySelector('meta[name="google-site-verification"]')?.remove();
    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:type"]', "content", type);
    if (url) setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[property="og:site_name"]', "content", getCopy(design, "siteName"));
    setMeta('meta[name="author"]', "content", getCopy(design, "siteName"));
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]', "content", image);

    if (seo.jsonLd) {
      setJsonLd("seo-jsonld-page", jsonLdDocument(seo.jsonLd));
    }

    return () => {
      clearJsonLd("seo-jsonld-page");
    };
  }, [location.pathname, location.search, design, seo.title, seo.exactTitle, seo.noindex, seo.description, seo.image, seo.url, seo.type, JSON.stringify(seo.jsonLd || {})]);
}
