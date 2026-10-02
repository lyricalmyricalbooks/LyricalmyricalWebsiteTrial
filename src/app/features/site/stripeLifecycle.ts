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
