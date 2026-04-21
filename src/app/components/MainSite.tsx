import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Instagram, Mail, ArrowRight, Send } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router";
import { useCart } from "../CartContext";
import { CATEGORIES, DEFAULT_IMAGE } from "../features/site/constants";
import { getFeaturedBooks, getFilteredItems, getPublications, getPublishedBooks } from "../features/site/selectors";
import type { Book } from "../features/site/types";
import { useSiteData } from "../features/site/useSiteData";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";
import * as Sections from "./SectionComponents";

// ──────────────────────────────
// Image with skeleton loader
// ──────────────────────────────
function SkeletonImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-800 animate-pulse" />
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
  return (
    <div className="h-screen bg-[#030213] text-white flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center mb-4">
        <span className="text-lg">🔧</span>
      </div>
      <h1 className="text-2xl font-light tracking-widest uppercase">Under Maintenance</h1>
      <p className="text-white/50 text-sm max-w-sm leading-relaxed">
        {message || "We are updating our archive. Please check back soon."}
      </p>
      <p className="text-[9px] tracking-[0.4em] text-white/20 uppercase mt-4">Lyricalmyrical Books · Toronto</p>
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
        className="relative z-10 w-full max-w-md bg-[#0a0a1a] border-l border-white/10 h-full overflow-y-auto flex flex-col"
      >
        <div className="flex justify-between items-center px-8 py-6 border-b border-white/10">
          <span className="text-[10px] tracking-[0.5em] text-white/40 uppercase">Information</span>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
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
function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

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
        <h3 className="text-lg font-bold tracking-tight">Join the Archive</h3>
        <p className="text-white/40 text-xs tracking-widest max-w-sm mx-auto">
          New publications, limited editions, and press announcements — delivered quietly.
        </p>
      </div>
      {status === "success" ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] tracking-[0.4em] text-white/60 uppercase"
        >
          ✓ You're on the list.
        </motion.p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-xs text-white placeholder-white/30 outline-none focus:border-white/30 transition-all"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-white text-black rounded-full px-5 py-3 text-[10px] font-bold tracking-widest hover:bg-white/90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={12} />
            {status === "loading" ? "..." : "JOIN"}
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="text-red-400 text-[10px] tracking-widest">Something went wrong. Try again.</p>
      )}
    </div>
  );
}

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
            {settings?.info?.description || "An independent publishing house based in Toronto, specializing in contemporary photography and art books."}
          </p>
        </div>

        {/* Col 2: Navigation */}
        <div className="space-y-3">
          <p className="text-white/20 text-[9px] uppercase tracking-[0.4em] mb-4">Navigate</p>
          <button onClick={onAboutOpen} className="block hover:text-white transition-colors">About</button>
          <Link to="/" className="block hover:text-white transition-colors">Shop</Link>
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
        </div>

        {/* Col 3: Policies / Info */}
        <div className="space-y-3">
          <p className="text-white/20 text-[9px] uppercase tracking-[0.4em] mb-4">Legal</p>
          {settings?.policies?.shipping && <p className="hover:text-white cursor-default transition-colors">Shipping Policy</p>}
          {settings?.policies?.returns && <p className="hover:text-white cursor-default transition-colors">Returns Policy</p>}
          {settings?.policies?.privacy && <p className="hover:text-white cursor-default transition-colors">Privacy Policy</p>}
          <p className="mt-6">{settings?.location?.city || "Toronto"}, Canada</p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5 max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-2">
        <p className="text-[9px] tracking-widest text-white/20 uppercase">
          © {new Date().getFullYear()} Lyricalmyrical Books · All rights reserved
        </p>
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
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-950" />
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
              className="px-8 py-3 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase text-black transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: design?.primaryColor || "#A855F7" }}
            >
              {activeSlide?.ctaText || "ENTER ARCHIVE"}
            </button>
            <button
              onClick={onEnterArchive}
              className="px-7 py-3 rounded-full border border-white/30 text-[10px] tracking-[0.3em] font-semibold uppercase hover:bg-white/10 transition-colors"
            >
              Shop now
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
  const location = useLocation();
  const isPreview = location.search.includes("preview=true");

  useEffect(() => {
    if (!isPreview) return;

    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === "THEME_UPDATE") {
        setDesignOverride(event.data.design);
      }
    };

    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    return () => window.removeEventListener("message", handler);
  }, [isPreview]);

  return designOverride || initialDesign;
}

