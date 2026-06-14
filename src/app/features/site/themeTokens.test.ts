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

  it("honors explicit overrides", () => {
    const css = buildStorefrontTokenVars({ successColor: "#00ff00", surfaceColor: "#123456" });
    expect(css).toContain("--success: #00ff00;");
    expect(css).toContain("--surface: #123456;");
  });
});

describe("STOREFRONT_TOKEN_CSS", () => {
  it("remaps the Tailwind alpha utilities onto the token layer", () => {
    expect(STOREFRONT_TOKEN_CSS).toContain(".text-white\\/40{color:rgba(var(--fg-rgb), 0.4);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".bg-black\\/70{background-color:rgba(var(--overlay-rgb), 0.7);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".border-white\\/\\[0\\.08\\]{border-color:rgba(var(--fg-rgb), 0.08);}");
  });

  it("scopes every rule under [data-fm-store]", () => {
    const rules = STOREFRONT_TOKEN_CSS.split("\n").filter((l) => l.trim().length > 0);
    expect(rules.every((r) => r.includes("[data-fm-store]"))).toBe(true);
  });

  it("provides solid semantic helper classes", () => {
    expect(STOREFRONT_TOKEN_CSS).toContain(".fm-surface{background-color:var(--surface);}");
    expect(STOREFRONT_TOKEN_CSS).toContain(".fm-success-solid{");
    expect(STOREFRONT_TOKEN_CSS).toContain(".fm-favorite-active{");
  });
});
