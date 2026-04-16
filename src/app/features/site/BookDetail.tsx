import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowLeft, Package, Share2 } from "lucide-react";
import { useCart } from "../../CartContext";
import { useSiteData } from "./useSiteData";
import { DEFAULT_IMAGE } from "./constants";
import type { Book } from "./types";

export default function BookDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { books, settings, loading } = useSiteData();
  const { addToCart, setIsCartOpen, cartCount } = useCart();

  const [activePhoto, setActivePhoto] = useState(0);
  const [added, setAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const book: Book | undefined = books.find(
    (b) => b.id === slug || (b as any).slug === slug || b.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug
  );

  const otherBooks = books.filter((b) => b.id !== book?.id && b.status === "published").slice(0, 4);

  useEffect(() => {
    window.scrollTo(0, 0);
    setActivePhoto(0);
    setImageLoaded(false);
  }, [slug]);

  const handleAddToCart = () => {
    if (!book) return;
    const stockLevel = (book as any).stockLevel ?? 999;
    if (stockLevel === 0) return;
    addToCart(book);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: book?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard.");
    }
  };

  const primaryColor = settings?.design?.primaryColor || "#A855F7";
  const font = settings?.design?.font || "Inter";
  const photos = (book as any)?.photos || [{ url: DEFAULT_IMAGE }];
  const stockLevel = (book as any)?.stockLevel ?? 999;
  const isOutOfStock = stockLevel === 0;
  const retailPrice = (book as any)?.retailPrice ?? 0;
  const salePrice = (book as any)?.salePrice ?? 0;
  const isOnSale = (book as any)?.isOnSale && salePrice > 0;

  if (loading) {
    return (
      <div className="h-screen bg-[#030213] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
          >
            <Package size={18} className="text-white/70" />
          </motion.div>
          <p className="text-white/40 text-[10px] tracking-[0.4em] uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#030213] text-white flex flex-col items-center justify-center gap-6">
        <Package size={48} strokeWidth={1} className="text-white/20" />
        <p className="text-white/60 text-sm tracking-widest uppercase">Publication not found</p>
        <Link to="/" className="text-[10px] tracking-[0.4em] border border-white/20 px-6 py-3 rounded-full hover:bg-white/5 transition-all">
          RETURN TO ARCHIVE
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030213] text-white selection:bg-white selection:text-black" style={{ fontFamily: font }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-[10px] tracking-[0.3em] uppercase"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <Link to="/" className="text-xs font-bold tracking-[0.3em]">
            {settings?.design?.logoUrl ? (
              <img src={settings.design.logoUrl} alt="Logo" className="h-6 object-contain" />
            ) : "F✶M"}
          </Link>
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-all"
          >
            <ShoppingBag size={14} />
            <span className="text-[10px] tracking-[0.2em]">BAG</span>
            {cartCount > 0 && (
              <span className="bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">{cartCount}</span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24">
          
          {/* Photo Column */}
          <div className="space-y-4">
            {/* Main Photo */}
            <div className="relative aspect-[3/4] bg-neutral-900 rounded-2xl overflow-hidden">
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900 animate-pulse" />
              )}
              <AnimatePresence mode="wait">
                <motion.img
                  key={activePhoto}
                  src={photos[activePhoto]?.url || DEFAULT_IMAGE}
                  alt={`${book.title} — photo ${activePhoto + 1}`}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  onLoad={() => setImageLoaded(true)}
                />
              </AnimatePresence>

              {/* Out of Stock overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <span className="border border-white/40 text-white text-[10px] tracking-[0.4em] px-6 py-2 uppercase">
                    SOLD OUT
                  </span>
                </div>
              )}

              {/* Sale badge */}
              {isOnSale && !isOutOfStock && (
                <div className="absolute top-4 left-4">
                  <span className="bg-white text-black text-[9px] font-bold tracking-widest px-3 py-1">SALE</span>
                </div>
              )}

              {/* Photo nav arrows */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhoto(p => Math.max(0, p - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 backdrop-blur rounded-full flex items-center justify-center hover:bg-black/80 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setActivePhoto(p => Math.min(photos.length - 1, p + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 backdrop-blur rounded-full flex items-center justify-center hover:bg-black/80 transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {photos.map((photo: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      activePhoto === i ? "border-white" : "border-white/10 opacity-50 hover:opacity-75"
                    }`}
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Column */}
          <div className="flex flex-col justify-center space-y-8 lg:pt-8">
            {/* Category */}
            <div>
              <span className="text-[9px] tracking-[0.5em] text-white/40 uppercase">
                {(book as any).genres?.[0] || (book as any).categories?.[0] || "Publication"}
              </span>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-none">{book.title}</h1>
              {(book as any).subtitle && (
                <p className="text-white/50 text-lg font-light">{(book as any).subtitle}</p>
              )}
              {(book as any).authorId && (
                <p className="text-white/40 text-sm tracking-wider uppercase">
                  {(book as any).authorName || "Lyricalmyrical Books"}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              {isOnSale ? (
                <>
                  <span className="text-3xl font-light">${salePrice.toFixed(2)}</span>
                  <span className="text-white/30 line-through text-lg">${retailPrice.toFixed(2)}</span>
                  <span className="text-[9px] tracking-widest text-green-400 uppercase">Save ${(retailPrice - salePrice).toFixed(2)}</span>
                </>
              ) : (
                <span className="text-3xl font-light">
                  {retailPrice > 0 ? `$${retailPrice.toFixed(2)}` : "Price on request"}
                </span>
              )}
            </div>

            {/* Description */}
            {(book as any).description && (
              <div className="space-y-2">
                <p className="text-white/60 text-sm leading-relaxed">
                  {(book as any).description}
                </p>
              </div>
            )}

            {/* Book Specs */}
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/10">
              {(book as any).format && (
                <div>
                  <p className="text-[9px] tracking-widest text-white/30 uppercase mb-1">Format</p>
                  <p className="text-xs text-white/70">{(book as any).format}</p>
                </div>
              )}
              {(book as any).isbn && (
                <div>
                  <p className="text-[9px] tracking-widest text-white/30 uppercase mb-1">ISBN</p>
                  <p className="text-xs text-white/70 font-mono">{(book as any).isbn}</p>
                </div>
              )}
              {(book as any).dimensions && (
                <div>
                  <p className="text-[9px] tracking-widest text-white/30 uppercase mb-1">Dimensions</p>
                  <p className="text-xs text-white/70">{(book as any).dimensions}</p>
                </div>
              )}
              {(book as any).language && (
                <div>
                  <p className="text-[9px] tracking-widest text-white/30 uppercase mb-1">Language</p>
                  <p className="text-xs text-white/70">{(book as any).language}</p>
                </div>
              )}
              {(book as any).weight && (
                <div>
                  <p className="text-[9px] tracking-widest text-white/30 uppercase mb-1">Weight</p>
                  <p className="text-xs text-white/70">{(book as any).weight}</p>
                </div>
              )}
              {stockLevel > 0 && stockLevel !== 999 && stockLevel <= 10 && (
                <div>
                  <p className="text-[9px] tracking-widest text-white/30 uppercase mb-1">Availability</p>
                  <p className="text-xs text-amber-400">{stockLevel} remaining</p>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="flex gap-4">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                style={!isOutOfStock ? { backgroundColor: primaryColor } : {}}
                className={`flex-1 py-4 rounded-full text-[10px] tracking-[0.4em] font-bold transition-all duration-300 ${
                  isOutOfStock
                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                    : "text-white hover:brightness-110 hover:scale-[1.02] active:scale-95 shadow-xl"
                }`}
              >
                {isOutOfStock ? "SOLD OUT" : added ? "✓ ADDED TO BAG" : "ADD TO BAG"}
              </button>
              <button
                onClick={handleShare}
                className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/5 transition-all"
                title="Share"
              >
                <Share2 size={16} className="text-white/60" />
              </button>
            </div>

            {/* Trust signals */}
            <div className="flex gap-6 text-[9px] text-white/30 uppercase tracking-widest">
              <span>Free shipping over $150</span>
              <span>·</span>
              <span>Ships from Toronto</span>
            </div>
          </div>
        </div>

        {/* Related books */}
        {otherBooks.length > 0 && (
          <section className="mt-24 pt-12 border-t border-white/10">
            <h2 className="text-[10px] tracking-[0.5em] text-white/40 uppercase mb-10">From the Archive</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
              {otherBooks.map((relatedBook, i) => {
                const relSlug = (relatedBook as any).slug || relatedBook.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                const relStock = (relatedBook as any).stockLevel ?? 999;
                return (
                  <motion.article
                    key={relatedBook.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="group"
                  >
                    <Link to={`/books/${relSlug}`}>
                      <div className="relative aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden mb-4">
                        <img
                          src={(relatedBook as any).photos?.[0]?.url || DEFAULT_IMAGE}
                          alt={relatedBook.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {relStock === 0 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white/60 text-[8px] tracking-widest uppercase border border-white/20 px-3 py-1">Sold Out</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] tracking-wider text-white/70 group-hover:text-white transition-colors uppercase">{relatedBook.title}</p>
                      {(relatedBook as any).retailPrice > 0 && (
                        <p className="text-[10px] text-white/30 mt-1">${(relatedBook as any).retailPrice?.toFixed(2)}</p>
                      )}
                    </Link>
                  </motion.article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-white/10 text-center">
        <p className="text-[9px] tracking-widest text-white/30 uppercase">
          © {new Date().getFullYear()} Lyricalmyrical Books · Toronto, Canada
        </p>
      </footer>
    </div>
  );
}
