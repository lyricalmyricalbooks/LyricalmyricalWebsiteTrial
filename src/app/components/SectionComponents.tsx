import { motion } from "framer-motion";
import { ArrowRight, Send } from "lucide-react";

// ──────────────────────────────
// Section Library
// ──────────────────────────────

function AnimationContainer({ children, enabled, delay = 0 }: any) {
  if (!enabled) return children;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.215, 0.61, 0.355, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function HeroSection({ settings, onCtaClick, enableAnimations }: any) {
  return (
    <section 
      className={`relative w-full h-[80vh] min-h-[600px] flex items-center overflow-hidden ${
        settings.align === "left" ? "justify-start" : settings.align === "right" ? "justify-end" : "justify-center"
      }`}
      style={{ backgroundColor: settings.backgroundColor || "#000" }}
    >
      {settings.imageUrl && (
        <img 
          src={settings.imageUrl} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
      )}
      <div 
        className="absolute inset-0 bg-black" 
        style={{ opacity: settings.overlayOpacity ?? 0.5 }} 
      />
      
      <div className={`relative z-10 px-6 max-w-3xl ${
        settings.align === "left" ? "text-left" : settings.align === "right" ? "text-right" : "text-center"
      }`}>
        <AnimationContainer enabled={enableAnimations}>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase mb-6 leading-none text-white">
            {settings.title || "Lyricalmyrical"}
          </h1>
          <p className="text-sm md:text-md tracking-[0.3em] font-medium text-white/70 uppercase mb-10">
            {settings.subtitle || "Photography & Art Books"}
          </p>
          <div className={`flex flex-wrap items-center gap-4 ${
            settings.align === "left" ? "justify-start" : settings.align === "right" ? "justify-end" : "justify-center"
          }`}>
            <button
              onClick={onCtaClick}
              className="px-8 py-3.5 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase text-black hover:scale-105 transition-transform"
              style={{ backgroundColor: settings.accentColor || "#A855F7" }}
            >
              {settings.ctaText || "Explore"}
            </button>
            {settings.secondaryCtaText && (
               <button
                  className="px-8 py-3.5 rounded-full border border-white/30 text-[10px] tracking-[0.3em] font-semibold uppercase hover:bg-white/10 transition-colors text-white"
               >
                  {settings.secondaryCtaText}
               </button>
            )}
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

export function FeaturedCollectionSection({ books, settings, onProductClick, enableAnimations }: any) {
  const collectionBooks = (books || []).slice(0, settings.limit || 4);
  
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        <div className="flex justify-between items-end mb-12">
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.5em] text-white/30 uppercase font-bold">Featured</p>
            <h2 className="text-3xl font-bold tracking-tight uppercase text-white">{settings.title || "Selected Works"}</h2>
          </div>
          {settings.showViewAll && (
            <button className="text-[10px] tracking-[0.3em] font-bold text-white/40 hover:text-white transition-colors flex items-center gap-2 pb-1 border-b border-white/10 group uppercase">
              VIEW ALL <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </AnimationContainer>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {collectionBooks.map((book: any, idx: number) => (
          <AnimationContainer key={book.id} enabled={enableAnimations} delay={idx * 0.1}>
            <div onClick={() => onProductClick(book)} className="group cursor-pointer">
              <div className="aspect-[3/4] bg-neutral-900 overflow-hidden mb-4 border border-white/5 shadow-2xl rounded-sm">
                <img 
                  src={book.photos?.[0]?.url} 
                  alt={book.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wide truncate text-white">{book.title}</h3>
              <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">{book.author}</p>
            </div>
          </AnimationContainer>
        ))}
      </div>
    </section>
  );
}

export function NewsletterSection({ settings, enableAnimations }: any) {
  return (
    <section className="py-24 border-t border-white/5 bg-white/[0.02]">
      <AnimationContainer enabled={enableAnimations}>
        <div className="max-w-xl mx-auto px-6 text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight uppercase text-white">{settings.title || "Join the Archive"}</h2>
            <p className="text-xs text-white/40 tracking-widest leading-relaxed">
              {settings.description || "Occasional dispatches about new publications and limited editions."}
            </p>
          </div>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="email@example.com"
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-xs text-white focus:border-white/30 transition-all outline-none"
            />
            <button
              type="button"
              className="bg-white text-black rounded-full px-8 py-3 text-[10px] font-bold tracking-widest hover:bg-neutral-200 transition-all flex items-center gap-2"
            >
              <Send size={12} />
              JOIN
            </button>
          </form>
        </div>
      </AnimationContainer>
    </section>
  );
}

export function TextContentSection({ settings, enableAnimations }: any) {
  const align = settings.align || "center";
  return (
    <section className={`py-24 px-6 max-w-4xl mx-auto ${align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"}`}>
      <AnimationContainer enabled={enableAnimations}>
        <div className="space-y-6">
          {settings.title && (
            <h2 className="text-3xl font-bold tracking-tight uppercase leading-tight text-white">{settings.title}</h2>
          )}
          <div className="prose prose-invert max-w-none">
            <p className="text-white/60 text-lg leading-relaxed font-light">
              {settings.content || "Add your mission statement or store introduction here."}
            </p>
          </div>
        </div>
      </AnimationContainer>
    </section>
  );
}
