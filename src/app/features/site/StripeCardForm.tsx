import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { googleFontHref } from "./fonts";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";

export type StripeCardFormHandle = {
  /** Validates the form fields; returns an error message or null. */
  validate: () => Promise<string | null>;
  /** Confirms the payment against a server-created PaymentIntent. */
  confirm: (clientSecret: string, returnUrl: string) => Promise<{ error?: string; paymentIntentId?: string; status?: string }>;
};

/** Resolves a theme-token colour (e.g. `var(--accent, #hex)`) so Stripe's fields match the Studio design. */
function tokenColor(el: HTMLElement, cssValue: string) {
  const probe = document.createElement("span");
  probe.style.color = cssValue;
  el.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

/**
 * Stripe Payment Element shown directly on the checkout page (deferred intent):
 * it renders before the order exists; the server creates the PaymentIntent
 * with its own prices only when the shopper clicks "Pay securely".
 */
export const StripeCardForm = forwardRef<StripeCardFormHandle, {
  publishableKey: string;
  amountCents: number;
  currency: string;
  loadingText: string;
  errorText: string;
  /** Google Font used inside Stripe's fields (Studio › Checkout form field font). */
  fontName?: string;
  style?: React.CSSProperties;
}>(function StripeCardForm({ publishableKey, amountCents, currency, loadingText, errorText, fontName, style }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const safeAmount = Math.max(50, Math.round(amountCents || 0));

  useEffect(() => {
    let cancelled = false;
    let element: { destroy: () => void } | null = null;
    (async () => {
      try {
        const stripe = await loadStripe(publishableKey);
        if (!stripe || cancelled || !host.current) return;
        const el = host.current;
        const elements = stripe.elements({
          mode: "payment",
          amount: safeAmount,
          currency: currency.toLowerCase(),
          fonts: fontName ? [{ cssSrc: googleFontHref(fontName) }] : [],
          appearance: {
            theme: "flat",
            variables: {
              colorPrimary: tokenColor(el, "var(--accent, #e8402a)"),
              colorBackground: tokenColor(el, "var(--surface, #ffffff)"),
              colorText: getComputedStyle(el).color,
              colorDanger: tokenColor(el, "var(--danger, #b4271a)"),
              borderRadius: "0px",
              ...(fontName ? { fontFamily: `'${fontName.replace(/'/g, "")}', system-ui, sans-serif` } : {}),
            },
          },
        });
        const payment = elements.create("payment", { layout: "tabs" });
        payment.on("ready", () => !cancelled && setState("ready"));
        payment.on("loaderror", () => !cancelled && setState("error"));
        payment.mount(el);
        stripeRef.current = stripe;
        elementsRef.current = elements;
        element = payment;
      } catch (err) {
        console.error("Card form failed to load", err);
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; element?.destroy(); elementsRef.current = null; };
    // amount/currency changes are pushed with elements.update below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishableKey, fontName]);

  useEffect(() => {
    elementsRef.current?.update({ amount: safeAmount, currency: currency.toLowerCase() });
  }, [safeAmount, currency]);

  useImperativeHandle(ref, () => ({
    validate: async () => {
      if (!elementsRef.current) return errorText;
      const { error } = await elementsRef.current.submit();
      return error?.message || null;
    },
    confirm: async (clientSecret, returnUrl) => {
      const stripe = stripeRef.current;
      const elements = elementsRef.current;
      if (!stripe || !elements) return { error: errorText };
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });
      if (result.error) return { error: result.error.message || errorText };
      return { paymentIntentId: result.paymentIntent?.id, status: result.paymentIntent?.status };
    },
  }), [errorText]);

  return (
    <div className="fm-stripe-card-form" style={style} data-studio-target="style:checkout" data-studio-label="Card payment form">
      {state === "loading" && <p className="py-4 text-center text-sm text-slate-500">{loadingText}</p>}
      {state === "error" && <p role="alert" className="py-4 text-center text-sm" style={{ color: "var(--danger, #b4271a)" }}>{errorText}</p>}
      <div ref={host} />
    </div>
  );
});
