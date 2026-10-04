// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { StripePaymentSection } from "./StripePaymentSection";
import { getCopy } from "./storeCopy";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); });
function render(props: Record<string, unknown> = {}) {
  host = document.createElement("div"); document.body.append(host);
  root = createRoot(host);
  act(() => root.render(h(StripePaymentSection, {
    design: {}, selected: true, inline: false, canUseHostedFallback: false,
    busy: false, onSelect() {}, onHostedFallback() {}, children: null, ...props,
  })));
  return host;
}

describe("Stripe payment section", () => {
  it("shows the hosted route instead of claiming card payments are unavailable", () => {
    const view = render();
    expect(view.textContent).toContain(getCopy({}, "coStripeNote"));
    expect(view.textContent).not.toContain(getCopy({}, "coStripeConfigError"));
  });
  it("keeps interactive payment fields outside the method radio label", () => {
    const view = render({ inline: true, children: h("input", { id: "provider-field" }) });
    expect(view.querySelector("#provider-field")?.closest("label")).toBeNull();
    expect(view.querySelector('input[type="radio"]')?.closest("label")).not.toBeNull();
  });
  it("lets a shopper explicitly choose hosted recovery", () => {
    let chosen = 0;
    const view = render({ inline: true, canUseHostedFallback: true, onHostedFallback() { chosen++; } });
    const recovery = view.querySelector("button")!;
    expect(recovery.textContent).toBe(getCopy({}, "coStripeHostedFallback"));
    act(() => recovery.click());
    expect(chosen).toBe(1);
  });
  it("removes recovery once payment has started and disables it while busy", () => {
    expect(render({ inline: true }).querySelector("button")).toBeNull();
    act(() => root.unmount()); host.remove();
    let chosen = 0;
    const button = render({ inline: true, canUseHostedFallback: true, busy: true, onHostedFallback() { chosen++; } }).querySelector("button")!;
    act(() => button.click());
    expect(chosen).toBe(0);
  });
  it("uses edited labels and hides optional card brands and help", () => {
    const view = render({ design: { regions: { stripeBrandsVisible: false, stripePaymentHelpVisible: false }, copy: { coCard: "Pay with Stripe" } } });
    expect(view.textContent).toContain("Pay with Stripe");
    expect(view.textContent).not.toContain("VISA");
    expect(view.textContent).not.toContain(getCopy({}, "coStripeNote"));
    expect(view.querySelector('[data-studio-target]')).not.toBeNull();
  });
});
