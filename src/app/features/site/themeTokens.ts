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
  // Secondary accent (cyan), warning (amber), danger/error (rose).
  const accent2 = design?.secondaryColor || "#22d3ee";
  const warning = design?.warningColor || "#f59e0b";
  const danger = design?.dangerColor || "#f43f5e";
  const fgTriplet = hexToRgbTriplet(fg, "255 255 255");

  return [
    `--fg-rgb: ${fgTriplet};`,
    // Border tint: follows the dedicated "Border" color when set, else the
    // foreground. Alpha gradation of each border utility is preserved.
    `--border-rgb: ${hexToRgbTriplet(design?.borderColor, fgTriplet)};`,
    `--overlay-rgb: ${hexToRgbTriplet(overlay, "0 0 0")};`,
    `--surface: ${surface};`,
    `--surface-2: ${surface2};`,
    `--accent: ${accent};`,
    `--accent-rgb: ${hexToRgbTriplet(accent, "168 85 247")};`,
    `--accent-2: ${accent2};`,
    `--accent-2-rgb: ${hexToRgbTriplet(accent2, "34 211 238")};`,
    `--success: ${success};`,
    `--success-rgb: ${hexToRgbTriplet(success, "52 211 153")};`,
    `--warning: ${warning};`,
    `--warning-rgb: ${hexToRgbTriplet(warning, "245 158 11")};`,
    `--danger: ${danger};`,
    `--danger-rgb: ${hexToRgbTriplet(danger, "244 63 94")};`,
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

const FG = "--fg-rgb";
const BORDER = "--border-rgb";
const OVERLAY = "--overlay-rgb";

const PREFIX_PROP: Record<string, string> = {
  text: "color",
  bg: "background-color",
  border: "border-color",
};

// Alpha suffixes as they appear in the storefront Tailwind classes (fraction
// steps like "40" => 0.40, and arbitrary values like "[0.03]" => 0.03).
const WHITE_ALPHAS = [
  "5", "8", "10", "15", "20", "25", "30", "40", "50", "60", "70", "75", "80", "90",
  "[0.01]", "[0.02]", "[0.03]", "[0.04]", "[0.05]", "[0.06]", "[0.07]", "[0.08]", "[0.12]", "[0.14]",
];
const BLACK_ALPHAS = ["20", "30", "40", "50", "60", "65", "70", "75", "80"];

function suffixToAlpha(suffix: string): number {
  if (suffix.startsWith("[")) return parseFloat(suffix.slice(1, -1));
  return parseInt(suffix, 10) / 100;
}

/** Escape a Tailwind class so it can be used as a CSS selector. */
function escapeClass(cls: string): string {
  return cls.replace(/[/[\].]/g, (ch) => "\\" + ch);
}

function buildAlphaRules(
  color: string,
  suffixes: string[],
  varFor: (prefix: string) => string,
): string {
  const rules: string[] = [];
  for (const suffix of suffixes) {
    const alpha = suffixToAlpha(suffix);
    for (const prefix of Object.keys(PREFIX_PROP)) {
      const cls = `${prefix}-${color}/${suffix}`;
      rules.push(
        `[data-fm-store] .${escapeClass(cls)}{${PREFIX_PROP[prefix]}:rgba(var(${varFor(prefix)}), ${alpha});}`,
      );
    }
  }
  return rules.join("\n");
}

// Solid (no-alpha) utility remap for a Tailwind color name → a CSS variable.
function buildSolidRules(color: string, cssVar: string): string {
  return Object.entries(PREFIX_PROP)
    .map(([prefix, prop]) => `[data-fm-store] .${prefix}-${color}{${prop}:var(${cssVar});}`)
    .join("\n");
}

// Map the brand's semantic hues onto tokens so every shade+alpha recolors with
// the theme, exactly like the white/black utilities do:
//   violet / purple -> accent       emerald / green -> success
//   cyan            -> secondary     amber / yellow  -> warning
//   rose            -> danger (error). Favorites use the dedicated fm-favorite-*
//   helpers, so remapping raw rose to danger does not affect the wishlist.
const BRAND_ALPHAS = ["10", "15", "20", "25", "30", "40", "50", "60", "70", "[0.05]", "[0.08]"];
const SHADES = ["300", "400", "500", "600", "700", "900", "950"];

const BRAND_HUES: Array<{ names: string[]; solidVar: string; rgbVar: string }> = [
  { names: ["violet", "purple"], solidVar: "--accent", rgbVar: "--accent-rgb" },
  { names: ["emerald", "green"], solidVar: "--success", rgbVar: "--success-rgb" },
  { names: ["cyan"], solidVar: "--accent-2", rgbVar: "--accent-2-rgb" },
  { names: ["amber", "yellow"], solidVar: "--warning", rgbVar: "--warning-rgb" },
  { names: ["rose", "red"], solidVar: "--danger", rgbVar: "--danger-rgb" },
];

const brandOverrideCss = BRAND_HUES.flatMap(({ names, solidVar, rgbVar }) =>
  names.flatMap((name) =>
    SHADES.flatMap((shade) => [
      buildAlphaRules(`${name}-${shade}`, BRAND_ALPHAS, () => rgbVar),
      buildSolidRules(`${name}-${shade}`, solidVar),
    ]),
  ),
).join("\n");

const alphaOverrideCss = [
  // text/bg follow the foreground; borders follow the Border color token.
  buildAlphaRules("white", WHITE_ALPHAS, (p) => (p === "border" ? BORDER : FG)),
  buildAlphaRules("black", BLACK_ALPHAS, () => OVERLAY),
  brandOverrideCss,
].join("\n");

/**
 * Static stylesheet that wires the Tailwind alpha utilities + a few semantic
 * helper classes onto the token layer. Inject once per storefront surface.
 */
export const STOREFRONT_TOKEN_CSS = `
${alphaOverrideCss}
[data-fm-store] .text-white{color:rgb(var(--fg-rgb));}
[data-fm-store] .bg-white{background-color:rgb(var(--fg-rgb));}
[data-fm-store] .border-white{border-color:rgb(var(--border-rgb));}
[data-fm-store] .fm-page{background-color:var(--bg-color);}
[data-fm-store] .fm-accent-text{color:var(--accent);}
[data-fm-store] .fm-accent-bg{background-color:var(--accent);}
[data-fm-store] .fm-success-text{color:var(--success);}
[data-fm-store] .fm-favorite-text{color:var(--favorite);}
[data-fm-store] .fm-surface{background-color:var(--surface);}
[data-fm-store] .fm-surface-2{background-color:var(--surface-2);}
[data-fm-store] .fm-success-solid{background-color:var(--success);color:var(--on-success);}
[data-fm-store] .fm-active{background-color:var(--active-bg);color:var(--active-fg);}
[data-fm-store] .fm-favorite-active{color:var(--favorite);background-color:rgba(var(--favorite-rgb), 0.1);border-color:rgba(var(--favorite-rgb), 0.4);}
[data-fm-store] .fm-accent-hover-border:hover{border-color:rgba(var(--accent-rgb), 0.3);}
[data-fm-store] .fm-accent-shadow{box-shadow:0 10px 30px rgba(var(--accent-rgb), 0.25);}
`;
