import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "react-router";
import { useCart } from "../CartContext";
import { CATEGORIES, DEFAULT_IMAGE } from "../features/site/constants";
import { getFeaturedBooks, getFilteredItems, getPublications, getPublishedBooks } from "../features/site/selectors";
import type { Book } from "../features/site/types";
import { useSiteData } from "../features/site/useSiteData";

export default function MainSite({ setShowCatalog, showCatalog, setCurrentPage, currentPage, nextPage, prevPage }: any) {
  const { cartCount, addToCart, setIsCartOpen } = useCart();
  const { books, settings, loading } = useSiteData();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState("PUBLICATIONS");

  const publications = useMemo(() => getPublications(getFeaturedBooks(books)), [books]);
  const filteredItems = useMemo(
    () => getFilteredItems(books, activeCategory, new Date().toISOString()),
    [books, activeCategory],
  );
  const publishedBooks = useMemo(() => getPublishedBooks(books), [books]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

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

  if (showCatalog) {
    return (
      <div className="min-h-screen bg-[#050505] text-white overflow-y-auto selection:bg-white selection:text-black" style={{ fontFamily: settings?.design?.font || 'Inter, sans-serif' }}>
        <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-8 md:gap-12">
              <button onClick={() => setShowCatalog(false)} className="text-xs tracking-[0.3em] font-semibold hover:text-neutral-400 transition-colors flex items-center">
                {settings?.design?.logoUrl ? <img src={settings.design.logoUrl} alt="Logo" className="h-6 object-contain" /> : "F✶M"}
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
              <button onClick={() => setIsCartOpen(true)} className="group flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 transition-colors shadow-lg">
                <span className="text-[10px] tracking-[0.2em] font-semibold">BAG</span>
                {cartCount > 0 && <span className="bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">{cartCount}</span>}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12">
            {filteredItems.map((item: any, index: number) => (
              <motion.article
                key={item.id || index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="group relative"
              >
                <div className="relative aspect-[3/4] bg-neutral-900/50 rounded-lg mb-4 overflow-hidden border border-white/5 shadow-2xl">
                  <img
                    src={item.photos?.[0]?.url || DEFAULT_IMAGE}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                      style={{ backgroundColor: settings?.design?.primaryColor || 'white', color: settings?.design?.primaryColor ? 'white' : 'black' }}
                      className="w-full py-3 rounded text-[10px] tracking-[0.2em] font-bold hover:brightness-110 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 shadow-xl"
                    >
                      ADD TO BAG
                    </button>
                  </div>
                </div>
                <div className="px-1">
                  <h3 className="text-xs tracking-wider font-medium leading-relaxed uppercase text-white/90">{item.title}</h3>
                  <div className="mt-2 text-[10px] tracking-[0.1em] text-white/40">COLLECTION / {new Date().getFullYear()}</div>
                </div>
              </motion.article>
            ))}
          </div>
        </main>
        
        <footer className="mt-12 py-8 bg-black/60 border-t border-white/10 text-center">
             <div className="text-[9px] md:text-[10px] tracking-widest opacity-60 uppercase text-white/70">
                {settings?.announcements?.[0]?.message || "Lyricalmyrical Books"}
            </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="size-full bg-[#030213] text-white overflow-hidden relative selection:bg-white selection:text-black font-sans" style={{ fontFamily: settings?.design?.font || 'Inter, sans-serif' }}>
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={() => setShowCatalog(true)} className="text-[10px] md:text-xs tracking-[0.3em] font-bold text-white hover:text-white/70 transition-colors">
          ENTER ARCHIVE
        </button>
        <div className="flex gap-8 items-center">
          <button className="text-[10px] md:text-xs tracking-[0.2em] font-medium opacity-80 hover:opacity-100 transition-opacity hidden md:block">INFORMATION</button>
          <button onClick={() => setIsCartOpen(true)} className="group flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/20 transition-all shadow-lg">
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

        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-12 z-40 pointer-events-none">
          <button onClick={prevPage} className="pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all group shadow-2xl">
            <ChevronLeft size={20} className="text-white opacity-70 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all" />
          </button>
          <button onClick={nextPage} className="pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all group shadow-2xl">
            <ChevronRight size={20} className="text-white opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

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

        <nav className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/80 to-transparent pt-20 pb-8">
          <div className="relative max-w-7xl mx-auto">
            <div ref={scrollContainerRef} className="flex gap-16 overflow-x-auto scrollbar-hide px-12 md:px-24" style={{ scrollbarWidth: 'none' }}>
              {publishedBooks.map((item: Book, index: number) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="flex-shrink-0 group cursor-pointer"
                  onClick={() => addToCart(item)}
                >
                  <p className="text-[10px] tracking-[0.2em] font-semibold text-white/50 group-hover:text-white transition-colors uppercase whitespace-nowrap">
                    {item.title}
                  </p>
                  <div className="h-[1px] w-0 bg-white group-hover:w-full transition-all duration-500 mt-2" />
                </motion.div>
              ))}
            </div>
          </div>
        </nav>
      </main>
    </div>
  );
}
