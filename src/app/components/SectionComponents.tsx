import { motion } from "framer-motion";
import { Send } from "lucide-react";

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
            <span data-theme-field="title">{settings.title || "Lyricalmyrical"}</span>
          </h1>
          <p className="text-sm md:text-md tracking-[0.3em] font-medium text-white/70 uppercase mb-10">
            <span data-theme-field="subtitle">{settings.subtitle || "Photography & Art Books"}</span>
          </p>
          <div className={`flex flex-wrap items-center gap-4 ${
            settings.align === "left" ? "justify-start" : settings.align === "right" ? "justify-end" : "justify-center"
          }`}>
            <button
              onClick={onCtaClick}
              className="px-8 py-3.5 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase text-black hover:scale-105 transition-transform"
              style={{ backgroundColor: settings.accentColor || "#A855F7" }}
            >
              <span data-theme-field="ctaText">{settings.ctaText || "Explore"}</span>
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

export function FeatureGridSection({ settings, enableAnimations }: any) {
  const items = settings.items || [];
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        <h2 className="text-3xl font-bold tracking-tight uppercase text-white mb-10" data-theme-field="title">{settings.title || "Highlights"}</h2>
      </AnimationContainer>
      <div className="grid md:grid-cols-3 gap-6">
        {(items.length ? items : [{ title: "Feature One", description: "Describe your value." }, { title: "Feature Two", description: "Describe your value." }, { title: "Feature Three", description: "Describe your value." }]).map((item: any, idx: number) => (
          <AnimationContainer key={idx} enabled={enableAnimations} delay={idx * 0.1}>
            <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl">
              <h3 className="text-sm font-bold uppercase text-white">{item.title}</h3>
              <p className="text-xs text-white/50 mt-2">{item.description}</p>
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
            <h2 className="text-2xl font-bold tracking-tight uppercase text-white" data-theme-field="title">{settings.title || "Join the Archive"}</h2>
            <p className="text-xs text-white/40 tracking-widest leading-relaxed">
              <span data-theme-field="description">{settings.description || "Occasional dispatches about new publications and limited editions."}</span>
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

export function TestimonialsSection({ settings, enableAnimations }: any) {
  const items = settings.items || [];
  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        <h2 className="text-3xl font-bold tracking-tight uppercase leading-tight text-white mb-8" data-theme-field="title">{settings.title || "Testimonials"}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(items.length ? items : [{ quote: "An incredible independent shop.", author: "Customer" }]).map((item: any, idx: number) => (
            <div key={idx} className="p-6 bg-white/[0.03] rounded-2xl border border-white/10">
              <p className="text-white/70 text-lg leading-relaxed font-light">“{item.quote}”</p>
              <p className="text-white/40 text-xs mt-4 uppercase tracking-widest">{item.author}</p>
            </div>
          ))}
        </div>
      </AnimationContainer>
    </section>
  );
}

export function FAQSection({ settings, enableAnimations }: any) {
  const items = settings.items || [];
  return (
    <section className="py-24 px-6 max-w-4xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        <h2 className="text-3xl font-bold tracking-tight uppercase leading-tight text-white mb-8" data-theme-field="title">{settings.title || "FAQ"}</h2>
        <div className="space-y-3">
          {(items.length ? items : [{ question: "Sample question?", answer: "Sample answer." }]).map((item: any, idx: number) => (
            <details key={idx} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <summary className="text-sm font-bold text-white cursor-pointer">{item.question}</summary>
              <p className="text-white/60 text-sm mt-3">{item.answer}</p>
            </details>
          ))}
        </div>
      </AnimationContainer>
    </section>
  );
}

export function TextContentSection({ settings, enableAnimations }: any) {
  return (
    <section className="py-24 px-6 max-w-4xl mx-auto text-center">
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
