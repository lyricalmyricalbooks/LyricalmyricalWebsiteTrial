import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Heart, ArrowLeft, ShoppingBag, Trash2 } from "lucide-react";
import { useWishlist } from "../../lib/wishlist";
import { useSiteData } from "./useSiteData";
import { useCart } from "../../CartContext";
import { DEFAULT_IMAGE } from "./constants";
import { useSEO } from "../../lib/seo";
import { useCurrency } from "../../CurrencyContext";
import { StorefrontThemeStyle } from "./StorefrontThemeStyle";
import { GlobalSections } from "../../components/sectionRender";

export default function WishlistPage() {
  const { ids, remove } = useWishlist();
  const { books, settings, loading } = useSiteData();
  const { addToCart } = useCart();
  const { formatBookPrice } = useCurrency();

  useSEO({
    title: "Your Wishlist",
    description: "Books you've saved for later from Lyricalmyrical Books.",
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("preview=true")) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    }
  }, []);

  // ⚡ Bolt: Cache wishlist ids in a Set for O(1) lookups
  // Measured impact: Prevents O(N*M) lookups when filtering the books array.
  const idSet = useMemo(() => new Set(ids), [ids]);
  const items = useMemo(() => books.filter(b => idSet.has(b.id)), [books, idSet]);

  if (loading) {
    return (
      <div data-fm-store className="min-h-screen fm-page text-white flex items-center justify-center">
        <StorefrontThemeStyle design={settings?.design} />
        <p className="text-[10px] tracking-[0.4em] text-white/40 uppercase">Loading…</p>
      </div>
    );
  }

  return (
    <div data-fm-store className="min-h-screen fm-page text-white">
      <StorefrontThemeStyle design={settings?.design} />
      <header className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/50 hover:text-white uppercase">
          <ArrowLeft size={14} /> Back
        </Link>
        <span className="text-[10px] tracking-[0.4em] text-white/40 uppercase">Wishlist</span>
        <span className="text-[10px] tracking-[0.4em] text-white/40 uppercase">{items.length} items</span>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
            <Heart size={20} strokeWidth={1.4} className="text-white/40" />
          </div>
          <p className="text-white/50 text-xs tracking-[0.3em] uppercase">Your wishlist is empty</p>
          <Link
            to="/"
            className="border border-white/20 px-8 py-3 rounded-full text-[10px] tracking-[0.4em] uppercase hover:bg-white/5 transition-all"
          >
            Browse the archive
          </Link>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {items.map(book => {
            const slug = (book as any).slug || book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const stock = (book as any).stockLevel ?? 999;
            const out = stock === 0;
            return (
              <article key={book.id} className="group">
                <Link to={`/books/${slug}`} className="block">
                  <div className="relative aspect-[3/4] fm-surface rounded-2xl overflow-hidden mb-3 border border-white/[0.05]">
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
                    <p className="text-[10px] text-white/40 mt-1">{formatBookPrice(book)}</p>
                  ) : null}
                </Link>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => addToCart(book)}
                    disabled={out}
                    className="flex-1 flex items-center justify-center gap-2 fm-active py-2.5 rounded-full text-[9px] tracking-[0.3em] uppercase font-bold disabled:opacity-30 hover:bg-white/90 transition-all"
                  >
                    <ShoppingBag size={11} /> Add
                  </button>
                  <button
                    onClick={() => remove(book.id)}
                    aria-label="Remove from wishlist"
                    className="p-2.5 rounded-full border border-white/10 text-white/40 hover:text-rose-400 hover:border-rose-400/30 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <GlobalSections design={settings?.design} books={books} />
    </div>
  );
}
