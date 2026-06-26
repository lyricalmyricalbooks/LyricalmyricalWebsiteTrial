import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Instagram, Mail, Send, Heart, User as UserIcon, Zap, Search as SearchIcon } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router";
import { useCart } from "../CartContext";
import { CATEGORIES, DEFAULT_IMAGE } from "../features/site/constants";
import {
  getFeaturedBooks,
  getFilteredItems,
  getPublications,
  getPublishedBooks,
  resolveLogoDesign,
  resolveLogoPosition,
} from "../features/site/selectors";
import type { Book } from "../features/site/types";
import { useSiteData } from "../features/site/useSiteData";
import { buildStorefrontTokenVars, STOREFRONT_TOKEN_CSS } from "../features/site/themeTokens";
import { getCopy } from "../features/site/storeCopy";
import { StoreMenu, FooterMenu } from "./StoreMenu";
import { LogoMark } from "./LogoMark";
import { ThemeToggle } from "./theme/ThemeToggle";
import { CurrencySelector, useCurrency } from "../CurrencyContext";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { SectionList, GlobalSections, TemplateSections } from "./sectionRender";
import { useWishlist } from "../lib/wishlist";
import { useSEO } from "../lib/seo";
import { CatalogControls, applyCatalogControls, type SortKey } from "../features/site/CatalogControls";
import RecentlyViewedRow from "../features/site/RecentlyViewedRow";
import { SearchOverlay } from "../features/site/SearchOverlay";

// ──────────────────────────────
// Image with skeleton loader
// ──────────────────────────────
function SkeletonImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 fm-surface-2 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// ──────────────────────────────
// Maintenance splash
// ──────────────────────────────
function MaintenancePage({ message }: { message?: string }) {
  const debug = typeof window !== "undefined" && window.location.search.includes("debug=true");
  const adminPath = debug ? "/admin?debug=true" : "/admin";

  return (
    <div className="h-screen bg-[#030213] text-white flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center mb-4">
        <span className="text-lg">🔧</span>
      </div>
      <h1 className="text-2xl font-light tracking-widest uppercase">Under Maintenance</h1>
      <p className="text-white/50 text-sm max-w-sm leading-relaxed">
        {message || "We are updating our archive. Please check back soon."}
      </p>
      <div className="mt-4 flex flex-col items-center gap-6">
        <p className="text-[9px] tracking-[0.4em] text-white/20 uppercase">Lyricalmyrical Books · Toronto</p>
        <Link 
          to={adminPath} 
          className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] tracking-[0.2em] uppercase font-bold text-white/40 hover:text-white transition-all duration-300 shadow-lg active:scale-95"
        >
          Admin Console
        </Link>
      </div>
    </div>
  );
}

