import { regionProps } from "./storefrontRegions";
import { useEffect } from "react";
import { Link } from "react-router";
import { Heart, ArrowLeft, ShoppingBag, Trash2 } from "lucide-react";
import { useWishlist } from "../../lib/wishlist";
import { useSiteData } from "./useSiteData";
import { useCart } from "../../CartContext";
import { placeholderImage } from "./constants";
import { useSEO } from "../../lib/seo";
import { useCurrency } from "../../CurrencyContext";
import { StorefrontThemeStyle } from "./StorefrontThemeStyle";
import { getCopy } from "./storeCopy";
import { GlobalSections, TemplateSections } from "../../components/sectionRender";

export default function WishlistPage() {
  const { ids, remove } = useWishlist();
  const { books, settings, loading } = useSiteData();
  const { addToCart } = useCart();
  const { formatBookPrice } = useCurrency();

  useSEO({
    title: getCopy(settings?.design, "seoWishlistTitle"),
    description: getCopy(settings?.design, "seoWishlistDescription"),
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("preview=true")) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    }
  }, []);

  const items = books.filter(b => ids.includes(b.id));

  if (loading) {
    return (
      <div data-fm-store data-studio-target="copy:Collection & wishlist pages" data-studio-label="Wishlist page" className="min-h-screen fm-page text-white flex items-center justify-center">
        <StorefrontThemeStyle design={settings?.design} />
        <p className="text-[10px] tracking-[0.4em] text-white/40 uppercase">{getCopy(settings?.design, "pageLoading")}</p>
      </div>
    );
  }

  return (
    <div data-fm-store data-studio-target="copy:Collection & wishlist pages" data-studio-label="Wishlist page" className="min-h-screen fm-page text-white">
      <StorefrontThemeStyle design={settings?.design} />
      <header {...regionProps("wishlistHeader")} className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/50 hover:text-white uppercase">
          <ArrowLeft size={14} /> {getCopy(settings?.design, "backToCatalog")}
        </Link>
        <span {...regionProps("wishlistTitle")} className="text-[10px] tracking-[0.4em] text-white/40 uppercase">{getCopy(settings?.design, "wishlistTitle")}</span>
        <span {...regionProps("wishlistCount")} className="text-[10px] tracking-[0.4em] text-white/40 uppercase">{getCopy(settings?.design, "wishlistCount", { count: items.length })}</span>
      </header>

      {items.length === 0 ? (
        <div {...regionProps("wishlistEmpty")} className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
            <Heart size={20} strokeWidth={1.4} className="text-white/40" />
          </div>
          <p className="text-white/50 text-xs tracking-[0.3em] uppercase">{getCopy(settings?.design, "wishlistEmpty")}</p>
          <Link
            to="/"
            className="border border-white/20 px-8 py-3 rounded-full text-[10px] tracking-[0.4em] uppercase hover:bg-white/5 transition-all"
          >
            {getCopy(settings?.design, "wishlistBrowse")}
          </Link>
        </div>
      ) : (
        <div {...regionProps("wishlistGrid")} className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {items.map(book => {
            const slug = (book as any).slug || book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const stock = (book as any).stockLevel ?? 999;
            const out = stock === 0;
            return (
              <article key={book.id} className="group">
                <Link to={`/books/${slug}`} className="block">
                  <div {...regionProps("wishlistPhoto")} className="relative aspect-[3/4] fm-surface rounded-2xl overflow-hidden mb-3 border border-white/[0.05]">
                    <img loading="lazy" decoding="async"
                      src={(book as any).photos?.[0]?.url || placeholderImage(settings?.design)}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {out && (
                      <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                        <span className="text-white/60 text-[8px] tracking-widest uppercase border border-white/20 px-3 py-1">{getCopy(settings?.design, "soldOutLabel")}</span>
                      </div>
                    )}
                  </div>
                  <div data-studio-target="style:products" data-studio-label="Card title & price">
                    <h3 className="fm-card-title text-[11px] tracking-widest uppercase text-white/80">{book.title}</h3>
                    {book.retailPrice ? (
                      <p className="fm-card-price-wrap fm-card-price text-[10px] text-white/40 mt-1">{formatBookPrice(book)}</p>
                    ) : null}
                  </div>
                </Link>
                <div {...regionProps("wishlistActions")} className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => addToCart(book)}
                    disabled={out}
                    className="flex-1 flex items-center justify-center gap-2 fm-active py-2.5 rounded-full text-[9px] tracking-[0.3em] uppercase font-bold disabled:opacity-30 hover:bg-white/90 transition-all"
                  >
                    <ShoppingBag size={11} /> {getCopy(settings?.design, "wishlistAdd")}
                  </button>
                  <button
                    onClick={() => remove(book.id)}
                    aria-label={getCopy(settings?.design, "wishlistRemoveAria")}
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

      <TemplateSections design={settings?.design} templateId="wishlistPage" books={books} />
      <GlobalSections design={settings?.design} books={books} />
    </div>
  );
}
