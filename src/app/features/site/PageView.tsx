import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { adminApi } from "../../admin/api";
import { useSiteData } from "./useSiteData";
import { StorefrontThemeStyle } from "./StorefrontThemeStyle";
import { TemplateSections, GlobalSections } from "../../components/sectionRender";
import { CurrentPageContext } from "../../components/SectionComponents";
import type { Page } from "./types";
import { policyPageFor } from "./policyPages";
import { getCopy } from "./storeCopy";
import { StorefrontPageHeader } from "./StorefrontPageHeader";


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

  return (
    <div
      data-fm-store data-studio-target="pages|copy:Custom pages & 404|style:colors" data-studio-label="Page"
      className={`min-h-screen flex flex-col ${themed ? "" : "bg-white"}`}
      style={themed ? { backgroundColor: themedBg, color: themedText } : undefined}
    >
      <StorefrontThemeStyle design={settings?.design} />
      <StorefrontPageHeader design={settings?.design} pages={pages} books={books} />

      <CurrentPageContext.Provider value={{ title: shown.title, body: shown.body }}>
        <TemplateSections design={settings?.design} templateId={surfaceId} books={books} />
      </CurrentPageContext.Provider>

      {/* Content */}
      {!hidePageBody && (
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl mx-auto px-6 py-14 md:py-20 flex-1"
      >
        <p className={`text-[10px] font-bold tracking-[0.3em] uppercase mb-4 ${themed ? "opacity-50" : "text-neutral-400"}`}>
          {getCopy(settings?.design, "pageEyebrow")}
        </p>
        <h1 className={`text-4xl md:text-5xl font-black tracking-tight mb-10 md:mb-14 ${themed ? "" : "text-neutral-900"}`}>
          {shown.title}
        </h1>

        {useHistoryCopy ? (
          <div className="max-w-2xl">
            <p className={`text-lg md:text-xl leading-[1.8] ${themed ? "opacity-90" : "text-neutral-800"}`}>
              {getCopy(settings?.design, "historyBody")}
            </p>
            <p className={`mt-10 max-w-xl text-sm leading-7 ${themed ? "opacity-55" : "text-neutral-500"}`}>
              {getCopy(settings?.design, "historySubtext")}
            </p>
          </div>
        ) : (
        <div
          className={
            themed
              ? `prose prose-invert max-w-none leading-[1.8]
                [&_p]:mb-6 [&_p]:text-[16px]
                [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:opacity-80`
              : `prose prose-neutral max-w-none text-neutral-800 leading-[1.8]
                [&_h1]:text-4xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:mb-8 [&_h1]:mt-12 [&_h1]:text-neutral-900
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-5 [&_h2]:mt-10 [&_h2]:text-neutral-900
                [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-4 [&_h3]:mt-8 [&_h3]:text-neutral-900
                [&_p]:mb-6 [&_p]:text-[16px]
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_li]:mb-2
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6
                [&_strong]:font-bold [&_strong]:text-neutral-900
                [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:opacity-80
                [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-100 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-neutral-500 [&_blockquote]:my-8
                [&_em]:italic`
          }
          dangerouslySetInnerHTML={{ __html: shown.body || "" }}
        />
        )}
      </motion.main>
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