// ──────────────────────────────
// About panel
// ──────────────────────────────
function AboutPanel({ settings, pages, onClose }: { settings: any; pages: any[]; onClose: () => void }) {
  const navPages = (pages || []).filter(p => p.showInNav && p.status === "published");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md fm-surface border-l border-white/10 h-full overflow-y-auto flex flex-col"
      >
        <div className="flex justify-between items-center px-8 py-6 border-b border-white/10">
          <span className="text-[10px] tracking-[0.5em] text-white/40 uppercase">Information</span>
          <button onClick={onClose} aria-label="Close information" className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={18} className="text-white/60" />
          </button>
        </div>

        <div className="flex-1 px-8 py-10 space-y-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              {settings?.info?.name || "Lyricalmyrical Books"}
            </h2>
            <p className="text-white/50 text-sm leading-relaxed">
              {settings?.info?.description || 
                "An independent publishing house based in Toronto, Canada. We specialize in contemporary photography and fine art books — curating rare editions, limited ephemera, and a growing archive of visual culture."}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[9px] tracking-[0.5em] text-white/30 uppercase">Our Mission</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              We believe photography is literature. Each book in our archive is a document — a record of vision, place, and time. We publish work that endures.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-[9px] tracking-[0.5em] text-white/30 uppercase">Contact</h3>
            {(settings?.info?.email || "lyricalmyricalbooks@gmail.com") && (
              <a
                href={`mailto:${settings?.info?.email || "lyricalmyricalbooks@gmail.com"}`}
                className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors"
              >
                <Mail size={14} />
                {settings?.info?.email || "lyricalmyricalbooks@gmail.com"}
              </a>
            )}
            {settings?.location?.city && (
              <p className="text-sm text-white/40">
                {settings.location.city}, {settings.location.state || settings.location.country}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-[9px] tracking-[0.5em] text-white/30 uppercase">Follow</h3>
            <a
              href="https://www.instagram.com/lyricalmyricalbooks"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors"
            >
              <Instagram size={14} />
              @lyricalmyricalbooks
            </a>
            <a
              href="https://www.instagram.com/julninja"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors"
            >
              <Instagram size={14} />
              @julninja (founder)
            </a>
          </div>

          <div className="pt-6 border-t border-white/10 space-y-2 text-[10px] text-white/30 font-medium">
            <Link to="/" className="block hover:text-white transition-colors">SHOP ALL</Link>
            {navPages.map(page => (
              <Link 
                key={page.id} 
                to={`/page/${page.slug}`} 
                onClick={onClose}
                className="block hover:text-white transition-colors uppercase"
              >
                {page.title}
              </Link>
            ))}
            {settings?.policies?.shipping && (
              <p className="cursor-default">Shipping Policy available</p>
            )}
          </div>
        </div>

        <div className="px-8 py-6 border-t border-white/10">
          <p className="text-[9px] tracking-widest text-white/20 uppercase">
            © {new Date().getFullYear()} Lyricalmyrical Books
          </p>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ──────────────────────────────
// Newsletter sign-up
// ──────────────────────────────
function Newsletter({ design }: { design?: any }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const buttonBg = design?.buttonColor || design?.primaryColor || "#ffffff";
  const buttonText = design?.buttonTextColor || "#000000";
  const buttonRadius = Math.max(0, Math.min(999, design?.buttonRadius ?? 999));
  const buttonStyle = design?.buttonStyle || "solid";
  const buttonUppercase = design?.buttonUppercase ?? true;
  const buttonShadow = design?.buttonShadow ?? true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setStatus("loading");
    try {
      await addDoc(collection(db, "newsletter"), {
        email,
        subscribedAt: new Date().toISOString(),
        source: "website-footer",
      });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="py-16 border-t border-white/10 text-center space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold tracking-tight">{getCopy(design, "newsletterHeading")}</h3>
        <p className="text-white/40 text-xs tracking-widest max-w-sm mx-auto">
          {getCopy(design, "newsletterText")}
        </p>
      </div>
      {status === "success" ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] tracking-[0.4em] text-white/60 uppercase"
        >
          {getCopy(design, "newsletterSuccess")}
        </motion.p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={getCopy(design, "newsletterPlaceholder")}
            required
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-xs text-white placeholder-white/30 outline-none focus:border-white/30 transition-all"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className={`px-5 py-3 text-[10px] font-bold tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 hover:scale-[1.02] ${
              buttonShadow ? "shadow-xl" : ""
            } ${buttonUppercase ? "uppercase" : ""}`}
            style={{
              backgroundColor: buttonStyle === "solid" ? buttonBg : "transparent",
              color: buttonStyle === "solid" ? buttonText : buttonBg,
              border: buttonStyle !== "solid" ? `1px solid ${buttonBg}` : "none",
              borderRadius: buttonRadius,
            }}
          >
            <Send size={12} />
            {status === "loading" ? "..." : getCopy(design, "newsletterButton")}
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="text-red-400 text-[10px] tracking-widest">{getCopy(design, "newsletterError")}</p>
      )}
    </div>
  );
}

// ──────────────────────────────
// Payment gateway icons for footer
// ──────────────────────────────
const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  visa: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.166 14.281l2.42-13.562h3.873l-2.42 13.562h-3.873zm11.393-13.064c-.754-.298-1.922-.619-3.376-.619-3.702 0-6.31 1.944-6.329 4.743-.03 2.062 1.868 3.208 3.292 3.896 1.458.706 1.95 1.155 1.942 1.785-.015.965-1.171 1.408-2.253 1.408-1.503 0-2.31-.225-3.535-.76l-.497-.238-.529 3.256c.883.402 2.512.75 4.205.766 3.935 0 6.5-1.922 6.539-4.896.02-1.618-.975-2.853-3.116-3.87-.225-.112-.45-.224-.652-.328-1.178-.568-1.579-.955-1.571-1.53.015-.515.586-1.042 1.86-1.042 1.053-.016 1.815.223 2.408.47l.285.126.547-3.336zM7.568 1.22H3.771c-.883 0-1.545.26-1.936 1.183l-5.416 11.878h4.067l.808-2.215h4.975l.471 2.215h3.585L7.568 1.22zm-2.463 7.82l1.545-4.237.887 4.237H5.105zm18.802-8.32H20.73c-.63 0-1.109.356-1.343.916l-6.427 12.665h4.067l.812-2.25h4.975l.471 2.25h3.582L23.907.72z" />
    </svg>
  ),
  mastercard: (
    <svg className="h-4 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7.5" cy="7.5" r="7.5" opacity="0.8" />
      <circle cx="16.5" cy="7.5" r="7.5" opacity="0.6" />
    </svg>
  ),
  amex: (
    <svg className="h-4 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="4" y="11" fontSize="7" fontWeight="bold" fontFamily="sans-serif">AX</text>
    </svg>
  ),
  paypal: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.825 3.328a2.535 2.535 0 00-.518-.088 6.002 6.002 0 00-1.157-.1c-1.464 0-2.88.225-4.148.653-.518.175-.852.483-1.037.954l-1.87 8.358h-3.41l2.584-11.53c.18-.8 1.054-1.282 1.867-1.282h4.5c.95 0 1.764.218 2.378.647.614.43 1.002.99 1.134 1.637.133.648-.052 1.306-.554 1.936a4.52 4.52 0 01-1.769 1.418z" />
      <path d="M12.922 7.078c.185-.47.52-.779 1.037-.954 1.268-.428 2.684-.653 4.148-.653a6.002 6.002 0 011.157.1c.175.022.35.05.518.088.75.163 1.258.625 1.488 1.32.228.694.137 1.467-.282 2.215-.49 1.026-1.4 1.844-2.585 2.32a5.556 5.556 0 01-2.115.42H13.67l-.946 4.168h-3.41L11.055 7.15l1.867-.072z" />
    </svg>
  ),
  applepay: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.59 7.07c0-1.74 1.41-2.73 1.48-2.78-.81-1.18-2.07-1.34-2.52-1.38-1.07-.11-2.09.63-2.63.63-.54 0-1.38-.62-2.27-.6-1.17.02-2.26.68-2.86 1.73-1.22 2.11-.31 5.23.87 6.93.58.83 1.26 1.76 2.16 1.73.87-.03 1.2-.56 2.26-.56 1.05 0 1.35.56 2.26.54.93-.02 1.52-.84 2.1-1.68.67-.97.94-1.92.96-1.97-.02-.01-1.85-.71-1.87-2.82zM14.73 1.77c.48-.58.8-1.38.71-2.18-.69.03-1.53.46-2.02 1.03-.42.48-.79 1.3-.7 2.08.77.06 1.53-.35 2.01-.93z" />
    </svg>
  ),
  googlepay: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="3" y="11" fontSize="7" fontWeight="bold" fontFamily="sans-serif">GPay</text>
    </svg>
  ),
  afterpay: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="2" y="10" fontSize="5" fontWeight="bold" fontFamily="sans-serif">afterpay</text>
    </svg>
  ),
  klarna: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="2" y="10" fontSize="6" fontWeight="bold" fontFamily="sans-serif">Kl.</text>
    </svg>
  ),
};

// ──────────────────────────────
// Full footer
// ──────────────────────────────
function SiteFooter({ settings, pages, onAboutOpen }: { settings: any; pages: any[]; onAboutOpen: () => void }) {
  const navPages = (pages || []).filter(p => p.showInNav && p.status === "published");
  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10 text-[11px] text-white/40">
        {/* Col 1: Brand */}
        <div className="space-y-4">
          <p className="text-white font-bold tracking-widest text-xs">LYRICALMYRICAL BOOKS</p>
          <p className="leading-relaxed max-w-xs">
            {settings?.info?.description || getCopy(settings?.design, "footerAbout")}
          </p>
        </div>

        {/* Col 2: Navigation */}
        <div className="space-y-3">
          <p className="text-white/20 text-[9px] uppercase tracking-[0.4em] mb-4">{getCopy(settings?.design, "footerNavHeading")}</p>
          {settings?.design?.menus?.footer?.length > 0 ? (
            <FooterMenu items={settings.design.menus.footer} />
          ) : (
            <>
              <button onClick={onAboutOpen} className="block hover:text-white transition-colors">About</button>
              <Link to="/" className="block hover:text-white transition-colors">Shop</Link>
              <Link to="/track" className="block hover:text-white transition-colors">Track Order</Link>
              {navPages.map(page => (
                <Link
                  key={page.id}
                  to={`/page/${page.slug}`}
                  className="block hover:text-white transition-colors"
                >
                  {page.title}
                </Link>
              ))}
              <a href="https://www.instagram.com/lyricalmyricalbooks" target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">Instagram</a>
              <a
                href={`mailto:${settings?.info?.email || "lyricalmyricalbooks@gmail.com"}`}
                className="block hover:text-white transition-colors"
              >
                Contact
              </a>
            </>
          )}
        </div>

        {/* Col 3: Policies / Info */}
        <div className="space-y-3">
          <p className="text-white/20 text-[9px] uppercase tracking-[0.4em] mb-4">{getCopy(settings?.design, "footerLegalHeading")}</p>
          {settings?.policies?.shipping && <p className="hover:text-white cursor-default transition-colors">Shipping Policy</p>}
          {settings?.policies?.returns && <p className="hover:text-white cursor-default transition-colors">Returns Policy</p>}
          {settings?.policies?.privacy && <p className="hover:text-white cursor-default transition-colors">Privacy Policy</p>}
          <p className="mt-6">{getCopy(settings?.design, "footerLocation")}</p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5 max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[9px] tracking-widest text-white/20 uppercase">
          {getCopy(settings?.design, "footerCopyright")}
        </p>

        {settings?.payments?.footerBadges?.length > 0 && (
          <div className="flex items-center gap-4 text-white/20 select-none">
            {settings.payments.footerBadges.map((badgeId: string) => {
              const icon = PAYMENT_ICONS[badgeId];
              if (!icon) return null;
              return (
                <div key={badgeId} className="opacity-30 hover:opacity-100 transition-opacity duration-300">
                  {icon}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-4">
          <a
            href="https://www.instagram.com/lyricalmyricalbooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 hover:text-white transition-colors"
          >
            <Instagram size={14} />
          </a>
          <a
            href={`mailto:${settings?.info?.email || "lyricalmyricalbooks@gmail.com"}`}
            className="text-white/20 hover:text-white transition-colors"
          >
            <Mail size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}

function HeroCarousel({ design, onEnterArchive }: { design: any; onEnterArchive: () => void }) {
  const navigate = useNavigate();
  const hero = design?.hero || {};
  const cleanedSlides = (hero.slides || []).filter((slide: any) => {
    const title = String(slide?.title || "").trim().toUpperCase();
    const subtitle = String(slide?.subtitle || "").trim().toUpperCase();
    const ctaText = String(slide?.ctaText || "").trim().toUpperCase();
    const isTemplatePlaceholder =
      title === "NEW SLIDE" &&
      subtitle === "SUBTITLE HERE" &&
      ctaText === "LEARN MORE";
    return !isTemplatePlaceholder;
  });

  const slides = cleanedSlides.length > 0
    ? cleanedSlides
    : [{
      id: "fallback",
      imageUrl: "",
      title: "F✶M",
      subtitle: "PHOTOGRAPHY & ART BOOKS",
      ctaText: "ENTER ARCHIVE",
      ctaLink: "/shop",
    }];

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = slides[activeSlideIndex] || slides[0];
  const autoRotate = hero.autoRotate ?? true;
  const rotateMs = hero.rotateMs || 5000;

  const carouselButtonBg = design?.buttonColor || design?.primaryColor || "#ffffff";
  const carouselButtonText = design?.buttonTextColor || "#000000";
  const carouselButtonRadius = Math.max(0, Math.min(999, design?.buttonRadius ?? 999));
  const carouselButtonStyle = design?.buttonStyle || "solid";
  const carouselButtonUppercase = design?.buttonUppercase ?? true;
  const carouselButtonShadow = design?.buttonShadow ?? true;

  useEffect(() => {
    if (activeSlideIndex > slides.length - 1) {
      setActiveSlideIndex(0);
    }
  }, [activeSlideIndex, slides.length]);

  const alignClass = hero.align === "left"
    ? "items-start text-left"
    : hero.align === "right"
      ? "items-end text-right"
      : "items-center text-center";

  const heightClass = "h-screen min-h-[680px]";

  useEffect(() => {
    if (!autoRotate || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((idx) => (idx + 1) % slides.length);
    }, rotateMs);
    return () => window.clearInterval(timer);
  }, [autoRotate, rotateMs, slides.length]);

  const handleSlideCta = () => {
    const link = activeSlide?.ctaLink || "/shop";
    if (link === "/shop" || link === "/") {
      onEnterArchive();
      return;
    }
    navigate(link);
  };

  return (
    <section className={`relative w-full overflow-hidden ${heightClass}`}>
      {activeSlide?.imageUrl ? (
        <img
          key={activeSlide.id}
          src={activeSlide.imageUrl}
          alt={activeSlide.title || "Homepage hero"}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 fm-surface" />
      )}
      <div className="absolute inset-0" style={{ background: "black", opacity: hero.overlayOpacity ?? 0.45 }} />

      <div className={`relative z-10 h-full flex flex-col justify-center px-8 md:px-16 ${alignClass}`}>
        <div className="max-w-2xl">
          {activeSlide?.badge && (
            <span className="inline-flex mb-5 px-4 py-1.5 border border-white/30 rounded-full text-[9px] md:text-[10px] tracking-[0.35em] font-semibold uppercase">
              {activeSlide.badge}
            </span>
          )}
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight uppercase">{activeSlide?.title || "F✶M"}</h1>
          <p className="mt-5 text-[11px] md:text-xs tracking-[0.35em] text-white/70 uppercase">{activeSlide?.subtitle || "PHOTOGRAPHY & ART BOOKS"}</p>
          <div className={`mt-10 flex flex-wrap items-center gap-4 ${
            hero.align === "left" ? "justify-start" : hero.align === "right" ? "justify-end" : "justify-center"
          }`}>
            <button
              onClick={handleSlideCta}
              className={`px-8 py-3 text-[10px] tracking-[0.3em] font-bold transition-transform hover:scale-[1.02] ${
                carouselButtonShadow ? "shadow-xl" : ""
              } ${carouselButtonUppercase ? "uppercase" : ""}`}
              style={{
                backgroundColor: carouselButtonStyle === "solid" ? carouselButtonBg : "transparent",
                color: carouselButtonStyle === "solid" ? carouselButtonText : carouselButtonBg,
                border: carouselButtonStyle !== "solid" ? `1px solid ${carouselButtonBg}` : "none",
                borderRadius: carouselButtonRadius,
              }}
            >
              {activeSlide?.ctaText || "ENTER ARCHIVE"}
            </button>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => setActiveSlideIndex((prev) => (prev - 1 + slides.length) % slides.length)}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/20 bg-black/30 flex items-center justify-center hover:bg-black/50"
            aria-label="Previous slide"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setActiveSlideIndex((prev) => (prev + 1) % slides.length)}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/20 bg-black/30 flex items-center justify-center hover:bg-black/50"
            aria-label="Next slide"
          >
            <ChevronRight size={16} />
          </button>

          <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center gap-2">
            {slides.map((slide: any, idx: number) => (
              <button
                key={slide.id || idx}
                onClick={() => setActiveSlideIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === activeSlideIndex ? "w-8 bg-white" : "w-3 bg-white/40"}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ──────────────────────────────
// Hook for real-time theme sync
// ──────────────────────────────
function useThemePreview(initialDesign: any) {
  const [designOverride, setDesignOverride] = useState<any>(null);
  const isPreview = window.location.search.includes("preview=true");

  useEffect(() => {
    // 1. Listen for iframe messages (legacy/standard)
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data && event.data.type === "THEME_UPDATE") {
        setDesignOverride(event.data.design);
        if (isPreview) window.parent.postMessage({ type: "PREVIEW_READY" }, window.location.origin);
      }
    };

    // 2. Listen for BroadcastChannel (cross-tab sync)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("site_preview_updates");
      bc.onmessage = (event) => {
        if (event.data && event.data.type === "THEME_UPDATE") {
          setDesignOverride(event.data.design);
        }
      };
    } catch (_) {}

    window.addEventListener("message", handleMessage);
    if (isPreview) window.parent.postMessage({ type: "PREVIEW_READY" }, window.location.origin);

    return () => {
      window.removeEventListener("message", handleMessage);
      bc?.close();
    };
  }, [isPreview]);

  return designOverride || initialDesign;
}

// ──────────────────────────────
// Dynamic Font Loader
// ──────────────────────────────
function GoogleFontLoader({ font }: { font: string }) {
  useEffect(() => {
    if (!font || font === "Inter") return;
    const linkId = `google-font-${font.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, "+")}:wght@400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
  }, [font]);
  return null;
}

