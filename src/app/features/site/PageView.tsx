import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { adminApi } from "../../admin/api";
import { useSiteData } from "./useSiteData";
import { StorefrontThemeStyle } from "./StorefrontThemeStyle";
import { TemplateSections, GlobalSections } from "../../components/sectionRender";
import { CurrentPageContext, PageContentSection } from "../../components/SectionComponents";
import type { Page } from "./types";
import { policyPageFor } from "./policyPages";
import { getCopy } from "./storeCopy";
import { StorefrontPageHeader } from "./StorefrontPageHeader";


/**
 * The site-wide custom-page look (Studio › Style › Custom pages). Every "Page content" section
 * follows it unless switched to its own style, so all custom pages match. Values after `||`
 * are only first-run fallbacks.
 */
export function sitePageStyle(design: any, eyebrow: string): Record<string, any> {
  const d = design || {};
  return {
    showEyebrow: d.pageShowEyebrow !== false,
    eyebrow,
    titleSize: d.pageTitleSize || "md",
    titleUppercase: d.pageTitleUppercase !== false,
    bodySize: d.pageBodySize || "md",
    align: d.pageAlign || "left",
    maxWidth: d.pageWidth || "narrow",
    textColor: d.pageTextColor || undefined,
    headingColor: d.pageTitleColor || undefined,
  };
}

export function PageView() {
  const { slug } = useParams<{ slug: string }>();
  const { settings, books, pages, loading: siteLoading } = useSiteData();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Store policies (Settings › General) are served as synthetic pages at /page/policy-<key>.
  const policyPage = policyPageFor(slug, (settings as any)?.policies);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    adminApi
      .getPageBySlug(slug)
      .then((p) => {
        if (!p || p.status !== "published") {
          setNotFound(true);
        } else {
          setPage(p);
          // Set SEO metadata
          document.title = `${p.seoTitle || p.title} | Lyricalmyrical Books`;

          let metaDesc = document.querySelector('meta[name="description"]');
          if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
          }
          metaDesc.setAttribute('content', p.metaDescription || p.body?.substring(0, 160).replace(/[#*]/g, '') || "");
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    return () => {
      // Restore default title on unmount
      document.title = "Lyricalmyrical Books";
    };
  }, [slug]);

  useEffect(() => {
    // Announce ready for preview updates
    if (typeof window !== 'undefined' && window.location.search.includes('preview=true')) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    }
  }, []);

  // Theme resolution. Per-page section stacks live at design["page:<slug>"]
  // (written by the theme editor's per-page template pills); when absent, the
  // shared "Custom Pages" template (design.page.sections) renders as before.
  const rawDesign = (settings as any)?.design || {};
  const d = rawDesign.storefront && Object.keys(rawDesign.storefront).length > 0 ? rawDesign.storefront : rawDesign;
  const perPageSurface = slug ? rawDesign?.[`page:${slug}`] : undefined;
  const surfaceId = perPageSurface?.sections?.length ? `page:${slug}` : "page";
  // Once a "Page content" section is in the stack, it renders the title/text
  // (so it can be moved and styled in Studio) and the fixed body is skipped.
  const hasContentSection = (rawDesign?.[surfaceId]?.sections || []).some((s: any) => s?.type === "PageContentSection");
  const hidePageBody = !!perPageSurface?.hidePageBody || hasContentSection;
  // "theme" chrome renders the page in the storefront's colors/wordmark;
  // default "classic" keeps the original white editorial page.
  const themed = d?.pageChromeStyle === "theme";
  const pageStyle = sitePageStyle(d, getCopy(settings?.design, "pageEyebrow"));
  const themedBg = d?.backgroundColor || "#0a0910";
  const themedText = d?.textColor || "#f3f1ee";

  const isPolicySlug = /^policy-/.test(slug || "");
  if (loading || (isPolicySlug && siteLoading && !page)) {
    return (
      <div data-fm-store data-studio-target="pages|copy:Custom pages & 404" data-studio-label="Page" className="min-h-screen fm-page flex items-center justify-center">
        <StorefrontThemeStyle design={settings?.design} />
        <p className="text-white/40 text-[10px] tracking-[0.4em] uppercase animate-pulse">
          {getCopy(settings?.design, "pageLoading")}
        </p>
      </div>
    );
  }

  const shown = page || policyPage;
  if (!shown) {
    return (
      <div data-fm-store data-studio-target="copy:Custom pages & 404|pages" data-studio-label="Not-found page" className="min-h-screen fm-page text-white flex flex-col items-center justify-center gap-4">
        <StorefrontThemeStyle design={settings?.design} />
        <p className="text-7xl font-black text-white/30" data-theme-field="notFoundCode">{getCopy(settings?.design, "notFoundCode")}</p>
        <p className="text-white/60 font-medium">{getCopy(settings?.design, "notFoundTitle")}</p>
        <Link
          to="/"
          className="mt-4 flex items-center gap-2 text-xs font-bold tracking-widest text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          {getCopy(settings?.design, "notFoundBack")}
        </Link>
      </div>
    );
  }

  const isHistoryPage = /^(history|history-of-lm)$/.test(slug || "");
  const plainBody = shown.body?.replace(/<[^>]*>/g, "").trim() || "";
  const useHistoryCopy = isHistoryPage && (!plainBody || /^s+$/i.test(plainBody));
  const esc = (t: string) => t.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" } as any)[c]);
  const historyHtml = `<p>${esc(getCopy(settings?.design, "historyBody"))}</p><p>${esc(getCopy(settings?.design, "historySubtext"))}</p>`;

  return (
    <div
      data-fm-store data-studio-target="pages|style:customPages|copy:Custom pages & 404|style:colors" data-studio-label="Page"
      className={`min-h-screen flex flex-col ${themed ? "" : "bg-white text-neutral-900"}`}
      style={themed ? { backgroundColor: themedBg, color: themedText } : undefined}
    >
      <StorefrontThemeStyle design={settings?.design} />
      <StorefrontPageHeader design={settings?.design} pages={pages} books={books} />

      <CurrentPageContext.Provider value={{ title: shown.title, body: shown.body, pageStyle }}>
        <TemplateSections design={settings?.design} templateId={surfaceId} books={books} />
      </CurrentPageContext.Provider>

      {/* Content — the same "Page content" renderer Studio uses, with its
          default settings, so every custom page looks identical whether or
          not it has its own section stack. */}
      {!hidePageBody && (
        <main className="w-full flex-1">
          <CurrentPageContext.Provider value={{ title: shown.title, body: useHistoryCopy ? historyHtml : shown.body, pageStyle }}>
            <PageContentSection settings={{ showTitle: true, showBody: true }} enableAnimations />
          </CurrentPageContext.Provider>
        </main>
      )}

      <GlobalSections design={settings?.design} books={books} />

      <footer className="mt-auto px-8 py-8 text-center">
        <p className={`text-[10px] tracking-widest ${themed ? "opacity-40" : "text-neutral-300"}`}>
          {getCopy(settings?.design, "footerCopyright")}
        </p>
      </footer>
    </div>
  );
}

export default PageView;
