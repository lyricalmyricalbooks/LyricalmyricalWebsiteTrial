import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Send, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";

// ──────────────────────────────
// Animation helper
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

// ──────────────────────────────
// HERO
// ──────────────────────────────

export function HeroSection({ settings, onCtaClick, enableAnimations }: any) {
  const heightCls =
    settings.height === "full"
      ? "h-screen min-h-[600px]"
      : settings.height === "medium"
      ? "h-[70vh] min-h-[480px]"
      : settings.height === "small"
      ? "h-[50vh] min-h-[320px]"
      : "h-screen min-h-[600px]"; // default: full viewport

  return (
    <section
      className={`relative w-full ${heightCls} flex items-center overflow-hidden ${
        settings.align === "left" ? "justify-start" : settings.align === "right" ? "justify-end" : "justify-center"
      }`}
      style={{ backgroundColor: settings.backgroundColor || "#000" }}
    >
      {settings.imageUrl && (
        <img src={settings.imageUrl} alt="" loading="eager" decoding="async" fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: settings.overlayOpacity ?? 0.5 }} />
      <div
        className={`relative z-10 px-6 max-w-3xl ${
          settings.align === "left" ? "text-left" : settings.align === "right" ? "text-right" : "text-center"
        }`}
      >
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
              <button className="px-8 py-3.5 rounded-full border border-white/30 text-[10px] tracking-[0.3em] font-semibold uppercase hover:bg-white/10 transition-colors text-white">
                {settings.secondaryCtaText}
              </button>
            )}
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// FEATURE GRID
// ──────────────────────────────

