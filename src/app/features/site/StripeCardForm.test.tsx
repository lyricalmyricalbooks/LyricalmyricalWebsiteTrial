// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StripeCardForm } from "./StripeCardForm";

const provider = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: provider.load }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
afterEach(() => { act(() => root?.unmount()); host?.remove(); vi.useRealTimers(); vi.clearAllMocks(); });
function render() {
  host = document.createElement("div"); document.body.append(host);
  root = createRoot(host);
  act(() => root.render(h(StripeCardForm, {
    publishableKey: "pk_test_abcdefghijklmnopqrstuvwxyz", amountCents: 2400, currency: "CAD",
    loadingText: "Loading payment", errorText: "Payment form unavailable",
  })));
}

describe("Stripe form loading recovery", () => {
  it("releases shoppers from a stalled Stripe loader and ignores a late response", async () => {
    vi.useFakeTimers();
    let resolve: (value: unknown) => void;
    provider.load.mockImplementation(() => new Promise(r => { resolve = r; }));
    render();
    expect(host.textContent).toContain("Loading payment");
    await act(async () => { vi.advanceTimersByTime(20000); });
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("Payment form unavailable");
    let mounted = false;
    await act(async () => { resolve!({ elements() { mounted = true; throw new Error("Must not mount after timeout"); } }); });
    expect(mounted).toBe(false);
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  });
  it("does not turn a ready form into an error when the loading deadline passes", async () => {
    vi.useFakeTimers();
    let ready: () => void = () => {};
    provider.load.mockResolvedValue({ elements: () => ({
      create: () => ({ on(event: string, callback: () => void) { if (event === "ready") ready = callback; }, mount() {}, destroy() {} }),
      update() {},
    }) });
    render();
    await act(async () => {});
    act(() => ready());
    await act(async () => { vi.advanceTimersByTime(20000); });
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.textContent).not.toContain("Loading payment");
  });
});
