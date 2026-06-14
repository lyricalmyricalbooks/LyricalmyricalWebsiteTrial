import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ChevronLeft, ChevronRight, ShoppingBag, ArrowLeft,
  Package, Share2, Check, BookOpen, Globe, Ruler,
  Weight, Tag, Truck, ShieldCheck, Zap, Heart
} from "lucide-react";
import { useCart } from "../../CartContext";
import { useCurrency } from "../../CurrencyContext";
import { useSiteData } from "./useSiteData";
import { getCopy } from "./storeCopy";
import { DEFAULT_IMAGE } from "./constants";
import type { Book } from "./types";
import { trackBookView } from "../../lib/recentlyViewed";
import { useWishlist } from "../../lib/wishlist";
import { useSEO } from "../../lib/seo";
import { funnelApi } from "../../lib/commerce";
import ReviewsSection from "./ReviewsSection";
import { LogoMark } from "../../components/LogoMark";
import RecentlyViewedRow from "./RecentlyViewedRow";
import { resolveLogoDesign } from "./selectors";

// ── small helper ────────────────────────────────────────────────────────────
function SpecItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 hover:border-white/[0.14] transition-colors">
      <div className="flex items-center gap-2 text-white/30">
        {icon}
        <span className="text-[8px] font-black tracking-[0.35em] uppercase">{label}</span>
      </div>
      <p className="text-[13px] font-medium text-white/80 leading-tight">{value}</p>
    </div>
  );
}

