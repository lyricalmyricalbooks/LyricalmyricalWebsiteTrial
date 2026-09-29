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
  // Muted/secondary body text.
  const muted = design?.mutedTextColor || "#94a3b8";
  const fgTriplet = hexToRgbTriplet(fg, "255 255 255");

  // Shadow elevation scale.
  const shadowMap = {
    flat:     '0 0 0 0 rgba(0,0,0,0)',
    subtle:   '0 1px 2px 0 rgba(0,0,0,0.05)',
    medium:   '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    raised:   '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    dramatic: '0 25px 50px -12px rgba(0,0,0,0.25)',
  } as const;
  type ShadowKey = keyof typeof shadowMap;
  const shadowLevels: ShadowKey[] = ['flat', 'subtle', 'medium', 'raised', 'dramatic'];
  const rawShadow = design.shadowScale ?? 'subtle';
  const shadowKey: ShadowKey = rawShadow in shadowMap
    ? (rawShadow as ShadowKey)
    : 'subtle';
  const cardShadow = shadowMap[shadowKey];
  const nextShadowKey = shadowLevels[Math.min(shadowLevels.indexOf(shadowKey) + 1, shadowLevels.length - 1)];
  const cardShadowHover = shadowMap[nextShadowKey];

  // Section spacing scale.
  const spacingMap = {
    compact:  { section: '2rem', card: '1rem',    gap: '0.75rem' },
    normal:   { section: '4rem', card: '1.5rem',  gap: '1rem'    },
    relaxed:  { section: '6rem', card: '2rem',    gap: '1.5rem'  },
    spacious: { section: '8rem', card: '2.5rem',  gap: '2rem'    },
  } as const;
  type SpacingKey = keyof typeof spacingMap;
  const rawSpacing = design.spacingScale ?? 'normal';
  const spacingKey: SpacingKey = rawSpacing in spacingMap
    ? (rawSpacing as SpacingKey)
    : 'normal';
  const spacing = spacingMap[spacingKey];

  return [
    `--fg-rgb: ${fgTriplet};`,
    // Border tint: follows the dedicated "Border" color when set, else the
    // foreground. Alpha gradation of each border utility is preserved.
    `--border-rgb: ${hexToRgbTriplet(design?.borderColor, fgTriplet)};`,
    `--overlay-rgb: ${hexToRgbTriplet(overlay, "0 0 0")};`,
    `--surface: ${surface};`,
    `--surface-rgb: ${hexToRgbTriplet(surface, "10 10 10")};`,
    `--surface-2: ${surface2};`,
    `--surface-2-rgb: ${hexToRgbTriplet(surface2, "23 23 23")};`,
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
    `--muted: ${muted};`,
    `--muted-rgb: ${hexToRgbTriplet(muted, "148 163 184")};`,
    // Riso Press print treatment — every literal is an editable design key.
    `--rp-outline: ${design?.risoOutlineColor || fg};`,
    `--rp-outline-w: ${Number.isFinite(Number(design?.risoOutlineWidth)) && design?.risoOutlineWidth !== "" && design?.risoOutlineWidth != null ? Number(design.risoOutlineWidth) : 2}px;`,
    `--rp-shadow-color: ${design?.risoShadowColor || `rgba(${fgTriplet.replace(/ /g, ",")},0.3)`};`,
    `--rp-shadow-x: ${Number.isFinite(Number(design?.risoShadowOffset)) && design?.risoShadowOffset != null && design?.risoShadowOffset !== "" ? Number(design.risoShadowOffset) : 3}px;`,
    `--rp-focus: ${design?.focusRingColor || accent};`,
    `--rp-card-radius: ${Number.isFinite(Number(design?.risoCardRadius)) && design?.risoCardRadius != null && design?.risoCardRadius !== "" ? Number(design.risoCardRadius) : 4}px;`,
    `--rp-heading-transform: ${design?.risoUppercaseHeadings === false ? "none" : "uppercase"};`,
    `--on-accent: ${design?.buttonTextColor || "#100f0d"};`,
    `--card-shadow: ${cardShadow};`,
    `--card-shadow-hover: ${cardShadowHover};`,
    `--section-padding: ${spacing.section};`,
    `--card-padding: ${spacing.card};`,
    `--grid-gap: ${spacing.gap};`,
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
  buildAlphaRules("white", WHITE_ALPHAS, (p) => (p === "border" ? BORDER : p === "bg" ? "--surface-rgb" : FG)),
  buildAlphaRules("black", BLACK_ALPHAS, () => OVERLAY),
  brandOverrideCss,
].join("\n");

/**
 * Static stylesheet that wires the Tailwind alpha utilities + a few semantic
 * helper classes onto the token layer. Inject once per storefront surface.
 *
 * The `[data-fm-store].fm-page` / `.fm-surface` / `.text-white` rules exist because roots such as
 * Account, Tracking and the Checkout states carry `data-fm-store` AND the class on the SAME element,
 * which the descendant selectors never match. Every line must stay scoped (see themeTokens.test.ts).
 */
