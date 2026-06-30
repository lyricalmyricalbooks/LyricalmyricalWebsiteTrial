import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { InsertionDropZone, SortableRow, SortableList, useListSensors } from "./dndSortable";
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
  HelpCircle,
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
  Wand2,
  ShieldCheck,
  Braces,
  Command as CommandIcon,
  GitCompare,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { adminApi } from "./api";
import { CATEGORIES } from "../features/site/constants";
import { COPY_SCHEMA } from "../features/site/storeCopy";
import { MENU_LINK_TYPES, slugify, newMenuItem, type MenuItem } from "../features/site/storeMenu";
import {
  getSectionMeta,
  getSectionFields,
  getBlockFields,
  getBlocksKey,
  NewSectionLibraryModal,
  BlocksEditor,
  SectionSettingsPanel,
  SectionFieldEditor,
  ColorSchemesPanel,
  DEFAULT_COLOR_SCHEMES,
  ThemeIOButtons,
  PAGE_TEMPLATES,
  type ColorScheme,
  type SectionPreset,
} from "./ThemeEditorExtensions";
import {
  FontBrowserModal,
  TypeScaleDesigner,
  GlobalSectionsPanel,
  ABLayoutSwitcher,
  HOME_LAYOUT_TEMPLATES,
  buildTemplateSections,
  copySectionToClipboard,
  readSectionClipboard,
} from "./ThemeEditorBuilder";
import {
  PaletteLabPanel,
  AccessibilityAuditPanel,
  DesignTokensPanel,
  FontPairingsGrid,
  CommandPalette,
  surpriseMe,
  normalizeHexForColorInput,
  type CommandAction,
} from "./ThemeEditorPro";
import { Tablet } from "lucide-react";
import toast from "react-hot-toast";

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
  { id: "lyrical-photo-reference", name: "Lyrical Photo Reference", mood: "Black reference storefront with oversized masthead, ruled nav and three-column book grid", palettePreset: "cyber", font: "Inter", fontSize: "lg", cornerStyle: "sharp", buttonStyle: "outline", animationLevel: "minimal", productCardStyle: "editorial", productHoverEffect: "zoom", imageAspectRatio: "1:1", productImageLayout: "grid", productContentPosition: "right", productColumnsDesktop: 3, productColumnsMobile: 1, cardRadius: 0, productCTA: "VIEW", catalogLayoutStyle: "reference", catalogMastheadText: "Lyricalmyrical Books", catalogHeaderWidth: 1180, catalogHeaderRuleWidth: 4, catalogGridGap: 18, catalogTitleTransform: "none", catalogImageFit: "cover", showAnnouncement: false, showCatalogControls: false, showCollectionMeta: false, referenceCategoryLimit: 1, catalogCartPlacement: "top-right", catalogMastheadDesktop: 58, catalogMastheadMobile: 38, catalogNavGapDesktop: 40, catalogNavGapMobile: 18, catalogImageFocalX: 50, catalogImageFocalY: 50, headerBg: "#000000", headerColor: "#ffffff", borderColor: "#B1B1AA" },
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
  { id: "luxe-dark-commerce", name: "Luxe Dark Commerce", mood: "Shopify Horizon-inspired dark aesthetic with editorial serif drama", palettePreset: "dark", font: "Cormorant", fontSize: "lg", cornerStyle: "sharp", buttonStyle: "outline", animationLevel: "moderate", productCardStyle: "editorial", productHoverEffect: "lift", imageAspectRatio: "2:3", productImageLayout: "stacked", productContentPosition: "left", productColumnsDesktop: 3, productColumnsMobile: 1, cardRadius: 0, productCTA: "DISCOVER" },
  { id: "conversion-engine", name: "Conversion Engine", mood: "High-converting DTC storefront optimised for speed and add-to-cart", palettePreset: "light", font: "Inter", fontSize: "md", cornerStyle: "rounded", buttonStyle: "solid", animationLevel: "minimal", productCardStyle: "card", productHoverEffect: "zoom", imageAspectRatio: "1:1", productImageLayout: "grid", productContentPosition: "right", productColumnsDesktop: 4, productColumnsMobile: 2, cardRadius: 8, productCTA: "ADD TO CART" },
  { id: "artisan-market", name: "Artisan Market", mood: "Handmade craft aesthetic with warm tactile energy", palettePreset: "warm", font: "Fraunces", fontSize: "md", cornerStyle: "rounded", buttonStyle: "soft", animationLevel: "moderate", productCardStyle: "card", productHoverEffect: "lift", imageAspectRatio: "3:4", productImageLayout: "grid", productContentPosition: "right", productColumnsDesktop: 3, productColumnsMobile: 2, cardRadius: 4, productCTA: "SHOP HANDMADE" },
  { id: "tech-minimal", name: "Tech Minimal", mood: "Clean SaaS-inspired product store with sharp precision", palettePreset: "minimal", font: "DM Sans", fontSize: "sm", cornerStyle: "sharp", buttonStyle: "solid", animationLevel: "minimal", productCardStyle: "minimal", productHoverEffect: "none", imageAspectRatio: "1:1", productImageLayout: "grid", productContentPosition: "right", productColumnsDesktop: 5, productColumnsMobile: 2, cardRadius: 2, productCTA: "BUY NOW" },
  { id: "coastal-living", name: "Coastal Living", mood: "Airy lifestyle and home goods aesthetic with calm coastal warmth", palettePreset: "nord", font: "Lora", fontSize: "md", cornerStyle: "rounded", buttonStyle: "soft", animationLevel: "moderate", productCardStyle: "editorial", productHoverEffect: "zoom", imageAspectRatio: "3:4", productImageLayout: "slider", productContentPosition: "right", productColumnsDesktop: 3, productColumnsMobile: 1, cardRadius: 12, productCTA: "EXPLORE" },
  { id: "urban-streetwear", name: "Urban Streetwear", mood: "Hypebeast energy with bold display type and high-impact drops", palettePreset: "cyber", font: "Bebas Neue", fontSize: "lg", cornerStyle: "sharp", buttonStyle: "solid", animationLevel: "high", productCardStyle: "card", productHoverEffect: "zoom", imageAspectRatio: "2:3", productImageLayout: "grid", productContentPosition: "left", productColumnsDesktop: 4, productColumnsMobile: 2, cardRadius: 0, productCTA: "COP IT" },
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
  [
    "catalogLayoutStyle",
    "catalogMastheadText",
    "catalogHeaderWidth",
    "catalogHeaderRuleWidth",
    "catalogGridGap",
    "catalogTitleTransform",
    "catalogImageFit",
    "showAnnouncement",
    "showCatalogControls",
    "showCollectionMeta",
    "referenceCategoryLimit",
    "catalogCartPlacement",
    "catalogMastheadDesktop",
    "catalogMastheadMobile",
    "catalogNavGapDesktop",
    "catalogNavGapMobile",
    "catalogImageFocalX",
    "catalogImageFocalY",
    "headerBg",
    "headerColor",
    "borderColor",
  ].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(theme, key)) update(key, theme[key]);
  });
  update("themeLibraryPreset", theme.id);
  toast.success(`Applied "${theme.name}" theme preset!`, { icon: "✨" });
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
  let clean = (hex || "").trim().toLowerCase();
  if (clean.startsWith("#")) clean = clean.slice(1);
  clean = clean.replace(/[^0-9a-f]/g, "");

  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  } else if (clean.length === 4) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  } else if (clean.length === 8) {
    clean = clean.slice(0, 6);
  }

  if (clean.length !== 6) return null;
  const int = parseInt(clean, 16);
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
    const clean = val.trim();
    if (/^#[0-9A-F]{3}$/i.test(clean) || /^#[0-9A-F]{4}$/i.test(clean) || /^#[0-9A-F]{6}$/i.test(clean) || /^#[0-9A-F]{8}$/i.test(clean)) {
      onChange(clean);
    }
  };

  const handleBlur = () => {
    const normalized = normalizeHexForColorInput(localValue);
    setLocalValue(normalized);
    onChange(normalized);
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
            value={normalizeHexForColorInput(value)}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer scale-150"
          />
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={handleBlur}
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
  const [showFontBrowser, setShowFontBrowser] = useState(false);
  const applyTheme = (themeId: string) => {
    const theme = THEME_LIBRARY.find((t) => t.id === themeId);
    if (!theme) return;
    applyThemePreset(update, theme);
  };
  const applyBrowsedFont = (font: string, target: "body" | "heading" | "both") => {
    if (target === "body" || target === "both") update("font", font);
    if (target === "heading" || target === "both") update("headingFont", font);
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

      <div className="border-b border-white/5 my-4" />

      <Accordion title="Typography">
        <div className="space-y-8">
          <button
            onClick={() => setShowFontBrowser(true)}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-2xl py-4 text-[10px] font-black text-violet-300 hover:text-white hover:border-violet-400/50 transition-all uppercase tracking-[0.25em] italic"
          >
            Browse 190+ Google Fonts
          </button>
          {showFontBrowser && (
            <FontBrowserModal
              onApply={(font, target) => {
                applyBrowsedFont(font, target);
                setShowFontBrowser(false);
              }}
              onClose={() => setShowFontBrowser(false)}
            />
          )}
          <div>
            <SidebarLabel>Body font</SidebarLabel>
            <FontSelector
              value={design.font || "Inter"}
              onChange={(val) => update("font", val)}
            />
          </div>
          <div>
            <SidebarLabel>Heading font</SidebarLabel>
            <FontSelector
              value={design.headingFont || design.font || "Inter"}
              onChange={(val) => update("headingFont", val)}
            />
            <p className="text-[9px] text-slate-600 font-bold mt-2 italic">
              Used for all headings. Defaults to the body font.
            </p>
          </div>
        </div>
      </Accordion>

      <Accordion title="Curated Font Pairings">
        <div className="space-y-4">
          <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
            Designer-matched heading and body combinations — apply both in one click.
          </p>
          <FontPairingsGrid design={design} update={update} />
        </div>
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

function ColorsPanel({ design, update, colorSchemes = [] }: { design: any; update: any; colorSchemes?: ColorScheme[] }) {
  const currentPalette = PALETTES.find(p => p.id === design.palettePreset) || PALETTES[0];
  const backgroundColor = design.backgroundColor || currentPalette.bg;
  const textColor = design.textColor || currentPalette.text;

  return (
    <div className="p-4 space-y-6 overflow-y-auto flex-1">
      <Accordion title="Color Palette Configuration" defaultOpen={true}>
        <div className="space-y-6">
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest italic mb-2">
            Global theme color configuration.
          </p>
          <ColorPicker 
            label="Primary accent" 
            value={design.primaryColor || "#A855F7"} 
            onChange={(val) => update("primaryColor", val)} 
          />
          <ColorPicker
            label="Header Background"
            value={design.headerBg || ""}
            onChange={(val) => update("headerBg", val)}
          />
          <ColorPicker
            label="Header Text & Links"
            value={design.headerColor || ""}
            onChange={(val) => update("headerColor", val)}
          />
          {(design.headerBg || design.headerColor) && (
            <button
              onClick={() => {
                update("headerBg", undefined);
                update("headerColor", undefined);
              }}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 text-[10px] font-bold text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-all uppercase tracking-wider mb-4"
            >
              Reset header to page defaults
            </button>
          )}
          <div className="border-t border-neutral-100 pt-4" />
          <ColorPicker
            label="Background"
            value={design.backgroundColor || "#000000"}
            onChange={(val) => update("backgroundColor", val)}
          />
          <ColorPicker
            label="Text"
            value={design.textColor || "#F9F9F9"}
            onChange={(val) => update("textColor", val)}
          />
          <ColorPicker
            label="Link hover"
            value={design.linkColorHover || "#F61515"}
            onChange={(val) => update("linkColorHover", val)}
          />
          <ColorPicker
            label="Border"
            value={design.borderColor || "#B1B1AA"}
            onChange={(val) => update("borderColor", val)}
          />
          <ColorPicker
            label="Button text"
            value={design.buttonTextColor || "#020202"}
            onChange={(val) => update("buttonTextColor", val)}
          />
          <ColorPicker
            label="Button background"
            value={design.buttonColor || "#FBFBFB"}
            onChange={(val) => update("buttonColor", val)}
          />
          <ColorPicker
            label="Button hover text"
            value={design.buttonHoverTextColor || "#FFFFFF"}
            onChange={(val) => update("buttonHoverTextColor", val)}
          />
          <ColorPicker
            label="Button hover background"
            value={design.buttonHoverBgColor || "#C1BBBB"}
            onChange={(val) => update("buttonHoverBgColor", val)}
          />
          <ColorPicker
            label="Badge text (primary)"
            value={design.badgeTextPrimary || "#000000"}
            onChange={(val) => update("badgeTextPrimary", val)}
          />
          <ColorPicker
            label="Badge background (primary)"
            value={design.badgeBgPrimary || "#F63737"}
            onChange={(val) => update("badgeBgPrimary", val)}
          />
          <ColorPicker
            label="Badge text (secondary)"
            value={design.badgeTextSecondary || "#000000"}
            onChange={(val) => update("badgeTextSecondary", val)}
          />
          <ColorPicker
            label="Badge background (secondary)"
            value={design.badgeBgSecondary || "#E0E0E0"}
            onChange={(val) => update("badgeBgSecondary", val)}
          />
          <ColorPicker
            label="Low Inventory messages"
            value={design.lowInventoryColor || "#056FFA"}
            onChange={(val) => update("lowInventoryColor", val)}
          />
          <ColorPicker
            label="Product title text"
            value={design.productTitleColor || ""}
            onChange={(val) => update("productTitleColor", val)}
          />
          <ColorPicker
            label="Product price text"
            value={design.productPriceColor || ""}
            onChange={(val) => update("productPriceColor", val)}
          />
          <ColorPicker
            label="Announcement banner text"
            value={design.announcementColor || "#221717"}
            onChange={(val) => update("announcementColor", val)}
          />
          <ColorPicker
            label="Announcement banner background"
            value={design.announcementBg || "#63BDEF"}
            onChange={(val) => update("announcementBg", val)}
          />
          <div className="pt-4" />
          <ContrastBadge background={backgroundColor} text={textColor} />
          <button
            onClick={() => {
              const currentPalette = PALETTES.find(p => p.id === design.palettePreset) || PALETTES[0];
              update("backgroundColor", currentPalette.bg);
              update("textColor", currentPalette.text);
            }}
            className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-5 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all uppercase tracking-[0.2em] italic mt-4"
          >
            Restore Palette Defaults
          </button>
        </div>
      </Accordion>

      <Accordion title="Surfaces & status colors" defaultOpen={false}>
        <div className="space-y-6">
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest italic mb-2">
            Surfaces, overlays and status colors used across the product page and
            storefront (cards, image wells, sale &amp; "added" states, wishlist, active tabs).
          </p>
          <ColorPicker
            label="Card / image surface"
            value={design.surfaceColor || "#0a0a0a"}
            onChange={(val) => update("surfaceColor", val)}
          />
          <ColorPicker
            label="Raised surface"
            value={design.surfaceRaisedColor || "#171717"}
            onChange={(val) => update("surfaceRaisedColor", val)}
          />
          <ColorPicker
            label="Overlay / scrim (sold-out, image darken)"
            value={design.overlayColor || "#000000"}
            onChange={(val) => update("overlayColor", val)}
          />
          <div className="border-t border-neutral-100 pt-4" />
          <ColorPicker
            label="Success / savings"
            value={design.successColor || "#34d399"}
            onChange={(val) => update("successColor", val)}
          />
          <ColorPicker
            label="Success text"
            value={design.successTextColor || "#ffffff"}
            onChange={(val) => update("successTextColor", val)}
          />
          <ColorPicker
            label="Favorite / wishlist"
            value={design.favoriteColor || "#fb7185"}
            onChange={(val) => update("favoriteColor", val)}
          />
          <ColorPicker
            label="Secondary accent"
            value={design.secondaryColor || "#22d3ee"}
            onChange={(val) => update("secondaryColor", val)}
          />
          <ColorPicker
            label="Warning"
            value={design.warningColor || "#f59e0b"}
            onChange={(val) => update("warningColor", val)}
          />
          <ColorPicker
            label="Danger / error"
            value={design.dangerColor || "#f43f5e"}
            onChange={(val) => update("dangerColor", val)}
          />
          <ColorPicker
            label="Muted / secondary text"
            value={design.mutedTextColor || "#94a3b8"}
            onChange={(val) => update("mutedTextColor", val)}
          />
          <div className="border-t border-neutral-100 pt-4" />
          <ColorPicker
            label="Active control background"
            value={design.activeControlBg || design.textColor || "#ffffff"}
            onChange={(val) => update("activeControlBg", val)}
          />
          <ColorPicker
            label="Active control text"
            value={design.activeControlText || design.backgroundColor || "#000000"}
            onChange={(val) => update("activeControlText", val)}
          />
          {(design.surfaceColor || design.surfaceRaisedColor || design.overlayColor ||
            design.successColor || design.successTextColor || design.favoriteColor ||
            design.secondaryColor || design.warningColor || design.dangerColor ||
            design.mutedTextColor || design.activeControlBg || design.activeControlText) && (
            <button
              onClick={() => {
                ["surfaceColor", "surfaceRaisedColor", "overlayColor", "successColor",
                 "successTextColor", "favoriteColor", "secondaryColor", "warningColor",
                 "dangerColor", "mutedTextColor", "activeControlBg", "activeControlText"]
                  .forEach((k) => update(k, undefined));
              }}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 text-[10px] font-bold text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-all uppercase tracking-wider"
            >
              Reset surfaces &amp; status to defaults
            </button>
          )}
        </div>
      </Accordion>

      <Accordion title="Checkout & Cart" defaultOpen={false}>
        <div className="space-y-6">
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest italic mb-2">
            Optional brand accent for the checkout page and cart drawer only —
            leave blank to inherit the main theme colors above.
          </p>
          <ColorPicker
            label="Checkout accent color"
            value={design.checkoutAccentColor || ""}
            onChange={(val) => update("checkoutAccentColor", val)}
          />
          {design.checkoutAccentColor && (
            <ContrastBadge background={design.checkoutAccentColor} text="#ffffff" />
          )}
          <ColorPicker
            label="Checkout background"
            value={design.checkoutBgColor || ""}
            onChange={(val) => update("checkoutBgColor", val)}
          />
          {design.checkoutBgColor && (
            <div className="space-y-2">
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic">
                vs. order confirmation text
              </p>
              <ContrastBadge background={design.checkoutBgColor} text="#ffffff" />
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic">
                vs. checkout form text
              </p>
              <ContrastBadge background={design.checkoutBgColor} text="#0f172a" />
            </div>
          )}
          <SidebarRange
            label="Checkout input corner radius"
            value={design.checkoutInputRadius ?? 8}
            min={0}
            max={24}
            step={1}
            suffix="px"
            onChange={(v: number) => update("checkoutInputRadius", v)}
          />
          {(design.checkoutAccentColor || design.checkoutBgColor || design.checkoutInputRadius != null) && (
            <button
              onClick={() => {
                update("checkoutAccentColor", undefined);
                update("checkoutBgColor", undefined);
                update("checkoutInputRadius", undefined);
              }}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 text-[10px] font-bold text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-all uppercase tracking-wider"
            >
              Reset checkout &amp; cart to main theme
            </button>
          )}
        </div>
      </Accordion>

      <Accordion title="Color Schemes" defaultOpen={false}>
        <div className="pt-2">
          <ColorSchemesPanel
            schemes={(colorSchemes && colorSchemes.length > 0) ? colorSchemes : DEFAULT_COLOR_SCHEMES}
            onChange={(next: ColorScheme[]) => update("colorSchemes", next, true)}
          />
        </div>
      </Accordion>

      <Accordion title="Color Palette Generator (Lab)" defaultOpen={false}>
        <div className="pt-2">
          <PaletteLabPanel design={design} update={update} />
        </div>
      </Accordion>
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

          <div className="pt-2 space-y-4 border-t border-white/5">
            <SidebarLabel>Logo Image</SidebarLabel>
            <SidebarAssetUpload
              value={design.logoUrl}
              onChange={(url: string) => update("logoUrl", url)}
              type="logo"
              label="Upload Logo"
            />
            <p className="text-[9px] text-slate-500 leading-relaxed">
              Upload your logo image. Leave empty to use the wordmark text below instead.
            </p>
          </div>

          <SidebarInput
            label="Wordmark Text"
            value={design.logoText ?? "F✶M"}
            onChange={(v: string) => update("logoText", v)}
            placeholder="F✶M"
          />

          <ColorPicker
            label="Logo Color"
            value={design.logoColor || ""}
            onChange={(val: string) => update("logoColor", val)}
          />

          <SidebarToggle
            label="Recolor Logo Image"
            description="Tint your uploaded logo with the Logo Color above. Best for single-color / transparent logos."
            checked={design.logoTint ?? false}
            onChange={(v: boolean) => update("logoTint", v)}
          />

          {(design.logoColor || design.logoText || design.logoTint) && (
            <button
              onClick={() => {
                update("logoColor", undefined);
                update("logoText", undefined);
                update("logoTint", undefined);
              }}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all uppercase tracking-wider"
            >
              Reset logo styling
            </button>
          )}

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

      <Accordion title="Nav Typography">
        <div className="space-y-6">
          <div>
            <SidebarLabel>Heading / logo label</SidebarLabel>
            <input
              value={design.navHeading || ""}
              onChange={(e) => update("navHeading", e.target.value || undefined)}
              placeholder="Store name or leave blank"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white outline-none focus:border-violet-500/50"
            />
          </div>
          <ColorPicker
            label="Nav link color"
            value={design.navLinkColor || "#ffffff"}
            onChange={(v) => update("navLinkColor", v)}
          />
          <SidebarRange
            label="Link size"
            value={design.navLinkSize ?? 13}
            min={8}
            max={22}
            suffix="px"
            onChange={(v: number) => update("navLinkSize", v)}
          />
          <div>
            <SidebarLabel>Link weight</SidebarLabel>
            <select
              value={design.navLinkWeight || ""}
              onChange={(e) => update("navLinkWeight", e.target.value || undefined)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white outline-none focus:border-violet-500/50"
            >
              <option value="">— Inherit —</option>
              <option value="300">300 · Light</option>
              <option value="400">400 · Regular</option>
              <option value="500">500 · Medium</option>
              <option value="600">600 · Semibold</option>
              <option value="700">700 · Bold</option>
              <option value="800">800 · Extrabold</option>
              <option value="900">900 · Black</option>
            </select>
          </div>
          <div>
            <SidebarLabel>Text transform</SidebarLabel>
            <select
              value={design.navLinkTransform || ""}
              onChange={(e) => update("navLinkTransform", e.target.value || undefined)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] text-white outline-none focus:border-violet-500/50"
            >
              <option value="">— Inherit —</option>
              <option value="none">None</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </div>
          <SidebarRange
            label="Letter spacing"
            value={Math.round((design.navLinkSpacing ?? 0) * 100)}
            min={-5}
            max={50}
            suffix=" (×0.01em)"
            onChange={(v: number) => update("navLinkSpacing", v / 100)}
          />
        </div>
      </Accordion>
    </div>
  );
}

function HomepagePanel({ design, update, colorSchemes = [], requestedSectionId, onConsumeRequest, sectionPresets = [], onSavePreset, onDeletePreset }: any) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<"content" | "design">("content");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  // The section type currently being dragged out of the library (for the overlay preview)
  const [dragLibType, setDragLibType] = useState<string | null>(null);
  // Existing section currently being dragged in the outline.
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  // Outline tree: which section's nested block list is expanded
  const [outlineId, setOutlineId] = useState<string | null>(null);
  const sections = design.sections || design.homepageSections || [];
  const blockTotal = sections.reduce((sum: number, section: any) => {
    const key = getBlocksKey(section.type);
    return sum + ((section.settings?.[key] || []).length || 0);
  }, 0);
  const sectionLimitWarning = sections.length >= 20;
  const sectionLimitExceeded = sections.length > 25;
  const sensors = useListSensors();

  // Click-to-edit: the preview can request a specific section instance be opened.
  useEffect(() => {
    if (requestedSectionId) {
      setActiveSectionId(requestedSectionId);
      onConsumeRequest?.();
    }
  }, [requestedSectionId]);

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

  // Insert a brand-new section at a specific index (drag-from-library drops here).
  const addSectionAt = (type: string, index: number) => {
    const id = crypto.randomUUID();
    const meta = getSectionMeta(type);
    const newSection = {
      id,
      type,
      visible: true,
      settings: JSON.parse(JSON.stringify(meta?.defaults || {})),
    };
    const next = [...sections];
    const clamped = Math.max(0, Math.min(index, next.length));
    next.splice(clamped, 0, newSection);
    updateSections(next);
    setActiveSectionId(id);
  };

  // Click-to-add from the library appends to the end (accessible fallback).
  const addSection = (type: string) => addSectionAt(type, sections.length);

  // Single drag handler for the section list — reorders existing sections AND
  // handles a section type dragged out of the library modal (id "lib:<type>").
  const handleSectionDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith("lib:")) setDragLibType(id.slice(4));
    else if (sections.some((s: any) => s.id === id)) setDragSectionId(id);
  };

  const handleSectionDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setDragLibType(null);
    setDragSectionId(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const dropMatch = overId.match(/^section-drop-(\d+)$/);
    if (activeId.startsWith("lib:")) {
      const type = activeId.slice(4);
      const overIndex = dropMatch ? Number(dropMatch[1]) : sections.findIndex((s: any) => s.id === overId);
      addSectionAt(type, Number.isFinite(overIndex) && overIndex >= 0 ? overIndex : sections.length);
      setShowLibrary(false);
      return;
    }
    if (dropMatch) {
      const oldIndex = sections.findIndex((s: any) => s.id === activeId);
      const slotIndex = Number(dropMatch[1]);
      if (oldIndex < 0 || !Number.isFinite(slotIndex)) return;
      const next = [...sections];
      const [moved] = next.splice(oldIndex, 1);
      const adjustedIndex = Math.max(0, Math.min(slotIndex > oldIndex ? slotIndex - 1 : slotIndex, next.length));
      if (adjustedIndex === oldIndex) return;
      next.splice(adjustedIndex, 0, moved);
      updateSections(next);
      return;
    }
    if (activeId === overId) return;
    const oldIndex = sections.findIndex((s: any) => s.id === activeId);
    const newIndex = sections.findIndex((s: any) => s.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    updateSections(arrayMove(sections, oldIndex, newIndex));
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
        {/* Header + Content/Design tabs */}
        <div className="border-b border-neutral-100 bg-white sticky top-0 z-20">
          <div className="px-4 pt-4 pb-2 flex items-center gap-3">
            <button
              onClick={() => { setActiveSectionId(null); setEditTab("content"); }}
              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold tracking-[0.2em] text-blue-600 uppercase mb-0.5">Editing section</p>
              <h3 className="text-[12px] font-black text-neutral-800 uppercase tracking-tight truncate">{section.settings?.title || section.type.replace("Section", "")}</h3>
            </div>
          </div>
          <div className="flex border-t border-neutral-100">
            {(["content", "design"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setEditTab(tab)}
                className={`flex-1 py-2.5 text-[10px] font-black tracking-[0.15em] uppercase transition-all ${
                  editTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {editTab === "content" && (
            <>
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
                        settings={section.settings}
                        onPatch={(patch) => updateSectionSettings(section.id, patch)}
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
            </>
          )}

          {editTab === "design" && (
            <SectionSettingsPanel
              settings={section.settings}
              onUpdate={(patch) => updateSectionSettings(section.id, patch)}
              colorSchemes={colorSchemes}
            />
          )}

          {onSavePreset && (
            <button
              onClick={() => {
                const name = window.prompt("Name this preset:", section.settings?.title || section.type.replace("Section", ""));
                if (!name) return;
                onSavePreset({
                  id: crypto.randomUUID(),
                  name,
                  type: section.type,
                  settings: JSON.parse(JSON.stringify(section.settings || {})),
                });
              }}
              className="w-full py-3 text-amber-600 text-[10px] font-bold tracking-widest border border-amber-200 bg-amber-50/50 rounded-2xl hover:bg-amber-50 transition-colors"
            >
              SAVE AS REUSABLE PRESET
            </button>
          )}

          <div className="pt-2 grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                copySectionToClipboard(section);
                alert("Section copied — use “Paste section” on any page template.");
              }}
              className="py-3 text-neutral-700 text-[10px] font-bold tracking-widest border border-neutral-200 rounded-2xl hover:bg-neutral-50 transition-colors"
            >
              COPY
            </button>
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

      {/* A/B layout switcher — keep an alternate arrangement and flip between them */}
      <ABLayoutSwitcher design={design} update={update} />

      {/* Start from a curated full-page layout */}
      <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === "layout-templates" ? null : "layout-templates")}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm text-violet-600">
              <LayoutTemplate size={14} />
            </div>
            <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-tight">Start from a template</span>
          </div>
          <ChevronRight size={14} className={`text-neutral-400 transition-transform ${expandedSection === "layout-templates" ? "rotate-90" : ""}`} />
        </button>
        {expandedSection === "layout-templates" && (
          <div className="px-4 py-4 space-y-2 border-t border-neutral-100 bg-white">
            <p className="text-[9px] text-neutral-400 font-medium leading-relaxed mb-2">
              Replace this page's sections with a curated arrangement. Your current layout is kept as the alternate (A/B) layout.
            </p>
            {HOME_LAYOUT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => {
                  if (!confirm(`Apply "${tpl.name}"? Your current ${sections.length}-section layout will be saved as the alternate layout.`)) return;
                  update("altSections", JSON.parse(JSON.stringify(sections)));
                  updateSections(buildTemplateSections(tpl));
                }}
                className="w-full text-left p-3 rounded-xl border border-neutral-200 hover:border-violet-400 hover:bg-violet-50/40 transition-all"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[11px] font-black text-neutral-800 uppercase tracking-tight">{tpl.name}</p>
                  <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{tpl.sections.length} sections</span>
                </div>
                <p className="text-[9px] text-neutral-400 font-medium leading-relaxed">{tpl.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-4 ${sectionLimitExceeded ? "border-red-200 bg-red-50" : sectionLimitWarning ? "border-amber-200 bg-amber-50" : "border-emerald-100 bg-emerald-50/50"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-[9px] font-black tracking-[0.25em] uppercase ${sectionLimitExceeded ? "text-red-500" : sectionLimitWarning ? "text-amber-600" : "text-emerald-600"}`}>Theme weight</p>
            <p className="text-[11px] text-neutral-500 font-bold mt-1 leading-relaxed">
              {sections.length}/25 sections · {blockTotal} blocks. Keep pages lean for stronger Core Web Vitals.
            </p>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${sectionLimitExceeded ? "bg-red-100 text-red-600" : sectionLimitWarning ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            {sectionLimitExceeded ? "Over limit" : sectionLimitWarning ? "Watch" : "Lean"}
          </span>
        </div>
      </div>

      <div className="space-y-3 pb-8">
       <DndContext
         sensors={sensors}
         collisionDetection={closestCenter}
         onDragStart={handleSectionDragStart}
         onDragEnd={handleSectionDragEnd}
         onDragCancel={() => {
           setDragLibType(null);
           setDragSectionId(null);
         }}
       >
        {sections.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-neutral-100 rounded-[2rem] bg-neutral-50/50">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><LayoutTemplate size={20} className="text-neutral-300" /></div>
             <p className="text-[11px] text-neutral-400 font-medium px-8 mb-5">Your homepage is empty. Drag a section here from the library, or start by adding a Hero section.</p>
             <div className="px-5">
               <InsertionDropZone
                 id="section-drop-0"
                 active={!!dragLibType || !!dragSectionId}
                 label={
                   dragLibType
                     ? `Drop ${getSectionMeta(dragLibType)?.label || "section"} here`
                     : "Drop section here"
                 }
               />
             </div>
          </div>
        ) : (
          <SortableContext items={sections.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
             {(dragLibType || dragSectionId) && (
               <InsertionDropZone
                 id="section-drop-0"
                 active
                 label={dragLibType ? `Add ${getSectionMeta(dragLibType)?.label || "section"} at top` : "Move section to top"}
               />
             )}
             {sections.map((section: any, index: number) => {
               const isHidden = section.visible === false;
               return (
               <div key={section.id} className="space-y-2">
               <SortableRow
                 id={section.id}
                 onClick={() => !isHidden && setActiveSectionId(section.id)}
                 className={`group relative border rounded-3xl p-4 transition-all duration-300 ${
                   isHidden
                     ? "bg-neutral-50/40 border-neutral-100 cursor-default opacity-50"
                     : "bg-white border-neutral-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer"
                 }`}
               >
                {({ handleProps }) => (
                <>
                <div className="flex items-center gap-3">
                 {/* Drag handle */}
                 <div {...handleProps} className="text-neutral-200 hover:text-neutral-400 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0">
                   <GripVertical size={16} />
                 </div>

                 {/* Reorder arrows */}
                 <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={(e) => moveSection(index, 'up', e)} disabled={index === 0} aria-label="Move section up" className="p-0.5 hover:bg-neutral-100 rounded text-neutral-300 hover:text-neutral-900 disabled:opacity-0 transition-all"><ChevronLeft size={12} className="rotate-90" /></button>
                    <button onClick={(e) => moveSection(index, 'down', e)} disabled={index === sections.length - 1} aria-label="Move section down" className="p-0.5 hover:bg-neutral-100 rounded text-neutral-300 hover:text-neutral-900 disabled:opacity-0 transition-all"><ChevronLeft size={12} className="-rotate-90" /></button>
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
                    <button onClick={(e) => removeSection(section.id, e)} aria-label="Remove section" className="p-2 text-neutral-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><X size={13} /></button>
                    {!isHidden && <ChevronRight size={13} className="text-neutral-200 group-hover:text-neutral-400 transition-colors" />}
                 </div>
                </div>

                {/* Outline tree: nested blocks with show/hide, Shopify-style */}
                {(() => {
                  const meta = getSectionMeta(section.type);
                  if (!meta?.blockType) return null;
                  const blocksKey = getBlocksKey(section.type);
                  const blocks: any[] = section.settings?.[blocksKey] || [];
                  if (blocks.length === 0) return null;
                  const isOpen = outlineId === section.id;
                  const toggleBlockHidden = (bi: number) => {
                    updateSections(sections.map((s: any) =>
                      s.id === section.id
                        ? {
                            ...s,
                            settings: {
                              ...s.settings,
                              [blocksKey]: blocks.map((b: any, i: number) => (i === bi ? { ...b, hidden: !b.hidden } : b)),
                            },
                          }
                        : s,
                    ));
                  };
                  return (
                    <div onClick={(e) => e.stopPropagation()} className="cursor-default">
                      <button
                        onClick={() => setOutlineId(isOpen ? null : section.id)}
                        className="mt-2 ml-12 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-neutral-400 hover:text-blue-600 transition-colors"
                      >
                        <ChevronRight size={10} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        {blocks.length} {meta.blockLabel?.toLowerCase()}{blocks.length === 1 ? "" : "s"}
                      </button>
                      {isOpen && (
                        <div className="mt-1.5 ml-12 pl-3 border-l-2 border-neutral-100 space-y-0.5">
                          {blocks.map((block: any, bi: number) => (
                            <div key={bi} className="flex items-center justify-between gap-2 py-1 group/block">
                              <button
                                onClick={() => setActiveSectionId(section.id)}
                                className={`text-[10px] font-bold truncate text-left flex-1 transition-colors ${
                                  block.hidden ? "text-neutral-300 line-through" : "text-neutral-500 hover:text-blue-600"
                                }`}
                              >
                                {block.title || block.question || block.heading || block.author || block.alt || `${meta.blockLabel} ${bi + 1}`}
                              </button>
                              <button
                                onClick={() => toggleBlockHidden(bi)}
                                title={block.hidden ? "Show block" : "Hide block"}
                                className={`p-1 rounded transition-colors ${
                                  block.hidden ? "text-neutral-300 hover:text-emerald-500" : "text-neutral-300 hover:text-neutral-600"
                                }`}
                              >
                                {block.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                </>
                )}
               </SortableRow>
               {(dragLibType || dragSectionId) && (
                 <InsertionDropZone
                   id={`section-drop-${index + 1}`}
                   active
                   label={
                     dragLibType
                       ? `Add ${getSectionMeta(dragLibType)?.label || "section"} ${index === sections.length - 1 ? "at end" : "here"}`
                       : `Move section ${index === sections.length - 1 ? "to end" : "here"}`
                   }
                 />
               )}
               </div>
               );
             })}
          </div>
          </SortableContext>
        )}

        {/* Add Section button */}
        <div className="pt-4 space-y-2">
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

          {readSectionClipboard() && (
            <button
              onClick={() => {
                const clip = readSectionClipboard();
                if (!clip) return;
                const id = crypto.randomUUID();
                updateSections([
                  ...sections,
                  { id, type: clip.type, visible: true, settings: JSON.parse(JSON.stringify(clip.settings || {})) },
                ]);
                setActiveSectionId(id);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 rounded-2xl text-[10px] font-black text-amber-600 uppercase tracking-[0.15em] transition-all"
            >
              <Layers size={13} />
              Paste section ({readSectionClipboard()?.type.replace("Section", "")})
            </button>
          )}
        </div>

        {/* Section Library Modal — full categorized library + saved presets */}
        {showLibrary && (
          <NewSectionLibraryModal
            onAdd={addSection}
            onClose={() => setShowLibrary(false)}
            presets={sectionPresets}
            onAddPreset={(preset: SectionPreset) => {
              const id = crypto.randomUUID();
              updateSections([
                ...sections,
                { id, type: preset.type, visible: true, settings: JSON.parse(JSON.stringify(preset.settings || {})) },
              ]);
              setActiveSectionId(id);
            }}
            onDeletePreset={onDeletePreset}
          />
        )}

        {/* Preview of a section type being dragged out of the library */}
        <DragOverlay dropAnimation={null}>
          {dragLibType ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-violet-600 text-white shadow-2xl shadow-violet-500/30 cursor-grabbing">
              <Plus size={14} strokeWidth={3} />
              <span className="text-[11px] font-black uppercase tracking-[0.15em]">
                {getSectionMeta(dragLibType)?.label || dragLibType.replace("Section", "")}
              </span>
            </div>
          ) : dragSectionId ? (
            (() => {
              const section = sections.find((s: any) => s.id === dragSectionId);
              if (!section) return null;
              return (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-blue-200 text-neutral-800 shadow-2xl shadow-blue-500/20 cursor-grabbing">
                  <GripVertical size={14} className="text-blue-500" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-tight">
                      {section.settings?.title || section.type.replace("Section", "")}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">
                      {section.type.replace("Section", "")}
                    </p>
                  </div>
                </div>
              );
            })()
          ) : null}
        </DragOverlay>
       </DndContext>
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
      <Accordion title="Screenshot-style Catalog" defaultOpen={true}>
        <div className="space-y-6">
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest italic">
            Match the provided black bookstore reference: oversized wordmark, ruled navigation,
            compact cart total, large image-led cards, and editable typography/spacing.
          </p>
          <div>
            <SidebarLabel>Catalog Layout Style</SidebarLabel>
            <SidebarRadioGroup
              value={design.catalogLayoutStyle || "reference"}
              onChange={(v) => update("catalogLayoutStyle", v)}
              options={[
                { value: "modern", label: "Modern" },
                { value: "reference", label: "Photo Reference" },
              ]}
            />
          </div>
          <SidebarInput
            label="Masthead Text"
            value={design.catalogMastheadText || "Lyricalmyrical Books"}
            onChange={(v: string) => update("catalogMastheadText", v)}
            placeholder="Lyricalmyrical Books"
          />
          <SidebarRange
            label="Header Max Width"
            value={design.catalogHeaderWidth ?? design.containerWidth ?? 1200}
            min={900}
            max={1800}
            step={20}
            suffix="px"
            onChange={(v: number) => update("catalogHeaderWidth", v)}
          />
          <SidebarRange
            label="Header Rule Thickness"
            value={design.catalogHeaderRuleWidth ?? 4}
            min={0}
            max={8}
            step={1}
            suffix="px"
            onChange={(v: number) => update("catalogHeaderRuleWidth", v)}
          />
          <SidebarRange
            label="Product Grid Gap"
            value={design.catalogGridGap ?? 18}
            min={8}
            max={72}
            step={2}
            suffix="px"
            onChange={(v: number) => update("catalogGridGap", v)}
          />
          <div>
            <SidebarLabel>Image Fit</SidebarLabel>
            <SidebarRadioGroup
              value={design.catalogImageFit || "cover"}
              onChange={(v) => update("catalogImageFit", v)}
              options={[
                { value: "cover", label: "Cover" },
                { value: "contain", label: "Contain" },
              ]}
            />
          </div>
          <div>
            <SidebarLabel>Product Title Case</SidebarLabel>
            <SidebarRadioGroup
              value={design.catalogTitleTransform || "none"}
              onChange={(v) => update("catalogTitleTransform", v)}
              options={[
                { value: "none", label: "Natural" },
                { value: "uppercase", label: "Uppercase" },
                { value: "capitalize", label: "Capitalize" },
              ]}
            />
          </div>
          <SidebarInput
            label="Cart Total Placeholder"
            value={design.catalogCartTotalPlaceholder || "130.00"}
            onChange={(v: string) => update("catalogCartTotalPlaceholder", v)}
            placeholder="130.00"
          />
          <SidebarRange
            label="Category Links Shown"
            value={design.referenceCategoryLimit ?? 1}
            min={1}
            max={8}
            step={1}
            onChange={(v: number) => update("referenceCategoryLimit", v)}
          />
          <SidebarToggle
            label="Show search/sort controls"
            description="Turn this on for the old utility bar; the photo reference hides it."
            checked={design.showCatalogControls ?? false}
            onChange={(v: boolean) => update("showCatalogControls", v)}
          />
          <div>
            <SidebarLabel>Cart Placement</SidebarLabel>
            <SidebarRadioGroup
              value={design.catalogCartPlacement || "top-right"}
              onChange={(v) => update("catalogCartPlacement", v)}
              options={[
                { value: "top-right", label: "Top right" },
                { value: "nav-end", label: "Nav end" },
                { value: "hidden", label: "Hidden" },
              ]}
            />
          </div>
          <SidebarRange
            label="Masthead Size Desktop"
            value={design.catalogMastheadDesktop ?? 58}
            min={28}
            max={96}
            step={1}
            suffix="px"
            onChange={(v: number) => update("catalogMastheadDesktop", v)}
          />
          <SidebarRange
            label="Masthead Size Mobile"
            value={design.catalogMastheadMobile ?? 38}
            min={24}
            max={72}
            step={1}
            suffix="px"
            onChange={(v: number) => update("catalogMastheadMobile", v)}
          />
          <SidebarRange
            label="Nav Gap Desktop"
            value={design.catalogNavGapDesktop ?? 40}
            min={12}
            max={80}
            step={2}
            suffix="px"
            onChange={(v: number) => update("catalogNavGapDesktop", v)}
          />
          <SidebarRange
            label="Nav Gap Mobile"
            value={design.catalogNavGapMobile ?? 18}
            min={8}
            max={48}
            step={2}
            suffix="px"
            onChange={(v: number) => update("catalogNavGapMobile", v)}
          />
          <SidebarRange
            label="Image Focal X"
            value={design.catalogImageFocalX ?? 50}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={(v: number) => update("catalogImageFocalX", v)}
          />
          <SidebarRange
            label="Image Focal Y"
            value={design.catalogImageFocalY ?? 50}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={(v: number) => update("catalogImageFocalY", v)}
          />
        </div>
      </Accordion>

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
            <SidebarToggle
              label="Ambient Glow"
              description="Enable subtle backdrop glow effect"
              checked={design.showAmbientGlow ?? true}
              onChange={(v: boolean) => update("showAmbientGlow", v)}
            />
            <SidebarToggle
              label="Specifications"
              description="Show format, language, dimensions specs"
              checked={design.showSpecs ?? true}
              onChange={(v: boolean) => update("showSpecs", v)}
            />
            <SidebarToggle
              label="FBT Bundle"
              description="Show Frequently Bought Together section"
              checked={design.showBundleWidget ?? true}
              onChange={(v: boolean) => update("showBundleWidget", v)}
            />
            <SidebarToggle
              label="Trust Signals"
              description="Show standard shipping & return guarantees"
              checked={design.showTrustSignals ?? true}
              onChange={(v: boolean) => update("showTrustSignals", v)}
            />
          </div>

          {design.showAmbientGlow !== false && (
            <SidebarRange
              label="Glow Intensity"
              value={design.glowIntensity ?? 18}
              min={0}
              max={50}
              suffix="%"
              onChange={(v: number) => update("glowIntensity", v)}
            />
          )}

          <div>
            <SidebarLabel>Add to Bag Text</SidebarLabel>
            <SidebarInput
              value={design.addToBagLabel ?? "Add to Bag"}
              onChange={(v: string) => update("addToBagLabel", v)}
              placeholder="Add to Bag"
            />
          </div>

          <div className="pt-4 border-t border-white/5 space-y-6">
            <SidebarLabel>Typography & Details</SidebarLabel>
            <div>
              <SidebarLabel>Title Size</SidebarLabel>
              <SidebarRadioGroup
                value={design.productTitleSize || "large"}
                onChange={(v) => update("productTitleSize", v)}
                options={[
                  { value: "medium", label: "Medium" },
                  { value: "large", label: "Large" },
                  { value: "xlarge", label: "Extra Large" },
                ]}
              />
            </div>
            <div>
              <SidebarLabel>Text Alignment</SidebarLabel>
              <SidebarRadioGroup
                value={design.productAlignment || "left"}
                onChange={(v) => update("productAlignment", v)}
                options={[
                  { value: "left", label: "Left" },
                  { value: "center", label: "Center" },
                ]}
              />
            </div>
            <div>
              <SidebarLabel>Subtitle Weight</SidebarLabel>
              <SidebarRadioGroup
                value={design.productSubtitleWeight || "light"}
                onChange={(v) => update("productSubtitleWeight", v)}
                options={[
                  { value: "light", label: "Light" },
                  { value: "medium", label: "Medium" },
                  { value: "bold", label: "Bold" },
                ]}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-6">
            <SidebarLabel>Cover Image Effects</SidebarLabel>
            <SidebarRange
              label="Border Radius"
              value={design.productBorderRadius ?? 32}
              min={0}
              max={48}
              suffix="px"
              onChange={(v: number) => update("productBorderRadius", v)}
            />
            <SidebarRange
              label="Image Hover Scale"
              value={Math.round((design.productImageHoverScale ?? 1.05) * 100)}
              min={100}
              max={115}
              suffix="%"
              onChange={(v: number) => update("productImageHoverScale", v / 100)}
            />
            <div>
              <SidebarLabel>Glow Backdrop Color</SidebarLabel>
              <SidebarInput
                value={design.productImageGlowColor || ""}
                onChange={(v: string) => update("productImageGlowColor", v)}
                placeholder="#A855F7"
              />
            </div>
            <div>
              <SidebarLabel>Cover Drop Shadow</SidebarLabel>
              <SidebarRadioGroup
                value={design.productImageShadow || "lg"}
                onChange={(v) => update("productImageShadow", v)}
                options={[
                  { value: "none", label: "None" },
                  { value: "sm", label: "Small" },
                  { value: "md", label: "Medium" },
                  { value: "lg", label: "Large" },
                  { value: "xl", label: "Ultra Deep" },
                ]}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-6">
            <SidebarLabel>Detail Blocks Layout</SidebarLabel>
            <SidebarRadioGroup
              value={design.productDetailsLayout || "sections"}
              onChange={(v) => update("productDetailsLayout", v)}
              options={[
                { value: "sections", label: "Standard Stacked" },
                { value: "tabs", label: "Interactive Tabs" },
                { value: "accordions", label: "Accordion Drawers" },
              ]}
            />
          </div>

          <div className="pt-4 border-t border-white/5 space-y-6">
            <SidebarLabel>Call-To-Action (CTA)</SidebarLabel>
            <div>
              <SidebarLabel>Hover Animation</SidebarLabel>
              <SidebarRadioGroup
                value={design.productCtaAnimation || "none"}
                onChange={(v) => update("productCtaAnimation", v)}
                options={[
                  { value: "none", label: "Static" },
                  { value: "pulse", label: "Pulse scale" },
                  { value: "glow", label: "Glow shadows" },
                  { value: "scale", label: "Lift / Press scale" },
                ]}
              />
            </div>
            <div>
              <SidebarLabel>CTA Width</SidebarLabel>
              <SidebarRadioGroup
                value={design.productCtaWidth || "full"}
                onChange={(v) => update("productCtaWidth", v)}
                options={[
                  { value: "full", label: "Full Width" },
                  { value: "auto", label: "Compact Auto" },
                ]}
              />
            </div>
            <div>
              <SidebarLabel>CTA Button Size</SidebarLabel>
              <SidebarRadioGroup
                value={design.productCtaSize || "large"}
                onChange={(v) => update("productCtaSize", v)}
                options={[
                  { value: "medium", label: "Medium" },
                  { value: "large", label: "Large" },
                ]}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-6">
            <SidebarLabel>Trust & Bundle Settings</SidebarLabel>
            <div>
              <SidebarLabel>Trust Signals Layout</SidebarLabel>
              <SidebarRadioGroup
                value={design.productTrustLayout || "row"}
                onChange={(v) => update("productTrustLayout", v)}
                options={[
                  { value: "row", label: "Horizontal Row" },
                  { value: "stack", label: "Vertical List" },
                  { value: "grid", label: "Card Grid" },
                ]}
              />
            </div>
            <div>
              <SidebarLabel>FBT Bundle Card Style</SidebarLabel>
              <SidebarRadioGroup
                value={design.productBundleLayout || "bordered"}
                onChange={(v) => update("productBundleLayout", v)}
                options={[
                  { value: "bordered", label: "Thin Border" },
                  { value: "glassmorphic", label: "Glassmorphic" },
                  { value: "card", label: "Solid Card" },
                ]}
              />
            </div>
          </div>

          {design.showTrustSignals !== false && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <SidebarLabel>Custom Trust Signals</SidebarLabel>
              <SidebarInput
                label="Signal 1"
                value={design.productTrust1 ?? "Tracked Shipping"}
                onChange={(v: string) => update("productTrust1", v)}
                placeholder="Tracked Shipping"
              />
              <SidebarInput
                label="Signal 2"
                value={design.productTrust2 ?? "14-Day Returns"}
                onChange={(v: string) => update("productTrust2", v)}
                placeholder="14-Day Returns"
              />
              <SidebarInput
                label="Signal 3"
                value={design.productTrust3 ?? "Ships in 1-2 Days"}
                onChange={(v: string) => update("productTrust3", v)}
                placeholder="Ships in 1-2 Days"
              />
            </div>
          )}
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
          <div>
            <SidebarLabel>Card Shadow</SidebarLabel>
            <SidebarRadioGroup
              value={design.shadowScale ?? 'subtle'}
              options={[
                { value: 'flat',     label: 'Flat' },
                { value: 'subtle',   label: 'Subtle' },
                { value: 'medium',   label: 'Medium' },
                { value: 'raised',   label: 'Raised' },
                { value: 'dramatic', label: 'Dramatic' },
              ]}
              onChange={(v) => update('shadowScale', v)}
            />
          </div>
          <div>
            <SidebarLabel>Section Spacing</SidebarLabel>
            <SidebarRadioGroup
              value={design.spacingScale ?? 'normal'}
              options={[
                { value: 'compact',  label: 'Compact' },
                { value: 'normal',   label: 'Normal' },
                { value: 'relaxed',  label: 'Relaxed' },
                { value: 'spacious', label: 'Spacious' },
              ]}
              onChange={(v) => update('spacingScale', v)}
            />
          </div>
        </div>
      </Accordion>
    </div>
  );
}

function ButtonsPanel({ design, update }: any) {
  const buttonBg = design.buttonColor || design.primaryColor || "#A855F7";
  const buttonText = design.buttonTextColor || "#000000";
  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Button Colors" defaultOpen={true}>
        <div className="space-y-6">
          <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
            By default buttons use your accent color. Override them here for every CTA across the store —
            individual sections can still set their own accent.
          </p>
          <ColorPicker
            label="Button background"
            value={buttonBg}
            onChange={(val) => update("buttonColor", val)}
          />
          <ColorPicker
            label="Button text"
            value={buttonText}
            onChange={(val) => update("buttonTextColor", val)}
          />
          <ContrastBadge background={buttonBg} text={buttonText} />
          {/* Live sample */}
          <div className="flex items-center justify-center py-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <span
              className={`px-8 py-3.5 text-[10px] tracking-[0.3em] font-bold ${design.buttonUppercase ?? true ? "uppercase" : ""} ${design.buttonShadow ?? true ? "shadow-xl" : ""}`}
              style={{
                backgroundColor: (design.buttonStyle || "solid") === "solid" ? buttonBg : "transparent",
                color: (design.buttonStyle || "solid") === "solid" ? buttonText : buttonBg,
                border: (design.buttonStyle || "solid") !== "solid" ? `1px solid ${buttonBg}` : "none",
                borderRadius: design.buttonRadius ?? 999,
              }}
            >
              {design.productCTA || "SHOP NOW"}
            </span>
          </div>
          {design.buttonColor && (
            <button
              onClick={() => {
                update("buttonColor", undefined);
                update("buttonTextColor", undefined);
              }}
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.2em] italic"
            >
              Reset to accent color
            </button>
          )}
        </div>
      </Accordion>

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

      <Accordion title="Type Scale Designer" defaultOpen={true}>
        <TypeScaleDesigner design={design} update={update} />
      </Accordion>

      <Accordion title="Fine Tuning" defaultOpen={true}>
        <div className="space-y-8">
          <SidebarRange
            label="Base font size"
            value={design.baseFontSize ?? (design.fontSize === "sm" ? 15 : design.fontSize === "lg" ? 18 : 16)}
            min={12}
            max={22}
            step={1}
            suffix="px"
            onChange={(v: number) => update("baseFontSize", v)}
          />
          <SidebarRange
            label="Line height"
            value={Math.round((design.lineHeight ?? 1.6) * 100)}
            min={110}
            max={210}
            step={5}
            suffix="%"
            onChange={(v: number) => update("lineHeight", v / 100)}
          />
          <div>
            <SidebarLabel>Heading weight</SidebarLabel>
            <SidebarRadioGroup
              value={String(design.headingWeight ?? 800)}
              onChange={(v) => update("headingWeight", Number(v))}
              options={[
                { value: "400", label: "Regular" },
                { value: "600", label: "Semibold" },
                { value: "800", label: "Bold" },
                { value: "900", label: "Black" },
              ]}
            />
          </div>
          <div>
            <SidebarLabel>Body weight</SidebarLabel>
            <SidebarRadioGroup
              value={String(design.bodyWeight ?? 400)}
              onChange={(v) => update("bodyWeight", Number(v))}
              options={[
                { value: "300", label: "Light" },
                { value: "400", label: "Regular" },
                { value: "500", label: "Medium" },
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
               className="text-white leading-none uppercase italic"
               style={{
                 fontFamily: design.headingFont || design.font || "Inter",
                 fontWeight: design.headingWeight ?? 800,
                 fontSize: design.fontSize === "sm" ? 28 : design.fontSize === "lg" ? 48 : 36,
                 letterSpacing: design.letterSpacing === "ultra" ? "0.15em" : design.letterSpacing === "wide" ? "0.05em" : "0",
               }}
             >
               Aa — {design.headingFont || design.font || "Inter"}
             </p>
             <p
               className="text-slate-400 text-[13px] italic tracking-tight"
               style={{
                 fontFamily: design.font || "Inter",
                 fontWeight: design.bodyWeight ?? 400,
                 lineHeight: design.lineHeight ?? 1.6,
               }}
             >
               THE QUICK BROWN FOX JUMPED OVER THE LAZY DOG. ARCHIVAL TEXTURE MANIFESTO.
             </p>
           </div>
        </div>
      </Accordion>
    </div>
  );
}

// ──────────────────────────────
// Menu Builder — nested header/footer navigation
// ──────────────────────────────
function MenuLinkFields({
  item,
  onPatch,
  pageOpts,
  collOpts,
}: {
  item: MenuItem;
  onPatch: (patch: Partial<MenuItem>) => void;
  pageOpts: { value: string; label: string }[];
  collOpts: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-3">
      <SidebarInput value={item.label} onChange={(v: string) => onPatch({ label: v })} placeholder="Link label" />
      <SidebarSelect
        value={item.type}
        onChange={(v: string) => onPatch({ type: v as MenuItem["type"], value: "" })}
        options={MENU_LINK_TYPES as any}
      />
      {item.type === "page" && (
        <SidebarSelect value={item.value || ""} onChange={(v: string) => onPatch({ value: v })} options={pageOpts} />
      )}
      {item.type === "collection" && (
        <SidebarSelect value={item.value || ""} onChange={(v: string) => onPatch({ value: v })} options={collOpts} />
      )}
      {item.type === "url" && (
        <SidebarInput value={item.value || ""} onChange={(v: string) => onPatch({ value: v })} placeholder="https://… or /path" />
      )}
    </div>
  );
}

function MenuBuilderPanel({ design, update, pages = [] }: any) {
  const [tab, setTab] = useState<"header" | "footer">("header");
  const menus = design.menus || {};
  const items: MenuItem[] = menus[tab] || [];
  const setItems = (next: MenuItem[]) => update("menus", { ...menus, [tab]: next }, true);

  const rawCategories = design.categories || CATEGORIES;
  const categoryNames: string[] = rawCategories.map((c: any) => (typeof c === "string" ? c : c.name));
  const pageOpts = [{ value: "", label: "Select page…" }, ...pages.map((p: any) => ({ value: p.slug, label: p.title }))];
  const collOpts = [{ value: "", label: "Select collection…" }, ...categoryNames.map((n) => ({ value: slugify(n), label: n }))];

  const move = (arr: MenuItem[], i: number, dir: number): MenuItem[] => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const copy = [...arr];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  };

  const patchTop = (i: number, patch: Partial<MenuItem>) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeTop = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const addChild = (i: number) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, children: [...(it.children || []), newMenuItem()] } : it)));
  const patchChild = (i: number, j: number, patch: Partial<MenuItem>) =>
    setItems(items.map((it, idx) =>
      idx === i ? { ...it, children: (it.children || []).map((c, cj) => (cj === j ? { ...c, ...patch } : c)) } : it,
    ));
  const removeChild = (i: number, j: number) =>
    setItems(items.map((it, idx) =>
      idx === i ? { ...it, children: (it.children || []).filter((_, cj) => cj !== j) } : it,
    ));

  // Grandchildren — used by mega menus, where each sub-link is a column
  // heading and its own children are the column's links.
  const patchChildAt = (i: number, j: number, mutate: (c: MenuItem) => MenuItem) =>
    setItems(items.map((it, idx) =>
      idx === i ? { ...it, children: (it.children || []).map((c, cj) => (cj === j ? mutate(c) : c)) } : it,
    ));
  const addGrand = (i: number, j: number) =>
    patchChildAt(i, j, (c) => ({ ...c, children: [...(c.children || []), newMenuItem()] }));
  const patchGrand = (i: number, j: number, k: number, patch: Partial<MenuItem>) =>
    patchChildAt(i, j, (c) => ({ ...c, children: (c.children || []).map((g, gk) => (gk === k ? { ...g, ...patch } : g)) }));
  const removeGrand = (i: number, j: number, k: number) =>
    patchChildAt(i, j, (c) => ({ ...c, children: (c.children || []).filter((_, gk) => gk !== k) }));
  const onReorderGrand = (i: number, j: number, next: MenuItem[]) =>
    patchChildAt(i, j, (c) => ({ ...c, children: next }));

  return (
    <div className="p-4 space-y-5 overflow-y-auto flex-1">
      {/* Header / Footer switch */}
      <div className="flex gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-1.5">
        {(["header", "footer"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all ${
              tab === t ? "bg-violet-600 text-white shadow-lg" : "text-slate-500 hover:text-white"
            }`}
          >
            {t} menu
          </button>
        ))}
      </div>

      <p className="text-[9px] text-slate-600 font-bold leading-relaxed italic px-1">
        Build the {tab} navigation. Add links to pages, collections or any URL. Add sub-links to create a
        {tab === "header" ? " dropdown menu." : " grouped list."}
      </p>

      {items.length === 0 && (
        <div className="py-10 text-center text-[10px] tracking-[0.3em] text-slate-600 uppercase italic">
          No links yet.
        </div>
      )}

      <SortableList items={items} getId={(it) => it.id} onReorder={(next) => setItems(next)} className="space-y-4">
        {items.map((item, i) => (
          <SortableRow key={item.id} id={item.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-4">
            {({ handleProps }) => (
            <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-slate-600">
                <span {...handleProps} className="cursor-grab active:cursor-grabbing hover:text-slate-300 transition-colors"><GripVertical size={14} /></span>
                <span className="text-[9px] font-black uppercase tracking-widest italic text-slate-500">Link {i + 1}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setItems(move(items, i, -1))} disabled={i === 0} aria-label="Move link up" className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"><ChevronUp size={14} /></button>
                <button onClick={() => setItems(move(items, i, 1))} disabled={i === items.length - 1} aria-label="Move link down" className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all"><ChevronDown size={14} /></button>
                <button onClick={() => removeTop(i)} aria-label="Remove link" className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
              </div>
            </div>

            <MenuLinkFields item={item} onPatch={(p) => patchTop(i, p)} pageOpts={pageOpts} collOpts={collOpts} />

            {/* Mega menu (header only): children become link-group columns */}
            {tab === "header" && (
              <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest italic text-slate-400">Mega menu</p>
                    <p className="text-[8px] text-slate-600 font-bold mt-0.5">
                      Sub-links become columns; their own sub-links become the column's links.
                    </p>
                  </div>
                  <button
                    onClick={() => patchTop(i, { mega: !item.mega })}
                    className={`flex-shrink-0 w-10 h-5 rounded-full relative transition-all ${item.mega ? "bg-violet-600" : "bg-white/10"}`}
                  >
                    <span className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${item.mega ? "left-6" : "left-1"}`} />
                  </button>
                </div>
                {item.mega && (
                  <div className="space-y-2">
                    <input
                      value={item.featuredImage || ""}
                      onChange={(e) => patchTop(i, { featuredImage: e.target.value })}
                      placeholder="Featured image URL (optional)"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-200 outline-none focus:border-violet-500/50 placeholder:text-slate-700"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={item.featuredTitle || ""}
                        onChange={(e) => patchTop(i, { featuredTitle: e.target.value })}
                        placeholder="Featured title"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-200 outline-none focus:border-violet-500/50 placeholder:text-slate-700"
                      />
                      <input
                        value={item.featuredLink || ""}
                        onChange={(e) => patchTop(i, { featuredLink: e.target.value })}
                        placeholder="Featured link"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-200 outline-none focus:border-violet-500/50 placeholder:text-slate-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Children */}
            {(item.children || []).length > 0 && (
              <SortableList
                items={item.children || []}
                getId={(c) => c.id}
                onReorder={(next) => patchTop(i, { children: next })}
                className="pl-4 border-l-2 border-violet-500/20 space-y-3"
              >
                {(item.children || []).map((child, j) => (
                  <SortableRow key={child.id} id={child.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-3">
                    {({ handleProps }) => (
                    <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-slate-600">
                        <span {...handleProps} className="cursor-grab active:cursor-grabbing hover:text-slate-300 transition-colors"><GripVertical size={12} /></span>
                        <span className="text-[8px] font-black uppercase tracking-widest italic text-slate-600">Sub-link {j + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => removeChild(i, j)} aria-label="Remove sub-link" className="p-1 rounded text-slate-500 hover:text-red-400"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <MenuLinkFields item={child} onPatch={(p) => patchChild(i, j, p)} pageOpts={pageOpts} collOpts={collOpts} />

                    {/* Mega menus: this sub-link is a column heading — its links live here */}
                    {tab === "header" && item.mega && (
                      <SortableList
                        items={child.children || []}
                        getId={(g) => g.id}
                        onReorder={(next) => onReorderGrand(i, j, next)}
                        className="pl-3 border-l border-amber-500/20 space-y-2"
                      >
                        {(child.children || []).map((grand, k) => (
                          <SortableRow key={grand.id} id={grand.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5 space-y-2">
                            {({ handleProps: grandHandleProps }) => (
                            <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-slate-600">
                                <span {...grandHandleProps} className="cursor-grab active:cursor-grabbing hover:text-slate-300 transition-colors"><GripVertical size={11} /></span>
                                <span className="text-[8px] font-black uppercase tracking-widest italic text-slate-600">Column link {k + 1}</span>
                              </div>
                              <button onClick={() => removeGrand(i, j, k)} aria-label="Remove column link" className="p-1 rounded text-slate-500 hover:text-red-400"><Trash2 size={11} /></button>
                            </div>
                            <MenuLinkFields item={grand} onPatch={(p) => patchGrand(i, j, k, p)} pageOpts={pageOpts} collOpts={collOpts} />
                            </>
                            )}
                          </SortableRow>
                        ))}
                      </SortableList>
                    )}
                    {tab === "header" && item.mega && (
                      <button
                        onClick={() => addGrand(i, j)}
                        className="text-[8px] font-black uppercase tracking-widest italic text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
                      >
                        <Plus size={10} /> Add column link
                      </button>
                    )}
                    </>
                    )}
                  </SortableRow>
                ))}
              </SortableList>
            )}

            <button
              onClick={() => addChild(i)}
              className="text-[9px] font-black uppercase tracking-widest italic text-violet-400 hover:text-violet-300 flex items-center gap-1.5"
            >
              <Plus size={12} /> Add sub-link
            </button>
            </>
            )}
          </SortableRow>
        ))}
      </SortableList>

      <button
        onClick={() => setItems([...items, newMenuItem()])}
        className="w-full py-4 bg-violet-600/15 border border-violet-500/30 rounded-2xl text-[10px] font-black text-violet-300 hover:bg-violet-600/25 transition-all uppercase tracking-[0.2em] italic flex items-center justify-center gap-2"
      >
        <Plus size={14} /> Add link
      </button>
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
      <div className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] relative overflow-hidden">
        <SidebarLabel>Spacing density</SidebarLabel>
        <p className="text-[9px] text-slate-500 font-bold leading-relaxed mb-4">
          One control rescales the vertical rhythm of every section — compact for dense storefronts,
          spacious for an editorial, gallery feel.
        </p>
        <SidebarRadioGroup
          value={design.density || "comfortable"}
          onChange={(v) => update("density", v === "comfortable" ? undefined : v)}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfort" },
            { value: "spacious", label: "Spacious" },
          ]}
        />
      </div>

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
          // Persistent highlight for the currently-selected section instance.
          var selBox = document.createElement('div');
          selBox.style.cssText = 'position:fixed;pointer-events:none;border:2px solid rgba(16,185,129,0.9);border-radius:6px;z-index:99998;background:rgba(16,185,129,0.06);display:none;';
          document.body.appendChild(selBox);
          var selectedId = null;
          function drawSel(){
            if(!selectedId){ selBox.style.display='none'; return; }
            var node = document.querySelector('[data-section-id="'+selectedId+'"]');
            if(!node){ selBox.style.display='none'; return; }
            var r = node.getBoundingClientRect();
            selBox.style.display='block';
            selBox.style.top=r.top+'px'; selBox.style.left=r.left+'px'; selBox.style.width=r.width+'px'; selBox.style.height=r.height+'px';
          }
          window.addEventListener('message', function(e){
            if(e.data && e.data.type==='HIGHLIGHT_SECTION'){ selectedId = e.data.instanceId || null; drawSel(); }
          });
          window.addEventListener('scroll', drawSel, true);
          window.addEventListener('resize', drawSel);
          document.addEventListener('mouseover', function(e){
            var blockNode = e.target && e.target.closest ? e.target.closest('[data-fm-block], [data-block-id]') : null;
            var sectionNode = e.target && e.target.closest ? e.target.closest('[data-fm-section], [data-section-id]') : null;
            var targetNode = blockNode || sectionNode || e.target;
            var sid = getSectionId(e.target);
            if (!sid && !sectionNode && !blockNode) { box.style.display='none'; return; }
            var r = targetNode.getBoundingClientRect();
            var blockId = blockNode ? (blockNode.getAttribute('data-fm-block') || blockNode.getAttribute('data-block-id')) : null;
            box.style.display='block'; lbl.textContent=blockId ? sid + ' · block' : sid;
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
            var instNode = e.target && e.target.closest ? e.target.closest('[data-fm-section], [data-section-id]') : null;
            var blockNode = e.target && e.target.closest ? e.target.closest('[data-fm-block], [data-block-id]') : null;
            var instanceId = instNode ? (instNode.getAttribute('data-fm-section') || instNode.getAttribute('data-section-id')) : null;
            var blockId = blockNode ? (blockNode.getAttribute('data-fm-block') || blockNode.getAttribute('data-block-id')) : null;
            var sid = getSectionId(e.target);
            if (!sid && !instanceId) return;
            e.preventDefault(); e.stopPropagation();
            if (instanceId) { selectedId = instanceId; drawSel(); }
            window.parent.postMessage({ type:'SECTION_SELECT', sectionId: sid, instanceId: instanceId, blockId: blockId }, window.location.origin);
          }, true);
          document.addEventListener('dragstart', function(e){
            var node = e.target && e.target.closest ? e.target.closest('[data-fm-section], [data-section-id]') : null;
            if (!node) return;
            var id = node.getAttribute('data-fm-section') || node.getAttribute('data-section-id');
            var surface = node.getAttribute('data-section') || getSectionId(node) || 'homepage';
            if (!id || !e.dataTransfer) return;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', id);
            e.dataTransfer.setData('application/x-fm-section', JSON.stringify({ id: id, surface: surface }));
          }, true);
          document.addEventListener('dragover', function(e){
            var node = e.target && e.target.closest ? e.target.closest('[data-fm-section], [data-section-id]') : null;
            if (!node) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          }, true);
          document.addEventListener('drop', function(e){
            var node = e.target && e.target.closest ? e.target.closest('[data-fm-section], [data-section-id]') : null;
            if (!node || !e.dataTransfer) return;
            var raw = e.dataTransfer.getData('application/x-fm-section');
            if (!raw) return;
            var data;
            try { data = JSON.parse(raw); } catch(_) { return; }
            var dropId = node.getAttribute('data-fm-section') || node.getAttribute('data-section-id');
            if (!data.id || !dropId || data.id === dropId) return;
            var r = node.getBoundingClientRect();
            var position = e.clientY < (r.top + r.height / 2) ? 'before' : 'after';
            e.preventDefault(); e.stopPropagation();
            window.parent.postMessage({ type:'SECTION_REORDER', dragId: data.id, dropId: dropId, surface: data.surface, position: position }, window.location.origin);
          }, true);
          Array.prototype.forEach.call(document.querySelectorAll('[data-fm-section], [data-section-id]'), function(node){
            node.setAttribute('draggable', 'true');
            node.style.cursor = node.style.cursor || 'grab';
          });
          document.addEventListener('dblclick', function(e){
            var fieldNode = e.target && e.target.closest ? e.target.closest('[data-theme-field]') : null;
            var sectionNode = e.target && e.target.closest ? e.target.closest('[data-section-id]') : null;
            if (!fieldNode || !sectionNode) return;
            e.preventDefault(); e.stopPropagation();
            var originalValue = fieldNode.textContent || '';
            fieldNode.setAttribute('contenteditable', 'true');
            fieldNode.focus();
            var fieldKey = fieldNode.getAttribute('data-theme-field');
            var sectionId = sectionNode.getAttribute('data-section-id');
            var blockNode = fieldNode.closest ? fieldNode.closest('[data-fm-block], [data-block-id]') : null;
            var blockId = blockNode ? (blockNode.getAttribute('data-fm-block') || blockNode.getAttribute('data-block-id')) : null;
            var emit = function() {
              window.parent.postMessage({
                type: 'TEXT_EDIT',
                sectionId: sectionId,
                settingKey: fieldKey,
                value: fieldNode.textContent || '',
                blockId: blockId
              }, window.location.origin);
            };
            var onKeyDown = function(ke) {
              if (ke.key !== 'Escape') return;
              ke.preventDefault();
              fieldNode.textContent = originalValue;
              fieldNode.removeAttribute('contenteditable');
              fieldNode.removeEventListener('input', emit);
              fieldNode.removeEventListener('keydown', onKeyDown);
              window.parent.postMessage({
                type: 'TEXT_EDIT',
                sectionId: sectionId,
                settingKey: fieldKey,
                value: originalValue,
                blockId: blockId
              }, window.location.origin);
              fieldNode.blur();
            };
            fieldNode.addEventListener('input', emit);
            fieldNode.addEventListener('keydown', onKeyDown);
            fieldNode.addEventListener('blur', function() {
              fieldNode.removeAttribute('contenteditable');
              fieldNode.removeEventListener('input', emit);
              fieldNode.removeEventListener('keydown', onKeyDown);
            }, { once: true });
          }, true);
          window.parent.postMessage({ type: 'PREVIEW_READY' }, window.location.origin);
        })();
      `;
      doc.head.appendChild(script);
      var themeFieldHoverStyle = doc.createElement('style');
      themeFieldHoverStyle.textContent = `
        [data-theme-field]:hover {
          outline: 1px dashed rgba(59,130,246,0.5);
          outline-offset: 2px;
          cursor: text;
        }
      `;
      doc.head.appendChild(themeFieldHoverStyle);
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
        {/* Hardware side buttons */}
        {!isDesktop && (
          <>
            {/* Volume Up */}
            <div className="absolute top-28 -left-[10px] w-[2px] h-12 bg-neutral-800 rounded-l-md z-0" />
            {/* Volume Down */}
            <div className="absolute top-44 -left-[10px] w-[2px] h-12 bg-neutral-800 rounded-l-md z-0" />
            {/* Power Button */}
            <div className="absolute top-36 -right-[10px] w-[2px] h-16 bg-neutral-800 rounded-r-md z-0" />
          </>
        )}

        {/* Notch for Mobile only */}
        {!isDesktop && !isTablet && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-neutral-900 rounded-full z-20 flex items-center justify-center gap-1.5 shadow-inner">
            <div className="w-12 h-1 bg-neutral-800 rounded-full" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-950 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#1a2d54]" />
            </div>
          </div>
        )}

        {/* Camera dot for Tablet only */}
        {!isDesktop && isTablet && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-neutral-950 z-20 flex items-center justify-center shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1a2d54]" />
          </div>
        )}

        {/* Screen Sheen Overlay */}
        {!isDesktop && (
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.04] rounded-[inherit] z-30" />
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
      <div 
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 backdrop-blur-md" 
        style={{ 
          borderColor: `${design.headerColor || text}15`, 
          background: design.headerBg || `${bg}80`,
          color: design.headerColor || text
        }}
      >
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
            <div className="flex items-center gap-1 px-3 py-1 rounded-full border text-[8px] font-bold tracking-widest" style={{ borderColor: `${design.headerColor || text}20`, background: `${design.headerColor || text}10` }}>
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
      <div 
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0 backdrop-blur-sm sticky top-0 z-10" 
        style={{ 
          borderColor: `${design.headerColor || text}15`, 
          background: design.headerBg || `${bg}cc`,
          color: design.headerColor || text
        }}
      >
        <span className="text-[9px] font-black tracking-tight">F✶M</span>
        <div className="flex items-center gap-3">
          {["PUBLICATIONS", "PRINTS"].map((c) => (
            <span key={c} className="text-[7px] tracking-widest opacity-40">{c}</span>
          ))}
          {(headerLinks.showCustomPages ?? true) && (
            <>
              <span className="text-[7px] font-bold tracking-widest opacity-60 ml-1 border-l pl-2" style={{ borderColor: `${design.headerColor || text}20` }}>
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
          <div className="text-[7px] font-bold tracking-widest opacity-50 px-2 py-0.5 border rounded-full" style={{ borderColor: `${design.headerColor || text}20` }}>
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
// Guide Panel Components
// ─────────────────────────────────────────────────────────────────────────────
interface GuidePanelProps {
  design: any;
  setActiveTab: (tab: string) => void;
  setActiveSection: (section: string | null) => void;
  setDevice: (device: "desktop" | "tablet" | "mobile") => void;
  setShowCommandPalette: (show: boolean) => void;
  startInteractiveTour: () => void;
  hasCheckedMobile: boolean;
}

function ChecklistItem({ label, checked, onAction }: { label: string; checked: boolean; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-none">
      <div className="flex items-center gap-3">
        <span className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
          checked 
            ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
            : "border-white/10 bg-white/5"
        }`}>
          {checked && <Check size={10} strokeWidth={4} />}
        </span>
        <span className={`text-[10px] font-bold ${checked ? "text-slate-500 line-through" : "text-slate-300"}`}>
          {label}
        </span>
      </div>
      {!checked && (
        <button 
          onClick={onAction} 
          className="text-[9px] font-black text-violet-400 hover:text-white uppercase tracking-widest italic"
        >
          Go ➜
        </button>
      )}
    </div>
  );
}

function FeatureLinkCard({ icon, title, desc, onAction }: { icon: React.ReactNode; title: string; desc: string; onAction: () => void }) {
  return (
    <button
      onClick={onAction}
      className="w-full flex items-start gap-4 p-5 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/20 text-left transition-all group"
    >
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-violet-400 group-hover:bg-white/10 transition-all">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-slate-200 uppercase tracking-tight italic group-hover:text-white transition-colors mb-1">
          {title}
        </p>
        <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
          {desc}
        </p>
      </div>
    </button>
  );
}

function GuidePanel({
  design,
  setActiveTab,
  setActiveSection,
  setDevice,
  setShowCommandPalette,
  startInteractiveTour,
  hasCheckedMobile,
}: GuidePanelProps) {
  const [subTab, setSubTab] = useState<"tour" | "features" | "advanced" | "faq">("tour");
  const [faqSearch, setFaqSearch] = useState("");

  const checks = {
    templates: !!design.themeLibraryPreset && design.themeLibraryPreset !== "editorial-luxe",
    colors: design.primaryColor !== "#A855F7" || design.backgroundColor !== "#030213",
    typography: design.font !== "Inter" || design.headingFont !== "Inter",
    sections: (design.heroPage?.sections?.length || 0) > 0 || (design.storefront?.sections?.length || 0) > 0,
    seo: !!design.homeSeoTitle || !!design.shopSeoTitle,
    mobile: hasCheckedMobile,
  };

  const completedCount = Object.values(checks).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / Object.keys(checks).length) * 100);

  const deepLink = (tab: string, section: string | null = null) => {
    setActiveTab(tab);
    setActiveSection(section);
  };

  const faqs = [
    {
      q: "How do I save my changes?",
      a: "The editor auto-saves draft changes every 30 seconds. To push them to the public storefront immediately, click 'Publish to Live' in the top right. To schedule, enter a datetime and click 'Schedule'."
    },
    {
      q: "Can I undo mistakes?",
      a: "Yes! Use the undo/redo arrow buttons in the top header or press Ctrl + Z to undo and Ctrl + Y to redo. History snapshots can be restored under the 'History' tab."
    },
    {
      q: "What is WCAG accessibility checking?",
      a: "Under Design -> Accessibility Audit, we scan background/text color pairings. If contrast is below 4.5:1, text becomes unreadable for some users. We offer auto-fixes to tweak colors to compliant shades."
    },
    {
      q: "What is the Command Palette?",
      a: "Press Ctrl + K or click 'K' in the top header. You can search, change devices, swap styles, and trigger operations instantly by typing."
    },
    {
      q: "How do I edit sections on the storefront?",
      a: "Click any block in the live preview. The editor will automatically navigate to the clicked element's configuration panel in the left sidebar."
    }
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Header card */}
      <div className="p-6 bg-gradient-to-br from-violet-600/10 via-violet-600/5 to-transparent border border-violet-500/10 rounded-[2rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <HelpCircle size={40} className="rotate-12" />
        </div>
        <h4 className="text-[11px] font-black text-violet-400 uppercase tracking-widest italic mb-2">Editor Guide</h4>
        <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
          Welcome to the Lyrical Theme Editor. Tweak styles, customize layouts, and publish premium storefronts in seconds.
        </p>
      </div>

      {/* Sub tabs nav */}
      <div className="flex bg-white/[0.03] border border-white/5 rounded-2xl p-1 relative">
        {(["tour", "features", "advanced", "faq"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`flex-1 py-2 text-[9px] font-black tracking-widest uppercase transition-all rounded-xl border ${
              subTab === t
                ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
                : "text-slate-500 border-transparent hover:text-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Sub tab content */}
      <div className="space-y-6">
        {subTab === "tour" && (
          <div className="space-y-6">
            <button
              onClick={startInteractiveTour}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl py-4 text-[10px] font-black hover:shadow-[0_0_30px_rgba(124,58,237,0.3)] transition-all uppercase tracking-[0.25em] italic"
            >
              <Zap size={14} className="fill-white" />
              Launch Quick Tour
            </button>

            {/* Progress Bar */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Setup Checklist</span>
                <span className="text-[9px] font-black text-violet-400 italic bg-violet-500/10 px-2 py-0.5 rounded-lg border border-violet-500/20">
                  {progressPercent}% Complete
                </span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>

              {/* Checklist items */}
              <div className="space-y-2 pt-2">
                <ChecklistItem label="1. Select a theme template" checked={checks.templates} onAction={() => deepLink("templates")} />
                <ChecklistItem label="2. Customize brand colors" checked={checks.colors} onAction={() => deepLink("settings", "colors")} />
                <ChecklistItem label="3. Pick typography & fonts" checked={checks.typography} onAction={() => deepLink("settings", "style")} />
                <ChecklistItem label="4. Customize homepage sections" checked={checks.sections} onAction={() => deepLink("settings", "homepage")} />
                <ChecklistItem label="5. Define SEO titles & tags" checked={checks.seo} onAction={() => deepLink("seo")} />
                <ChecklistItem label="6. Preview mobile layout" checked={checks.mobile} onAction={() => setDevice("mobile")} />
              </div>
            </div>
          </div>
        )}

        {subTab === "features" && (
          <div className="space-y-4">
            <FeatureLinkCard
              icon={<Wand2 size={16} />}
              title="Global Theme Library"
              desc="Apply preset templates to instantly overhaul color palettes, corner radiuses, and font pairings."
              onAction={() => deepLink("templates")}
            />
            <FeatureLinkCard
              icon={<Settings size={16} />}
              title="Visual Settings"
              desc="Manage typography, color schemes, product card styles, visual borders, buttons, and animations."
              onAction={() => deepLink("settings")}
            />
            <FeatureLinkCard
              icon={<Layers size={16} />}
              title="Homepage Grid Builder"
              desc="Add, delete, or reorder visual sections on your homepage (banners, feature grids, FAQs, newsletter signups)."
              onAction={() => deepLink("settings", "homepage")}
            />
            <FeatureLinkCard
              icon={<FileText size={16} />}
              title="Pages Manager"
              desc="Create or edit storefront subpages, and customize their copy, layouts, or visual content."
              onAction={() => deepLink("pages")}
            />
            <FeatureLinkCard
              icon={<Globe size={16} />}
              title="SEO & Metadata"
              desc="Provide search engine details like titles, metadata descriptions, and share images for better rankings."
              onAction={() => deepLink("seo")}
            />
          </div>
        )}

        {subTab === "advanced" && (
          <div className="space-y-4">
            <FeatureLinkCard
              icon={<CommandIcon size={16} />}
              title="Command Palette (Ctrl + K)"
              desc="Type commands to change viewport devices, apply theme styles, search settings, or publish drafts."
              onAction={() => setShowCommandPalette(true)}
            />
            <FeatureLinkCard
              icon={<Code2 size={16} />}
              title="Developer Custom Code"
              desc="Inject custom styling rules (CSS) or header scripts (JS) directly into the storefront execution context."
              onAction={() => deepLink("code")}
            />
            <FeatureLinkCard
              icon={<Clock size={16} />}
              title="Version Snapshots"
              desc="Browse auto-saved versions, preview past themes, and restore files to an earlier snapshot instantly."
              onAction={() => deepLink("history")}
            />
          </div>
        )}

        {subTab === "faq" && (
          <div className="space-y-5">
            {/* FAQ Search */}
            <input
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search help topics..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-[10px] text-white outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-800 tracking-widest italic"
            />

            {filteredFaqs.length > 0 ? (
              <div className="space-y-4">
                {filteredFaqs.map((faq, i) => (
                  <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-wide italic">
                      Q: {faq.q}
                    </p>
                    <p className="text-[9px] text-slate-500 leading-relaxed font-bold">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-center text-slate-600 font-bold uppercase tracking-widest py-8">
                No matching topics found
              </p>
            )}
          </div>
        )}
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
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [hasCheckedMobile, setHasCheckedMobile] = useState(false);
  const [pastDesigns, setPastDesigns] = useState<any[]>([]);
  const [futureDesigns, setFutureDesigns] = useState<any[]>([]);

  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  // Click-to-edit: section instance requested from the preview, and the one currently highlighted.
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [designSurface, setDesignSurface] = useState<string>("heroPage");
  const [previewMode, setPreviewMode] = useState<
    "homepage" | "shop" | "product" | "collection" | "page" | "wishlist" | "account" | "cart"
  >("homepage");
  const [previewBooks, setPreviewBooks] = useState<any[]>([]);
  const [previewBookSlug, setPreviewBookSlug] = useState<string>("test");
  const [previewPageSlug, setPreviewPageSlug] = useState<string>("");
  const [previewCollectionSlug, setPreviewCollectionSlug] = useState<string>("publications");
  const [activeTab, setActiveTab] = useState<string>("settings");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settingsSearch, setSettingsSearch] = useState("");
  const [settingsSubTab, setSettingsSubTab] = useState<"sections" | "theme">("sections");
  const [isFullscreen, setIsFullscreen] = useState(false);
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
  // ── Before/After compare: hold the button to flash the last-saved design ──
  const [comparing, setComparing] = useState(false);
  // ── Command palette (Ctrl+K) ──
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    if (device === "mobile") {
      setHasCheckedMobile(true);
    }
  }, [device]);

  const TOUR_STEPS = useMemo(() => [
    {
      title: "Welcome to Theme Editor! 🎨",
      content: "This editor allows you to build a premium, custom storefront in real-time. Let's take a 1-minute quick tour of the features!",
      placement: "center",
      action: () => {}
    },
    {
      title: "Navigation Tabs 🗺️",
      content: "Switch scopes instantly: 'Design' for styles, 'Pages' for custom routing, 'Code' for style/script injection, 'Themes' for presets, 'History' for restoring changes, 'Devices' for custom sizes, and 'SEO' for search engine tags.",
      placement: "tabs",
      action: () => {
        setActiveTab("settings");
        setActiveSection(null);
      }
    },
    {
      title: "Settings & Options 🧩",
      content: "Under the Design tab, configure your typography, global page colors, spacing, and specific sections like the Homepage grid, product card style, and buttons.",
      placement: "design-settings",
      action: () => {
        setActiveTab("settings");
        setActiveSection(null);
      }
    },
    {
      title: "Device View Switcher 📱",
      content: "Toggle between Desktop, Tablet, and Mobile viewports. Ensure your layout and text read beautifully on any screen size.",
      placement: "device-switcher",
      action: () => {}
    },
    {
      title: "Command Search ⌨️",
      content: "Press Ctrl + K (or click the 'K' button) to open the Command Palette. Instantly search settings, swap themes, and switch viewports by typing.",
      placement: "command-palette",
      action: () => {}
    },
    {
      title: "Save Draft & Publish ⚡",
      content: "Your modifications auto-save every 30 seconds as drafts. When ready, click 'Publish To Live' to sync with the public storefront, or schedule the launch.",
      placement: "top-actions",
      action: () => {}
    },
    {
      title: "Live Interactive Preview 🚀",
      content: "Double-click text directly inside the canvas to edit, or click sections in the viewport to jump to their settings in the sidebar.",
      placement: "live-preview",
      action: () => {}
    }
  ], [setActiveTab, setActiveSection]);

  useEffect(() => {
    if (tourStep === null) {
      setTargetRect(null);
      return;
    }

    const getTarget = () => {
      const selectors = [
        null, // Welcome Step (center)
        '[data-tour="tabs"]',
        '[data-tour="design-settings"]',
        '[data-tour="device-switcher"]',
        '[data-tour="command-palette"]',
        '[data-tour="top-actions"]',
        '[data-tour="live-preview"]',
      ];
      const sel = selectors[tourStep];
      if (!sel) return null;
      return document.querySelector(sel);
    };

    const updateRect = () => {
      const el = getTarget();
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    
    window.addEventListener("resize", updateRect);
    const timer = setTimeout(updateRect, 150);

    return () => {
      window.removeEventListener("resize", updateRect);
      clearTimeout(timer);
    };
  }, [tourStep]);
  // When comparing or previewing a past version, send THAT to the iframe instead
  const previewDesign = comparing
    ? savedDesign
    : previewingVersion
      ? versionHistory.find((v) => v.id === previewingVersion)?.design ?? design
      : design;

  // ── Undo / Redo via Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }
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
      const update = { type: "THEME_UPDATE", design: previewDesign };
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
  }, [previewDesign]);

  // Listen for preview ready + SECTION_SELECT messages from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "PREVIEW_READY") {
        setIsPreviewReady(true);
        syncPending.current = false;
        try {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "THEME_UPDATE", design: previewDesign },
            window.location.origin
          );
        } catch (_) {}
      }
      // Click-to-select: iframe posts SECTION_SELECT with a panel id and/or a section instance id.
      if (event.data?.type === "SECTION_SELECT" && (event.data?.sectionId || event.data?.instanceId)) {
        setActiveTab("settings");
        const secId = event.data.sectionId;
        const instId = event.data.instanceId;
        const template = PAGE_TEMPLATES.find((tpl) => tpl.id === secId);
        if (template) {
          setDesignSurface(template.id);
          setPreviewMode(template.previewMode);
        }
        if (instId) {
          setActiveSection(secId === "globalSections" ? "globalSections" : "homepage");
          setPendingSectionId(instId);
          setSelectedInstanceId(instId);
        } else if (secId) {
          setActiveSection(secId);
        }
      }
      // Inline text editing: iframe double-click posts TEXT_EDIT with {field, value, blockId?}
      if (event.data?.type === "TEXT_EDIT" && event.data?.sectionId && event.data?.settingKey) {
        const sectionId = event.data.sectionId as string;
        const settingKey = event.data.settingKey as string;
        const value = event.data.value;
        const blockId = event.data.blockId as string | null | undefined;

        // Helper: apply either a block-level or section-level write to a single section,
        // mirroring the existing settings-spread for the non-block (section-level) path.
        const applyEdit = (s: any) => {
          if (s.id !== sectionId) return s;
          if (!blockId) {
            return { ...s, settings: { ...(s.settings || {}), [settingKey]: value } };
          }
          const blocksKey = getBlocksKey(s.type);
          const blocks = (s[blocksKey] || []) as any[];
          let blockIdx = blocks.findIndex((b: any) => b?.id === blockId);
          if (blockIdx < 0) {
            const fallbackMatch = /^block-(\d+)$/.exec(blockId);
            if (fallbackMatch) {
              const idx = parseInt(fallbackMatch[1], 10);
              if (idx >= 0 && idx < blocks.length && !blocks[idx]?.id) {
                blockIdx = idx;
              }
            }
          }
          if (blockIdx < 0) {
            // No matching block found — leave the section untouched rather than
            // mis-writing settings under a block-shaped key.
            return s;
          }
          return {
            ...s,
            [blocksKey]: blocks.map((b: any, i: number) => (i === blockIdx ? { ...b, [settingKey]: value } : b)),
          };
        };

        // 1. Check in global sections first
        const globalSectionsList = (design?.globalSections || []) as any[];
        const isGlobalSection = globalSectionsList.some((s: any) => s.id === sectionId);
        if (isGlobalSection) {
          const updated = globalSectionsList.map((s: any) => applyEdit(s));
          update("globalSections", updated, true);
        } else {
          // 2. Find the page-template surface that owns the clicked section.
          const owningTemplate = PAGE_TEMPLATES.find((tpl) =>
            ((design?.[tpl.id]?.sections || design?.[tpl.id]?.homepageSections || []) as any[]).some((s: any) => s.id === sectionId),
          );
          const surfaceId = owningTemplate?.id || designSurface;
          const sections = (design?.[surfaceId]?.sections || design?.[surfaceId]?.homepageSections || []) as any[];
          const updated = sections.map((s: any) => applyEdit(s));
          setDesignSurface(surfaceId);
          setDesign((prev: any) => ({
            ...prev,
            [surfaceId]: { ...(prev?.[surfaceId] || {}), sections: updated },
          }));
          setSaved(false);
          setSaveStatus("unsaved");
        }
      }
      if (event.data?.type === "SECTION_REORDER" && event.data?.dragId && event.data?.dropId) {
        const dragId = String(event.data.dragId);
        const dropId = String(event.data.dropId);
        const position = event.data.position === "after" ? "after" : "before";
        const reorder = (list: any[]) => {
          const from = list.findIndex((s: any) => s.id === dragId);
          const to = list.findIndex((s: any) => s.id === dropId);
          if (from < 0 || to < 0 || from === to) return list;
          const next = [...list];
          const [moved] = next.splice(from, 1);
          const targetIndex = next.findIndex((s: any) => s.id === dropId);
          next.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, moved);
          return next;
        };
        const globalSectionsList = (design?.globalSections || []) as any[];
        if (globalSectionsList.some((s: any) => s.id === dragId) && globalSectionsList.some((s: any) => s.id === dropId)) {
          update("globalSections", reorder(globalSectionsList), true);
          return;
        }
        const owningTemplate = PAGE_TEMPLATES.find((tpl) => {
          const list = (design?.[tpl.id]?.sections || design?.[tpl.id]?.homepageSections || []) as any[];
          return list.some((s: any) => s.id === dragId) && list.some((s: any) => s.id === dropId);
        });
        if (owningTemplate) {
          const surfaceId = owningTemplate.id;
          const list = (design?.[surfaceId]?.sections || design?.[surfaceId]?.homepageSections || []) as any[];
          setDesignSurface(surfaceId);
          setPreviewMode(owningTemplate.previewMode);
          setDesign((prev: any) => ({
            ...prev,
            [surfaceId]: { ...(prev?.[surfaceId] || {}), sections: reorder(list) },
          }));
          setSaved(false);
          setSaveStatus("unsaved");
          toast.success("Section reordered from live preview");
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [design, previewDesign, designSurface]);

  // Echo the selected section instance back to the preview so it stays highlighted.
  useEffect(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "HIGHLIGHT_SECTION", instanceId: selectedInstanceId },
        window.location.origin,
      );
    } catch (_) {}
  }, [selectedInstanceId, isPreviewReady, previewMode]);

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
  // ── Scheduled publishing ──
  const [scheduledAt, setScheduledAt] = useState<string | null>(settings?.scheduledPublish?.at || null);
  const [scheduleInput, setScheduleInput] = useState("");

  const schedulePublish = async () => {
    if (!scheduleInput) return;
    const at = new Date(scheduleInput).toISOString();
    try {
      await adminApi.schedulePublish(design, at);
      setScheduledAt(at);
      setShowPublishModal(false);
      setScheduleInput("");
    } catch {
      alert("Could not schedule the publish");
    }
  };

  const cancelSchedule = async () => {
    try {
      await adminApi.cancelScheduledPublish();
      setScheduledAt(null);
    } catch {
      alert("Could not cancel the scheduled publish");
    }
  };

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
    toast.success("Undone!", { id: "editor-history", icon: "↩️" });
  };

  const redo = () => {
    if (futureDesigns.length === 0) return;
    const [next, ...rest] = futureDesigns;
    setFutureDesigns(rest);
    setPastDesigns((prev) => [...prev.slice(-74), design]);
    setDesign(next);
    setSaved(false);
    toast.success("Redone!", { id: "editor-history", icon: "↪️" });
  };

  // ── Keyboard shortcuts: Ctrl+Z (undo) and Ctrl+Y (redo) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (cmdOrCtrl) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pastDesigns, futureDesigns, design]);

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
      id: "menus",
      icon: <LayoutTemplate size={14} />,
      title: "Menus",
      description: "Build nested header and footer navigation menus",
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
      id: "globalSections",
      icon: <Globe size={14} />,
      title: "Global sections",
      description: "Sections that appear on every page, edited once",
      pages: ["both"],
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
      id: "colors",
      icon: <div className="w-4 h-4 rounded bg-gradient-to-br from-red-500 to-blue-500" />,
      title: "Colors",
      description: "Unified theme color settings, color palette configurations, schemes, and generator lab",
      pages: ["both"],
    },
    {
      id: "a11y",
      icon: <ShieldCheck size={14} />,
      title: "Accessibility audit",
      description: "Scan every color pairing for WCAG issues and auto-fix them",
      pages: ["both"],
    },
    {
      id: "tokens",
      icon: <Braces size={14} />,
      title: "Design tokens",
      description: "Export the theme as CSS variables, Tailwind or JSON",
      pages: ["both"],
    },
  ];

  // Visual grouping — Shopify-style categories.
  const SECTION_GROUPS: { label: string; ids: string[] }[] = [
    { label: "Sections", ids: ["homepage", "globalSections", "products"] },
    { label: "Colors & Fonts", ids: ["style", "colors", "textsize"] },
    { label: "Header & Navigation", ids: ["navigation", "menus"] },
    { label: "Layout & Buttons", ids: ["layout", "buttons"] },
    { label: "Content", ids: ["announcements", "social", "translations"] },
    { label: "Advanced", ids: ["a11y", "tokens", "additional"] },
  ];

  // Fine-grained search index: maps individual setting names → the panel that
  // houses them, so a query like "sale", "favorite", "shadow" or "radius"
  // surfaces the right section instead of only matching panel titles.
  const SETTINGS_INDEX: { section: string; label: string; keywords: string }[] = useMemo(() => [
    // Colors
    { section: "colors", label: "Primary accent color", keywords: "accent brand primary highlight" },
    { section: "colors", label: "Background color", keywords: "background page bg" },
    { section: "colors", label: "Text color", keywords: "text foreground font color" },
    { section: "colors", label: "Border color", keywords: "border outline divider" },
    { section: "colors", label: "Link hover color", keywords: "link hover anchor" },
    { section: "colors", label: "Header background & text", keywords: "header nav top bar color" },
    { section: "colors", label: "Button colors", keywords: "button cta color hover" },
    { section: "colors", label: "Badge colors", keywords: "badge tag label color" },
    { section: "colors", label: "Announcement bar colors", keywords: "announcement banner color" },
    { section: "colors", label: "Low inventory color", keywords: "low stock inventory color" },
    { section: "colors", label: "Card / image surface", keywords: "surface card image well panel background" },
    { section: "colors", label: "Raised surface", keywords: "surface raised elevated card" },
    { section: "colors", label: "Overlay / scrim", keywords: "overlay scrim sold out darken" },
    { section: "colors", label: "Success / savings color", keywords: "success savings sale added green" },
    { section: "colors", label: "Favorite / wishlist color", keywords: "favorite wishlist heart" },
    { section: "colors", label: "Secondary accent color", keywords: "secondary accent cyan" },
    { section: "colors", label: "Warning color", keywords: "warning amber caution" },
    { section: "colors", label: "Danger / error color", keywords: "danger error invalid red" },
    { section: "colors", label: "Muted / secondary text", keywords: "muted secondary subtle gray slate text" },
    { section: "colors", label: "Active control colors", keywords: "active selected tab toggle" },
    { section: "colors", label: "Color schemes", keywords: "scheme palette section colors" },
    // Typography
    { section: "style", label: "Body font", keywords: "font typeface body family" },
    { section: "style", label: "Heading font", keywords: "font heading title family" },
    { section: "style", label: "Font weight", keywords: "weight bold heading body" },
    { section: "style", label: "Letter spacing", keywords: "letter spacing tracking kerning" },
    { section: "textsize", label: "Base font size", keywords: "font size scale base" },
    { section: "textsize", label: "Line height", keywords: "line height leading" },
    { section: "textsize", label: "Type scale", keywords: "type scale modular ratio heading sizes" },
    // Products
    { section: "products", label: "Product card style", keywords: "product card grid style" },
    { section: "products", label: "Image aspect ratio", keywords: "image aspect ratio product" },
    { section: "products", label: "Product columns", keywords: "columns grid product layout" },
    { section: "products", label: "Sale / new / sold-out badges", keywords: "sale new sold out badge product" },
    { section: "products", label: "Product image shadow & glow", keywords: "shadow glow image product" },
    { section: "products", label: "Related products", keywords: "related recommended products" },
    { section: "products", label: "Trust signals", keywords: "trust signals shipping returns product" },
    { section: "products", label: "Bundle / frequently bought", keywords: "bundle frequently bought together" },
    { section: "products", label: "Add to cart CTA", keywords: "cta add to cart button animation product" },
    // Layout & Buttons
    { section: "layout", label: "Container width", keywords: "container width max layout" },
    { section: "layout", label: "Section spacing", keywords: "spacing section gap layout density" },
    { section: "layout", label: "Card radius", keywords: "radius corner rounded card" },
    { section: "layout", label: "Density", keywords: "density compact spacious rhythm" },
    { section: "buttons", label: "Button style", keywords: "button style solid outline ghost" },
    { section: "buttons", label: "Button radius", keywords: "button radius corner rounded pill" },
    { section: "buttons", label: "Button uppercase & shadow", keywords: "button uppercase shadow" },
    // Header / Nav
    { section: "navigation", label: "Header layout & logo", keywords: "header logo layout sticky transparent" },
    { section: "navigation", label: "Nav link style", keywords: "nav link size weight transform" },
    { section: "menus", label: "Header & footer menus", keywords: "menu navigation links mega footer" },
    // Content
    { section: "announcements", label: "Announcement bar", keywords: "announcement banner marquee" },
    { section: "social", label: "Social links", keywords: "social instagram twitter facebook tiktok" },
    { section: "translations", label: "Labels & copy", keywords: "copy label text cart bag translations strings" },
    // Advanced
    { section: "additional", label: "Animations & effects", keywords: "animation effects glow ambient back to top" },
  ], []);

  const matchedSettingLabels = useMemo(() => {
    const q = settingsSearch.trim().toLowerCase();
    const map: Record<string, string[]> = {};
    if (!q) return map;
    for (const entry of SETTINGS_INDEX) {
      if (entry.label.toLowerCase().includes(q) || entry.keywords.includes(q)) {
        (map[entry.section] ||= []).push(entry.label);
      }
    }
    return map;
  }, [SETTINGS_INDEX, settingsSearch]);

  const filteredSections = useMemo(() => {
    const q = settingsSearch.trim().toLowerCase();
    // When searching, show all matching sections across both contexts —
    // matching panel title/description OR any indexed setting inside it.
    if (q) {
      return SECTIONS.filter((section) =>
        section.title.toLowerCase().includes(q) ||
        section.description.toLowerCase().includes(q) ||
        (matchedSettingLabels[section.id]?.length ?? 0) > 0,
      );
    }
    // When not searching, filter by the active preview mode
    return SECTIONS.filter((section) =>
      section.pages.includes("both") || section.pages.includes(previewMode),
    );
  }, [SECTIONS, settingsSearch, previewMode, matchedSettingLabels]);

  const renderSubPanel = () => {
    switch (activeSection) {
      case "style":         return <StylePanel design={activeDesign} update={update} />;
      case "navigation":    return <NavigationPanel design={activeDesign} update={update} setActiveTab={setActiveTab} setActiveSection={setActiveSection} />;
      case "menus":         return <MenuBuilderPanel design={activeDesign} update={update} pages={pages} />;
      case "homepage":      return (
        <HomepagePanel
          design={activeDesign}
          update={update}
          colorSchemes={design.colorSchemes || DEFAULT_COLOR_SCHEMES}
          requestedSectionId={pendingSectionId}
          onConsumeRequest={() => setPendingSectionId(null)}
          sectionPresets={design.sectionPresets || []}
          onSavePreset={(preset: SectionPreset) => update("sectionPresets", [...(design.sectionPresets || []), preset], true)}
          onDeletePreset={(id: string) => update("sectionPresets", (design.sectionPresets || []).filter((p: SectionPreset) => p.id !== id), true)}
        />
      );
      case "globalSections": return (
        <GlobalSectionsPanel
          design={design}
          update={update}
          colorSchemes={(design.colorSchemes && design.colorSchemes.length > 0) ? design.colorSchemes : DEFAULT_COLOR_SCHEMES}
          requestedSectionId={pendingSectionId}
          onConsumeRequest={() => setPendingSectionId(null)}
        />
      );
      case "products":      return <ProductsPanel design={activeDesign} update={update} />;
      case "layout":        return <LayoutPanel design={activeDesign} update={update} />;
      case "buttons":       return <ButtonsPanel design={activeDesign} update={update} />;
      case "announcements": return <AnnouncementsPanel design={activeDesign} update={update} />;
      case "social":        return <SocialPanel design={activeDesign} update={update} />;
      case "textsize":      return <TextSizingPanel design={activeDesign} update={update} />;
      case "translations":  return <TranslationsPanel design={activeDesign} update={update} />;
      case "additional":    return <AdditionalPanel design={activeDesign} update={update} />;
      case "colors":        return <ColorsPanel design={activeDesign} update={update} colorSchemes={(design.colorSchemes && design.colorSchemes.length > 0) ? design.colorSchemes : DEFAULT_COLOR_SCHEMES} />;
      case "a11y":          return (
        <AccessibilityAuditPanel
          design={activeDesign}
          schemes={(design.colorSchemes && design.colorSchemes.length > 0) ? design.colorSchemes : DEFAULT_COLOR_SCHEMES}
          update={update}
          onFixSchemes={(next: ColorScheme[]) => update("colorSchemes", next, true)}
        />
      );
      case "tokens":        return (
        <DesignTokensPanel
          design={activeDesign}
          schemes={(design.colorSchemes && design.colorSchemes.length > 0) ? design.colorSchemes : DEFAULT_COLOR_SCHEMES}
        />
      );
      default:              return null;
    }
  };

  const renderPagesPanel = () => {
    return <PagesPanel pages={pages} setPages={setPages} design={design} update={update} />;
  };

  const currentSectionTitle = SECTIONS.find(s => s.id === activeSection)?.title || "";

  // ── Command palette actions (Ctrl+K) ──
  const commandActions: CommandAction[] = [
    ...SECTIONS.map((s) => ({
      id: `goto-${s.id}`,
      label: s.title,
      group: "Settings",
      keywords: s.description,
      perform: () => {
        setActiveTab("settings");
        setActiveSection(s.id);
      },
    })),
    ...([
      { id: "pages", label: "Pages" },
      { id: "code", label: "Source / Custom Code" },
      { id: "templates", label: "Theme Library" },
      { id: "history", label: "Version History" },
      { id: "responsive", label: "Breakpoints" },
      { id: "seo", label: "SEO & Metadata" },
    ].map((tab) => ({
      id: `tab-${tab.id}`,
      label: tab.label,
      group: "Views",
      perform: () => {
        setActiveTab(tab.id);
        setActiveSection(null);
      },
    }))),
    ...(["desktop", "tablet", "mobile"] as const).map((d) => ({
      id: `device-${d}`,
      label: `Preview on ${d}`,
      group: "Preview",
      keywords: "device viewport responsive",
      perform: () => setDevice(d),
    })),
    {
      id: "save-draft",
      label: "Save draft",
      group: "Actions",
      hint: "saves without publishing",
      perform: () => handleSave({ publish: false }),
    },
    {
      id: "publish",
      label: "Publish to live",
      group: "Actions",
      hint: "opens confirmation",
      perform: () => setShowPublishModal(true),
    },
    { id: "undo", label: "Undo last change", group: "Actions", hint: "Ctrl+Z", perform: undo },
    { id: "redo", label: "Redo change", group: "Actions", hint: "Ctrl+Y", perform: redo },
    {
      id: "toggle-sync",
      label: syncPreview ? "Pause live preview sync" : "Resume live preview sync",
      group: "Actions",
      perform: () => setSyncPreview((prev) => !prev),
    },
    {
      id: "surprise-me",
      label: "Surprise me — remix colors and fonts",
      group: "Actions",
      keywords: "random shuffle generate theme",
      perform: () => {
        surpriseMe(update);
        toast.success("Remixed theme styling!", { icon: "🎨" });
      },
    },
    ...THEME_LIBRARY.map((theme) => ({
      id: `theme-${theme.id}`,
      label: `Apply theme: ${theme.name}`,
      group: "Theme Library",
      keywords: theme.mood,
      perform: () => applyThemePreset(update, theme),
    })),
  ];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#050506] text-white overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* ── Top bar ── */}
      <div className={`transition-all duration-500 ease-in-out flex items-center justify-between px-8 flex-shrink-0 border-b border-white/5 z-50 ${isFullscreen ? "h-0 opacity-0 overflow-hidden border-none pointer-events-none" : "h-20 bg-black/40 backdrop-blur-3xl"}`}>
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
              {scheduledAt && new Date(scheduledAt).getTime() > Date.now() && (
                <span className="flex items-center gap-1.5 text-[8px] font-black tracking-widest px-3 py-1 rounded-full border uppercase italic bg-amber-500/10 text-amber-300 border-amber-500/20">
                  <Clock size={9} />
                  Goes live {new Date(scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  <button onClick={cancelSchedule} title="Cancel scheduled publish" className="ml-1 hover:text-white transition-colors">
                    <X size={9} strokeWidth={3} />
                  </button>
                </span>
              )}
            </div>
          </div>
          
          <div className="h-8 w-px bg-white/10 mx-2" />
          
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={pastDesigns.length === 0}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all disabled:opacity-10 relative"
              title={`Undo (${pastDesigns.length} steps) — Ctrl+Z`}
            >
              <ChevronLeft size={18} strokeWidth={3} />
              {pastDesigns.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full scale-90 border border-black/50">
                  {pastDesigns.length}
                </span>
              )}
            </button>
            <button
              onClick={redo}
              disabled={futureDesigns.length === 0}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all disabled:opacity-10 relative"
              title={`Redo (${futureDesigns.length} steps) — Ctrl+Y`}
            >
              <ChevronRight size={18} strokeWidth={3} />
              {futureDesigns.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-cyan-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full scale-90 border border-black/50">
                  {futureDesigns.length}
                </span>
              )}
            </button>
          </div>

          {/* Theme import / export */}
          <ThemeIOButtons
            design={design}
            onDuplicate={(next) => {
              setPastDesigns((prev) => [...prev.slice(-74), design]);
              setFutureDesigns([]);
              setDesign(next);
              setSaveStatus("unsaved");
              toast.success("Theme duplicated as an unpublished draft", { id: "theme-duplicate" });
            }}
            onImport={(next) => {
              setPastDesigns((prev) => [...prev.slice(-74), design]);
              setFutureDesigns([]);
              setDesign(next);
              setSaveStatus("unsaved");
            }}
          />

          {/* Hold to flash the last-saved design in the preview */}
          <button
            onMouseDown={() => setComparing(true)}
            onMouseUp={() => setComparing(false)}
            onMouseLeave={() => setComparing(false)}
            onTouchStart={() => setComparing(true)}
            onTouchEnd={() => setComparing(false)}
            disabled={!hasChanges}
            title="Hold to preview the last-saved design — release to come back"
            className={`px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase border transition-all flex items-center gap-2 italic select-none ${
              comparing
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                : hasChanges
                ? "bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10"
                : "bg-white/5 text-slate-700 border-white/5 opacity-40 cursor-not-allowed"
            }`}
          >
            <GitCompare size={12} strokeWidth={2.5} />
            {comparing ? "Saved version" : "Compare"}
          </button>

          {/* Command palette launcher */}
          <button
            data-tour="command-palette"
            onClick={() => setShowCommandPalette(true)}
            title="Open command palette (Ctrl+K)"
            className="px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 italic"
          >
            <CommandIcon size={12} strokeWidth={2.5} />
            <span>K</span>
          </button>

          <button
            onClick={() => setSyncPreview((prev) => !prev)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase border transition-all flex items-center gap-2 italic ${
              syncPreview 
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]" 
                : "bg-white/5 text-slate-500 border-white/5"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${syncPreview ? "bg-cyan-400 animate-pulse" : "bg-slate-700"}`} />
            {syncPreview ? "Sync on" : "Sync off"}
          </button>
        </div>

        {/* Device switcher */}
        <div data-tour="device-switcher" className="flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-2xl p-1.5 backdrop-blur-xl shadow-2xl">
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
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all relative group/btn ${
              isFullscreen
                ? "bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-[0_0_12px_rgba(124,58,237,0.1)]"
                : "text-slate-500 border-transparent hover:text-slate-300"
            }`}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
          >
            {isFullscreen ? <Minimize2 size={14} strokeWidth={2.5} /> : <Maximize2 size={14} strokeWidth={2.5} />}
            <span className="text-[9px] font-black uppercase tracking-widest italic">{isFullscreen ? "Exit" : "Full"}</span>
          </button>
        </div>

        {/* Actions */}
        <div data-tour="top-actions" className="flex items-center gap-4">
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

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        actions={commandActions}
      />

      {/* ── Interactive Tour Portal ── */}
      {tourStep !== null && (
        <div className="fixed inset-0 z-[1000] overflow-hidden pointer-events-none">
          {/* Highlight SVG Mask */}
          <svg className="absolute inset-0 w-full h-full pointer-events-auto">
            <defs>
              <mask id="tour-mask-cutout">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {targetRect && (
                  <rect
                    x={targetRect.left - 8}
                    y={targetRect.top - 8}
                    width={targetRect.width + 16}
                    height={targetRect.height + 16}
                    rx="16"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(5, 5, 6, 0.75)"
              mask="url(#tour-mask-cutout)"
              onClick={() => setTourStep(null)}
            />
          </svg>

          {/* Tour Dialog Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={(() => {
              if (targetRect) {
                let left = targetRect.left + (targetRect.width / 2) - 175;
                let top = targetRect.bottom + 20;

                if (targetRect.left < 400) {
                  left = targetRect.right + 20;
                  top = targetRect.top + (targetRect.height / 2) - 100;
                } else if (targetRect.right > window.innerWidth - 400) {
                  left = targetRect.left - 370;
                  top = targetRect.top + (targetRect.height / 2) - 100;
                }

                // Bound checks
                left = Math.max(20, Math.min(window.innerWidth - 370, left));
                top = Math.max(20, Math.min(window.innerHeight - 250, top));

                return {
                  position: "fixed",
                  left: `${left}px`,
                  top: `${top}px`,
                  width: "350px",
                };
              }
              return {
                position: "fixed",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: "420px",
              };
            })()}
            className="pointer-events-auto bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col z-[1001]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-cyan-600/10 pointer-events-none" />
            <div className="p-8 relative z-10 space-y-5">
              <div className="flex justify-between items-start gap-4">
                <h3 className="text-lg font-black text-white tracking-tight uppercase italic leading-tight">
                  {TOUR_STEPS[tourStep].title}
                </h3>
                <button
                  onClick={() => setTourStep(null)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X size={16} strokeWidth={3} />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                {TOUR_STEPS[tourStep].content}
              </p>

              <div className="flex items-center justify-between pt-3">
                <span className="text-[9px] font-black text-slate-600 tracking-wider">
                  STEP {tourStep + 1} OF {TOUR_STEPS.length}
                </span>

                <div className="flex gap-2">
                  {tourStep > 0 && (
                    <button
                      onClick={() => {
                        const prevStep = tourStep - 1;
                        TOUR_STEPS[prevStep].action?.();
                        setTourStep(prevStep);
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const nextStep = tourStep + 1;
                      if (nextStep < TOUR_STEPS.length) {
                        TOUR_STEPS[nextStep].action?.();
                        setTourStep(nextStep);
                      } else {
                        setTourStep(null);
                      }
                    }}
                    className="px-5 py-2 bg-white text-black hover:bg-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all shadow-xl"
                  >
                    {tourStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

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
                    Publish Now
                  </button>

                  {/* Schedule for later */}
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3 text-left">
                    <p className="text-[9px] font-black tracking-[0.3em] text-amber-400 uppercase italic flex items-center gap-2">
                      <Clock size={11} /> Or schedule for later
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={scheduleInput}
                        min={new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)}
                        onChange={(e) => setScheduleInput(e.target.value)}
                        className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-[11px] font-bold text-slate-200 outline-none focus:border-amber-500/50 [color-scheme:dark]"
                      />
                      <button
                        onClick={schedulePublish}
                        disabled={!scheduleInput}
                        className="px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all disabled:opacity-30"
                      >
                        Schedule
                      </button>
                    </div>
                    <p className="text-[8px] text-slate-600 font-bold leading-relaxed">
                      The current design goes live automatically at this time — shoppers see it the moment it passes.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="w-full py-4 text-[11px] font-black text-slate-500 tracking-[0.3em] uppercase italic hover:text-white transition-colors"
                  >
                    Cancel
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
        <div className={`transition-all duration-500 ease-in-out flex flex-col border-r border-white/5 flex-shrink-0 z-10 relative overflow-hidden bg-black/20 backdrop-blur-3xl ${isFullscreen ? "w-0 opacity-0 border-none pointer-events-none" : "w-[380px]"}`}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          {/* Tab nav — compact pill grid so every label stays readable */}
          <div data-tour="tabs" className="grid grid-cols-4 gap-1.5 p-3 border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-10">
            {(
              [
                { id: "settings",   icon: <Settings size={13} />,       label: "Design" },
                { id: "pages",      icon: <FileText size={13} />,        label: "Pages" },
                { id: "code",       icon: <Code2 size={13} />,           label: "Code" },
                { id: "templates",  icon: <LayoutTemplate size={13} />,  label: "Themes" },
                { id: "history",    icon: <Clock size={13} />,           label: "History" },
                { id: "responsive", icon: <Smartphone size={13} />,      label: "Devices" },
                { id: "seo",        icon: <Globe size={13} />,           label: "SEO" },
                { id: "guide",      icon: <HelpCircle size={13} />,      label: "Guide" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setActiveSection(null); }}
                className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[9px] font-bold tracking-[0.04em] uppercase transition-all border ${
                  activeTab === tab.id
                    ? "bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-[0_0_14px_rgba(124,58,237,0.15)]"
                    : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/[0.04]"
                }`}
              >
                {tab.icon}
                {tab.label}
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
                    <div data-tour="design-settings" className="flex-1 overflow-y-auto custom-scrollbar">
                      {/* Options header */}
                      <div className="p-8 pb-4">
                        <span className="text-[10px] font-black tracking-[0.4em] text-violet-500 uppercase italic mb-2 block">Theme Editor</span>
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Theme Settings</h2>

                        {/* Sub-tabs to switch between sections and theme settings */}
                        {!settingsSearch && (
                          <div className="flex bg-white/[0.03] border border-white/5 rounded-2xl p-1 mb-6 relative">
                            <button
                              onClick={() => setSettingsSubTab("sections")}
                              className={`flex-1 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all rounded-xl border ${
                                settingsSubTab === "sections"
                                  ? "bg-violet-600/20 text-violet-300 border-violet-500/30 shadow-[0_0_12px_rgba(124,58,237,0.1)]"
                                  : "text-slate-500 border-transparent hover:text-slate-400"
                              }`}
                            >
                              Sections
                            </button>
                            <button
                              onClick={() => setSettingsSubTab("theme")}
                              className={`flex-1 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all rounded-xl border ${
                                settingsSubTab === "theme"
                                  ? "bg-violet-600/20 text-violet-300 border-violet-500/30 shadow-[0_0_12px_rgba(124,58,237,0.1)]"
                                  : "text-slate-500 border-transparent hover:text-slate-400"
                              }`}
                            >
                              Theme Settings
                            </button>
                          </div>
                        )}

                        {/* Page template pills — Shopify-style template selector */}
                        {!settingsSearch && settingsSubTab === "sections" && (
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
                              {filteredSections.filter(s => s.pages.includes(previewMode) || s.pages.includes("both")).length} settings
                            </p>
                          </div>
                        )}

                        <div className="relative group/search">
                          <input
                            value={settingsSearch}
                            onChange={(e) => setSettingsSearch(e.target.value)}
                            placeholder="Search settings…"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black text-white outline-none focus:border-violet-500/50 transition-all placeholder:text-slate-800 tracking-widest italic"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-800 group-focus-within/search:text-violet-500/50 transition-colors">
                            <Settings size={16} className="animate-[spin_10s_linear_infinite]" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 px-2">
                        {SECTION_GROUPS
                          .filter((group) => {
                            if (settingsSearch) return true; // Show all groups when searching
                            if (settingsSubTab === "sections") {
                              return group.label === "Sections";
                            } else {
                              return group.label !== "Sections";
                            }
                          })
                          .map((group) => {
                            const items = filteredSections.filter((s) => group.ids.includes(s.id));
                            if (items.length === 0) return null;
                            return (
                              <div key={group.label}>
                                <p className="px-6 pb-1.5 text-[8px] font-black tracking-[0.3em] text-slate-600 uppercase">
                                  {group.label}
                                </p>
                                <div className="space-y-1">
                                  {items.map((section) => (
                                    <div key={section.id}>
                                      <SectionRow
                                        icon={section.icon}
                                        title={section.title}
                                        description={section.description}
                                        onClick={() => setActiveSection(section.id)}
                                      />
                                      {settingsSearch && (matchedSettingLabels[section.id]?.length ?? 0) > 0 && (
                                        <div className="flex flex-wrap gap-1.5 px-6 pb-2 pt-1">
                                          {matchedSettingLabels[section.id].map((lbl) => (
                                            <button
                                              key={lbl}
                                              onClick={() => setActiveSection(section.id)}
                                              className="text-[8px] font-black tracking-wider uppercase px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 transition-colors"
                                            >
                                              {lbl}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      
                      {filteredSections.length === 0 && (
                        <div className="p-12 text-center">
                          <p className="text-[10px] font-black text-slate-700 tracking-[0.3em] uppercase italic">No settings match your search</p>
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
              ) : activeTab === "guide" ? (
                <motion.div
                  key="guide"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="p-8 pb-4">
                    <span className="text-[10px] font-black tracking-[0.4em] text-violet-500 uppercase italic mb-2 block">Onboarding & Help</span>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Editor Guide</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <GuidePanel
                      design={activeDesign}
                      setActiveTab={setActiveTab}
                      setActiveSection={setActiveSection}
                      setDevice={setDevice}
                      setShowCommandPalette={setShowCommandPalette}
                      startInteractiveTour={() => setTourStep(0)}
                      hasCheckedMobile={hasCheckedMobile}
                    />
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
        <div data-tour="live-preview" className="flex-1 bg-[#0a0a0c] relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.05),transparent_60%)] pointer-events-none" />
          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 hover:border-violet-500/50 hover:bg-violet-600/20 text-white shadow-2xl transition-all duration-300 group hover:scale-105"
              title="Exit Fullscreen"
            >
              <Minimize2 size={14} className="text-violet-400 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-widest">Exit Fullscreen</span>
            </button>
          )}
          <LivePreview
            design={previewDesign}
            device={device}
            previewMode={{
              value: previewMode,
              set: (m: typeof previewMode) => {
                setPreviewMode(m);
                setIsPreviewReady(false);
                if (m === "product") {
                  setActiveTab("settings");
                  setSettingsSubTab("theme");
                  setActiveSection("products");
                } else if (m === "homepage") {
                  setActiveTab("settings");
                  setSettingsSubTab("sections");
                  setActiveSection("homepage");
                } else if (m === "shop") {
                  setActiveTab("settings");
                  setSettingsSubTab("theme");
                  setActiveSection("layout");
                } else if (m === "page") {
                  setActiveTab("pages");
                  setActiveSection(null);
                }
              },
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