// ──────────────────────────────
// Main exported component
// ──────────────────────────────
export default function MainSite({ setShowCatalog, showCatalog, setCurrentPage, currentPage, nextPage, prevPage }: any) {
  const navigate = useNavigate();
  const { cartCount, setIsCartOpen } = useCart();
  const { books, settings, pages, loading } = useSiteData();
  
  // Real-time preview override
  const activeDesign = useThemePreview(settings?.design || {});
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState("PUBLICATIONS");
  const [showAbout, setShowAbout] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const logoPosition = storefrontDesign?.logoPosition || "left";
  const isHeaderTransparent = storefrontDesign?.transparentHeader && !scrolled;

  const publications = useMemo(() => getPublications(getFeaturedBooks(books)), [books]);
  const filteredItems = useMemo(
    () => getFilteredItems(books, activeCategory, new Date().toISOString()),
    [books, activeCategory],
  );
  const publishedBooks = useMemo(() => getPublishedBooks(books), [books]);
  const legacyDesign = activeDesign;
  const heroDesign = legacyDesign.heroPage && Object.keys(legacyDesign.heroPage).length > 0
    ? legacyDesign.heroPage
    : legacyDesign;
  const storefrontDesign = legacyDesign.storefront && Object.keys(legacyDesign.storefront).length > 0
    ? legacyDesign.storefront
    : legacyDesign;
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
  const storefrontMaxWidth = Math.max(900, Math.min(1600, storefrontDesign?.containerWidth ?? 1200));
  const storefrontMobileColumns = Math.max(1, Math.min(3, storefrontDesign?.productColumnsMobile ?? 2));
  const storefrontDesktopColumns = Math.max(2, Math.min(6, storefrontDesign?.productColumnsDesktop ?? 4));
  const storefrontCardRadius = Math.max(0, Math.min(30, storefrontDesign?.cardRadius ?? 8));
  const storefrontButtonRadius = Math.max(0, Math.min(999, storefrontDesign?.buttonRadius ?? 999));
  const storefrontButtonStyle = storefrontDesign?.buttonStyle || "solid";
  const storefrontButtonUppercase = storefrontDesign?.buttonUppercase ?? true;
  const storefrontButtonShadow = storefrontDesign?.buttonShadow ?? true;
  const storefrontCtaText = storefrontDesign?.productCTA || "VIEW";
  const soldOutLabel = storefrontDesign?.soldOutLabel || "SOLD OUT";
  const showCollectionMeta = storefrontDesign?.showCollectionMeta ?? true;
  const showSoldOutBadge = storefrontDesign?.showSoldOutBadge ?? true;
  const bagLabel = storefrontDesign?.cartLabel || "BAG";
  const showAnnouncement = storefrontDesign?.showAnnouncement ?? true;
  const announcementMsg = storefrontDesign?.announcementText || settings?.announcements?.[0]?.message;
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
        className="min-h-screen overflow-y-auto selection:bg-white selection:text-black"
        style={{ fontFamily: storefrontDesign?.font || "Inter, sans-serif", backgroundColor: storefrontBg, color: storefrontText }}
      >
        {storefrontDesign?.customCss && <style>{storefrontDesign.customCss}</style>}
        {/* Promo / announcement banner */}
        {showAnnouncement && announcementMsg && (
          <div
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
          className={`${storefrontDesign?.stickyHeader ?? true ? "sticky" : "relative"} ${showAnnouncement && announcementMsg ? "top-10" : "top-0"} z-50 transition-all duration-500 ${isHeaderTransparent ? "border-transparent" : "backdrop-blur-xl border-b"}`}
          style={{
            backgroundColor: isHeaderTransparent 
              ? "transparent" 
              : `${storefrontBg}${(storefrontDesign?.headerStyle || "minimal") === "full" ? "f5" : "b3"}`,
            borderColor: isHeaderTransparent ? "transparent" : `${storefrontText}1a`,
          }}
        >
          <div className="mx-auto px-6 py-4 flex items-center justify-between gap-4" style={{ maxWidth: storefrontMaxWidth }}>
            {/* Left Section */}
            <div className={`flex items-center gap-8 md:gap-12 flex-1 ${logoPosition === "center" ? "" : "flex-initial"}`}>
              {logoPosition === "left" && (
                <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
                  {storefrontDesign?.logoUrl ? (
                    <img src={storefrontDesign.logoUrl} alt="Logo" className="object-contain" style={{ height: Math.max(20, Math.min(64, storefrontDesign?.logoHeight ?? 24)) }} />
                  ) : "F✶M"}
                </button>
              )}
              
              <nav className="hidden md:flex gap-6">
                {CATEGORIES.map((cat: string) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-[10px] tracking-[0.2em] font-medium transition-all ${
                      activeCategory === cat ? 'text-white' : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </nav>
            </div>

            {/* Center Section (Logo) */}
            {logoPosition === "center" && (
              <div className="flex-1 flex justify-center">
                <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
                  {storefrontDesign?.logoUrl ? (
                    <img src={storefrontDesign.logoUrl} alt="Logo" className="object-contain" style={{ height: Math.max(20, Math.min(64, storefrontDesign?.logoHeight ?? 24)) }} />
                  ) : "F✶M"}
                </button>
              </div>
            )}

            {/* Right Section */}
            <div className={`flex gap-6 md:gap-8 items-center flex-1 justify-end ${logoPosition === "right" ? "flex-initial" : ""}`}>
              {logoPosition === "right" && (
                <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
                  {storefrontDesign?.logoUrl ? (
                    <img src={storefrontDesign.logoUrl} alt="Logo" className="object-contain" style={{ height: Math.max(20, Math.min(64, storefrontDesign?.logoHeight ?? 24)) }} />
                  ) : "F✶M"}
                </button>
              )}

              {showCustomPages && (
                <nav className="hidden lg:flex items-center gap-6 mr-2">
                  {pages.some((p:any) => p.showInNav && p.status === "published") && (
                    <span className="text-[10px] tracking-[0.3em] font-bold text-white/20 uppercase select-none mr-2">
                      {storefrontDesign?.navHeading || "INFO"}
                    </span>
                  )}
                  {(pages || [])
                    .filter((p: any) => p.showInNav && p.status === "published")
                    .map((page: any) => (
                      <Link 
                        key={page.id} 
                        to={`/page/${page.slug}`} 
                        className="text-[10px] tracking-[0.2em] text-white/40 hover:text-white transition-colors uppercase whitespace-nowrap"
                      >
                        {page.title}
                      </Link>
                    ))}
                </nav>
              )}

              {showInformation && (
                <button
                  onClick={() => setShowAbout(true)}
                  className="text-[10px] tracking-[0.2em] text-white/50 hover:text-white transition-colors hidden md:block"
                >
                  INFORMATION
                </button>
              )}
              {showBag && (
                <button onClick={() => setIsCartOpen(true)} className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 transition-colors shadow-lg">
                  <span className="text-[10px] tracking-[0.2em] font-semibold">{bagLabel}</span>
                  {cartCount > 0 && <span className="bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">{cartCount}</span>}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto px-6 py-12 md:py-20" style={{ maxWidth: storefrontMaxWidth }}>
          <div className={`grid ${mobileColsClass} ${desktopColsClass} gap-8`} style={{ rowGap: shopSectionSpacing }}>
            {filteredItems.map((item: any, index: number) => {
              const slug = getBookSlug(item);
              const isOutOfStock = (item.stockLevel ?? 999) === 0;
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
                  <Link to={`/books/${slug}`}>
                    <div className={`relative ${imageAspectClass} bg-neutral-900/50 mb-4 overflow-hidden border border-white/5 shadow-2xl`} style={{ borderRadius: storefrontCardRadius }}>
                      <SkeletonImage
                        src={item.photos?.[0]?.url || DEFAULT_IMAGE}
                        alt={item.title}
                        className={`w-full h-full object-cover transition-transform duration-700 ease-out ${storefrontDesign?.productHoverEffect === "zoom" ? "group-hover:scale-110" : ""}`}
                      />
                      {/* Sold out ribbon */}
                      {isOutOfStock && showSoldOutBadge && (
                        <div className="absolute top-3 left-3">
                          <span className="bg-black/80 text-white/70 text-[8px] tracking-widest px-2 py-1 uppercase border border-white/20">
                            {soldOutLabel}
                          </span>
                        </div>
                      )}
                      {/* Hover overlay — show "VIEW" instead of add directly */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                        <span
                          style={{
                            backgroundColor: storefrontButtonStyle === "ghost" ? "transparent" : storefrontAccent,
                            color: storefrontButtonStyle === "solid" ? "#000000" : storefrontAccent,
                            border: storefrontButtonStyle === "outline" || storefrontButtonStyle === "ghost" ? `1px solid ${storefrontAccent}` : "none",
                            borderRadius: storefrontButtonRadius,
                          }}
                          className={`w-full py-3 text-[10px] tracking-[0.2em] font-bold text-center transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 ${storefrontButtonShadow ? "shadow-xl" : ""} ${storefrontButtonUppercase ? "uppercase" : ""}`}
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
                        {item.retailPrice > 0 && (
                          <span className="text-[10px] text-white/50">${item.retailPrice?.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </div>
        </main>

        <Newsletter />
        <SiteFooter settings={settings} pages={pages} onAboutOpen={() => setShowAbout(true)} />
        {(storefrontDesign?.showPoweredBy ?? false) && (
          <p className="text-center pb-8 text-[9px] tracking-[0.3em] uppercase opacity-50">Powered by Lyricalmyrical</p>
        )}

        {/* About panel */}
        <AnimatePresence>
          {showAbout && <AboutPanel settings={settings} pages={pages} onClose={() => setShowAbout(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  // ── Homepage (hero) ──
  return (
    <div
      className="size-full bg-[#030213] text-white overflow-hidden relative selection:bg-white selection:text-black font-sans"
      style={{ fontFamily: heroDesign?.font || "Inter, sans-serif" }}
    >
      {storefrontDesign?.customCss && <style>{storefrontDesign.customCss}</style>}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 transition-all duration-500 ${scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/5 py-4" : "bg-gradient-to-b from-black/70 to-transparent"}`}
      >
        {/* Left Section */}
        <div className={`flex items-center gap-8 flex-1 ${logoPosition === "center" ? "" : "flex-initial"}`}>
          {logoPosition === "left" && (
            <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
              {heroDesign?.logoUrl ? (
                <img src={heroDesign.logoUrl} alt="Logo" className="object-contain" style={{ height: Math.max(20, Math.min(64, heroDesign?.logoHeight ?? 24)) }} />
              ) : "F✶M"}
            </button>
          )}

          {showEnterArchive && (
            <button
              onClick={() => setShowCatalog(true)}
              className="text-[10px] md:text-xs tracking-[0.3em] font-bold text-white hover:text-white/70 transition-colors"
            >
              ENTER ARCHIVE
            </button>
          )}
        </div>

        {/* Center Section (Logo) */}
        {logoPosition === "center" && (
          <div className="flex-1 flex justify-center">
            <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
              {heroDesign?.logoUrl ? (
                <img src={heroDesign.logoUrl} alt="Logo" className="object-contain" style={{ height: Math.max(20, Math.min(64, heroDesign?.logoHeight ?? 24)) }} />
              ) : "F✶M"}
            </button>
          </div>
        )}

        {/* Right Section */}
        <div className={`flex gap-8 items-center flex-1 justify-end ${logoPosition === "right" ? "flex-initial" : ""}`}>
          {logoPosition === "right" && (
            <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
              {heroDesign?.logoUrl ? (
                <img src={heroDesign.logoUrl} alt="Logo" className="object-contain" style={{ height: Math.max(20, Math.min(64, heroDesign?.logoHeight ?? 24)) }} />
              ) : "F✶M"}
            </button>
          )}

          {showInformation && (
            <button
              onClick={() => setShowAbout(true)}
              className="text-[10px] md:text-xs tracking-[0.2em] font-medium opacity-80 hover:opacity-100 transition-opacity hidden md:block"
            >
              INFORMATION
            </button>
          )}
          
          {/* Custom Pages in Home Header */}
          {showCustomPages && (
            <nav className="hidden lg:flex items-center gap-6">
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
                    className="text-[10px] md:text-xs tracking-[0.2em] font-medium opacity-60 hover:opacity-100 transition-opacity uppercase"
                  >
                    {page.title}
                  </Link>
                ))}
            </nav>
          )}

          {showBag && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="group flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/20 transition-all shadow-lg"
            >
              <span className="text-[10px] tracking-[0.2em] font-bold">BAG</span>
              {cartCount > 0 && <span className="bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{cartCount}</span>}
            </button>
          )}
          {showSys && (
            <Link to="/admin" className="text-[10px] tracking-widest opacity-30 hover:opacity-100 transition-opacity">SYS</Link>
          )}
        </div>
      </header>

      <main className="relative w-auto overflow-hidden">
        {activeDesign.homepageSections && activeDesign.homepageSections.length > 0 ? (
          <div className="flex flex-col">
            {activeDesign.homepageSections.map((section: any) => {
              const SectionComponent = (Sections as any)[section.type];
              if (!SectionComponent) return null;
              
              return (
                <div key={section.id} id={`section-${section.id}`}>
                  <SectionComponent 
                    settings={section.settings || {}} 
                    books={books}
                    onCtaClick={() => setShowCatalog(true)}
                    onProductClick={(book: any) => navigate(`/books/${(book as any).slug || book.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)}
                    enableAnimations={heroDesign?.enableAnimations ?? true}
                  />
                </div>
              );
            })}
          </div>
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
                  className="px-8 py-3 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase text-black"
                  style={{ backgroundColor: heroDesign?.primaryColor || "#A855F7" }}
                >
                  {heroDesign?.heroCTA || "ENTER ARCHIVE"}
                </button>
              </section>
            )}
          </>
        )}
      </main>

      {/* About panel (available from homepage too) */}
      <AnimatePresence>
        {showAbout && <AboutPanel settings={settings} pages={pages} onClose={() => setShowAbout(false)} />}
      </AnimatePresence>
    </div>
  );
}