export const STOREFRONT_TOKEN_CSS = `
${alphaOverrideCss}
[data-fm-store] .text-white{color:rgb(var(--fg-rgb));}
[data-fm-store] .bg-white{background-color:rgb(var(--fg-rgb));}
[data-fm-store] .border-white{border-color:rgb(var(--border-rgb));}
[data-fm-store] .fm-page{background-color:var(--bg-color);}
[data-fm-store].fm-page{background-color:var(--bg-color);}
[data-fm-store].fm-surface{background-color:var(--surface);}
[data-fm-store].text-white{color:rgb(var(--fg-rgb));}
[data-fm-store] .fm-muted{color:var(--muted);}
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

/**
 * Riso Press treatment shared by every storefront surface when the Riso theme is
 * active: flat ink on newsprint, 2px ink outlines on objects, square corners,
 * flat offset shadows, one flare focus ring. Mirrors the published design system
 * (payment clarity always outranks decoration — inputs stay conventional).
 */
// Riso Press legibility floor: the storefront's faint `text-white/20…50` greys were tuned for a
// glassy dark UI. Print-style pages need real contrast, so lift them (still theme-driven).
const RISO_TEXT_FLOOR = ([["20", 0.55], ["25", 0.55], ["30", 0.55], ["40", 0.65], ["50", 0.72]] as const)
  .map(([n, a]) => `[data-fm-store] .text-white\\/${n}{color:rgba(var(--fg-rgb),${a});}`)
  .join("\n");

export const RISO_STOREFRONT_CSS = `
${RISO_TEXT_FLOOR}
[data-fm-store] h1,[data-fm-store] h2,[data-fm-store] h3{text-wrap:balance;text-transform:var(--rp-heading-transform,uppercase);letter-spacing:.01em;font-weight:400;}
[data-fm-store] button,[data-fm-store] a{transition-timing-function:cubic-bezier(.2,.7,.2,1);}
[data-fm-store] .glass-card{
  backdrop-filter:none;
  background:var(--surface-2,var(--surface));
  border:var(--rp-outline-w) solid var(--rp-outline);
  border-radius:var(--rp-card-radius);
  box-shadow:var(--rp-shadow-x) var(--rp-shadow-x) 0 var(--rp-shadow-color);
}
[data-fm-store] .custom-btn,[data-fm-store] button.custom-btn{
  border:var(--rp-outline-w) solid var(--rp-outline);border-radius:0;box-shadow:2px 2px 0 var(--rp-shadow-color);
  text-transform:uppercase;letter-spacing:.09em;font-weight:800;
}
[data-fm-store] .custom-btn:hover{box-shadow:var(--rp-shadow-x) var(--rp-shadow-x) 0 var(--rp-shadow-color);}
[data-fm-store] input,[data-fm-store] select,[data-fm-store] textarea{border-radius:0 !important;box-shadow:none;border:1px solid rgba(var(--border-rgb),.7);}
[data-fm-store] [class*="rounded-"]:not([class*="rounded-full"]){border-radius:0 !important;}
[data-fm-store] .glass-card,[data-fm-store] [class*="rounded-[2"],[data-fm-store] [class*="rounded-[3"]{border-radius:var(--rp-card-radius) !important;}
[data-fm-store] [class*="shadow-"]:not([class*="shadow-none"]):not(.custom-btn){box-shadow:var(--rp-shadow-x) var(--rp-shadow-x) 0 var(--rp-shadow-color) !important;}
[data-fm-store] :where(a,button,input,select,textarea,[tabindex]):focus-visible{outline:2px solid var(--rp-focus);outline-offset:2px;}
[data-fm-store] .fm-accent-bg,[data-fm-store] .fm-success-solid{color:var(--on-accent);}
[data-fm-store] ::selection{background:var(--accent);color:var(--on-accent);}
@media (pointer:coarse){[data-fm-store] .custom-btn{min-height:44px;}}
@media (prefers-reduced-motion:reduce){[data-fm-store] *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}}
`;

/**
 * Optional halftone dot texture (design.risoGrain, 0–1, default 0 = off). Kept out of
 * RISO_STOREFRONT_CSS so the base treatment stays flat; only emitted when a merchant opts in.
 */
export function risoGrainCss(design: StorefrontTokenInput = {}): string {
  const g = Number(design?.risoGrain);
  if (!Number.isFinite(g) || g <= 0) return "";
  const a = Math.min(g, 1) * 0.16;
  return `[data-fm-store]{background-image:radial-gradient(rgba(var(--fg-rgb),${a.toFixed(3)}) 1px,transparent 1.3px);background-size:6px 6px;}`;
}
