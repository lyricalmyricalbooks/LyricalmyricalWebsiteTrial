import { describe, expect, it } from "vitest";
import * as lifecycle from "./stripeLifecycle";

const checkout = (options: Partial<Parameters<typeof lifecycle.stripeCheckoutState>[0]> = {}) => lifecycle.stripeCheckoutState({
  keyValid: true, redirect: false, hostedSelected: false, cardState: "ready", paymentStarted: false,
  ...options,
});

describe("Stripe checkout routing", () => {
  it("keeps a valid ready form inline", () => {
    expect(checkout()).toEqual({ inline: true, canPay: true, canUseHostedFallback: false });
  });
  it("allows server-created hosted checkout without a browser key", () => {
    expect(checkout({ keyValid: false })).toEqual({ inline: false, canPay: true, canUseHostedFallback: false });
    expect(checkout({ redirect: true, keyValid: false })).toEqual({ inline: false, canPay: true, canUseHostedFallback: false });
  });
  it("blocks payment while inline fields load", () => {
    expect(checkout({ cardState: "loading" })).toEqual({ inline: true, canPay: false, canUseHostedFallback: false });
  });
  it("offers an explicit hosted recovery before an intent exists", () => {
    expect(checkout({ cardState: "error" })).toEqual({ inline: true, canPay: false, canUseHostedFallback: true });
    expect(checkout({ cardState: "error", hostedSelected: true })).toEqual({ inline: false, canPay: true, canUseHostedFallback: false });
  });
  it("never changes payment routes after an inline attempt has started", () => {
    expect(checkout({ cardState: "error", paymentStarted: true })).toEqual({ inline: true, canPay: false, canUseHostedFallback: false });
    expect(checkout({ keyValid: false, paymentStarted: true })).toEqual({ inline: false, canPay: false, canUseHostedFallback: false });
    expect(checkout({ hostedSelected: true, paymentStarted: true, cardState: "error" }).canPay).toBe(false);
  });
});
