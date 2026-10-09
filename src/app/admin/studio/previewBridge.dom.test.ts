// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PREVIEW_BRIDGE_SOURCE } from "./previewBridge";

// Runs the real bridge string in a page and checks what it reports to Studio.
const sent: any[] = [];
beforeAll(() => {
  (window as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0);
  Element.prototype.scrollIntoView = () => {};
  vi.spyOn(window, "postMessage").mockImplementation(((d: any) => { sent.push(d); }) as any);
  document.body.innerHTML = `
    <div data-studio-target="style:colors" data-studio-label="Page background">
      <header data-studio-target="style:header|copy:Header" data-studio-label="Header"><span data-studio-target="style:logo" data-studio-label="Logo">L</span></header>
      <section data-fm-section="hero"><h1>Hello</h1></section>
      <div data-studio-target="style:products" data-studio-label="Product grid"></div>
      <footer data-store-region="footerPanel" data-studio-target="style:footer|copy:Footer" data-studio-label="Footer"></footer>
    </div>`;
  new Function(PREVIEW_BRIDGE_SOURCE)();
});
afterEach(() => { sent.length = 0; });
afterAll(async () => { await new Promise(r => setTimeout(r, 0)); window.dispatchEvent(new Event("pagehide")); });
const fromStudio = (data: any) => window.dispatchEvent(new MessageEvent("message", { data, origin: location.origin, source: window }));

describe("preview bridge page structure", () => {
  it("reports every section and built-in part in page order, with its zone", () => {
    fromStudio({ type: "SCAN_STRUCTURE" });
    const msg = sent.find(m => m.type === "STRUCTURE");
    expect(msg).toBeTruthy();
    expect(msg.nodes.map((n: any) => [n.key, n.zone])).toEqual([
      ["t:style:colors|Page background", "main"],
      ["t:style:header|copy:Header|Header", "header"],
      ["t:style:logo|Logo", "header"],
      ["s:hero", "main"],
      ["t:style:products|Product grid", "main"],
      ["r:footerPanel", "footer"],
    ]);
    expect(msg.nodes[2].parent).toBe("t:style:header|copy:Header|Header");
  });

  it("opens a pop-over on request", () => {
    const seen: any[] = [];
    window.addEventListener("fm:studio-open-overlay", (e: any) => seen.push(e.detail.overlay));
    fromStudio({ type: "OPEN_OVERLAY", overlay: "cart" });
    fromStudio({ type: "OPEN_OVERLAY", overlay: "<script>" });
    expect(seen).toEqual(["cart"]);
  });

  it("reports which part the pointer is over, once per change", () => {
    const logo = document.querySelector("[data-studio-label=Logo]")!;
    logo.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    logo.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(sent.filter(m => m.type === "NODE_HOVER").map(m => m.key)).toEqual(["t:style:logo|Logo"]);
  });

  it("ignores messages from other origins", () => {
    window.dispatchEvent(new MessageEvent("message", { data: { type: "SCAN_STRUCTURE" }, origin: "https://evil.example", source: window }));
    expect(sent.some(m => m.type === "STRUCTURE")).toBe(false);
  });
});
