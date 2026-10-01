import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

/**
 * Mounts Stripe Embedded Checkout inside the storefront checkout page.
 * The client secret comes from createStripeCheckoutSession (embedded: true);
 * payment is still confirmed only by the stripeWebhook.
 */
export function StripeEmbeddedPanel({ publishableKey, clientSecret, loadingText, errorText, style }: {
  publishableKey: string;
  clientSecret: string;
  loadingText: string;
  errorText: string;
  style?: React.CSSProperties;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let checkout: { mount: (el: HTMLElement) => void; destroy: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const stripe = await loadStripe(publishableKey);
        if (!stripe || cancelled) return;
        checkout = await (stripe as any).initEmbeddedCheckout({ fetchClientSecret: async () => clientSecret });
        if (cancelled) { checkout?.destroy(); return; }
        if (host.current) checkout!.mount(host.current);
        setState("ready");
      } catch (err) {
        console.error("Embedded checkout failed", err);
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; checkout?.destroy(); };
  }, [publishableKey, clientSecret]);

  return (
    <div className="fm-stripe-embedded" style={style} data-studio-target="style:checkout" data-studio-label="Card payment form">
      {state === "loading" && <p className="px-4 py-6 text-center text-sm text-slate-500">{loadingText}</p>}
      {state === "error" && <p role="alert" className="px-4 py-6 text-center text-sm" style={{ color: "var(--danger, #b4271a)" }}>{errorText}</p>}
      <div ref={host} />
    </div>
  );
}
