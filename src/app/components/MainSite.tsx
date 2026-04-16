import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Instagram, Mail, ArrowRight, Send } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useCart } from "../CartContext";
import { CATEGORIES, DEFAULT_IMAGE } from "../features/site/constants";
import { getFeaturedBooks, getFilteredItems, getPublications, getPublishedBooks } from "../features/site/selectors";
import type { Book } from "../features/site/types";
import { useSiteData } from "../features/site/useSiteData";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";

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
function AboutPanel({ settings, onClose }: { settings: any; onClose: () => void }) {
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

          <div className="pt-6 border-t border-white/10 space-y-2 text-[10px] text-white/30">
            <Link to="/" className="block hover:text-white/60 transition-colors">← Shop</Link>
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
function SiteFooter({ settings, onAboutOpen }: { settings: any; onAboutOpen: () => void }) {
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

// ──────────────────────────────
// Main exported component
// ──────────────────────────────
export default function MainSite({ setShowCatalog, showCatalog, setCurrentPage, currentPage, nextPage, prevPage }: any) {
  const navigate = useNavigate();
  const { cartCount, setIsCartOpen } = useCart();
  const { books, settings, loading } = useSiteData();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState("PUBLICATIONS");
  const [showAbout, setShowAbout] = useState(false);

  const publications = useMemo(() => getPublications(getFeaturedBooks(books)), [books]);
  const filteredItems = useMemo(
    () => getFilteredItems(books, activeCategory, new Date().toISOString()),
    [books, activeCategory],
  );
  const publishedBooks = useMemo(() => getPublishedBooks(books), [books]);

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
    const announcementMsg = settings?.announcements?.[0]?.message;

    return (
      <div
        className="min-h-screen bg-[#050505] text-white overflow-y-auto selection:bg-white selection:text-black"
        style={{ fontFamily: settings?.design?.font || 'Inter, sans-serif' }}
      >
        {/* Promo / announcement banner */}
        {announcementMsg && (
          <div className="bg-white text-black text-center py-2.5 px-6 text-[10px] tracking-[0.3em] font-bold uppercase sticky top-0 z-[60]">
            {announcementMsg}
          </div>
        )}

        <header className={`sticky ${announcementMsg ? "top-10" : "top-0"} z-50 bg-black/40 backdrop-blur-xl border-b border-white/10 transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-8 md:gap-12">
              <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
                {settings?.design?.logoUrl ? (
                  <img src={settings.design.logoUrl} alt="Logo" className="h-6 object-contain" />
                ) : "F✶M"}
              </button>
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
            <div className="flex gap-6 items-center">
              <button
                onClick={() => setShowAbout(true)}
                className="text-[10px] tracking-[0.2em] text-white/50 hover:text-white transition-colors hidden md:block"
              >
                INFORMATION
              </button>
              <button onClick={() => setIsCartOpen(true)} className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 transition-colors shadow-lg">
                <span className="text-[10px] tracking-[0.2em] font-semibold">BAG</span>
                {cartCount > 0 && <span className="bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">{cartCount}</span>}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12">
            {filteredItems.map((item: any, index: number) => {
              const slug = getBookSlug(item);
              const isOutOfStock = (item.stockLevel ?? 999) === 0;
              return (
                <motion.article
                  key={item.id || index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative"
                >
                  <Link to={`/books/${slug}`}>
                    <div className="relative aspect-[3/4] bg-neutral-900/50 rounded-lg mb-4 overflow-hidden border border-white/5 shadow-2xl">
                      <SkeletonImage
                        src={item.photos?.[0]?.url || DEFAULT_IMAGE}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      {/* Sold out ribbon */}
                      {isOutOfStock && (
                        <div className="absolute top-3 left-3">
                          <span className="bg-black/80 text-white/70 text-[8px] tracking-widest px-2 py-1 uppercase border border-white/20">
                            Sold Out
                          </span>
                        </div>
                      )}
                      {/* Hover overlay — show "VIEW" instead of add directly */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                        <span
                          style={{ backgroundColor: settings?.design?.primaryColor || 'white', color: 'black' }}
                          className="w-full py-3 rounded text-[10px] tracking-[0.2em] font-bold text-center transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl"
                        >
                          {isOutOfStock ? "SOLD OUT" : "VIEW"}
                        </span>
                      </div>
                    </div>
                    <div className="px-1">
                      <h3 className="text-xs tracking-wider font-medium leading-relaxed uppercase text-white/90">{item.title}</h3>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] tracking-[0.1em] text-white/40">
                          {item.genres?.[0] || item.categories?.[0] || "Publication"}
                        </span>
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
        <SiteFooter settings={settings} onAboutOpen={() => setShowAbout(true)} />

        {/* About panel */}
        <AnimatePresence>
          {showAbout && <AboutPanel settings={settings} onClose={() => setShowAbout(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  // ── Homepage (hero) ──
  return (
    <div
      className="size-full bg-[#030213] text-white overflow-hidden relative selection:bg-white selection:text-black font-sans"
      style={{ fontFamily: settings?.design?.font || 'Inter, sans-serif' }}
    >
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={() => setShowCatalog(true)}
          className="text-[10px] md:text-xs tracking-[0.3em] font-bold text-white hover:text-white/70 transition-colors"
        >
          ENTER ARCHIVE
        </button>
        <div className="flex gap-8 items-center">
          <button
            onClick={() => setShowAbout(true)}
            className="text-[10px] md:text-xs tracking-[0.2em] font-medium opacity-80 hover:opacity-100 transition-opacity hidden md:block"
          >
            INFORMATION
          </button>
          <button
            onClick={() => setIsCartOpen(true)}
            className="group flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/20 transition-all shadow-lg"
          >
            <span className="text-[10px] tracking-[0.2em] font-bold">BAG</span>
            {cartCount > 0 && <span className="bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full">{cartCount}</span>}
          </button>
          <Link to="/admin" className="text-[10px] tracking-widest opacity-30 hover:opacity-100 transition-opacity">SYS</Link>
        </div>
      </header>

      <main className="relative h-screen w-full flex items-center justify-center">
        {publications.map((pub: any, index: number) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ 
              opacity: index === (currentPage % (publications.length || 1)) ? 1 : 0,
              scale: index === (currentPage % (publications.length || 1)) ? 1 : 1.05
            }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute inset-0 ${index === (currentPage % (publications.length || 1)) ? 'z-10' : 'z-0 pointer-events-none'}`}
          >
            <img fetchPriority={index === 0 ? "high" : "auto"} src={pub.image} alt={pub.title} className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black/60 to-[#030213]/90 mix-blend-multiply" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/80" />
          </motion.div>
        ))}

        {/* Prev/Next arrows */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-12 z-40 pointer-events-none">
          <button onClick={prevPage} className="pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all group shadow-2xl">
            <ChevronLeft size={20} className="text-white opacity-70 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all" />
          </button>
          <button onClick={nextPage} className="pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all group shadow-2xl">
            <ChevronRight size={20} className="text-white opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Hero center text */}
        <div className="relative z-30 text-center flex flex-col items-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            {settings?.design?.logoUrl ? (
               <img src={settings.design.logoUrl} alt="Logo" className="h-16 md:h-24 object-contain mb-8 filter brightness-0 invert opacity-90" />
            ) : (
               <h1 className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tracking-[0.15em] font-light text-6xl md:text-8xl mb-8 selection:bg-transparent" style={{ fontFamily: 'Outfit, sans-serif' }}>
                 F✶M
               </h1>
            )}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }} className="overflow-hidden">
            <motion.p 
              key={currentPage} 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="text-white/80 text-[10px] md:text-xs tracking-[0.4em] max-w-lg mx-auto uppercase font-medium"
            >
              {publications[currentPage % (publications.length || 1)]?.title}
            </motion.p>
          </motion.div>
        </div>

        {/* Bottom scrolling nav */}
        <nav className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/80 to-transparent pt-20 pb-8">
          <div className="relative max-w-7xl mx-auto">
            <div ref={scrollContainerRef} className="flex gap-16 overflow-x-auto scrollbar-hide px-12 md:px-24" style={{ scrollbarWidth: 'none' }}>
              {publishedBooks.map((item: Book, index: number) => {
                const slug = getBookSlug(item);
                return (
                  <motion.div
                    key={item.id || index}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-shrink-0 group cursor-pointer"
                  >
                    <Link to={`/books/${slug}`} className="block">
                      <p className="text-[10px] tracking-[0.2em] font-semibold text-white/50 group-hover:text-white transition-colors uppercase whitespace-nowrap">
                        {item.title}
                      </p>
                      <div className="h-[1px] w-0 bg-white group-hover:w-full transition-all duration-500 mt-2" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </nav>
      </main>

      {/* About panel (available from homepage too) */}
      <AnimatePresence>
        {showAbout && <AboutPanel settings={settings} onClose={() => setShowAbout(false)} />}
      </AnimatePresence>
    </div>
  );
}
