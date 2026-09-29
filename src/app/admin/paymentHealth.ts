export type PaymentIssue = { id: string; label: string; detail: string; severity: "blocking" | "warning" };

/** Admin readiness checks only. Payment authority remains with provider webhooks. */
export function paymentHealth(payments: any = {}): PaymentIssue[] {
  const issues: PaymentIssue[] = [];
  const stripe = payments.stripe || {};
  const paypal = payments.paypal || {};
  const manual = (payments.manualMethods || []).filter((method: any) => method.enabled);
  if (!stripe.connected && !paypal.connected && manual.length === 0) issues.push({ id: "no-gateway", label: "No payment method is enabled", detail: "Customers cannot complete checkout until at least one method is enabled.", severity: "blocking" });
  if (payments.testMode) issues.push({ id: "test-mode", label: "Sandbox mode is active", detail: "Test payments do not collect real money. Turn this off before launch.", severity: "warning" });
  if (stripe.connected && !(payments.testMode ? stripe.testPublicKey : stripe.publicKey)) issues.push({ id: "stripe-publishable", label: "Stripe publishable key is missing", detail: `Add the ${payments.testMode ? "test" : "live"} publishable key used by the active mode.`, severity: "blocking" });
  if (stripe.secretKey || stripe.testSecretKey) issues.push({ id: "client-secret", label: "A Stripe secret is stored in public settings", detail: "Move it to the STRIPE_SECRET_KEY Firebase Functions secret and rotate the exposed key.", severity: "blocking" });
  manual.forEach((method: any) => { if (!String(method.instructions || "").trim()) issues.push({ id: `manual:${method.id}`, label: `${method.name || "Manual payment"} has no instructions`, detail: "Add clear payment steps so the order does not remain pending indefinitely.", severity: "warning" }); });
  return issues;
}
