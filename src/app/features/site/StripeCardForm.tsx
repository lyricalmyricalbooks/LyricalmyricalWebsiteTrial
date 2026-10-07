import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { googleFontHref } from "./fonts";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { createElementCleanup } from "./stripeLifecycle";

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
  validationText?: string;
  paymentErrorText?: string;
  expressText?: string;
  showExpress?: boolean;
  expressEnabled?: boolean;
  onExpressConfirm?: () => Promise<boolean>;
  onStateChange?: (state: "loading" | "ready" | "error") => void;
  /** Google Font used inside Stripe's fields (Studio › Checkout form field font). */
  fontName?: string;
  fieldBackground?: string;
  fieldText?: string;
  fieldBorder?: string;
  accentColor?: string;
  fieldRadius?: number;
  style?: React.CSSProperties;
}>(function StripeCardForm({ publishableKey, amountCents, currency, loadingText, errorText, validationText, paymentErrorText, onStateChange, expressText, showExpress = true, expressEnabled = true, onExpressConfirm, fontName, fieldBackground, fieldText, fieldBorder, accentColor, fieldRadius, style }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const expressHost = useRef<HTMLDivElement>(null);
  const expressCallbacks = useRef({ expressEnabled, onExpressConfirm });
  expressCallbacks.current = { expressEnabled, onExpressConfirm };
  const [expressAvailable, setExpressAvailable] = useState(false);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const safeAmount = Math.max(50, Math.round(amountCents || 0));
  useEffect(() => { onStateChange?.(state); }, [state, onStateChange]);

  useEffect(() => {
    let cancelled = false;
    let failed = false;
    let cleanup: (() => void) | null = null;
    setState("loading");
    setExpressAvailable(false);
    const fail = () => {
      clearTimeout(deadline);
      if (cancelled) return;
      failed = true;
      setState("error");
    };
    // A blocked Stripe script or iframe must not leave checkout loading forever.
    const deadline = setTimeout(fail, 20000);
    (async () => {
      try {
        const stripe = await loadStripe(publishableKey);
        if (cancelled || failed || !host.current) return;
        if (!stripe) { fail(); return; }
        const el = host.current;
        const elements = stripe.elements({
          mode: "payment",
          amount: safeAmount,
          currency: currency.toLowerCase(),
          fonts: fontName ? [{ cssSrc: googleFontHref(fontName) }] : [],
          appearance: {
            theme: "flat",
            inputs: "spaced",
            labels: "above",
            variables: {
              colorPrimary: tokenColor(el, accentColor || "var(--accent, #e8402a)"),
              colorBackground: tokenColor(el, fieldBackground || style?.background as string || "var(--surface, #ffffff)"),
              colorText: fieldText ? tokenColor(el, fieldText) : getComputedStyle(el).color,
              fontSizeBase: "16px",
              inputColorBorder: tokenColor(el, fieldBorder || "var(--muted, #777777)"),
              inputFocusColorBorder: tokenColor(el, accentColor || "var(--accent, #e8402a)"),
              inputBoxShadow: "none",
              inputFocusBoxShadow: "none",
              focusOutline: "none",
              colorDanger: tokenColor(el, "var(--danger, #b4271a)"),
              borderRadius: `${fieldRadius ?? 0}px`,
              ...(fontName ? { fontFamily: `'${fontName.replace(/'/g, "")}', system-ui, sans-serif` } : {}),
            },
            rules: {
              ".Input": { border: "1px solid var(--inputColorBorder)", boxShadow: "none" },
              ".Input:focus": { borderColor: "var(--colorPrimary)", boxShadow: "0 0 0 1px var(--colorPrimary)" },
              ".Input--invalid": { borderColor: "var(--colorDanger)", boxShadow: "0 0 0 1px var(--colorDanger)" },
              ".Tab": { border: "1px solid var(--inputColorBorder)", boxShadow: "none" },
              ".Tab:hover": { borderColor: "var(--colorText)" },
              ".Tab--selected": { borderColor: "var(--colorPrimary)", boxShadow: "0 0 0 1px var(--colorPrimary)" },
              ".Label": { fontWeight: "600" },
            },
          },
        });
        const payment = elements.create("payment", { layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } });
        const releasePayment = createElementCleanup(payment);
        cleanup = releasePayment;
        if (showExpress && expressHost.current) {
          try {
            const express = elements.create("expressCheckout", { paymentMethods: { applePay: "auto", googlePay: "auto" } });
            const releaseExpress = createElementCleanup(express);
            cleanup = () => { releaseExpress(); releasePayment(); };
            express.on("ready", event => {
              if (!cancelled && !failed) setExpressAvailable(Boolean(event.availablePaymentMethods && Object.values(event.availablePaymentMethods).some(Boolean)));
            });
            express.on("loaderror", () => { if (!cancelled) setExpressAvailable(false); });
            express.on("click", event => {
              if (expressCallbacks.current.expressEnabled) event.resolve();
              else event.reject();
            });
            express.on("confirm", async event => {
              try {
                if (!expressCallbacks.current.expressEnabled || !await expressCallbacks.current.onExpressConfirm?.()) event.paymentFailed({ reason: "fail" });
              } catch { event.paymentFailed({ reason: "fail" }); }
            });
            express.mount(expressHost.current);
          } catch { setExpressAvailable(false); }
        }
        payment.on("ready", () => {
          clearTimeout(deadline);
          if (!cancelled && !failed) setState("ready");
        });
        payment.on("loaderror", fail);
        payment.mount(el);
        stripeRef.current = stripe;
        elementsRef.current = elements;
      } catch (err) {
        console.error("Card form failed to load", err);
        fail();
      }
    })();
    return () => { cancelled = true; clearTimeout(deadline); cleanup?.(); elementsRef.current = null; stripeRef.current = null; };
    // amount/currency changes are pushed with elements.update below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishableKey, fontName, fieldBackground, fieldText, fieldBorder, accentColor, fieldRadius, style?.background, showExpress]);

  useEffect(() => {
    try { elementsRef.current?.update({ amount: safeAmount, currency: currency.toLowerCase() }); }
    catch { setState("error"); }
  }, [safeAmount, currency]);

  useImperativeHandle(ref, () => ({
    validate: async () => {
      if (state !== "ready" || !elementsRef.current) return errorText;
      try {
        const { error } = await elementsRef.current.submit();
        return error ? (validationText || errorText) : null;
      } catch { return errorText; }
    },
    confirm: async (clientSecret, returnUrl) => {
      const stripe = stripeRef.current;
      const elements = elementsRef.current;
      if (state !== "ready" || !stripe || !elements) return { error: errorText };
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });
      if (result.error) {
        // A declined card or a mistyped field: Stripe's own message (in the shopper's language)
        // says what to fix. Anything else keeps the editable "check your order" text.
        const fixable = result.error.type === "card_error" || result.error.type === "validation_error";
        return { error: fixable && result.error.message ? result.error.message : paymentErrorText || errorText };
      }
      return { paymentIntentId: result.paymentIntent?.id, status: result.paymentIntent?.status };
    },
  }), [errorText, validationText, paymentErrorText, state]);

  return (
    <div className="fm-stripe-card-form" style={style} data-studio-target="style:checkout" data-studio-label="Card payment form">
      {state === "loading" && <p role="status" className="py-4 text-center text-sm text-slate-500">{loadingText}</p>}
      {state === "error" && <p role="alert" className="py-4 text-center text-sm" style={{ color: "var(--danger, #b4271a)" }}>{errorText}</p>}
      {showExpress && <div data-studio-target="copy:Checkout|style:checkout" data-studio-label="Express checkout wallets" style={{ display: expressAvailable ? undefined : "none", pointerEvents: expressEnabled ? undefined : "none", opacity: expressEnabled ? 1 : .5 }} aria-disabled={!expressEnabled}>
        {expressText && <p className="mb-3 text-sm font-semibold">{expressText}</p>}
        <div ref={expressHost} className="mb-4" />
      </div>}
      <div ref={host} />
    </div>
  );
});
