import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Monitor,
  Smartphone,
  Settings,
  FileText,
  Code2,
  LayoutTemplate,
  Check,
  Instagram,
  Twitter,
  Facebook,
  Globe,
  Plus,
  Eye,
  EyeOff,
  ShoppingBag,
  Home,
  Mail,
  Layout,
  RefreshCw,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  AlertCircle,
  Zap,
  Clock,
  Save,
  Layers,
  MousePointer2,
  BookOpen,
  Tag,
  Heart,
  User,
  ShoppingCart,
} from "lucide-react";
import { adminApi } from "./api";
import { CATEGORIES } from "../features/site/constants";
import { COPY_SCHEMA } from "../features/site/storeCopy";
import {
  getSectionMeta,
  getSectionFields,
  getBlockFields,
  NewSectionLibraryModal,
  BlocksEditor,
  SectionSettingsPanel,
  SectionFieldEditor,
  ColorSchemesPanel,
  DEFAULT_COLOR_SCHEMES,
  ThemeIOButtons,
  PAGE_TEMPLATES,
  type ColorScheme,
} from "./ThemeEditorExtensions";
import { Tablet } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Colour palette presets
// ─────────────────────────────────────────────────────────────────────────────
const PALETTES = [
  { id: "dark",    label: "Midnight Black", bg: "#030213", text: "#ffffff", accent: "#A855F7", swatches: ["#030213","#ffffff","#A855F7"] },
  { id: "light",   label: "Gallery White",  bg: "#f8f7f4", text: "#111111", accent: "#000000", swatches: ["#f8f7f4","#111111","#000000"] },
  { id: "minimal", label: "Pure Minimal",   bg: "#ffffff",  text: "#000000", accent: "#666666", swatches: ["#ffffff","#000000","#888888"] },
  { id: "warm",    label: "Warm Clay",      bg: "#fdf6f0",  text: "#2c1810", accent: "#c96b2e", swatches: ["#fdf6f0","#2c1810","#c96b2e"] },
  { id: "forest",  label: "Deep Forest",    bg: "#0f1e14",  text: "#e8f5e9", accent: "#4caf50", swatches: ["#0f1e14","#e8f5e9","#4caf50"] },
  { id: "ink",     label: "Modern Ink",     bg: "#1a1a1a",  text: "#f5f5f5", accent: "#e74c3c", swatches: ["#1a1a1a","#f5f5f5","#e74c3c"] },
  { id: "royal",   label: "Royal Velvet",   bg: "#1a0b2e", text: "#f3e8ff", accent: "#fbbf24", swatches: ["#1a0b2e","#f3e8ff","#fbbf24"] },
  { id: "sage",    label: "Soft Sage",      bg: "#e7ede6", text: "#1a2e1a", accent: "#4a7c4a", swatches: ["#e7ede6","#1a2e1a","#4a7c4a"] },
  { id: "nord",    label: "Arctic Nord",    bg: "#2e3440", text: "#eceff4", accent: "#88c0d0", swatches: ["#2e3440","#eceff4","#88c0d0"] },
  { id: "cyber",   label: "Night City",     bg: "#000000", text: "#ffffff", accent: "#fde047", swatches: ["#000000","#ffffff","#fde047"] },
  { id: "rose",    label: "Desert Rose",    bg: "#fff5f5", text: "#742a2a", accent: "#f56565", swatches: ["#fff5f5","#742a2a","#f56565"] },
  { id: "ocean",   label: "Deep Ocean",     bg: "#0c1a25", text: "#e2e8f0", accent: "#38bdf8", swatches: ["#0c1a25","#e2e8f0","#38bdf8"] },
];

const THEME_LIBRARY = [
  { id: "editorial-luxe", name: "Editorial Luxe", mood: "High-contrast serif with generous spacing", palettePreset: "light", font: "Playfair Display", fontSize: "md", cornerStyle: "rounded", buttonStyle: "outline", animationLevel: "minimal", productCardStyle: "editorial", productHoverEffect: "zoom", imageAspectRatio: "3:4", productImageLayout: "grid", productContentPosition: "right", productColumnsDesktop: 3, productColumnsMobile: 1, cardRadius: 12, productCTA: "READ MORE" },
  { id: "night-neon", name: "Night Neon", mood: "Dark cinematic storefront with energetic accents", palettePreset: "cyber", font: "Space Mono", fontSize: "md", cornerStyle: "sharp", buttonStyle: "solid", animationLevel: "high", productCardStyle: "card", productHoverEffect: "lift", imageAspectRatio: "2:3", productImageLayout: "slider", productContentPosition: "left", productColumnsDesktop: 4, productColumnsMobile: 2, cardRadius: 4, productCTA: "BUY NOW" },
  { id: "earthy-studio", name: "Earthy Studio", mood: "Warm lifestyle brand with artisan feel", palettePreset: "warm", font: "Fraunces", fontSize: "md", cornerStyle: "rounded", buttonStyle: "soft", animationLevel: "moderate", productCardStyle: "editorial", productHoverEffect: "zoom", imageAspectRatio: "3:4", productImageLayout: "stacked", productContentPosition: "right", productColumnsDesktop: 3, productColumnsMobile: 2, cardRadius: 14, productCTA: "DISCOVER" },
  { id: "nordic-minimal", name: "Nordic Minimal", mood: "Clean product-first look focused on clarity", palettePreset: "nord", font: "Inter", fontSize: "sm", cornerStyle: "rounded", buttonStyle: "outline", animationLevel: "minimal", productCardStyle: "minimal", productHoverEffect: "none", imageAspectRatio: "1:1", productImageLayout: "grid", productContentPosition: "right", productColumnsDesktop: 5, productColumnsMobile: 2, cardRadius: 6, productCTA: "VIEW" },
  { id: "botanical-boutique", name: "Botanical Boutique", mood: "Soft, premium organic aesthetic", palettePreset: "sage", font: "Cormorant", fontSize: "md", cornerStyle: "pill", buttonStyle: "soft", animationLevel: "moderate", productCardStyle: "card", productHoverEffect: "zoom", imageAspectRatio: "3:4", productImageLayout: "slider", productContentPosition: "right", productColumnsDesktop: 3, productColumnsMobile: 1, cardRadius: 18, productCTA: "ADD TO BAG" },
  { id: "royal-gallery", name: "Royal Gallery", mood: "Rich luxury visual system with dramatic hierarchy", palettePreset: "royal", font: "EB Garamond", fontSize: "lg", cornerStyle: "sharp", buttonStyle: "solid", animationLevel: "high", productCardStyle: "editorial", productHoverEffect: "lift", imageAspectRatio: "2:3", productImageLayout: "stacked", productContentPosition: "left", productColumnsDesktop: 3, productColumnsMobile: 1, cardRadius: 2, productCTA: "ACQUIRE" },
  { id: "modern-atelier", name: "Modern Atelier", mood: "Refined studio layout with sleek modern lines", palettePreset: "minimal", font: "Outfit", fontSize: "md", cornerStyle: "sharp", buttonStyle: "outline", animationLevel: "minimal", productCardStyle: "minimal", productHoverEffect: "lift", imageAspectRatio: "1:1", productImageLayout: "grid", productContentPosition: "right", productColumnsDesktop: 4, productColumnsMobile: 2, cardRadius: 0, productCTA: "EXPLORE" },
  { id: "coastal-breeze", name: "Coastal Breeze", mood: "Airy coastal style with calm blue contrast", palettePreset: "ocean", font: "DM Sans", fontSize: "md", cornerStyle: "rounded", buttonStyle: "soft", animationLevel: "moderate", productCardStyle: "card", productHoverEffect: "zoom", imageAspectRatio: "3:4", productImageLayout: "slider", productContentPosition: "right", productColumnsDesktop: 4, productColumnsMobile: 2, cardRadius: 16, productCTA: "SHOP NOW" },
  { id: "velvet-rose", name: "Velvet Rose", mood: "Romantic boutique identity with warm highlights", palettePreset: "rose", font: "Lora", fontSize: "md", cornerStyle: "pill", buttonStyle: "solid", animationLevel: "moderate", productCardStyle: "editorial", productHoverEffect: "zoom", imageAspectRatio: "2:3", productImageLayout: "stacked", productContentPosition: "left", productColumnsDesktop: 3, productColumnsMobile: 1, cardRadius: 20, productCTA: "FALL IN LOVE" },
  { id: "forest-cabin", name: "Forest Cabin", mood: "Grounded rustic atmosphere with organic tones", palettePreset: "forest", font: "Montserrat", fontSize: "sm", cornerStyle: "rounded", buttonStyle: "outline", animationLevel: "minimal", productCardStyle: "card", productHoverEffect: "none", imageAspectRatio: "3:4", productImageLayout: "grid", productContentPosition: "right", productColumnsDesktop: 4, productColumnsMobile: 2, cardRadius: 10, productCTA: "VIEW DETAILS" },
  { id: "inkline-tech", name: "Inkline Tech", mood: "Minimal tech retail with punchy contrast accents", palettePreset: "ink", font: "Syne", fontSize: "sm", cornerStyle: "sharp", buttonStyle: "solid", animationLevel: "high", productCardStyle: "minimal", productHoverEffect: "lift", imageAspectRatio: "1:1", productImageLayout: "slider", productContentPosition: "left", productColumnsDesktop: 5, productColumnsMobile: 2, cardRadius: 3, productCTA: "ADD" },
  { id: "golden-noir", name: "Golden Noir", mood: "Dark premium experience with luminous CTA focus", palettePreset: "dark", font: "Bebas Neue", fontSize: "lg", cornerStyle: "sharp", buttonStyle: "solid", animationLevel: "high", productCardStyle: "editorial", productHoverEffect: "lift", imageAspectRatio: "2:3", productImageLayout: "stacked", productContentPosition: "left", productColumnsDesktop: 3, productColumnsMobile: 1, cardRadius: 1, productCTA: "ENTER SHOP" },
];

const applyThemePreset = (update: (k: string, v: any) => void, theme: any) => {
  const palette = PALETTES.find((p) => p.id === theme.palettePreset) || PALETTES[0];
  update("palettePreset", theme.palettePreset);
  update("primaryColor", palette.accent);
  update("backgroundColor", palette.bg);
  update("textColor", palette.text);
  update("font", theme.font);
  update("fontSize", theme.fontSize);
  update("cornerStyle", theme.cornerStyle);
  update("buttonStyle", theme.buttonStyle);
  update("animationLevel", theme.animationLevel);
  update("productCardStyle", theme.productCardStyle);
  update("productHoverEffect", theme.productHoverEffect);
  update("imageAspectRatio", theme.imageAspectRatio);
  update("productImageLayout", theme.productImageLayout);
  update("productContentPosition", theme.productContentPosition);
  update("productColumnsDesktop", theme.productColumnsDesktop);
  update("productColumnsMobile", theme.productColumnsMobile);
  update("cardRadius", theme.cardRadius);
  update("productCTA", theme.productCTA);
  update("themeLibraryPreset", theme.id);
};

const FONTS = [
  { value: "Inter",           label: "Inter",          sub: "Sans-serif Modern" },
  { value: "Outfit",          label: "Outfit",         sub: "Geometric Soft" },
  { value: "DM Sans",         label: "DM Sans",        sub: "Humanist Sans" },
  { value: "Montserrat",      label: "Montserrat",     sub: "Classic Sans" },
  { value: "Syne",            label: "Syne",           sub: "Artistic Display" },
  { value: "Fraunces",        label: "Fraunces",       sub: "Soft Serif" },
  { value: "Cormorant",       label: "Cormorant",      sub: "High-contrast Serif" },
  { value: "Playfair Display",label: "Playfair",       sub: "Classic Display" },
  { value: "Lora",            label: "Lora",           sub: "Modern Serif" },
  { value: "EB Garamond",     label: "EB Garamond",    sub: "Elegant Classic" },
  { value: "Space Mono",      label: "Space Mono",     sub: "Technical Type" },
  { value: "Bebas Neue",      label: "Bebas Neue",     sub: "Condensed Impact" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Reusable primitives
// ─────────────────────────────────────────────────────────────────────────────
function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black tracking-[0.3em] text-slate-500 uppercase mb-3">
      {children}
    </p>
  );
}

function SidebarInput({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div className="space-y-2">
      {label && <SidebarLabel>{label}</SidebarLabel>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-200 outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-800"
      />
    </div>
  );
}

function SidebarSelect({ label, value, onChange, options }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-3">
      {label && <SidebarLabel>{label}</SidebarLabel>}
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black text-slate-200 outline-none focus:border-violet-500/50 cursor-pointer transition-all appearance-none uppercase tracking-[0.15em] italic"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#0a0a0c] text-white">
              {o.label}
            </option>
          ))}
        </select>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover:text-violet-400 transition-colors">
          <ChevronDown size={14} strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}

function SidebarToggle({ label, description, checked, onChange }: any) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-white/5 last:border-none">
      <div>
        <p className="text-[11px] font-black text-slate-200 uppercase tracking-tight italic">{label}</p>
        {description && <p className="text-[9px] text-slate-500 mt-1 leading-relaxed font-bold">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`flex-shrink-0 w-10 h-5 rounded-full relative transition-all duration-500 ${checked ? "bg-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.3)]" : "bg-white/10"}`}
      >
        <span className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow transition-all duration-500 ${checked ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}

function SidebarRadioGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`py-3 px-2 rounded-xl text-[10px] font-black tracking-widest border transition-all uppercase italic ${
            value === o.value
              ? "bg-violet-600 border-violet-400/50 text-white shadow-xl"
              : "bg-white/[0.03] border-white/5 text-slate-500 hover:border-white/10 hover:bg-white/[0.05]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SidebarRange({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="group">
      <div className="flex justify-between items-center mb-3">
        <SidebarLabel>{label}</SidebarLabel>
        <span className="text-[10px] text-slate-400 font-black bg-white/5 px-2 py-1 rounded-lg border border-white/5 group-hover:border-violet-500/30 group-hover:text-violet-400 transition-all italic">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer hover:bg-white/20 transition-all"
      />
    </div>
  );
}

// ──────────────────────────────
// WCAG contrast helpers
// ──────────────────────────────
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

// Returns the WCAG contrast ratio (1–21) between two hex colors, or null if invalid.
function contrastRatio(a: string, b: string): number | null {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return null;
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// Live WCAG readability badge for a background/text pairing.
function ContrastBadge({ background, text }: { background: string; text: string }) {
  const ratio = contrastRatio(background, text);
  if (ratio == null) return null;

  const passAA = ratio >= 4.5;          // normal body text
  const passAALarge = ratio >= 3;       // large/heading text
  const passAAA = ratio >= 7;
  const grade = passAAA ? "AAA" : passAA ? "AA" : passAALarge ? "AA Large" : "Fail";
  const ok = passAA;
  const warnOnly = !passAA && passAALarge;

  const tone = ok
    ? { ring: "border-emerald-500/40 bg-emerald-500/10", text: "text-emerald-300", dot: "#34d399" }
    : warnOnly
      ? { ring: "border-amber-500/40 bg-amber-500/10", text: "text-amber-300", dot: "#fbbf24" }
      : { ring: "border-rose-500/40 bg-rose-500/10", text: "text-rose-300", dot: "#fb7185" };

  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${tone.ring}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="flex-shrink-0 w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-[13px] font-black"
          style={{ background, color: text }}
        >
          Aa
        </span>
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-widest italic ${tone.text}`}>
            {ok ? "Readable" : warnOnly ? "Large text only" : "Hard to read"}
          </p>
          <p className="text-[9px] text-slate-500 font-bold">
            Contrast {ratio.toFixed(2)}:1 — needs 4.5:1 for body text
          </p>
        </div>
      </div>
      <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${tone.text}`}>
        <span className="w-2 h-2 rounded-full" style={{ background: tone.dot }} />
        {grade}
      </span>
    </div>
  );
}

// ──────────────────────────────
// Enhanced Color Picker with Hex input
// ──────────────────────────────
function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [localValue, setLocalValue] = useState(value);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleTextChange = (val: string) => {
    setLocalValue(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="space-y-3">
      <SidebarLabel>{label}</SidebarLabel>
      <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-xl p-2 shadow-inner hover:border-white/20 transition-all group">
        <div 
          className="w-10 h-10 rounded-lg shadow-2xl border border-white/10 relative cursor-pointer overflow-hidden flex-shrink-0"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer scale-150"
          />
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-[11px] font-black text-slate-200 uppercase tracking-widest italic"
            placeholder="#000000"
          />
        </div>
        <div className="w-px h-5 bg-white/10 group-hover:bg-white/20" />
        <span className="text-[9px] text-slate-600 font-black pr-2 uppercase tracking-tighter">HEX</span>
      </div>
    </div>
  );
}

// ──────────────────────────────
// Accordion Component
// ──────────────────────────────
function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/5 last:border-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] group-hover:text-violet-400 transition-all uppercase italic">
          {title}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          className="text-slate-600 group-hover:text-violet-400 transition-all"
        >
          <ChevronRight size={14} strokeWidth={3} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-8 space-y-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
// Font Selector with Preview
// ──────────────────────────────
function FontSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <GoogleFontLoader font={value} />
      <SidebarLabel>Typography</SidebarLabel>
      <div className="grid grid-cols-1 gap-2">
        {FONTS.map((f) => {
          // Preload fonts for preview
          return (
            <button
              key={f.value}
              onClick={() => onChange(f.value)}
              className={`w-full group relative overflow-hidden flex items-center justify-between px-4 py-4 rounded-2xl border transition-all ${
                value === f.value
                  ? "bg-white border-blue-500 shadow-lg shadow-blue-500/10"
                  : "bg-neutral-50/50 border-neutral-100 hover:border-neutral-300 hover:bg-white"
              }`}
            >
              <GoogleFontLoader font={f.value} />
              <div className="text-left relative z-10">
                <p 
                  className={`text-[16px] leading-tight mb-0.5 transition-colors ${value === f.value ? "text-blue-600" : "text-neutral-800"}`} 
                  style={{ fontFamily: `${f.value}, sans-serif` }}
                >
                  {f.label}
                </p>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">
                  {f.sub}
                </p>
              </div>
              {value === f.value && (
                <motion.div 
                  layoutId="font-check"
                  className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200"
                >
                  <Check size={12} className="text-white" strokeWidth={3} />
                </motion.div>
              )}
              {value !== f.value && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                   <ChevronRight size={14} className="text-neutral-300" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Library Modal — opened via the "+ Add Section" button
// ─────────────────────────────────────────────────────────────────────────────
const SECTION_TEMPLATES = [
  {
    type: "HeroSection",
    label: "Hero Banner",
    description: "Full-viewport hero with image, headline and CTA",
    icon: <LayoutTemplate size={24} />,
    color: "from-violet-600/20 to-purple-600/10",
    tag: "Impact",
  },
  {
    type: "FeatureGridSection",
    label: "Feature Grid",
    description: "3-column highlights for key services, drops, or benefits",
    icon: <ShoppingBag size={24} />,
    color: "from-blue-600/20 to-cyan-600/10",
    tag: "Highlight",
  },
  {
    type: "TestimonialsSection",
    label: "Testimonials",
    description: "Customer quotes displayed in a responsive testimonial grid",
    icon: <FileText size={24} />,
    color: "from-fuchsia-600/20 to-pink-600/10",
    tag: "Trust",
  },
  {
    type: "NewsletterSection",
    label: "Newsletter",
    description: "Email capture with custom title and description",
    icon: <Mail size={24} />,
    color: "from-emerald-600/20 to-teal-600/10",
    tag: "Engagement",
  },
  {
    type: "FAQSection",
    label: "FAQ",
    description: "Collapsible question/answer list for common questions",
    icon: <FileText size={24} />,
    color: "from-amber-600/20 to-orange-600/10",
    tag: "Support",
  },
];

function SectionLibraryModal({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        key="section-library-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-xl flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
          className="w-full max-w-lg bg-[#0c0c10] border border-white/10 rounded-t-[3rem] shadow-[0_-40px_100px_rgba(124,58,237,0.2)] pb-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-12 h-1 bg-white/15 rounded-full" />
          </div>

          <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black tracking-[0.4em] text-violet-400 uppercase italic mb-1">Section Library</p>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Add a Section</h3>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <X size={16} strokeWidth={3} />
            </button>
          </div>

          <div className="p-6 grid grid-cols-2 gap-3">
            {SECTION_TEMPLATES.map((tpl) => (
              <motion.button
                key={tpl.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { onAdd(tpl.type); onClose(); }}
                className={`relative overflow-hidden text-left p-5 rounded-3xl border border-white/10 bg-gradient-to-br ${tpl.color} hover:border-violet-500/40 transition-all group`}
              >
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white mb-4 group-hover:bg-white/20 transition-colors">
                  {tpl.icon}
                </div>
                <p className="text-[11px] font-black text-white uppercase tracking-tight italic mb-1">{tpl.label}</p>
                <p className="text-[9px] text-slate-500 font-bold leading-relaxed">{tpl.description}</p>
                <span className="absolute top-3 right-3 text-[7px] font-black tracking-[0.2em] text-slate-600 uppercase bg-white/5 border border-white/5 px-2 py-1 rounded-full">{tpl.tag}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section list row
// ─────────────────────────────────────────────────────────────────────────────
function SectionRow({ icon, title, description, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-6 py-6 hover:bg-white/[0.03] transition-all border-b border-white/5 text-left group relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-transparent to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />
      <div className="flex items-start gap-4 relative z-10">
        <div className="mt-1 text-slate-500 group-hover:text-violet-400 transition-all group-hover:scale-110 duration-300">{icon}</div>
        <div>
          <p className="text-[13px] font-black text-slate-200 group-hover:text-white transition-all uppercase italic tracking-tight">{title}</p>
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-[200px] font-bold">{description}</p>
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-700 group-hover:text-violet-400 flex-shrink-0 transition-all translate-x-0 group-hover:translate-x-1" strokeWidth={3} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-panel header (breadcrumb back button)
// ─────────────────────────────────────────────────────────────────────────────
function SubPanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-4 px-6 py-6 border-b border-white/5 bg-white/[0.02]">
      <button 
        onClick={onBack} 
        className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:scale-110 active:scale-95"
      >
        <ChevronLeft size={18} className="text-slate-200" strokeWidth={3} />
      </button>
      <span className="text-[12px] font-black text-white tracking-[0.2em] uppercase italic">{title}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION PANELS
// ─────────────────────────────────────────────────────────────────────────────
function StylePanel({ design, update }: any) {
  const currentPalette = PALETTES.find(p => p.id === design.palettePreset) || PALETTES[0];
  const backgroundColor = design.backgroundColor || currentPalette.bg;
  const textColor = design.textColor || currentPalette.text;
  const applyTheme = (themeId: string) => {
    const theme = THEME_LIBRARY.find((t) => t.id === themeId);
    if (!theme) return;
    applyThemePreset(update, theme);
  };

  return (
    <div className="space-y-8">
      <Accordion title="Theme Library" defaultOpen={true}>
        <div className="grid grid-cols-1 gap-3">
          {THEME_LIBRARY.map((theme) => {
            const isActive = design.themeLibraryPreset === theme.id;
            const themePalette = PALETTES.find((p) => p.id === theme.palettePreset) || PALETTES[0];
            return (
              <button
                key={theme.id}
                onClick={() => applyTheme(theme.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  isActive
                    ? "bg-violet-600/20 border-violet-500/50 shadow-[0_0_30px_rgba(124,58,237,0.18)]"
                    : "bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-100 italic">{theme.name}</p>
                  {isActive && <Check size={14} className="text-violet-300" strokeWidth={3} />}
                </div>
                <p className="text-[9px] text-slate-400 font-bold mb-3">{theme.mood}</p>
                <div className="flex gap-1.5">
                  {themePalette.swatches.map((swatch, i) => (
                    <span key={i} className="h-4 flex-1 rounded-full border border-black/10" style={{ background: swatch }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Accordion>

      <Accordion title="Visual Identity Presets" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-4">
          {PALETTES.map((palette) => (
            <button
              key={palette.id}
              onClick={() => {
                update("palettePreset", palette.id);
                update("primaryColor", palette.accent);
                update("backgroundColor", palette.bg);
                update("textColor", palette.text);
              }}
              className={`group relative rounded-[2rem] border-2 p-5 text-left transition-all duration-500 ${
                design.palettePreset === palette.id 
                  ? "border-violet-600 bg-white shadow-[0_0_40px_rgba(124,58,237,0.2)] scale-[1.02] ring-8 ring-violet-500/5" 
                  : "border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex h-12 gap-1.5 mb-5">
                {palette.swatches.map((s, i) => (
                  <div key={i} className="flex-1 rounded-xl border border-black/5 shadow-inner" style={{ background: s }} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-[10px] font-black uppercase tracking-widest italic transition-colors ${design.palettePreset === palette.id ? "text-black" : "text-slate-400 group-hover:text-slate-200"}`}>
                  {palette.label}
                </p>
                {design.palettePreset === palette.id && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 bg-black rounded-full flex items-center justify-center shadow-2xl"
                  >
                    <Check size={10} className="text-white" strokeWidth={4} />
                  </motion.div>
                )}
              </div>
            </button>
          ))}
        </div>
      </Accordion>

      <Accordion title="Brand Color Protocol">
        <div className="space-y-8">
          <ColorPicker 
            label="Primary accent" 
            value={design.primaryColor || "#A855F7"} 
            onChange={(val) => update("primaryColor", val)} 
          />
          <div className="grid grid-cols-1 gap-6">
            <ColorPicker 
              label="Environment Background" 
              value={backgroundColor} 
              onChange={(val) => update("backgroundColor", val)} 
            />
            <ColorPicker
              label="Primary Typography"
              value={textColor}
              onChange={(val) => update("textColor", val)}
            />
          </div>
          <ContrastBadge background={backgroundColor} text={textColor} />
          <button
            onClick={() => {
              update("backgroundColor", currentPalette.bg);
              update("textColor", currentPalette.text);
            }}
            className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all uppercase tracking-[0.2em] italic"
          >
            Restore Palette Defaults
          </button>
        </div>
      </Accordion>

      <Accordion title="Typography">
        <FontSelector 
          value={design.font || "Inter"} 
          onChange={(val) => update("font", val)} 
        />
      </Accordion>
    </div>
  );
}

function ThemeLibraryPanel({ design, update }: any) {
  const applyTheme = (themeId: string) => {
    const theme = THEME_LIBRARY.find((t) => t.id === themeId);
    if (!theme) return;
    applyThemePreset(update, theme);
  };

  return (
    <div className="space-y-4">
      {THEME_LIBRARY.map((theme) => {
        const isActive = design.themeLibraryPreset === theme.id;
        const palette = PALETTES.find((p) => p.id === theme.palettePreset) || PALETTES[0];
        return (
          <button
            key={theme.id}
            onClick={() => applyTheme(theme.id)}
            className={`w-full rounded-2xl border p-5 text-left transition-all ${
              isActive
                ? "bg-violet-600/20 border-violet-500/50 shadow-[0_0_30px_rgba(124,58,237,0.18)]"
                : "bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-100 italic">{theme.name}</p>
              {isActive && <Check size={14} className="text-violet-300" strokeWidth={3} />}
            </div>
            <p className="text-[9px] text-slate-400 font-bold mb-3">{theme.mood}</p>
            <div className="flex gap-1.5">
              {palette.swatches.map((swatch, i) => (
                <span key={i} className="h-4 flex-1 rounded-full border border-black/10" style={{ background: swatch }} />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function NavigationPanel({ design, update, setActiveTab, setActiveSection }: any) {
  const headerLinks = design.headerLinks || {};
  const updateHeaderLink = (key: string, value: boolean) => {
    update("headerLinks", { ...headerLinks, [key]: value });
  };

  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Header Profile" defaultOpen={true}>
        <div className="space-y-6">
          <div>
            <SidebarLabel>Layout Style</SidebarLabel>
            <SidebarRadioGroup
              value={design.headerStyle || "minimal"}
              onChange={(v: string) => update("headerStyle", v)}
              options={[
                { value: "minimal", label: "Minimal" },
                { value: "centered", label: "Centered" },
                { value: "full", label: "Full" },
              ]}
            />
          </div>
          <div>
            <SidebarLabel>Logo Alignment</SidebarLabel>
            <SidebarRadioGroup
              value={design.logoPosition || "left"}
              onChange={(v: string) => update("logoPosition", v)}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
            />
          </div>
          <SidebarRange
            label="Logo height"
            value={design.logoHeight ?? 24}
            min={20}
            max={64}
            suffix="px"
            onChange={(v: number) => update("logoHeight", v)}
          />
          <div className="pt-2">
             <SidebarToggle
               label="Transparent Header"
               description="Make header background transparent until scrolled"
               checked={design.transparentHeader ?? false}
               onChange={(v: boolean) => update("transparentHeader", v)}
             />
          </div>
        </div>
      </Accordion>

      <div className="p-8 text-center bg-blue-50/50 rounded-[2.5rem] border border-blue-100 border-dashed mb-6">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm shadow-blue-100">
           <LayoutTemplate size={20} className="text-blue-500" />
        </div>
        <h3 className="text-[12px] font-bold text-neutral-800 mb-2">Navigation has moved</h3>
        <p className="text-[10px] text-neutral-500 leading-relaxed mb-6 px-4">
          To manage your navigation categories and menu items, please use the <strong>Menu & Pages</strong> tab.
        </p>
        <button 
           onClick={() => { setActiveTab("pages"); setActiveSection(null); }}
           className="px-6 py-2 bg-blue-600 text-white rounded-full text-[10px] font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          GO TO MENU & PAGES
        </button>
      </div>

      <Accordion title="Layout & Logic">
        <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden mt-2">
          <SidebarToggle
            label="Sticky header"
            description="Keep the navigation bar visible while scrolling"
            checked={design.stickyHeader ?? true}
            onChange={(v: boolean) => update("stickyHeader", v)}
          />
          <SidebarToggle
            label="Footer columns"
            description="Show links in organised columns in the footer"
            checked={design.footerColumns ?? true}
            onChange={(v: boolean) => update("footerColumns", v)}
          />
          <SidebarToggle
            label="Social icons in footer"
            description="Display icons linking to your social accounts"
            checked={design.showSocialInFooter ?? true}
            onChange={(v: boolean) => update("showSocialInFooter", v)}
          />
        </div>
      </Accordion>

      <Accordion title="Cart">
        <div className="space-y-6">
          <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden">
            <SidebarToggle
              label="Free-shipping progress bar"
              description="Show how far shoppers are from free shipping"
              checked={design.showFreeShipBar ?? true}
              onChange={(v: boolean) => update("showFreeShipBar", v)}
            />
            <SidebarToggle
              label="Cart trust badges"
              description="Show secure / tracked / returns reassurance"
              checked={design.showCartTrustBadges ?? true}
              onChange={(v: boolean) => update("showCartTrustBadges", v)}
            />
          </div>
          {(design.showFreeShipBar ?? true) && (
            <SidebarRange
              label="Free-shipping threshold"
              value={design.freeShipThreshold ?? 100}
              min={10}
              max={500}
              step={5}
              suffix=" USD"
              onChange={(v: number) => update("freeShipThreshold", v)}
            />
          )}
        </div>
      </Accordion>
    </div>
  );
}

function HomepagePanel({ design, update, colorSchemes = [] }: any) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const sections = design.sections || design.homepageSections || [];
  
  useEffect(() => {
    if (sections.length === 0 && !design.sections && !design.homepageSections) {
      const initialSections = [
        {
          id: "initial-hero",
          type: "HeroSection",
          visible: true,
          settings: {
            title: design.hero?.slides?.[0]?.title || "F✶M",
            subtitle: design.hero?.slides?.[0]?.subtitle || "PHOTOGRAPHY & ART BOOKS",
            ctaText: design.hero?.slides?.[0]?.ctaText || "ENTER ARCHIVE",
            imageUrl: design.hero?.slides?.[0]?.imageUrl || "",
            overlayOpacity: design.hero?.overlayOpacity || 0.45,
            accentColor: design.primaryColor || "#A855F7"
          }
        }
      ];
      update("sections", initialSections);
    }
  }, []);

  const updateSections = (newSections: any[]) => {
    update("sections", newSections);
  };

  const addSection = (type: string) => {
    const id = crypto.randomUUID();
    const meta = getSectionMeta(type);
    const newSection = {
      id,
      type,
      visible: true,
      settings: JSON.parse(JSON.stringify(meta?.defaults || {})),
    };
    updateSections([...sections, newSection]);
    setActiveSectionId(id);
  };

  const duplicateSection = (id: string, e?: any) => {
    if (e) e.stopPropagation();
    const idx = sections.findIndex((s: any) => s.id === id);
    if (idx < 0) return;
    const copy = JSON.parse(JSON.stringify(sections[idx]));
    copy.id = crypto.randomUUID();
    const next = [...sections];
    next.splice(idx + 1, 0, copy);
    updateSections(next);
  };

  const toggleSectionVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateSections(sections.map((s: any) => s.id === id ? { ...s, visible: s.visible === false ? true : false } : s));
  };

  const removeSection = (id: string, e?: any) => {
    if (e) e.stopPropagation();
    updateSections(sections.filter((s: any) => s.id !== id));
    if (activeSectionId === id) setActiveSectionId(null);
  };

  const moveSection = (index: number, direction: 'up' | 'down', e: any) => {
    e.stopPropagation();
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    updateSections(newSections);
  };

  const updateSectionSettings = (id: string, newSettings: any) => {
    updateSections(sections.map((s: any) => s.id === id ? { ...s, settings: { ...s.settings, ...newSettings } } : s));
  };

  const handleImageUpload = async (sectionId: string, file: File) => {
    try {
      const url = await adminApi.uploadFile(file, `sections/${sectionId}_${Date.now()}`);
      updateSectionSettings(sectionId, { imageUrl: url });
    } catch {
      alert("Error uploading image");
    }
  };

  if (activeSectionId) {
    const section = sections.find((s: any) => s.id === activeSectionId);
    if (!section) {
      setActiveSectionId(null);
      return null;
    }

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-neutral-100 flex items-center gap-3 bg-white sticky top-0 z-20">
          <button onClick={() => setActiveSectionId(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900">
            <ChevronLeft size={16} />
          </button>
          <div>
            <p className="text-[9px] font-bold tracking-[0.2em] text-blue-600 uppercase mb-0.5">Edit Section</p>
            <h3 className="text-[12px] font-bold text-neutral-800">{section.type.replace("Section", "")}</h3>
          </div>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {/* Field-driven editor */}
          {(() => {
            const fields = getSectionFields(section.type);
            const uploadFile = (file: File) =>
              adminApi.uploadFile(file, `sections/${section.id}_${Date.now()}`);
            return (
              <div className="space-y-3">
                {fields.map((field) => (
                  <SectionFieldEditor
                    key={field.key}
                    field={field}
                    value={section.settings[field.key]}
                    onChange={(v) => updateSectionSettings(section.id, { [field.key]: v })}
                    uploadFile={uploadFile}
                  />
                ))}
              </div>
            );
          })()}

          {/* Blocks editor (only sections with blocks) */}
          {getBlockFields(section.type).length > 0 && (
            <div className="pt-4 border-t border-neutral-100">
              <BlocksEditor
                sectionType={section.type}
                settings={section.settings}
                onUpdate={(patch) => updateSectionSettings(section.id, patch)}
                uploadFile={(file: File) => adminApi.uploadFile(file, `sections/${section.id}_${Date.now()}`)}
              />
            </div>
          )}

          {/* Per-section settings (padding, color scheme, full-width, custom class, hide) */}
          <div className="pt-4 border-t border-neutral-100">
            <SectionSettingsPanel
              settings={section.settings}
              onUpdate={(patch) => updateSectionSettings(section.id, patch)}
              colorSchemes={colorSchemes}
            />
          </div>

          <div className="pt-2 grid grid-cols-2 gap-2">
            <button
              onClick={(e) => duplicateSection(section.id, e)}
              className="py-3 text-neutral-700 text-[10px] font-bold tracking-widest border border-neutral-200 rounded-2xl hover:bg-neutral-50 transition-colors"
            >
              DUPLICATE
            </button>
            <button
              onClick={() => removeSection(section.id)}
              className="py-3 text-red-500 text-[10px] font-bold tracking-widest border-2 border-red-50 rounded-2xl hover:bg-red-50 transition-colors"
            >
              DELETE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1 h-full">
      <div className="flex items-center justify-between mb-4 mt-2">
        <div>
          <h2 className="text-[14px] font-black tracking-tight text-neutral-800 uppercase">Home Layout</h2>
          <p className="text-[10px] text-neutral-400 font-medium tracking-wide">Add and arrange your shop content</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-4 border-r border-neutral-100">
             <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Active</span>
             <SidebarToggle 
                checked={design.showHero ?? true} 
                onChange={(v: boolean) => update("showHero", v, true)} 
             />
          </div>
        </div>
      </div>

      <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl overflow-hidden mb-4">
        <button 
          onClick={() => setExpandedSection(expandedSection === "hero-legacy" ? null : "hero-legacy")}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
              <Layout size={14} />
            </div>
            <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-tight">Main Hero Settings</span>
          </div>
          <ChevronRight size={14} className={`text-neutral-400 transition-transform ${expandedSection === "hero-legacy" ? "rotate-90" : ""}`} />
        </button>
        
        {expandedSection === "hero-legacy" && (
          <div className="px-4 py-5 space-y-6 border-t border-neutral-100 bg-white">
            <div className="space-y-3">
              <label className="text-[9px] tracking-widest text-neutral-400 uppercase font-black">Content Alignment</label>
              <div className="grid grid-cols-3 gap-2">
                {["left", "center", "right"].map((a) => (
                  <button
                    key={a}
                    onClick={() => update("hero", { ...design.hero, align: a })}
                    className={`py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${
                      design.hero?.align === a 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "bg-neutral-50 border-neutral-100 text-neutral-400 hover:border-neutral-200"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-3">
                <RefreshCw size={14} className="text-neutral-400" />
                <span className="text-[11px] font-bold text-neutral-600 uppercase">Auto-Rotate</span>
              </div>
              <button
                onClick={() => update("hero", { ...design.hero, autoRotate: !design.hero?.autoRotate })}
                className={`w-10 h-5 rounded-full transition-colors relative ${design.hero?.autoRotate ? "bg-blue-600" : "bg-neutral-200"}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${design.hero?.autoRotate ? "right-1" : "left-1"}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 pb-8">
        {sections.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-neutral-100 rounded-[2rem] bg-neutral-50/50">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><LayoutTemplate size={20} className="text-neutral-300" /></div>
             <p className="text-[11px] text-neutral-400 font-medium px-8">Your homepage is empty. Start by adding a Hero section.</p>
          </div>
        ) : (
          <div className="space-y-2">
             {sections.map((section: any, index: number) => {
               const isHidden = section.visible === false;
               return (
               <motion.div
                 layout
                 key={section.id}
                 draggable
                 onDragStart={() => setDraggingSectionId(section.id)}
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={(e) => {
                   e.preventDefault();
                   if (!draggingSectionId || draggingSectionId === section.id) return;
                   const fromIndex = sections.findIndex((s: any) => s.id === draggingSectionId);
                   const toIndex = sections.findIndex((s: any) => s.id === section.id);
                   if (fromIndex < 0 || toIndex < 0) return;
                   const reordered = [...sections];
                   const [moved] = reordered.splice(fromIndex, 1);
                   reordered.splice(toIndex, 0, moved);
                   updateSections(reordered);
                   setDraggingSectionId(null);
                 }}
                 onDragEnd={() => setDraggingSectionId(null)}
                 initial={{ opacity: 0, y: 8 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -8 }}
                 onClick={() => !isHidden && setActiveSectionId(section.id)}
                 className={`group relative border rounded-3xl p-4 transition-all flex items-center gap-3 ${
                   isHidden
                     ? "bg-neutral-50/40 border-neutral-100 cursor-default opacity-50"
                     : `bg-white border-neutral-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer ${draggingSectionId === section.id ? "opacity-40" : ""}`
                 }`}
               >
                 {/* Drag handle */}
                 <div className="text-neutral-200 hover:text-neutral-400 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0">
                   <GripVertical size={16} />
                 </div>

                 {/* Reorder arrows */}
                 <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={(e) => moveSection(index, 'up', e)} disabled={index === 0} className="p-0.5 hover:bg-neutral-100 rounded text-neutral-300 hover:text-neutral-900 disabled:opacity-0 transition-all"><ChevronLeft size={12} className="rotate-90" /></button>
                    <button onClick={(e) => moveSection(index, 'down', e)} disabled={index === sections.length - 1} className="p-0.5 hover:bg-neutral-100 rounded text-neutral-300 hover:text-neutral-900 disabled:opacity-0 transition-all"><ChevronLeft size={12} className="-rotate-90" /></button>
                 </div>

                 {/* Type icon */}
                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                   isHidden ? "bg-neutral-100 text-neutral-300" : "bg-neutral-50 text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                 }`}>
                    {section.type === "HeroSection" || section.type === "SlideshowSection" || section.type === "ImageWithTextSection" ? <LayoutTemplate size={16} /> : section.type === "FeatureGridSection" || section.type === "MulticolumnSection" || section.type === "CollectionListSection" || section.type === "FeaturedProductSection" ? <ShoppingBag size={16} /> : section.type === "NewsletterSection" || section.type === "ContactFormSection" ? <Mail size={16} /> : <FileText size={16} />}
                 </div>

                 {/* Label */}
                 <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-black tracking-tight truncate uppercase ${isHidden ? "text-neutral-400" : "text-neutral-800"}`}>{section.settings.title || section.type.replace("Section", "")}</p>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{section.type.replace("Section", "")}</p>
                 </div>

                 {/* Actions */}
                 <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Visibility toggle */}
                    <button
                      onClick={(e) => toggleSectionVisibility(section.id, e)}
                      className={`p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${
                        isHidden ? "text-neutral-300 hover:text-emerald-500 hover:bg-emerald-50" : "text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100"
                      }`}
                      title={isHidden ? "Show section" : "Hide section"}
                    >
                      {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    {/* Duplicate */}
                    <button
                      onClick={(e) => duplicateSection(section.id, e)}
                      className="p-2 text-neutral-200 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      title="Duplicate section"
                    >
                      <Layers size={13} />
                    </button>
                    {/* Delete */}
                    <button onClick={(e) => removeSection(section.id, e)} className="p-2 text-neutral-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><X size={13} /></button>
                    {!isHidden && <ChevronRight size={13} className="text-neutral-200 group-hover:text-neutral-400 transition-colors" />}
                 </div>
               </motion.div>
               );
             })}
          </div>
        )}

        {/* Add Section button */}
        <div className="pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowLibrary(true)}
            className="w-full flex items-center justify-center gap-3 py-5 border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 rounded-[2.5rem] transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
              <Plus size={16} className="text-blue-500 group-hover:text-white transition-colors" strokeWidth={3} />
            </div>
            <span className="text-[11px] font-black text-blue-500 group-hover:text-blue-700 uppercase tracking-[0.15em] transition-colors">Add Section</span>
          </motion.button>
        </div>

        {/* Section Library Modal — full categorized library */}
        {showLibrary && (
          <NewSectionLibraryModal
            onAdd={addSection}
            onClose={() => setShowLibrary(false)}
          />
        )}
      </div>
    </div>
  );
}

function PagesPanel({ pages, setPages, design, update }: any) {
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);

  const createPage = async () => {
    const newPage = {
      title: "Untitled Page",
      slug: "new-page-" + Date.now(),
      content: "<p>Start writing...</p>",
      status: "draft",
      showInNav: true,
      order: pages.length
    };
    const saved = await adminApi.createPage(newPage);
    setPages([...pages, saved]);
    setEditingPage(saved);
  };

  const updatePage = async (id: string, data: any) => {
    const updated = await adminApi.updatePage(id, data);
    setPages(pages.map((p: any) => p.id === id ? updated : p));
    setEditingPage(updated);
  };

  const deletePage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    await adminApi.deletePage(id);
    setPages(pages.filter((p: any) => p.id !== id));
    if (editingPage?.id === id) setEditingPage(null);
  };

  if (editingPage) {
    return (
      <div className="flex-1 flex flex-col bg-black overflow-hidden">
        <SubPanelHeader 
          title={`Edit Page: ${editingPage.title}`} 
          onBack={() => setEditingPage(null)} 
        />
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
          <div className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 to-transparent pointer-events-none" />
            <div className="space-y-8 relative z-10">
              <div>
                <SidebarLabel>Page Title</SidebarLabel>
                <SidebarInput 
                  value={editingPage.title} 
                  onChange={(v: string) => updatePage(editingPage.id, { ...editingPage, title: v })}
                />
              </div>
              <div>
                <SidebarLabel>URL Slug</SidebarLabel>
                <SidebarInput 
                  value={editingPage.slug} 
                  onChange={(v: string) => updatePage(editingPage.id, { ...editingPage, slug: v })}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <SidebarLabel>Status</SidebarLabel>
                  <SidebarSelect
                    value={editingPage.status}
                    onChange={(v: string) => updatePage(editingPage.id, { ...editingPage, status: v })}
                    options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <SidebarToggle 
                    label="Visible in Nav" 
                    checked={editingPage.showInNav} 
                    onChange={(v: boolean) => updatePage(editingPage.id, { ...editingPage, showInNav: v })} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[2rem] space-y-4">
            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest italic">Danger Protocol</h4>
            <button
              onClick={() => { if(confirm("Confirm page deletion?")) deletePage(editingPage.id); }}
              className="w-full py-4 bg-red-500/20 text-red-400 text-[10px] font-black tracking-[0.3em] rounded-2xl hover:bg-red-500 hover:text-white transition-all uppercase italic shadow-2xl"
            >
              Terminate Page
            </button>
            <p className="text-[9px] text-slate-600 font-bold leading-relaxed italic text-center">
              Page content must be managed via the primary Dashboard Interface.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const rawCategories = design.categories || CATEGORIES;
  const categories = rawCategories.map((cat: any, i: number) => {
    if (typeof cat === "string") {
      return { id: `cat-${i}-${cat.toLowerCase()}`, name: cat, description: "", showInNav: true };
    }
    return cat;
  });

  if (editingCategoryIndex !== null) {
    const cat = categories[editingCategoryIndex];
    const updateCat = (key: string, val: any) => {
      const newCats = [...categories];
      newCats[editingCategoryIndex] = { ...cat, [key]: val };
      update("categories", newCats, true);
    };

    return (
      <div className="flex-1 flex flex-col bg-black overflow-hidden">
        <SubPanelHeader 
          title={cat.name} 
          onBack={() => setEditingCategoryIndex(null)} 
        />
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
          <div className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
            <div className="space-y-8 relative z-10">
              <div>
                <SidebarLabel>Display Name</SidebarLabel>
                <SidebarInput
                  value={cat.name}
                  onChange={(v: string) => updateCat("name", v)}
                  placeholder="e.g. PUBLICATIONS"
                />
              </div>

              <div>
                <SidebarLabel>Context Description</SidebarLabel>
                <textarea
                  value={cat.description || ""}
                  onChange={(e) => updateCat("description", e.target.value)}
                  placeholder="ARCHIVAL CONTEXT..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-[11px] font-bold text-white outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-800 min-h-[120px] resize-none uppercase tracking-widest italic"
                />
              </div>

              <div>
                <SidebarLabel>Category Header Asset</SidebarLabel>
                <SidebarAssetUpload
                  value={cat.imageUrl}
                  onChange={(url: string) => updateCat("imageUrl", url)}
                  type="category"
                  label="Upload Header"
                />
              </div>

              <div className="pt-4 border-t border-white/5">
                <SidebarToggle
                  label="Menu Visibility"
                  description="Toggle presence in shop navigation menu"
                  checked={cat.showInNav !== false}
                  onChange={(v: boolean) => updateCat("showInNav", v)}
                />
              </div>
            </div>
          </div>

          <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[2rem] space-y-4">
            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest italic">Removal Protocol</h4>
            <button
              onClick={() => {
                if (confirm("Terminate this category?")) {
                  const newCats = categories.filter((_: any, i: number) => i !== editingCategoryIndex);
                  update("categories", newCats, true);
                  setEditingCategoryIndex(null);
                }
              }}
              className="w-full py-4 bg-red-500/20 text-red-400 text-[10px] font-black tracking-[0.3em] rounded-2xl hover:bg-red-500 hover:text-white transition-all uppercase italic shadow-2xl"
            >
              Delete Category
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden space-y-8">
      {/* Navigation Categories Section */}
      <div className="p-8 bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-[0.4em] text-violet-500 uppercase italic mb-1">Mapping</span>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Shop Menu</h3>
          </div>
          <button
            onClick={() => {
              const newCat = { id: `cat-${Date.now()}`, name: "NEW CATEGORY", description: "", showInNav: true };
              const newCats = [...categories, newCat];
              update("categories", newCats, true);
            }}
            className="w-10 h-10 bg-violet-600/10 border border-violet-500/20 rounded-xl flex items-center justify-center text-violet-400 hover:bg-violet-600 hover:text-white transition-all shadow-lg"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
        
        <div className="space-y-3">
          {categories.map((cat: any, index: number) => (
            <div key={index} className="flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-[2rem] p-5 group transition-all hover:bg-white/[0.05] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <button
                onClick={() => setEditingCategoryIndex(index)}
                className="flex-1 text-left relative z-10"
              >
                <p className="text-[11px] font-black text-white uppercase tracking-widest italic">{cat.name || "Untitled"}</p>
                {cat.description && <p className="text-[9px] text-slate-500 font-bold uppercase italic tracking-tighter truncate max-w-[200px] mt-1">{cat.description}</p>}
              </button>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 relative z-10">
                <button
                  onClick={() => {
                    const newCats = [...categories];
                    if (index > 0) {
                      [newCats[index], newCats[index - 1]] = [newCats[index - 1], newCats[index]];
                      update("categories", newCats, true);
                    }
                  }}
                  disabled={index === 0}
                  className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-10"
                >
                  <ChevronUp size={14} strokeWidth={3} />
                </button>
                <button
                  onClick={() => {
                    const newCats = [...categories];
                    if (index < newCats.length - 1) {
                      [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
                      update("categories", newCats, true);
                    }
                  }}
                  disabled={index === categories.length - 1}
                  className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-10"
                >
                  <ChevronDown size={14} strokeWidth={3} />
                </button>
                <button
                  onClick={() => setEditingCategoryIndex(index)}
                  className="w-8 h-8 flex items-center justify-center bg-violet-600/10 text-violet-400 border border-violet-500/20 rounded-lg hover:bg-violet-600 hover:text-white transition-all"
                >
                  <Settings size={14} strokeWidth={3} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pages Section */}
      <div className="px-8 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-[0.4em] text-cyan-500 uppercase italic mb-1">Architecture</span>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Custom Pages</h3>
          </div>
          <button 
            onClick={createPage} 
            className="w-10 h-10 bg-cyan-600/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 hover:bg-cyan-600 hover:text-white transition-all shadow-lg"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
        
        <div className="space-y-3">
          {pages.map((page: any) => (
            <button
              key={page.id}
              onClick={() => setEditingPage(page)}
              className="w-full flex items-center justify-between p-6 bg-white/[0.03] border border-white/10 rounded-[2.5rem] hover:bg-white/[0.06] hover:border-cyan-500/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 group-hover:text-cyan-400 group-hover:scale-110 transition-all duration-500">
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black text-white uppercase tracking-widest italic">{page.title}</p>
                  <p className="text-[9px] text-slate-600 font-bold uppercase italic tracking-tighter mt-1">
                    /{page.slug} · <span className={page.status ==='published' ? 'text-emerald-500' : 'text-slate-700'}>{page.status}</span>
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-800 group-hover:text-white transition-all transform group-hover:translate-x-1" strokeWidth={3} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductsPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Card Styling" defaultOpen={true}>
        <div className="space-y-6">
          <div>
            <SidebarLabel>Visual Style</SidebarLabel>
            <SidebarRadioGroup
              value={design.productCardStyle || "editorial"}
              onChange={(v) => update("productCardStyle", v)}
              options={[
                { value: "card", label: "Card" },
                { value: "minimal", label: "Minimal" },
                { value: "editorial", label: "Editorial" },
              ]}
            />
          </div>

          <div>
            <SidebarLabel>Image Aspect Ratio</SidebarLabel>
            <SidebarRadioGroup
              value={design.imageAspectRatio || "3:4"}
              onChange={(v) => update("imageAspectRatio", v)}
              options={[
                { value: "1:1", label: "Square" },
                { value: "3:4", label: "Portrait" },
                { value: "2:3", label: "Tall" },
              ]}
            />
          </div>

          <div>
            <SidebarLabel>Button Label</SidebarLabel>
            <SidebarInput
              value={design.productCTA || "VIEW"}
              onChange={(v: string) => update("productCTA", v)}
              placeholder="VIEW"
            />
          </div>

          <div>
            <SidebarLabel>Hover Effect</SidebarLabel>
            <SidebarRadioGroup
              value={design.productHoverEffect || "zoom"}
              onChange={(v) => update("productHoverEffect", v)}
              options={[
                { value: "none", label: "None" },
                { value: "zoom", label: "Zoom" },
                { value: "lift", label: "Lift" },
              ]}
            />
          </div>
        </div>
      </Accordion>

      <Accordion title="Product Page (Detail)">
        <div className="space-y-6">
          <div>
            <SidebarLabel>Image Layout</SidebarLabel>
            <SidebarRadioGroup
              value={design.productImageLayout || "slider"}
              onChange={(v) => update("productImageLayout", v)}
              options={[
                { value: "slider", label: "Slider" },
                { value: "grid", label: "Grid" },
                { value: "stacked", label: "Stacked" },
              ]}
            />
          </div>
          <div>
            <SidebarLabel>Content Position</SidebarLabel>
            <SidebarRadioGroup
              value={design.productContentPosition || "right"}
              onChange={(v) => update("productContentPosition", v)}
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
            />
          </div>
          <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden mt-2">
            <SidebarToggle
              label="Related items"
              description="Show other publications at bottom"
              checked={design.showRelatedProducts ?? true}
              onChange={(v: boolean) => update("showRelatedProducts", v)}
            />
            <SidebarToggle
              label="Social share"
              description="Show share button on detail page"
              checked={design.showSocialShare ?? true}
              onChange={(v: boolean) => update("showSocialShare", v)}
            />
          </div>
        </div>
      </Accordion>

      <Accordion title="Logic & Visibility">
        <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden mt-2">
          <SidebarToggle
            label="Show price on hover"
            description="Reveal price on interaction."
            checked={design.showPriceOnHover ?? false}
            onChange={(v: boolean) => update("showPriceOnHover", v)}
          />
          <SidebarToggle
            label="Collection metadata"
            description="Show category tags above products."
            checked={design.showCollectionMeta ?? true}
            onChange={(v: boolean) => update("showCollectionMeta", v)}
          />
          <SidebarToggle
            label="Sold-out badge"
            description="Display status when out of stock."
            checked={design.showSoldOutBadge ?? true}
            onChange={(v: boolean) => update("showSoldOutBadge", v)}
          />
          <SidebarToggle
            label="Sale badge"
            description="Flag discounted items on the card."
            checked={design.showSaleBadge ?? true}
            onChange={(v: boolean) => update("showSaleBadge", v)}
          />
          <SidebarToggle
            label="New badge"
            description="Highlight recently added products."
            checked={design.showNewBadge ?? false}
            onChange={(v: boolean) => update("showNewBadge", v)}
          />
        </div>
      </Accordion>

      <Accordion title="Badge Labels">
        <div className="space-y-6">
          <div>
            <SidebarLabel>Sale badge text</SidebarLabel>
            <SidebarInput
              value={design.saleBadgeLabel || "SALE"}
              onChange={(v: string) => update("saleBadgeLabel", v)}
              placeholder="SALE"
            />
          </div>
          <div>
            <SidebarLabel>New badge text</SidebarLabel>
            <SidebarInput
              value={design.newBadgeLabel || "NEW"}
              onChange={(v: string) => update("newBadgeLabel", v)}
              placeholder="NEW"
            />
          </div>
          <SidebarRange
            label="Mark as new for"
            value={design.newBadgeDays ?? 30}
            min={1}
            max={90}
            step={1}
            onChange={(v: number) => update("newBadgeDays", v)}
            suffix=" days"
          />
        </div>
      </Accordion>
    </div>
  );
}

function LayoutPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Grid Configuration" defaultOpen={true}>
        <div className="space-y-6">
          <SidebarRange
            label="Desktop Columns"
            value={design.productColumnsDesktop ?? 4}
            min={2}
            max={6}
            onChange={(v) => update("productColumnsDesktop", v)}
          />
          <SidebarRange
            label="Mobile Columns"
            value={design.productColumnsMobile ?? 2}
            min={1}
            max={3}
            onChange={(v) => update("productColumnsMobile", v)}
          />
        </div>
      </Accordion>

      <Accordion title="Dimensions & Spacing">
        <div className="space-y-6">
          <SidebarRange
            label="Content Width"
            value={design.containerWidth ?? 1200}
            min={900}
            max={1600}
            step={20}
            suffix="px"
            onChange={(v) => update("containerWidth", v)}
          />
          <SidebarRange
            label="Section Spacing"
            value={design.sectionSpacing ?? 64}
            min={24}
            max={120}
            step={4}
            suffix="px"
            onChange={(v) => update("sectionSpacing", v)}
          />
          <SidebarRange
            label="Visual Rounding"
            value={design.cardRadius ?? 8}
            min={0}
            max={24}
            suffix="px"
            onChange={(v) => update("cardRadius", v)}
          />
        </div>
      </Accordion>
    </div>
  );
}

function ButtonsPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Visual Style" defaultOpen={true}>
        <div>
          <SidebarLabel>Button Theme</SidebarLabel>
          <SidebarRadioGroup
            value={design.buttonStyle || "solid"}
            onChange={(v) => update("buttonStyle", v)}
            options={[
              { value: "solid", label: "Solid" },
              { value: "outline", label: "Outline" },
              { value: "ghost", label: "Ghost" },
            ]}
          />
        </div>
      </Accordion>
      
      <Accordion title="Shape & Effects">
        <div className="space-y-6">
          <SidebarRange
            label="Button Radius"
            value={design.buttonRadius ?? 999}
            min={0}
            max={40}
            suffix="px"
            onChange={(v) => update("buttonRadius", v)}
          />
          <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden">
            <SidebarToggle
              label="Uppercase"
              checked={design.buttonUppercase ?? true}
              onChange={(v: boolean) => update("buttonUppercase", v)}
            />
            <SidebarToggle
              label="Shadow"
              checked={design.buttonShadow ?? true}
              onChange={(v: boolean) => update("buttonShadow", v)}
            />
          </div>
        </div>
      </Accordion>
    </div>
  );
}

function AnnouncementsPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Status & Content" defaultOpen={true}>
        <div className="space-y-4">
          <div className="border border-neutral-100 rounded-xl overflow-hidden">
            <SidebarToggle
              label="Show announcement bar"
              description="Display a banner at the top of your shop"
              checked={design.showAnnouncement ?? true}
              onChange={(v: boolean) => update("showAnnouncement", v)}
            />
          </div>

          {(design.showAnnouncement ?? true) && (
            <div className="space-y-4">
              <div>
                <SidebarLabel>Announcement message</SidebarLabel>
                <textarea
                  value={design.announcementText || ""}
                  onChange={(e) => update("announcementText", e.target.value)}
                  rows={3}
                  placeholder="Enter your announcement..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-neutral-400 transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </Accordion>

      {(design.showAnnouncement ?? true) && (
        <Accordion title="Visuals & Motion">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <ColorPicker 
                label="Background" 
                value={design.announcementBg || "#000000"} 
                onChange={(val) => update("announcementBg", val)} 
              />
              <ColorPicker 
                label="Text color" 
                value={design.announcementColor || "#ffffff"} 
                onChange={(val) => update("announcementColor", val)} 
              />
            </div>

            <div className="border border-neutral-100 rounded-xl overflow-hidden">
              <SidebarToggle
                label="Scrolling text"
                description="Animate the text to scroll horizontally"
                checked={design.announcementScrolling ?? false}
                onChange={(v: boolean) => update("announcementScrolling", v)}
              />
            </div>
          </div>
        </Accordion>
      )}
    </div>
  );
}

function SocialPanel({ design, update }: any) {
  const social = design.social || {};
  const updateSocial = (key: string, val: string) => {
    update("social", { ...social, [key]: val });
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <Accordion title="Digital Ecosystem" defaultOpen={true}>
        <div className="space-y-6">
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest italic mb-2">
            Protocol: Link global social identifiers for archival distribution.
          </p>

          {[
            { key: "instagram", label: "Instagram", icon: <Instagram size={14} />, placeholder: "HTTPS://INSTAGRAM.COM/..." },
            { key: "twitter",   label: "Twitter / X", icon: <Twitter size={14} />, placeholder: "HTTPS://X.COM/..." },
            { key: "facebook",  label: "Facebook",  icon: <Facebook size={14} />, placeholder: "HTTPS://FACEBOOK.COM/..." },
            { key: "tiktok",    label: "TikTok",    icon: <Globe size={14} />, placeholder: "HTTPS://TIKTOK.COM/..." },
          ].map(({ key, label, icon, placeholder }) => (
            <div key={key} className="group/item">
              <SidebarLabel>{label}</SidebarLabel>
              <div className="mt-1 flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 focus-within:border-violet-500/50 transition-all shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-transparent opacity-0 group-focus-within/item:opacity-100 transition-opacity" />
                <span className="text-slate-600 group-focus-within/item:text-violet-400 transition-colors relative z-10">{icon}</span>
                <input
                  value={social[key] || ""}
                  onChange={(e) => updateSocial(key, e.target.value)}
                  placeholder={placeholder}
                  className="bg-transparent border-none outline-none text-[11px] flex-1 font-black text-white uppercase tracking-widest italic placeholder:text-slate-800 relative z-10"
                />
              </div>
            </div>
          ))}
        </div>
      </Accordion>
    </div>
  );
}

function TextSizingPanel({ design, update }: any) {
  return (
    <div className="flex-1 flex flex-col space-y-6">
      <Accordion title="Typography Scaling" defaultOpen={true}>
        <div className="space-y-10">
          <div>
            <SidebarLabel>Base Font Resolution</SidebarLabel>
            <SidebarRadioGroup
              value={design.fontSize || "md"}
              onChange={(v) => update("fontSize", v)}
              options={[
                { value: "sm", label: "Small" },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
              ]}
            />
          </div>

          <div>
            <SidebarLabel>Archival Heading Scale</SidebarLabel>
            <SidebarRadioGroup
              value={design.headingScale || "regular"}
              onChange={(v) => update("headingScale", v)}
              options={[
                { value: "compact", label: "Compact" },
                { value: "regular", label: "Regular" },
                { value: "large", label: "Large" },
              ]}
            />
          </div>

          <div>
            <SidebarLabel>Kerning & Spacing</SidebarLabel>
            <SidebarRadioGroup
              value={design.letterSpacing || "wide"}
              onChange={(v) => update("letterSpacing", v)}
              options={[
                { value: "normal", label: "Normal" },
                { value: "wide", label: "Wide" },
                { value: "ultra", label: "Ultra" },
              ]}
            />
          </div>
        </div>
      </Accordion>

      <Accordion title="Type Specimen">
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
           <p className="text-[10px] text-slate-500 mb-6 font-black uppercase tracking-[0.4em] border-b border-white/5 pb-4 italic">Render Preview</p>
           <div className="space-y-4 relative z-10">
             <p
               className="font-black text-white leading-none uppercase italic"
               style={{
                 fontFamily: design.font || "Inter",
                 fontSize: design.fontSize === "sm" ? 28 : design.fontSize === "lg" ? 48 : 36,
                 letterSpacing: design.letterSpacing === "ultra" ? "0.15em" : design.letterSpacing === "wide" ? "0.05em" : "0",
               }}
             >
               Aa — {design.font || "Inter"}
             </p>
             <p className="text-slate-400 text-[13px] leading-relaxed font-bold italic tracking-tight" style={{ fontFamily: design.font || "Inter" }}>
               THE QUICK BROWN FOX JUMPED OVER THE LAZY DOG. ARCHIVAL TEXTURE MANIFESTO.
             </p>
           </div>
        </div>
      </Accordion>
    </div>
  );
}

function TranslationsPanel({ design, update }: any) {
  const copy = design.copy || {};
  const updateCopy = (key: string, value: string) =>
    update("copy", { ...copy, [key]: value });

  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="System Labels" defaultOpen={true}>
        <div className="space-y-6">
          {[
            { key: "cartLabel",      label: "Cart label",        ph: "BAG" },
            { key: "shopButtonLabel",label: "Shop button",       ph: "SHOP NOW" },
            { key: "soldOutLabel",   label: "Sold-out label",    ph: "SOLD OUT" },
            { key: "productCTA",     label: "Product CTA",       ph: "VIEW" },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <SidebarLabel>{label}</SidebarLabel>
              <SidebarInput
                value={(design as any)[key] || ""}
                onChange={(v: string) => update(key, v)}
                placeholder={ph}
              />
            </div>
          ))}

          <div>
            <SidebarLabel>Currency symbol position</SidebarLabel>
            <SidebarRadioGroup
              value={design.currencyPosition || "before"}
              onChange={(v) => update("currencyPosition", v)}
              options={[
                { value: "before", label: "$12.00" },
                { value: "after", label: "12.00$" },
              ]}
            />
          </div>
        </div>
      </Accordion>

      {/* Auto-generated from COPY_SCHEMA — every shopper-facing string. */}
      {COPY_SCHEMA.map((groupDef) => (
        <Accordion key={groupDef.group} title={groupDef.group}>
          <div className="space-y-6">
            {groupDef.fields.map((field) => (
              <div key={field.key}>
                <SidebarLabel>{field.label}</SidebarLabel>
                {field.multiline ? (
                  <textarea
                    value={copy[field.key] ?? ""}
                    onChange={(e) => updateCopy(field.key, e.target.value)}
                    rows={3}
                    placeholder={field.default}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-200 outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-700 resize-none"
                  />
                ) : (
                  <SidebarInput
                    value={copy[field.key] ?? ""}
                    onChange={(v: string) => updateCopy(field.key, v)}
                    placeholder={field.default}
                  />
                )}
                {field.hint && (
                  <p className="text-[9px] text-slate-600 font-bold mt-1.5 italic">{field.hint}</p>
                )}
              </div>
            ))}
          </div>
        </Accordion>
      ))}
    </div>
  );
}

function AdditionalPanel({ design, update }: any) {
  return (
    <div className="flex-1 flex flex-col space-y-10">
      <div className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
        <div className="space-y-2 relative z-10">
          {[
            { key: "enableAnimations",  label: "Kinetic Motion",        desc: "Enable fluid interface transitions" },
            { key: "showZoom",          label: "Optical Expansion",     desc: "High-fidelity hover zoom protocols" },
            { key: "showBackToTop",     label: "Vertical Reset",        desc: "Display navigational return trigger" },
            { key: "showPoweredBy",     label: "Platform Identity",     desc: "Show archival platform accreditation" },
          ].map(({ key, label, desc }) => (
            <SidebarToggle
              key={key}
              label={label}
              description={desc}
              checked={(design as any)[key] ?? false}
              onChange={(v: boolean) => update(key, v)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <SidebarLabel>Archival Favicon Asset</SidebarLabel>
          <SidebarAssetUpload
            value={design.faviconUrl}
            onChange={(url: string) => update("faviconUrl", url)}
            type="favicon"
            label="Upload Favicon"
          />
        </div>
      </div>
    </div>
  );
}

function CodePanel({ design, update }: any) {
  return (
    <div className="flex-1 flex flex-col space-y-8">
      <div className="p-6 bg-violet-600/5 border border-violet-500/10 rounded-[2rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
          <Code2 size={48} className="rotate-12" />
        </div>
        <h4 className="text-[11px] font-black text-violet-400 uppercase tracking-[0.3em] italic mb-4">Development Override</h4>
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic uppercase">
          Inject custom architectural protocols into the storefront runtime.
        </p>
      </div>

      <div className="space-y-10">
        <div className="group/code">
          <SidebarLabel>Cascading Style Sheets (CSS)</SidebarLabel>
          <textarea
            value={design.customCss || ""}
            onChange={(e) => update("customCss", e.target.value)}
            rows={8}
            placeholder=".PROTOCOL { TRANSFORMATION: SCALE(1); }"
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-[11px] font-mono text-cyan-400 outline-none focus:border-cyan-500/50 transition-all resize-y placeholder:text-slate-800 shadow-inner italic"
          />
        </div>
        
        <div className="group/code">
          <SidebarLabel>Head Node Injection (HTML)</SidebarLabel>
          <textarea
            value={design.customHeadHtml || ""}
            onChange={(e) => update("customHeadHtml", e.target.value)}
            rows={5}
            placeholder="<META PROTOCOL='THEME-COLOR' CONTENT='#000000' />"
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-[11px] font-mono text-violet-400 outline-none focus:border-violet-500/50 transition-all resize-y placeholder:text-slate-800 shadow-inner italic"
          />
        </div>

        <div className="group/code">
          <SidebarLabel>Root Execution Scripts (JS)</SidebarLabel>
          <textarea
            value={design.customFooterScripts || ""}
            onChange={(e) => update("customFooterScripts", e.target.value)}
            rows={5}
            placeholder="<SCRIPT>EMIT('READY');</SCRIPT>"
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-5 text-[11px] font-mono text-emerald-400 outline-none focus:border-emerald-500/50 transition-all resize-y placeholder:text-slate-800 shadow-inner italic"
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Version History Panel
// ─────────────────────────────────────────────────────────────────────────────
export interface VersionEntry {
  id: string;
  label: string;
  timestamp: Date;
  design: any;
}

function VersionHistoryPanel({
  versions,
  currentDesign,
  onRestore,
  onPreview,
  previewingVersion,
}: {
  versions: VersionEntry[];
  currentDesign: any;
  onRestore: (v: VersionEntry) => void;
  onPreview: (v: VersionEntry | null) => void;
  previewingVersion: string | null;
}) {
  const fmt = (d: Date) => {
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="px-2">
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-[0.2em] italic mb-6">
          Last {versions.length} saved states. Click to preview, restore to roll back.
        </p>
      </div>

      {versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 opacity-40">
          <Clock size={32} className="text-slate-600 mb-4" />
          <p className="text-[10px] font-black text-slate-600 tracking-[0.3em] uppercase italic">No versions yet</p>
          <p className="text-[9px] text-slate-700 font-bold mt-1">Save a draft or publish to create a snapshot</p>
        </div>
      ) : (
        <div className="space-y-2 px-1">
          {/* Current (unsaved) state */}
          <div className="flex items-center gap-3 p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-violet-300 uppercase tracking-tight">Current</p>
              <p className="text-[8px] text-violet-500 font-bold">Working state — not yet saved</p>
            </div>
          </div>

          {versions.map((v, i) => {
            const isPreviewing = previewingVersion === v.id;
            return (
              <motion.div
                key={v.id}
                layout
                className={`group flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all ${
                  isPreviewing
                    ? "bg-cyan-500/10 border-cyan-500/30"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                }`}
                onClick={() => onPreview(isPreviewing ? null : v)}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
                  i === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-500"
                }`}>
                  {i === 0 ? <Check size={14} strokeWidth={3} /> : versions.length - i}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-white truncate">{v.label}</p>
                  <p className="text-[8px] text-slate-600 font-bold">{fmt(v.timestamp)}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isPreviewing && (
                    <span className="text-[7px] font-black text-cyan-400 tracking-widest uppercase">Previewing</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRestore(v); }}
                    className="text-[8px] font-black text-emerald-400 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-all uppercase tracking-widest"
                    title="Restore this version"
                  >
                    Restore
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {previewingVersion && (
        <div className="mx-1 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={12} className="text-cyan-400" />
            <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Preview mode active</p>
          </div>
          <button onClick={() => onPreview(null)} className="text-[8px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">
            Exit
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Responsive / Breakpoint Panel
// ─────────────────────────────────────────────────────────────────────────────
function ResponsivePanel({ design, update, device }: { design: any; update: (k: string, v: any) => void; device: "desktop" | "mobile" }) {
  const isMobile = device === "mobile";

  // Mobile overrides are stored in design.mobileOverrides
  const overrides = design.mobileOverrides || {};

  const updateOverride = (key: string, value: any) => {
    update("mobileOverrides", { ...overrides, [key]: value });
  };
  const resetOverride = (key: string) => {
    const next = { ...overrides };
    delete next[key];
    update("mobileOverrides", next);
  };

  const hasOverride = (key: string) => key in overrides;

  function BreakpointField({ label, desktopKey, mobileValue, onChange, onReset, children }: any) {
    const isOverridden = hasOverride(desktopKey);
    return (
      <div className={`relative p-4 rounded-2xl border transition-all ${
        isMobile && isOverridden
          ? "bg-blue-500/10 border-blue-500/30"
          : "bg-white/[0.02] border-white/5"
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            {isMobile && isOverridden && (
              <span className="flex items-center gap-1 text-[7px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                <Smartphone size={8} />
                Override
              </span>
            )}
          </div>
          {isMobile && isOverridden && (
            <button
              onClick={onReset}
              className="text-[8px] font-black text-slate-600 hover:text-white transition-colors uppercase tracking-widest"
            >
              ↩ Desktop
            </button>
          )}
        </div>
        {children}
      </div>
    );
  }

  const fontSizeOptions = [
    { value: "sm", label: "Small" },
    { value: "md", label: "Medium" },
    { value: "lg", label: "Large" },
  ];

  const columnOptions = [
    { value: 1, label: "1 col" },
    { value: 2, label: "2 col" },
    { value: 3, label: "3 col" },
  ];

  return (
    <div className="flex flex-col space-y-4">
      <div className="px-2 pb-2">
        <div className={`flex items-center gap-3 p-4 rounded-2xl border mb-4 ${
          isMobile ? "bg-blue-500/10 border-blue-500/20" : "bg-white/[0.02] border-white/5"
        }`}>
          {isMobile ? <Smartphone size={16} className="text-blue-400" /> : <Monitor size={16} className="text-slate-500" />}
          <div>
            <p className="text-[10px] font-black text-white uppercase tracking-widest">
              {isMobile ? "Mobile Breakpoint" : "Desktop Breakpoint"}
            </p>
            <p className="text-[8px] text-slate-500 font-bold mt-0.5">
              {isMobile ? "Settings here override desktop values on mobile screens" : "Switch to mobile view to set per-breakpoint overrides"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-1">
        {/* Font size */}
        <BreakpointField
          label="Font Size"
          desktopKey="fontSizeMobile"
          onReset={() => resetOverride("fontSizeMobile")}
        >
          <div className="flex gap-2">
            {fontSizeOptions.map((opt) => {
              const currentVal = isMobile
                ? (overrides.fontSizeMobile ?? design.fontSize ?? "md")
                : (design.fontSize ?? "md");
              return (
                <button
                  key={opt.value}
                  onClick={() => isMobile ? updateOverride("fontSizeMobile", opt.value) : update("fontSize", opt.value)}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                    currentVal === opt.value
                      ? "bg-violet-600 text-white"
                      : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </BreakpointField>

        {/* Product columns */}
        <BreakpointField
          label="Product Columns"
          desktopKey="productColumnsMobile"
          onReset={() => resetOverride("productColumnsMobile")}
        >
          <div className="flex gap-2">
            {columnOptions.map((opt) => {
              const currentVal = isMobile
                ? (overrides.productColumnsMobile ?? design.productColumnsMobile ?? 2)
                : (design.productColumnsDesktop ?? 4);
              return (
                <button
                  key={opt.value}
                  onClick={() => isMobile
                    ? updateOverride("productColumnsMobile", opt.value)
                    : update("productColumnsDesktop", opt.value)}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                    currentVal === opt.value
                      ? "bg-violet-600 text-white"
                      : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </BreakpointField>

        {/* Announcement visibility */}
        <BreakpointField
          label="Announcement Bar"
          desktopKey="showAnnouncementMobile"
          onReset={() => resetOverride("showAnnouncementMobile")}
        >
          <div className="flex gap-2">
            {[{ value: true, label: "Show" }, { value: false, label: "Hide" }].map((opt) => {
              const currentVal = isMobile
                ? (overrides.showAnnouncementMobile ?? design.showAnnouncement ?? true)
                : (design.showAnnouncement ?? true);
              return (
                <button
                  key={String(opt.value)}
                  onClick={() => isMobile
                    ? updateOverride("showAnnouncementMobile", opt.value)
                    : update("showAnnouncement", opt.value)}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                    currentVal === opt.value
                      ? (opt.value ? "bg-emerald-600 text-white" : "bg-red-600/60 text-white")
                      : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </BreakpointField>

        {/* Hero heading size */}
        <BreakpointField
          label="Hero Heading Scale"
          desktopKey="heroHeadingScaleMobile"
          onReset={() => resetOverride("heroHeadingScaleMobile")}
        >
          <div className="flex gap-2">
            {[{ value: "xs", label: "XS" }, { value: "sm", label: "SM" }, { value: "md", label: "MD" }, { value: "lg", label: "LG" }].map((opt) => {
              const currentVal = isMobile
                ? (overrides.heroHeadingScaleMobile ?? "md")
                : (design.heroHeadingScale ?? "md");
              return (
                <button
                  key={opt.value}
                  onClick={() => isMobile
                    ? updateOverride("heroHeadingScaleMobile", opt.value)
                    : update("heroHeadingScale", opt.value)}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                    currentVal === opt.value
                      ? "bg-violet-600 text-white"
                      : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </BreakpointField>
      </div>

      {isMobile && Object.keys(overrides).length > 0 && (
        <div className="mx-1 pt-2">
          <button
            onClick={() => update("mobileOverrides", {})}
            className="w-full py-3 text-[9px] font-black text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all uppercase tracking-widest border border-transparent hover:border-red-500/20"
          >
            Reset All Mobile Overrides
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO Panel
// ─────────────────────────────────────────────────────────────────────────────
function SeoPanel({ design, update, previewMode }: { design: any; update: (k: string, v: any) => void; previewMode: string }) {
  const prefix = previewMode === "shop" ? "shop" : "home";
  const titleKey = `${prefix}SeoTitle`;
  const descKey = `${prefix}SeoDesc`;
  const ogKey = `${prefix}OgImage`;
  const slugKey = `${prefix}Slug`;

  const title = design[titleKey] || "";
  const desc = design[descKey] || "";
  const og = design[ogKey] || "";
  const slug = design[slugKey] || (previewMode === "shop" ? "shop" : "");

  const titleLen = title.length;
  const descLen = desc.length;

  const titleColor = titleLen === 0 ? "text-slate-600" : titleLen <= 60 ? "text-emerald-400" : "text-red-400";
  const titleBg = titleLen === 0 ? "bg-slate-600" : titleLen <= 60 ? "bg-emerald-400" : "bg-red-400";
  const descColor = descLen === 0 ? "text-slate-600" : descLen <= 160 ? "text-emerald-400" : "text-red-400";
  const descBg = descLen === 0 ? "bg-slate-600" : descLen <= 160 ? "bg-emerald-400" : "bg-red-400";

  const baseDomain = window.location.hostname + (window.location.pathname.replace(/\/admin\/?.*$/, "") || "");

  return (
    <div className="flex flex-col space-y-6">
      <div className="px-2">
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-[0.2em] italic">
          SEO settings for the <span className="text-violet-400">{previewMode === "shop" ? "Shop" : "Homepage"}</span> page.
        </p>
      </div>

      {/* SERP Preview */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm">
        <p className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.3em] mb-3">Google Search Preview</p>
        <div className="space-y-1">
          <p className="text-[9px] text-neutral-500 font-mono">{baseDomain}{slug ? `/${slug}` : ""}</p>
          <p className="text-[14px] font-normal text-[#1a0dab] leading-snug hover:underline cursor-default" style={{ fontFamily: "Arial, sans-serif" }}>
            {title || <span className="text-neutral-300">Page title will appear here</span>}
          </p>
          <p className="text-[11px] text-neutral-600 leading-relaxed" style={{ fontFamily: "Arial, sans-serif" }}>
            {desc ? (desc.length > 160 ? desc.slice(0, 157) + "..." : desc) : <span className="text-neutral-300">Meta description will appear here...</span>}
          </p>
        </div>
      </div>

      {/* Social Share Preview */}
      {og && (
        <div className="rounded-3xl overflow-hidden border border-neutral-200 shadow-sm bg-white">
          <div className="aspect-[1.91/1] bg-neutral-100 overflow-hidden">
            <img src={og} alt="OG" className="w-full h-full object-cover" />
          </div>
          <div className="p-4">
            <p className="text-[8px] text-neutral-400 font-mono uppercase mb-1">{baseDomain}</p>
            <p className="text-[11px] font-bold text-neutral-900 leading-tight">{title || "Page Title"}</p>
            <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">{desc?.slice(0, 100) || "Description"}</p>
          </div>
        </div>
      )}

      <div className="space-y-5 px-1">
        {/* URL Slug */}
        <div className="space-y-2">
          <SidebarLabel>URL Slug</SidebarLabel>
          <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
            <span className="px-3 text-[9px] text-slate-600 font-mono flex-shrink-0">/{" "}</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => update(slugKey, e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder={previewMode === "shop" ? "shop" : ""}
              className="flex-1 bg-transparent py-3 pr-4 text-[11px] font-bold text-slate-200 outline-none placeholder:text-slate-800"
            />
          </div>
        </div>

        {/* Page Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SidebarLabel>Page Title</SidebarLabel>
            <span className={`text-[8px] font-black ${titleColor} tabular-nums`}>
              {titleLen}/60
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => update(titleKey, e.target.value)}
            placeholder="My Store · Books & Art"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-200 outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-800"
          />
          {/* Progress bar */}
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${titleBg}`}
              style={{ width: `${Math.min(100, (titleLen / 60) * 100)}%` }}
            />
          </div>
          <p className="text-[8px] text-slate-700 font-bold">
            {titleLen === 0 ? "Aim for 50–60 characters" : titleLen <= 50 ? "Good — can be a bit longer" : titleLen <= 60 ? "✓ Optimal length" : "Too long — Google will truncate"}
          </p>
        </div>

        {/* Meta Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SidebarLabel>Meta Description</SidebarLabel>
            <span className={`text-[8px] font-black ${descColor} tabular-nums`}>
              {descLen}/160
            </span>
          </div>
          <textarea
            value={desc}
            onChange={(e) => update(descKey, e.target.value)}
            placeholder="A short description of this page for search engines..."
            rows={3}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-200 outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-800 resize-none"
          />
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${descBg}`}
              style={{ width: `${Math.min(100, (descLen / 160) * 100)}%` }}
            />
          </div>
          <p className="text-[8px] text-slate-700 font-bold">
            {descLen === 0 ? "Aim for 120–160 characters" : descLen <= 120 ? "Could be more descriptive" : descLen <= 160 ? "✓ Optimal length" : "Too long — will be cut off in results"}
          </p>
        </div>

        {/* OG Image */}
        <div className="space-y-2">
          <SidebarLabel>Social Share Image (OG Image)</SidebarLabel>
          <SidebarInput
            value={og}
            onChange={(v: string) => update(ogKey, v)}
            placeholder="https://... (1200×630px recommended)"
          />
          <p className="text-[8px] text-slate-700 font-bold">Recommended: 1200×630px JPG or PNG</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Preview — scaled render of the actual storefront
// ─────────────────────────────────────────────────────────────────────────────
function LivePreview({ design, device, previewMode, iframeRef, previewBookSlug }: any) {
  const isDesktop = device === "desktop";
  const isTablet = device === "tablet";

  // Derive the base URL from the current page — works on localhost AND GitHub Pages /RepoName/
  const basePath = window.location.pathname.replace(/\/admin\/?.*$/, "").replace(/\/$/, "");
  const baseUrl = window.location.origin + basePath;
  const withPreview = (path: string) => baseUrl + path + (path.includes("?") ? "&" : "?") + "preview=true";
  const previewUrl = (() => {
    switch (previewMode.value) {
      case "shop":       return withPreview("/?catalog=true");
      case "product":    return withPreview(`/books/${previewBookSlug || ""}`);
      case "collection": return withPreview(`/collections/${previewMode.collectionSlug || ""}`);
      case "page":       return withPreview(`/page/${previewMode.pageSlug || ""}`);
      case "wishlist":   return withPreview("/wishlist");
      case "account":    return withPreview("/account");
      case "cart":       return withPreview("/checkout");
      case "homepage":
      default:           return withPreview("/");
    }
  })();

  // Inject click-to-select detector into the iframe once it loads.
  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const script = doc.createElement("script");
      script.textContent = `
        (function() {
          if (window.__editorClicksInjected) return;
          window.__editorClicksInjected = true;
          var SECTION_MAP = [
            ['[data-section]', null],
            ['header, nav, [class*="nav"], [class*="header"]', 'navigation'],
            ['[class*="hero"], [class*="banner"]', 'homepage'],
            ['[class*="product"], [class*="catalog"], [class*="grid"]', 'products'],
            ['[class*="announce"], [class*="ticker"]', 'announcements'],
            ['button, [class*="btn"], a[class*="cta"]', 'buttons'],
            ['footer, [class*="footer"]', 'navigation'],
          ];
          function getSectionId(el) {
            var cur = el;
            while (cur && cur !== document.body) {
              if (cur.dataset && cur.dataset.section) return cur.dataset.section;
              for (var i = 0; i < SECTION_MAP.length; i++) {
                try { if (cur.matches && cur.matches(SECTION_MAP[i][0]) && SECTION_MAP[i][1]) return SECTION_MAP[i][1]; } catch(_){}
              }
              cur = cur.parentElement;
            }
            return null;
          }
          var box = document.createElement('div');
          box.style.cssText = 'position:fixed;pointer-events:none;border:2px solid rgba(124,58,237,0.75);border-radius:6px;z-index:99999;background:rgba(124,58,237,0.08);transition:all 0.12s ease;display:none;';
          var lbl = document.createElement('div');
          lbl.style.cssText = 'position:absolute;top:-22px;left:0;background:rgba(124,58,237,0.9);color:#fff;font-size:9px;font-weight:900;letter-spacing:0.2em;padding:2px 8px;border-radius:4px;white-space:nowrap;text-transform:uppercase;font-family:monospace;';
          box.appendChild(lbl);
          document.body.appendChild(box);
          document.addEventListener('mouseover', function(e){
            var sid = getSectionId(e.target);
            if (!sid) { box.style.display='none'; return; }
            var r = e.target.getBoundingClientRect();
            box.style.display='block'; lbl.textContent=sid;
            box.style.top=r.top+'px'; box.style.left=r.left+'px';
            box.style.width=r.width+'px'; box.style.height=r.height+'px';
          }, true);
          document.addEventListener('mouseout', function(){
            box.style.display='none';
          }, true);
          document.addEventListener('click', function(e){
            // Let real navigation links/buttons through so the editor can browse all pages.
            var navTarget = e.target && e.target.closest ? e.target.closest('a[href], button[type="submit"]') : null;
            if (navTarget) return;
            var sid = getSectionId(e.target);
            if (!sid) return;
            e.preventDefault(); e.stopPropagation();
            window.parent.postMessage({ type:'SECTION_SELECT', sectionId: sid }, window.location.origin);
          }, true);
          document.addEventListener('dblclick', function(e){
            var fieldNode = e.target && e.target.closest ? e.target.closest('[data-theme-field]') : null;
            var sectionNode = e.target && e.target.closest ? e.target.closest('[data-section-id]') : null;
            if (!fieldNode || !sectionNode) return;
            e.preventDefault(); e.stopPropagation();
            fieldNode.setAttribute('contenteditable', 'true');
            fieldNode.focus();
            var fieldKey = fieldNode.getAttribute('data-theme-field');
            var sectionId = sectionNode.getAttribute('data-section-id');
            var emit = function() {
              window.parent.postMessage({
                type: 'TEXT_EDIT',
                sectionId: sectionId,
                settingKey: fieldKey,
                value: fieldNode.textContent || ''
              }, window.location.origin);
            };
            fieldNode.addEventListener('input', emit);
            fieldNode.addEventListener('blur', function() {
              fieldNode.removeAttribute('contenteditable');
              fieldNode.removeEventListener('input', emit);
            }, { once: true });
          }, true);
          window.parent.postMessage({ type: 'PREVIEW_READY' }, window.location.origin);
        })();
      `;
      doc.head.appendChild(script);
    } catch(_) { /* cross-origin frames will silently fail */ }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#e8e8e8] overflow-hidden p-6 pt-2">
      {/* Preview mode tabs */}
      <div className="flex flex-col items-center gap-2 mb-4 w-full max-w-[640px]">
        <div className="flex flex-wrap justify-center gap-1 bg-white/80 border border-neutral-200 rounded-full p-0.5 shadow-sm">
          {([
            { id: "homepage",   icon: <Home size={10} />,        label: "Home" },
            { id: "shop",       icon: <ShoppingBag size={10} />, label: "Shop" },
            { id: "product",    icon: <BookOpen size={10} />,    label: "Product" },
            { id: "collection", icon: <Tag size={10} />,         label: "Collection" },
            { id: "page",       icon: <FileText size={10} />,    label: "Page" },
            { id: "wishlist",   icon: <Heart size={10} />,       label: "Wishlist" },
            { id: "account",    icon: <User size={10} />,        label: "Account" },
            { id: "cart",       icon: <ShoppingCart size={10} />, label: "Cart" },
          ] as const).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => previewMode.set(id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all ${
                previewMode.value === id
                  ? "bg-neutral-900 text-white shadow"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Book selector — only shown in product mode */}
        {previewMode.value === "product" && previewMode.books && previewMode.books.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-full px-4 py-1.5 shadow-sm w-full max-w-xs">
            <BookOpen size={10} className="text-neutral-400 flex-shrink-0" />
            <select
              value={previewMode.bookSlug}
              onChange={e => previewMode.setBookSlug(e.target.value)}
              className="flex-1 bg-transparent text-[10px] font-bold text-neutral-700 outline-none cursor-pointer truncate"
            >
              {previewMode.books.map((b: any) => {
                const slug = b.slug || (b.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return (
                  <option key={b.id} value={slug}>{b.title || slug}</option>
                );
              })}
            </select>
          </div>
        )}

        {/* Custom-page selector — only shown in page mode */}
        {previewMode.value === "page" && previewMode.pages && previewMode.pages.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-full px-4 py-1.5 shadow-sm w-full max-w-xs">
            <FileText size={10} className="text-neutral-400 flex-shrink-0" />
            <select
              value={previewMode.pageSlug || ""}
              onChange={e => previewMode.setPageSlug(e.target.value)}
              className="flex-1 bg-transparent text-[10px] font-bold text-neutral-700 outline-none cursor-pointer truncate"
            >
              {previewMode.pages.map((p: any) => (
                <option key={p.id} value={p.slug}>{p.title || p.slug}</option>
              ))}
            </select>
          </div>
        )}

        {/* Collection selector — only shown in collection mode */}
        {previewMode.value === "collection" && previewMode.collections && previewMode.collections.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-full px-4 py-1.5 shadow-sm w-full max-w-xs">
            <Tag size={10} className="text-neutral-400 flex-shrink-0" />
            <select
              value={previewMode.collectionSlug || ""}
              onChange={e => previewMode.setCollectionSlug(e.target.value)}
              className="flex-1 bg-transparent text-[10px] font-bold text-neutral-700 outline-none cursor-pointer truncate"
            >
              {previewMode.collections.map((c: { slug: string; name: string }) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Browser chrome / Device Frame */}
      <div
        className={`bg-white shadow-2xl relative transition-all duration-700 ease-in-out flex flex-col ${
          isDesktop
            ? "rounded-2xl border border-neutral-300/50 w-full max-w-[1200px] h-full"
            : isTablet
            ? "rounded-[2rem] border-[10px] border-neutral-900 w-[820px] h-[1080px] scale-[0.6] 2xl:scale-[0.75]"
            : "rounded-[3rem] border-[8px] border-neutral-900 w-[375px] h-[760px] scale-[0.85] 2xl:scale-100"
        }`}
      >
        {/* Notch for Mobile only */}
        {!isDesktop && !isTablet && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-900 rounded-b-2xl z-20 flex items-center justify-center gap-1.5">
            <div className="w-8 h-1 bg-white/10 rounded-full" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          </div>
        )}

        {/* URL bar - Hidden on Mobile Frame for cleaner look */}
        {isDesktop && (
          <div className="bg-[#f5f5f5] border-b border-neutral-200 px-3 py-2 flex items-center gap-2 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-1 flex items-center gap-1.5 mx-2">
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-[9px] text-neutral-400 font-mono truncate">{previewUrl}</span>
            </div>
            <Eye size={11} className="text-neutral-300" />
          </div>
        )}

        {/* Iframe Viewport — with click-to-select overlay */}
        <div className={`flex-1 bg-white relative overflow-hidden group/preview ${!isDesktop ? "rounded-[2.2rem]" : ""}`}>
          <iframe
            key={previewMode.value}  // remount iframe when mode changes
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-none"
            title="Theme Preview"
            onLoad={handleIframeLoad}
          />
          {/* Click-to-select hover hint */}
          <div className="absolute inset-0 pointer-events-none ring-2 ring-violet-500/0 group-hover/preview:ring-violet-500/30 transition-all duration-500 rounded-inherit" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/preview:opacity-100 transition-all duration-300 pointer-events-none z-20">
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-violet-500/30 text-violet-300 text-[9px] font-bold tracking-widest uppercase px-4 py-2 rounded-full shadow-xl whitespace-nowrap">
              <MousePointer2 size={10} strokeWidth={2.5} />
              Click any element to select it
            </div>
          </div>
        </div>

        {/* Home Indicator for Mobile */}
        {!isDesktop && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-neutral-900/10 rounded-full" />
        )}
      </div>

      <p className="text-[10px] text-neutral-400 mt-4 font-bold tracking-[0.2em] uppercase flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        {isDesktop ? "Desktop" : isTablet ? "Tablet" : "Mobile"} Viewport · Live Preview Sync
      </p>
    </div>
  );
}

function HomepagePreview({ design, bg, text, accent, font, pages }: any) {
  const hero = design.hero || { slides: [] };
  const showAnnouncement = design.showAnnouncement ?? true;
  const navPages = (pages || []).filter((p: any) => p.showInNav && p.status === "published");
  const headerLinks = design.headerLinks || {};
  const activeSlide = (hero.slides || [])[0] || {
    title: "F✶M",
    subtitle: "PHOTOGRAPHY & ART BOOKS",
    ctaText: "ENTER ARCHIVE",
    imageUrl: ""
  };

  const alignClass = hero.align === "left" ? "items-start text-left" : hero.align === "right" ? "items-end text-right" : "items-center text-center";
  const buttonStyle = design.buttonStyle || "solid";
  const buttonRadius = design.buttonRadius ?? 999;
  const buttonShadow = design.buttonShadow ?? true;
  const buttonUppercase = design.buttonUppercase ?? true;

  return (
    <div className="h-full flex flex-col" style={{ background: bg, color: text, fontFamily: font }}>
      {showAnnouncement && (
        <div
          className="px-4 py-2 text-center text-[8px] font-bold tracking-[0.3em] uppercase flex-shrink-0"
          style={{ background: design.announcementBg || "#000000", color: design.announcementColor || "#ffffff" }}
        >
          <span className={design.announcementScrolling ? "animate-marquee inline-block" : ""}>
            {design.announcementText || "INDEPENDENT PUBLISHING HOUSE"}
          </span>
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 backdrop-blur-md" style={{ borderColor: `${text}15`, background: `${bg}80` }}>
        {(headerLinks.showEnterArchive ?? true) ? (
          <span className="text-[10px] font-bold tracking-[0.2em] opacity-90">ENTER ARCHIVE</span>
        ) : (
          <span className="text-[11px] font-black tracking-tight opacity-90">F✶M</span>
        )}
        <div className="flex items-center gap-4">
          {(headerLinks.showInformation ?? true) && (
            <span className="text-[8px] tracking-widest opacity-60 uppercase">INFORMATION</span>
          )}
          {(headerLinks.showCustomPages ?? true) && (
            <>
              <span className="text-[8px] tracking-widest opacity-50 uppercase">{design.navHeading || "INFO"}</span>
              {navPages.slice(0, 1).map((p: any) => (
                <span key={p.id} className="text-[7px] tracking-widest opacity-40 uppercase truncate max-w-[50px]">{p.title}</span>
              ))}
            </>
          )}
          {(headerLinks.showBag ?? true) && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full border text-[8px] font-bold tracking-widest" style={{ borderColor: `${text}20`, background: `${text}10` }}>
              {design.cartLabel || "BAG"}
            </div>
          )}
          {(headerLinks.showSys ?? true) && (
            <span className="text-[7px] tracking-widest opacity-30">SYS</span>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className={`flex-1 relative overflow-hidden flex flex-col justify-center px-8 ${alignClass}`}>
        {/* Overlay */}
        <div className="absolute inset-0 z-0 transition-opacity duration-500" style={{ background: "black", opacity: hero.overlayOpacity ?? 0.4 }} />
        
        {/* Background Image */}
        {activeSlide.imageUrl ? (
           <img src={activeSlide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover -z-10" />
        ) : (
           <div className="absolute inset-0 bg-neutral-900 -z-10" />
        )}
        
        {/* Content */}
        <div className="relative z-10 max-w-[200px]">
          {activeSlide.badge && (
            <div className="inline-flex mb-3 px-2.5 py-1 rounded-full border border-white/30 text-[6px] uppercase tracking-[0.25em] text-white/90">
              {activeSlide.badge}
            </div>
          )}
          <h2 className="text-[16px] font-black tracking-tight leading-none mb-1 text-white uppercase">{activeSlide.title}</h2>
          <p className="text-[8px] tracking-[0.2em] font-medium text-white/60 mb-4 whitespace-pre-wrap">{activeSlide.subtitle}</p>
          <div className={`flex flex-wrap items-center gap-2 ${
            hero.align === "left" ? "justify-start" : hero.align === "right" ? "justify-end" : "justify-center"
          }`}>
            <div
              className={`inline-block px-5 py-2 text-[7px] font-bold tracking-widest transition-transform hover:scale-105 ${buttonUppercase ? "uppercase" : ""} ${buttonShadow ? "shadow-lg" : ""}`}
              style={{
                borderRadius: buttonRadius,
                background: buttonStyle === "ghost" ? "transparent" : accent,
                color: buttonStyle === "solid" ? "white" : accent,
                border: buttonStyle === "outline" || buttonStyle === "ghost" ? `1px solid ${accent}` : "none",
              }}
            >
              {activeSlide.ctaText}
            </div>
          </div>
        </div>

        {/* Slide Indicators if multi */}
        {(hero.slides || []).length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
             {(hero.slides || []).map((_: any, i: number) => (
               <div key={i} className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/20'}`} />
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopPreview({ design, bg, text, accent, font, pages }: any) {
  const aspectClass = design.imageAspectRatio === "1:1" ? "aspect-square" : design.imageAspectRatio === "2:3" ? "aspect-[2/3]" : "aspect-[3/4]";
  const showAnnouncement = design.showAnnouncement ?? true;
  const navPages = (pages || []).filter((p: any) => p.showInNav && p.status === "published");
  const headerLinks = design.headerLinks || {};
  const cardRadius = design.cardRadius ?? 8;
  const desktopColumns = Math.max(2, Math.min(6, design.productColumnsDesktop ?? 4));
  const mobileColumns = Math.max(1, Math.min(3, design.productColumnsMobile ?? 2));
  const buttonStyle = design.buttonStyle || "solid";
  const buttonRadius = design.buttonRadius ?? 999;
  const buttonShadow = design.buttonShadow ?? true;
  const buttonUppercase = design.buttonUppercase ?? true;

  const MOCK_BOOKS = [
    { title: "Volume I", price: "$42.00", color: "#2a2a2a" },
    { title: "Archive Issue", price: "$68.00", color: "#3d3030" },
    { title: "Selected Works", price: "$55.00", color: "#1a2a1a" },
    { title: "Limited Edit.", price: "$120.00", color: "#2a2040" },
    { title: "Ephemera", price: "$28.00", color: "#3a2a10" },
    { title: "Light Study", price: "$85.00", color: "#1a1a2a" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: bg, color: text, fontFamily: font }}>
      {showAnnouncement && (
        <div
          className="px-2 py-1.5 text-center text-[7px] font-bold tracking-[0.2em] uppercase flex-shrink-0"
          style={{ background: design.announcementBg || "#000000", color: design.announcementColor || "#ffffff" }}
        >
          {design.announcementText || "INDEPENDENT PUBLISHING HOUSE"}
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0 backdrop-blur-sm sticky top-0 z-10" style={{ borderColor: `${text}15`, background: `${bg}cc` }}>
        <span className="text-[9px] font-black tracking-tight">F✶M</span>
        <div className="flex items-center gap-3">
          {["PUBLICATIONS", "PRINTS"].map((c) => (
            <span key={c} className="text-[7px] tracking-widest opacity-40">{c}</span>
          ))}
          {(headerLinks.showCustomPages ?? true) && (
            <>
              <span className="text-[7px] font-bold tracking-widest opacity-60 ml-1 border-l pl-2" style={{ borderColor: `${text}20` }}>
                {design.navHeading || "INFO"}
              </span>
              {navPages.slice(0, 1).map((p: any) => (
                <span key={p.id} className="text-[6px] tracking-widest opacity-30 uppercase">{p.title}</span>
              ))}
            </>
          )}
          {(headerLinks.showInformation ?? true) && (
            <span className="text-[7px] tracking-widest opacity-40 uppercase">INFORMATION</span>
          )}
        </div>
        {(headerLinks.showBag ?? true) && (
          <div className="text-[7px] font-bold tracking-widest opacity-50 px-2 py-0.5 border rounded-full" style={{ borderColor: `${text}20` }}>
            {design.cartLabel || "BAG"}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${mobileColumns}, minmax(0, 1fr))`,
          }}
        >
          {MOCK_BOOKS.map((book, i) => (
            <div key={i} className="group relative cursor-pointer">
              <div className={`${aspectClass} overflow-hidden mb-1.5 relative`} style={{ background: book.color, borderRadius: cardRadius }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span
                    className={`text-[6px] font-bold tracking-widest px-2 py-1 ${buttonUppercase ? "uppercase" : ""} ${buttonShadow ? "shadow-lg" : ""}`}
                    style={{
                      borderRadius: buttonRadius,
                      background: buttonStyle === "ghost" ? "transparent" : accent,
                      color: buttonStyle === "solid" ? "#fff" : accent,
                      border: buttonStyle === "outline" || buttonStyle === "ghost" ? `1px solid ${accent}` : "none",
                    }}
                  >
                    {design.productCTA || "VIEW"}
                  </span>
                </div>
              </div>
              <p className="text-[7px] font-medium tracking-wide leading-tight opacity-80 truncate">{book.title}</p>
              <p className="text-[7px] opacity-40">{book.price}</p>
            </div>
          ))}
        </div>
        <div className="text-[7px] opacity-30 mt-3">
          Product grid: {desktopColumns} desktop / {mobileColumns} mobile columns
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ThemeEditor component
// ─────────────────────────────────────────────────────────────────────────────
export interface ThemeEditorProps {
  settings: any;
  onSave: (design: any, options?: any) => Promise<void>;
  onExit: () => void;
}

export function ThemeEditor({ settings, onSave, onExit }: ThemeEditorProps) {
  const getInitialDesign = () => {
    const baseDesign = adminApi.getDefaultSettings().design;
    const incomingDesign = settings?.draftDesign || settings?.design || {};
    const mergedLegacy = { ...baseDesign, ...incomingDesign };
    const { heroPage: _legacyHeroPage, storefront: _legacyStorefront, ...surfaceBase } = mergedLegacy;

    return {
      ...mergedLegacy,
      heroPage: {
        ...surfaceBase,
        sections: incomingDesign.heroPage?.sections || incomingDesign.heroPage?.homepageSections || incomingDesign.homepageSections || [],
        ...(incomingDesign.heroPage || {}),
      },
      storefront: {
        ...surfaceBase,
        sections: incomingDesign.storefront?.sections || incomingDesign.storefront?.homepageSections || [],
        ...(incomingDesign.storefront || {}),
      },
    };
  };

  // Local copy of just the design settings — changes here won't affect Firebase until "Publish"
  const [design, setDesign] = useState<any>(getInitialDesign);
  const [savedDesign, setSavedDesign] = useState<any>(getInitialDesign);
  const [pastDesigns, setPastDesigns] = useState<any[]>([]);
  const [futureDesigns, setFutureDesigns] = useState<any[]>([]);

  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [designSurface, setDesignSurface] = useState<string>("heroPage");
  const [previewMode, setPreviewMode] = useState<
    "homepage" | "shop" | "product" | "collection" | "page" | "wishlist" | "account" | "cart"
  >("homepage");
  const [previewBooks, setPreviewBooks] = useState<any[]>([]);
  const [previewBookSlug, setPreviewBookSlug] = useState<string>("");
  const [previewPageSlug, setPreviewPageSlug] = useState<string>("");
  const [previewCollectionSlug, setPreviewCollectionSlug] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("settings");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settingsSearch, setSettingsSearch] = useState("");
  const [pages, setPages] = useState<any[]>([]);
  const [syncPreview, setSyncPreview] = useState(true);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  // "unsaved" | "draft" | "published"
  const [saveStatus, setSaveStatus] = useState<"unsaved" | "draft" | "published">("published");
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Version History (up to 20 named snapshots) ──
  const [versionHistory, setVersionHistory] = useState<VersionEntry[]>([]);
  const [previewingVersion, setPreviewingVersion] = useState<string | null>(null);
  // When previewing a past version, send IT to the iframe instead of live design
  const previewDesign = previewingVersion
    ? versionHistory.find((v) => v.id === previewingVersion)?.design ?? design
    : design;

  // ── Undo / Redo via Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        // undo
        setPastDesigns((prev) => {
          if (prev.length === 0) return prev;
          const previous = prev[prev.length - 1];
          setFutureDesigns((fut) => [design, ...fut].slice(0, 75));
          setDesign(previous);
          setSaveStatus("unsaved");
          return prev.slice(0, -1);
        });
      } else if ((e.key === "y") || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        // redo
        setFutureDesigns((fut) => {
          if (fut.length === 0) return fut;
          const [next, ...rest] = fut;
          setPastDesigns((prev) => [...prev.slice(-74), design]);
          setDesign(next);
          setSaveStatus("unsaved");
          return rest;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [design]);

  // ── Warn before exit if unsaved changes ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveStatus]);

  // ── Auto-save draft every 30 seconds when there are unsaved changes ──
  useEffect(() => {
    if (saveStatus !== "unsaved") return;
    const timer = setInterval(async () => {
      try {
        await onSave(design, { publish: false });
        setSavedDesign(design);
        setSaveStatus("draft");
        setLastAutoSave(new Date());
      } catch (_) {}
    }, 30_000);
    return () => clearInterval(timer);
  }, [saveStatus, design, onSave]);

  // Sync design to preview iframe — debounced to keep typing responsive
  const syncPending = useRef(false);
  useEffect(() => {
    if (!iframeRef.current) return;
    syncPending.current = true;
    const targetOrigin = window.location.origin;

    const send = () => {
      const update = { type: "THEME_UPDATE", design };
      try {
        iframeRef.current?.contentWindow?.postMessage(update, targetOrigin);
      } catch (_) {}
      
      // Cross-tab broadcast
      try {
        const bc = new BroadcastChannel("site_preview_updates");
        bc.postMessage(update);
        bc.close();
      } catch (_) {}
    };

    const timeout = setTimeout(send, 120);

    return () => {
      clearTimeout(timeout);
      syncPending.current = false;
    };
  }, [design]);

  // Listen for preview ready + SECTION_SELECT messages from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "PREVIEW_READY") {
        setIsPreviewReady(true);
        syncPending.current = false;
        try {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "THEME_UPDATE", design },
            window.location.origin
          );
        } catch (_) {}
      }
      // Click-to-select: iframe posts SECTION_SELECT with a sectionId
      if (event.data?.type === "SECTION_SELECT" && event.data?.sectionId) {
        const sectionId = event.data.sectionId;
        setActiveTab("settings");
        setActiveSection(sectionId);
      }
      // Inline text editing: iframe double-click posts TEXT_EDIT with {field, value}
      if (event.data?.type === "TEXT_EDIT" && event.data?.sectionId && event.data?.settingKey) {
        const sectionId = event.data.sectionId as string;
        const settingKey = event.data.settingKey as string;
        const value = event.data.value;
        const sections = (design?.[designSurface]?.sections || design?.[designSurface]?.homepageSections || []) as any[];
        const updated = sections.map((s: any) =>
          s.id === sectionId ? { ...s, settings: { ...(s.settings || {}), [settingKey]: value } } : s
        );
        update("sections", updated);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [design]);

  useEffect(() => {
    adminApi.getPages().then((ps: any[]) => {
      setPages(ps);
      const firstPublished = ps.find((p: any) => p.status === "published" && p.slug) || ps.find((p: any) => p.slug);
      if (firstPublished && !previewPageSlug) setPreviewPageSlug(firstPublished.slug);
    });
    adminApi.getBooks().then((books: any[]) => {
      const published = books.filter((b: any) => b.status === "published" || !b.status);
      setPreviewBooks(published);
      if (published.length > 0 && !previewBookSlug) {
        const first = published[0];
        setPreviewBookSlug(first.slug || (first.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      }
    });
  }, []);

  // Derive collections (slug + name) from design categories so the user can preview each.
  const previewCollections = useMemo(() => {
    const slugify = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const cats = (design?.heroPage?.categories || design?.storefront?.categories || design?.categories || []) as any[];
    const list = cats
      .map((c: any) => (typeof c === "string" ? c : c?.name))
      .filter((name: any): name is string => typeof name === "string" && name.length > 0)
      .map((name: string) => ({ name, slug: slugify(name) }));
    return list.length > 0 ? list : [{ name: "Publications", slug: "publications" }];
  }, [design]);

  useEffect(() => {
    if (!previewCollectionSlug && previewCollections.length > 0) {
      setPreviewCollectionSlug(previewCollections[0].slug);
    }
  }, [previewCollections, previewCollectionSlug]);

  useEffect(() => {
    if (!syncPreview || !activeSection) return;
    // Sections that should preview the hero/homepage
    const heroSections = new Set(["homepage", "style", "navigation", "textsize"]);
    if (heroSections.has(activeSection)) {
      setDesignSurface("heroPage");
      setPreviewMode("homepage");
      return;
    }
    // Products section → switch to product page preview if a book is selected
    if (activeSection === "products" && previewBookSlug) {
      setDesignSurface("storefront");
      setPreviewMode("product");
      return;
    }
    // Everything else previews the storefront/shop
    setDesignSurface("storefront");
    setPreviewMode("shop");
  }, [activeSection, syncPreview]);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const hasChanges = JSON.stringify(design) !== JSON.stringify(savedDesign);
  const activeDesign = design?.[designSurface] || {};

  // Update a single design key
  const update = useCallback((key: string, value: any, isGlobal = false) => {
    setDesign((prev: any) => {
      const nextDesign = isGlobal ? {
        ...prev,
        [key]: value
      } : {
        ...prev,
        [designSurface]: {
          ...(prev?.[designSurface] || {}),
          [key]: value,
        },
      };
      
      // Update history
      setPastDesigns((prevHistory) => [...prevHistory.slice(-74), prev]);
      setFutureDesigns([]);
      
      return nextDesign;
    });
    setSaved(false);
    setSaveStatus("unsaved");
  }, [designSurface]);

  const undo = () => {
    if (pastDesigns.length === 0) return;
    const previous = pastDesigns[pastDesigns.length - 1];
    setPastDesigns((prev) => prev.slice(0, -1));
    setFutureDesigns((next) => [design, ...next].slice(0, 75));
    setDesign(previous);
    setSaved(false);
  };

  const redo = () => {
    if (futureDesigns.length === 0) return;
    const [next, ...rest] = futureDesigns;
    setFutureDesigns(rest);
    setPastDesigns((prev) => [...prev.slice(-74), design]);
    setDesign(next);
    setSaved(false);
  };

  const handleSave = async (options: { publish?: boolean } = {}) => {
    if (options.publish) setSaving(true);
    else setSavingDraft(true);
    
    try {
      await onSave(design, options);
      setSavedDesign(design);

      // ── Create a named version snapshot ──
      const now = new Date();
      const label = options.publish
        ? `Published ${now.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : `Draft ${now.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      setVersionHistory((prev) => [
        { id: crypto.randomUUID(), label, timestamp: now, design: JSON.parse(JSON.stringify(design)) },
        ...prev,
      ].slice(0, 20));

      if (options.publish) {
        setPastDesigns([]);
        setFutureDesigns([]);
        setSaveStatus("published");
      } else {
        setSaveStatus("draft");
        setLastAutoSave(new Date());
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Error saving design");
    } finally {
      setSaving(false);
      setSavingDraft(false);
    }
  };

  // Which preview pages each section belongs to.
  // "both" means it appears for homepage AND shop tabs.
  const SECTIONS = [
    {
      id: "style",
      icon: <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />,
      title: "Style",
      description: "Fonts, color palettes and visual identity",
      pages: ["both"],
    },
    {
      id: "navigation",
      icon: <LayoutTemplate size={14} />,
      title: "Navigation and layout",
      description: "Manage header, footer, main menus and general layout",
      pages: ["both"],
    },
    {
      id: "homepage",
      icon: <Home size={14} />,
      title: "Homepage",
      description: "Manage homepage options and layout",
      pages: ["homepage"],
    },
    {
      id: "products",
      icon: <ShoppingBag size={14} />,
      title: "Products",
      description: "Manage product and product page options",
      pages: ["shop"],
    },
    {
      id: "layout",
      icon: <LayoutTemplate size={14} />,
      title: "Layout controls",
      description: "Fine tune spacing, widths, border radius and product columns",
      pages: ["shop"],
    },
    {
      id: "buttons",
      icon: <div className="w-4 h-2 rounded-full bg-neutral-400" />,
      title: "Buttons and CTA",
      description: "Control button style, shape and emphasis",
      pages: ["both"],
    },
    {
      id: "announcements",
      icon: <div className="w-4 h-1.5 rounded bg-neutral-400" />,
      title: "Shop announcements",
      description: "Customise messages on announcement banners",
      pages: ["shop"],
    },
    {
      id: "social",
      icon: <Instagram size={14} />,
      title: "Social media links",
      description: "Manage social links that display in the shop footer",
      pages: ["both"],
    },
    {
      id: "textsize",
      icon: (
        <div className="flex items-end gap-0.5">
          <div className="w-1 h-2 bg-neutral-400 rounded" />
          <div className="w-1 h-3 bg-neutral-400 rounded" />
          <div className="w-1 h-4 bg-neutral-400 rounded" />
        </div>
      ),
      title: "Text sizing",
      description: "Manage text size options",
      pages: ["both"],
    },
    {
      id: "translations",
      icon: <Globe size={14} />,
      title: "Text and translations",
      description: "Customise system text like buttons and navigation labels",
      pages: ["both"],
    },
    {
      id: "additional",
      icon: <Settings size={14} />,
      title: "Additional settings",
      description: "Manage additional template settings such as animations",
      pages: ["both"],
    },
    {
      id: "colorSchemes",
      icon: <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-400 via-pink-400 to-amber-400" />,
      title: "Color schemes",
      description: "Define palettes that any section can apply",
      pages: ["both"],
    },
  ];

  const filteredSections = useMemo(() => {
    const q = settingsSearch.trim().toLowerCase();
    // When searching, show all matching sections across both contexts
    if (q) {
      return SECTIONS.filter((section) =>
        section.title.toLowerCase().includes(q) ||
        section.description.toLowerCase().includes(q),
      );
    }
    // When not searching, filter by the active preview mode
    return SECTIONS.filter((section) =>
      section.pages.includes("both") || section.pages.includes(previewMode),
    );
  }, [SECTIONS, settingsSearch, previewMode]);

  const renderSubPanel = () => {
    switch (activeSection) {
      case "style":         return <StylePanel design={activeDesign} update={update} />;
      case "navigation":    return <NavigationPanel design={activeDesign} update={update} setActiveTab={setActiveTab} setActiveSection={setActiveSection} />;
      case "homepage":      return <HomepagePanel design={activeDesign} update={update} colorSchemes={design.colorSchemes || DEFAULT_COLOR_SCHEMES} />;
      case "products":      return <ProductsPanel design={activeDesign} update={update} />;
      case "layout":        return <LayoutPanel design={activeDesign} update={update} />;
      case "buttons":       return <ButtonsPanel design={activeDesign} update={update} />;
      case "announcements": return <AnnouncementsPanel design={activeDesign} update={update} />;
      case "social":        return <SocialPanel design={activeDesign} update={update} />;
      case "textsize":      return <TextSizingPanel design={activeDesign} update={update} />;
      case "translations":  return <TranslationsPanel design={activeDesign} update={update} />;
      case "additional":    return <AdditionalPanel design={activeDesign} update={update} />;
      case "colorSchemes":  return (
        <ColorSchemesPanel
          schemes={(design.colorSchemes && design.colorSchemes.length > 0) ? design.colorSchemes : DEFAULT_COLOR_SCHEMES}
          onChange={(next: ColorScheme[]) => update("colorSchemes", next, true)}
        />
      );
      default:              return null;
    }
  };

  const renderPagesPanel = () => {
    return <PagesPanel pages={pages} setPages={setPages} design={design} update={update} />;
  };

  const currentSectionTitle = SECTIONS.find(s => s.id === activeSection)?.title || "";

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#050506] text-white overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* ── Top bar ── */}
      <div className="h-20 bg-black/40 backdrop-blur-3xl flex items-center justify-between px-8 flex-shrink-0 border-b border-white/5 z-50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-[0.4em] text-violet-400 uppercase italic">Architectural Core</span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-black tracking-tighter text-white uppercase italic">Theme Editor</span>
              {/* Save status badge */}
              <span className={`flex items-center gap-1.5 text-[8px] font-black tracking-widest px-3 py-1 rounded-full border uppercase italic transition-all ${
                saveStatus === "unsaved"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : saveStatus === "draft"
                  ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  saveStatus === "unsaved" ? "bg-amber-400 animate-pulse" :
                  saveStatus === "draft" ? "bg-sky-400" : "bg-emerald-400"
                }`} />
                {saveStatus === "unsaved" ? "Unsaved" : saveStatus === "draft" ? "Draft" : "Live"}
              </span>
              {lastAutoSave && saveStatus === "draft" && (
                <span className="text-[8px] text-slate-600 font-bold italic tracking-wider">
                  Auto-saved {lastAutoSave.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
          
          <div className="h-8 w-px bg-white/10 mx-2" />
          
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={pastDesigns.length === 0}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all disabled:opacity-10"
              title={`Undo (${pastDesigns.length} steps) — Ctrl+Z`}
            >
              <ChevronLeft size={18} strokeWidth={3} />
            </button>
            <button
              onClick={redo}
              disabled={futureDesigns.length === 0}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all disabled:opacity-10"
              title={`Redo (${futureDesigns.length} steps) — Ctrl+Y`}
            >
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>

          {/* Theme import / export */}
          <ThemeIOButtons
            design={design}
            onImport={(next) => {
              setPastDesigns((prev) => [...prev.slice(-74), design]);
              setFutureDesigns([]);
              setDesign(next);
              setSaveStatus("unsaved");
            }}
          />

          <button
            onClick={() => setSyncPreview((prev) => !prev)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase border transition-all flex items-center gap-2 italic ${
              syncPreview 
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]" 
                : "bg-white/5 text-slate-500 border-white/5"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${syncPreview ? "bg-cyan-400 animate-pulse" : "bg-slate-700"}`} />
            Live Sync: {syncPreview ? "ACTIVE" : "PAUSED"}
          </button>
        </div>

        {/* Device switcher */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-2xl p-1.5 backdrop-blur-xl shadow-2xl">
          {(["desktop", "tablet", "mobile"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all relative group/btn ${
                device === d
                  ? "bg-white/10 text-white shadow-inner border border-white/10"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {d === "desktop" ? <Monitor size={14} strokeWidth={2.5} /> : d === "tablet" ? <Tablet size={14} strokeWidth={2.5} /> : <Smartphone size={14} strokeWidth={2.5} />}
              <span className="text-[9px] font-black uppercase tracking-widest italic">{d}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <a
            href={(() => {
              const basePath = window.location.pathname.replace(/\/admin\/?.*$/, "").replace(/\/$/, "");
              return window.location.origin + basePath + "/?preview=true";
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest italic px-4 group"
          >
            <Eye size={14} className="group-hover:scale-110 transition-transform" /> 
            Live View
          </a>

          <div className="h-8 w-px bg-white/10 mx-2" />

          <button
            onClick={onExit}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-red-500/20 hover:border-red-500/20 transition-all"
            title="Exit Editor"
          >
            <X size={20} strokeWidth={3} />
          </button>
          
          <button
            onClick={() => handleSave({ publish: false })}
            disabled={saving || savingDraft || !hasChanges}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border italic ${
              !hasChanges 
                ? "opacity-20 cursor-not-allowed border-white/5 text-slate-500" 
                : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 active:scale-95 shadow-xl"
            }`}
          >
            {savingDraft ? "Archiving..." : "Save Draft"}
          </button>

          <button
            onClick={() => setShowPublishModal(true)}
            disabled={saving || savingDraft}
            className={`flex items-center gap-3 px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all italic relative overflow-hidden group/pub ${
              saved
                ? "bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-[0_0_40px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 active:translate-y-0 shadow-2xl"
            }`}
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/pub:opacity-100 transition-opacity pointer-events-none" />
            {saved ? <><Check size={14} strokeWidth={4} /> PUBLISHED</> : saving ? "EMITTING..." : "PUBLISH TO LIVE"}
          </button>
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      <AnimatePresence>
        {showPublishModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#0c0c0e] border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(124,58,237,0.2)] w-full max-w-lg overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-600/10 pointer-events-none" />
              <div className="p-16 text-center relative z-10">
                <div className="w-24 h-24 bg-violet-600/10 border border-violet-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-violet-400 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                  <Globe size={40} strokeWidth={2.5} />
                </div>
                <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-4">Deploy Changes?</h3>
                <p className="text-slate-400 text-[14px] leading-relaxed mb-12 max-w-sm mx-auto font-medium">
                  The current design protocol will be synchronized with the live storefront edge nodes.
                </p>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={async () => {
                      setShowPublishModal(false);
                      await handleSave({ publish: true });
                    }}
                    className="w-full bg-white text-black py-5 rounded-2xl text-[12px] font-black tracking-[0.3em] uppercase italic hover:bg-slate-200 transition-all active:scale-[0.98] shadow-2xl"
                  >
                    Confirm Deployment
                  </button>
                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="w-full py-5 text-[11px] font-black text-slate-500 tracking-[0.3em] uppercase italic hover:text-white transition-colors"
                  >
                    Abort Sequence
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Left sidebar ── */}
        <div className="w-[380px] bg-black/20 backdrop-blur-3xl flex flex-col border-r border-white/5 flex-shrink-0 z-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          {/* Tab nav */}
          <div className="flex border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-10">
            {(
              [
                { id: "settings",   icon: <Settings size={14} />,       label: "Config" },
                { id: "pages",      icon: <FileText size={14} />,        label: "Pages" },
                { id: "code",       icon: <Code2 size={14} />,           label: "Source" },
                { id: "templates",  icon: <LayoutTemplate size={14} />,  label: "Library" },
                { id: "history",    icon: <Clock size={14} />,           label: "History" },
                { id: "responsive", icon: <Smartphone size={14} />,      label: "Breaks" },
                { id: "seo",        icon: <Globe size={14} />,           label: "SEO" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setActiveSection(null); }}
                className={`flex-1 flex flex-col items-center gap-2 py-5 text-[9px] font-black tracking-[0.2em] uppercase transition-all relative italic ${
                  activeTab === tab.id
                    ? "text-violet-400"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                <div className={`transition-transform duration-500 ${activeTab === tab.id ? "scale-110" : "scale-100"}`}>
                  {tab.icon}
                </div>
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-violet-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]" 
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 flex flex-col overflow-hidden relative z-10">
            <AnimatePresence mode="wait">
              {activeTab === "settings" ? (
                <motion.div
                  key={activeSection || "__list__"}
                  initial={{ opacity: 0, x: activeSection ? 20 : -20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: activeSection ? -20 : 20, filter: "blur(10px)" }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {activeSection ? (
                    <>
                      <SubPanelHeader title={currentSectionTitle} onBack={() => setActiveSection(null)} />
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        {renderSubPanel()}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {/* Options header */}
                      <div className="p-8 pb-4">
                        <span className="text-[10px] font-black tracking-[0.4em] text-violet-500 uppercase italic mb-2 block">System Configuration</span>
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Core Settings</h2>

                        {/* Page template pills — Shopify-style template selector */}
                        {!settingsSearch && (
                          <div className="mb-4">
                            <p className="text-[8px] font-black tracking-[0.3em] text-slate-600 uppercase italic mb-2">Editing template</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {PAGE_TEMPLATES.map((tpl) => {
                                const active = designSurface === tpl.id;
                                return (
                                  <button
                                    key={tpl.id}
                                    onClick={() => {
                                      setDesignSurface(tpl.id as any);
                                      setPreviewMode(tpl.previewMode);
                                    }}
                                    title={tpl.description}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase transition-all border ${
                                      active
                                        ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                                        : "bg-white/[0.03] text-slate-600 border-white/5 hover:text-slate-400 hover:border-white/10"
                                    }`}
                                  >
                                    {tpl.label}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[8px] text-slate-700 font-black tracking-widest mt-3">
                              {filteredSections.length} settings
                            </p>
                          </div>
                        )}

                        <div className="relative group/search">
                          <input
                            value={settingsSearch}
                            onChange={(e) => setSettingsSearch(e.target.value)}
                            placeholder="QUERY SYSTEM PARAMETERS..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black text-white outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-800 tracking-widest italic"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within/search:text-violet-500/50 transition-colors">
                            <Settings size={16} className="animate-[spin_10s_linear_infinite]" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 px-2">
                        {filteredSections.map((section) => (
                          <SectionRow
                            key={section.id}
                            icon={section.icon}
                            title={section.title}
                            description={section.description}
                            onClick={() => setActiveSection(section.id)}
                          />
                        ))}
                      </div>
                      
                      {filteredSections.length === 0 && (
                        <div className="p-12 text-center">
                          <p className="text-[10px] font-black text-slate-700 tracking-[0.3em] uppercase italic italic">Null Result: Parameter mismatch</p>
                        </div>
                      )}
                      
                      {/* Click-to-select tip */}
                      <div className="mx-8 mt-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
                        <MousePointer2 size={14} className="text-violet-400 flex-shrink-0" strokeWidth={2.5} />
                        <p className="text-[9px] text-slate-500 font-bold leading-relaxed italic">
                          Click any element in the preview to jump directly to its settings
                        </p>
                      </div>

                      <div className="p-8 mt-4">
                        <div className="p-6 bg-violet-600/5 border border-violet-500/10 rounded-[2rem] relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                             <RefreshCw size={40} className="rotate-12" />
                           </div>
                           <h4 className="text-[11px] font-black text-violet-400 uppercase tracking-widest italic mb-2">Editor Protocol</h4>
                           <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
                             All changes mirror to the live buffer. Use <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-violet-400 font-mono">Ctrl+Z</kbd> to undo, <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-violet-400 font-mono">Ctrl+Y</kbd> to redo.
                           </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : activeTab === "pages" ? (
                <motion.div
                  key="pages"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="p-8 pb-4">
                    <span className="text-[10px] font-black tracking-[0.4em] text-cyan-500 uppercase italic mb-2 block">Content Structure</span>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Site Architecture</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {renderPagesPanel()}
                  </div>
                </motion.div>
              ) : activeTab === "code" ? (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="p-8 pb-4">
                    <span className="text-[10px] font-black tracking-[0.4em] text-violet-500 uppercase italic mb-2 block">Developer Mode</span>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Source Injection</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <CodePanel design={activeDesign} update={update} />
                  </div>
                </motion.div>
              ) : activeTab === "history" ? (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="p-8 pb-4">
                    <span className="text-[10px] font-black tracking-[0.4em] text-amber-500 uppercase italic mb-2 block">Temporal Archive</span>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Version History</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <VersionHistoryPanel
                      versions={versionHistory}
                      currentDesign={design}
                      previewingVersion={previewingVersion}
                      onPreview={(v) => setPreviewingVersion(v?.id ?? null)}
                      onRestore={(v) => {
                        const restoreIndex = versionHistory.findIndex((entry) => entry.id === v.id);
                        setDesign(v.design);
                        setPastDesigns([]);
                        setFutureDesigns([]);
                        if (restoreIndex >= 0) {
                          setVersionHistory((prev) => prev.slice(restoreIndex));
                        }
                        setSaveStatus("unsaved");
                        setPreviewingVersion(null);
                      }}
                    />
                  </div>
                </motion.div>
              ) : activeTab === "responsive" ? (
                <motion.div
                  key="responsive"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="p-8 pb-4">
                    <span className="text-[10px] font-black tracking-[0.4em] text-blue-500 uppercase italic mb-2 block">Adaptive Layout</span>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Breakpoints</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <ResponsivePanel design={activeDesign} update={update} device={device} />
                  </div>
                </motion.div>
              ) : activeTab === "seo" ? (
                <motion.div
                  key="seo"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="p-8 pb-4">
                    <span className="text-[10px] font-black tracking-[0.4em] text-emerald-500 uppercase italic mb-2 block">Search Engine</span>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">SEO & Metadata</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <SeoPanel design={activeDesign} update={update} previewMode={previewMode} />
                  </div>
                </motion.div>
              ) : activeTab === "templates" ? (
                <motion.div
                  key="templates"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="p-8 pb-4">
                    <span className="text-[10px] font-black tracking-[0.4em] text-fuchsia-500 uppercase italic mb-2 block">Design System</span>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Theme Library</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <ThemeLibraryPanel design={activeDesign} update={update} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex-1 flex items-center justify-center p-12 text-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-500/20 blur-[60px] rounded-full animate-pulse" />
                    <div className="relative z-10">
                      <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 text-slate-700 rotate-12 hover:rotate-0 transition-transform duration-700">
                        {activeTab === "templates" && <LayoutTemplate size={40} />}
                      </div>
                      <p className="text-[12px] font-black text-white tracking-[0.4em] uppercase italic mb-3">{activeTab} Module</p>
                      <p className="text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase italic">Awaiting Integration Link</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right preview pane ── */}
        <div className="flex-1 bg-[#0a0a0c] relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.05),transparent_60%)] pointer-events-none" />
          <LivePreview
            design={previewDesign}
            device={device}
            previewMode={{
              value: previewMode,
              set: (m: typeof previewMode) => { setPreviewMode(m); setIsPreviewReady(false); },
              books: previewBooks,
              bookSlug: previewBookSlug,
              setBookSlug: (s: string) => { setPreviewBookSlug(s); setIsPreviewReady(false); },
              pages: pages.filter((p: any) => p.slug),
              pageSlug: previewPageSlug,
              setPageSlug: (s: string) => { setPreviewPageSlug(s); setIsPreviewReady(false); },
              collections: previewCollections,
              collectionSlug: previewCollectionSlug,
              setCollectionSlug: (s: string) => { setPreviewCollectionSlug(s); setIsPreviewReady(false); },
            }}
            previewBookSlug={previewBookSlug}
            iframeRef={iframeRef}
          />
        </div>
      </div>
    </div>
  );
}

function SidebarAssetUpload({ value, onChange, label, type }: any) {
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await adminApi.uploadBrandAsset(file, type);
      onChange(url);
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white/[0.03] rounded-3xl p-5 border border-white/10 space-y-5 backdrop-blur-3xl transition-all hover:bg-white/[0.05] relative overflow-hidden group/upload">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
      
      {value && (
        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black/40 group relative shadow-2xl">
          <img src={value} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <button 
              onClick={(e) => { e.preventDefault(); onChange(""); }} 
              className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 backdrop-blur-xl border border-red-500/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform hover:rotate-90"
            >
              <X size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 relative z-10">
        <div className="relative group">
          <input 
            value={value || ""} 
            onChange={(e) => onChange(e.target.value)}
            placeholder="Asset URL..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-[10px] text-white outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-800 font-black tracking-widest uppercase italic"
          />
        </div>
        
        <div className="relative">
          <input 
            type="file" 
            id={`asset-${type}`} 
            className="hidden" 
            accept="image/*" 
            onChange={handleUpload}
          />
          <label 
            htmlFor={`asset-${type}`}
            className="flex items-center justify-center gap-3 w-full py-5 bg-white/[0.05] border border-white/10 rounded-[2rem] text-[10px] font-black cursor-pointer hover:bg-white/10 hover:border-violet-500/30 transition-all uppercase tracking-[0.25em] italic text-slate-400 hover:text-white shadow-xl group-active/upload:scale-[0.98]"
          >
            {uploading ? (
              <RefreshCw size={16} className="animate-spin text-violet-400" strokeWidth={3} />
            ) : (
              <Plus size={16} className="text-violet-500" strokeWidth={3} />
            )}
            {uploading ? "ARCHIVING ASSET..." : label}
          </label>
        </div>
      </div>
    </div>
  );
}
