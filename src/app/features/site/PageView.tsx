import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { adminApi } from "../../admin/api";
import { useSiteData } from "./useSiteData";
import { StorefrontThemeStyle } from "./StorefrontThemeStyle";
import { TemplateSections, GlobalSections } from "../../components/sectionRender";
import { LogoMark } from "../../components/LogoMark";
import { resolveLogoDesign } from "./selectors";
import type { Page } from "./types";
import { policyPageFor } from "./policyPages";
import { getCopy } from "./storeCopy";


export function PageView() {
  const { slug } = useParams<{ slug: string }>();
  const { settings, books, loading: siteLoading } = useSiteData();
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
  const hidePageBody = !!perPageSurface?.hidePageBody;
  // "theme" chrome renders the page in the storefront's colors/wordmark;
  // default "classic" keeps the original white editorial page.
  const themed = d?.pageChromeStyle === "theme";
  const themedBg = d?.backgroundColor || "#0a0910";
  const themedText = d?.textColor || "#f3f1ee";
  const logoDesign = resolveLogoDesign(rawDesign.storefront, [rawDesign.heroPage, rawDesign]);

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

  return (
    <div
      data-fm-store data-studio-target="pages|copy:Custom pages & 404|style:colors" data-studio-label="Page"
      className={`min-h-screen ${themed ? "" : "bg-white"}`}
      style={themed ? { backgroundColor: themedBg, color: themedText } : undefined}
    >
      <StorefrontThemeStyle design={settings?.design} />
      {/* Nav bar */}
      <header
        className={`px-8 py-5 flex items-center justify-between sticky top-0 backdrop-blur-md z-10 border-b ${
          themed ? "border-white/10" : "border-neutral-100 bg-white/90"
        }`}
        style={themed ? { backgroundColor: `${themedBg}db` } : undefined}
      >
        <Link
          to="/"
          className={themed ? "flex items-center" : "text-xl font-black tracking-tighter text-neutral-900"}
        >
          {themed ? <LogoMark design={logoDesign} /> : (logoDesign?.logoText || "F✶M")}
        </Link>
        <Link
          to="/"
          className={`flex items-center gap-2 text-[10px] font-bold tracking-widest transition-colors ${
            themed ? "opacity-50 hover:opacity-100" : "text-neutral-400 hover:text-black"
          }`}
        >
          <ArrowLeft size={12} />
          {getCopy(settings?.design, "pageHomeLink")}
        </Link>
      </header>

      <TemplateSections design={settings?.design} templateId={surfaceId} books={books} />

      {/* Content */}
      {!hidePageBody && (
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto px-6 py-16"
      >
        <p className={`text-[10px] font-bold tracking-[0.3em] uppercase mb-4 ${themed ? "opacity-50" : "text-neutral-400"}`}>
          {getCopy(settings?.design, "pageEyebrow")}
        </p>
        <h1 className={`text-4xl font-black tracking-tight mb-10 ${themed ? "" : "text-neutral-900"}`}>
          {shown.title}
        </h1>

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
      </motion.main>
      )}

      <GlobalSections design={settings?.design} books={books} />

      <footer className={`px-8 py-8 text-center border-t ${themed ? "border-white/10" : "border-neutral-100"}`}>
        <p className={`text-[10px] tracking-widest ${themed ? "opacity-40" : "text-neutral-300"}`}>
          {getCopy(settings?.design, "footerCopyright")}
        </p>
      </footer>
    </div>
  );
}

export default PageView;
