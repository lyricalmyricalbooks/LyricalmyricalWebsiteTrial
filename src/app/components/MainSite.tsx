import { MobileStorefrontNav } from "../features/site/MobileStorefrontNav";
import { motion, AnimatePresence } from "motion/react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Instagram, Mail, Send, Heart, User as UserIcon, Zap, Search as SearchIcon, ShoppingCart } from "lucide-react";
import { Link, useNavigate, useLocation, useParams } from "react-router";
import { POLICY_KEYS, policySlug, policyTitle } from "../features/site/policyPages";
import { useCart } from "../CartContext";
import { CATEGORIES, placeholderImage, DEFAULT_SOCIAL } from "../features/site/constants";
import { aspectRatioValue } from "../features/site/imageAspect";
import {
  getFeaturedBooks,
  getFilteredItems,
  getPublications,
  getPublishedBooks,
  resolveLogoDesign,
  resolveLogoPosition,
} from "../features/site/selectors";
import type { Book } from "../features/site/types";
import { useSiteData } from "../features/site/useSiteData";
import { BootSplash } from "./BootSplash";
import { buildStorefrontTokenVars, RISO_STOREFRONT_CSS, risoGrainCss, STOREFRONT_TOKEN_CSS } from "../features/site/themeTokens";
import { getCopy } from "../features/site/storeCopy";
import { buildNavItems, categoryNames, childCategories, parentOf } from "../features/site/navItems";
import { NavDropdown } from "../features/site/NavDropdown";
import { contentMaxWidth, navLineProps, navLinkStyle, useNavBelow, useNavFit } from "../features/site/headerNav";
import { StorefrontThemeStyle } from "../features/site/StorefrontThemeStyle";
import { StorefrontOverrides } from "../features/site/StorefrontOverrides";
import { resolveFooterBadges } from "../features/site/paymentBadges";
import { StoreMenu, FooterMenu } from "./StoreMenu";
import { LogoMark, wordmarkSecondaryStyle } from "./LogoMark";
import { googleFontHref } from "../features/site/fonts";
import { ThemeToggle } from "./theme/ThemeToggle";
import { CurrencySelector, useCurrency } from "../CurrencyContext";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { SectionList, GlobalSections, TemplateSections } from "./sectionRender";
import { useWishlist } from "../lib/wishlist";
import { useSEO } from "../lib/seo";
import { CatalogControls, applyCatalogControls, type SortKey } from "../features/site/CatalogControls";
import RecentlyViewedRow from "../features/site/RecentlyViewedRow";
import { SearchOverlay } from "../features/site/SearchOverlay";
import { designNumber } from "../features/site/designNumber";

// ──────────────────────────────
// Sticker-pill navigation (navStyle: "stickers") — asymmetric border radius,
// slight per-pill rotation, hover straighten + scale, and a cycling active
// palette. All knobs come from design keys; navStyle "default" renders the
// classic nav untouched.
// ──────────────────────────────
const STICKER_ROTATIONS = [-2, 1.5, 2, -1, 1, -1.5];
const STICKER_ACTIVE_COLORS = [
  { bg: "var(--accent, #e8402a)", text: "var(--on-accent, #ffffff)" },
  { bg: "var(--success, #34d399)", text: "var(--on-success, #04150f)" },
  { bg: "var(--warning, #f5b942)", text: "var(--on-accent, #2b1a05)" },
  { bg: "var(--danger, #fb7185)", text: "var(--on-accent, #2b0810)" },
];
const STICKER_PILL_CSS =
  ".fm-sticker-pill{transition:all .2s ease}.fm-sticker-pill:hover{transform:rotate(0deg) scale(1.08)!important;opacity:1!important}";

export function storefrontCategories(value: unknown) {
  return (Array.isArray(value) ? value : CATEGORIES).filter(
    (category: any) => typeof category === "string" || (category && typeof category === "object"),
  );
}

function stickerPillStyle(design: any, index: number, active = false): CSSProperties {
  const rotate = design?.navPillRotate === false ? 0 : STICKER_ROTATIONS[index % STICKER_ROTATIONS.length];
  const activeColors = design?.navPillActivePalette === false
    ? STICKER_ACTIVE_COLORS[0]
    : STICKER_ACTIVE_COLORS[index % STICKER_ACTIVE_COLORS.length];
  return {
    borderRadius: design?.navPillRadius || "14px 4px 14px 4px",
    transform: `rotate(${rotate}deg)`,
    padding: "0.5rem 1.05rem",
    fontWeight: 700,
    ...(active ? { backgroundColor: activeColors.bg, color: activeColors.text, opacity: 1 } : {}),
  };
}

