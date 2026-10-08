// @vitest-environment jsdom
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { StripeCardForm } from "./StripeCardForm";
const fake = vi.hoisted(() => {
  const handlers: Record<string, Record<string, Function>> = {};
  const create = vi.fn((type: string) => ({ on: (event: string, cb: Function) => { (handlers[type] ||= {})[event] = cb; }, mount: vi.fn(), destroy: vi.fn() }));
  return { handlers, create, options: vi.fn(), submit: vi.fn(async () => ({})), confirmPayment: vi.fn(async () => ({ paymentIntent: { id: "pi_test", status: "succeeded" } })) };
});
vi.mock("@stripe/stripe-js", () => ({ loadStripe: async () => ({ elements: (options: unknown) => { fake.options(options); return { create: fake.create, update() {}, submit: fake.submit }; }, confirmPayment: fake.confirmPayment }) }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); vi.clearAllMocks(); });
async function render(props: Record<string, unknown> = {}) {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(h(StripeCardForm, { publishableKey: "pk_test_key", amountCents: 2500, currency: "cad", loadingText: "Loading", errorText: "Failed", expressText: "Wallets", ...props })));
  return host;
}
it("shows express wallets only after Stripe reports an eligible wallet", async () => {
  const view = await render(); const region = view.querySelector('[data-studio-label="Express checkout wallets"]') as HTMLElement;
  expect(region.style.display).toBe("none");
  act(() => fake.handlers.expressCheckout.ready({ availablePaymentMethods: { applePay: false, googlePay: false } }));
  expect(region.style.display).toBe("none");
  act(() => fake.handlers.expressCheckout.ready({ availablePaymentMethods: { applePay: true } }));
  expect(region.style.display).toBe("");
});
it("uses the existing checkout callback and fails the wallet sheet when checkout rejects", async () => {
  const submit = vi.fn(async () => false), failed = vi.fn(); await render({ onExpressConfirm: submit });
  await act(async () => fake.handlers.expressCheckout.confirm({ paymentFailed: failed }));
  expect(submit).toHaveBeenCalledOnce(); expect(failed).toHaveBeenCalledWith({ reason: "fail" });
  expect(fake.confirmPayment).not.toHaveBeenCalled();
});
it("does not open wallets while checkout is unavailable or create them when Studio hides them", async () => {
  await render({ expressEnabled: false }); const resolve = vi.fn(), reject = vi.fn();
  fake.handlers.expressCheckout.click({ resolve, reject }); expect(resolve).not.toHaveBeenCalled(); expect(reject).toHaveBeenCalledOnce();
  act(() => root.unmount()); host.remove(); fake.create.mockClear(); await render({ showExpress: false });
  expect(fake.create).toHaveBeenCalledWith("payment", expect.anything());
  expect(fake.create).not.toHaveBeenCalledWith("expressCheckout", expect.anything());
});
it("keeps a successful express checkout on the shared navigation path", async () => {
  const submit = vi.fn(async () => true), failed = vi.fn(); await render({ onExpressConfirm: submit });
  await act(async () => fake.handlers.expressCheckout.confirm({ paymentFailed: failed }));
  expect(submit).toHaveBeenCalledOnce(); expect(failed).not.toHaveBeenCalled();
  expect(fake.confirmPayment).not.toHaveBeenCalled();
});

it("pairs dropdown text with its background and uses contrasting selected text", async () => {
  await render({ fieldBackground: "#111111", fieldText: "#ffffff" });
  const appearance = fake.options.mock.calls[0][0].appearance;
  expect(appearance.variables.colorBackground).toBe("rgb(17, 17, 17)");
  expect(appearance.variables.colorText).toBe("rgb(255, 255, 255)");
  expect(appearance.rules[".DropdownItem"]).toEqual({ backgroundColor: "var(--colorBackground)", color: "var(--colorText)" });
  expect(appearance.rules[".DropdownItem--highlight"]).toEqual({ backgroundColor: "var(--colorPrimary)", color: "var(--accessibleColorOnColorPrimary)" });
});
