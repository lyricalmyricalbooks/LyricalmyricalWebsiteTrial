// "Small print" = the tiny 8–11px labels, captions, eyebrows and meta lines the storefront uses
// everywhere (text-[8px] … text-[11px]). Studio › Style › "Small print & labels" adjusts all of it
// at once: a minimum size (so nothing is too small to read), colour, case, letter spacing and font.
// Rules are only emitted when the merchant set the matching control, so defaults are untouched.

const TINY_PX = [8, 9, 10, 11];
const tiny = TINY_PX.map((px) => `[class~="text-[${px}px]"]`);
const S = "[data-fm-store]";
const clean = (v: any) => String(v).replace(/[;{}<>]/g, "");
const font = (name: any) => `'${String(name).replace(/['"\\;{}<>]/g, "")}', sans-serif`;

export function smallPrintCss(design: any): string {
  const d = design || {};
  let css = "";

  const min = Number(d.smallPrintMinSize);
  if (Number.isFinite(min) && min > 0) {
    for (const px of TINY_PX) {
      if (min > px) css += `${S} [class~="text-[${px}px]"]{font-size:${min}px !important;}`;
    }
  }

  const any = `:is(${tiny.join(",")})`;
  const props: string[] = [];
  if (d.smallPrintCase === "uppercase" || d.smallPrintCase === "none") props.push(`text-transform:${d.smallPrintCase} !important;`);
  if (d.smallPrintFont) props.push(`font-family:${font(d.smallPrintFont)} !important;`);
  if (d.smallPrintTracking != null && d.smallPrintTracking !== "" && Number.isFinite(Number(d.smallPrintTracking))) {
    props.push(`letter-spacing:${Number(d.smallPrintTracking)}em !important;`);
  }
  if (props.length) css += `${S} ${any}{${props.join("")}}`;

  // Colour skips buttons and filled chips/badges, whose text colour is chosen for their own background.
  if (d.smallPrintColor) {
    css += `${S} ${any}:not(button):not(a[class*="bg-"]):not([class*="bg-"]):not([class*="fm-active"]):not([class*="store-btn"]){color:${clean(d.smallPrintColor)};}`;
  }
  return css;
}

export const smallPrintFontNames = (d: any): string[] => [d?.smallPrintFont].filter(Boolean).map(String);