// ── main ────────────────────────────────────────────────────────────────────
export default function BookDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { books, settings, loading } = useSiteData();
  const { addToCart, setIsCartOpen, cartCount } = useCart();
  const { formatPrice, formatBookPrice, getBookPrice } = useCurrency();

  const [activePhoto, setActivePhoto] = useState(0);
  const [added, setAdded]             = useState(false);
  const [addingBoth, setAddingBoth]   = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgBg, setImgBg]             = useState("transparent");
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  const book: Book | undefined = books.find(
    (b) => b.id === slug || b.slug === slug ||
      b.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug
  );

  useEffect(() => {
    if (book?.variants && book.variants.length > 0) {
      setSelectedVariant(book.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [book]);

  const storefrontDesign       = settings?.design?.storefront || {};
  const productImageLayout     = storefrontDesign.productImageLayout     || "slider";
  const productContentPosition = storefrontDesign.productContentPosition || "right";
  const showRelatedProducts    = storefrontDesign.showRelatedProducts    ?? true;
  const showSocialShare        = storefrontDesign.showSocialShare        ?? true;

  // Autonomy controls for book detail page
  const showAmbientGlow        = storefrontDesign.showAmbientGlow        ?? settings?.design?.showAmbientGlow        ?? true;
  const glowOpacity            = (storefrontDesign.glowIntensity ?? settings?.design?.glowIntensity ?? 18) / 100;
  const showSpecs              = storefrontDesign.showSpecs              ?? settings?.design?.showSpecs              ?? true;
  const showBundleWidget       = storefrontDesign.showBundleWidget       ?? settings?.design?.showBundleWidget       ?? true;
  const showTrustSignals       = storefrontDesign.showTrustSignals       ?? settings?.design?.showTrustSignals       ?? true;

  const buttonBg = storefrontDesign?.buttonColor || settings?.design?.buttonColor || settings?.design?.primaryColor || "#A855F7";
  const buttonText = storefrontDesign?.buttonTextColor || settings?.design?.buttonTextColor || "#000000";
  const buttonRadius = Math.max(0, Math.min(999, storefrontDesign?.buttonRadius ?? 999));
  const buttonStyle = storefrontDesign?.buttonStyle || "solid";
  const buttonUppercase = storefrontDesign?.buttonUppercase ?? true;
  const buttonShadow = storefrontDesign?.buttonShadow ?? true;

  const storefrontBg       = settings?.design?.backgroundColor || "#050508";
  const storefrontText     = settings?.design?.textColor || "#ffffff";
  const headerBgColor      = settings?.design?.headerBg || `${storefrontBg}cc`;
  const headerTextColor    = settings?.design?.headerColor || storefrontText;
  const headerBorderColor  = settings?.design?.headerColor ? `${settings.design.headerColor}1a` : `${storefrontText}1a`;

  const btnHoverBg = settings?.design?.buttonHoverBgColor || "#C1BBBB";
  const btnHoverText = settings?.design?.buttonHoverTextColor || "#FFFFFF";
  const badgeTextPrimary = settings?.design?.badgeTextPrimary || "#000000";
  const badgeBgPrimary = settings?.design?.badgeBgPrimary || "#F63737";
  const badgeTextSecondary = settings?.design?.badgeTextSecondary || "#000000";
  const badgeBgSecondary = settings?.design?.badgeBgSecondary || "#E0E0E0";
  const lowInventoryColor = settings?.design?.lowInventoryColor || "#056FFA";
  const borderColor = settings?.design?.borderColor || "rgba(255,255,255,0.05)";
  const linkHoverColor = settings?.design?.linkColorHover || "#F61515";

  const css = `
    [data-fm-store] {
      --bg-color: ${storefrontBg};
      --text-color: ${storefrontText};
      --link-hover-color: ${linkHoverColor};
      --border-color: ${borderColor};
      --btn-hover-bg: ${btnHoverBg};
      --btn-hover-text: ${btnHoverText};
      --badge-text-primary: ${badgeTextPrimary};
      --badge-bg-primary: ${badgeBgPrimary};
      --badge-text-secondary: ${badgeTextSecondary};
      --badge-bg-secondary: ${badgeBgSecondary};
      --low-inventory-color: ${lowInventoryColor};
    }
    [data-fm-store] .custom-btn:hover {
      background-color: var(--btn-hover-bg) !important;
      color: var(--btn-hover-text) !important;
      box-shadow: none !important;
    }
    /* Apply custom border color to standard borders on the page */
    [data-fm-store] .border-white\\/5, 
    [data-fm-store] .border-white\\/10, 
    [data-fm-store] .border-white\\/\\[0\\.06\\], 
    [data-fm-store] .border-white\\/\\[0\\.07\\], 
    [data-fm-store] .border-white\\/\\[0\\.08\\], 
    [data-fm-store] .border-b {
      border-color: var(--border-color) !important;
    }
  `;

  const bookCategories = (book as any)?.categories || (book as any)?.genres || [];
  const otherBooks = (() => {
    const published = books.filter(b => b.id !== book?.id && b.status === "published");
    const sameCategory = published.filter(b =>
      ((b as any).categories || (b as any).genres || []).some((c: string) => bookCategories.includes(c)),
    );
    return (sameCategory.length >= 4 ? sameCategory : [...sameCategory, ...published.filter(b => !sameCategory.includes(b))]).slice(0, 4);
  })();

  const { has: isWished, toggle: toggleWish } = useWishlist();
  const wished = book ? isWished(book.id) : false;

  useSEO(
    book
      ? {
          title: book.title,
          description: (book as any).description || `${book.title} — Lyricalmyrical Books`,
          image: (book as any).photos?.[0]?.url,
          type: "book",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Book",
            name: book.title,
            description: (book as any).description || "",
            image: (book as any).photos?.map((p: any) => p.url) || [],
            isbn: (book as any).isbn,
            inLanguage: (book as any).language,
            offers: {
              "@type": "Offer",
              priceCurrency: "USD",
              price:
                (book as any).isOnSale && (book as any).salePrice
                  ? (book as any).salePrice
                  : (book as any).retailPrice,
              availability:
                ((book as any).stockLevel ?? 999) === 0
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/InStock",
              url: typeof window !== "undefined" ? window.location.href : undefined,
            },
          },
        }
      : { title: "Publication" },
  );

  useEffect(() => {
    if (book?.id) {
      trackBookView(book.id);
      funnelApi.track("view");
      const bookCategories = (book as any)?.categories || (book as any)?.genres || [];
      bookCategories.forEach((cat: string) => {
        funnelApi.trackCategory(cat);
      });
    }
  }, [book?.id, book]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setActivePhoto(0);
    setImageLoaded(false);
    if (typeof window !== "undefined" && window.location.search.includes("preview=true")) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    }
  }, [slug]);

  const handleAddToCart = () => {
    if (!book) return;
    const stock = selectedVariant ? (selectedVariant.stockLevel ?? selectedVariant.stock ?? 0) : ((book as any).stockLevel ?? 999);
    if (stock === 0) return;
    addToCart(book, selectedVariant || undefined);
    funnelApi.track("add_to_cart");
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const bundleBook = otherBooks[0];

  const handleAddBothToBag = () => {
    if (!book || !bundleBook) return;
    addToCart(book);
    addToCart(bundleBook);
    setAddingBoth(true);
    funnelApi.track("add_to_cart");
    setTimeout(() => {
      setAddingBoth(false);
      setIsCartOpen(true);
    }, 1000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: book?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard.");
    }
  };

  const primaryColor  = settings?.design?.primaryColor || "#A855F7";
  const font          = settings?.design?.font || "Inter";
  const photos        = (book as any)?.photos || [{ url: DEFAULT_IMAGE }];
  const stockLevel    = selectedVariant ? (selectedVariant.stockLevel ?? selectedVariant.stock ?? 0) : ((book as any)?.stockLevel ?? 999);
  const isOutOfStock  = stockLevel === 0;
  const retailPrice   = selectedVariant ? selectedVariant.price : ((book as any)?.retailPrice ?? 0);
  const salePrice     = selectedVariant ? 0 : ((book as any)?.salePrice   ?? 0);
  const isOnSale      = selectedVariant ? false : ((book as any)?.isOnSale && salePrice > 0);
  const activeUrl     = (selectedVariant && selectedVariant.photoUrl) ? selectedVariant.photoUrl : (photos[activePhoto]?.url || DEFAULT_IMAGE);
  const logoDesign    = resolveLogoDesign(settings?.design?.storefront, [settings?.design?.heroPage, settings?.design]);

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-[#050508] flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-14 h-14 rounded-[1.2rem] bg-white/[0.06] border border-white/10 flex items-center justify-center"
          >
            <Package size={20} className="text-white/50" />
          </motion.div>
          <p className="text-white/30 text-[9px] font-black tracking-[0.5em] uppercase">Loading</p>
        </div>
      </div>
    );
  }

  // ── not found ──────────────────────────────────────────────────────────────
  if (!book) {
    return (
      <div
        data-fm-store
        className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{
          backgroundColor: storefrontBg,
          color: storefrontText,
        }}
      >
        <Package size={48} strokeWidth={1} style={{ color: `${storefrontText}33` }} />
        <p className="text-sm tracking-[0.3em] uppercase" style={{ color: `${storefrontText}80` }}>Publication not found</p>
        <Link
          to="/"
          className="text-[10px] font-black tracking-[0.4em] px-8 py-3 transition-all uppercase custom-btn"
          style={{
            "--btn-bg": buttonStyle === "solid" ? buttonBg : "transparent",
            "--btn-text": buttonStyle === "solid" ? buttonText : buttonBg,
            "--btn-border": buttonStyle !== "solid" ? `1px solid ${buttonBg}` : `1px solid ${borderColor}`,
            borderRadius: buttonRadius,
          } as React.CSSProperties}
        >
          Return to Archive
        </Link>
      </div>
    );
  }

  // ── page ───────────────────────────────────────────────────────────────────
  return (
    <div
      data-fm-store
      className="min-h-screen selection:bg-white/20"
      style={{
        fontFamily: font,
        backgroundColor: storefrontBg,
        color: storefrontText,
      }}
    >
      <style>{css}</style>

      {/* ── ambient glow that follows the book cover ── */}
      {showAmbientGlow !== false && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 65% 35%, ${primaryColor} 0%, transparent 70%)`,
            opacity: glowOpacity,
          }}
        />
      )}

      {/* ── sticky header ── */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-2xl transition-all duration-300"
        style={{
          backgroundColor: headerBgColor,
          borderColor: headerBorderColor,
        }}
      >
        <div className="max-w-8xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            style={{ color: headerTextColor }}
            className="flex items-center gap-2.5 opacity-60 hover:opacity-100 transition-opacity group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[9px] font-black tracking-[0.35em] uppercase">{getCopy(settings?.design, "backToCatalog")}</span>
          </button>

          <Link
            to="/"
            style={{ color: headerTextColor }}
            className="text-[11px] font-black tracking-[0.3em] opacity-80 hover:opacity-100 transition-opacity"
          >
            <LogoMark design={logoDesign} />
          </Link>

          <button
            onClick={() => setIsCartOpen(true)}
            className={`flex items-center gap-2.5 px-4 py-2.5 transition-all group hover:scale-[1.02] custom-btn ${
              buttonShadow ? "shadow-md" : ""
            }`}
            style={{
              "--btn-bg": buttonStyle === "solid" ? buttonBg : "transparent",
              "--btn-text": buttonStyle === "solid" ? buttonText : buttonBg,
              "--btn-border": buttonStyle !== "solid" ? `1px solid ${buttonBg}` : "none",
              borderRadius: buttonRadius,
            } as React.CSSProperties}
          >
            <ShoppingBag size={14} className="transition-colors text-current" />
            <span className="text-[9px] font-black tracking-[0.25em] uppercase transition-colors text-current">
              {getCopy(settings?.design, "cartLabel") || "Bag"}
            </span>
            {cartCount > 0 && (
              <span
                className="text-[8px] font-black px-1.5 py-0.5 rounded-full transition-colors"
                style={{
                  backgroundColor: buttonStyle === "solid" ? "var(--btn-text)" : "var(--btn-bg)",
                  color: buttonStyle === "solid" ? "var(--btn-bg)" : "var(--btn-text)",
                }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── hero layout ── */}
      <main className="relative z-10">
        <div className="max-w-8xl mx-auto px-6 py-12 lg:py-20">
          <div className={`grid grid-cols-1 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px] gap-12 xl:gap-20 items-start ${
            productContentPosition === "left" ? "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1" : ""
          }`}>

            {/* ── PHOTO COLUMN ── */}
            <div className="space-y-4">
              {productImageLayout === "slider" ? (
                <>
                  {/* Main image */}
                  <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden bg-neutral-950 shadow-[0_40px_120px_rgba(0,0,0,0.7)]">

                    {/* shimmer */}
                    {!imageLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/60 to-neutral-900/80 animate-pulse" />
                    )}

                    <AnimatePresence mode="wait">
                      <motion.img
                        key={activePhoto}
                        src={activeUrl}
                        alt={`${book.title} — view ${activePhoto + 1}`}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45 }}
                        onLoad={() => setImageLoaded(true)}
                      />
                    </AnimatePresence>

                    {/* Sold out overlay */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                        <span
                          className="border text-[10px] font-black tracking-[0.5em] px-8 py-3 rounded-full uppercase backdrop-blur-sm"
                          style={{
                            backgroundColor: badgeBgSecondary,
                            color: badgeTextSecondary,
                            borderColor: `${badgeTextSecondary}33`,
                          }}
                        >
                          Sold Out
                        </span>
                      </div>
                    )}

                    {/* Sale badge */}
                    {isOnSale && !isOutOfStock && (
                      <div className="absolute top-5 left-5">
                        <span
                          className="text-[9px] font-black tracking-[0.3em] uppercase px-4 py-2 rounded-full"
                          style={{
                            backgroundColor: badgeBgPrimary,
                            color: badgeTextPrimary,
                          }}
                        >
                          Sale
                        </span>
                      </div>
                    )}

                    {/* Low stock */}
                    {stockLevel > 0 && stockLevel !== 999 && stockLevel <= 5 && (
                      <div className="absolute bottom-5 left-5 right-5">
                        <div
                          className="bg-black/70 backdrop-blur-md border rounded-2xl px-4 py-3 flex items-center gap-2"
                          style={{ borderColor: `${lowInventoryColor}40` }}
                        >
                          <Zap size={12} className="shrink-0" style={{ color: lowInventoryColor }} />
                          <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: lowInventoryColor }}>
                            Only {stockLevel} left
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Arrow nav */}
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={() => setActivePhoto(p => Math.max(0, p - 1))}
                          disabled={activePhoto === 0}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-black/80 hover:border-white/20 transition-all disabled:opacity-20"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => setActivePhoto(p => Math.min(photos.length - 1, p + 1))}
                          disabled={activePhoto === photos.length - 1}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-black/80 hover:border-white/20 transition-all disabled:opacity-20"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}

                    {/* Dot indicators */}
                    {photos.length > 1 && (
                      <div className="absolute bottom-5 right-5 flex gap-1.5">
                        {photos.map((_: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => setActivePhoto(i)}
                            className={`rounded-full transition-all ${
                              activePhoto === i ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail rail */}
                  {photos.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                      {photos.map((photo: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setActivePhoto(i)}
                          className={`flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                            activePhoto === i
                              ? "border-white scale-105 shadow-lg"
                              : "border-white/[0.08] opacity-40 hover:opacity-70 hover:border-white/20"
                          }`}
                        >
                          <img src={photo.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : productImageLayout === "grid" ? (
                <div className="grid grid-cols-2 gap-4">
                  {photos.map((photo: any, i: number) => (
                    <div key={i} className={`${i === 0 ? "col-span-2" : ""} relative aspect-[3/4] bg-neutral-950 rounded-[1.5rem] overflow-hidden`}>
                      <img src={photo.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      {i === 0 && isOutOfStock && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <span
                            className="border text-[10px] font-black tracking-[0.5em] px-8 py-3 rounded-full uppercase"
                            style={{
                              backgroundColor: badgeBgSecondary,
                              color: badgeTextSecondary,
                              borderColor: `${badgeTextSecondary}33`,
                            }}
                          >
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {photos.map((photo: any, i: number) => (
                    <div key={i} className="relative aspect-[3/4] bg-neutral-950 rounded-[1.5rem] overflow-hidden">
                      <img src={photo.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      {i === 0 && isOutOfStock && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <span
                            className="border text-[10px] font-black tracking-[0.5em] px-8 py-3 rounded-full uppercase"
                            style={{
                              backgroundColor: badgeBgSecondary,
                              color: badgeTextSecondary,
                              borderColor: `${badgeTextSecondary}33`,
                            }}
                          >
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── INFO COLUMN ── */}
            <div className="flex flex-col gap-8 lg:sticky lg:top-24">

              {/* Genre tag */}
              <div>
                <span
                  className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-[0.4em] uppercase px-4 py-2 rounded-full border"
                  style={{ color: primaryColor, borderColor: `${primaryColor}40`, background: `${primaryColor}12` }}
                >
                  <Tag size={9} />
                  {(book as any).genres?.[0] || (book as any).categories?.[0] || "Publication"}
                </span>
              </div>

              {/* Title block */}
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.05]">
                  {book.title}
                </h1>
                {(book as any).subtitle && (
                  <p className="text-white/40 text-xl font-light leading-snug">{(book as any).subtitle}</p>
                )}
                {(book as any).authorName && (
                  <p className="text-white/30 text-[11px] font-black tracking-[0.35em] uppercase">
                    {(book as any).authorName}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-4">
                {isOnSale ? (
                  <>
                    <span className="text-4xl font-black tracking-tight text-white">{formatBookPrice(book)}</span>
                    <span className="text-white/25 line-through text-xl">{formatBookPrice(book, true)}</span>
                    <span className="text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase">
                      Save {formatPrice(getBookPrice(book, true) - getBookPrice(book))}
                    </span>
                  </>
                ) : (
                  <span className="text-4xl font-black tracking-tight text-white">
                    {retailPrice > 0 ? (selectedVariant ? formatPrice(selectedVariant.price) : formatBookPrice(book)) : "Price on request"}
                  </span>
                )}
              </div>

              {/* Description */}
              {(book as any).description && (
                <p className="text-white/50 text-[14px] leading-[1.8] border-l-2 border-white/10 pl-5">
                  {(book as any).description}
                </p>
              )}

              {/* Specs grid */}
              {showSpecs !== false && ((book as any).format || (book as any).language || (book as any).dimensions || (book as any).isbn || (book as any).weight) && (
                <div className="grid grid-cols-2 gap-3">
                  {(book as any).format && (
                    <SpecItem icon={<BookOpen size={11} />} label="Format" value={(book as any).format} />
                  )}
                  {(book as any).language && (
                    <SpecItem icon={<Globe size={11} />} label="Language" value={(book as any).language} />
                  )}
                  {(book as any).dimensions && (
                    <SpecItem icon={<Ruler size={11} />} label="Dimensions" value={(book as any).dimensions} />
                  )}
                  {(book as any).isbn && (
                    <SpecItem icon={<Package size={11} />} label="ISBN" value={(book as any).isbn} />
                  )}
                  {(book as any).weight && (
                    <SpecItem icon={<Weight size={11} />} label="Weight" value={(book as any).weight} />
                  )}
                  {stockLevel > 0 && stockLevel !== 999 && stockLevel <= 10 && (
                    <SpecItem icon={<Zap size={11} style={{ color: lowInventoryColor }} />} label="Availability" value={`${stockLevel} remaining`} />
                  )}
                </div>
              )}

              {/* Variant Selector */}
              {book.variants && book.variants.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[9px] tracking-[0.35em] text-white/40 uppercase font-black">Format / Edition</label>
                  <div className="flex flex-wrap gap-2.5">
                    {book.variants.map((v: any) => {
                      const isSelected = selectedVariant?.id === v.id;
                      const vStock = v.stockLevel ?? v.stock ?? 0;
                      const isVOutOfStock = vStock === 0;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`px-5 py-3 rounded-2xl border text-[9px] font-black tracking-widest uppercase transition-all duration-300 ${
                            isSelected
                              ? "bg-white text-black border-white shadow-xl shadow-white/5"
                              : isVOutOfStock
                              ? "bg-white/5 border-white/5 text-white/20 cursor-not-allowed line-through"
                              : "bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:border-white/20"
                          }`}
                        >
                          {v.name} · {formatPrice(v.price)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-3">
                <motion.button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  whileTap={!isOutOfStock ? { scale: 0.97 } : {}}
                  className={`flex-1 flex items-center justify-center gap-3 py-5 text-[10px] font-black tracking-[0.4em] transition-all duration-300 ${
                    isOutOfStock
                      ? "bg-white/[0.06] text-white/25 cursor-not-allowed border border-white/[0.06]"
                      : added
                      ? "bg-emerald-500 text-white"
                      : `custom-btn ${buttonShadow ? "shadow-2xl" : ""} ${buttonUppercase ? "uppercase" : ""}`
                  }`}
                  style={
                    !isOutOfStock && !added
                      ? {
                          "--btn-bg": buttonStyle === "solid" ? buttonBg : "transparent",
                          "--btn-text": buttonStyle === "solid" ? buttonText : buttonBg,
                          "--btn-border": buttonStyle !== "solid" ? `1px solid ${buttonBg}` : "none",
                          "--btn-shadow": buttonStyle === "solid" && buttonShadow ? `0 20px 60px ${buttonBg}50` : "none",
                          borderRadius: buttonRadius,
                        } as React.CSSProperties
                      : { borderRadius: buttonRadius }
                  }
                >
                  {isOutOfStock ? (
                    "Sold Out"
                  ) : added ? (
                    <><Check size={14} strokeWidth={3} /> Added to Bag</>
                  ) : (
                    <><ShoppingBag size={14} /> {storefrontDesign.addToBagLabel || settings?.design?.addToBagLabel || getCopy(settings?.design, "addToBagLabel") || "Add to Bag"}</>
                  )}
                </motion.button>

                <button
                  onClick={() => book && toggleWish(book.id)}
                  aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                  title={wished ? "In wishlist" : "Save to wishlist"}
                  className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-all ${
                    wished
                      ? "border-rose-400/40 bg-rose-500/10 text-rose-400"
                      : "border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 text-white/40"
                  }`}
                >
                  <Heart size={15} fill={wished ? "currentColor" : "none"} />
                </button>

                {showSocialShare && (
                  <button
                    onClick={handleShare}
                    className="w-16 h-16 rounded-2xl border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.06] hover:border-white/20 transition-all"
                    title="Share"
                  >
                    <Share2 size={15} className="text-white/40" />
                  </button>
                )}
              </div>

              {/* Trust signals */}
              {showTrustSignals !== false && (
                <div className="grid grid-cols-3 gap-3 pt-4">
                  <div className="flex items-center gap-2 text-[9px] tracking-widest text-white/40 uppercase">
                    <Truck size={12} className="text-white/30" /> {storefrontDesign.productTrust1 || settings?.design?.productTrust1 || getCopy(settings?.design, "productTrust1") || "Tracked Shipping"}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] tracking-widest text-white/40 uppercase">
                    <ShieldCheck size={12} className="text-white/30" /> {storefrontDesign.productTrust2 || settings?.design?.productTrust2 || getCopy(settings?.design, "productTrust2") || "14-Day Returns"}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] tracking-widest text-white/40 uppercase">
                    <Package size={12} className="text-white/30" /> {storefrontDesign.productTrust3 || settings?.design?.productTrust3 || getCopy(settings?.design, "productTrust3") || "Ships in 1-2 Days"}
                  </div>
                </div>
              )}

              {/* Frequently Bought Together Widget */}
              {showBundleWidget !== false && bundleBook && (
                <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
                  <h4 className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40">Frequently Bought Together</h4>
                  <div className="flex flex-col sm:flex-row items-center gap-6 bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden group/bundle hover:border-violet-500/20 transition-all">
                    {/* Cover Art Previews */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 aspect-[3/4] bg-neutral-950 rounded-xl border border-white/10 shadow-lg shrink-0">
                        <img src={photos[0]?.url || DEFAULT_IMAGE} alt={book.title} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-white/20 font-black text-lg">+</span>
                      <div className="w-16 aspect-[3/4] bg-neutral-950 rounded-xl border border-white/10 shadow-lg shrink-0">
                        <img src={bundleBook.photos?.[0]?.url || DEFAULT_IMAGE} alt={bundleBook.title} className="w-full h-full object-cover" />
                      </div>
                    </div>

                    {/* Bundle Info & CTA */}
                    <div className="flex-1 flex flex-col gap-4 text-center sm:text-left">
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase leading-tight truncate max-w-[200px]">{book.title} + {bundleBook.title}</p>
                        <p className="text-[10px] text-white/40 mt-1.5 font-mono">
                          Total: <span className="text-white font-black">{formatPrice((isOnSale ? salePrice : retailPrice) + (bundleBook.isOnSale && bundleBook.salePrice ? bundleBook.salePrice : bundleBook.retailPrice))}</span>
                        </p>
                      </div>
                      <button
                        onClick={handleAddBothToBag}
                        disabled={addingBoth}
                        className={`w-full sm:w-fit text-[9px] font-black tracking-[0.2em] px-6 py-3.5 transition-all active:scale-95 custom-btn ${
                          buttonShadow ? "shadow-[0_10px_30px_rgba(124,58,237,0.25)]" : ""
                        } ${buttonUppercase ? "uppercase" : ""}`}
                        style={{
                          "--btn-bg": buttonStyle === "solid" ? buttonBg : "transparent",
                          "--btn-text": buttonStyle === "solid" ? buttonText : buttonBg,
                          "--btn-border": buttonStyle !== "solid" ? `1px solid ${buttonBg}` : "none",
                          borderRadius: buttonRadius,
                        } as React.CSSProperties}
                      >
                        {addingBoth ? "Adding Both..." : "Add Both to Bag"}
                      </button>
                    </div>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>

        {/* ── Related books ── */}
        {showRelatedProducts && otherBooks.length > 0 && (
          <section className="relative z-10 mt-16 border-t border-white/[0.06]">
            <div className="max-w-8xl mx-auto px-6 py-20">
              <div className="flex items-center gap-6 mb-12">
                <h2 className="text-[10px] font-black tracking-[0.5em] text-white/30 uppercase">
                  {getCopy(settings?.design, "relatedHeading")}
                </h2>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 lg:gap-8">
                {otherBooks.map((rel, i) => {
                  const relSlug  = (rel as any).slug || rel.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                  const relStock = (rel as any).stockLevel ?? 999;
                  const relPrice = (rel as any).retailPrice ?? 0;
                  return (
                    <motion.article
                      key={rel.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="group"
                    >
                      <Link to={`/books/${relSlug}`}>
                        <div className="relative aspect-[3/4] bg-neutral-950 rounded-[1.5rem] overflow-hidden mb-4 border border-white/[0.05] group-hover:border-white/[0.12] transition-all shadow-xl">
                          <img
                            src={(rel as any).photos?.[0]?.url || DEFAULT_IMAGE}
                            alt={rel.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          {relStock === 0 && (
                            <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                              <span
                                className="text-[8px] font-black tracking-widest uppercase border px-4 py-2 rounded-full"
                                style={{
                                  backgroundColor: badgeBgSecondary,
                                  color: badgeTextSecondary,
                                  borderColor: `${badgeTextSecondary}33`,
                                }}
                              >
                                Sold Out
                              </span>
                            </div>
                          )}
                          {/* hover shine */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <p className="text-[10px] font-black tracking-wider text-white/50 group-hover:text-white transition-colors uppercase leading-tight mb-1">
                          {rel.title}
                        </p>
                        {relPrice > 0 && (
                          <p className="text-[11px] font-medium text-white/25 group-hover:text-white/50 transition-colors">
                            {formatPrice(relPrice)}
                          </p>
                        )}
                      </Link>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Reviews ── */}
        {book && <ReviewsSection bookId={book.id} />}

        {/* ── Recently viewed ── */}
        <RecentlyViewedRow excludeId={book?.id} />

        {/* ── Footer ── */}
        <footer className="relative z-10 border-t border-white/[0.06] py-10 text-center">
          <p className="text-[9px] font-black tracking-[0.4em] text-white/20 uppercase">
            © {new Date().getFullYear()} Lyricalmyrical Books · Toronto, Canada
          </p>
        </footer>
      </main>
    </div>
  );
}
