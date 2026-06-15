import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronRight,
  Command,
  Copy,
  Dices,
  Download,
  ImagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import type { ColorScheme } from "../features/site/colorSchemes";

// ─────────────────────────────────────────────────────────────────────────────
// Color math utilities
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeHexForColorInput(hex: string): string {
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

  if (clean.length !== 6) return "#000000";
  return "#" + clean;
}

export function hexToRgbPro(hex: string): [number, number, number] | null {
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

export function rgbToHexPro(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// h in [0,360), s & l in [0,1]
export function hexToHsl(hex: string): [number, number, number] | null {
  const rgb = hexToRgbPro(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHexPro((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function relativeLuminancePro([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatioPro(a: string, b: string): number | null {
  const rgbA = hexToRgbPro(a);
  const rgbB = hexToRgbPro(b);
  if (!rgbA || !rgbB) return null;
  const lA = relativeLuminancePro(rgbA);
  const lB = relativeLuminancePro(rgbB);
  return (Math.max(lA, lB) + 0.05) / (Math.min(lA, lB) + 0.05);
}

// Nudge a foreground color's lightness away from the background until the
// WCAG contrast target is met. Returns the original color if already passing.
export function ensureContrast(background: string, foreground: string, target = 4.5): string {
  const current = contrastRatioPro(background, foreground);
  if (current == null || current >= target) return foreground;
  const bgHsl = hexToHsl(background);
  const fgHsl = hexToHsl(foreground);
  if (!bgHsl || !fgHsl) return foreground;
  const goLighter = bgHsl[2] < 0.5;
  let [h, s, l] = fgHsl;
  for (let i = 0; i < 40; i++) {
    l = goLighter ? Math.min(1, l + 0.025) : Math.max(0, l - 0.025);
    const candidate = hslToHex(h, s, l);
    const ratio = contrastRatioPro(background, candidate);
    if (ratio != null && ratio >= target) return candidate;
  }
  return goLighter ? "#ffffff" : "#000000";
}

function colorDistance(a: string, b: string): number {
  const ra = hexToRgbPro(a);
  const rb = hexToRgbPro(b);
  if (!ra || !rb) return 0;
  return Math.sqrt((ra[0] - rb[0]) ** 2 + (ra[1] - rb[1]) ** 2 + (ra[2] - rb[2]) ** 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette generation — color-theory harmonies from a single brand color
// ─────────────────────────────────────────────────────────────────────────────
export type GeneratedPalette = {
  id: string;
  label: string;
  variant: "light" | "dark";
  bg: string;
  text: string;
  accent: string;
};

export function buildHarmonies(brand: string): GeneratedPalette[] {
  const hsl = hexToHsl(brand);
  if (!hsl) return [];
  const [h, sRaw] = hsl;
  const s = Math.max(0.35, Math.min(0.9, sRaw || 0.6));
  const accent = hslToHex(h, s, 0.55);

  const harmonies: { id: string; label: string; bgHue: number }[] = [
    { id: "mono", label: "Mono", bgHue: h },
    { id: "analogous", label: "Analog", bgHue: h + 30 },
    { id: "complement", label: "Complement", bgHue: h + 180 },
    { id: "triadic", label: "Triadic", bgHue: h + 120 },
    { id: "split", label: "Split", bgHue: h + 150 },
  ];

  const palettes: GeneratedPalette[] = [];
  for (const harmony of harmonies) {
    const lightBg = hslToHex(harmony.bgHue, 0.18, 0.97);
    const lightText = ensureContrast(lightBg, hslToHex(h, 0.35, 0.14), 7);
    palettes.push({
      id: `${harmony.id}-light`,
      label: harmony.label,
      variant: "light",
      bg: lightBg,
      text: lightText,
      accent: ensureContrast(lightBg, accent, 3),
    });
    const darkBg = hslToHex(harmony.bgHue, 0.32, 0.07);
    const darkText = ensureContrast(darkBg, hslToHex(h, 0.12, 0.94), 7);
    palettes.push({
      id: `${harmony.id}-dark`,
      label: harmony.label,
      variant: "dark",
      bg: darkBg,
      text: darkText,
      accent: ensureContrast(darkBg, hslToHex(h, s, 0.62), 3),
    });
  }
  return palettes;
}

export function applyGeneratedPalette(update: (k: string, v: any) => void, palette: GeneratedPalette) {
  update("backgroundColor", palette.bg);
  update("textColor", palette.text);
  update("primaryColor", palette.accent);
  update("themeLibraryPreset", "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Curated font pairings
// ─────────────────────────────────────────────────────────────────────────────
export const FONT_PAIRINGS = [
  { id: "editorial-classic", name: "Editorial Classic", heading: "Playfair Display", body: "Inter", vibe: "Magazine elegance with clean reading text" },
  { id: "modern-studio", name: "Modern Studio", heading: "Syne", body: "DM Sans", vibe: "Artistic display over friendly humanist body" },
  { id: "literary-serif", name: "Literary Serif", heading: "Fraunces", body: "Lora", vibe: "Warm bookish character throughout" },
  { id: "swiss-precision", name: "Swiss Precision", heading: "Montserrat", body: "Inter", vibe: "Geometric confidence with neutral body" },
  { id: "old-world", name: "Old World", heading: "EB Garamond", body: "Cormorant", vibe: "Heritage serif pairing for luxury brands" },
  { id: "tech-mono", name: "Tech Mono", heading: "Space Mono", body: "DM Sans", vibe: "Technical headlines, approachable copy" },
  { id: "bold-impact", name: "Bold Impact", heading: "Bebas Neue", body: "Outfit", vibe: "Poster-sized statements with soft geometry" },
  { id: "soft-contrast", name: "Soft Contrast", heading: "Cormorant", body: "Montserrat", vibe: "High-contrast serif against sturdy sans" },
];

function PairingFontLoader({ font }: { font: string }) {
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

export function FontPairingsGrid({ design, update }: { design: any; update: (k: string, v: any) => void }) {
  const activeId = FONT_PAIRINGS.find(
    (p) => p.heading === (design.headingFont || design.font) && p.body === (design.font || "Inter"),
  )?.id;

  return (
    <div className="grid grid-cols-1 gap-3">
      {FONT_PAIRINGS.map((pair) => {
        const isActive = pair.id === activeId;
        return (
          <button
            key={pair.id}
            onClick={() => {
              update("headingFont", pair.heading);
              update("font", pair.body);
            }}
            className={`w-full rounded-2xl border p-4 text-left transition-all ${
              isActive
                ? "bg-violet-600/20 border-violet-500/50 shadow-[0_0_30px_rgba(124,58,237,0.18)]"
                : "bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.06]"
            }`}
          >
            <PairingFontLoader font={pair.heading} />
            <PairingFontLoader font={pair.body} />
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-[18px] leading-tight text-white" style={{ fontFamily: `'${pair.heading}', serif` }}>
                {pair.name}
              </p>
              {isActive && <Check size={14} className="text-violet-300 flex-shrink-0" strokeWidth={3} />}
            </div>
            <p className="text-[11px] text-slate-300 mb-2" style={{ fontFamily: `'${pair.body}', sans-serif` }}>
              {pair.vibe}
            </p>
            <p className="text-[8px] font-black tracking-[0.25em] text-slate-600 uppercase">
              {pair.heading} + {pair.body}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Surprise Me — tasteful randomized theme remix
// ─────────────────────────────────────────────────────────────────────────────
export function surpriseMe(update: (k: string, v: any) => void) {
  const hue = Math.floor(Math.random() * 360);
  const brand = hslToHex(hue, 0.55 + Math.random() * 0.35, 0.45 + Math.random() * 0.2);
  const palettes = buildHarmonies(brand);
  const palette = palettes[Math.floor(Math.random() * palettes.length)];
  const pairing = FONT_PAIRINGS[Math.floor(Math.random() * FONT_PAIRINGS.length)];
  applyGeneratedPalette(update, palette);
  update("headingFont", pairing.heading);
  update("font", pairing.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Image palette extraction — pull brand colors out of an uploaded logo/photo
// ─────────────────────────────────────────────────────────────────────────────
export function extractPaletteFromImage(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
          const entry = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
          entry.count += 1;
          entry.r += r;
          entry.g += g;
          entry.b += b;
          buckets.set(key, entry);
        }
        const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
        const swatches: string[] = [];
        for (const entry of sorted) {
          const hex = rgbToHexPro(entry.r / entry.count, entry.g / entry.count, entry.b / entry.count);
          if (swatches.every((existing) => colorDistance(existing, hex) > 56)) swatches.push(hex);
          if (swatches.length >= 6) break;
        }
        resolve(swatches);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image failed to load"));
    };
    img.src = url;
  });
}

// Turn extracted swatches into a usable bg/text/accent trio.
export function themeFromSwatches(swatches: string[]): { bg: string; text: string; accent: string } | null {
  if (swatches.length === 0) return null;
  const withMeta = swatches
    .map((hex) => {
      const rgb = hexToRgbPro(hex);
      const hsl = hexToHsl(hex);
      if (!rgb || !hsl) return null;
      return { hex, lum: relativeLuminancePro(rgb), sat: hsl[1] };
    })
    .filter((s): s is { hex: string; lum: number; sat: number } => s != null);
  if (withMeta.length === 0) return null;

  const byLum = [...withMeta].sort((a, b) => a.lum - b.lum);
  const darkest = byLum[0];
  const lightest = byLum[byLum.length - 1];
  // Prefer the more extreme end as the background so text can breathe.
  const bg = lightest.lum > 1 - darkest.lum ? lightest.hex : darkest.hex;
  const accentCandidates = withMeta.filter((s) => s.hex !== bg);
  const accentPool = accentCandidates.length > 0 ? accentCandidates : withMeta;
  const accent = [...accentPool].sort((a, b) => b.sat - a.sat)[0].hex;
  const bgIsLight = (hexToHsl(bg)?.[2] ?? 0) > 0.5;
  const text = ensureContrast(bg, bgIsLight ? "#111111" : "#f5f5f5", 7);
  return { bg, text, accent: ensureContrast(bg, accent, 3) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────
function ProLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-black tracking-[0.3em] text-slate-500 uppercase mb-3">{children}</p>;
}

function ProSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5 last:border-none">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between py-6 text-left group">
        <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] group-hover:text-violet-400 transition-all uppercase italic">
          {title}
        </span>
        <motion.div animate={{ rotate: isOpen ? 90 : 0 }} className="text-slate-600 group-hover:text-violet-400 transition-all">
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
            <div className="pb-8 space-y-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaletteCard({ palette, isActive, onApply }: { palette: GeneratedPalette; isActive: boolean; onApply: () => void }) {
  return (
    <button
      onClick={onApply}
      className={`group rounded-2xl border p-4 text-left transition-all ${
        isActive
          ? "bg-violet-600/20 border-violet-500/50 shadow-[0_0_30px_rgba(124,58,237,0.18)]"
          : "bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex h-10 gap-1.5 mb-3 rounded-xl overflow-hidden border border-white/10" style={{ background: palette.bg }}>
        <div className="flex-1 flex items-center justify-center" style={{ background: palette.bg }}>
          <span className="text-[12px] font-black" style={{ color: palette.text }}>Aa</span>
        </div>
        <div className="w-10" style={{ background: palette.accent }} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-300 italic truncate">{palette.label}</p>
        <span className={`flex-shrink-0 text-[7px] font-black tracking-[0.2em] uppercase px-2 py-0.5 rounded-full border ${
          palette.variant === "dark" ? "bg-black/40 text-slate-400 border-white/10" : "bg-white/80 text-slate-700 border-black/10"
        }`}>
          {palette.variant}
        </span>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Color Lab panel — harmonies, surprise me, image extraction
// ─────────────────────────────────────────────────────────────────────────────
export function PaletteLabPanel({ design, update }: { design: any; update: (k: string, v: any) => void }) {
  const [brandColor, setBrandColor] = useState<string>(design.primaryColor || "#A855F7");
  const [extracting, setExtracting] = useState(false);
  const [extractedSwatches, setExtractedSwatches] = useState<string[]>([]);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const palettes = useMemo(() => buildHarmonies(brandColor), [brandColor]);
  const extractedTheme = useMemo(() => themeFromSwatches(extractedSwatches), [extractedSwatches]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const swatches = await extractPaletteFromImage(file);
      if (swatches.length === 0) throw new Error("No colors found");
      setExtractedSwatches(swatches);
    } catch {
      setExtractError("Could not read colors from that image. Try a PNG or JPG.");
    } finally {
      setExtracting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <ProSection title="Brand Seed Color">
        <div className="space-y-4">
          <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
            Pick one brand color and the lab generates complete, contrast-safe palettes using color theory.
          </p>
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-xl p-2">
            <div className="w-10 h-10 rounded-lg border border-white/10 relative cursor-pointer overflow-hidden flex-shrink-0" style={{ background: brandColor }}>
              <input
                type="color"
                value={normalizeHexForColorInput(brandColor)}
                onChange={(e) => setBrandColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer scale-150"
              />
            </div>
            <input
              type="text"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              onBlur={(e) => setBrandColor(normalizeHexForColorInput(e.target.value))}
              className="flex-1 bg-transparent border-none outline-none text-[11px] font-black text-slate-200 uppercase tracking-widest italic"
              placeholder="#A855F7"
            />
            <button
              onClick={() => setBrandColor(design.primaryColor || "#A855F7")}
              className="text-[8px] font-black tracking-[0.2em] text-slate-500 hover:text-white uppercase px-3 transition-colors"
              title="Use current accent color"
            >
              From Theme
            </button>
          </div>
          <button
            onClick={() => surpriseMe(update)}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-fuchsia-600/20 to-violet-600/20 border border-fuchsia-500/30 rounded-2xl py-4 text-[10px] font-black text-fuchsia-300 hover:text-white hover:border-fuchsia-400/50 transition-all uppercase tracking-[0.25em] italic"
          >
            <Dices size={16} strokeWidth={2.5} />
            Surprise Me — Remix Everything
          </button>
        </div>
      </ProSection>

      <ProSection title="Generated Harmonies">
        <div className="grid grid-cols-2 gap-3">
          {palettes.map((palette) => (
            <PaletteCard
              key={palette.id}
              palette={palette}
              isActive={
                design.backgroundColor === palette.bg &&
                design.textColor === palette.text &&
                design.primaryColor === palette.accent
              }
              onApply={() => applyGeneratedPalette(update, palette)}
            />
          ))}
        </div>
        <p className="text-[8px] text-slate-600 font-bold leading-relaxed">
          Every generated palette is automatically adjusted to pass WCAG AA contrast before it reaches your storefront.
        </p>
      </ProSection>

      <ProSection title="Palette From Image">
        <div className="space-y-4">
          <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
            Upload your logo or a brand photo — the lab extracts its dominant colors and builds a matching theme.
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
            className="w-full flex items-center justify-center gap-3 bg-white/[0.05] border border-white/10 rounded-2xl py-4 text-[10px] font-black text-slate-400 hover:text-white hover:border-violet-500/30 transition-all uppercase tracking-[0.25em] italic disabled:opacity-50"
          >
            {extracting ? <RefreshCw size={16} className="animate-spin text-violet-400" strokeWidth={2.5} /> : <ImagePlus size={16} className="text-violet-400" strokeWidth={2.5} />}
            {extracting ? "Reading Colors..." : "Upload Brand Image"}
          </button>
          {extractError && (
            <p className="text-[9px] text-rose-400 font-bold">{extractError}</p>
          )}
          {extractedSwatches.length > 0 && (
            <div className="space-y-4">
              <div>
                <ProLabel>Extracted Colors</ProLabel>
                <div className="flex gap-2">
                  {extractedSwatches.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => update("primaryColor", hex)}
                      title={`${hex} — click to use as accent`}
                      className="flex-1 h-10 rounded-xl border border-white/10 hover:border-white/40 transition-all hover:scale-105"
                      style={{ background: hex }}
                    />
                  ))}
                </div>
                <p className="text-[8px] text-slate-600 font-bold mt-2">Click any swatch to set it as your accent color</p>
              </div>
              {extractedTheme && (
                <button
                  onClick={() => {
                    update("backgroundColor", extractedTheme.bg);
                    update("textColor", extractedTheme.text);
                    update("primaryColor", extractedTheme.accent);
                    update("themeLibraryPreset", "");
                  }}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.25em] italic border border-white/10 transition-all hover:border-white/30"
                  style={{ background: extractedTheme.bg, color: extractedTheme.text }}
                >
                  <Wand2 size={14} strokeWidth={2.5} style={{ color: extractedTheme.accent }} />
                  Apply As Full Theme
                </button>
              )}
            </div>
          )}
        </div>
      </ProSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility Auditor — full-theme WCAG scan with one-click fixes
// ─────────────────────────────────────────────────────────────────────────────
type AuditIssue = {
  id: string;
  severity: "fail" | "warn";
  title: string;
  detail: string;
  fg: string;
  bg: string;
  fix?: () => void;
};

export function AccessibilityAuditPanel({
  design,
  schemes,
  update,
  onFixSchemes,
}: {
  design: any;
  schemes: ColorScheme[];
  update: (k: string, v: any) => void;
  onFixSchemes: (next: ColorScheme[]) => void;
}) {
  const bg = design.backgroundColor || "#030213";
  const text = design.textColor || "#ffffff";
  const accent = design.primaryColor || "#A855F7";

  const { issues, checkCount } = useMemo(() => {
    const list: AuditIssue[] = [];
    let checks = 0;

    const checkPair = (
      id: string,
      title: string,
      pairBg: string,
      pairFg: string,
      target: number,
      detailLabel: string,
      fix?: () => void,
    ) => {
      const ratio = contrastRatioPro(pairBg, pairFg);
      checks += 1;
      if (ratio == null) return;
      if (ratio < target) {
        list.push({
          id,
          severity: ratio < target * 0.66 ? "fail" : "warn",
          title,
          detail: `${detailLabel} — contrast ${ratio.toFixed(2)}:1, needs ${target}:1`,
          fg: pairFg,
          bg: pairBg,
          fix,
        });
      }
    };

    checkPair("body-text", "Body text on background", bg, text, 4.5, "Main storefront copy", () =>
      update("textColor", ensureContrast(bg, text, 4.5)),
    );
    checkPair("accent-on-bg", "Accent color on background", bg, accent, 3, "Buttons, links and highlights", () =>
      update("primaryColor", ensureContrast(bg, accent, 3)),
    );

    const whiteOnAccent = contrastRatioPro(accent, "#ffffff");
    const blackOnAccent = contrastRatioPro(accent, "#000000");
    checks += 1;
    if (whiteOnAccent != null && blackOnAccent != null && whiteOnAccent < 4.5 && blackOnAccent < 4.5) {
      list.push({
        id: "button-label",
        severity: "warn",
        title: "Button label legibility",
        detail: `Neither white (${whiteOnAccent.toFixed(2)}:1) nor black (${blackOnAccent.toFixed(2)}:1) text reads clearly on your accent color`,
        fg: whiteOnAccent > blackOnAccent ? "#ffffff" : "#000000",
        bg: accent,
      });
    }

    if (design.showAnnouncement) {
      checkPair(
        "announcement",
        "Announcement bar",
        design.announcementBg || "#000000",
        design.announcementColor || "#ffffff",
        4.5,
        "Banner message text",
        () => update("announcementColor", ensureContrast(design.announcementBg || "#000000", design.announcementColor || "#ffffff", 4.5)),
      );
    }

    schemes.forEach((scheme) => {
      checkPair(
        `scheme-text-${scheme.id}`,
        `Scheme "${scheme.name}" text`,
        scheme.background,
        scheme.text,
        4.5,
        "Section text in this color scheme",
        () =>
          onFixSchemes(
            schemes.map((s) => (s.id === scheme.id ? { ...s, text: ensureContrast(s.background, s.text, 4.5) } : s)),
          ),
      );
      checkPair(
        `scheme-accent-${scheme.id}`,
        `Scheme "${scheme.name}" accent`,
        scheme.background,
        scheme.accent,
        3,
        "Accent elements in this color scheme",
        () =>
          onFixSchemes(
            schemes.map((s) => (s.id === scheme.id ? { ...s, accent: ensureContrast(s.background, s.accent, 3) } : s)),
          ),
      );
    });

    return { issues: list, checkCount: checks };
  }, [design, schemes, bg, text, accent, update, onFixSchemes]);

  const fails = issues.filter((i) => i.severity === "fail").length;
  const warns = issues.filter((i) => i.severity === "warn").length;
  const score = Math.max(0, 100 - fails * 15 - warns * 5);
  const scoreTone = score >= 90 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-rose-400";
  const ringTone = score >= 90 ? "#34d399" : score >= 70 ? "#fbbf24" : "#fb7185";

  return (
    <div className="space-y-8">
      {/* Score card */}
      <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="relative w-28 h-28 mx-auto mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={ringTone} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-black ${scoreTone}`}>{score}</span>
              <span className="text-[7px] font-black tracking-[0.3em] text-slate-600 uppercase">Score</span>
            </div>
          </div>
          <p className="text-[11px] font-black text-white uppercase tracking-widest italic mb-1">
            {issues.length === 0 ? "Fully Accessible" : `${issues.length} Issue${issues.length === 1 ? "" : "s"} Found`}
          </p>
          <p className="text-[9px] text-slate-500 font-bold">
            {checkCount} WCAG contrast checks across your entire theme
          </p>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4">
          <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" strokeWidth={2.5} />
          <p className="text-[10px] text-emerald-300 font-bold leading-relaxed">
            Every color pairing in your theme passes WCAG AA. Customers with low vision can read everything comfortably.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`rounded-2xl border px-4 py-4 ${
                issue.severity === "fail" ? "border-rose-500/30 bg-rose-500/5" : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-[13px] font-black"
                  style={{ background: issue.bg, color: issue.fg }}
                >
                  Aa
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-black text-white uppercase tracking-wide italic truncate">{issue.title}</p>
                    <span className={`flex-shrink-0 text-[7px] font-black tracking-[0.2em] uppercase px-2 py-0.5 rounded-full ${
                      issue.severity === "fail" ? "bg-rose-500/20 text-rose-300" : "bg-amber-500/20 text-amber-300"
                    }`}>
                      {issue.severity === "fail" ? "Fails AA" : "Borderline"}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold leading-relaxed">{issue.detail}</p>
                </div>
              </div>
              {issue.fix && (
                <button
                  onClick={issue.fix}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-2.5 text-[9px] font-black text-slate-300 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.2em] italic"
                >
                  <Wand2 size={12} strokeWidth={2.5} className="text-violet-400" />
                  Auto-Fix Contrast
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[8px] text-slate-600 font-bold leading-relaxed">
        Auto-fix nudges the offending color's lightness just enough to pass WCAG AA while keeping its hue and character.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Design Tokens exporter — CSS variables / Tailwind v4 / JSON
// ─────────────────────────────────────────────────────────────────────────────
function buildCssTokens(design: any, schemes: ColorScheme[]): string {
  const lines = [
    ":root {",
    `  --color-background: ${design.backgroundColor || "#030213"};`,
    `  --color-text: ${design.textColor || "#ffffff"};`,
    `  --color-accent: ${design.primaryColor || "#A855F7"};`,
    `  --font-body: '${design.font || "Inter"}', sans-serif;`,
    `  --font-heading: '${design.headingFont || design.font || "Inter"}', sans-serif;`,
    `  --radius-card: ${design.cardRadius ?? 8}px;`,
    `  --radius-button: ${design.buttonRadius ?? 999}px;`,
  ];
  schemes.forEach((s) => {
    const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    lines.push(`  --scheme-${slug}-bg: ${s.background};`);
    lines.push(`  --scheme-${slug}-text: ${s.text};`);
    lines.push(`  --scheme-${slug}-accent: ${s.accent};`);
  });
  lines.push("}");
  return lines.join("\n");
}

function buildTailwindTokens(design: any): string {
  return [
    "@theme {",
    `  --color-surface: ${design.backgroundColor || "#030213"};`,
    `  --color-ink: ${design.textColor || "#ffffff"};`,
    `  --color-brand: ${design.primaryColor || "#A855F7"};`,
    `  --font-sans: '${design.font || "Inter"}', sans-serif;`,
    `  --font-display: '${design.headingFont || design.font || "Inter"}', sans-serif;`,
    `  --radius-card: ${design.cardRadius ?? 8}px;`,
    `  --radius-button: ${design.buttonRadius ?? 999}px;`,
    "}",
  ].join("\n");
}

function buildJsonTokens(design: any, schemes: ColorScheme[]): string {
  return JSON.stringify(
    {
      color: {
        background: { value: design.backgroundColor || "#030213" },
        text: { value: design.textColor || "#ffffff" },
        accent: { value: design.primaryColor || "#A855F7" },
        schemes: Object.fromEntries(
          schemes.map((s) => [
            s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            { background: { value: s.background }, text: { value: s.text }, accent: { value: s.accent } },
          ]),
        ),
      },
      font: {
        body: { value: design.font || "Inter" },
        heading: { value: design.headingFont || design.font || "Inter" },
      },
      radius: {
        card: { value: `${design.cardRadius ?? 8}px` },
        button: { value: `${design.buttonRadius ?? 999}px` },
      },
    },
    null,
    2,
  );
}

export function DesignTokensPanel({ design, schemes }: { design: any; schemes: ColorScheme[] }) {
  const [format, setFormat] = useState<"css" | "tailwind" | "json">("css");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    if (format === "css") return buildCssTokens(design, schemes);
    if (format === "tailwind") return buildTailwindTokens(design);
    return buildJsonTokens(design, schemes);
  }, [format, design, schemes]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked — fall back to the download button.
    }
  };

  const handleDownload = () => {
    const ext = format === "json" ? "json" : "css";
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theme-tokens-${format}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
        Export your live theme as portable design tokens — drop them into another project, hand them to a developer, or wire them into a design system.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {([
          { id: "css", label: "CSS Vars" },
          { id: "tailwind", label: "Tailwind" },
          { id: "json", label: "JSON" },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFormat(f.id)}
            className={`py-3 px-2 rounded-xl text-[10px] font-black tracking-widest border transition-all uppercase italic ${
              format === f.id
                ? "bg-violet-600 border-violet-400/50 text-white shadow-xl"
                : "bg-white/[0.03] border-white/5 text-slate-500 hover:border-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <pre className="bg-black/50 border border-white/10 rounded-2xl p-5 text-[10px] leading-relaxed text-emerald-300/90 font-mono overflow-x-auto whitespace-pre max-h-[340px] overflow-y-auto custom-scrollbar">
        {output}
      </pre>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCopy}
          className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] italic border transition-all ${
            copied
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
          }`}
        >
          {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={2.5} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-4 text-[10px] font-black text-slate-300 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.2em] italic"
        >
          <Download size={14} strokeWidth={2.5} />
          Download
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Palette — Ctrl+K fuzzy launcher for every editor action
// ─────────────────────────────────────────────────────────────────────────────
export type CommandAction = {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  hint?: string;
  perform: () => void;
};

export function CommandPalette({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
}) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    const words = q.split(/\s+/);
    return actions.filter((a) => {
      const haystack = `${a.label} ${a.group} ${a.keywords || ""}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  }, [actions, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlighted(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-index="${highlighted}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const run = (action: CommandAction) => {
    onClose();
    action.perform();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const action = filtered[highlighted];
      if (action) run(action);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Group while preserving filter order
  const grouped = useMemo(() => {
    const map = new Map<string, { action: CommandAction; index: number }[]>();
    filtered.forEach((action, index) => {
      const list = map.get(action.group) || [];
      list.push({ action, index });
      map.set(action.group, list);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-md flex items-start justify-center pt-[12vh] px-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="w-full max-w-xl bg-[#0c0c10] border border-white/10 rounded-[2rem] shadow-[0_40px_120px_rgba(124,58,237,0.25)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
              <Search size={16} className="text-violet-400 flex-shrink-0" strokeWidth={2.5} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command — jump to settings, apply themes, save..."
                className="flex-1 bg-transparent border-none outline-none text-[12px] font-bold text-white placeholder:text-slate-700 tracking-wide"
              />
              <kbd className="flex-shrink-0 text-[8px] font-black text-slate-600 bg-white/5 border border-white/10 px-2 py-1 rounded-lg uppercase tracking-widest">Esc</kbd>
            </div>

            <div ref={listRef} className="max-h-[50vh] overflow-y-auto custom-scrollbar py-3">
              {filtered.length === 0 && (
                <p className="px-6 py-8 text-center text-[10px] font-black text-slate-700 tracking-[0.3em] uppercase italic">
                  No matching commands
                </p>
              )}
              {grouped.map(([group, items]) => (
                <div key={group} className="mb-2">
                  <p className="px-6 py-2 text-[8px] font-black tracking-[0.3em] text-slate-600 uppercase">{group}</p>
                  {items.map(({ action, index }) => (
                    <button
                      key={action.id}
                      data-cmd-index={index}
                      onClick={() => run(action)}
                      onMouseEnter={() => setHighlighted(index)}
                      className={`w-full flex items-center justify-between gap-4 px-6 py-3 text-left transition-colors ${
                        index === highlighted ? "bg-violet-600/20" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`text-[11px] font-bold tracking-wide ${index === highlighted ? "text-white" : "text-slate-300"}`}>
                        {action.label}
                      </span>
                      {action.hint && (
                        <span className="flex-shrink-0 text-[8px] font-black text-slate-600 uppercase tracking-widest">{action.hint}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4 text-[8px] font-black text-slate-600 uppercase tracking-widest">
                <span>↑↓ Navigate</span>
                <span>↵ Run</span>
              </div>
              <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-600 uppercase tracking-widest">
                <Command size={10} strokeWidth={3} />
                <span>Theme Command Center</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Convenience icon re-exports so the host file's import list stays short.
export { Dices as DicesIcon, Sparkles as SparklesIcon, X as CloseIcon };
