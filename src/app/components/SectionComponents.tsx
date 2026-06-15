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

// Blocks can be hidden from the editor's outline tree without deleting them.
function visibleBlocks(list: any[]): any[] {
  return (list || []).filter((b: any) => !b?.hidden);
}

// ──────────────────────────────
// Per-section style helpers
// ──────────────────────────────

function hStyle(s: any) {
  return {
    ...(s.headingColor && { color: s.headingColor }),
    ...(s.headingSize && { fontSize: `${s.headingSize}px` }),
    ...(s.headingWeight && { fontWeight: s.headingWeight }),
    ...(s.textTransform && { textTransform: s.textTransform }),
    ...(s.letterSpacingOverride != null && s.letterSpacingOverride !== 0 && { letterSpacing: `${s.letterSpacingOverride}em` }),
    ...(s.lineHeightOverride != null && { lineHeight: s.lineHeightOverride }),
  };
}

function bStyle(s: any) {
  return {
    ...(s.bodyColor && { color: s.bodyColor }),
    ...(s.lineHeightOverride != null && { lineHeight: s.lineHeightOverride }),
  };
}

function aClass(s: any) {
  return s.align === "left" ? "text-left" : s.align === "right" ? "text-right" : "text-center";
}

// Background: gradient > solid color > image > nothing
function bgStyle(s: any): Record<string, any> {
  if (s.bgGradientFrom && s.bgGradientTo) {
    return { background: `linear-gradient(${s.bgGradientDir || "to bottom"}, ${s.bgGradientFrom}, ${s.bgGradientTo})` };
  }
  if (s.bgColor) return { backgroundColor: s.bgColor };
  if (s.bgImageUrl) {
    return {
      backgroundImage: `url(${s.bgImageUrl})`,
      backgroundSize: s.bgImageSize || "cover",
      backgroundPosition: s.bgImagePosition || "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return {};
}

// Spacing overrides (applied to the inner content container)
function spacingStyle(s: any) {
  return {
    ...(s.paddingTop != null && { paddingTop: `${s.paddingTop}px` }),
    ...(s.paddingBottom != null && { paddingBottom: `${s.paddingBottom}px` }),
    ...(s.paddingLeft != null && { paddingLeft: `${s.paddingLeft}px` }),
    ...(s.paddingRight != null && { paddingRight: `${s.paddingRight}px` }),
  };
}

// Container max-width: section setting (containerWidth) > content field (maxWidth) > default
const MW_MAP: Record<string, string> = {
  xs: "max-w-2xl",  narrow: "max-w-2xl",
  sm: "max-w-4xl",  normal: "max-w-4xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",  wide: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

function mw(s: any, fallback = "max-w-7xl"): string {
  return MW_MAP[s.containerWidth] || MW_MAP[s.maxWidth] || fallback;
}

// Button overrides (spread on top of default button style)
function btnS(s: any): Record<string, any> {
  const r: Record<string, any> = {};
  const st = s.btnStyle;
  if (st === "outline") {
    r.backgroundColor = "transparent";
    r.border = `1.5px solid ${s.btnBg || "currentColor"}`;
    r.color = s.btnText || s.btnBg || undefined;
  } else if (st === "ghost") {
    r.backgroundColor = "transparent";
    r.border = "none";
    r.color = s.btnText || s.btnBg || undefined;
  } else {
    if (s.btnBg) r.backgroundColor = s.btnBg;
    if (s.btnText) r.color = s.btnText;
  }
  if (s.btnRadius != null) r.borderRadius = `${s.btnRadius}px`;
  if (s.btnUppercase != null) r.textTransform = s.btnUppercase ? "uppercase" : "none";
  return r;
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
      : "h-screen min-h-[600px]";

  return (
    <section
      className={`relative w-full ${heightCls} flex items-center overflow-hidden ${
        settings.align === "left" ? "justify-start" : settings.align === "right" ? "justify-end" : "justify-center"
      }`}
      style={{ backgroundColor: settings.backgroundColor || "#000", ...bgStyle(settings) }}
    >
      {settings.imageUrl && (
        <img src={settings.imageUrl} alt="" loading="eager" decoding="async" fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0" style={{ backgroundColor: "rgb(var(--overlay-rgb))", opacity: settings.overlayOpacity ?? 0.5 }} />
      <div
        className={`relative z-10 px-6 max-w-3xl ${
          settings.align === "left" ? "text-left" : settings.align === "right" ? "text-right" : "text-center"
        }`}
      >
        <AnimationContainer enabled={enableAnimations}>
          <h1
            className="text-4xl md:text-6xl font-black tracking-tight uppercase mb-6 leading-none text-white"
            style={hStyle(settings)}
            data-theme-field="title"
          >
            {settings.title || "Lyricalmyrical"}
          </h1>
          <p
            className="text-sm md:text-md tracking-[0.3em] font-medium text-white/70 uppercase mb-10"
            style={bStyle(settings)}
            data-theme-field="subtitle"
          >
            {settings.subtitle || "Photography & Art Books"}
          </p>
          <div className={`flex flex-wrap items-center gap-4 ${
            settings.align === "left" ? "justify-start" : settings.align === "right" ? "justify-end" : "justify-center"
          }`}>
            <button
              onClick={onCtaClick}
              className="px-8 py-3.5 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase hover:scale-105 transition-transform"
              style={{ backgroundColor: settings.accentColor || "var(--btn-bg, #A855F7)", color: "var(--btn-text, #000000)", ...btnS(settings) }}
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
  const items = visibleBlocks(settings.items || settings.blocks || []);
  const cols = settings.columns ?? 3;
  const textAlign = aClass(settings);
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-24 px-6 mx-auto ${mw(settings)}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          <div className={`mb-10 ${textAlign}`}>
            <h2 className="text-3xl font-bold tracking-tight uppercase text-white" style={hStyle(settings)} data-theme-field="title">
              {settings.title || "Highlights"}
            </h2>
            {settings.subtitle && (
              <p className="mt-3 text-white/60 text-sm leading-relaxed" style={bStyle(settings)}>{settings.subtitle}</p>
            )}
          </div>
        </AnimationContainer>
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {(items.length ? items : [{ title: "Feature One", description: "Describe your value." }]).map((item: any, idx: number) => (
            <AnimationContainer key={idx} enabled={enableAnimations} delay={idx * 0.1}>
              <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl">
                {item.icon && <div className="text-3xl mb-3">{item.icon}</div>}
                <h3 className="text-sm font-bold uppercase text-white" style={bStyle(settings)}>{item.title}</h3>
                <p className="text-xs text-white/50 mt-2" style={bStyle(settings)}>{item.description}</p>
              </div>
            </AnimationContainer>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────
// NEWSLETTER
// ──────────────────────────────

export function NewsletterSection({ settings, enableAnimations }: any) {
  const textAlign = aClass(settings);
  return (
    <section className="border-t border-white/5 bg-white/[0.02]" style={bgStyle(settings)}>
      <div className="py-24 px-6 mx-auto" style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          <div className={`max-w-xl mx-auto space-y-8 ${textAlign}`}>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight uppercase text-white" style={hStyle(settings)} data-theme-field="title">
                {settings.title || "Join the Archive"}
              </h2>
              <p className="text-xs text-white/40 tracking-widest leading-relaxed" style={bStyle(settings)}>
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
                className="fm-active rounded-full px-8 py-3 text-[10px] font-bold tracking-widest transition-all flex items-center gap-2"
                style={{ backgroundColor: settings.accentColor || "var(--btn-bg, #fff)", color: "var(--btn-text, #000)", ...btnS(settings) }}
              >
                <Send size={12} />
                {settings.buttonLabel || "JOIN"}
              </button>
            </form>
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// TESTIMONIALS
// ──────────────────────────────

export function TestimonialsSection({ settings, enableAnimations }: any) {
  const items = visibleBlocks(settings.items || settings.blocks || []);
  const textAlign = aClass(settings);
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-24 px-6 mx-auto ${mw(settings, "max-w-6xl")}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          <div className={`mb-8 ${textAlign}`}>
            <h2 className="text-3xl font-bold tracking-tight uppercase leading-tight text-white" style={hStyle(settings)} data-theme-field="title">
              {settings.title || "Testimonials"}
            </h2>
            {settings.subtitle && (
              <p className="mt-3 text-white/60 text-sm leading-relaxed" style={bStyle(settings)}>{settings.subtitle}</p>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {(items.length ? items : [{ quote: "An incredible independent shop.", author: "Customer" }]).map((item: any, idx: number) => (
              <div key={idx} className="p-6 bg-white/[0.03] rounded-2xl border border-white/10">
                <p className="text-white/70 text-lg leading-relaxed font-light" style={bStyle(settings)}>"{item.quote}"</p>
                <p className="text-white/40 text-xs mt-4 uppercase tracking-widest" style={bStyle(settings)}>{item.author}</p>
                {item.role && <p className="text-white/30 text-[10px] mt-1" style={bStyle(settings)}>{item.role}</p>}
              </div>
            ))}
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// FAQ
// ──────────────────────────────

export function FAQSection({ settings, enableAnimations }: any) {
  const items = visibleBlocks(settings.items || settings.blocks || []);
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-24 px-6 mx-auto ${mw(settings, "max-w-4xl")}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight uppercase leading-tight text-white" style={hStyle(settings)} data-theme-field="title">
              {settings.title || "FAQ"}
            </h2>
            {settings.subtitle && (
              <p className="mt-3 text-white/60 text-sm leading-relaxed" style={bStyle(settings)}>{settings.subtitle}</p>
            )}
          </div>
          <div className="space-y-3">
            {(items.length ? items : [{ question: "Sample question?", answer: "Sample answer." }]).map((item: any, idx: number) => (
              <details key={idx} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <summary className="text-sm font-bold text-white cursor-pointer" style={bStyle(settings)}>{item.question}</summary>
                <p className="text-white/60 text-sm mt-3" style={bStyle(settings)}>{item.answer}</p>
              </details>
            ))}
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// TEXT CONTENT
// ──────────────────────────────

export function TextContentSection({ settings, enableAnimations }: any) {
  const textAlign = aClass(settings);
  const hasHtml = settings.content && /<[a-z][\s\S]*>/i.test(settings.content);
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-24 px-6 mx-auto ${mw(settings, "max-w-4xl")} ${textAlign}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          <div className="space-y-5">
            {settings.eyebrow && (
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50" style={bStyle(settings)}>
                {settings.eyebrow}
              </p>
            )}
            {settings.title && (
              <h2 className="text-3xl font-bold tracking-tight uppercase leading-tight text-white" style={hStyle(settings)}>
                {settings.title}
              </h2>
            )}
            {settings.subtitle && (
              <p className="text-lg text-white/70 leading-relaxed" style={bStyle(settings)}>{settings.subtitle}</p>
            )}
            {settings.content && (
              hasHtml ? (
                <div className="prose prose-invert max-w-none" style={bStyle(settings)} dangerouslySetInnerHTML={{ __html: settings.content }} />
              ) : (
                <p className="text-white/60 text-lg leading-relaxed font-light" style={bStyle(settings)}>{settings.content}</p>
              )
            )}
            {!settings.title && !settings.content && (
              <p className="text-white/60 text-lg leading-relaxed font-light">Add your mission statement or store introduction here.</p>
            )}
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// IMAGE WITH TEXT
// ──────────────────────────────

export function ImageWithTextSection({ settings, enableAnimations }: any) {
  const reverse = settings.layout === "text-left";
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-24 px-6 mx-auto ${mw(settings)}`} style={spacingStyle(settings)}>
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
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50" style={bStyle(settings)}>{settings.eyebrow}</p>
              )}
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white" style={hStyle(settings)} data-theme-field="title">
                {settings.title || "About the collection"}
              </h2>
              <p className="text-white/60 leading-relaxed" style={bStyle(settings)} data-theme-field="body">
                {settings.body || "Pair text with an image to give focus to your chosen product or collection."}
              </p>
              {settings.ctaText && (
                <a
                  href={settings.ctaUrl || "#"}
                  className="inline-block px-7 py-3 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase"
                  style={{ backgroundColor: settings.accentColor || "var(--btn-bg, #A855F7)", color: "var(--btn-text, #000000)", ...btnS(settings) }}
                >
                  {settings.ctaText}
                </a>
              )}
            </div>
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// RICH TEXT
// ──────────────────────────────

export function RichTextSection({ settings, enableAnimations }: any) {
  const align = settings.align || "center";
  return (
    <section style={bgStyle(settings)}>
      <div className="py-20 px-6" style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          <div
            className={`${mw(settings, "max-w-3xl")} mx-auto prose prose-invert ${align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"}`}
            style={bStyle(settings)}
            dangerouslySetInnerHTML={{ __html: settings.html || "<p>Use this rich text section to share information with your customers.</p>" }}
          />
        </AnimationContainer>
      </div>
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

  const phrase = Array.from({ length: 4 }).map(() => text).join(`  ${separator}  `);

  return (
    <section className="overflow-hidden py-8" style={{ background, ...bgStyle(settings) }}>
      <div className="flex w-max animate-marquee" style={{ ["--marquee-duration" as any]: `${speed}s` }}>
        {[0, 1].map((copy) => (
          <span
            key={copy}
            aria-hidden={copy === 1}
            className={`px-6 ${bold ? "font-black" : "font-medium"} ${uppercase ? "uppercase" : ""} tracking-tight`}
            style={{ fontSize, color }}
          >
            {phrase}
            {`  ${separator}  `}
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
  const items = visibleBlocks(settings.items || settings.blocks || []);
  const cols = Math.max(2, Math.min(6, settings.columns ?? 3));
  const textAlign = aClass(settings);
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-24 px-6 mx-auto ${mw(settings)}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          {(settings.title || settings.subtitle) && (
            <div className={`mb-12 ${textAlign}`}>
              {settings.title && (
                <h2 className="text-3xl font-bold tracking-tight uppercase text-white" style={hStyle(settings)} data-theme-field="title">
                  {settings.title}
                </h2>
              )}
              {settings.subtitle && (
                <p className="mt-3 text-white/60 text-sm leading-relaxed" style={bStyle(settings)}>{settings.subtitle}</p>
              )}
            </div>
          )}
        </AnimationContainer>
        <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {items.map((item: any, idx: number) => (
            <AnimationContainer key={idx} enabled={enableAnimations} delay={idx * 0.1}>
              <div className={`space-y-4 ${textAlign}`}>
                {item.imageUrl && (
                  <div className="aspect-square w-32 mx-auto rounded-full overflow-hidden border border-white/10">
                    <img src={item.imageUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={item.title || ""} />
                  </div>
                )}
                <h3 className="text-lg font-bold text-white" style={bStyle(settings)}>{item.title || "Column"}</h3>
                <p className="text-white/60 text-sm" style={bStyle(settings)}>{item.body || ""}</p>
                {item.linkText && (
                  <a href={item.linkUrl || "#"} className="text-xs font-bold tracking-widest uppercase text-white/80 underline">
                    {item.linkText}
                  </a>
                )}
              </div>
            </AnimationContainer>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────
// SLIDESHOW (with slide blocks)
// ──────────────────────────────

export function SlideshowSection({ settings, enableAnimations }: any) {
  const slides = visibleBlocks(settings.slides || settings.items || settings.blocks || []);
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
      <div className="absolute inset-0" style={{ backgroundColor: "rgb(var(--overlay-rgb))", opacity: slide.overlayOpacity ?? 0.4 }} />
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
              <button key={i} onClick={() => setActive(i)} className={`w-2 h-2 rounded-full transition-all ${i === active ? "bg-white w-6" : "bg-white/40"}`} />
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
    <section style={bgStyle(settings)}>
      <div className={`py-24 px-6 mx-auto ${mw(settings, "max-w-6xl")}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          {(settings.eyebrow || settings.title || settings.subtitle) && (
            <div className="text-center mb-8">
              {settings.eyebrow && (
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50 mb-3" style={bStyle(settings)}>{settings.eyebrow}</p>
              )}
              {settings.title && (
                <h2 className="text-3xl font-bold tracking-tight uppercase text-white" style={hStyle(settings)}>{settings.title}</h2>
              )}
              {settings.subtitle && (
                <p className="mt-3 text-white/60 text-sm leading-relaxed" style={bStyle(settings)}>{settings.subtitle}</p>
              )}
            </div>
          )}
          <div className="aspect-video w-full overflow-hidden rounded-2xl fm-surface border border-white/10">
            {embed ? (
              <iframe src={embed} title={settings.title || "Video"} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="w-full h-full" />
            ) : url ? (
              <video src={url} controls poster={settings.posterUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-xs uppercase tracking-widest">
                Paste a YouTube, Vimeo or MP4 URL
              </div>
            )}
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// LOGO LIST
// ──────────────────────────────

export function LogoListSection({ settings, enableAnimations }: any) {
  const items = visibleBlocks(settings.items || settings.blocks || []);
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-16 px-6 mx-auto ${mw(settings)}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          {(settings.title || settings.subtitle) && (
            <div className="text-center mb-8">
              {settings.title && (
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40" style={hStyle(settings)}>{settings.title}</p>
              )}
              {settings.subtitle && (
                <p className="mt-2 text-white/40 text-xs" style={bStyle(settings)}>{settings.subtitle}</p>
              )}
            </div>
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
      </div>
    </section>
  );
}

// ──────────────────────────────
// COLLAPSIBLE / ACCORDION
// ──────────────────────────────

export function CollapsibleSection({ settings, enableAnimations }: any) {
  const items = visibleBlocks(settings.items || settings.blocks || []);
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-20 px-6 mx-auto ${mw(settings, "max-w-3xl")}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          {(settings.title || settings.subtitle) && (
            <div className="text-center mb-8">
              {settings.title && (
                <h2 className="text-3xl font-bold tracking-tight uppercase text-white" style={hStyle(settings)}>{settings.title}</h2>
              )}
              {settings.subtitle && (
                <p className="mt-3 text-white/60 text-sm leading-relaxed" style={bStyle(settings)}>{settings.subtitle}</p>
              )}
            </div>
          )}
          <div className="border-t border-white/10">
            {items.map((item: any, idx: number) => (
              <details key={idx} className="border-b border-white/10 group">
                <summary className="flex items-center justify-between cursor-pointer py-5 text-white text-sm font-bold tracking-wide uppercase" style={bStyle(settings)}>
                  {item.heading || "Heading"}
                  <span className="text-white/40 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div
                  className="text-white/60 text-sm pb-6 prose prose-invert max-w-none"
                  style={bStyle(settings)}
                  dangerouslySetInnerHTML={{ __html: item.content || "" }}
                />
              </details>
            ))}
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// COLLECTION LIST
// ──────────────────────────────

export function CollectionListSection({ settings, enableAnimations }: any) {
  const items = visibleBlocks(settings.items || settings.blocks || []);
  const cols = Math.max(2, Math.min(5, settings.columns ?? 3));
  const textAlign = aClass(settings);
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-24 px-6 mx-auto ${mw(settings)}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          {(settings.title || settings.subtitle) && (
            <div className={`mb-10 ${textAlign}`}>
              {settings.title && (
                <h2 className="text-3xl font-bold tracking-tight uppercase text-white" style={hStyle(settings)}>{settings.title}</h2>
              )}
              {settings.subtitle && (
                <p className="mt-3 text-white/60 text-sm leading-relaxed" style={bStyle(settings)}>{settings.subtitle}</p>
              )}
            </div>
          )}
        </AnimationContainer>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {items.map((item: any, idx: number) => (
            <AnimationContainer key={idx} enabled={enableAnimations} delay={idx * 0.05}>
              <a href={item.linkUrl || "#"} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-white/5">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.title || ""} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
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
    <section style={bgStyle(settings)}>
      <div className={`py-24 px-6 mx-auto ${mw(settings, "max-w-6xl")}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-white/5">
              {photo ? <img src={photo} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={target.title} /> : null}
            </div>
            <div className="space-y-5">
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50" style={bStyle(settings)}>{settings.eyebrow || "Featured"}</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white" style={hStyle(settings)}>{target.title}</h2>
              {target.subtitle && <p className="text-white/60" style={bStyle(settings)}>{target.subtitle}</p>}
              <p className="text-2xl font-bold text-white" style={bStyle(settings)}>${typeof price === "number" ? price.toFixed(2) : price}</p>
              <p className="text-white/60 text-sm leading-relaxed line-clamp-4" style={bStyle(settings)}>{target.description || ""}</p>
              <button
                onClick={() => onProductClick?.(target)}
                className="px-8 py-3.5 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase"
                style={{ backgroundColor: settings.accentColor || "var(--btn-bg, #A855F7)", color: "var(--btn-text, #000000)", ...btnS(settings) }}
              >
                {settings.ctaText || "View product"}
              </button>
            </div>
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// CUSTOM HTML
// ──────────────────────────────

export function CustomHTMLSection({ settings }: any) {
  return (
    <section className={settings.fullBleed ? "" : "py-12 px-6 max-w-7xl mx-auto"} style={bgStyle(settings)}>
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
  const textAlign = aClass(settings);
  const flexAlign = settings.align === "left" ? "justify-start" : settings.align === "right" ? "justify-end" : "justify-center";

  return (
    <section style={{ background: settings.backgroundColor || "transparent", ...bgStyle(settings) }}>
      <div className={`py-20 px-6 ${textAlign}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          {settings.eyebrow && (
            <p className={`text-[10px] font-bold tracking-[0.3em] uppercase text-white/60 mb-4 flex items-center gap-2 ${flexAlign}`} style={bStyle(settings)}>
              <Clock size={12} />
              {settings.eyebrow}
            </p>
          )}
          <h2 className="text-3xl md:text-4xl font-bold uppercase text-white mb-2" style={hStyle(settings)}>
            {settings.title || "Limited time offer"}
          </h2>
          {settings.subtitle && <p className="text-white/60 mb-8" style={bStyle(settings)}>{settings.subtitle}</p>}
          <div className={`flex gap-4 md:gap-8 mt-8 ${flexAlign}`}>
            {[
              { label: "Days", v: days },
              { label: "Hours", v: hours },
              { label: "Min", v: minutes },
              { label: "Sec", v: seconds },
            ].map((u) => (
              <div key={u.label} className="text-center">
                <div className="text-4xl md:text-6xl font-black text-white tabular-nums" style={hStyle(settings)}>{String(u.v).padStart(2, "0")}</div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-white/50 mt-1" style={bStyle(settings)}>{u.label}</div>
              </div>
            ))}
          </div>
          {settings.ctaText && (
            <a
              href={settings.ctaUrl || "#"}
              className="inline-block mt-10 px-8 py-3.5 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase"
              style={{ backgroundColor: settings.accentColor || "var(--btn-bg, #A855F7)", color: "var(--btn-text, #000000)", ...btnS(settings) }}
            >
              {settings.ctaText}
            </a>
          )}
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// CONTACT FORM
// ──────────────────────────────

export function ContactFormSection({ settings, enableAnimations }: any) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-24 px-6 mx-auto ${mw(settings, "max-w-2xl")}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          <div className="text-center mb-10">
            {settings.eyebrow && (
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50 mb-3" style={bStyle(settings)}>{settings.eyebrow}</p>
            )}
            <h2 className="text-3xl font-bold tracking-tight uppercase text-white" style={hStyle(settings)}>
              {settings.title || "Get in touch"}
            </h2>
            {settings.subtitle && (
              <p className="text-white/60 mt-3" style={bStyle(settings)}>{settings.subtitle}</p>
            )}
          </div>
          {submitted ? (
            <div className="text-center text-white/80 py-12">Thanks — we'll be in touch.</div>
          ) : (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
              <input type="text" required placeholder="Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white outline-none focus:border-white/30" />
              <input type="email" required placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white outline-none focus:border-white/30" />
              {settings.showPhone && (
                <input type="tel" placeholder="Phone" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white outline-none focus:border-white/30" />
              )}
              <textarea required placeholder="Message" rows={5} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white outline-none focus:border-white/30 resize-none" />
              <button
                type="submit"
                className="w-full py-4 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase"
                style={{ backgroundColor: settings.accentColor || "var(--btn-bg, #A855F7)", color: "var(--btn-text, #000000)", ...btnS(settings) }}
              >
                {settings.buttonLabel || "Send message"}
              </button>
            </form>
          )}
        </AnimationContainer>
      </div>
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
    <section style={bgStyle(settings)}>
      <div className={`py-12 px-6 mx-auto ${mw(settings)}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          {(settings.title || settings.subtitle) && (
            <div className="text-center mb-8">
              {settings.title && (
                <h2 className="text-3xl font-bold tracking-tight uppercase text-white" style={hStyle(settings)}>{settings.title}</h2>
              )}
              {settings.subtitle && (
                <p className="mt-3 text-white/60 text-sm leading-relaxed" style={bStyle(settings)}>{settings.subtitle}</p>
              )}
              {settings.address && (
                <p className="text-white/60 mt-2 flex items-center justify-center gap-2 text-sm" style={bStyle(settings)}>
                  <MapPin size={14} />
                  {settings.address}
                </p>
              )}
            </div>
          )}
          {!settings.title && settings.address && (
            <div className="text-center mb-8">
              <p className="text-white/60 flex items-center justify-center gap-2 text-sm">
                <MapPin size={14} />
                {settings.address}
              </p>
            </div>
          )}
          <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            <iframe src={src} title={settings.title || "Map"} loading="lazy" className="w-full h-full border-0" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// ROW (multi-column layout where each column holds any block kind)
// ──────────────────────────────

function RowBlock({ block, accentFallback, settings }: any) {
  const kind = block.kind || "text";

  if (kind === "image") {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {block.imageUrl ? (
          <img src={block.imageUrl} alt={block.title || ""} loading="lazy" decoding="async" className="w-full h-auto object-cover" />
        ) : (
          <div className="aspect-video w-full flex items-center justify-center text-white/20 text-xs uppercase tracking-widest">No Image</div>
        )}
      </div>
    );
  }

  if (kind === "button") {
    return (
      <div className="flex justify-center">
        <a
          href={block.buttonUrl || "#"}
          className="inline-block px-8 py-3.5 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase"
          style={{ backgroundColor: block.accentColor || accentFallback || "var(--btn-bg, #A855F7)", color: "var(--btn-text, #000000)", ...(settings ? btnS(settings) : {}) }}
        >
          {block.buttonText || "Shop now"}
        </a>
      </div>
    );
  }

  if (kind === "video") {
    const url = block.videoUrl || "";
    const ytId = url.match(/(?:v=|youtu\.be\/)([\w-]{6,})/)?.[1];
    const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
    const embed = ytId ? `https://www.youtube.com/embed/${ytId}?rel=0` : vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : "";
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl fm-surface border border-white/10">
        {embed ? (
          <iframe src={embed} title={block.title || "Video"} allow="autoplay; fullscreen" allowFullScreen className="w-full h-full" />
        ) : url ? (
          <video src={url} controls className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-xs uppercase tracking-widest">No Video</div>
        )}
      </div>
    );
  }

  // text (default)
  return (
    <div className="space-y-4">
      {block.title && <h3 className="text-2xl font-bold tracking-tight text-white" style={settings ? hStyle(settings) : {}}>{block.title}</h3>}
      {block.body && <p className="text-white/60 leading-relaxed text-sm" style={settings ? bStyle(settings) : {}}>{block.body}</p>}
      {block.buttonText && (
        <a
          href={block.buttonUrl || "#"}
          className="inline-block text-[10px] font-bold tracking-[0.25em] uppercase underline underline-offset-4"
          style={{ color: block.accentColor || accentFallback || undefined }}
        >
          {block.buttonText}
        </a>
      )}
    </div>
  );
}

export function RowSection({ settings, enableAnimations }: any) {
  const blocks = visibleBlocks(settings.items || settings.blocks || []);
  const template =
    ({
      "50-50": "1fr 1fr",
      "33-67": "1fr 2fr",
      "67-33": "2fr 1fr",
      thirds: "1fr 1fr 1fr",
      quarters: "1fr 1fr 1fr 1fr",
    } as Record<string, string>)[settings.layout || "50-50"] || "1fr 1fr";
  const alignItems = settings.verticalAlign === "top" ? "start" : settings.verticalAlign === "bottom" ? "end" : "center";
  const gap = Math.max(8, Math.min(120, settings.gap ?? 48));

  return (
    <section style={bgStyle(settings)}>
      <div className={`py-20 px-6 mx-auto ${mw(settings)}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          {settings.title && (
            <h2 className="text-3xl font-bold tracking-tight uppercase text-white mb-12 text-center" style={hStyle(settings)} data-theme-field="title">
              {settings.title}
            </h2>
          )}
          <div
            className="grid grid-cols-1 md:[grid-template-columns:var(--row-template)]"
            style={{ ["--row-template" as any]: template, gap, alignItems }}
          >
            {(blocks.length ? blocks : [{ kind: "text", title: "Add columns", body: "Use the Row section to combine text, images, buttons and video side by side." }]).map(
              (block: any, idx: number) => (
                <RowBlock key={idx} block={block} accentFallback={settings.accentColor} settings={settings} />
              ),
            )}
          </div>
        </AnimationContainer>
      </div>
    </section>
  );
}

// ──────────────────────────────
// IMAGE GALLERY
// ──────────────────────────────

export function GallerySection({ settings, enableAnimations }: any) {
  const items = visibleBlocks(settings.items || settings.blocks || []);
  const cols = Math.max(2, Math.min(6, settings.columns ?? 3));
  const textAlign = aClass(settings);
  return (
    <section style={bgStyle(settings)}>
      <div className={`py-20 px-6 mx-auto ${mw(settings)}`} style={spacingStyle(settings)}>
        <AnimationContainer enabled={enableAnimations}>
          {(settings.title || settings.subtitle) && (
            <div className={`mb-8 ${textAlign}`}>
              {settings.title && (
                <h2 className="text-3xl font-bold tracking-tight uppercase text-white" style={hStyle(settings)}>{settings.title}</h2>
              )}
              {settings.subtitle && (
                <p className="mt-3 text-white/60 text-sm leading-relaxed" style={bStyle(settings)}>{settings.subtitle}</p>
              )}
            </div>
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
                <img src={item.imageUrl} alt={item.alt || ""} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
