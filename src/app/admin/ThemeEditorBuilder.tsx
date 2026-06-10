import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Globe,
  LayoutTemplate,
  Plus,
  Search,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { adminApi } from "./api";
import {
  NewSectionLibraryModal,
  getSectionMeta,
  getSectionFields,
  getBlockFields,
  BlocksEditor,
  SectionFieldEditor,
  SectionSettingsPanel,
} from "./ThemeEditorExtensions";

// ─────────────────────────────────────────────────────────────────────────────
// Google Fonts catalog — popular families across every category.
// Loaded on demand, so listing them costs nothing until previewed.
// ─────────────────────────────────────────────────────────────────────────────
type FontCategory = "sans" | "serif" | "display" | "handwriting" | "mono";

const F = (n: string, c: FontCategory) => ({ n, c });

export const GOOGLE_FONT_CATALOG: { n: string; c: FontCategory }[] = [
  // Sans-serif
  F("Inter", "sans"), F("Roboto", "sans"), F("Open Sans", "sans"), F("Lato", "sans"),
  F("Montserrat", "sans"), F("Poppins", "sans"), F("Raleway", "sans"), F("Nunito", "sans"),
  F("Ubuntu", "sans"), F("Rubik", "sans"), F("Work Sans", "sans"), F("Mulish", "sans"),
  F("Barlow", "sans"), F("Kanit", "sans"), F("Heebo", "sans"), F("DM Sans", "sans"),
  F("Manrope", "sans"), F("Karla", "sans"), F("Josefin Sans", "sans"), F("Outfit", "sans"),
  F("Sora", "sans"), F("Figtree", "sans"), F("Plus Jakarta Sans", "sans"), F("Lexend", "sans"),
  F("Urbanist", "sans"), F("Cabin", "sans"), F("Exo 2", "sans"), F("Archivo", "sans"),
  F("Asap", "sans"), F("Assistant", "sans"), F("Catamaran", "sans"), F("Chivo", "sans"),
  F("Dosis", "sans"), F("Fira Sans", "sans"), F("Hind", "sans"), F("IBM Plex Sans", "sans"),
  F("Jost", "sans"), F("Libre Franklin", "sans"), F("Maven Pro", "sans"), F("Overpass", "sans"),
  F("PT Sans", "sans"), F("Quicksand", "sans"), F("Red Hat Display", "sans"), F("Source Sans 3", "sans"),
  F("Space Grotesk", "sans"), F("Titillium Web", "sans"), F("Varela Round", "sans"), F("Albert Sans", "sans"),
  F("Public Sans", "sans"), F("Be Vietnam Pro", "sans"), F("Epilogue", "sans"), F("Hanken Grotesk", "sans"),
  F("Instrument Sans", "sans"), F("Schibsted Grotesk", "sans"), F("Onest", "sans"), F("Gabarito", "sans"),
  F("Oswald", "sans"), F("Barlow Condensed", "sans"), F("Saira", "sans"), F("Smooch Sans", "sans"),
  // Serif
  F("Playfair Display", "serif"), F("Merriweather", "serif"), F("Lora", "serif"), F("PT Serif", "serif"),
  F("Noto Serif", "serif"), F("Crimson Text", "serif"), F("Libre Baskerville", "serif"), F("EB Garamond", "serif"),
  F("Cormorant", "serif"), F("Cormorant Garamond", "serif"), F("Bitter", "serif"), F("Domine", "serif"),
  F("Spectral", "serif"), F("Source Serif 4", "serif"), F("Frank Ruhl Libre", "serif"), F("Cardo", "serif"),
  F("Arvo", "serif"), F("Zilla Slab", "serif"), F("Roboto Slab", "serif"), F("Vollkorn", "serif"),
  F("Alegreya", "serif"), F("Literata", "serif"), F("Fraunces", "serif"), F("Newsreader", "serif"),
  F("Petrona", "serif"), F("DM Serif Display", "serif"), F("DM Serif Text", "serif"), F("Libre Caslon Text", "serif"),
  F("Marcellus", "serif"), F("Prata", "serif"), F("Cinzel", "serif"), F("Eczar", "serif"),
  F("Gelasio", "serif"), F("Crimson Pro", "serif"), F("Besley", "serif"), F("Ibarra Real Nova", "serif"),
  F("Playfair", "serif"), F("Instrument Serif", "serif"), F("Bodoni Moda", "serif"), F("Young Serif", "serif"),
  // Display
  F("Bebas Neue", "display"), F("Anton", "display"), F("Archivo Black", "display"), F("Abril Fatface", "display"),
  F("Alfa Slab One", "display"), F("Righteous", "display"), F("Passion One", "display"), F("Staatliches", "display"),
  F("Bungee", "display"), F("Fredoka", "display"), F("Lobster", "display"), F("Lilita One", "display"),
  F("Titan One", "display"), F("Russo One", "display"), F("Orbitron", "display"), F("Audiowide", "display"),
  F("Monoton", "display"), F("Ultra", "display"), F("Yeseva One", "display"), F("Syne", "display"),
  F("Unbounded", "display"), F("Black Ops One", "display"), F("Calistoga", "display"), F("Carter One", "display"),
  F("Concert One", "display"), F("Luckiest Guy", "display"), F("Paytone One", "display"), F("Secular One", "display"),
  F("Shrikhand", "display"), F("Sigmar One", "display"), F("Squada One", "display"), F("Bricolage Grotesque", "display"),
  // Handwriting
  F("Caveat", "handwriting"), F("Dancing Script", "handwriting"), F("Pacifico", "handwriting"),
  F("Shadows Into Light", "handwriting"), F("Indie Flower", "handwriting"), F("Satisfy", "handwriting"),
  F("Great Vibes", "handwriting"), F("Amatic SC", "handwriting"), F("Kalam", "handwriting"),
  F("Patrick Hand", "handwriting"), F("Sacramento", "handwriting"), F("Courgette", "handwriting"),
  F("Cookie", "handwriting"), F("Parisienne", "handwriting"), F("Allura", "handwriting"),
  F("Yellowtail", "handwriting"), F("Gloria Hallelujah", "handwriting"), F("Homemade Apple", "handwriting"),
  F("Reenie Beanie", "handwriting"), F("Mr Dafoe", "handwriting"), F("Marck Script", "handwriting"),
  F("Bad Script", "handwriting"), F("Handlee", "handwriting"),
  // Monospace
  F("Roboto Mono", "mono"), F("Source Code Pro", "mono"), F("IBM Plex Mono", "mono"),
  F("Space Mono", "mono"), F("JetBrains Mono", "mono"), F("Fira Code", "mono"),
  F("Inconsolata", "mono"), F("Ubuntu Mono", "mono"), F("Cousine", "mono"),
  F("PT Mono", "mono"), F("Overpass Mono", "mono"), F("DM Mono", "mono"),
  F("Red Hat Mono", "mono"), F("Martian Mono", "mono"), F("Azeret Mono", "mono"),
];

