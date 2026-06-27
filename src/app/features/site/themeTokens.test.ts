import { describe, it, expect } from "vitest";
import {
  hexToRgbTriplet,
  buildStorefrontTokenVars,
  STOREFRONT_TOKEN_CSS,
} from "./themeTokens";

describe("hexToRgbTriplet", () => {
  it("parses 6-digit hex", () => {
    expect(hexToRgbTriplet("#A855F7")).toBe("168 85 247");
  });

  it("parses 3-digit shorthand hex", () => {
    expect(hexToRgbTriplet("#fff")).toBe("255 255 255");
  });

  it("parses rgb()/rgba()", () => {
    expect(hexToRgbTriplet("rgba(255, 255, 255, 0.05)")).toBe("255 255 255");
    expect(hexToRgbTriplet("rgb(10 20 30)")).toBe("10 20 30");
  });

  it("falls back on invalid input", () => {
    expect(hexToRgbTriplet(undefined)).toBe("255 255 255");
    expect(hexToRgbTriplet("not-a-color", "0 0 0")).toBe("0 0 0");
  });
});

describe("buildStorefrontTokenVars", () => {
  it("emits defaults when design is empty (preserves current dark look)", () => {
    const css = buildStorefrontTokenVars({});
    expect(css).toContain("--fg-rgb: 255 255 255;");
    expect(css).toContain("--surface: #0a0a0a;");
    expect(css).toContain("--success: #34d399;");
    expect(css).toContain("--favorite: #fb7185;");
  });

  it("derives the foreground triplet from textColor", () => {
    const css = buildStorefrontTokenVars({ textColor: "#111111" });
    expect(css).toContain("--fg-rgb: 17 17 17;");
  });

  it("defaults active-control colors to text/background when unset", () => {
    const css = buildStorefrontTokenVars({ textColor: "#eeeeee", backgroundColor: "#101010" });
    expect(css).toContain("--active-bg: #eeeeee;");
    expect(css).toContain("--active-fg: #101010;");
  });

  it("border tint defaults to the foreground, follows borderColor when set", () => {
    expect(buildStorefrontTokenVars({ textColor: "#111111" })).toContain("--border-rgb: 17 17 17;");
    expect(buildStorefrontTokenVars({ surfaceColor: "#123456", surfaceRaisedColor: "#abcdef" })).toContain("--surface-rgb: 18 52 86;");
    expect(buildStorefrontTokenVars({ surfaceColor: "#123456", surfaceRaisedColor: "#abcdef" })).toContain("--surface-2-rgb: 171 205 239;");
    expect(buildStorefrontTokenVars({ borderColor: "#B1B1AA" })).toContain("--border-rgb: 177 177 170;");
  });

  it("honors explicit overrides", () => {
    const css = buildStorefrontTokenVars({ successColor: "#00ff00", surfaceColor: "#123456" });
    expect(css).toContain("--success: #00ff00;");
    expect(css).toContain("--surface: #123456;");
  });
});

describe("STOREFRONT_TOKEN_CSS", () => {
  it("remaps the Tailwind alpha utilities onto the token layer", () => {
    expect(STOREFRONT_TOKEN_CSS).toContain(".text-white\\/40{color:rgba(var(--fg-rgb), 0.4);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".bg-white\\/\\[0\\.03\\]{background-color:rgba(var(--surface-rgb), 0.03);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".bg-black\\/70{background-color:rgba(var(--overlay-rgb), 0.7);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".border-white\\/\\[0\\.08\\]{border-color:rgba(var(--border-rgb), 0.08);}");
  });

  it("scopes every rule under [data-fm-store]", () => {
    const rules = STOREFRONT_TOKEN_CSS.split("\n").filter((l) => l.trim().length > 0);
    expect(rules.every((r) => r.includes("[data-fm-store]"))).toBe(true);
  });

  it("maps the brand semantic hues (violet/emerald/cyan/amber/rose) onto tokens", () => {
    expect(STOREFRONT_TOKEN_CSS).toContain(".bg-violet-500{background-color:var(--accent);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".border-violet-500\\/30{border-color:rgba(var(--accent-rgb), 0.3);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".text-emerald-400{color:var(--success);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".bg-emerald-500\\/10{background-color:rgba(var(--success-rgb), 0.1);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".text-cyan-400{color:var(--accent-2);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".text-amber-400{color:var(--warning);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".text-rose-400{color:var(--danger);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".bg-purple-600{background-color:var(--accent);}");
  });

  it("emits the new status tokens with defaults", () => {
    const css = buildStorefrontTokenVars({});
    expect(css).toContain("--accent-2: #22d3ee;");
    expect(css).toContain("--warning: #f59e0b;");
    expect(css).toContain("--danger: #f43f5e;");
    expect(css).toContain("--muted: #94a3b8;");
  });

  it("provides solid semantic helper classes", () => {
    expect(STOREFRONT_TOKEN_CSS).toContain(".fm-surface{background-color:var(--surface);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".fm-success-solid{");
    expect(STOREFRONT_TOKEN_CSS).toContain(".fm-favorite-active{");
  });
});
