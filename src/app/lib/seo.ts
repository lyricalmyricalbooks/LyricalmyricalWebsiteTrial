import { useEffect, useSyncExternalStore } from "react";
import { getCopy } from "../features/site/storeCopy";

type SEO = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product" | "book";
  jsonLd?: Record<string, any>;
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

function clearJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

export function useSEO(seo: SEO) {
  const design = useSyncExternalStore(subscribe, getSiteDesign, getSiteDesign);
  useEffect(() => {
    const title = seo.title
      ? getCopy(design, "siteTitleFormat", { title: seo.title })
      : getCopy(design, "siteDefaultTitle");
    const description = seo.description || getCopy(design, "siteDefaultDescription");
    const image = seo.image || design?.shareImageUrl || "";
    const url = seo.url || (typeof window !== "undefined" ? window.location.href : "");
    const type = seo.type || "website";

    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:type"]', "content", type);
    if (url) setMeta('meta[property="og:url"]', "content", url);
    if (image) setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    if (image) setMeta('meta[name="twitter:image"]', "content", image);

    if (seo.jsonLd) {
      setJsonLd("seo-jsonld-page", seo.jsonLd);
    }

    return () => {
      clearJsonLd("seo-jsonld-page");
    };
  }, [design, seo.title, seo.description, seo.image, seo.url, seo.type, JSON.stringify(seo.jsonLd || {})]);
}