// ──────────────────────────────
// Typography tokens — turns the editor's type settings into real CSS.
// Applied via a scoped <style> targeting [data-fm-store] so heading vs body
// fonts, weights, base size, line-height and tracking work site-wide without
// editing every component. (rem-based Tailwind sizes are left intact.)
// ──────────────────────────────
export function resolveTypography(design: any) {
  const body = design?.bodyFont || design?.font || "Inter";
  const heading = design?.headingFont || design?.font || "Inter";
  const base = design?.baseFontSize ?? (design?.fontSize === "sm" ? 15 : design?.fontSize === "lg" ? 18 : 16);
  const tracking =
    design?.letterSpacing === "ultra" ? "0.08em" : design?.letterSpacing === "wide" ? "0.03em" : "normal";
  const lineHeight = design?.lineHeight ?? 1.6;
  const headingWeight = design?.headingWeight ?? 800;
  const bodyWeight = design?.bodyWeight ?? 400;
  // Modular type scale (Type Scale Designer): a ratio like 1.25 computes h1–h6
  // from the base size. 0/undefined = off (Tailwind sizes stay untouched).
  const typeScale = design?.typeScale || 0;
  return { body, heading, base, tracking, lineHeight, headingWeight, bodyWeight, typeScale };
}

function TypographyTokens({ design }: { design: any }) {
  const t = resolveTypography(design);
  // Global button colors — every CTA reads these vars unless a section
  // overrides its own accent.
  const btnBg = design?.buttonColor || design?.primaryColor || "#A855F7";
  const btnText = design?.buttonTextColor || "#000000";
  let css = `
[data-fm-store]{
  font-family:'${t.body}',sans-serif;
  font-size:${t.base}px;
  line-height:${t.lineHeight};
  font-weight:${t.bodyWeight};
  ${buildStorefrontTokenVars(design)}
  --btn-bg:${btnBg};
  --btn-text:${btnText};
  --bg-color:${design?.backgroundColor || "#030213"};
  --text-color:${design?.textColor || "#ffffff"};
  --link-hover-color:${design?.linkColorHover || "#F61515"};
  --border-color:${design?.borderColor || "rgba(255,255,255,0.05)"};
  --btn-hover-bg:${design?.buttonHoverBgColor || "#C1BBBB"};
  --btn-hover-text:${design?.buttonHoverTextColor || "#FFFFFF"};
  --badge-text-primary:${design?.badgeTextPrimary || "#000000"};
  --badge-bg-primary:${design?.badgeBgPrimary || "#F63737"};
  --badge-text-secondary:${design?.badgeTextSecondary || "#000000"};
  --badge-bg-secondary:${design?.badgeBgSecondary || "#E0E0E0"};
  --low-inventory-color:${design?.lowInventoryColor || "#056FFA"};
}
[data-fm-store] h1,[data-fm-store] h2,[data-fm-store] h3,[data-fm-store] h4,[data-fm-store] h5,[data-fm-store] h6{
  font-family:'${t.heading}',sans-serif;
  font-weight:${t.headingWeight};
  letter-spacing:${t.tracking};
}
[data-fm-store] a:hover, [data-fm-store] button.hover-text-accent:hover {
  color: var(--link-hover-color) !important;
}
/* Keep the legacy plain border-b tied to the configurable Border color. */
[data-fm-store] .border-b {
  border-color: var(--border-color) !important;
}
/* Style hover transitions for buttons */
[data-fm-store] button.store-btn-primary:hover, [data-fm-store] a.store-btn-primary:hover {
  background-color: var(--btn-hover-bg) !important;
  color: var(--btn-hover-text) !important;
}
/* Semantic token layer: remaps white/black alpha utilities + fm-* helpers. */
${STOREFRONT_TOKEN_CSS}
`;
  if (t.typeScale) {
    const size = (steps: number) => Math.round(t.base * Math.pow(t.typeScale, steps) * 10) / 10;
    css += `
[data-fm-store] h1{font-size:${size(5)}px;line-height:1.1;}
[data-fm-store] h2{font-size:${size(4)}px;line-height:1.15;}
[data-fm-store] h3{font-size:${size(3)}px;line-height:1.2;}
[data-fm-store] h4{font-size:${size(2)}px;line-height:1.25;}
[data-fm-store] h5{font-size:${size(1)}px;line-height:1.3;}
[data-fm-store] h6{font-size:${t.base}px;line-height:1.4;}
`;
  }
  // Density system: one control rescales the vertical rhythm of every section.
  const density = design?.density;
  if (density === "compact") {
    css += `[data-fm-store] [data-section-id] > section{padding-top:3rem;padding-bottom:3rem;}`;
  } else if (density === "spacious") {
    css += `[data-fm-store] [data-section-id] > section{padding-top:8.5rem;padding-bottom:8.5rem;}`;
  }
  return (
    <>
      <GoogleFontLoader font={t.body} />
      <GoogleFontLoader font={t.heading} />
      <style>{css}</style>
    </>
  );
}

