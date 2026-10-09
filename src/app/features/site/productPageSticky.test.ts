import { describe, it, expect } from "vitest";
import { productPageCss } from "./productPageStyle";

describe("sticky add-to-bag bar CSS", () => {
  it("follows theme tokens by default and the Studio colours when set", () => {
    const base = productPageCss({});
    expect(base).toContain(".fm-pdp-sticky{position:fixed");
    expect(base).toContain("background:var(--surface)");
    const custom = productPageCss({ stickyBuyBarBg: "#123456", stickyBuyBarBorderColor: "#abcdef" });
    expect(custom).toContain("background:#123456");
    expect(custom).toContain("solid #abcdef");
  });

  it("hides on tablets and desktops when set to phones only", () => {
    expect(productPageCss({})).not.toContain("min-width:768px");
    expect(productPageCss({ stickyBuyBarDevices: "mobile" })).toMatch(/@media \(min-width:768px\)\{[^}]*\.fm-pdp-sticky,[^}]*\.fm-pdp-sticky-spacer\{display:none;\}\}/);
  });
});
