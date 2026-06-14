// ─────────────────────────────────────────────────────────────────────────────
// Semantic theme tokens for the storefront.
//
// This is the shared "token layer" that lets the Theme Editor reach every visual
// surface of the outer-facing app instead of leaving large parts hardcoded.
//
// Two pieces:
//   1. buildStorefrontTokenVars(design) — emits the CSS custom properties
//      (--fg-rgb, --surface, --accent, --success, …) derived from the saved
//      design object, with defaults that preserve the current dark look.
//   2. STOREFRONT_TOKEN_CSS — a static stylesheet that remaps the Tailwind
//      white/black alpha utilities (text-white/40, bg-white/[0.03], border-white/10,
//      bg-black/70, …) onto those tokens. Because the selectors are scoped under
//      [data-fm-store] they out-specify Tailwind's base utilities, so hundreds of
//      previously-hardcoded muted-text / surface / border values become themeable
//      with no per-element edits.
//
// Anything that needs a *solid* brand/status color (sale badge, wishlist, active
// tab, …) reads a token directly via var(--success), var(--favorite), etc.
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a hex or rgb()/rgba() color to an "r g b" triplet for use in rgba(var(--x), a). */
export function hexToRgbTriplet(input?: string, fallback = "255 255 255"): string {
  if (!input) return fallback;
  let c = String(input).trim();

  const rgbMatch = c.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/[,\s/]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const [r, g, b] = parts;
      if ([r, g, b].every((n) => !Number.isNaN(parseInt(n, 10)))) {
        return `${parseInt(r, 10)} ${parseInt(g, 10)} ${parseInt(b, 10)}`;
      }
    }
    return fallback;
  }

  c = c.replace("#", "");
  if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
  if (c.length < 6) return fallback;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return fallback;
  return `${r} ${g} ${b}`;
}

export interface StorefrontTokenInput {
  /** Base foreground (text / icon) color. */
  textColor?: string;
  /** Page background. */
  backgroundColor?: string;
  /** Brand accent. */
  primaryColor?: string;
  /** Solid background for image wells & cards (defaults to near-black). */
  surfaceColor?: string;
  /** Solid background for raised / elevated cards. */
  surfaceRaisedColor?: string;
  /** Success / confirmation color (added-to-cart, savings badge). */
  successColor?: string;
  /** Favorite / wishlist accent. */
  favoriteColor?: string;
  /** Background of an active control (selected tab / variant). */
  activeControlBg?: string;
  /** Text of an active control. */
  activeControlText?: string;
  /** Color used for scrims / overlays (sold-out, image darken). */
  overlayColor?: string;
  [key: string]: any;
}

/**
 * Emit the CSS custom-property declarations (without the wrapping selector) for a
 * design object. Drop the result inside any `[data-fm-store] { … }` rule.
 */
export function buildStorefrontTokenVars(design: StorefrontTokenInput = {}): string {
  const fg = design?.textColor || "#ffffff";
  const bg = design?.backgroundColor || "#050508";
  const accent = design?.primaryColor || "#A855F7";
  const surface = design?.surfaceColor || "#0a0a0a";
  const surface2 = design?.surfaceRaisedColor || "#171717";
  const success = design?.successColor || "#34d399";
  const favorite = design?.favoriteColor || "#fb7185";
  const activeBg = design?.activeControlBg || fg;
  const activeFg = design?.activeControlText || bg;
  const overlay = design?.overlayColor || "#000000";
  const onSuccess = design?.successTextColor || "#ffffff";

  return [
    `--fg-rgb: ${hexToRgbTriplet(fg, "255 255 255")};`,
    `--overlay-rgb: ${hexToRgbTriplet(overlay, "0 0 0")};`,
    `--surface: ${surface};`,
    `--surface-2: ${surface2};`,
    `--accent: ${accent};`,
    `--accent-rgb: ${hexToRgbTriplet(accent, "168 85 247")};`,
    `--success: ${success};`,
    `--success-rgb: ${hexToRgbTriplet(success, "52 211 153")};`,
    `--favorite: ${favorite};`,
    `--favorite-rgb: ${hexToRgbTriplet(favorite, "251 113 133")};`,
    `--active-bg: ${activeBg};`,
    `--active-fg: ${activeFg};`,
    `--on-success: ${onSuccess};`,
  ].join("\n      ");
}