// ──────────────────────────────
// Per-section helpers: font overrides + entrance animations
// ──────────────────────────────

// Section rendering helpers (SectionFontOverride, SectionReveal, sectionInWindow)
// and the GlobalSections component now live in ./sectionRender so they can be
// shared with the standalone storefront pages (product/collection/page/cart).
// GlobalSections is imported at the top of this file.

// ──────────────────────────────
// Main exported component
// ──────────────────────────────
export default function MainSite({ setShowCatalog, showCatalog, setCurrentPage, currentPage, nextPage, prevPage }: any) {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const { formatBookPrice } = useCurrency();
  const { books, settings, pages, loading } = useSiteData();

  // Auto-open catalog view when the editor previews the shop tab
  const isCatalogPreview = window.location.search.includes("catalog=true");
  useEffect(() => {
    if (isCatalogPreview && setShowCatalog) setShowCatalog(true);
  }, [isCatalogPreview, setShowCatalog]);
  
  // Real-time preview override
  const activeDesign = useThemePreview(settings?.design || {});
  
  const legacyDesign = activeDesign;
  const heroDesign = legacyDesign.heroPage && Object.keys(legacyDesign.heroPage).length > 0
    ? legacyDesign.heroPage
    : legacyDesign;
  const storefrontDesign = legacyDesign.storefront && Object.keys(legacyDesign.storefront).length > 0
    ? legacyDesign.storefront
    : legacyDesign;
  const heroLogoDesign = resolveLogoDesign(legacyDesign.heroPage, [legacyDesign]);
  const storefrontLogoDesign = resolveLogoDesign(legacyDesign.storefront, [legacyDesign.heroPage, legacyDesign]);
  const heroLogoPosition = resolveLogoPosition(legacyDesign.heroPage, [legacyDesign]);
  const storefrontLogoPosition = resolveLogoPosition(legacyDesign.storefront, [legacyDesign.heroPage, legacyDesign]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Prioritize global categories if they exist (new behavior), otherwise fall back to storefront or legacy
  const rawCategories = activeDesign?.categories || storefrontDesign?.categories || legacyDesign?.categories || CATEGORIES;
  const categories = useMemo(() => rawCategories.map((cat: any, i: number) => {
    if (typeof cat === "string") {
      return { id: `cat-${i}`, name: cat, description: "", showInNav: true };
    }
    return cat;
  }), [rawCategories]);

  useEffect(() => {
    if (legacyDesign?.showHero === false && !showCatalog) {
      setShowCatalog(true);
    }
  }, [legacyDesign?.showHero, showCatalog, setShowCatalog]);

  const [activeCategory, setActiveCategory] = useState<any>(categories[0]);

  // Sync activeCategory if categories change
  useEffect(() => {
    if (categories.length > 0) {
      const currentName = typeof activeCategory === "string" ? activeCategory : activeCategory?.name;
      const exists = categories.find((c: any) => c.name === currentName);
      if (!exists) {
        setActiveCategory(categories[0]);
      } else if (typeof activeCategory === "string" || activeCategory?.id !== exists.id) {
        // Update to full object if it was a string or outdated
        setActiveCategory(exists);
      }
    }
  }, [categories]);
  const [showAbout, setShowAbout] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const publications = useMemo(() => getPublications(getFeaturedBooks(books)), [books]);
  const baseFilteredItems = useMemo(
    () => getFilteredItems(books, activeCategory, new Date().toISOString()),
    [books, activeCategory],
  );
  const publishedBooks = useMemo(() => getPublishedBooks(books), [books]);

  // Catalog controls: search + sort + in-stock filter
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [sort, setSort] = useState<SortKey>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);

  const filteredItems = useMemo(
    () => applyCatalogControls(baseFilteredItems, searchQuery, sort, inStockOnly, [0, Infinity]),
    [baseFilteredItems, searchQuery, sort, inStockOnly],
  );

  const { has: isWished, toggle: toggleWish, count: wishlistCount } = useWishlist();

  useSEO({
    title: showCatalog ? "Archive" : undefined,
    description: settings?.info?.description,
    image: settings?.assets?.profileUrl,
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BookStore",
      name: settings?.info?.name || "Lyricalmyrical Books",
      url: settings?.info?.website,
      description: settings?.info?.description,
    },
  });

  const isHeaderTransparent = storefrontDesign?.transparentHeader && !scrolled;

  const heroHeaderLinks = heroDesign?.headerLinks || {};
  const storefrontHeaderLinks = storefrontDesign?.headerLinks || {};
  const showEnterArchive = heroHeaderLinks.showEnterArchive ?? true;
  const showInformation = showCatalog
    ? (storefrontHeaderLinks.showInformation ?? true)
    : (heroHeaderLinks.showInformation ?? true);
  const showCustomPages = showCatalog
    ? (storefrontHeaderLinks.showCustomPages ?? true)
    : (heroHeaderLinks.showCustomPages ?? true);
  const showBag = showCatalog
    ? (storefrontHeaderLinks.showBag ?? true)
    : (heroHeaderLinks.showBag ?? true);
  const showSys = heroHeaderLinks.showSys ?? true;
  const storefrontBg = storefrontDesign?.backgroundColor || "#050505";
  const storefrontText = storefrontDesign?.textColor || "#ffffff";
  const storefrontAccent = storefrontDesign?.primaryColor || "#ffffff";
  const storefrontButtonBg = storefrontDesign?.buttonColor || storefrontAccent;
  const storefrontButtonText = storefrontDesign?.buttonTextColor || "#000000";
  const storefrontMaxWidth = Math.max(900, Math.min(1600, storefrontDesign?.containerWidth ?? 1200));
  const storefrontMobileColumns = Math.max(1, Math.min(3, storefrontDesign?.productColumnsMobile ?? 2));
  const storefrontDesktopColumns = Math.max(2, Math.min(6, storefrontDesign?.productColumnsDesktop ?? 4));
  const storefrontCardRadius = Math.max(0, Math.min(30, storefrontDesign?.cardRadius ?? 8));
  const storefrontButtonRadius = Math.max(0, Math.min(999, storefrontDesign?.buttonRadius ?? 999));
  const storefrontButtonStyle = storefrontDesign?.buttonStyle || "solid";
  const storefrontButtonUppercase = storefrontDesign?.buttonUppercase ?? true;
  const storefrontButtonShadow = storefrontDesign?.buttonShadow ?? true;

  const heroAccent = heroDesign?.primaryColor || "#ffffff";
  const heroButtonBg = heroDesign?.buttonColor || heroAccent;
  const heroButtonText = heroDesign?.buttonTextColor || "#000000";
  const heroButtonRadius = Math.max(0, Math.min(999, heroDesign?.buttonRadius ?? 999));
  const heroButtonStyle = heroDesign?.buttonStyle || "solid";
  const heroButtonUppercase = heroDesign?.buttonUppercase ?? true;
  const heroButtonShadow = heroDesign?.buttonShadow ?? true;
  const storefrontCtaText = storefrontDesign?.productCTA || "VIEW";
  const soldOutLabel = storefrontDesign?.soldOutLabel || "SOLD OUT";
  const showCollectionMeta = storefrontDesign?.showCollectionMeta ?? true;
  const showSoldOutBadge = storefrontDesign?.showSoldOutBadge ?? true;
  const showSaleBadge = storefrontDesign?.showSaleBadge ?? true;
  const saleBadgeLabel = storefrontDesign?.saleBadgeLabel || "SALE";
  const showNewBadge = storefrontDesign?.showNewBadge ?? false;
  const newBadgeLabel = storefrontDesign?.newBadgeLabel || "NEW";
  const newBadgeDays = Math.max(1, Math.min(365, storefrontDesign?.newBadgeDays ?? 30));
  const bagLabel = storefrontDesign?.cartLabel || "BAG";
  const showAnnouncement = storefrontDesign?.showAnnouncement ?? true;
  const announcementMsg = storefrontDesign?.announcementText || settings?.announcements?.[0]?.message;
  
  const headerTextColor = isHeaderTransparent ? storefrontText : (storefrontDesign?.headerColor || storefrontText);
  const headerBgColor = isHeaderTransparent ? "transparent" : (storefrontDesign?.headerBg || `${storefrontBg}${(storefrontDesign?.headerStyle || "minimal") === "full" ? "f5" : "b3"}`);
  const headerBorderColor = isHeaderTransparent ? "transparent" : (storefrontDesign?.headerColor ? `${storefrontDesign.headerColor}1a` : `${storefrontText}1a`);

  const shopSectionSpacing = Math.max(24, Math.min(120, storefrontDesign?.sectionSpacing ?? 64));
  const imageAspectClass = storefrontDesign?.imageAspectRatio === "1:1"
    ? "aspect-square"
    : storefrontDesign?.imageAspectRatio === "2:3"
    ? "aspect-[2/3]"
    : "aspect-[3/4]";
  const mobileColsClass = storefrontMobileColumns === 1 ? "grid-cols-1" : storefrontMobileColumns === 3 ? "grid-cols-3" : "grid-cols-2";
  const desktopColsClass =
    storefrontDesktopColumns === 2
      ? "lg:grid-cols-2"
      : storefrontDesktopColumns === 3
      ? "lg:grid-cols-3"
      : storefrontDesktopColumns === 5
      ? "lg:grid-cols-5"
      : storefrontDesktopColumns === 6
      ? "lg:grid-cols-6"
      : "lg:grid-cols-4";

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth'
      });
    }
  };

  const getBookSlug = (book: Book) =>
    (book as any).slug || book.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Apply Favicon
  useEffect(() => {
    if (storefrontDesign?.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = storefrontDesign.faviconUrl;
    }
  }, [storefrontDesign?.faviconUrl]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#030213] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 via-transparent to-blue-900/20" />
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)]"
        >
          <span className="text-white text-[10px] tracking-widest font-bold">F✶M</span>
        </motion.div>
        <p className="mt-8 text-[10px] tracking-[0.4em] text-white/50 uppercase font-medium">Curating Archive</p>
      </div>
    );
  }

  // Maintenance mode gate
  if (settings?.maintenance?.enabled) {
    return <MaintenancePage message={settings.maintenance.message} />;
  }

  if (showCatalog) {
    return (
      <div
        data-fm-store
        className="min-h-screen overflow-y-auto selection:bg-white selection:text-black"
        style={{ fontFamily: `'${resolveTypography(storefrontDesign).body}', sans-serif`, backgroundColor: storefrontBg, color: storefrontText }}
      >
        <TypographyTokens design={storefrontDesign} />
        {storefrontDesign?.customCss && <style>{storefrontDesign.customCss}</style>}
        {/* Promo / announcement banner */}
        {showAnnouncement && announcementMsg && (
          <div
            data-section="announcements"
            className="text-center py-2.5 px-6 text-[10px] tracking-[0.3em] font-bold uppercase sticky top-0 z-[60]"
            style={{
              backgroundColor: storefrontDesign?.announcementBg || "#000000",
              color: storefrontDesign?.announcementColor || "#ffffff",
            }}
          >
            {announcementMsg}
          </div>
        )}

        <header
          data-section="navigation"
          className={`${storefrontDesign?.stickyHeader ?? true ? "sticky" : "relative"} ${showAnnouncement && announcementMsg ? "top-10" : "top-0"} z-50 transition-all duration-500 ${isHeaderTransparent ? "border-transparent" : "backdrop-blur-xl border-b"}`}
          style={{
            backgroundColor: headerBgColor,
            borderColor: headerBorderColor,
          }}
        >
          <div className="mx-auto px-6 py-4 flex items-center justify-between gap-4" style={{ maxWidth: storefrontMaxWidth }}>
            {/* Left Section */}
            <div className={`flex items-center gap-8 md:gap-12 flex-1 ${storefrontLogoPosition === "center" ? "" : "flex-initial"}`}>
              {storefrontLogoPosition === "left" && (
                <button 
                  onClick={() => setShowCatalog(false)} 
                  style={{ color: headerTextColor }}
                  className="text-xs tracking-[0.3em] font-semibold hover:opacity-80 transition-opacity flex items-center"
                >
                  <LogoMark design={storefrontLogoDesign} />
                </button>
              )}
              
              <nav className="hidden md:flex gap-6">
                {categories.filter((c: any) => c.showInNav !== false).map((cat: any) => {
                  const catName = typeof cat === "string" ? cat : cat.name;
                  const isActive = (typeof activeCategory === "string" ? activeCategory : activeCategory?.name) === catName;
                  return (
                    <button
                      key={catName}
                      onClick={() => setActiveCategory(cat)}
                      style={{ color: headerTextColor }}
                      className={`text-[10px] tracking-[0.2em] font-medium transition-all ${
                        isActive ? "opacity-100" : "opacity-40 hover:opacity-80 hover-text-accent"
                      }`}
                    >
                      {catName}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Center Section (Logo) */}
            {storefrontLogoPosition === "center" && (
              <div className="flex-1 flex justify-center">
                <button 
                  onClick={() => setShowCatalog(false)} 
                  style={{ color: headerTextColor }}
                  className="text-xs tracking-[0.3em] font-semibold hover:opacity-80 transition-opacity flex items-center"
                >
                  <LogoMark design={storefrontLogoDesign} />
                </button>
              </div>
            )}

            {/* Right Section */}
            <div className={`flex gap-6 md:gap-8 items-center flex-1 justify-end ${storefrontLogoPosition === "right" ? "flex-initial" : ""}`}>
              {storefrontLogoPosition === "right" && (
                <button 
                  onClick={() => setShowCatalog(false)} 
                  style={{ color: headerTextColor }}
                  className="text-xs tracking-[0.3em] font-semibold hover:opacity-80 transition-opacity flex items-center"
                >
                  <LogoMark design={storefrontLogoDesign} />
                </button>
              )}

              {showCustomPages && (
                storefrontDesign?.menus?.header?.length > 0 ? (
                  <div className="mr-2" style={{ color: headerTextColor }}><StoreMenu items={storefrontDesign.menus.header} /></div>
                ) : (
                <nav className="hidden lg:flex items-center gap-6 mr-2" style={{ color: headerTextColor }}>
                  {pages.some((p:any) => p.showInNav && p.status === "published") && (
                    <span className="text-[10px] tracking-[0.3em] font-bold opacity-25 uppercase select-none mr-2">
                      {storefrontDesign?.navHeading || "INFO"}
                    </span>
                  )}
                  {(pages || [])
                    .filter((p: any) => p.showInNav && p.status === "published")
                    .map((page: any) => (
                      <Link
                        key={page.id}
                        to={`/page/${page.slug}`}
                        className="opacity-40 hover:opacity-100 transition-opacity whitespace-nowrap"
                        style={{
                          fontSize: storefrontDesign?.navLinkSize ? `${storefrontDesign.navLinkSize}px` : "10px",
                          letterSpacing: storefrontDesign?.navLinkSpacing != null ? `${storefrontDesign.navLinkSpacing}em` : "0.2em",
                          fontWeight: storefrontDesign?.navLinkWeight || undefined,
                          textTransform: (storefrontDesign?.navLinkTransform as any) || "uppercase",
                          ...(storefrontDesign?.navLinkColor && { color: storefrontDesign.navLinkColor }),
                        }}
                      >
                        {page.title}
                      </Link>
                    ))}
                </nav>
                )
              )}

              {showInformation && (
                <button
                  onClick={() => setShowAbout(true)}
                  style={{ color: headerTextColor }}
                  className="text-[10px] tracking-[0.2em] opacity-50 hover:opacity-100 transition-opacity hidden md:block"
                >
                  INFORMATION
                </button>
              )}
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                style={{ color: headerTextColor }}
                className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-all opacity-50 hover:opacity-100"
              >
                <SearchIcon size={14} />
              </button>
              <Link
                to="/wishlist"
                aria-label="Wishlist"
                style={{ color: headerTextColor }}
                className="relative hidden sm:flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-all opacity-50 hover:opacity-100"
              >
                <Heart size={14} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[8px] font-bold text-white rounded-full px-1.5 py-0.5" style={{ backgroundColor: "var(--accent)" }}>
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                to="/account"
                aria-label="Account"
                style={{ color: headerTextColor }}
                className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-all opacity-50 hover:opacity-100"
              >
                <UserIcon size={14} />
              </Link>
              <div className="hidden sm:flex items-center justify-center gap-2">
                <CurrencySelector />
                <ThemeToggle />
              </div>
              <Link
                to="/admin"
                style={{ color: headerTextColor }}
                className="hidden sm:flex items-center gap-1.5 text-[9px] tracking-[0.2em] font-bold transition-all uppercase mr-2 opacity-30 hover:opacity-100"
              >
                Admin
              </Link>
              {showBag && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className={`group flex items-center gap-2 px-4 py-2 transition-all hover:scale-[1.02] store-btn-primary ${
                    storefrontButtonShadow ? "shadow-lg" : ""
                  }`}
                  style={{
                    backgroundColor: storefrontButtonStyle === "solid" ? storefrontButtonBg : "transparent",
                    color: storefrontButtonStyle === "solid" ? storefrontButtonText : storefrontButtonBg,
                    border: storefrontButtonStyle !== "solid" ? `1px solid ${storefrontButtonBg}` : "none",
                    borderRadius: storefrontButtonRadius,
                  }}
                >
                  <span className={`text-[10px] tracking-[0.2em] font-semibold ${storefrontButtonUppercase ? "uppercase" : ""}`}>
                    {bagLabel}
                  </span>
                  {cartCount > 0 && (
                    <span
                      style={{
                        backgroundColor: storefrontButtonStyle === "solid" ? storefrontButtonText : storefrontButtonBg,
                        color: storefrontButtonStyle === "solid" ? storefrontButtonBg : storefrontButtonText,
                      }}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-colors"
                    >
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto px-6 py-12 md:py-20" style={{ maxWidth: storefrontMaxWidth }}>
          {/* Theme-editor sections authored for the storefront page template */}
          <TemplateSections design={activeDesign} templateId="storefront" books={books} />

          {/* Category Header */}
          <AnimatePresence mode="wait">
            {activeCategory && (activeCategory.description || activeCategory.imageUrl) && (
              <motion.div
                key={activeCategory.id || activeCategory.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-16 space-y-8"
              >
                {activeCategory.imageUrl && (
                  <div className="aspect-[21/9] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <img src={activeCategory.imageUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={activeCategory.name} />
                  </div>
                )}
                <div className="max-w-3xl">
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 uppercase">
                    {activeCategory.name}
                  </h2>
                  {activeCategory.description && (
                    <p className="text-sm md:text-base text-white/60 leading-relaxed font-medium">
                      {activeCategory.description}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <CatalogControls
            query={searchQuery}
            setQuery={setSearchQuery}
            sort={sort}
            setSort={setSort}
            inStockOnly={inStockOnly}
            setInStockOnly={setInStockOnly}
            resultCount={filteredItems.length}
          />

          {filteredItems.length === 0 && (
            <p className="py-20 text-center text-[10px] tracking-[0.4em] text-white/30 uppercase">
              {getCopy(storefrontDesign, "catalogEmpty")}
            </p>
          )}

          <div className={`grid ${mobileColsClass} ${desktopColsClass} gap-8`} style={{ rowGap: shopSectionSpacing }}>
            {filteredItems.map((item: any, index: number) => {
              const slug = getBookSlug(item);
              const stock = item.stockLevel ?? 999;
              const isOutOfStock = stock === 0;
              const isLowStock = stock > 0 && stock !== 999 && stock <= 5;
              const onSale = !!item.isOnSale && item.salePrice > 0 && item.salePrice < (item.retailPrice ?? 0);
              const displayPrice = onSale ? item.salePrice : item.retailPrice;
              const isNewArrival = (() => {
                if (!item.createdAt) return false;
                const created = new Date(item.createdAt).getTime();
                if (Number.isNaN(created)) return false;
                return (Date.now() - created) <= newBadgeDays * 86_400_000;
              })();
              const wished = isWished(item.id);
              return (
                <motion.article
                  key={item.id || index}
                  initial={(storefrontDesign?.enableAnimations ?? true) ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={(storefrontDesign?.enableAnimations ?? true)
                    ? { duration: 0.8, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }
                    : { duration: 0 }
                  }
                  className={`group relative transition-all duration-500 ${storefrontDesign?.productHoverEffect === "lift" ? "hover:-translate-y-2" : ""}`}
                >
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWish(item.id); }}
                    aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                    className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                      wished
                        ? "fm-favorite-active border"
                        : "bg-black/40 text-white/70 border border-white/10 hover:text-white opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Heart size={13} fill={wished ? "currentColor" : "none"} />
                  </button>
                  <Link to={`/books/${slug}`}>
                    <div className={`relative ${imageAspectClass} fm-surface mb-4 overflow-hidden border border-white/5 shadow-2xl`} style={{ borderRadius: storefrontCardRadius }}>
                      <SkeletonImage
                        src={item.photos?.[0]?.url || DEFAULT_IMAGE}
                        alt={item.title}
                        className={`w-full h-full object-cover transition-transform duration-700 ease-out ${storefrontDesign?.productHoverEffect === "zoom" ? "group-hover:scale-110" : ""}`}
                      />
                      {/* Status ribbons */}
                      <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
                        {isOutOfStock && showSoldOutBadge && (
                          <span 
                            style={{ backgroundColor: storefrontDesign?.badgeBgSecondary || "rgba(0,0,0,0.8)", color: storefrontDesign?.badgeTextSecondary || "rgba(255,255,255,0.7)" }}
                            className="text-[8px] tracking-widest px-2 py-1 uppercase border border-white/20"
                          >
                            {soldOutLabel}
                          </span>
                        )}
                        {!isOutOfStock && onSale && showSaleBadge && (
                          <span 
                            style={{ backgroundColor: storefrontDesign?.badgeBgPrimary || "rgb(244 63 94 / 0.9)", color: storefrontDesign?.badgeTextPrimary || "#ffffff" }}
                            className="text-[8px] font-bold tracking-widest px-2 py-1 uppercase border border-white/10 rounded-sm"
                          >
                            {saleBadgeLabel}
                          </span>
                        )}
                        {!isOutOfStock && isNewArrival && showNewBadge && (
                          <span 
                            style={{ backgroundColor: storefrontDesign?.badgeBgPrimary || "rgb(16 185 129 / 0.9)", color: storefrontDesign?.badgeTextPrimary || "#000000" }}
                            className="text-[8px] font-bold tracking-widest px-2 py-1 uppercase border border-white/10 rounded-sm"
                          >
                            {newBadgeLabel}
                          </span>
                        )}
                        {!isOutOfStock && isLowStock && (
                          <span 
                            style={{ 
                              color: storefrontDesign?.lowInventoryColor || "#f59e0b",
                              borderColor: `${storefrontDesign?.lowInventoryColor || "#f59e0b"}40`,
                              backgroundColor: `${storefrontDesign?.lowInventoryColor || "#f59e0b"}15`
                            }}
                            className="flex items-center gap-1 border backdrop-blur-md text-[8px] tracking-widest px-2 py-1 uppercase rounded-full"
                          >
                            <Zap size={9} /> Only {stock} left
                          </span>
                        )}
                      </div>
                      {/* Hover overlay — show "VIEW" instead of add directly */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                        <span
                          style={{
                            backgroundColor: storefrontButtonStyle === "solid" ? storefrontButtonBg : "transparent",
                            color: storefrontButtonStyle === "solid" ? storefrontButtonText : storefrontButtonBg,
                            border: storefrontButtonStyle !== "solid" ? `1px solid ${storefrontButtonBg}` : "none",
                            borderRadius: storefrontButtonRadius,
                          }}
                          className={`w-full py-3 text-[10px] tracking-[0.2em] font-bold text-center transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 store-btn-primary ${storefrontButtonShadow ? "shadow-xl" : ""} ${storefrontButtonUppercase ? "uppercase" : ""}`}
                        >
                          {isOutOfStock ? soldOutLabel : storefrontCtaText}
                        </span>
                      </div>
                    </div>
                    <div className="px-1">
                      <h3 className="text-xs tracking-wider font-medium leading-relaxed uppercase text-white/90">{item.title}</h3>
                      <div className="mt-2 flex items-center justify-between">
                        {showCollectionMeta ? (
                          <span className="text-[10px] tracking-[0.1em] text-white/40">
                            {item.genres?.[0] || item.categories?.[0] || "Publication"}
                          </span>
                        ) : (
                          <span />
                        )}
                        {displayPrice > 0 && (
                          <span className="text-[10px] flex items-center gap-1.5">
                            {onSale && (
                              <span className="text-white/30 line-through">{formatBookPrice(item, true)}</span>
                            )}
                            <span className={onSale ? "fm-success-text font-semibold" : "text-white/50"}>{formatBookPrice(item)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </div>
        </main>

        <GlobalSections
          design={activeDesign}
          books={books}
          onCtaClick={() => setShowCatalog(true)}
          onProductClick={(book: any) =>
            navigate(`/books/${(book as any).slug || book.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)
          }
        />
        <RecentlyViewedRow />
        <Newsletter design={settings?.design} />
        <SiteFooter settings={settings} pages={pages} onAboutOpen={() => setShowAbout(true)} />
        {(storefrontDesign?.showPoweredBy ?? false) && (
          <p className="text-center pb-8 text-[9px] tracking-[0.3em] uppercase opacity-50">Powered by Lyricalmyrical</p>
        )}

        {/* About panel */}
        <AnimatePresence>
          {showAbout && <AboutPanel settings={settings} pages={pages} onClose={() => setShowAbout(false)} />}
        </AnimatePresence>

        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} books={publishedBooks} />
      </div>
    );
  }

  // Homepage (hero) ──
  const homeHeaderTextColor = scrolled ? (heroDesign?.headerColor || "#ffffff") : "#ffffff";

  return (
    <div
      data-fm-store
      className="min-h-screen w-full overflow-x-hidden relative selection:bg-white selection:text-black font-sans"
      style={{ 
        fontFamily: `'${resolveTypography(heroDesign).body}', sans-serif`,
        backgroundColor: heroDesign?.backgroundColor || "#030213",
        color: heroDesign?.textColor || "#ffffff"
      }}
    >
      <TypographyTokens design={heroDesign} />
      {storefrontDesign?.customCss && <style>{storefrontDesign.customCss}</style>}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 transition-all duration-500 border-b ${scrolled ? "backdrop-blur-xl py-4" : "border-transparent bg-gradient-to-b from-black/70 to-transparent"}`}
        style={{
          backgroundColor: scrolled ? (heroDesign?.headerBg || "rgba(0,0,0,0.8)") : "transparent",
          borderColor: scrolled ? (heroDesign?.headerColor ? `${heroDesign.headerColor}1a` : "rgba(255,255,255,0.05)") : "transparent",
          color: homeHeaderTextColor
        }}
      >
        {/* Left Section */}
        <div className={`flex items-center gap-8 flex-1 ${heroLogoPosition === "center" ? "" : "flex-initial"}`}>
          {heroLogoPosition === "left" && (
            <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
              <LogoMark design={heroLogoDesign} />
            </button>
          )}

          {showEnterArchive && (
            <button
              onClick={() => setShowCatalog(true)}
              style={{ color: homeHeaderTextColor }}
              className="text-[10px] md:text-xs tracking-[0.3em] font-bold hover:opacity-75 transition-opacity"
            >
              ENTER ARCHIVE
            </button>
          )}
        </div>

        {/* Center Section (Logo) */}
        {heroLogoPosition === "center" && (
          <div className="flex-1 flex justify-center">
            <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
              <LogoMark design={heroLogoDesign} />
            </button>
          </div>
        )}

        {/* Right Section */}
        <div className={`flex gap-8 items-center flex-1 justify-end ${heroLogoPosition === "right" ? "flex-initial" : ""}`}>
          {heroLogoPosition === "right" && (
            <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
              <LogoMark design={heroLogoDesign} />
            </button>
          )}

          {showInformation && (
            <button
              onClick={() => setShowAbout(true)}
              style={{ color: homeHeaderTextColor }}
              className="text-[10px] md:text-xs tracking-[0.2em] font-medium opacity-80 hover:opacity-100 transition-opacity hidden md:block"
            >
              INFORMATION
            </button>
          )}
          
          {/* Custom Pages in Home Header */}
          {showCustomPages && (
            heroDesign?.menus?.header?.length > 0 ? (
              <div style={{ color: homeHeaderTextColor }}><StoreMenu items={heroDesign.menus.header} /></div>
            ) : (
            <nav className="hidden lg:flex items-center gap-6" style={{ color: homeHeaderTextColor }}>
              {pages.some((p: any) => p.showInNav && p.status === "published") && (
                <span className="text-[10px] md:text-xs tracking-[0.3em] font-bold text-white/20 uppercase select-none mr-2">
                  {heroDesign?.navHeading || "INFO"}
                </span>
              )}
              {(pages || [])
                .filter((p: any) => p.showInNav && p.status === "published")
                .map((page: any) => (
                  <Link
                    key={page.id}
                    to={`/page/${page.slug}`}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    style={{
                      fontSize: heroDesign?.navLinkSize ? `${heroDesign.navLinkSize}px` : "10px",
                      letterSpacing: heroDesign?.navLinkSpacing != null ? `${heroDesign.navLinkSpacing}em` : "0.2em",
                      fontWeight: heroDesign?.navLinkWeight || "500",
                      textTransform: (heroDesign?.navLinkTransform as any) || "uppercase",
                      ...(heroDesign?.navLinkColor && { color: heroDesign.navLinkColor }),
                    }}
                  >
                    {page.title}
                  </Link>
                ))}
            </nav>
            )
          )}

          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            style={{ color: homeHeaderTextColor }}
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-all opacity-70 hover:opacity-100"
          >
            <SearchIcon size={15} />
          </button>
          {showBag && (
            <button
              onClick={() => setIsCartOpen(true)}
              className={`group flex items-center gap-2 px-5 py-2.5 transition-all hover:scale-[1.02] store-btn-primary ${
                heroButtonShadow ? "shadow-lg" : ""
              }`}
              style={{
                backgroundColor: heroButtonStyle === "solid" ? heroButtonBg : "transparent",
                color: heroButtonStyle === "solid" ? heroButtonText : heroButtonBg,
                border: heroButtonStyle !== "solid" ? `1px solid ${heroButtonBg}` : "none",
                borderRadius: heroButtonRadius,
              }}
            >
              <span className={`text-[10px] tracking-[0.2em] font-bold ${heroButtonUppercase ? "uppercase" : ""}`}>
                {bagLabel}
              </span>
              {cartCount > 0 && (
                <span
                  style={{
                    backgroundColor: heroButtonStyle === "solid" ? heroButtonText : heroButtonBg,
                    color: heroButtonStyle === "solid" ? heroButtonBg : heroButtonText,
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors"
                >
                  {cartCount}
                </span>
              )}
            </button>
          )}
          {showSys && (
            <Link to="/admin" style={{ color: homeHeaderTextColor }} className="text-[10px] tracking-widest opacity-30 hover:opacity-100 transition-opacity">SYS</Link>
          )}
        </div>
      </header>

      <main className="relative w-auto overflow-hidden">
        {(heroDesign.sections || heroDesign.homepageSections || activeDesign.homepageSections) &&
        (heroDesign.sections || heroDesign.homepageSections || activeDesign.homepageSections).length > 0 ? (
          <SectionList
            sections={heroDesign.sections || heroDesign.homepageSections || activeDesign.homepageSections}
            colorSchemes={
              heroDesign.colorSchemes && heroDesign.colorSchemes.length > 0
                ? heroDesign.colorSchemes
                : activeDesign.colorSchemes
            }
            books={books}
            onCtaClick={() => setShowCatalog(true)}
            onProductClick={(book: any) =>
              navigate(`/books/${(book as any).slug || book.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)
            }
            enableAnimations={heroDesign?.enableAnimations ?? true}
            dataSection="homepage"
          />
        ) : (
          /* Fallback to legacy structure */
          <>
            {(heroDesign?.hero?.enabled ?? true) ? (
              <HeroCarousel design={heroDesign} onEnterArchive={() => setShowCatalog(true)} />
            ) : (
              <section className="h-screen min-h-[680px] flex flex-col items-center justify-center text-center px-8">
                <p className="text-[12px] tracking-[0.3em] text-white/60 uppercase mb-6">
                  {heroDesign?.heroSubtext || "Discover rare editions and exclusive prints."}
                </p>
                <button
                  onClick={() => setShowCatalog(true)}
                  className={`px-8 py-3 text-[10px] tracking-[0.3em] font-bold transition-transform hover:scale-[1.02] ${
                    heroButtonShadow ? "shadow-xl" : ""
                  } ${heroButtonUppercase ? "uppercase" : ""}`}
                  style={{
                    backgroundColor: heroButtonStyle === "solid" ? heroButtonBg : "transparent",
                    color: heroButtonStyle === "solid" ? heroButtonText : heroButtonBg,
                    border: heroButtonStyle !== "solid" ? `1px solid ${heroButtonBg}` : "none",
                    borderRadius: heroButtonRadius,
                  }}
                >
                  {heroDesign?.heroCTA || "ENTER ARCHIVE"}
                </button>
              </section>
            )}
          </>
        )}
      </main>

      <GlobalSections
        design={activeDesign}
        books={books}
        onCtaClick={() => setShowCatalog(true)}
        onProductClick={(book: any) =>
          navigate(`/books/${(book as any).slug || book.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)
        }
      />

      {/* About panel (available from homepage too) */}
      <AnimatePresence>
        {showAbout && <AboutPanel settings={settings} pages={pages} onClose={() => setShowAbout(false)} />}
      </AnimatePresence>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} books={publishedBooks} />
    </div>
  );
}
