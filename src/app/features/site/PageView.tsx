import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { adminApi } from "../../admin/api";

// Very simple markdown renderer for bold, italic, headings, lists, links
function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[h|u|o|l])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}

export function PageView() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030213] flex items-center justify-center">
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
    <div className="min-h-screen bg-white">
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
          className="prose prose-neutral max-w-none text-neutral-700 leading-relaxed
            [&_h1]:text-3xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:mb-6 [&_h1]:text-neutral-900
            [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-4 [&_h2]:text-neutral-900
            [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-3 [&_h3]:text-neutral-900
            [&_p]:mb-5 [&_p]:text-[15px]
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_li]:mb-1.5
            [&_strong]:font-bold [&_strong]:text-neutral-900
            [&_a]:text-[#A855F7] [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-purple-700
            [&_em]:italic"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body || "") }}
        />
      </motion.main>

      <footer className="border-t border-neutral-100 px-8 py-8 text-center">
        <p className="text-[10px] text-neutral-300 tracking-widest">
          © Lyricalmyrical Books
        </p>
      </footer>
    </div>
  );
}

export default PageView;