export function FeatureGridSection({ settings, enableAnimations }: any) {
  const items = settings.items || settings.blocks || [];
  const cols = settings.columns ?? 3;
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        <h2 className="text-3xl font-bold tracking-tight uppercase text-white mb-10" data-theme-field="title">
          {settings.title || "Highlights"}
        </h2>
      </AnimationContainer>
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {(items.length ? items : [{ title: "Feature One", description: "Describe your value." }]).map((item: any, idx: number) => (
          <AnimationContainer key={idx} enabled={enableAnimations} delay={idx * 0.1}>
            <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl">
              {item.icon && <div className="text-3xl mb-3">{item.icon}</div>}
              <h3 className="text-sm font-bold uppercase text-white">{item.title}</h3>
              <p className="text-xs text-white/50 mt-2">{item.description}</p>
            </div>
          </AnimationContainer>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────
// NEWSLETTER
// ──────────────────────────────

export function NewsletterSection({ settings, enableAnimations }: any) {
  return (
    <section className="py-24 border-t border-white/5 bg-white/[0.02]">
      <AnimationContainer enabled={enableAnimations}>
        <div className="max-w-xl mx-auto px-6 text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight uppercase text-white" data-theme-field="title">
              {settings.title || "Join the Archive"}
            </h2>
            <p className="text-xs text-white/40 tracking-widest leading-relaxed">
              <span data-theme-field="description">
                {settings.description || "Occasional dispatches about new publications and limited editions."}
              </span>
            </p>
          </div>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder={settings.placeholder || "email@example.com"}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-xs text-white focus:border-white/30 transition-all outline-none"
            />
            <button
              type="button"
              className="bg-white text-black rounded-full px-8 py-3 text-[10px] font-bold tracking-widest hover:bg-neutral-200 transition-all flex items-center gap-2"
            >
              <Send size={12} />
              {settings.buttonLabel || "JOIN"}
            </button>
          </form>
        </div>
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// TESTIMONIALS
// ──────────────────────────────

export function TestimonialsSection({ settings, enableAnimations }: any) {
  const items = settings.items || settings.blocks || [];
  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        <h2 className="text-3xl font-bold tracking-tight uppercase leading-tight text-white mb-8" data-theme-field="title">
          {settings.title || "Testimonials"}
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {(items.length ? items : [{ quote: "An incredible independent shop.", author: "Customer" }]).map((item: any, idx: number) => (
            <div key={idx} className="p-6 bg-white/[0.03] rounded-2xl border border-white/10">
              <p className="text-white/70 text-lg leading-relaxed font-light">"{item.quote}"</p>
              <p className="text-white/40 text-xs mt-4 uppercase tracking-widest">{item.author}</p>
              {item.role && <p className="text-white/30 text-[10px] mt-1">{item.role}</p>}
            </div>
          ))}
        </div>
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// FAQ
// ──────────────────────────────

export function FAQSection({ settings, enableAnimations }: any) {
  const items = settings.items || settings.blocks || [];
  return (
    <section className="py-24 px-6 max-w-4xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        <h2 className="text-3xl font-bold tracking-tight uppercase leading-tight text-white mb-8" data-theme-field="title">
          {settings.title || "FAQ"}
        </h2>
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

// ──────────────────────────────
// TEXT CONTENT (already existed)
// ──────────────────────────────

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

// ──────────────────────────────
// IMAGE WITH TEXT
// ──────────────────────────────

export function ImageWithTextSection({ settings, enableAnimations }: any) {
  const reverse = settings.layout === "text-left";
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        <div className={`grid md:grid-cols-2 gap-12 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white/5 border border-white/10">
            {settings.imageUrl ? (
              <img src={settings.imageUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={settings.imageAlt || ""} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20 text-xs uppercase tracking-widest">No Image</div>
            )}
          </div>
          <div className="space-y-5">
            {settings.eyebrow && (
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50">{settings.eyebrow}</p>
            )}
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white" data-theme-field="title">
              {settings.title || "About the collection"}
            </h2>
            <p className="text-white/60 leading-relaxed" data-theme-field="body">
              {settings.body || "Pair text with an image to give focus to your chosen product or collection."}
            </p>
            {settings.ctaText && (
              <a
                href={settings.ctaUrl || "#"}
                className="inline-block px-7 py-3 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase text-black"
                style={{ backgroundColor: settings.accentColor || "#A855F7" }}
              >
                {settings.ctaText}
              </a>
            )}
          </div>
        </div>
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// RICH TEXT
// ──────────────────────────────

export function RichTextSection({ settings, enableAnimations }: any) {
  const align = settings.align || "center";
  return (
    <section className="py-20 px-6">
      <AnimationContainer enabled={enableAnimations}>
        <div
          className={`max-w-3xl mx-auto prose prose-invert ${align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center mx-auto"}`}
          dangerouslySetInnerHTML={{ __html: settings.html || "<p>Use this rich text section to share information with your customers.</p>" }}
        />
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// SCROLLING TEXT (marquee)
// ──────────────────────────────

export function MarqueeSection({ settings }: any) {
  const text = settings.text || "Free shipping over $100 · New arrivals weekly · Independent & original";
  const separator = settings.separator || "·";
  const speed = Math.max(5, Math.min(120, settings.speed ?? 20));
  const fontSize = Math.max(10, Math.min(120, settings.fontSize ?? 28));
  const bold = settings.bold ?? true;
  const uppercase = settings.uppercase ?? true;
  const background = settings.background || "transparent";
  const color = settings.color || undefined;

  // Repeat the phrase so the strip stays full, then render two copies for a seamless -50% loop.
  const phrase = Array.from({ length: 4 }).map(() => text).join(`  ${separator}  `);

  return (
    <section className="overflow-hidden py-8" style={{ background }}>
      <div
        className="flex w-max animate-marquee"
        style={{ ["--marquee-duration" as any]: `${speed}s` }}
      >
        {[0, 1].map((copy) => (
          <span
            key={copy}
            aria-hidden={copy === 1}
            className={`px-6 ${bold ? "font-black" : "font-medium"} ${uppercase ? "uppercase" : ""} tracking-tight`}
            style={{ fontSize, color }}
          >
            {phrase}
            {`  ${separator}  `}
          </span>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────
// MULTICOLUMN (with column blocks)
// ──────────────────────────────

export function MulticolumnSection({ settings, enableAnimations }: any) {
  const items = settings.items || settings.blocks || [];
  const cols = Math.max(2, Math.min(6, settings.columns ?? 3));
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        {settings.title && (
          <h2 className="text-3xl font-bold tracking-tight uppercase text-white mb-12 text-center" data-theme-field="title">
            {settings.title}
          </h2>
        )}
      </AnimationContainer>
      <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((item: any, idx: number) => (
          <AnimationContainer key={idx} enabled={enableAnimations} delay={idx * 0.1}>
            <div className="text-center space-y-4">
              {item.imageUrl && (
                <div className="aspect-square w-32 mx-auto rounded-full overflow-hidden border border-white/10">
                  <img src={item.imageUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={item.title || ""} />
                </div>
              )}
              <h3 className="text-lg font-bold text-white">{item.title || "Column"}</h3>
              <p className="text-white/60 text-sm">{item.body || ""}</p>
              {item.linkText && (
                <a href={item.linkUrl || "#"} className="text-xs font-bold tracking-widest uppercase text-white/80 underline">
                  {item.linkText}
                </a>
              )}
            </div>
          </AnimationContainer>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────
// SLIDESHOW (with slide blocks)
// ──────────────────────────────

export function SlideshowSection({ settings, enableAnimations }: any) {
  const slides = settings.slides || settings.items || settings.blocks || [];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!settings.autoplay || slides.length <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % slides.length), Math.max(2000, settings.autoplaySpeed || 5000));
    return () => clearInterval(t);
  }, [slides.length, settings.autoplay, settings.autoplaySpeed]);

  if (slides.length === 0) {
    return (
      <section className="h-[60vh] flex items-center justify-center bg-white/[0.02] text-white/30 text-xs uppercase tracking-widest">
        Add slides to this slideshow
      </section>
    );
  }

  const slide = slides[active] || slides[0];

  return (
    <section className="relative w-full h-[70vh] min-h-[480px] overflow-hidden">
      {slide.imageUrl && (
        <img src={slide.imageUrl} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" alt={slide.title || ""} />
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: slide.overlayOpacity ?? 0.4 }} />
      <AnimationContainer enabled={enableAnimations}>
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 max-w-3xl mx-auto">
          {slide.eyebrow && (
            <p className="text-[10px] tracking-[0.3em] font-bold uppercase text-white/70 mb-4">{slide.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-6xl font-black uppercase text-white mb-4">{slide.title}</h2>
          {slide.subtitle && <p className="text-white/70 text-lg mb-8">{slide.subtitle}</p>}
          {slide.ctaText && (
            <a
              href={slide.ctaUrl || "#"}
              className="px-8 py-3.5 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase text-black"
              style={{ backgroundColor: slide.accentColor || "#fff" }}
            >
              {slide.ctaText}
            </a>
          )}
        </div>
      </AnimationContainer>
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setActive((a) => (a - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur hover:bg-white/20"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setActive((a) => (a + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur hover:bg-white/20"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
            {slides.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === active ? "bg-white w-6" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ──────────────────────────────
// VIDEO
// ──────────────────────────────

export function VideoSection({ settings, enableAnimations }: any) {
  const url = settings.videoUrl || "";
  const isYoutube = /youtube\.com|youtu\.be/.test(url);
  const isVimeo = /vimeo\.com/.test(url);

  let embed = "";
  if (isYoutube) {
    const id = url.match(/(?:v=|youtu\.be\/)([\w-]{6,})/)?.[1];
    if (id) embed = `https://www.youtube.com/embed/${id}?rel=0`;
  } else if (isVimeo) {
    const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
    if (id) embed = `https://player.vimeo.com/video/${id}`;
  }

  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        {settings.title && (
          <h2 className="text-3xl font-bold tracking-tight uppercase text-white mb-8 text-center">{settings.title}</h2>
        )}
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10">
          {embed ? (
            <iframe
              src={embed}
              title={settings.title || "Video"}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          ) : url ? (
            <video src={url} controls poster={settings.posterUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30 text-xs uppercase tracking-widest">
              Paste a YouTube, Vimeo or MP4 URL
            </div>
          )}
        </div>
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// LOGO LIST
// ──────────────────────────────

export function LogoListSection({ settings, enableAnimations }: any) {
  const items = settings.items || settings.blocks || [];
  return (
    <section className="py-16 px-6 max-w-7xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        {settings.title && (
          <p className="text-center text-[10px] font-bold tracking-[0.3em] uppercase text-white/40 mb-8">
            {settings.title}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="opacity-60 hover:opacity-100 transition-opacity">
              {item.logoUrl ? (
                <img src={item.logoUrl} alt={item.alt || ""} loading="lazy" decoding="async" className="h-10 w-auto object-contain" />
              ) : (
                <span className="text-white/40 text-sm font-bold uppercase tracking-widest">{item.alt || "Logo"}</span>
              )}
            </div>
          ))}
        </div>
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// COLLAPSIBLE / ACCORDION
// ──────────────────────────────

export function CollapsibleSection({ settings, enableAnimations }: any) {
  const items = settings.items || settings.blocks || [];
  return (
    <section className="py-20 px-6 max-w-3xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        {settings.title && (
          <h2 className="text-3xl font-bold tracking-tight uppercase text-white mb-8 text-center">{settings.title}</h2>
        )}
        <div className="border-t border-white/10">
          {items.map((item: any, idx: number) => (
            <details key={idx} className="border-b border-white/10 group">
              <summary className="flex items-center justify-between cursor-pointer py-5 text-white text-sm font-bold tracking-wide uppercase">
                {item.heading || "Heading"}
                <span className="text-white/40 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div
                className="text-white/60 text-sm pb-6 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: item.content || "" }}
              />
            </details>
          ))}
        </div>
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// COLLECTION LIST
// ──────────────────────────────

export function CollectionListSection({ settings, enableAnimations }: any) {
  const items = settings.items || settings.blocks || [];
  const cols = Math.max(2, Math.min(5, settings.columns ?? 3));
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        {settings.title && (
          <h2 className="text-3xl font-bold tracking-tight uppercase text-white mb-10 text-center">{settings.title}</h2>
        )}
      </AnimationContainer>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((item: any, idx: number) => (
          <AnimationContainer key={idx} enabled={enableAnimations} delay={idx * 0.05}>
            <a
              href={item.linkUrl || "#"}
              className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-white/5"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title || ""}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-white text-lg font-bold uppercase tracking-tight">{item.title || "Collection"}</h3>
                {item.subtitle && <p className="text-white/70 text-xs">{item.subtitle}</p>}
              </div>
            </a>
          </AnimationContainer>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────
// FEATURED PRODUCT
// ──────────────────────────────

export function FeaturedProductSection({ settings, books, onProductClick, enableAnimations }: any) {
  const target =
    (books || []).find((b: any) => b.id === settings.productId) ||
    (books || []).find((b: any) => b.slug === settings.productSlug) ||
    (books || [])[0];

  if (!target) return null;

  const photo = target.photos?.[0]?.url;
  const price = target.isOnSale && target.salePrice ? target.salePrice : target.retailPrice;

  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-white/5">
            {photo ? <img src={photo} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={target.title} /> : null}
          </div>
          <div className="space-y-5">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50">{settings.eyebrow || "Featured"}</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">{target.title}</h2>
            {target.subtitle && <p className="text-white/60">{target.subtitle}</p>}
            <p className="text-2xl font-bold text-white">${typeof price === "number" ? price.toFixed(2) : price}</p>
            <p className="text-white/60 text-sm leading-relaxed line-clamp-4">{target.description || ""}</p>
            <button
              onClick={() => onProductClick?.(target)}
              className="px-8 py-3.5 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase text-black"
              style={{ backgroundColor: settings.accentColor || "#A855F7" }}
            >
              {settings.ctaText || "View product"}
            </button>
          </div>
        </div>
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// CUSTOM HTML
// ──────────────────────────────

export function CustomHTMLSection({ settings }: any) {
  return (
    <section className={settings.fullBleed ? "" : "py-12 px-6 max-w-7xl mx-auto"}>
      <div dangerouslySetInnerHTML={{ __html: settings.html || "<!-- Add custom HTML in the editor -->" }} />
    </section>
  );
}

// ──────────────────────────────
// COUNTDOWN
// ──────────────────────────────

export function CountdownSection({ settings, enableAnimations }: any) {
  const target = settings.targetDate ? new Date(settings.targetDate).getTime() : Date.now() + 86400000;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, target - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <section className="py-20 px-6 text-center" style={{ background: settings.backgroundColor || "transparent" }}>
      <AnimationContainer enabled={enableAnimations}>
        {settings.eyebrow && (
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/60 mb-4 flex items-center justify-center gap-2">
            <Clock size={12} />
            {settings.eyebrow}
          </p>
        )}
        <h2 className="text-3xl md:text-4xl font-bold uppercase text-white mb-2">{settings.title || "Limited time offer"}</h2>
        {settings.subtitle && <p className="text-white/60 mb-8">{settings.subtitle}</p>}
        <div className="flex justify-center gap-4 md:gap-8 mt-8">
          {[
            { label: "Days", v: days },
            { label: "Hours", v: hours },
            { label: "Min", v: minutes },
            { label: "Sec", v: seconds },
          ].map((u) => (
            <div key={u.label} className="text-center">
              <div className="text-4xl md:text-6xl font-black text-white tabular-nums">{String(u.v).padStart(2, "0")}</div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/50 mt-1">{u.label}</div>
            </div>
          ))}
        </div>
        {settings.ctaText && (
          <a
            href={settings.ctaUrl || "#"}
            className="inline-block mt-10 px-8 py-3.5 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase text-black"
            style={{ backgroundColor: settings.accentColor || "#A855F7" }}
          >
            {settings.ctaText}
          </a>
        )}
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// CONTACT FORM
// ──────────────────────────────

export function ContactFormSection({ settings, enableAnimations }: any) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="py-24 px-6 max-w-2xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight uppercase text-white">{settings.title || "Get in touch"}</h2>
          {settings.subtitle && <p className="text-white/60 mt-3">{settings.subtitle}</p>}
        </div>
        {submitted ? (
          <div className="text-center text-white/80 py-12">Thanks — we'll be in touch.</div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <input
              type="text"
              required
              placeholder="Name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white outline-none focus:border-white/30"
            />
            <input
              type="email"
              required
              placeholder="Email"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white outline-none focus:border-white/30"
            />
            {settings.showPhone && (
              <input
                type="tel"
                placeholder="Phone"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white outline-none focus:border-white/30"
              />
            )}
            <textarea
              required
              placeholder="Message"
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white outline-none focus:border-white/30 resize-none"
            />
            <button
              type="submit"
              className="w-full py-4 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase text-black"
              style={{ backgroundColor: settings.accentColor || "#A855F7" }}
            >
              {settings.buttonLabel || "Send message"}
            </button>
          </form>
        )}
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// MAP
// ──────────────────────────────

export function MapSection({ settings, enableAnimations }: any) {
  const query = settings.address || "New York, NY";
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  return (
    <section className="py-12 px-6 max-w-7xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        {settings.title && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight uppercase text-white">{settings.title}</h2>
            {settings.address && (
              <p className="text-white/60 mt-2 flex items-center justify-center gap-2 text-sm">
                <MapPin size={14} />
                {settings.address}
              </p>
            )}
          </div>
        )}
        <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
          <iframe
            src={src}
            title={settings.title || "Map"}
            loading="lazy"
            className="w-full h-full border-0"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </AnimationContainer>
    </section>
  );
}

// ──────────────────────────────
// IMAGE GALLERY
// ──────────────────────────────

export function GallerySection({ settings, enableAnimations }: any) {
  const items = settings.items || settings.blocks || [];
  const cols = Math.max(2, Math.min(6, settings.columns ?? 3));
  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      <AnimationContainer enabled={enableAnimations}>
        {settings.title && (
          <h2 className="text-3xl font-bold tracking-tight uppercase text-white mb-8 text-center">{settings.title}</h2>
        )}
      </AnimationContainer>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((item: any, idx: number) => (
          <a
            key={idx}
            href={item.linkUrl || item.imageUrl || "#"}
            target={item.linkUrl ? "_blank" : undefined}
            rel="noreferrer"
            className="block aspect-square overflow-hidden rounded-xl bg-white/5"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.alt || ""}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
