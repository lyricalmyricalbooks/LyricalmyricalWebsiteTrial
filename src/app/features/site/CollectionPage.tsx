import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Heart } from "lucide-react";
import { useSiteData } from "./useSiteData";
import { DEFAULT_IMAGE } from "./constants";
import { CatalogControls, applyCatalogControls, type SortKey } from "./CatalogControls";
import { useWishlist } from "../../lib/wishlist";
import { useSEO } from "../../lib/seo";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { books, settings, loading } = useSiteData();
  const { has, toggle } = useWishlist();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);

  const categories = settings?.design?.categories || [];
  const categoryName = useMemo(() => {
    const list = (categories || []).map((c: any) => (typeof c === "string" ? c : c.name));
    return list.find((n: string) => slugify(n) === slug) || (slug || "").toUpperCase();
  }, [categories, slug]);

  const items = useMemo(() => {
    const base = books.filter(
      b =>
        b.status === "published" &&
        ((b.categories || []).includes(categoryName) ||
          (b as any).genres?.includes(categoryName) ||
          categoryName === "PUBLICATIONS"),
    );
    return applyCatalogControls(base, query, sort, inStockOnly, [0, Infinity]);
  }, [books, categoryName, query, sort, inStockOnly]);

  useSEO({
    title: `${categoryName} Collection`,
    description: `Browse the ${categoryName.toLowerCase()} collection from Lyricalmyrical Books.`,
    type: "website",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center">
        <p className="text-[10px] tracking-[0.4em] text-white/40 uppercase">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <header className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/50 hover:text-white uppercase">
          <ArrowLeft size={14} /> Archive
        </Link>
        <span className="text-[10px] tracking-[0.4em] text-white/40 uppercase">Collection</span>
        <Link to="/wishlist" className="text-[10px] tracking-[0.3em] text-white/50 hover:text-white uppercase">
          Wishlist
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-14">
        <nav aria-label="Breadcrumb" className="mb-8 text-[10px] tracking-[0.3em] uppercase text-white/30 flex gap-2">
          <Link to="/" className="hover:text-white">Home</Link>
          <span>/</span>
          <span>Collections</span>
          <span>/</span>
          <span className="text-white/70">{categoryName}</span>
        </nav>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase mb-10">{categoryName}</h1>

        <CatalogControls
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          inStockOnly={inStockOnly}
          setInStockOnly={setInStockOnly}
          resultCount={items.length}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {items.map(book => {
            const bSlug = (book as any).slug || slugify(book.title);
            const out = ((book as any).stockLevel ?? 999) === 0;
            const wished = has(book.id);
            return (
              <article key={book.id} className="group relative">
                <button
                  onClick={() => toggle(book.id)}
                  aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                  className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                    wished ? "bg-rose-500/20 text-rose-400 border border-rose-400/40" : "bg-black/40 text-white/60 border border-white/10 hover:text-white"
                  }`}
                >
                  <Heart size={14} fill={wished ? "currentColor" : "none"} />
                </button>
                <Link to={`/books/${bSlug}`} className="block">
                  <div className="relative aspect-[3/4] bg-neutral-900 rounded-2xl overflow-hidden mb-3 border border-white/[0.05]">
                    <img
                      src={(book as any).photos?.[0]?.url || DEFAULT_IMAGE}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {out && (
                      <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                        <span className="text-white/60 text-[8px] tracking-widest uppercase border border-white/20 px-3 py-1">Sold Out</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-[11px] tracking-widest uppercase text-white/80">{book.title}</h3>
                  {book.retailPrice ? (
                    <p className="text-[10px] text-white/40 mt-1">${book.retailPrice.toFixed(2)}</p>
                  ) : null}
                </Link>
              </article>
            );
          })}
        </div>

        {items.length === 0 && (
          <p className="py-20 text-center text-[10px] tracking-[0.4em] text-white/30 uppercase">
            No publications match these filters.
          </p>
        )}
      </main>
    </div>
  );
}
