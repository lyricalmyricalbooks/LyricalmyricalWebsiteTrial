import { describe, expect, it } from "vitest";
import { PREVIEW_BRIDGE_SOURCE } from "./previewBridge";

// The bridge is JavaScript shipped as a string into the preview iframe. A plain template literal
// swallows `\s` / `\w`, so check the code that actually arrives, not the TypeScript that wrote it.
const grab = (re: RegExp) => {
  const m = PREVIEW_BRIDGE_SOURCE.match(re);
  if (!m) throw new Error(`bridge source is missing ${re}`);
  return m[0];
};
const norm = new Function(`return ${grab(/function norm\(t\).*$/m)}`)() as (t: string) => string;
const esc = new Function(`return ${grab(/function esc\(t\).*$/m)}`)() as (t: string) => string;

/** Same construction the bridge uses to turn a copy string into a matcher. */
function matcher(text: string) {
  const s = norm(text);
  return /\{\w+\}/.test(s) ? new RegExp("^" + esc(s).replace(/\\\{\w+\\\}/g, ".+") + "$") : null;
}

describe("studio preview bridge source", () => {
  it("is valid JavaScript", () => {
    expect(() => new Function(PREVIEW_BRIDGE_SOURCE)).not.toThrow();
  });

  it("collapses whitespace without touching letters", () => {
    expect(norm("  Add  to\n  cart,\tplease ")).toBe("add to cart, please");
  });

  it("ships the real placeholder detector (not the backslash-less /{w+}/)", () => {
    expect(PREVIEW_BRIDGE_SOURCE).toContain(String.raw`hasVar = /\{\w+\}/.test(s)`);
    expect(PREVIEW_BRIDGE_SOURCE).toContain(String.raw`.replace(/\\\{\w+\\\}/g, '.+')`);
  });

  it("recognises {placeholder} copy and matches the rendered text", () => {
    const re = matcher("{count} unique entries");
    expect(re).not.toBeNull();
    expect(re!.test(norm("3 unique entries"))).toBe(true);
    expect(re!.test(norm("3 unique"))).toBe(false);
  });

  it("escapes regex characters in the copy around a placeholder", () => {
    const re = matcher("© {year} Lyricalmyrical Books · All rights reserved");
    expect(re!.test(norm("© 2026 Lyricalmyrical Books · All rights reserved"))).toBe(true);
    expect(matcher("Plain string (no vars)")).toBeNull();
  });
});