// ──────────────────────────────
// Image with skeleton loader
// ──────────────────────────────
function SkeletonImage({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: CSSProperties }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 fm-surface-2 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={style}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// ──────────────────────────────
// Maintenance splash
// ──────────────────────────────
function MaintenancePage({ message, design }: { message?: string; design?: any }) {
  const debug = typeof window !== "undefined" && window.location.search.includes("debug=true");
  const adminPath = debug ? "/admin?debug=true" : "/admin";
  const c = (key: string) => getCopy(design, key);

  return (
    <div data-fm-store data-studio-target="copy:Maintenance page" data-studio-label="Maintenance page" className="fm-page min-h-screen text-white flex flex-col items-center justify-center gap-6 text-center px-6">
      <StorefrontThemeStyle design={design} />
      <span className="rotate-1 border-2 border-[var(--rp-outline)] bg-[var(--accent)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[var(--on-accent)] shadow-[4px_4px_0_var(--rp-shadow-color)]">
        {c("maintenanceTag")}
      </span>
      <h1 className="text-5xl md:text-7xl uppercase leading-none">{c("maintenanceTitle")}</h1>
      <p className="text-white/60 text-sm max-w-sm leading-relaxed">
        {message || c("maintenanceMessage")}
      </p>
      <div className="mt-4 flex flex-col items-center gap-6">
        <p className="text-[9px] tracking-[0.4em] text-white/40 uppercase">{c("maintenanceFooter")}</p>
        <Link
          to={adminPath}
          className="px-5 py-2.5 border-2 border-[var(--rp-outline)] text-[9px] tracking-[0.2em] uppercase font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          {c("maintenanceAdmin")}
        </Link>
      </div>
    </div>
  );
}

// ──────────────────────────────
// Newsletter sign-up
// ──────────────────────────────
function Newsletter({ design }: { design?: any }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const buttonBg = design?.buttonColor || design?.primaryColor || "#ffffff";
  const buttonText = design?.buttonTextColor || "#100f0d";
  const buttonRadius = Math.max(0, Math.min(999, design?.buttonRadius ?? 999));
  const buttonStyle = design?.buttonStyle || "solid";
  const buttonUppercase = design?.buttonUppercase ?? true;
  const buttonShadow = design?.buttonShadow ?? true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setStatus("loading");
    try {
      await addDoc(collection(db, "newsletter"), {
        email,
        subscribedAt: new Date().toISOString(),
        source: "website-footer",
      });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div data-studio-target="copy:Newsletter|style:footer" data-studio-label="Newsletter box" className="py-16 border-t border-white/10 text-center space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold tracking-tight">{getCopy(design, "newsletterHeading")}</h3>
        <p className="text-white/40 text-xs tracking-widest max-w-sm mx-auto">
          {getCopy(design, "newsletterText")}
        </p>
      </div>
      {status === "success" ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] tracking-[0.4em] text-white/60 uppercase"
        >
          {getCopy(design, "newsletterSuccess")}
        </motion.p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={getCopy(design, "newsletterPlaceholder")}
            required
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-xs text-white placeholder-white/30 outline-none focus:border-white/30 transition-all"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className={`px-5 py-3 text-[10px] font-bold tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 hover:scale-[1.02] ${
              buttonShadow ? "shadow-xl" : ""
            } ${buttonUppercase ? "uppercase" : ""}`}
            style={{
              backgroundColor: buttonStyle === "solid" ? buttonBg : "transparent",
              color: buttonStyle === "solid" ? buttonText : buttonBg,
              border: buttonStyle !== "solid" ? `1px solid ${buttonBg}` : "none",
              borderRadius: buttonRadius,
            }}
          >
            <Send size={12} />
            {status === "loading" ? "..." : getCopy(design, "newsletterButton")}
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="text-red-400 text-[10px] tracking-widest">{getCopy(design, "newsletterError")}</p>
      )}
    </div>
  );
}

// ──────────────────────────────
// Payment gateway icons for footer
// ──────────────────────────────
const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  visa: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.166 14.281l2.42-13.562h3.873l-2.42 13.562h-3.873zm11.393-13.064c-.754-.298-1.922-.619-3.376-.619-3.702 0-6.31 1.944-6.329 4.743-.03 2.062 1.868 3.208 3.292 3.896 1.458.706 1.95 1.155 1.942 1.785-.015.965-1.171 1.408-2.253 1.408-1.503 0-2.31-.225-3.535-.76l-.497-.238-.529 3.256c.883.402 2.512.75 4.205.766 3.935 0 6.5-1.922 6.539-4.896.02-1.618-.975-2.853-3.116-3.87-.225-.112-.45-.224-.652-.328-1.178-.568-1.579-.955-1.571-1.53.015-.515.586-1.042 1.86-1.042 1.053-.016 1.815.223 2.408.47l.285.126.547-3.336zM7.568 1.22H3.771c-.883 0-1.545.26-1.936 1.183l-5.416 11.878h4.067l.808-2.215h4.975l.471 2.215h3.585L7.568 1.22zm-2.463 7.82l1.545-4.237.887 4.237H5.105zm18.802-8.32H20.73c-.63 0-1.109.356-1.343.916l-6.427 12.665h4.067l.812-2.25h4.975l.471 2.25h3.582L23.907.72z" />
    </svg>
  ),
  mastercard: (
    <svg className="h-4 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7.5" cy="7.5" r="7.5" opacity="0.8" />
      <circle cx="16.5" cy="7.5" r="7.5" opacity="0.6" />
    </svg>
  ),
  amex: (
    <svg className="h-4 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="4" y="11" fontSize="7" fontWeight="bold" fontFamily="sans-serif">AX</text>
    </svg>
  ),
  paypal: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.825 3.328a2.535 2.535 0 00-.518-.088 6.002 6.002 0 00-1.157-.1c-1.464 0-2.88.225-4.148.653-.518.175-.852.483-1.037.954l-1.87 8.358h-3.41l2.584-11.53c.18-.8 1.054-1.282 1.867-1.282h4.5c.95 0 1.764.218 2.378.647.614.43 1.002.99 1.134 1.637.133.648-.052 1.306-.554 1.936a4.52 4.52 0 01-1.769 1.418z" />
      <path d="M12.922 7.078c.185-.47.52-.779 1.037-.954 1.268-.428 2.684-.653 4.148-.653a6.002 6.002 0 011.157.1c.175.022.35.05.518.088.75.163 1.258.625 1.488 1.32.228.694.137 1.467-.282 2.215-.49 1.026-1.4 1.844-2.585 2.32a5.556 5.556 0 01-2.115.42H13.67l-.946 4.168h-3.41L11.055 7.15l1.867-.072z" />
    </svg>
  ),
  applepay: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.59 7.07c0-1.74 1.41-2.73 1.48-2.78-.81-1.18-2.07-1.34-2.52-1.38-1.07-.11-2.09.63-2.63.63-.54 0-1.38-.62-2.27-.6-1.17.02-2.26.68-2.86 1.73-1.22 2.11-.31 5.23.87 6.93.58.83 1.26 1.76 2.16 1.73.87-.03 1.2-.56 2.26-.56 1.05 0 1.35.56 2.26.54.93-.02 1.52-.84 2.1-1.68.67-.97.94-1.92.96-1.97-.02-.01-1.85-.71-1.87-2.82zM14.73 1.77c.48-.58.8-1.38.71-2.18-.69.03-1.53.46-2.02 1.03-.42.48-.79 1.3-.7 2.08.77.06 1.53-.35 2.01-.93z" />
    </svg>
  ),
  googlepay: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="3" y="11" fontSize="7" fontWeight="bold" fontFamily="sans-serif">GPay</text>
    </svg>
  ),
  afterpay: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="2" y="10" fontSize="5" fontWeight="bold" fontFamily="sans-serif">afterpay</text>
    </svg>
  ),
  klarna: (
    <svg className="h-3 w-auto" viewBox="0 0 24 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="2" y="10" fontSize="6" fontWeight="bold" fontFamily="sans-serif">Kl.</text>
    </svg>
  ),
};

// ──────────────────────────────
// Full footer
// ──────────────────────────────
export function SiteFooter({ settings, pages }: { settings: any; pages: any[] }) {
  const navPages = (pages || []).filter(p => p.showInNav && p.status === "published");
  const rawDesign = settings?.design || {};
  // Never configured → the house default; cleared on purpose in Studio → hidden.
  const instagramUrl: string = (settings?.design?.social ?? DEFAULT_SOCIAL).instagram || "";
  const d = rawDesign.storefront && Object.keys(rawDesign.storefront).length > 0 ? rawDesign.storefront : rawDesign;
  const fourCol = d?.footerLayout === "4col";
  // "Multi-column footer" off → the columns stack into one.
  const multiColumn = d?.footerColumns !== false;
  const headingFontFamily = d?.headingFont ? `'${d.headingFont}', serif` : undefined;
  return (
    <footer
      data-studio-target="style:footer|copy:Footer" data-studio-label="Footer"
      className="border-t-2 border-white/30 bg-black/40"
      style={d?.footerBg ? { backgroundColor: d.footerBg } : undefined}
    >
      <div style={{ maxWidth: contentMaxWidth(d) }} className={`mx-auto px-6 py-12 grid grid-cols-1 ${!multiColumn ? "" : fourCol ? "md:grid-cols-4" : "md:grid-cols-3"} gap-10 text-[11px] text-white/70`}>
        {/* Col 1: Brand */}
        <div className="space-y-4" data-studio-target="copy:Footer|style:logo" data-studio-label="Footer brand">
          {d?.wordmarkStyle === "two-part" ? (
            <p className="text-white text-xl" style={{ fontFamily: headingFontFamily, fontWeight: d?.wordmarkWeight ?? 600, letterSpacing: "-0.01em" }}>
              {d.wordmarkPrimary || "Lyricalmyrical"} <span style={wordmarkSecondaryStyle(d)}>{d.wordmarkSecondary || "Books"}</span>
            </p>
          ) : (
            <p className="text-white font-bold tracking-widest text-xs">{getCopy(settings?.design, "footerWordmark")}</p>
          )}
          <p className="leading-relaxed max-w-xs">
            {settings?.info?.description || getCopy(settings?.design, "footerAbout")}
          </p>
        </div>

        {/* Col 2: Navigation */}
        <div className="space-y-3" data-studio-target="menus:footer|copy:Footer|pages" data-studio-label="Footer links">
          <p className="text-white/55 text-[9px] uppercase tracking-[0.4em] mb-4">{getCopy(settings?.design, "footerNavHeading")}</p>
          {settings?.design?.menus?.footer?.length > 0 ? (
            <FooterMenu items={settings.design.menus.footer} />
          ) : (
            <>
              <Link to="/" className="block hover:text-white transition-colors">{getCopy(settings?.design, "footerLinkShop")}</Link>
              <Link to="/track" className="block hover:text-white transition-colors">{getCopy(settings?.design, "footerLinkTrack")}</Link>
              {navPages.map(page => (
                <Link
                  key={page.id}
                  to={`/page/${page.slug}`}
                  className="block hover:text-white transition-colors"
                >
                  {page.title}
                </Link>
              ))}
              {d?.showSocialInFooter !== false && instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">{getCopy(settings?.design, "footerLinkInstagram")}</a>}
              <a
                href={`mailto:${settings?.info?.email || "lyricalmyricalbooks@gmail.com"}`}
                className="block hover:text-white transition-colors"
              >
                {getCopy(settings?.design, "footerLinkContact")}
              </a>
            </>
          )}
        </div>

        {/* Col 3: Policies / Info */}
        <div className="space-y-3" data-studio-target="copy:Footer|style:footer" data-studio-label="Footer legal & location">
          <p className="text-white/55 text-[9px] uppercase tracking-[0.4em] mb-4">{getCopy(settings?.design, "footerLegalHeading")}</p>
          {POLICY_KEYS.filter((k) => (settings?.policies as any)?.[k]?.trim()).map((k) => (
            <p key={k}><Link to={`/page/${policySlug(k)}`} className="hover:text-white transition-colors">{policyTitle(settings?.design, k)}</Link></p>
          ))}
          {!fourCol && <p className="mt-6">{getCopy(settings?.design, "footerLocation")}</p>}
        </div>

        {/* Col 4: Location (4-column layout only) */}
        {fourCol && (
          <div className="space-y-3" data-studio-target="copy:Footer|style:footer" data-studio-label="Footer location">
            <p className="text-white/55 text-[9px] uppercase tracking-[0.4em] mb-4">{getCopy(settings?.design, "footerLocationHeading")}</p>
            <p>{getCopy(settings?.design, "footerLocation")}</p>
            <a
              href={`mailto:${settings?.info?.email || "lyricalmyricalbooks@gmail.com"}`}
              className="block hover:text-white transition-colors"
            >
              {settings?.info?.email || "lyricalmyricalbooks@gmail.com"}
            </a>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ maxWidth: contentMaxWidth(d) }} className="border-t border-white/20 mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[9px] tracking-widest text-white/55 uppercase">
          {getCopy(settings?.design, "footerCopyright")}
        </p>

        {resolveFooterBadges(d, settings).length > 0 && d?.showPaymentBadges !== false && (
          <div className="flex items-center gap-4 text-white/55 select-none" data-studio-target="style:paymentIcons|style:footer" data-studio-label="Payment icons">
            {resolveFooterBadges(d, settings).map((badgeId: string) => {
              const icon = PAYMENT_ICONS[badgeId];
              if (!icon) return null;
              return (
                <div key={badgeId} className="opacity-30 hover:opacity-100 transition-opacity duration-300">
                  {icon}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-4">
          {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/55 hover:text-white transition-colors"
          >
            <Instagram size={14} />
          </a>
          )}
          <a
            href={`mailto:${settings?.info?.email || "lyricalmyricalbooks@gmail.com"}`}
            className="text-white/55 hover:text-white transition-colors"
          >
            <Mail size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}

// ──────────────────────────────
// Hook for real-time theme sync
// ──────────────────────────────
function useThemePreview(initialDesign: any) {
  const [designOverride, setDesignOverride] = useState<any>(null);
  const isPreview = window.location.search.includes("preview=true");

  useEffect(() => {
    // 1. Listen for iframe messages (legacy/standard)
    const handleMessage = (event: MessageEvent) => {
      if (!isPreview || event.origin !== window.location.origin || (window.parent !== window && event.source !== window.parent)) return;
      if (event.data && (event.data.type === "THEME_UPDATE" || event.data.type === "STUDIO_PREVIEW_STATE")) {
        setDesignOverride(event.data.design);

      }
    };

    // 2. Listen for BroadcastChannel (cross-tab sync)
    // Preview only — otherwise a draft could leak into the admin's own normal storefront tabs.
    let bc: BroadcastChannel | null = null;
    try {
      if (isPreview) bc = new BroadcastChannel("site_preview_updates");
      if (bc) bc.onmessage = (event) => {
        if (event.data && event.data.type === "THEME_UPDATE") {
          setDesignOverride(event.data.design);
        }
      };
    } catch (_) {}

    window.addEventListener("message", handleMessage);
    if (isPreview) window.parent.postMessage({ type: "PREVIEW_READY" }, window.location.origin);

    return () => {
      window.removeEventListener("message", handleMessage);
      bc?.close();
    };
  }, [isPreview]);

  return designOverride || initialDesign;
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
    link.href = googleFontHref(font);
    document.head.appendChild(link);
  }, [font]);
  return null;
}

// ──────────────────────────────
// Typography tokens — turns the editor's type settings into real CSS.
// Applied via a scoped <style> targeting [data-fm-store] so heading vs body
// fonts, weights, base size, line-height and tracking work site-wide without
// editing every component. (rem-based Tailwind sizes are left intact.)
// ──────────────────────────────
export function resolveTypography(design: any) {
  const body = design?.bodyFont || design?.font || "Inter";
  const heading = design?.headingFont || design?.font || "Inter";
  const base = design?.baseFontSize ?? (design?.fontSize === "sm" ? 15 : design?.fontSize === "lg" ? 18 : 16);
  const tracking =
    design?.letterSpacing === "ultra" ? "0.08em" : design?.letterSpacing === "wide" ? "0.03em" : "normal";
  const lineHeight = design?.lineHeight ?? 1.6;
  const headingWeight = design?.headingWeight ?? 800;
  const bodyWeight = design?.bodyWeight ?? 400;
  // Modular type scale (Type Scale Designer): a ratio like 1.25 computes h1–h6
  // from the base size. 0/undefined = off (Tailwind sizes stay untouched).
  const typeScale = design?.typeScale || 0;
  return { body, heading, base, tracking, lineHeight, headingWeight, bodyWeight, typeScale };
}

function TypographyTokens({ design }: { design: any }) {
  const t = resolveTypography(design);
  // Global button colors — every CTA reads these vars unless a section
  // overrides its own accent.
  const btnBg = design?.buttonColor || design?.primaryColor || "#e8402a";
  const btnText = design?.buttonTextColor || "#100f0d";
  let css = `
[data-fm-store]{
  font-family:'${t.body}',sans-serif;
  font-size:${t.base}px;
  line-height:${t.lineHeight};
  font-weight:${t.bodyWeight};
  ${buildStorefrontTokenVars(design)}
  --btn-bg:${btnBg};
  --btn-text:${btnText};
  --bg-color:${design?.backgroundColor || "#000000"};
  --text-color:${design?.textColor || "#ffffff"};
  --link-hover-color:${design?.linkColorHover || "#ff6b55"};
  --border-color:${design?.borderColor || "rgba(255,255,255,0.05)"};
  --btn-hover-bg:${design?.buttonHoverBgColor || "#C1BBBB"};
  --btn-hover-text:${design?.buttonHoverTextColor || "#FFFFFF"};
  --badge-text-primary:${design?.badgeTextPrimary || "#000000"};
  --badge-bg-primary:${design?.badgeBgPrimary || "#F63737"};
  --badge-text-secondary:${design?.badgeTextSecondary || "#000000"};
  --badge-bg-secondary:${design?.badgeBgSecondary || "#E0E0E0"};
  --low-inventory-color:${design?.lowInventoryColor || "#056FFA"};
}
[data-fm-store] h1,[data-fm-store] h2,[data-fm-store] h3,[data-fm-store] h4,[data-fm-store] h5,[data-fm-store] h6{
  font-family:'${t.heading}',sans-serif;
  font-weight:${t.headingWeight};
  letter-spacing:${t.tracking};
}
[data-fm-store] a:hover, [data-fm-store] button.hover-text-accent:hover {
  color: var(--link-hover-color) !important;
}
/* Keep the legacy plain border-b tied to the configurable Border color. */
[data-fm-store] .border-b {
  border-color: var(--border-color) !important;
}
/* Style hover transitions for buttons */
[data-fm-store] button.store-btn-primary:hover, [data-fm-store] a.store-btn-primary:hover {
  background-color: var(--btn-hover-bg) !important;
  color: var(--btn-hover-text) !important;
}
/* Semantic token layer: remaps white/black alpha utilities + fm-* helpers. */
${STOREFRONT_TOKEN_CSS}
${design?.themeStyle === "riso" ? RISO_STOREFRONT_CSS + risoGrainCss(design) : ""}
`;
  if (t.typeScale) {
    const size = (steps: number) => Math.round(t.base * Math.pow(t.typeScale, steps) * 10) / 10;
    css += `
[data-fm-store] h1{font-size:${size(5)}px;line-height:1.1;}
[data-fm-store] h2{font-size:${size(4)}px;line-height:1.15;}
[data-fm-store] h3{font-size:${size(3)}px;line-height:1.2;}
[data-fm-store] h4{font-size:${size(2)}px;line-height:1.25;}
[data-fm-store] h5{font-size:${size(1)}px;line-height:1.3;}
[data-fm-store] h6{font-size:${t.base}px;line-height:1.4;}
`;
  }
  // Density system: one control rescales the vertical rhythm of every section.
  const density = design?.density;
  // Header & menu font: applies to the whole header (links, currency, cart). Empty = body font.
  const navFont = design?.navFont;
  if (navFont) css += `[data-fm-store] header[data-section="navigation"]{font-family:'${String(navFont).replace(/'/g, "")}',sans-serif;}\n`;
  if (density === "compact") {
    css += `[data-fm-store] [data-section-id] > section{padding-top:3rem;padding-bottom:3rem;}`;
  } else if (density === "spacious") {
    css += `[data-fm-store] [data-section-id] > section{padding-top:8.5rem;padding-bottom:8.5rem;}`;
  }
  return (
    <>
      <GoogleFontLoader font={t.body} />
      <GoogleFontLoader font={t.heading} />
      {navFont && <GoogleFontLoader font={navFont} />}
      {design?.wordmarkFont && <GoogleFontLoader font={design.wordmarkFont} />}
      <style>{css}</style>
      {/* Card title/price + small-print controls — the same layer every other storefront page renders. */}
      <StorefrontOverrides design={design} />
    </>
  );
}

