import { useEffect } from "react";

type SEO = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product" | "book";
  jsonLd?: Record<string, any>;
};

const DEFAULT_TITLE = "Lyricalmyrical Books — Independent Publishing House";
const DEFAULT_DESC =
  "Lyricalmyrical Books is an independent publishing house based in Toronto, specializing in photography and art books.";

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
  useEffect(() => {
    const title = seo.title ? `${seo.title} — Lyricalmyrical Books` : DEFAULT_TITLE;
    const description = seo.description || DEFAULT_DESC;
    const image = seo.image || "";
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
  }, [seo.title, seo.description, seo.image, seo.url, seo.type, JSON.stringify(seo.jsonLd || {})]);
}
