import { motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function App() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showCatalog, setShowCatalog] = useState(false);

  const publications = [
    {
      title: "INDEPENDENT PUBLISHING HOUSE SPECIALIZING IN CONTEMPORARY PHOTOGRAPHY AND EPHEMERA",
      image: "https://images.unsplash.com/photo-1763747996545-8905244bc31a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      title: "NEW WORKS BY ZOE MOSS, LUCIA BELLEMARE, KIRK LEAL",
      image: "https://images.unsplash.com/photo-1758925403752-4794957be8af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      title: "MONOGRAPHS — VISUAL CULTURE — ARTIST BOOKS — SPECIAL EDITIONS",
      image: "https://images.unsplash.com/photo-1762627318644-311c23762d1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080"
    },
    {
      title: "ARCHIVE—PRESS — SPRING/SUMMER 2026",
      image: "https://images.unsplash.com/photo-1772271031418-a8bd39c1baf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080"
    }
  ];

  const catalogItems = [
    { title: "NEW WORKS BY ZOE MOSS, LUCIA BELLEMARE, KIRK LEAL" },
    { title: "MONAY BOOKS" },
    { title: "SPRING/SUMMER PRESS" },
    { title: "ZIM IMPRINT" }
  ];

  const [activeCategory, setActiveCategory] = useState("PUBLICATIONS");
  const categories = ["PUBLICATIONS", "EPHEMERA", "IMPRINT", "OUT OF PRINT"];

  const shopItems = [
    {
      title: "FIND STILL CATCHES ME SHIFTED",
      image: "https://images.unsplash.com/photo-1763747996545-8905244bc31a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "PUBLICATIONS"
    },
    {
      title: "ROADKILL",
      image: "https://images.unsplash.com/photo-1758925403752-4794957be8af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "PUBLICATIONS"
    },
    {
      title: "MARTINA MONACO KISS PRINT",
      image: "https://images.unsplash.com/photo-1569264096977-b2cae986c680?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "PUBLICATIONS"
    },
    {
      title: "POMEGRANATE EDITIONS",
      image: "https://images.unsplash.com/photo-1771702503116-db0e4dfbe103?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw2fHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "PUBLICATIONS"
    },
    {
      title: "MANPAW *PRE-ORDER*",
      image: "https://images.unsplash.com/photo-1758987016898-f9e1a848896d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw4fHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "PUBLICATIONS"
    },
    {
      title: "SWEET OXYGEN",
      image: "https://images.unsplash.com/photo-1762627318644-311c23762d1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "PUBLICATIONS"
    },
    {
      title: "FRANK O'HARA MEMORIAL BENEFIT BOOTLEG",
      image: "https://images.unsplash.com/photo-1772271031418-a8bd39c1baf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "PUBLICATIONS"
    },
    {
      title: "BREATHLESS IN GLOWING VIR",
      image: "https://images.unsplash.com/photo-1773948644647-2a08bcf2ed97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080",
      category: "PUBLICATIONS"
    },
    {
      title: "EPHEMERAL FORMS",
      image: "https://images.unsplash.com/photo-1569264090102-cb8c5c31d083?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "EPHEMERA"
    },
    {
      title: "COLLECTED OBJECTS",
      image: "https://images.unsplash.com/photo-1712771315936-3a2287614bf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "EPHEMERA"
    },
    {
      title: "ARCHIVE PRINTS",
      image: "https://images.unsplash.com/photo-1677816167053-243117463fca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "IMPRINT"
    },
    {
      title: "MONOGRAPH SERIES",
      image: "https://images.unsplash.com/photo-1714421888461-46131efb4625?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw2fHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
      category: "IMPRINT"
    }
  ];

  const filteredItems = shopItems.filter(item => item.category === activeCategory);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % publications.length);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + publications.length) % publications.length);
  };

  if (showCatalog) {
    return (
      <div className="size-full bg-black text-white overflow-y-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
        {/* Top Navigation */}
        <div className="sticky top-0 z-50 bg-black border-b border-white/20">
          <div className="flex items-center justify-between px-4 md:px-8 py-3">
            <div className="flex items-center gap-6 md:gap-8">
              <button
                onClick={() => setShowCatalog(false)}
                className="text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-opacity"
              >
                F✶M
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-opacity flex items-center gap-1 ${
                    activeCategory === cat ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <X size={10} />
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-4 md:gap-8">
              <button className="text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-opacity">
                INFORMATION
              </button>
              <button className="text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-opacity">
                CART
              </button>
            </div>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="p-4 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-square bg-neutral-900 mb-2 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex items-start gap-1">
                  <X size={12} className="mt-0.5 flex-shrink-0" />
                  <h3 className="text-[10px] md:text-xs tracking-wider leading-tight">
                    {item.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Info Bar */}
        <div className="sticky bottom-0 bg-black border-t border-white/20 px-4 md:px-8 py-3">
          <div className="text-[9px] md:text-[10px] tracking-wider opacity-60">
            INDEPENDENT PUBLISHING HOUSE SPECIALIZING IN CONTEMPORARY PHOTOGRAPHY AND EPHEMERA
            <span className="mx-2">/</span>
            NEW WORKS BY ZOE MOSS, LUCIA BELLEMARE, KIRK LEAL
            <span className="mx-2">/</span>
            MONAY BOOKS
            <span className="mx-2">/</span>
            SPRING/SUMMER PRESS
            <span className="mx-2">/</span>
            POMEGRANATE PRESS
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full bg-white text-black overflow-hidden relative" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Top Navigation - Minimal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-3"
      >
        <button
          onClick={() => setShowCatalog(true)}
          className="text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-opacity"
        >
          ENTER HERE
        </button>
        <div className="flex gap-4 md:gap-8">
          <button className="text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-opacity">
            INFORMATION
          </button>
          <button className="text-[10px] md:text-xs tracking-widest hover:opacity-50 transition-opacity">
            CART
          </button>
        </div>
      </motion.div>

      {/* Main Hero Area */}
      <div className="relative h-screen w-full">
        {/* Background Images */}
        {publications.map((pub, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: index === currentPage ? 1 : 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <img
              src={pub.image}
              alt=""
              className="w-full h-full object-cover grayscale"
            />
            <div className="absolute inset-0 bg-black/10" />
          </motion.div>
        ))}

        {/* Page Navigation Arrows */}
        <button
          onClick={prevPage}
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-40 p-2 hover:opacity-50 transition-opacity"
        >
          <ChevronLeft size={32} className="text-white drop-shadow-lg" />
        </button>
        <button
          onClick={nextPage}
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-40 p-2 hover:opacity-50 transition-opacity"
        >
          <ChevronRight size={32} className="text-white drop-shadow-lg" />
        </button>

        {/* Centered Logo/Brand */}
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="text-center"
          >
            {/* Artistic Logo Symbol */}
            <div className="mb-6 flex items-center justify-center gap-3">
              <svg width="280" height="120" viewBox="0 0 280 120" className="text-white drop-shadow-2xl">
                {/* Abstract artistic logo inspired by the reference */}
                <text
                  x="140"
                  y="70"
                  textAnchor="middle"
                  className="fill-current"
                  style={{
                    fontSize: '72px',
                    fontWeight: 300,
                    letterSpacing: '8px',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  F✶M
                </text>
              </svg>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="text-white text-[10px] md:text-xs tracking-[0.2em] max-w-md mx-auto px-4"
            >
              {publications[currentPage].title}
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Horizontal Scroll Navigation */}
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-black/70 backdrop-blur-sm">
          <div className="relative">
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 hover:opacity-50 transition-opacity"
            >
              <ChevronLeft size={16} className="text-white" />
            </button>

            <div
              ref={scrollContainerRef}
              className="flex gap-8 overflow-x-auto scrollbar-hide px-12 py-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {catalogItems.map((item, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
                  className="text-white text-[9px] md:text-[10px] tracking-[0.15em] whitespace-nowrap hover:opacity-50 transition-opacity"
                >
                  {item.title}
                </motion.button>
              ))}
            </div>

            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 hover:opacity-50 transition-opacity"
            >
              <ChevronRight size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Content Sections */}
      <section className="min-h-screen bg-white p-8 md:p-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="max-w-4xl text-center"
        >
          <h2 className="text-3xl md:text-6xl tracking-tight mb-8" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300, letterSpacing: '-0.02em' }}>
            ARCHIVE—PRESS
          </h2>
          <p className="text-xs md:text-sm tracking-wider leading-relaxed max-w-2xl mx-auto">
            AN INDEPENDENT PUBLISHING HOUSE SPECIALIZING IN CONTEMPORARY PHOTOGRAPHY, ARTIST MONOGRAPHS, AND VISUAL EPHEMERA. EACH PUBLICATION IS CONCEIVED AS A COLLABORATION BETWEEN ARTIST, DESIGNER, AND MAKER.
          </p>
        </motion.div>
      </section>

      {/* Full Bleed Image Section */}
      <section className="relative h-screen">
        <img
          src="https://images.unsplash.com/photo-1773948644647-2a08bcf2ed97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt=""
          className="w-full h-full object-cover grayscale"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5 }}
            className="text-white text-center px-4"
          >
            <div className="text-xs md:text-sm tracking-[0.3em] mb-4">SPRING / SUMMER 2026</div>
            <div className="text-2xl md:text-5xl tracking-tight" style={{ fontWeight: 300 }}>
              NEW RELEASES
            </div>
          </motion.div>
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="min-h-screen bg-white p-8 md:p-16">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 max-w-6xl mx-auto">
          {[
            "https://images.unsplash.com/photo-1771702503116-db0e4dfbe103?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw2fHxtb25vY2hyb21lJTIwYXJ0aXN0aWMlMjBwaG90b2dyYXBoeSUyMGFic3RyYWN0fGVufDF8fHx8MTc3NTg3MzE5OHww&ixlib=rb-4.1.0&q=80&w=1080",
            "https://images.unsplash.com/photo-1677816167053-243117463fca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
            "https://images.unsplash.com/photo-1712771315936-3a2287614bf0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
            "https://images.unsplash.com/photo-1758987016898-f9e1a848896d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw4fHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
            "https://images.unsplash.com/photo-1569264090102-cb8c5c31d083?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080",
            "https://images.unsplash.com/photo-1569264096977-b2cae986c680?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGJsYWNrJTIwYW5kJTIwd2hpdGUlMjBuYXR1cmUlMjB0ZXh0dXJlJTIwcGhvdG9ncmFwaHl8ZW58MXx8fHwxNzc1ODczMTk4fDA&ixlib=rb-4.1.0&q=80&w=1080"
          ].map((img, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 0.98 }}
              className="aspect-square cursor-pointer"
            >
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-8 px-8 md:px-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[10px] tracking-widest">
          <div>© 2026 ARCHIVE—PRESS</div>
          <div className="flex gap-8">
            <a href="#" className="hover:opacity-50 transition-opacity">CONTACT</a>
            <a href="#" className="hover:opacity-50 transition-opacity">INSTAGRAM</a>
            <a href="#" className="hover:opacity-50 transition-opacity">NEWSLETTER</a>
          </div>
        </div>
      </footer>
    </div>
  );
}