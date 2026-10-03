import { googleFontHref } from "./fonts";
import { cardFontNames, cardTypographyCss } from "./cardTypography";
import { smallPrintCss, smallPrintFontNames } from "./smallPrint";
import { photoOutlineCss } from "./photoShapes";
import { storefrontRegionCss, regionFontNames } from "./storefrontRegions";

// The Studio › Style controls that are turned into CSS rules (book-card title & price, small print)
// live in ONE place so every storefront surface obeys them — the shop grid (MainSite), the standalone
// pages (StorefrontThemeStyle) and the Studio preview iframe all render this. Any new storefront root
// that carries `data-fm-store` and injects its own token <style> must render <StorefrontOverrides>
// (`storefrontOverrides.test.ts` fails otherwise).

/** CSS for the merchant overrides. Empty until a control is set, so defaults are untouched. */
export const storefrontOverridesCss = (design: any): string => smallPrintCss(design) + cardTypographyCss(design) + photoOutlineCss(design) + storefrontRegionCss(design);

/** Google Fonts the override controls may ask for. */
export const storefrontOverridesFontNames = (design: any): string[] => [...cardFontNames(design), ...smallPrintFontNames(design), ...regionFontNames(design)];

export function StorefrontOverrides({ design }: { design?: any }) {
  const fonts = Array.from(new Set(storefrontOverridesFontNames(design)));
  return (
    <>
      {fonts.map((n) => <link key={n} rel="stylesheet" href={googleFontHref(n)} />)}
      <style>{storefrontOverridesCss(design)}</style>
    </>
  );
}