// ── Tailwind alpha-utility remap ─────────────────────────────────────────────
// Each tuple: [tailwind class, css property, alpha, rgb-var]. Scoped under
// [data-fm-store] so it wins over Tailwind's own .text-white/40 etc. Only the
// base (non-variant) utilities are remapped; :hover / :focus variants are left
// untouched so interaction deltas keep working.

type AlphaRule = [string, "color" | "background-color" | "border-color", number, string];

const FG = "--fg-rgb";
const OVERLAY = "--overlay-rgb";

const ALPHA_RULES: AlphaRule[] = [
  // text-white/*
  ["text-white/20", "color", 0.2, FG],
  ["text-white/25", "color", 0.25, FG],
  ["text-white/30", "color", 0.3, FG],
  ["text-white/40", "color", 0.4, FG],
  ["text-white/50", "color", 0.5, FG],
  ["text-white/60", "color", 0.6, FG],
  ["text-white/70", "color", 0.7, FG],
  ["text-white/80", "color", 0.8, FG],
  // bg-white/*
  ["bg-white/5", "background-color", 0.05, FG],
  ["bg-white/20", "background-color", 0.2, FG],
  ["bg-white/30", "background-color", 0.3, FG],
  ["bg-white/[0.01]", "background-color", 0.01, FG],
  ["bg-white/[0.02]", "background-color", 0.02, FG],
  ["bg-white/[0.03]", "background-color", 0.03, FG],
  ["bg-white/[0.06]", "background-color", 0.06, FG],
  // border-white/*
  ["border-white/5", "border-color", 0.05, FG],
  ["border-white/10", "border-color", 0.1, FG],
  ["border-white/20", "border-color", 0.2, FG],
  ["border-white/[0.05]", "border-color", 0.05, FG],
  ["border-white/[0.06]", "border-color", 0.06, FG],
  ["border-white/[0.07]", "border-color", 0.07, FG],
  ["border-white/[0.08]", "border-color", 0.08, FG],
  ["border-white/[0.12]", "border-color", 0.12, FG],
  ["border-white/[0.14]", "border-color", 0.14, FG],
  // bg-black/* (overlays / scrims)
  ["bg-black/20", "background-color", 0.2, OVERLAY],
  ["bg-black/50", "background-color", 0.5, OVERLAY],
  ["bg-black/65", "background-color", 0.65, OVERLAY],
  ["bg-black/70", "background-color", 0.7, OVERLAY],
  ["bg-black/75", "background-color", 0.75, OVERLAY],
  ["bg-black/80", "background-color", 0.8, OVERLAY],
];

/** Escape a Tailwind class so it can be used as a CSS selector. */
function escapeClass(cls: string): string {
  return cls.replace(/[/[\].]/g, (ch) => "\\" + ch);
}

const alphaOverrideCss = ALPHA_RULES.map(
  ([cls, prop, alpha, varName]) =>
    `[data-fm-store] .${escapeClass(cls)}{${prop}:rgba(var(${varName}), ${alpha});}`,
).join("\n");

/**
 * Static stylesheet that wires the Tailwind alpha utilities + a few semantic
 * helper classes onto the token layer. Inject once per storefront surface.
 */
export const STOREFRONT_TOKEN_CSS = `
${alphaOverrideCss}
[data-fm-store] .text-white{color:rgb(var(--fg-rgb));}
[data-fm-store] .bg-white{background-color:rgb(var(--fg-rgb));}
[data-fm-store] .border-white{border-color:rgb(var(--fg-rgb));}
[data-fm-store] .fm-surface{background-color:var(--surface);}
[data-fm-store] .fm-surface-2{background-color:var(--surface-2);}
[data-fm-store] .fm-success-solid{background-color:var(--success);color:var(--on-success);}
[data-fm-store] .fm-active{background-color:var(--active-bg);color:var(--active-fg);}
[data-fm-store] .fm-favorite-active{color:var(--favorite);background-color:rgba(var(--favorite-rgb), 0.1);border-color:rgba(var(--favorite-rgb), 0.4);}
[data-fm-store] .fm-accent-hover-border:hover{border-color:rgba(var(--accent-rgb), 0.3);}
[data-fm-store] .fm-accent-shadow{box-shadow:0 10px 30px rgba(var(--accent-rgb), 0.25);}
`;
