import { describe, expect, it } from "vitest";
import { PREVIEW_BRIDGE_SOURCE } from "./previewBridge";

// The bridge is JavaScript shipped as a string into the preview iframe; a plain template literal would
// swallow `\s`. Check the code that actually arrives, not the TypeScript that wrote it.
describe("studio preview bridge source", () => {
  it("is valid JavaScript", () => {
    expect(() => new Function(PREVIEW_BRIDGE_SOURCE)).not.toThrow();
  });

  it("collapses whitespace without touching letters", () => {
    const m = PREVIEW_BRIDGE_SOURCE.match(/function norm\(t\)\{[^}]*\}/);
    expect(m).not.toBeNull();
    const norm = new Function(`return ${m![0]}`)() as (t: string) => string;
    expect(norm("  Add  to\n  cart,\tplease ")).toBe("add to cart, please");
  });
});
