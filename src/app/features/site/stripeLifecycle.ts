export function createElementCleanup(element: { destroy: () => void }) {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    // Stripe may destroy a failed Element before React unmounts its host.
    try { element.destroy(); } catch { /* Teardown must never prevent leaving checkout. */ }
  };
}
export function isStripePublishableKey(key: string, testMode: boolean) {
  return new RegExp(`^pk_${testMode ? "test" : "live"}_[A-Za-z0-9]{24,}$`).test(key);
}

/** Hosted Checkout needs the server's key, not a browser publishable key.
 * Never offer a second payment route once an inline intent may exist. */
export function stripeCheckoutState({ keyValid, redirect, hostedSelected, cardState, paymentStarted }: {
  keyValid: boolean;
  redirect: boolean;
  hostedSelected: boolean;
  cardState: "loading" | "ready" | "error";
  paymentStarted: boolean;
}) {
  const hosted = !paymentStarted && (redirect || hostedSelected || !keyValid);
  const inline = !hosted && keyValid;
  return {
    inline,
    canPay: hosted || (inline && cardState === "ready"),
    canUseHostedFallback: inline && cardState === "error" && !paymentStarted,
  };
}

/** Lock synchronously, including validation; retain it once navigation starts. */
export function createCheckoutSubmission() {
  let locked = false;
  return async (submit: () => Promise<boolean>) => {
    if (locked) return;
    locked = true;
    let navigating = false;
    try { navigating = await submit(); }
    finally { if (!navigating) locked = false; }
  };
}