// ──────────────────────────────
// Per-section helpers: font overrides + entrance animations
// ──────────────────────────────

// Section rendering helpers (SectionFontOverride, SectionReveal, sectionInWindow)
// and the GlobalSections component now live in ./sectionRender so they can be
// shared with the standalone storefront pages (product/collection/page/cart).
// GlobalSections is imported at the top of this file.

// ──────────────────────────────
// Main exported component
// ──────────────────────────────
export default function MainSite({ setShowCatalog, showCatalog, setCurrentPage, currentPage, nextPage, prevPage }: any) {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount, cartTotal, setIsCartOpen } = useCart();
  const { formatBookPrice, formatPrice } = useCurrency();
  const { books, settings, pages, loading } = useSiteData();

  // Auto-open catalog view when the editor previews the shop tab
  const isCatalogPreview = window.location.search.includes("catalog=true");
  useEffect(() => {
    if (isCatalogPreview && setShowCatalog) setShowCatalog(true);
  }, [isCatalogPreview, setShowCatalog]);
  
  // Real-time preview override
  const activeDesign = useThemePreview(settings?.design || {});
  
  const legacyDesign = activeDesign;
  const heroDesign = legacyDesign.heroPage && Object.keys(legacyDesign.heroPage).length > 0
    ? { ...legacyDesign, ...legacyDesign.heroPage }
    : legacyDesign;
  const storefrontDesign = legacyDesign.storefront && Object.keys(legacyDesign.storefront).length > 0
    ? { ...legacyDesign, ...legacyDesign.storefront }
    : legacyDesign;
  const storefrontLogoDesign = resolveLogoDesign(legacyDesign.storefront, [legacyDesign.heroPage, legacyDesign]);
  const storefrontLogoPosition = resolveLogoPosition(legacyDesign.storefront, [legacyDesign.heroPage, legacyDesign]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Prioritize global categories if they exist (new behavior), otherwise fall back to storefront or legacy
  // Published designs can outlive older editor schemas. Never let a malformed
  // legacy category value crash the storefront when returning from checkout.
  const rawCategories = storefrontCategories(activeDesign?.categories || storefrontDesign?.categories || legacyDesign?.categories);
  const categories = useMemo(() => rawCategories.map((cat: any, i: number) => {
    if (typeof cat === "string") {
      return { id: `cat-${i}`, name: cat, description: "", showInNav: true };
    }
    return cat;
  }), [rawCategories]);
  // Categories and in-menu pages share one header bar; Studio › Menus › Header bar order sets the sequence.
  const navOrder = activeDesign?.navOrder || storefrontDesign?.navOrder || legacyDesign?.navOrder;
  const navItems = useMemo(() => buildNavItems(categories, pages || [], navOrder), [categories, pages, navOrder]);
  const headerRowRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navBelow = useNavBelow(storefrontDesign, headerRowRef, navRef);
  const navFit = useNavFit(storefrontDesign, navRef, navBelow);
  const navLine = navLineProps(storefrontDesign, navBelow, navFit);

  // "Skip straight to the shop": the homepage shows the catalog. Remember when we forced
  // it, so switching the setting back (e.g. live in the Studio preview) returns to Home.
  const forcedCatalog = useRef(false);
  useEffect(() => {
    if (legacyDesign?.showHero === false && !showCatalog) {
      forcedCatalog.current = true;
      setShowCatalog(true);
    } else if (legacyDesign?.showHero !== false && showCatalog && forcedCatalog.current && !isCatalogPreview) {
      forcedCatalog.current = false;
      setShowCatalog(false);
    }
  }, [legacyDesign?.showHero, showCatalog, setShowCatalog, isCatalogPreview]);

  const [activeCategory, setActiveCategory] = useState<any>(categories[0]);
  const pickCategory = (cat: any) => {
    setActiveCategory(cat);
    setShowCatalog(true);
  };

  // /collections/<slug> (header links on other pages, product breadcrumbs) opens this shop on that category.
  const { slug: collectionSlug } = useParams();
  useEffect(() => {
    if (!collectionSlug) return;
    const slugOf = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const match = categories.find((c: any) => categoryNames(c).some((n: string) => slugOf(n) === collectionSlug));
    if (match) pickCategory(match);
    else setShowCatalog(true);
  }, [collectionSlug, categories]);

  // Sync activeCategory if categories change
  useEffect(() => {
    if (categories.length > 0) {
      const currentName = typeof activeCategory === "string" ? activeCategory : activeCategory?.name;
      const exists = categories.find((c: any) => c.name === currentName);
      if (!exists) {
        setActiveCategory(categories[0]);
      } else if (typeof activeCategory === "string" || activeCategory?.id !== exists.id) {
        // Update to full object if it was a string or outdated
        setActiveCategory(exists);
      }
    }
  }, [categories]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // "ALL" is the category-chip pseudo-category (shows every published book).
    if (activeCategory === "ALL") return;
    if (categories.length > 0 && !categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  const baseFilteredItems = useMemo(
    () =>
      activeCategory === "ALL"
        ? getPublishedBooks(books)
        : getFilteredItems(books, activeCategory, new Date().toISOString(), categories),
    [books, activeCategory, categories],
  );
  const publishedBooks = useMemo(() => getPublishedBooks(books), [books]);

  // Category filter chip counts ("ALL (8)", "EPHEMERA (2)", …)
  const categoryChipCounts = useMemo(() => {
    const nowISO = new Date().toISOString();
    const counts: Record<string, number> = { ALL: getPublishedBooks(books).length };
    for (const cat of categories) {
      const name = typeof cat === "string" ? cat : cat?.name;
      if (name) counts[name] = getFilteredItems(books, cat, nowISO, categories).length;
    }
    return counts;
  }, [books, categories]);

  // Catalog controls: search + sort + in-stock filter
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [sort, setSort] = useState<SortKey>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);

  const filteredItems = useMemo(
    () => applyCatalogControls(baseFilteredItems, searchQuery, sort, inStockOnly, [0, Infinity]),
    [baseFilteredItems, searchQuery, sort, inStockOnly],
  );

  const { has: isWished, toggle: toggleWish, count: wishlistCount } = useWishlist();

  useSEO({
    title: showCatalog ? getCopy(settings?.design, "seoArchiveTitle") : undefined,
    description: settings?.info?.description,
    image: settings?.assets?.profileUrl,
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BookStore",
      name: settings?.info?.name || getCopy(settings?.design, "siteName"),
      url: settings?.info?.website,
      description: settings?.info?.description,
    },
  });

  const isHeaderTransparent = storefrontDesign?.transparentHeader && !scrolled;

  const heroHeaderLinks = heroDesign?.headerLinks || {};
  const storefrontHeaderLinks = storefrontDesign?.headerLinks || {};
  const showBag = !activeDesign?.hideCartButton && (showCatalog
    ? (storefrontHeaderLinks.showBag ?? true)
    : (heroHeaderLinks.showBag ?? true));
  const showSys = !activeDesign?.hideAdminLink && (showCatalog
    ? (storefrontHeaderLinks.showSys ?? true)
    : (heroHeaderLinks.showSys ?? true));
  const storefrontBg = storefrontDesign?.backgroundColor || "#000000";
  const storefrontText = storefrontDesign?.textColor || "#ffffff";
  const storefrontAccent = storefrontDesign?.primaryColor || "#e8402a";
  const storefrontButtonBg = storefrontDesign?.buttonColor || storefrontAccent;
  const storefrontButtonText = storefrontDesign?.buttonTextColor || "#100f0d";
  const storefrontMaxWidth = contentMaxWidth(storefrontDesign);
  // Default legacy storefronts into the requested photo-reference design. The
  // previous implementation only changed sites after a merchant manually applied
  // the preset, so existing published Firestore designs still rendered the old
  // catalog.
  const isReferenceCatalog = storefrontDesign?.catalogLayoutStyle !== "modern";
  const storefrontMobileColumns = Math.max(1, Math.min(3, storefrontDesign?.productColumnsMobile ?? 2));
  const storefrontDesktopColumns = Math.max(2, Math.min(6, storefrontDesign?.productColumnsDesktop ?? (isReferenceCatalog ? 3 : 4)));
  const storefrontCardRadius = Math.max(0, Math.min(30, storefrontDesign?.cardRadius ?? 8));
  const storefrontGridGap = Math.max(8, Math.min(72, storefrontDesign?.catalogGridGap ?? (isReferenceCatalog ? 18 : 32)));
  const storefrontHeaderRuleWidth = Math.max(0, Math.min(8, storefrontDesign?.catalogHeaderRuleWidth ?? (isReferenceCatalog ? 4 : 1)));
  const storefrontHeaderMaxWidth = Math.max(900, Math.min(1800, storefrontDesign?.catalogHeaderWidth ?? storefrontMaxWidth));
  const storefrontImageFit = storefrontDesign?.catalogImageFit === "contain" ? "object-contain" : "object-cover";
  const storefrontTitleTransform = (storefrontDesign?.catalogTitleTransform || (isReferenceCatalog ? "none" : "uppercase")) as any;
  const catalogMastheadDesktop = Math.max(28, Math.min(96, storefrontDesign?.catalogMastheadDesktop ?? 58));
  const catalogMastheadMobile = Math.max(24, Math.min(72, storefrontDesign?.catalogMastheadMobile ?? 38));
  const catalogNavGapDesktop = Math.max(12, Math.min(80, storefrontDesign?.catalogNavGapDesktop ?? 40));
  const catalogNavGapMobile = Math.max(8, Math.min(48, storefrontDesign?.catalogNavGapMobile ?? 18));
  const catalogCartPlacement = storefrontDesign?.catalogCartPlacement || "top-right";
  const catalogMastheadText = storefrontDesign?.catalogMastheadText || settings?.info?.name || "Lyricalmyrical Books";
  const catalogImageFocalX = Math.max(0, Math.min(100, storefrontDesign?.catalogImageFocalX ?? 50));
  const catalogImageFocalY = Math.max(0, Math.min(100, storefrontDesign?.catalogImageFocalY ?? 50));
  const storefrontButtonRadius = Math.max(0, Math.min(999, storefrontDesign?.buttonRadius ?? 999));
  const storefrontButtonStyle = storefrontDesign?.buttonStyle || "solid";
  const storefrontButtonUppercase = storefrontDesign?.buttonUppercase ?? true;
  const storefrontButtonShadow = storefrontDesign?.buttonShadow ?? true;

  const storefrontCtaText = storefrontDesign?.productCTA || "VIEW";
  const soldOutLabel = storefrontDesign?.soldOutLabel || "SOLD OUT";
  const showCollectionMeta = storefrontDesign?.showCollectionMeta ?? true;
  const cardRuleWidth = Math.max(0, Math.min(8, storefrontDesign?.catalogCardRuleWidth ?? 2));
  // Studio › Style › Product cards & grid › Card style: editorial (default) · card (framed panel) · minimal (no frame, plain price).
  const cardStyle = (storefrontDesign?.productCardStyle || "editorial") as "card" | "minimal" | "editorial";
  const priceTagBoxed = (storefrontDesign?.catalogPriceStyle ?? (cardStyle === "minimal" ? "plain" : "boxed")) !== "plain";
  const priceOnHover = storefrontDesign?.showPriceOnHover === true;
  const showSoldOutBadge = storefrontDesign?.showSoldOutBadge ?? true;
  const showSaleBadge = storefrontDesign?.showSaleBadge ?? true;
  const saleBadgeLabel = storefrontDesign?.saleBadgeLabel || "SALE";
  const showNewBadge = storefrontDesign?.showNewBadge ?? false;
  const newBadgeLabel = storefrontDesign?.newBadgeLabel || "NEW";
  const newBadgeDays = Math.max(1, Math.min(365, storefrontDesign?.newBadgeDays ?? 30));
  const bagLabel = storefrontDesign?.cartLabel || "BAG";
  const showAnnouncement = storefrontDesign?.showAnnouncement ?? !isReferenceCatalog;
  const showCatalogControls = storefrontDesign?.showCatalogControls ?? !isReferenceCatalog;
  const announcementMsg = storefrontDesign?.announcementText || settings?.announcements?.[0]?.message;
  
  const headerTextColor = isHeaderTransparent ? storefrontText : (storefrontDesign?.headerColor || storefrontText);
  const headerBgColor = isHeaderTransparent ? "transparent" : (storefrontDesign?.headerBg || `${storefrontBg}${(storefrontDesign?.headerStyle || "minimal") === "full" ? "f5" : "b3"}`);
  const headerBorderColor = isHeaderTransparent ? "transparent" : (storefrontDesign?.headerColor ? `${storefrontDesign.headerColor}1a` : `${storefrontText}1a`);

  const shopSectionSpacing = Math.max(24, Math.min(120, storefrontDesign?.sectionSpacing ?? 64));
  const imageAspect = storefrontDesign?.imageAspectRatio || (isReferenceCatalog ? "1:1" : "3:4");
  const imageAspectStyle = aspectRatioValue(imageAspect);
  const mobileColsClass = storefrontMobileColumns === 1 ? "grid-cols-1" : storefrontMobileColumns === 3 ? "grid-cols-3" : "grid-cols-2";
  const desktopColsClass =
    storefrontDesktopColumns === 2
      ? "lg:grid-cols-2"
      : storefrontDesktopColumns === 3
      ? "lg:grid-cols-3"
      : storefrontDesktopColumns === 5
      ? "lg:grid-cols-5"
      : storefrontDesktopColumns === 6
      ? "lg:grid-cols-6"
      : "lg:grid-cols-4";

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth'
      });
    }
  };

  const getBookSlug = (book: Book) =>
    (book as any).slug || book.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Apply Favicon
  useEffect(() => {
    if (storefrontDesign?.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = storefrontDesign.faviconUrl;
    }
  }, [storefrontDesign?.faviconUrl]);

  if (loading) {
    return (
      <BootSplash />
    );
  }

  // Maintenance mode gate
  if (settings?.maintenance?.enabled) {
    return <MaintenancePage message={settings.maintenance.message} design={activeDesign} />;
  }

  // One storefront shell (Riso header, footer) for every view. "Home" swaps the catalog
  // grid for the Home template's sections; with no Home sections it shows the catalog.
  const homeSections: any[] = heroDesign.sections || heroDesign.homepageSections || activeDesign.homepageSections || [];
  const onHome = !showCatalog && homeSections.length > 0;
  const navBar = (
              <nav ref={navRef} data-studio-target="menus:header-order|menus:categories|style:navlinks" data-studio-label="Category bar" className={`hidden md:flex shrink-0 items-center ${navLine.className} ${storefrontDesign?.navStyle === "stickers" ? "gap-2" : ""}`} style={storefrontDesign?.navStyle === "stickers" ? { ["--nav-fit" as any]: navLine.style["--nav-fit" as any] } : navLine.style}>
                {navItems.map((item, itemIdx) => {
                  const stickers = storefrontDesign?.navStyle === "stickers";
                  if (item.kind === "page") {
                    return (
                      <Link
                        key={item.key}
                        to={`/page/${item.page.slug}`}
                        aria-current={location.pathname.endsWith(`/page/${item.page.slug}`) ? "page" : undefined}
                        style={{
                          ...navLinkStyle(storefrontDesign, location.pathname.endsWith(`/page/${item.page.slug}`), headerTextColor),
                          ...(stickers ? stickerPillStyle(storefrontDesign, itemIdx) : {}),
                        }}
                        className={`transition-all hover:!opacity-100 hover-text-accent ${stickers ? "fm-sticker-pill" : ""}`}
                      >
                        {item.label}
                      </Link>
                    );
                  }
                  const cat = item.category;
                  const activeName = typeof activeCategory === "string" ? activeCategory : activeCategory?.name;
                  const isActive = activeName === item.label;
                  const subs = item.children || [];
                  // Sub-categories (Studio › Menus › Shop categories › "Sits under") → drop-down,
                  // or their own links when Style › Navigation links › "no drop-down" is on.
                  if (subs.length > 0 && storefrontDesign?.navFlatSubcategories) {
                    return [item, ...subs.map((k: any) => ({ key: `cat:${k.id}`, label: k.name, category: k }))].map((c: any) => {
                      const on = activeName === c.label;
                      return (
                        <button key={c.key} onClick={() => pickCategory(c.category)} aria-current={on ? "true" : undefined}
                          style={{ ...navLinkStyle(storefrontDesign, on, headerTextColor), ...(stickers ? stickerPillStyle(storefrontDesign, itemIdx, on) : {}) }}
                          className={`transition-all hover:!opacity-100 hover-text-accent ${stickers ? "fm-sticker-pill" : ""}`}>
                          {c.label}
                        </button>
                      );
                    });
                  }
                  if (subs.length > 0) {
                    const branchActive = isActive || subs.some((k: any) => k.name === activeName);
                    return (
                      <NavDropdown
                        key={item.key}
                        design={storefrontDesign}
                        copyDesign={activeDesign}
                        label={item.label}
                        linkStyle={{ ...navLinkStyle(storefrontDesign, branchActive, headerTextColor), ...(stickers ? stickerPillStyle(storefrontDesign, itemIdx, branchActive) : {}) }}
                        className={`transition-all hover:!opacity-100 hover-text-accent ${stickers ? "fm-sticker-pill" : ""}`}
                        all={{ key: `${item.key}:all`, label: item.label, active: isActive, onSelect: () => pickCategory(cat) }}
                        entries={subs.map((k: any) => ({ key: `cat:${k.id}`, label: k.name, active: activeName === k.name, onSelect: () => pickCategory(categories.find((c: any) => c.id === k.id) || k) }))}
                      />
                    );
                  }
                  return (
                    <button
                      key={item.key}
                      onClick={() => pickCategory(cat)}
                      style={{
                        ...navLinkStyle(storefrontDesign, isActive, headerTextColor),
                        ...(stickers ? stickerPillStyle(storefrontDesign, itemIdx, isActive) : {}),
                      }}
                      className={`transition-all hover:!opacity-100 hover-text-accent ${stickers ? "fm-sticker-pill" : ""}`}
                      aria-current={isActive ? "true" : undefined}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
  );
  {
    return (
      <div
        data-fm-store data-studio-target="style:colors|style:type|style:layout" data-studio-label="Page background, colours & fonts"
        className="flex min-h-screen flex-col overflow-y-auto selection:bg-white selection:text-black"
        style={{ fontFamily: `'${resolveTypography(storefrontDesign).body}', sans-serif`, backgroundColor: storefrontBg, color: storefrontText }}
      >
        <TypographyTokens design={storefrontDesign} />
        {storefrontDesign?.customCss && <style>{storefrontDesign.customCss}</style>}
        {storefrontDesign?.navStyle === "stickers" && <style>{STICKER_PILL_CSS}</style>}
        {/* Promo / announcement banner */}
        {showAnnouncement && announcementMsg && (
          storefrontDesign?.announcementScrolling ? (
            <div
              data-section="announcements"
              data-studio-target="style:header" data-studio-label="Announcement bar"
              className="overflow-hidden py-2.5 sticky top-0 z-[60]"
              style={{
                backgroundColor: storefrontDesign?.announcementBg || "#e8402a",
                color: storefrontDesign?.announcementColor || "#100f0d",
              }}
            >
              <div
                className="flex w-max animate-marquee font-bold uppercase"
                style={{
                  ["--marquee-duration" as any]: `${Math.max(5, Math.min(120, storefrontDesign?.announcementSpeed ?? 24))}s`,
                  fontSize: storefrontDesign?.announcementFontSize ?? 10,
                  fontWeight: storefrontDesign?.announcementWeight ?? 700,
                  letterSpacing: `${storefrontDesign?.announcementTracking ?? 0.3}em`,
                }}
              >
                {[0, 1].map((copy) => (
                  <span key={copy} aria-hidden={copy === 1} className="px-8 whitespace-nowrap">
                    {Array.from({ length: 4 }).map(() => announcementMsg).join("        ")}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div
              data-section="announcements"
              data-studio-target="style:header" data-studio-label="Announcement bar"
              className="text-center py-2.5 px-6 text-[10px] tracking-[0.3em] font-bold uppercase sticky top-0 z-[60]"
              style={{
                backgroundColor: storefrontDesign?.announcementBg || "#e8402a",
                color: storefrontDesign?.announcementColor || "#100f0d",
              }}
            >
              {announcementMsg}
            </div>
          )
        )}

        <header
          data-section="navigation"
          data-studio-target="style:header|menus:header-order|copy:Header" data-studio-label="Header"
          className={`${storefrontDesign?.stickyHeader ?? true ? "sticky" : "relative"} ${showAnnouncement && announcementMsg ? "top-10" : "top-0"} z-50 transition-all duration-500 ${isHeaderTransparent ? "border-transparent" : isReferenceCatalog ? "" : "backdrop-blur-xl border-b"}`}
          style={{
            backgroundColor: headerBgColor,
            borderColor: headerBorderColor,
          }}
        >
          {isReferenceCatalog ? (
            <div className="mx-auto px-6 py-6" style={{ maxWidth: storefrontHeaderMaxWidth, color: headerTextColor }}>
              <div className="flex items-start justify-between gap-6">
                <button
                  onClick={() => setShowCatalog(false)}
                  className="text-left font-black tracking-tight leading-none hover:opacity-80 transition-opacity"
                  style={{ color: headerTextColor, textTransform: storefrontDesign?.brandTransform || "none", fontSize: `clamp(${catalogMastheadMobile}px, 5vw, ${catalogMastheadDesktop}px)` }}
                >
                  <span data-studio-target="style:catalogLayout|style:logo" data-studio-label="Masthead">{catalogMastheadText}</span>
                </button>
                {showBag && catalogCartPlacement === "top-right" && (
                  <button
                    onClick={() => setIsCartOpen(true)}
                    aria-label={getCopy(activeDesign, "ariaCart")}
                    className="flex items-center gap-2 pt-1 text-lg md:text-2xl font-black leading-none hover:opacity-70 transition-opacity"
                    style={{ color: headerTextColor }}
                  >
                    <ShoppingCart size={28} strokeWidth={2.4} />
                    <span>{cartCount}</span>
                    <span aria-hidden="true" className="font-light">|</span>
                    <span>
                      {cartTotal > 0 ? formatPrice(cartTotal) : formatPrice(Number(storefrontDesign?.catalogCartTotalPlaceholder ?? 0))}
                    </span>
                  </button>
                )}
              </div>
              <div className="mt-6" style={{ borderTop: `${storefrontHeaderRuleWidth}px solid ${storefrontDesign?.borderColor || headerBorderColor || "#B1B1AA"}` }} />
              <div data-studio-target="menus:header-order|menus:categories|style:navlinks" data-studio-label="Category bar" className="py-5 flex flex-wrap items-center text-base font-black" style={{ columnGap: catalogNavGapDesktop, rowGap: catalogNavGapMobile }}>
                {categories.filter((c: any) => c.showInNav !== false && !parentOf(c, categories)).slice(0, storefrontDesign?.referenceCategoryLimit ?? 1).map((cat: any) => {
                  const catName = typeof cat === "string" ? cat : cat.name;
                  const activeName = typeof activeCategory === "string" ? activeCategory : activeCategory?.name;
                  const isActive = activeName === catName;
                  const subs = childCategories(cat, categories).filter((k: any) => k.showInNav !== false);
                  if (subs.length > 0) {
                    const branchActive = isActive || subs.some((k: any) => k.name === activeName);
                    return (
                      <NavDropdown
                        key={catName}
                        design={storefrontDesign}
                        copyDesign={activeDesign}
                        studioTarget={false}
                        label={catName}
                        linkStyle={{ color: headerTextColor, fontSize: "inherit", fontWeight: "inherit", opacity: branchActive ? 1 : 0.7 }}
                        className="hover:!opacity-100"
                        all={{ key: `${catName}:all`, label: catName, active: isActive, onSelect: () => pickCategory(cat) }}
                        entries={subs.map((k: any) => ({ key: `cat:${k.id}`, label: k.name, active: activeName === k.name, onSelect: () => pickCategory(categories.find((c: any) => c.id === k.id) || k) }))}
                      />
                    );
                  }
                  return (
                    <button key={catName} onClick={() => pickCategory(cat)} className={isActive ? "opacity-100" : "opacity-70 hover:opacity-100"}>
                      {catName}⌄
                    </button>
                  );
                })}
                {(pages || []).filter((p: any) => p.showInNav && p.status === "published").map((page: any) => (
                  <Link key={page.id} to={`/page/${page.slug}`} className="hover:opacity-70 transition-opacity">{page.title}</Link>
                ))}
                <button onClick={() => setSearchOpen(true)} className="hover:opacity-70 transition-opacity">{getCopy(activeDesign, "navSearch")}</button>
                {showSys && (
                  <Link to="/admin" className="hover:opacity-70 transition-opacity opacity-40">{getCopy(activeDesign, "navAdmin")}</Link>
                )}
                {showBag && catalogCartPlacement === "nav-end" && (
                  <button onClick={() => setIsCartOpen(true)} className="hover:opacity-70 transition-opacity">
                    {cartCount} | {cartTotal > 0 ? formatPrice(cartTotal) : formatPrice(Number(storefrontDesign?.catalogCartTotalPlaceholder ?? 0))}
                  </button>
                )}
              </div>
              <div style={{ borderTop: `${storefrontHeaderRuleWidth}px solid ${storefrontDesign?.borderColor || headerBorderColor || "#B1B1AA"}` }} />
            </div>
          ) : (
          <div ref={headerRowRef} className="mx-auto px-6 py-4 flex flex-nowrap items-center justify-between gap-4" style={{ maxWidth: storefrontMaxWidth }}>
            {/* Left Section */}
            <div className={`flex min-w-0 items-center gap-8 md:gap-12 flex-1 ${storefrontLogoPosition === "center" ? "" : "flex-initial"}`}>
              {storefrontLogoPosition === "left" && (
                <button 
                  onClick={() => setShowCatalog(false)} 
                  style={{ color: headerTextColor }}
                  data-hdr-fixed className="shrink-0 text-xs tracking-[0.3em] font-semibold hover:opacity-80 transition-opacity flex items-center"
                >
                  <span data-studio-target="style:logo" data-studio-label="Logo"><LogoMark design={storefrontLogoDesign} /></span>
                </button>
              )}
              
              {!navBelow && navBar}
            </div>

            {/* Center Section (Logo) */}
            {storefrontLogoPosition === "center" && (
              <div className="flex-1 flex justify-center">
                <button 
                  onClick={() => setShowCatalog(false)} 
                  style={{ color: headerTextColor }}
                  data-hdr-fixed className="shrink-0 text-xs tracking-[0.3em] font-semibold hover:opacity-80 transition-opacity flex items-center"
                >
                  <span data-studio-target="style:logo" data-studio-label="Logo"><LogoMark design={storefrontLogoDesign} /></span>
                </button>
              </div>
            )}

            {/* Right Section */}
            <div data-hdr-fixed data-studio-target="style:header|copy:Header" data-studio-label="Header icons & cart" className={`flex shrink-0 flex-nowrap gap-6 md:gap-8 items-center flex-1 justify-end ${storefrontLogoPosition === "right" ? "flex-initial" : ""}`}>
              {storefrontLogoPosition === "right" && (
                <button 
                  onClick={() => setShowCatalog(false)} 
                  style={{ color: headerTextColor }}
                  data-hdr-fixed className="shrink-0 text-xs tracking-[0.3em] font-semibold hover:opacity-80 transition-opacity flex items-center"
                >
                  <span data-studio-target="style:logo" data-studio-label="Logo"><LogoMark design={storefrontLogoDesign} /></span>
                </button>
              )}

              {storefrontDesign?.menus?.header?.length > 0 && (
                <div className="mr-2" style={{ color: headerTextColor }}><StoreMenu items={storefrontDesign.menus.header} /></div>
              )}

              {!activeDesign?.hideHeaderSearch && <button
                onClick={() => setSearchOpen(true)}
                aria-label={getCopy(activeDesign, "ariaSearch")}
                style={{ color: headerTextColor }}
                className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-all opacity-50 hover:opacity-100"
              >
                <SearchIcon size={14} />
              </button>}
              {!activeDesign?.hideHeaderWishlist && <Link
                to="/wishlist"
                aria-label={getCopy(activeDesign, "ariaWishlist")}
                style={{ color: headerTextColor }}
                className="relative hidden sm:flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-all opacity-50 hover:opacity-100"
              >
                <Heart size={14} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[8px] font-bold text-white rounded-full px-1.5 py-0.5" style={{ backgroundColor: "var(--accent)" }}>
                    {wishlistCount}
                  </span>
                )}
              </Link>}
              {!activeDesign?.hideHeaderAccount && <Link
                to="/account"
                aria-label={getCopy(activeDesign, "ariaAccount")}
                style={{ color: headerTextColor }}
                className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-all opacity-50 hover:opacity-100"
              >
                <UserIcon size={14} />
              </Link>}
              {(!activeDesign?.hideCurrencySelector || !activeDesign?.hideThemeToggle) && (
                <div className="hidden sm:flex items-center justify-center gap-2">
                  {!activeDesign?.hideCurrencySelector && <CurrencySelector label={getCopy(activeDesign, "currencyLabel")} ariaLabel={getCopy(activeDesign, "ariaCurrency")} />}
                  {!activeDesign?.hideThemeToggle && <ThemeToggle label={getCopy(activeDesign, "ariaThemeToggle")} />}
                </div>
              )}
              {showSys && <Link
                to="/admin"
                style={{ color: headerTextColor }}
                className="hidden sm:flex items-center gap-1.5 whitespace-nowrap text-[9px] tracking-[0.2em] font-bold transition-all uppercase mr-2 opacity-30 hover:opacity-100"
              >
                {getCopy(activeDesign, "navAdmin")}
              </Link>}
              {showBag && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className={`group flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 transition-all hover:scale-[1.02] store-btn-primary ${
                    storefrontButtonShadow ? "shadow-lg" : ""
                  } ${storefrontDesign?.navStyle === "stickers" ? "fm-sticker-pill" : ""}`}
                  style={{
                    backgroundColor: storefrontButtonStyle === "solid" ? storefrontButtonBg : "transparent",
                    color: storefrontButtonStyle === "solid" ? storefrontButtonText : storefrontButtonBg,
                    border: storefrontButtonStyle !== "solid" ? `1px solid ${storefrontButtonBg}` : "none",
                    borderRadius: storefrontButtonRadius,
                    ...(storefrontDesign?.navStyle === "stickers"
                      ? { borderRadius: storefrontDesign?.navPillRadius || "14px 4px 14px 4px", transform: "rotate(2deg)" }
                      : {}),
                  }}
                >
                  <span className={`text-[10px] tracking-[0.2em] font-semibold ${storefrontButtonUppercase ? "uppercase" : ""}`}>
                    {bagLabel}
                  </span>
                  {cartCount > 0 && (
                    <span
                      style={{
                        backgroundColor: storefrontButtonStyle === "solid" ? storefrontButtonText : storefrontButtonBg,
                        color: storefrontButtonStyle === "solid" ? storefrontButtonBg : storefrontButtonText,
                      }}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-colors"
                    >
                      {cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
          )}
          {!isReferenceCatalog && navBelow && (
            <div className="border-t" style={{ borderColor: headerBorderColor }}>
              <div className="mx-auto px-6" style={{ maxWidth: storefrontMaxWidth }}>{navBar}</div>
            </div>
          )}
        <MobileStorefrontNav design={activeDesign} pages={pages} onSearch={() => setSearchOpen(true)} />
        </header>

        {onHome ? (
          <main className="relative w-auto flex-1 overflow-hidden">
            <SectionList
              sections={homeSections}
              colorSchemes={heroDesign.colorSchemes?.length > 0 ? heroDesign.colorSchemes : activeDesign.colorSchemes}
              books={books}
              onCtaClick={() => setShowCatalog(true)}
              onProductClick={(book: any) =>
                navigate(`/books/${(book as any).slug || book.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)
              }
              enableAnimations={heroDesign?.enableAnimations ?? true}
              dataSection="homepage"
              sharedBlocks={activeDesign.sharedBlocks || []}
              design={activeDesign}
            />
          </main>
        ) : (
        <main className="mx-auto w-full flex-1 px-6 py-12 md:py-20" style={{ maxWidth: isReferenceCatalog ? storefrontHeaderMaxWidth : storefrontMaxWidth }}>
          {/* Theme-editor sections authored for the storefront page template */}
          <TemplateSections design={activeDesign} templateId="storefront" books={books} />

          {/* Catalog heading + title count */}
          {(storefrontDesign?.catalogHeading || storefrontDesign?.showCatalogCount) && (
            <div data-studio-target="style:catalog" data-studio-label="Catalog heading" className="flex items-baseline justify-between flex-wrap gap-4 mb-8">
              {storefrontDesign?.catalogHeading && (
                <h1 className="text-3xl md:text-5xl tracking-tight m-0">{storefrontDesign.catalogHeading}</h1>
              )}
              {storefrontDesign?.showCatalogCount && (
                <span className="text-xs fm-muted">
                  {getCopy(activeDesign, filteredItems.length === 1 ? "catalogCountOne" : "catalogCountMany", { count: filteredItems.length })}
                </span>
              )}
            </div>
          )}

          {/* Category filter chips */}
          {storefrontDesign?.showCategoryChips && (
            <div data-studio-target="menus:categories|style:catalog" data-studio-label="Category chips" className="flex gap-2.5 flex-wrap mb-10">
              {[{ name: "ALL", value: "ALL" as any }, ...categories.filter((c: any) => c.showInNav !== false).map((c: any) => ({ name: typeof c === "string" ? c : c.name, value: c }))].map((chip: any) => {
                const isActive = chip.value === "ALL"
                  ? activeCategory === "ALL"
                  : (typeof activeCategory === "string" ? activeCategory : activeCategory?.name) === chip.name;
                const count = categoryChipCounts[chip.name] ?? 0;
                return (
                  <button
                    key={chip.name}
                    onClick={() => pickCategory(chip.value)}
                    aria-pressed={isActive}
                    className={`rounded-full border px-4 py-2 text-[11px] font-bold tracking-[0.06em] uppercase transition-colors ${
                      isActive ? "fm-active border-transparent" : "border-white/10 fm-muted hover:border-white/40"
                    }`}
                  >
                    {chip.name}
                    {storefrontDesign?.categoryChipShowCounts !== false && ` (${count})`}
                  </button>
                );
              })}
              {navItems.filter((i) => i.kind === "page").map((i: any) => (
                <Link
                  key={i.key}
                  to={`/page/${i.page.slug}`}
                  className="rounded-full border border-white/10 fm-muted hover:border-white/40 px-4 py-2 text-[11px] font-bold tracking-[0.06em] uppercase transition-colors"
                >
                  {i.label}
                </Link>
              ))}
            </div>
          )}

          {/* Category Header */}
          <AnimatePresence mode="wait">
            {activeCategory && (activeCategory.description || activeCategory.imageUrl) && (
              <motion.div
                key={activeCategory.id || activeCategory.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-16 space-y-8"
              >
                {activeCategory.imageUrl && (
                  <div className="aspect-[21/9] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <img src={activeCategory.imageUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" alt={activeCategory.name} />
                  </div>
                )}
                <div className="max-w-3xl">
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 uppercase">
                    {activeCategory.name}
                  </h2>
                  {activeCategory.description && (
                    <p className="text-sm md:text-base text-white/60 leading-relaxed font-medium">
                      {activeCategory.description}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {showCatalogControls && (
            <CatalogControls
              query={searchQuery}
              setQuery={setSearchQuery}
              sort={sort}
              setSort={setSort}
              inStockOnly={inStockOnly}
              setInStockOnly={setInStockOnly}
              resultCount={filteredItems.length}
              design={storefrontDesign}
            />
          )}

          {filteredItems.length === 0 && (
            <p className="py-20 text-center text-[10px] tracking-[0.4em] text-white/30 uppercase">
              {getCopy(storefrontDesign, "catalogEmpty")}
            </p>
          )}

          <div data-studio-target="style:products|style:catalogLayout|copy:Catalog & empty states" data-studio-label="Product grid" className={`grid ${mobileColsClass} ${desktopColsClass}`} style={{ gap: storefrontGridGap, rowGap: isReferenceCatalog ? Math.max(40, storefrontGridGap * 3) : shopSectionSpacing }}>
            {filteredItems.map((item: any, index: number) => {
              const slug = getBookSlug(item);
              const stock = item.stockLevel ?? 999;
              const isOutOfStock = stock === 0;
              const isLowStock = stock > 0 && stock !== 999 && stock <= designNumber(activeDesign, "lowStockCardThreshold", 5);
              const onSale = !!item.isOnSale && item.salePrice > 0 && item.salePrice < (item.retailPrice ?? 0);
              const displayPrice = onSale ? item.salePrice : item.retailPrice;
              const isNewArrival = (() => {
                if (!item.createdAt) return false;
                const created = new Date(item.createdAt).getTime();
                if (Number.isNaN(created)) return false;
                return (Date.now() - created) <= newBadgeDays * 86_400_000;
              })();
              const wished = isWished(item.id);
              return (
                <motion.article
                  key={item.id || index}
                  initial={(storefrontDesign?.enableAnimations ?? true) ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={(storefrontDesign?.enableAnimations ?? true)
                    ? { duration: 0.8, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }
                    : { duration: 0 }
                  }
                  className={`group relative transition-all duration-500 ${storefrontDesign?.productHoverEffect === "lift" ? "hover:-translate-y-2" : ""} ${cardStyle === "card" ? "fm-surface border border-white/10 p-3" : ""}`}
                  style={cardStyle === "card" ? { borderRadius: storefrontCardRadius } : undefined}
                >
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWish(item.id); }}
                    aria-label={getCopy(activeDesign, wished ? "wishlistRemoveAria" : "wishlistAddAria")}
                    className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                      wished
                        ? "fm-favorite-active border"
                        : "bg-black/40 text-white/70 border border-white/10 hover:text-white opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Heart size={13} fill={wished ? "currentColor" : "none"} />
                  </button>
                  <Link to={`/books/${slug}`}>
                    <div className={`relative fm-surface fm-photo-frame mb-4 overflow-hidden ${isReferenceCatalog || cardStyle === "minimal" ? "" : "border border-white/5 shadow-2xl"}`} style={{ borderRadius: storefrontCardRadius, aspectRatio: imageAspectStyle }}>
                      <SkeletonImage
                        src={item.photos?.[0]?.url || placeholderImage(activeDesign)}
                        alt={item.title}
                        className={`w-full h-full ${storefrontImageFit} transition-transform duration-700 ease-out ${storefrontDesign?.productHoverEffect === "zoom" ? "group-hover:scale-110" : ""}`}
                        style={{ objectPosition: `${catalogImageFocalX}% ${catalogImageFocalY}%` }}
                      />
                      {/* Status ribbons */}
                      <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
                        {isOutOfStock && showSoldOutBadge && (
                          <span 
                            style={{ backgroundColor: storefrontDesign?.badgeBgSecondary || "rgba(0,0,0,0.8)", color: storefrontDesign?.badgeTextSecondary || "rgba(255,255,255,0.7)" }}
                            className="text-[8px] tracking-widest px-2 py-1 uppercase border border-white/20"
                          >
                            {soldOutLabel}
                          </span>
                        )}
                        {!isOutOfStock && onSale && showSaleBadge && (
                          <span 
                            style={{ backgroundColor: storefrontDesign?.badgeBgPrimary || "rgb(244 63 94 / 0.9)", color: storefrontDesign?.badgeTextPrimary || "#ffffff" }}
                            className="text-[8px] font-bold tracking-widest px-2 py-1 uppercase border border-white/10 rounded-sm"
                          >
                            {saleBadgeLabel}
                          </span>
                        )}
                        {!isOutOfStock && isNewArrival && showNewBadge && (
                          <span 
                            style={{ backgroundColor: storefrontDesign?.badgeBgPrimary || "rgb(16 185 129 / 0.9)", color: storefrontDesign?.badgeTextPrimary || "#000000" }}
                            className="text-[8px] font-bold tracking-widest px-2 py-1 uppercase border border-white/10 rounded-sm"
                          >
                            {newBadgeLabel}
                          </span>
                        )}
                        {!isOutOfStock && isLowStock && (
                          <span 
                            style={{ 
                              color: storefrontDesign?.lowInventoryColor || "#f59e0b",
                              borderColor: `${storefrontDesign?.lowInventoryColor || "#f59e0b"}40`,
                              backgroundColor: `${storefrontDesign?.lowInventoryColor || "#f59e0b"}15`
                            }}
                            className="flex items-center gap-1 border backdrop-blur-md text-[8px] tracking-widest px-2 py-1 uppercase rounded-full"
                          >
                            <Zap size={9} /> {getCopy(activeDesign, "onlyLeft", { count: stock })}
                          </span>
                        )}
                      </div>
                      {/* Hover overlay — show "VIEW" instead of add directly */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                        <span
                          style={{
                            backgroundColor: storefrontButtonStyle === "solid" ? storefrontButtonBg : "transparent",
                            color: storefrontButtonStyle === "solid" ? storefrontButtonText : storefrontButtonBg,
                            border: storefrontButtonStyle !== "solid" ? `1px solid ${storefrontButtonBg}` : "none",
                            borderRadius: storefrontButtonRadius,
                          }}
                          className={`w-full py-3 text-[10px] tracking-[0.2em] font-bold text-center transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 store-btn-primary ${storefrontButtonShadow ? "shadow-xl" : ""} ${storefrontButtonUppercase ? "uppercase" : ""}`}
                        >
                          {isOutOfStock ? soldOutLabel : storefrontCtaText}
                        </span>
                      </div>
                    </div>
                    <div
                      data-studio-target="style:products"
                      data-studio-label="Card title & price"
                      className={cardRuleWidth > 0 ? "pt-3" : ""}
                      style={cardRuleWidth > 0 ? { borderTop: `${cardRuleWidth}px solid rgba(var(--fg-rgb), 0.85)` } : undefined}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className={`fm-card-title ${isReferenceCatalog ? "text-lg md:text-xl font-black tracking-tight" : "text-sm tracking-wider font-medium"} leading-tight min-w-0 break-words`}
                          style={{ color: storefrontDesign?.productTitleColor || storefrontText, textTransform: storefrontTitleTransform }}
                        >
                          {item.title}
                        </h3>
                        {displayPrice > 0 && (
                          <span
                            className={`fm-card-price-wrap shrink-0 flex flex-col items-end leading-none font-mono tabular-nums ${priceOnHover ? "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100" : ""}`}
                            style={{ color: storefrontDesign?.productPriceColor || storefrontText }}
                          >
                            <span
                              className={`fm-card-price ${priceTagBoxed ? "fm-card-price-tag px-2 py-1" : ""} text-sm md:text-base font-bold whitespace-nowrap`}
                              style={priceTagBoxed ? { border: "2px solid currentColor" } : undefined}
                            >
                              {formatBookPrice(item)}
                            </span>
                            {onSale && (
                              <span className="fm-card-price-old mt-1 text-[10px] line-through opacity-50">{formatBookPrice(item, true)}</span>
                            )}
                          </span>
                        )}
                      </div>
                      {showCollectionMeta && (
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
                          {item.genres?.[0] || item.categories?.[0] || getCopy(activeDesign, "categoryFallback")}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.article>
              );
            })}
          </div>
        </main>
        )}

        <GlobalSections
          design={activeDesign}
          books={books}
          onCtaClick={() => setShowCatalog(true)}
          onProductClick={(book: any) =>
            navigate(`/books/${(book as any).slug || book.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)
          }
        />
        {!onHome && !activeDesign?.hideRecentlyViewed && <RecentlyViewedRow />}
        {!onHome && !activeDesign?.hideNewsletter && <Newsletter design={settings?.design} />}
        <SiteFooter settings={settings} pages={pages} />
        {(storefrontDesign?.showPoweredBy ?? false) && (
          <p data-studio-target="copy:Header|style:footer" data-studio-label="Powered-by line" className="text-center pb-8 text-[9px] tracking-[0.3em] uppercase opacity-50">{getCopy(activeDesign, "poweredBy")}</p>
        )}

        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} books={publishedBooks} design={activeDesign} />
      </div>
    );
  }

}
