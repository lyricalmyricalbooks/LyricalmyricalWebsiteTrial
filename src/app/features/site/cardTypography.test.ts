import { describe, it, expect } from "vitest";
import { cardTypographyCss } from "./cardTypography";
import { smallPrintCss } from "./smallPrint";

describe("cardTypographyCss", () => {
  it("emits nothing until a control is set", () => {
    expect(cardTypographyCss({})).toBe("");
    expect(cardTypographyCss({ cardTitleSize: 0, cardPriceSize: 0 })).toBe("");
  });

  it("styles the title and the price amount separately", () => {
    const css = cardTypographyCss({ productTitleColor: "#0f0", cardTitleWeight: "800", productPriceColor: "#00f", cardPriceWeight: "500" });
    expect(css).toContain(".fm-card-title{color:#0f0 !important;font-weight:800 !important;}");
    expect(css).toContain(".fm-card-price-wrap{color:#00f !important;}");
    expect(css).toContain(".fm-card-price{font-weight:500 !important;}");
  });

  it("uses one size everywhere unless a phone size is set", () => {
    const one = cardTypographyCss({ cardTitleSize: 24 });
    expect(one).toContain("(max-width:767px){[data-fm-store] .fm-card-title{font-size:24px");
    expect(one).toContain("(min-width:768px){[data-fm-store] .fm-card-title{font-size:24px");
    const split = cardTypographyCss({ cardTitleSize: 24, cardTitleSizeMobile: 16 });
    expect(split).toContain("(max-width:767px){[data-fm-store] .fm-card-title{font-size:16px");
    expect(split).toContain("(min-width:768px){[data-fm-store] .fm-card-title{font-size:24px");
  });

  it("leaves desktop automatic when only the phone size is set", () => {
    const css = cardTypographyCss({ cardPriceSizeMobile: 12 });
    expect(css).toContain("(max-width:767px)");
    expect(css).not.toContain("min-width");
  });

  it("cannot be used to break out of the rule", () => {
    const css = cardTypographyCss({ productTitleColor: "red;}body{display:none", cardTitleFont: "A';}x{" });
    expect(css).not.toContain("body{display:none");
    expect(css).not.toContain("}x{");
  });
});

describe("smallPrintCss", () => {
  it("emits nothing until a control is set", () => {
    expect(smallPrintCss({})).toBe("");
  });

  it("only raises sizes below the minimum", () => {
    const css = smallPrintCss({ smallPrintMinSize: 10 });
    expect(css).toContain('[class~="text-[8px]"]{font-size:10px');
    expect(css).toContain('[class~="text-[9px]"]{font-size:10px');
    expect(css).not.toContain('[class~="text-[10px]"]');
    expect(css).not.toContain('[class~="text-[11px]"]');
  });

  it("keeps buttons and filled chips on their own text colour", () => {
    const css = smallPrintCss({ smallPrintColor: "#ccc" });
    expect(css).toContain(":not(button)");
    expect(css).toContain(':not([class*="bg-"])');
    expect(css).toContain("color:#ccc");
  });
});
