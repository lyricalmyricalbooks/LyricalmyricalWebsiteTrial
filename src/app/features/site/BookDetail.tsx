import { motion, AnimatePresence } from "motion/react";
import { Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams, Link, useNavigate } from "react-router";
import {
  ChevronLeft, ChevronRight, ShoppingBag, ArrowLeft,
  Package, Share2, Check, BookOpen, Globe, Ruler,
  Weight, Tag, Zap, Heart, ChevronDown, Minus, Plus
} from "lucide-react";
import { useCart } from "../../CartContext";
import { useCurrency } from "../../CurrencyContext";
import { useSiteData } from "./useSiteData";
import { TemplateSections, GlobalSections } from "../../components/sectionRender";
import { getCopy } from "./storeCopy";
import { designNumber } from "./designNumber";
import { placeholderImage } from "./constants";
import type { Book } from "./types";
import { trackBookView } from "../../lib/recentlyViewed";
import { useWishlist } from "../../lib/wishlist";
import { useSEO } from "../../lib/seo";
import { funnelApi } from "../../lib/commerce";
import ReviewsSection from "./ReviewsSection";
import { LogoMark } from "../../components/LogoMark";
import RecentlyViewedRow from "./RecentlyViewedRow";
import BackInStockForm from "./BackInStockForm";
import { resolveLogoDesign } from "./selectors";
import { buildStorefrontTokenVars, RISO_STOREFRONT_CSS, risoGrainCss, STOREFRONT_TOKEN_CSS } from "./themeTokens";
import { StorefrontOverrides } from "./StorefrontOverrides";
import { aspectRatioValue } from "./imageAspect";
import { googleFontHref } from "./fonts";
import { productPageCss, productPageFontNames } from "./productPageStyle";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

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

  const primaryColor  = settings?.design?.primaryColor || "#e8402a";
  const font          = settings?.design?.font || "Inter";
  const logoDesign    = resolveLogoDesign(settings?.design?.storefront, [settings?.design?.heroPage, settings?.design]);

  const [activePhoto, setActivePhoto] = useState(0);
  const [added, setAdded]             = useState(false);
  const [addingBoth, setAddingBoth]   = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgBg, setImgBg]             = useState("transparent");
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [qty, setQty]                 = useState(1);

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
  const showBackInStock        = storefrontDesign.showBackInStock        ?? true;

  // Autonomy controls for book detail page
  const showAmbientGlow        = storefrontDesign.showAmbientGlow        ?? settings?.design?.showAmbientGlow        ?? true;
  const glowOpacity            = (storefrontDesign.glowIntensity ?? settings?.design?.glowIntensity ?? 18) / 100;
  const showSpecs              = storefrontDesign.showSpecs              ?? settings?.design?.showSpecs              ?? true;
  const showBundleWidget       = storefrontDesign.showBundleWidget       ?? settings?.design?.showBundleWidget       ?? true;

  // Redesign autonomy settings
  const productTitleSize       = storefrontDesign.productTitleSize       || "large";
  const productAlignment       = storefrontDesign.productAlignment       || "left";
  const productSubtitleWeight  = storefrontDesign.productSubtitleWeight  || "light";
  const productBorderRadius    = storefrontDesign.productBorderRadius    ?? settings?.design?.productBorderRadius ?? 32;
  const productImageGlowColor  = storefrontDesign.productImageGlowColor  || primaryColor;
  const productImageShadow     = storefrontDesign.productImageShadow     || "none";
  // "Image zoom" off turns the hover zoom off entirely, whatever the zoom amount is set to.
  const productImageHoverScale  = storefrontDesign.showZoom === false ? 1 : (storefrontDesign.productImageHoverScale ?? 1.05);
  const productImageFitClass   = storefrontDesign.productImageFit === "contain" ? "object-contain" : "object-cover";
  const productImageFit        = storefrontDesign.productImageFit === "contain" ? "contain" : "cover";
  const productImageMaxWidth   = Math.max(320, Math.min(900, Number(storefrontDesign.productImageMaxWidth) || 560));
  const productImageAspect     = aspectRatioValue(storefrontDesign.productImageAspect && storefrontDesign.productImageAspect !== "grid" ? storefrontDesign.productImageAspect : storefrontDesign.imageAspectRatio || "3:4");
  const productDetailsLayout   = storefrontDesign.productDetailsLayout   || "tabs";
  const productCtaAnimation    = storefrontDesign.productCtaAnimation    || "none";
  const productCtaWidth        = storefrontDesign.productCtaWidth        || "full";
  const productCtaSize         = storefrontDesign.productCtaSize         || "large";
  const productBundleLayout    = storefrontDesign.productBundleLayout    || "bordered";
  const showQtyStepper         = storefrontDesign.showQtyStepper         ?? settings?.design?.showQtyStepper         ?? false;
  const productDescriptionStyle = storefrontDesign.productDescriptionStyle || settings?.design?.productDescriptionStyle || "plain";

  // Tab & Accordion states
  const [detailsTab, setDetailsTab] = useState<"description" | "specs" | "reviews">("description");
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    description: true,
    specs: false,
    reviews: false
  });
  const toggleAccordion = (section: string) => {
    setOpenAccordions(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const buttonBg = storefrontDesign?.buttonColor || settings?.design?.buttonColor || settings?.design?.primaryColor || "#e8402a";
  const buttonText = storefrontDesign?.buttonTextColor || settings?.design?.buttonTextColor || "#000000";
  const buttonRadius = Math.max(0, Math.min(999, storefrontDesign?.buttonRadius ?? settings?.design?.buttonRadius ?? 999));
  const buttonStyle = storefrontDesign?.buttonStyle || settings?.design?.buttonStyle || "solid";
  const buttonUppercase = storefrontDesign?.buttonUppercase ?? settings?.design?.buttonUppercase ?? true;
  const buttonShadow = storefrontDesign?.buttonShadow ?? settings?.design?.buttonShadow ?? true;

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

  // Merge top-level design with storefront-level overrides so tokens can be set
  // at either level (storefront wins).
  const tokenSource = { ...(settings?.design || {}), ...(storefrontDesign || {}) };

  // Catalogue-card layout (Studio › Style › Product page · buy card & details).
  const pdpShowBackLink   = tokenSource.pdpShowBackLink   ?? true;
  const pdpShowBreadcrumb = tokenSource.pdpShowBreadcrumb ?? true;
  const pdpShowTag        = tokenSource.pdpShowTag        ?? true;
  const pdpTagStyle       = tokenSource.pdpTagStyle === "outline" ? "outline" : "filled";
  const pdpShowStock      = tokenSource.pdpShowStock      ?? true;
  const pdpShowCaption    = tokenSource.pdpShowCaption    ?? true;
  const pdpThumbPosition  = tokenSource.pdpThumbPosition  || "side";
  const pdpDetailsBelow   = (tokenSource.pdpDetailsPlacement || "below") === "below";
  const pdpSpecsRecord    = (tokenSource.pdpSpecsStyle || "record") === "record";
  const headingFontName   = tokenSource.headingFont || tokenSource.font || tokenSource.bodyFont;
  const pageFontNames     = Array.from(new Set([headingFontName, ...productPageFontNames(tokenSource)].filter(Boolean).map(String)));
  const titleAutoSize     = productTitleSize === "medium" ? "clamp(28px, 3.4vw, 44px)" : productTitleSize === "xlarge" ? "clamp(40px, 6vw, 84px)" : undefined;

  const css = `
    [data-fm-store] {
      ${buildStorefrontTokenVars(tokenSource)}
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
      --heading-font: ${headingFontName ? `'${String(headingFontName).replace(/['"\\;{}<>]/g, "")}', Impact, sans-serif` : "inherit"};
    }
    [data-fm-store] .custom-btn {
      background-color: var(--btn-bg) !important;
      color: var(--btn-text) !important;
      border: var(--btn-border) !important;
      box-shadow: var(--btn-shadow) !important;
    }
    [data-fm-store] .custom-btn:hover {
      background-color: var(--btn-hover-bg) !important;
      color: var(--btn-hover-text) !important;
      box-shadow: none !important;
    }
    ${STOREFRONT_TOKEN_CSS}
    ${(tokenSource as any)?.themeStyle === "riso" ? RISO_STOREFRONT_CSS + risoGrainCss(tokenSource as any) : ""}
    ${productPageCss(tokenSource)}
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
          description: (book as any).description || getCopy(settings?.design, "seoBookDescription", { title: book.title }),
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
    setQty(1);
    if (typeof window !== "undefined" && window.location.search.includes("preview=true")) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    }
  }, [slug]);

  const handleAddToCart = () => {
    if (!book) return;
    const stock = selectedVariant ? (selectedVariant.stockLevel ?? selectedVariant.stock ?? 0) : ((book as any).stockLevel ?? 999);
    if (stock === 0) return;
    addToCart(book, selectedVariant || undefined, showQtyStepper ? qty : 1);
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
      toast.success(getCopy(settings?.design, "bookLinkCopied"));
    }
  };

  const photos        = (book as any)?.photos || [{ url: placeholderImage(settings?.design) }];
  const stockLevel    = selectedVariant ? (selectedVariant.stockLevel ?? selectedVariant.stock ?? 0) : ((book as any)?.stockLevel ?? 999);
  const isOutOfStock  = stockLevel === 0;
  const retailPrice   = selectedVariant ? selectedVariant.price : ((book as any)?.retailPrice ?? 0);
  const salePrice     = selectedVariant ? 0 : ((book as any)?.salePrice   ?? 0);
  const isOnSale      = selectedVariant ? false : ((book as any)?.isOnSale && salePrice > 0);
  const activeUrl     = (selectedVariant && selectedVariant.photoUrl) ? selectedVariant.photoUrl : (photos[activePhoto]?.url || placeholderImage(settings?.design));

  // ── catalogue-card helpers ─────────────────────────────────────────────────
  const bk            = (book || {}) as any;
  const categoryLabel: string | undefined = bk.genres?.[0] || bk.categories?.[0];
  const alignCls      = productAlignment === "center" ? "items-center text-center" : "items-start text-left";
  const showThumbRail = photos.length > 1 && pdpThumbPosition !== "hidden";
  const isLowStock    = stockLevel > 0 && stockLevel !== 999 && stockLevel <= designNumber(settings?.design, "lowStockProductThreshold", 10);
  const isBackorder   = !!(selectedVariant ? (selectedVariant as any).onBackorder : (book as any)?.onBackorder);
  const stockText     = isOutOfStock
    ? getCopy(settings?.design, "soldOutLabel")
    : isBackorder ? getCopy(settings?.design, "pdpBackorder")
    : isLowStock ? getCopy(settings?.design, "pdpInStockCount", { count: stockLevel }) : getCopy(settings?.design, "pdpInStock");
  const specRows = [
    { key: "specFormat", icon: <BookOpen size={11} />, value: bk.format },
    { key: "specLanguage", icon: <Globe size={11} />, value: bk.language },
    { key: "specDimensions", icon: <Ruler size={11} />, value: bk.dimensions },
    { key: "specIsbn", icon: <Package size={11} />, value: bk.isbn },
    { key: "specWeight", icon: <Weight size={11} />, value: bk.weight },
  ].filter((r) => r.value);
  const hasSpecs = showSpecs !== false && (specRows.length > 0 || isLowStock);

  const renderSpecs = () => pdpSpecsRecord ? (
    <dl className="fm-pdp-record w-full text-left">
      {specRows.map((r) => (
        <Fragment key={r.key}><dt>{getCopy(settings?.design, r.key)}</dt><dd>{r.value}</dd></Fragment>
      ))}
      {isLowStock && (
        <><dt>{getCopy(settings?.design, "specAvailability")}</dt><dd style={{ color: lowInventoryColor }}>{getCopy(settings?.design, "specRemaining", { count: stockLevel })}</dd></>
      )}
    </dl>
  ) : (
    <div className="grid grid-cols-2 gap-3 w-full text-left">
      {specRows.map((r) => <SpecItem key={r.key} icon={r.icon} label={getCopy(settings?.design, r.key)} value={r.value} />)}
      {isLowStock && (
        <SpecItem icon={<Zap size={11} style={{ color: lowInventoryColor }} />} label={getCopy(settings?.design, "specAvailability")} value={getCopy(settings?.design, "specRemaining", { count: stockLevel })} />
      )}
    </div>
  );

  const detailTabs: { id: "description" | "specs" | "reviews"; label: string }[] = [
    { id: "description", label: getCopy(settings?.design, "tabDescription") },
    ...(hasSpecs ? [{ id: "specs" as const, label: getCopy(settings?.design, productDetailsLayout === "accordions" ? "tabSpecs" : "tabDetails") }] : []),
    { id: "reviews", label: getCopy(settings?.design, "tabReviews") },
  ];
  const activeTab = detailTabs.some((t) => t.id === detailsTab) ? detailsTab : "description";
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const n = detailTabs.length;
    const next = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    setDetailsTab(detailTabs[next].id);
    document.getElementById(`pdp-tab-${detailTabs[next].id}`)?.focus();
  };
  const detailContent = (id: string) =>
    id === "description" ? (
      <p className="max-w-[65ch] text-[15px] leading-[1.75] whitespace-pre-line">{bk.description || getCopy(settings?.design, "noDescription")}</p>
    ) : id === "specs" ? renderSpecs() : book ? (
      <ReviewsSection bookId={book.id} hideHeader={true} />
    ) : null;

  const detailsBlock = !book ? null : productDetailsLayout === "tabs" ? (
    <div className="fm-pdp-tabs w-full" data-studio-target="style:productCard|copy:Product page" data-studio-label="Product details tabs">
      <div role="tablist" aria-label={getCopy(settings?.design, "pdpDetailsAria")}>
        {detailTabs.map((t, i) => (
          <button
            key={t.id}
            id={`pdp-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            aria-controls="pdp-tabpanel"
            tabIndex={activeTab === t.id ? 0 : -1}
            onClick={() => setDetailsTab(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className="fm-pdp-tab"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="pdp-tabpanel" role="tabpanel" aria-labelledby={`pdp-tab-${activeTab}`} className="fm-pdp-panel">
        {detailContent(activeTab)}
      </div>
    </div>
  ) : productDetailsLayout === "accordions" ? (
    <div className="w-full flex flex-col gap-2.5" data-studio-target="style:productCard|copy:Product page" data-studio-label="Product details tabs">
      {detailTabs.map((t) => (
        <div key={t.id} className="fm-pdp-panel" style={{ padding: 0 }}>
          <button
            type="button"
            aria-expanded={!!openAccordions[t.id]}
            aria-controls={`pdp-acc-${t.id}`}
            onClick={() => toggleAccordion(t.id)}
            className="w-full min-h-[56px] px-5 flex items-center justify-between gap-4 text-[10px] font-black tracking-[0.28em] uppercase text-left"
          >
            <span>{t.label}</span>
            <ChevronDown size={14} className={`shrink-0 transition-transform duration-300 ${openAccordions[t.id] ? "rotate-180" : ""}`} />
          </button>
          {openAccordions[t.id] && <div id={`pdp-acc-${t.id}`} className="px-5 pb-5">{detailContent(t.id)}</div>}
        </div>
      ))}
    </div>
  ) : null;

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: settings?.design?.backgroundColor || "#050508" }}
      >
        <div className="flex flex-col items-center gap-5">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-14 h-14 rounded-[1.2rem] bg-white/[0.06] border border-white/10 flex items-center justify-center"
          >
            <Package size={20} className="text-white/50" />
          </motion.div>
          <p className="text-white/30 text-[9px] font-black tracking-[0.5em] uppercase">{getCopy(settings?.design, "bookLoading")}</p>
        </div>
      </div>
    );
  }

  // ── not found ──────────────────────────────────────────────────────────────
  if (!book) {
    return (
      <div
        data-fm-store data-studio-target="style:productPage|copy:Product page" data-studio-label="Product page"
        className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{
          backgroundColor: storefrontBg,
          color: storefrontText,
        }}
      >
        <Package size={48} strokeWidth={1} style={{ color: `${storefrontText}33` }} />
        <p className="text-sm tracking-[0.3em] uppercase" style={{ color: `${storefrontText}80` }}>{getCopy(settings?.design, "bookNotFound")}</p>
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
          {getCopy(settings?.design, "bookReturn")}
        </Link>
      </div>
    );
  }

  // ── page ───────────────────────────────────────────────────────────────────
  return (
    <div
      data-fm-store data-studio-target="style:productPage|copy:Product page|style:labels" data-studio-label="Product page"
      className="min-h-screen selection:bg-white/20"
      style={{
        fontFamily: font,
        backgroundColor: storefrontBg,
        color: storefrontText,
      }}
    >
      {pageFontNames.map((n) => <link key={n} rel="stylesheet" href={googleFontHref(n)} />)}
      <style>{css}</style>
      <StorefrontOverrides design={tokenSource} />

      {/* ── ambient glow that follows the book cover ── */}
      {showAmbientGlow !== false && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 65% 35%, ${productImageGlowColor} 0%, transparent 70%)`,
            opacity: glowOpacity,
          }}
        />
      )}

      {/* ── sticky header ── */}
      <header
        data-section="navigation"
        className="sticky top-0 z-50 border-b backdrop-blur-2xl transition-all duration-300"
        style={{
          backgroundColor: headerBgColor,
          borderColor: headerBorderColor,
        }}
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          {pdpShowBackLink && <button
            onClick={() => navigate(-1)}
            style={{ color: headerTextColor }}
            aria-label={getCopy(settings?.design, "backToCatalog")}
            className="flex items-center gap-2.5 opacity-60 hover:opacity-100 transition-opacity group min-w-[44px] min-h-[44px] shrink-0"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline text-[9px] font-black tracking-[0.35em] uppercase">{getCopy(settings?.design, "backToCatalog")}</span>
          </button>}

          <Link
            to="/"
            style={{ color: headerTextColor }}
            className="text-[11px] font-black tracking-[0.3em] opacity-80 hover:opacity-100 transition-opacity min-w-0 overflow-hidden text-ellipsis"
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
              {getCopy(settings?.design, "cartLabel")}
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
        <div className="max-w-8xl mx-auto px-4 sm:px-6 pt-2 pb-12 lg:pb-20">
          {/* ── breadcrumb ── */}
          {pdpShowBreadcrumb && (
            <nav
              aria-label={getCopy(settings?.design, "pdpBreadcrumbAria")}
              data-studio-target="style:productCard|copy:Product page" data-studio-label="Breadcrumb"
              className="fm-pdp-crumb fm-pdp-meta"
            >
              <Link to="/">{getCopy(settings?.design, "pdpCrumbShop")}</Link>
              {categoryLabel && (
                <>
                  <span aria-hidden="true">/</span>
                  <Link to={`/collections/${slugify(categoryLabel)}`}>{categoryLabel}</Link>
                </>
              )}
              <span aria-hidden="true">/</span>
              <span aria-current="page" className="min-w-0 truncate">{book.title}</span>
            </nav>
          )}

          <div className={`mt-8 lg:mt-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-10 xl:gap-14 items-start ${
            productContentPosition === "left" ? "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1" : ""
          }`}>

            {/* ── PHOTO COLUMN ── */}
            <div
              data-section="products"
              data-studio-target="style:productCard" data-studio-label="Product photos"
              className="w-full min-w-0 mx-auto lg:mx-0 lg:justify-self-end"
              style={{ maxWidth: productImageMaxWidth + (showThumbRail && pdpThumbPosition === "side" ? 90 : 0) }}
            >
              {productImageLayout === "slider" ? (
                <div className="fm-pdp-media" data-thumbs={showThumbRail ? pdpThumbPosition : "none"}>
                  {/* Thumbnail rail */}
                  {showThumbRail && (
                    <div className="fm-pdp-rail" role="group" aria-label={getCopy(settings?.design, "pdpPhotosAria")}>
                      {photos.map((photo: any, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActivePhoto(i)}
                          aria-current={activePhoto === i}
                          aria-label={getCopy(settings?.design, "ariaGoToPhoto", { n: i + 1 })}
                          className="fm-pdp-thumb"
                          style={{ aspectRatio: productImageAspect }}
                        >
                          <img src={photo.url} alt="" loading="lazy" decoding="async" className="w-full h-full" style={{ objectFit: productImageFit }} />
                        </button>
                      ))}
                    </div>
                  )}

                  <figure className="m-0 min-w-0">
                    {/* Main image */}
                    <div
                      className={`relative overflow-hidden fm-surface fm-pdp-frame transition-all duration-300 ${
                        productImageShadow === "none" ? "shadow-none" :
                        productImageShadow === "sm" ? "shadow-sm" :
                        productImageShadow === "md" ? "shadow-md" :
                        productImageShadow === "xl" ? "shadow-[0_50px_150px_rgba(0,0,0,0.85)]" : "shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
                      }`}
                      style={{ borderRadius: `${productBorderRadius}px`, aspectRatio: productImageAspect }}
                    >
                      {/* shimmer */}
                      {!imageLoaded && (
                        <div className="absolute inset-0 fm-surface-2 animate-pulse" />
                      )}

                      <AnimatePresence mode="wait">
                        <motion.img
                          key={activePhoto}
                          src={activeUrl}
                          alt={getCopy(settings?.design, "bookPhotoAlt", { title: book.title, n: activePhoto + 1 })}
                          className={`w-full h-full ${productImageFitClass}`}
                          decoding="async"
                          {...(activePhoto === 0 ? { fetchpriority: "high" } : {})}
                          initial={{ opacity: 0, scale: 1.04 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          whileHover={{ scale: productImageHoverScale }}
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
                            {getCopy(settings?.design, "soldOutLabel")}
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
                            {getCopy(settings?.design, "saleBadgeLabel")}
                          </span>
                        </div>
                      )}

                      {/* Low stock */}
                      {stockLevel > 0 && stockLevel !== 999 && stockLevel <= designNumber(settings?.design, "lowStockCardThreshold", 5) && (
                        <div className="absolute bottom-5 left-5 right-5">
                          <div
                            className="bg-black/70 backdrop-blur-md border rounded-2xl px-4 py-3 flex items-center gap-2"
                            style={{ borderColor: `${lowInventoryColor}40` }}
                          >
                            <Zap size={12} className="shrink-0" style={{ color: lowInventoryColor }} />
                            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: lowInventoryColor }}>
                              {getCopy(settings?.design, "onlyLeft", { count: stockLevel })}
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
                            aria-label={getCopy(settings?.design, "ariaPrevPhoto")}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-black/80 hover:border-white/20 transition-all disabled:opacity-20"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={() => setActivePhoto(p => Math.min(photos.length - 1, p + 1))}
                            disabled={activePhoto === photos.length - 1}
                            aria-label={getCopy(settings?.design, "ariaNextPhoto")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-black/80 hover:border-white/20 transition-all disabled:opacity-20"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </>
                      )}

                      {/* Dot indicators (only when the thumbnail rail is hidden) */}
                      {photos.length > 1 && !showThumbRail && (
                        <div className="absolute bottom-5 right-5 flex gap-1.5">
                          {photos.map((_: any, i: number) => (
                            <button
                              key={i}
                              onClick={() => setActivePhoto(i)}
                              aria-label={getCopy(settings?.design, "ariaGoToPhoto", { n: i + 1 })}
                              className={`rounded-full transition-all ${
                                activePhoto === i ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {pdpShowCaption && (
                      <figcaption className="fm-pdp-caption fm-pdp-meta">
                        <span>{getCopy(settings?.design, "pdpCaption", { n: activePhoto + 1 })}</span>
                        {photos.length > 1 && <span>{getCopy(settings?.design, "pdpCaptionCount", { n: activePhoto + 1, total: photos.length })}</span>}
                      </figcaption>
                    )}
                  </figure>
                </div>
              ) : (
                <div className={productImageLayout === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}>
                  {photos.map((photo: any, i: number) => (
                    <div key={i} className={`${productImageLayout === "grid" && i === 0 ? "col-span-2" : ""} relative fm-surface fm-pdp-frame overflow-hidden`} style={{ aspectRatio: productImageAspect, borderRadius: `${productBorderRadius}px` }}>
                      <img src={photo.url} alt={getCopy(settings?.design, "bookPhotoAlt", { title: book.title, n: i + 1 })} loading={i === 0 ? "eager" : "lazy"} {...(i === 0 ? { fetchpriority: "high" } : {})} decoding="async" className={`w-full h-full ${productImageFitClass}`} />
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
                            {getCopy(settings?.design, "soldOutLabel")}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── INFO COLUMN ── */}
            <div data-section="products" className="flex flex-col gap-8 lg:sticky lg:top-24 w-full min-w-0">
              <div className="fm-pdp-card" data-studio-target="style:productCard|copy:Product page" data-studio-label="Buy card">

                {/* Tag · title · price · stock */}
                <div className={`fm-pdp-card-section ${alignCls}`}>
                  {pdpShowTag && (
                    <div>
                      <span className="fm-pdp-tag" data-style={pdpTagStyle}>
                        <Tag size={10} aria-hidden="true" />
                        {categoryLabel || getCopy(settings?.design, "categoryFallback")}
                      </span>
                    </div>
                  )}
                  <div className="space-y-3 w-full">
                    <h1
                      className="fm-pdp-title"
                      data-studio-target="style:productCard" data-studio-label="Product title & price"
                      style={titleAutoSize ? ({ "--pdp-title-auto": titleAutoSize } as React.CSSProperties) : undefined}
                    >
                      {book.title}
                    </h1>
                    {bk.subtitle && (
                      <p className={`text-white/40 text-xl leading-snug ${
                        productSubtitleWeight === "bold" ? "font-bold" :
                        productSubtitleWeight === "medium" ? "font-normal" : "font-light"
                      }`}>{bk.subtitle}</p>
                    )}
                    {bk.authorName && (
                      <p className="fm-pdp-meta">{bk.authorName}</p>
                    )}
                  </div>
                  <div data-section="colors" className={`flex flex-wrap items-end gap-x-5 gap-y-3 w-full ${productAlignment === "center" ? "justify-center" : "justify-between"}`}>
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                      {isOnSale ? (
                        <>
                          <span className="fm-pdp-price">{formatBookPrice(book)}</span>
                          <span className="text-white/25 line-through text-xl">{formatBookPrice(book, true)}</span>
                          <span
                            className="text-[9px] font-black tracking-widest border px-3 py-1.5 uppercase"
                            style={{
                              color: "var(--success)",
                              backgroundColor: "rgba(var(--success-rgb), 0.1)",
                              borderColor: "rgba(var(--success-rgb), 0.2)",
                            }}
                          >
                            {getCopy(settings?.design, "saveAmount", { amount: formatPrice(getBookPrice(book, true) - getBookPrice(book)) })}
                          </span>
                        </>
                      ) : (
                        <span className="fm-pdp-price">
                          {retailPrice > 0 ? (selectedVariant ? formatPrice(selectedVariant.price) : formatBookPrice(book)) : getCopy(settings?.design, "priceOnRequest")}
                        </span>
                      )}
                    </div>
                    {pdpShowStock && (
                      <span className="fm-pdp-meta fm-pdp-stock" data-state={isOutOfStock ? "out" : isLowStock ? "low" : "in"}>
                        {stockText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Format · quantity · add to bag */}
                <div className={`fm-pdp-card-section ${alignCls}`}>
                  {book.variants && book.variants.length > 0 && (
                    <div className={`flex flex-col gap-2.5 w-full ${productAlignment === "center" ? "items-center" : "items-start"}`}>
                      <span id="pdp-format-label" className="fm-pdp-meta">{getCopy(settings?.design, "bookFormatLabel")}</span>
                      <div role="group" aria-labelledby="pdp-format-label" className={`flex flex-wrap gap-2 ${productAlignment === "center" ? "justify-center" : "justify-start"}`}>
                        {book.variants.map((v: any) => {
                          const vStock = v.stockLevel ?? v.stock ?? 0;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVariant(v)}
                              aria-pressed={selectedVariant?.id === v.id}
                              data-soldout={vStock === 0}
                              className="fm-pdp-chip"
                            >
                              {v.name} · {formatPrice(v.price)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className={`flex flex-wrap gap-2.5 w-full ${
                    productCtaWidth === "auto" && productAlignment === "center" ? "justify-center" : "justify-start"
                  }`}>
                    {showQtyStepper && !isOutOfStock && (
                      <div className="fm-pdp-qty">
                        <button
                          type="button"
                          onClick={() => setQty((q) => Math.max(1, q - 1))}
                          aria-label={getCopy(settings?.design, "ariaQtyDown")}
                          disabled={qty <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <output aria-live="polite">{qty}</output>
                        <button
                          type="button"
                          onClick={() => setQty((q) => {
                            const max = stockLevel !== 999 ? stockLevel : 99;
                            return Math.min(max, q + 1);
                          })}
                          aria-label={getCopy(settings?.design, "ariaQtyUp")}
                          disabled={stockLevel !== 999 && qty >= stockLevel}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                    <motion.button
                      data-section="buttons"
                      onClick={handleAddToCart}
                      disabled={isOutOfStock}
                      whileTap={!isOutOfStock ? { scale: 0.97 } : {}}
                      animate={
                        !isOutOfStock && !added && productCtaAnimation === "pulse"
                          ? { scale: [1, 1.02, 1] }
                          : !isOutOfStock && !added && productCtaAnimation === "glow"
                          ? { boxShadow: [`0 0 0px ${buttonBg}00`, `0 0 20px ${buttonBg}50`, `0 0 0px ${buttonBg}00`] }
                          : {}
                      }
                      transition={
                        !isOutOfStock && !added && (productCtaAnimation === "pulse" || productCtaAnimation === "glow")
                          ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                          : {}
                      }
                      whileHover={
                        !isOutOfStock && !added && productCtaAnimation === "scale"
                          ? { scale: 1.04, y: -2 }
                          : {}
                      }
                      className={`${productCtaWidth === "full" ? "flex-1 min-w-[170px]" : "px-8"} min-h-[52px] flex items-center justify-center gap-3 ${
                        productCtaSize === "medium" ? "py-3" : "py-4"
                      } text-[10px] font-black tracking-[0.3em] transition-all duration-300 ${
                        isOutOfStock
                          ? "bg-white/[0.06] text-white/25 cursor-not-allowed border border-white/[0.06]"
                          : added
                          ? "fm-success-solid"
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
                        getCopy(settings?.design, "soldOutLabel")
                      ) : added ? (
                        <><Check size={14} strokeWidth={3} /> {getCopy(settings?.design, "bookAdded")}</>
                      ) : (
                        <><ShoppingBag size={14} /> {storefrontDesign.addToBagLabel || settings?.design?.addToBagLabel || getCopy(settings?.design, "addToBagLabel")}</>
                      )}
                    </motion.button>

                    <button
                      type="button"
                      data-section="colors"
                      onClick={() => book && toggleWish(book.id)}
                      aria-pressed={wished}
                      aria-label={getCopy(settings?.design, wished ? "wishlistRemoveAria" : "wishlistAddAria")}
                      title={getCopy(settings?.design, wished ? "wishlistInTitle" : "wishlistSaveTitle")}
                      className={`fm-pdp-sq transition-all ${wished ? "fm-favorite-active" : ""}`}
                    >
                      <Heart size={16} fill={wished ? "currentColor" : "none"} />
                    </button>

                    {showSocialShare && (
                      <button
                        type="button"
                        onClick={handleShare}
                        aria-label={getCopy(settings?.design, "bookShare")}
                        title={getCopy(settings?.design, "bookShare")}
                        className="fm-pdp-sq transition-all"
                      >
                        <Share2 size={16} />
                      </button>
                    )}
                  </div>

                  {isOutOfStock && showBackInStock && book && (
                    <BackInStockForm
                      key={selectedVariant?.id || "base"}
                      design={settings?.design}
                      bookId={book.id}
                      bookTitle={book.title}
                      variantId={selectedVariant?.id}
                      variantName={selectedVariant?.name}
                    />
                  )}
                </div>

                {/* Description + specs inside the card ("Sections" details layout) */}
                {productDetailsLayout === "sections" && (bk.description || hasSpecs) && (
                  <div className={`fm-pdp-card-section ${alignCls}`}>
                    {bk.description && (
                      productDescriptionStyle === "designed" ? (
                        <div className="w-full">
                          <p className="fm-pdp-meta mb-3" style={{ color: "var(--accent, #e8402a)" }}>
                            {getCopy(settings?.design, "productDescriptionLabel")}
                          </p>
                          <p className="text-[15px] leading-[1.8] whitespace-pre-line">{bk.description}</p>
                        </div>
                      ) : (
                        <p className="text-white/50 text-[14px] leading-[1.8] whitespace-pre-line">{bk.description}</p>
                      )
                    )}
                    {hasSpecs && renderSpecs()}
                  </div>
                )}
              </div>

              {!pdpDetailsBelow && detailsBlock}

              {/* Frequently Bought Together Widget */}
              {showBundleWidget !== false && bundleBook && (
                <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
                  <h4 className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40">{getCopy(settings?.design, "bundleHeading")}</h4>
                  <div className={`flex flex-col sm:flex-row items-center gap-6 rounded-3xl p-6 relative overflow-hidden group/bundle transition-all duration-300 ${
                    productBundleLayout === "glassmorphic"
                      ? "bg-white/[0.01] backdrop-blur-xl border border-white/10 fm-accent-hover-border"
                      : productBundleLayout === "card"
                      ? "fm-surface-2 shadow-2xl border-none"
                      : "bg-white/[0.02] border border-white/5 fm-accent-hover-border"
                  }`}>
                    {/* Cover Art Previews */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 fm-surface rounded-xl border border-white/10 shadow-lg shrink-0 overflow-hidden" style={{ aspectRatio: productImageAspect }}>
                        <img src={photos[0]?.url || placeholderImage(settings?.design)} alt={book.title} className="w-full h-full" style={{ objectFit: productImageFit }} />
                      </div>
                      <span className="text-white/20 font-black text-lg">+</span>
                      <div className="w-16 fm-surface rounded-xl border border-white/10 shadow-lg shrink-0 overflow-hidden" style={{ aspectRatio: productImageAspect }}>
                        <img src={bundleBook.photos?.[0]?.url || placeholderImage(settings?.design)} alt={bundleBook.title} className="w-full h-full" style={{ objectFit: productImageFit }} />
                      </div>
                    </div>

                    {/* Bundle Info & CTA */}
                    <div className="flex-1 flex flex-col gap-4 text-center sm:text-left">
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase leading-tight truncate max-w-[200px]">{book.title} + {bundleBook.title}</p>
                        <p className="text-[10px] text-white/40 mt-1.5 font-mono">
                          {getCopy(settings?.design, "bundleTotal")} <span className="text-white font-black">{formatPrice((isOnSale ? salePrice : retailPrice) + (bundleBook.isOnSale && bundleBook.salePrice ? bundleBook.salePrice : bundleBook.retailPrice))}</span>
                        </p>
                      </div>
                      <button
                        onClick={handleAddBothToBag}
                        disabled={addingBoth}
                        className={`w-full sm:w-fit text-[9px] font-black tracking-[0.2em] px-6 py-3.5 transition-all active:scale-95 custom-btn ${
                          buttonShadow ? "fm-accent-shadow" : ""
                        } ${buttonUppercase ? "uppercase" : ""}`}
                        style={{
                          "--btn-bg": buttonStyle === "solid" ? buttonBg : "transparent",
                          "--btn-text": buttonStyle === "solid" ? buttonText : buttonBg,
                          "--btn-border": buttonStyle !== "solid" ? `1px solid ${buttonBg}` : "none",
                          borderRadius: buttonRadius,
                        } as React.CSSProperties}
                      >
                        {getCopy(settings?.design, addingBoth ? "bundleAdding" : "bundleAdd")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {pdpDetailsBelow && detailsBlock && <div className="mt-12 lg:mt-16">{detailsBlock}</div>}
        </div>

        {/* ── Related books ── */}
        {showRelatedProducts && otherBooks.length > 0 && (
          <section data-section="products" className="relative z-10 mt-16 border-t border-white/[0.06]">
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
                        <div className="relative fm-surface rounded-[1.5rem] overflow-hidden mb-4 border border-white/[0.05] group-hover:border-white/[0.12] transition-all shadow-xl" style={{ aspectRatio: productImageAspect }}>
                          <img
                            src={(rel as any).photos?.[0]?.url || placeholderImage(settings?.design)}
                            alt={rel.title}
                            loading="lazy"
                            className="w-full h-full transition-transform duration-700 group-hover:scale-105"
                            style={{ objectFit: productImageFit }}
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
                                {getCopy(settings?.design, "soldOutLabel")}
                              </span>
                            </div>
                          )}
                          {/* hover shine */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <p className="fm-card-title text-[10px] font-black tracking-wider text-white/50 group-hover:text-white transition-colors uppercase leading-tight mb-1" data-studio-target="style:products" data-studio-label="Card title & price">
                          {rel.title}
                        </p>
                        {relPrice > 0 && (
                          <p className="fm-card-price-wrap fm-card-price text-[11px] font-medium text-white/25 group-hover:text-white/50 transition-colors" data-studio-target="style:products" data-studio-label="Card title & price">
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
        {productDetailsLayout === "sections" && book && <ReviewsSection bookId={book.id} />}

        {/* ── Recently viewed ── */}
        <RecentlyViewedRow excludeId={book?.id} />

        <TemplateSections design={settings?.design} templateId="productPage" books={books} />

        <GlobalSections design={settings?.design} books={books} />

        {/* ── Footer ── */}
        <footer className="relative z-10 border-t border-white/[0.06] py-10 text-center">
          <p className="text-[9px] font-black tracking-[0.4em] text-white/20 uppercase">
            {getCopy(settings?.design, "footerCopyright")}
          </p>
        </footer>
      </main>
    </div>
  );
}