const FONT_CATEGORY_LABELS: { id: FontCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "display", label: "Display" },
  { id: "handwriting", label: "Script" },
  { id: "mono", label: "Mono" },
];

// Lightweight loader for preview specimens (400/700 only).
function PreviewFontLoader({ font }: { font: string }) {
  useEffect(() => {
    if (!font) return;
    const linkId = `gf-preview-${font.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, "+")}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }, [font]);
  return null;
}

const RECENT_FONTS_KEY = "fm-theme-recent-fonts";

function getRecentFonts(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_FONTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecentFont(font: string) {
  try {
    const next = [font, ...getRecentFonts().filter((f) => f !== font)].slice(0, 8);
    localStorage.setItem(RECENT_FONTS_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — recents just won't persist
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Font Browser modal — search the whole catalog, preview live, apply to
// body / heading / both.
// ─────────────────────────────────────────────────────────────────────────────
export function FontBrowserModal({
  onApply,
  onClose,
  previewText,
}: {
  onApply: (font: string, target: "body" | "heading" | "both") => void;
  onClose: () => void;
  previewText?: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FontCategory | "all">("all");
  const [target, setTarget] = useState<"body" | "heading" | "both">("heading");
  const [visibleCount, setVisibleCount] = useState(24);
  const [recents, setRecents] = useState<string[]>(getRecentFonts);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GOOGLE_FONT_CATALOG.filter(
      (f) => (category === "all" || f.c === category) && (!q || f.n.toLowerCase().includes(q)),
    );
  }, [search, category]);

  const visible = filtered.slice(0, visibleCount);
  const specimen = previewText || "The quick brown fox jumps over the lazy dog";

  const apply = (font: string) => {
    pushRecentFont(font);
    setRecents(getRecentFonts());
    onApply(font, target);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 16 }}
          className="bg-[#0c0c0e] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pt-7 pb-4 border-b border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.4em] font-black text-violet-400 uppercase italic mb-1">Font Browser</p>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                  {GOOGLE_FONT_CATALOG.length}+ Google Fonts
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setVisibleCount(24);
                  }}
                  placeholder="Search fonts…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
                />
              </div>
              <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
                {FONT_CATEGORY_LABELS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCategory(c.id);
                      setVisibleCount(24);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      category === c.id ? "bg-violet-600 text-white" : "text-slate-500 hover:text-white"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black tracking-[0.3em] text-slate-600 uppercase">Apply to</span>
              {([
                { id: "heading", label: "Headings" },
                { id: "body", label: "Body" },
                { id: "both", label: "Both" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTarget(t.id)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                    target === t.id
                      ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                      : "bg-white/[0.03] text-slate-600 border-white/5 hover:text-slate-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto p-6 space-y-6">
            {recents.length > 0 && !search && category === "all" && (
              <div>
                <p className="text-[9px] font-black tracking-[0.3em] text-amber-400 uppercase italic mb-2">Recently used</p>
                <div className="flex flex-wrap gap-2">
                  {recents.map((font) => (
                    <button
                      key={font}
                      onClick={() => apply(font)}
                      className="px-4 py-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 hover:border-amber-400/50 text-white text-sm transition-all"
                      style={{ fontFamily: `'${font}', sans-serif` }}
                    >
                      <PreviewFontLoader font={font} />
                      {font}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {visible.map((font) => (
                <button
                  key={font.n}
                  onClick={() => apply(font.n)}
                  className="w-full text-left px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
                >
                  <PreviewFontLoader font={font.n} />
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase group-hover:text-violet-300 transition-colors">
                      {font.n}
                    </span>
                    <span className="text-[8px] font-black tracking-[0.25em] text-slate-700 uppercase">{font.c}</span>
                  </div>
                  <p className="text-xl text-white leading-snug truncate" style={{ fontFamily: `'${font.n}', sans-serif` }}>
                    {specimen}
                  </p>
                </button>
              ))}
              {visible.length === 0 && (
                <p className="py-12 text-center text-[10px] tracking-[0.3em] text-slate-600 uppercase italic">No fonts match</p>
              )}
            </div>

            {visibleCount < filtered.length && (
              <button
                onClick={() => setVisibleCount((c) => c + 24)}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/40 text-[10px] font-black tracking-[0.2em] text-violet-400 uppercase italic"
              >
                Show more ({filtered.length - visibleCount} remaining)
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Scale Designer — base size + modular ratio → full heading hierarchy
// ─────────────────────────────────────────────────────────────────────────────
export const TYPE_SCALE_RATIOS = [
  { value: 1.125, label: "Major Second · 1.125" },
  { value: 1.2, label: "Minor Third · 1.2" },
  { value: 1.25, label: "Major Third · 1.25" },
  { value: 1.333, label: "Perfect Fourth · 1.333" },
  { value: 1.414, label: "Augmented Fourth · 1.414" },
  { value: 1.5, label: "Perfect Fifth · 1.5" },
  { value: 1.618, label: "Golden Ratio · 1.618" },
];

export function computeTypeScale(base: number, ratio: number) {
  const size = (steps: number) => Math.round(base * Math.pow(ratio, steps) * 10) / 10;
  return {
    h1: size(5),
    h2: size(4),
    h3: size(3),
    h4: size(2),
    h5: size(1),
    h6: base,
    body: base,
    caption: Math.round((base / ratio) * 10) / 10,
  };
}

export function TypeScaleDesigner({ design, update }: { design: any; update: (k: string, v: any) => void }) {
  const base = design.baseFontSize ?? (design.fontSize === "sm" ? 15 : design.fontSize === "lg" ? 18 : 16);
  const ratio = design.typeScale ?? 0;
  const activeRatio = ratio || 1.25;
  const scale = computeTypeScale(base, activeRatio);
  const headingFont = design.headingFont || design.font || "Inter";

  return (
    <div className="space-y-6">
      <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
        Pick a base size and a musical ratio — every heading level is computed automatically for a
        professionally tuned hierarchy.
      </p>

      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="text-[9px] font-black tracking-[0.3em] text-slate-500 uppercase">Base size</p>
          <span className="text-[10px] text-slate-400 font-black bg-white/5 px-2 py-1 rounded-lg border border-white/5 italic">
            {base}px
          </span>
        </div>
        <input
          type="range"
          min={12}
          max={22}
          step={0.5}
          value={base}
          onChange={(e) => update("baseFontSize", Number(e.target.value))}
          className="w-full accent-violet-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
        />
      </div>

      <div>
        <p className="text-[9px] font-black tracking-[0.3em] text-slate-500 uppercase mb-3">Scale ratio</p>
        <div className="grid grid-cols-1 gap-1.5">
          <button
            onClick={() => update("typeScale", undefined)}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest border text-left transition-all uppercase italic ${
              !ratio
                ? "bg-violet-600 border-violet-400/50 text-white"
                : "bg-white/[0.03] border-white/5 text-slate-500 hover:border-white/10"
            }`}
          >
            Off — theme defaults
          </button>
          {TYPE_SCALE_RATIOS.map((r) => (
            <button
              key={r.value}
              onClick={() => update("typeScale", r.value)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black tracking-widest border text-left transition-all uppercase italic ${
                ratio === r.value
                  ? "bg-violet-600 border-violet-400/50 text-white"
                  : "bg-white/[0.03] border-white/5 text-slate-500 hover:border-white/10"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live specimen sheet */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-2 overflow-hidden">
        <p className="text-[8px] font-black tracking-[0.3em] text-slate-600 uppercase mb-3 flex items-center gap-2">
          <Type size={10} /> Specimen {ratio ? `· ratio ${activeRatio}` : "· preview (off)"}
        </p>
        {([
          ["h1", scale.h1],
          ["h2", scale.h2],
          ["h3", scale.h3],
          ["h4", scale.h4],
        ] as const).map(([tag, px]) => (
          <div key={tag} className="flex items-baseline gap-3 min-w-0">
            <span className="text-[8px] font-black text-slate-600 uppercase w-7 flex-shrink-0">
              {tag} <span className="block text-slate-700">{px}</span>
            </span>
            <span
              className="text-white truncate leading-tight"
              style={{ fontSize: Math.min(px, 44), fontFamily: `'${headingFont}', sans-serif`, fontWeight: 800 }}
            >
              Archive
            </span>
          </div>
        ))}
        <div className="flex items-baseline gap-3 pt-2 border-t border-white/5">
          <span className="text-[8px] font-black text-slate-600 uppercase w-7 flex-shrink-0">
            Body <span className="block text-slate-700">{scale.body}</span>
          </span>
          <span className="text-white/70" style={{ fontSize: scale.body }}>
            Photography is literature — each book a record of vision, place and time.
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// A/B Layout Switcher — keep an alternate section arrangement and swap freely
// ─────────────────────────────────────────────────────────────────────────────
export function ABLayoutSwitcher({ design, update }: { design: any; update: (k: string, v: any) => void }) {
  const sections = design.sections || design.homepageSections || [];
  const alt: any[] | undefined = design.altSections;
  const activeLabel: string = design.layoutLabel || "A";
  const otherLabel = activeLabel === "A" ? "B" : "A";

  const copyToAlt = () => {
    update("altSections", JSON.parse(JSON.stringify(sections)));
  };

  const swap = () => {
    const current = JSON.parse(JSON.stringify(sections));
    update("sections", JSON.parse(JSON.stringify(alt || [])));
    update("altSections", current);
    update("layoutLabel", otherLabel);
  };

  return (
    <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate size={13} className="text-blue-600" />
          <span className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">A/B Layouts</span>
        </div>
        <span className="text-[9px] font-black tracking-widest uppercase bg-blue-600 text-white px-2.5 py-1 rounded-full">
          Layout {activeLabel}
        </span>
      </div>
      <p className="text-[9px] text-neutral-400 font-medium leading-relaxed">
        Keep two homepage arrangements and switch which one is live. The alternate
        {alt ? ` (Layout ${otherLabel}, ${alt.length} section${alt.length === 1 ? "" : "s"})` : ""} is saved with your theme.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={copyToAlt}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-neutral-200 bg-white text-neutral-600 hover:border-blue-300 hover:text-blue-600 transition-all"
        >
          <Copy size={11} />
          {alt ? `Overwrite ${otherLabel}` : `Copy → ${otherLabel}`}
        </button>
        <button
          onClick={swap}
          disabled={!alt}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all disabled:opacity-30 bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
        >
          <ArrowLeftRight size={11} />
          Switch to {otherLabel}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Sections — appear on every page, edited once
// ─────────────────────────────────────────────────────────────────────────────
export function GlobalSectionsPanel({
  design,
  update,
  colorSchemes = [],
}: {
  design: any;
  update: (k: string, v: any, isGlobal?: boolean) => void;
  colorSchemes?: any[];
}) {
  const sections: any[] = design.globalSections || [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const setSections = (next: any[]) => update("globalSections", next, true);

  const addSection = (type: string) => {
    const meta = getSectionMeta(type);
    const id = crypto.randomUUID();
    setSections([
      ...sections,
      { id, type, visible: true, settings: JSON.parse(JSON.stringify(meta?.defaults || {})) },
    ]);
    setActiveId(id);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const moveSection = (idx: number, dir: number) => {
    const to = idx + dir;
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    [next[idx], next[to]] = [next[to], next[idx]];
    setSections(next);
  };

  const toggleVisible = (id: string) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, visible: s.visible === false } : s)));
  };

  const updateSettings = (id: string, patch: any) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, settings: { ...s.settings, ...patch } } : s)));
  };

  const active = sections.find((s) => s.id === activeId);

  if (active) {
    const uploadFile = (file: File) => adminApi.uploadFile(file, `global-sections/${active.id}_${Date.now()}`);
    return (
      <div className="space-y-5">
        <button
          onClick={() => setActiveId(null)}
          className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-slate-400 hover:text-white transition-colors italic"
        >
          <ChevronLeft size={14} /> All global sections
        </button>
        <div className="bg-white rounded-2xl p-4 space-y-3">
          {getSectionFields(active.type).map((field: any) => (
            <SectionFieldEditor
              key={field.key}
              field={field}
              value={active.settings[field.key]}
              onChange={(v) => updateSettings(active.id, { [field.key]: v })}
              uploadFile={uploadFile}
            />
          ))}
          {getBlockFields(active.type).length > 0 && (
            <div className="pt-4 border-t border-neutral-100">
              <BlocksEditor
                sectionType={active.type}
                settings={active.settings}
                onUpdate={(patch: any) => updateSettings(active.id, patch)}
                uploadFile={uploadFile}
              />
            </div>
          )}
          <div className="pt-4 border-t border-neutral-100">
            <SectionSettingsPanel
              settings={active.settings}
              onUpdate={(patch: any) => updateSettings(active.id, patch)}
              colorSchemes={colorSchemes}
            />
          </div>
          <button
            onClick={() => removeSection(active.id)}
            className="w-full py-3 text-red-500 text-[10px] font-bold tracking-widest border-2 border-red-50 rounded-2xl hover:bg-red-50 transition-colors"
          >
            DELETE GLOBAL SECTION
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="p-5 bg-violet-600/5 border border-violet-500/10 rounded-[2rem] flex items-start gap-3">
        <Globe size={16} className="text-violet-400 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
          Global sections appear on <span className="text-slate-300">every page</span> of your store, right above the
          footer. Edit them once — they update everywhere. Perfect for newsletter signups, trust badges or promo strips.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="py-14 text-center border-2 border-dashed border-white/10 rounded-[2rem]">
          <p className="text-[10px] text-slate-600 font-bold tracking-[0.2em] uppercase italic px-8">
            No global sections yet
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((section, idx) => {
            const hidden = section.visible === false;
            const meta = getSectionMeta(section.type);
            return (
              <div
                key={section.id}
                onClick={() => setActiveId(section.id)}
                className={`group flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-violet-500/40 transition-all ${
                  hidden ? "opacity-40" : ""
                }`}
              >
                <div className="flex flex-col gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-0.5 text-slate-600 hover:text-white disabled:opacity-20">
                    <ChevronUp size={12} />
                  </button>
                  <button onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1} className="p-0.5 text-slate-600 hover:text-white disabled:opacity-20">
                    <ChevronDown size={12} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white uppercase tracking-tight italic truncate">
                    {section.settings?.title || meta?.label || section.type.replace("Section", "")}
                  </p>
                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mt-0.5">
                    {meta?.label || section.type} · every page
                  </p>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleVisible(section.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                    title={hidden ? "Show" : "Hide"}
                  >
                    {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button
                    onClick={() => removeSection(section.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setShowLibrary(true)}
        className="w-full py-4 bg-violet-600/15 border border-violet-500/30 rounded-2xl text-[10px] font-black text-violet-300 hover:bg-violet-600/25 transition-all uppercase tracking-[0.2em] italic flex items-center justify-center gap-2"
      >
        <Plus size={14} /> Add global section
      </button>

      {showLibrary && <NewSectionLibraryModal onAdd={addSection} onClose={() => setShowLibrary(false)} />}
    </div>
  );
}

// Re-export for hosts that want a quick check icon (keeps imports tidy).
export { Check as BuilderCheckIcon };
