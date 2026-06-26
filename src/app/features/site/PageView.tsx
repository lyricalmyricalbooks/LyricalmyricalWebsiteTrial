import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { adminApi } from "../../admin/api";
import { useSiteData } from "./useSiteData";
import { StorefrontThemeStyle } from "./StorefrontThemeStyle";
import { TemplateSections, GlobalSections } from "../../components/sectionRender";
import type { Page } from "./types";


export function PageView() {
  const { slug } = useParams<{ slug: string }>();
  const { settings, books } = useSiteData();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  if (loading) {
    return (
      <div data-fm-store className="min-h-screen fm-page flex items-center justify-center">
        <StorefrontThemeStyle design={settings?.design} />
        <p className="text-white/40 text-[10px] tracking-[0.4em] uppercase animate-pulse">
          Loading…
        </p>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-4">
        <p className="text-6xl font-black text-neutral-100">404</p>
        <p className="text-neutral-500 font-medium">Page not found</p>
        <Link
          to="/"
          className="mt-4 flex items-center gap-2 text-xs font-bold tracking-widest text-neutral-400 hover:text-black transition-colors"
        >
          <ArrowLeft size={14} />
          BACK TO HOME
        </Link>
      </div>
    );
  }

  return (
    <div data-fm-store className="min-h-screen bg-white">
      <StorefrontThemeStyle design={settings?.design} />
      {/* Nav bar */}
      <header className="border-b border-neutral-100 px-8 py-5 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
        <Link to="/" className="text-xl font-black tracking-tighter text-neutral-900">
          F✶M
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-neutral-400 hover:text-black transition-colors"
        >
          <ArrowLeft size={12} />
          HOME
        </Link>
      </header>

      <TemplateSections design={settings?.design} templateId="page" books={books} />

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto px-6 py-16"
      >
        <p className="text-[10px] font-bold tracking-[0.3em] text-neutral-400 uppercase mb-4">
          Page
        </p>
        <h1 className="text-4xl font-black tracking-tight text-neutral-900 mb-10">
          {page.title}
        </h1>

        <div
          className="prose prose-neutral max-w-none text-neutral-800 leading-[1.8]
            [&_h1]:text-4xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:mb-8 [&_h1]:mt-12 [&_h1]:text-neutral-900
            [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-5 [&_h2]:mt-10 [&_h2]:text-neutral-900
            [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-4 [&_h3]:mt-8 [&_h3]:text-neutral-900
            [&_p]:mb-6 [&_p]:text-[16px]
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-6 [&_li]:mb-2
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-6
            [&_strong]:font-bold [&_strong]:text-neutral-900
            [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:opacity-80
            [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-100 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-neutral-500 [&_blockquote]:my-8
            [&_em]:italic"
          dangerouslySetInnerHTML={{ __html: page.body || "" }}
        />
      </motion.main>

      <GlobalSections design={settings?.design} books={books} />

      <footer className="border-t border-neutral-100 px-8 py-8 text-center">
        <p className="text-[10px] text-neutral-300 tracking-widest">
          © Lyricalmyrical Books
        </p>
      </footer>
    </div>
  );
}

export default PageView;
