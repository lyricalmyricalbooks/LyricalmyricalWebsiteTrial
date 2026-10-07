import { paymentHealth } from "./paymentHealth";
import { isRealPaidOrder } from "./overviewInsights";

/** Admin-only "Ready to sell?" checks. Read-only guidance; nothing here changes data. */
export type ReadinessStatus = "ok" | "warn" | "block";
export type ReadinessItem = { id: string; label: string; detail: string; status: ReadinessStatus; tab: string; action: string };

export type ReadinessInput = {
  settings: any;
  books: any[];
  shippingProfiles: any[];
  emailLog: any[];
  orders: any[];
};

const REQUIRED_POLICIES: Array<[string, string]> = [["shipping", "Shipping"], ["returns", "Returns"], ["privacy", "Privacy"], ["terms", "Terms"]];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const hasText = (v: unknown) => typeof v === "string" && v.trim().length > 0;

export function launchReadiness({ settings, books, shippingProfiles, emailLog, orders }: ReadinessInput): ReadinessItem[] {
  const items: ReadinessItem[] = [];
  const payments = settings?.payments || {};
  const stripe = payments.stripe || {};

  // Payments
  // Secret-key findings get their own row below.
  const payIssues = paymentHealth(payments).filter(i => !["client-secret", "stripe-test-secret", "stripe-live-secret"].includes(i.id));
  const blocking = payIssues.filter(i => i.severity === "blocking");
  if (blocking.length) items.push({ id: "payments", label: blocking[0].label, detail: blocking[0].detail, status: "block", tab: "payments", action: "Open Payments" });
  else if (payments.testMode) items.push({ id: "payments", label: "Payments are in sandbox mode", detail: "Test payments collect no money. Switch to live keys before launch.", status: "warn", tab: "payments", action: "Open Payments" });
  else items.push({ id: "payments", label: "Payments are set up", detail: "Live mode with a valid publishable key.", status: "ok", tab: "payments", action: "Open Payments" });

  if (stripe.connected) {
    const secretStored = payments.testMode ? (stripe.testSecretKeyStored || stripe.testSecretKey) : (stripe.secretKeyStored || stripe.secretKey);
    items.push(secretStored
      ? { id: "stripe-secret", label: "Stripe secret key is stored privately", detail: "Kept in the admin-only store.", status: "ok", tab: "payments", action: "Open Payments" }
      : payments.testMode
        // Test mode has no fallback key: sandbox checkout cannot work without one.
        ? { id: "stripe-secret", label: "Stripe test secret key is missing", detail: "Sandbox checkout fails without it. Add your sk_test_… key in Payments.", status: "block", tab: "payments", action: "Open Payments" }
        : { id: "stripe-secret", label: "No Stripe secret key entered here", detail: "Fine only if the STRIPE_SECRET_KEY Functions secret is set — use Payments › Test connection to confirm.", status: "warn", tab: "payments", action: "Open Payments" });
  }

  // Catalogue
  const live = (books || []).filter(b => (b.status || "published") === "published");
  if (!live.length) items.push({ id: "books", label: "No published books", detail: "Shoppers have nothing to buy yet.", status: "block", tab: "catalog", action: "Open Books" });
  else {
    const incomplete = live.filter(b => !(Number(b.retailPrice) > 0) || !(b.photos?.length || b.coverImage || b.image) || !hasText(b.description));
    items.push(incomplete.length
      ? { id: "books", label: `${plural(incomplete.length, "published book")} missing a price, photo or description`, detail: incomplete.slice(0, 3).map(b => b.title || "Untitled").join(", ") + (incomplete.length > 3 ? "…" : ""), status: "warn", tab: "catalog", action: "Open Books" }
      : { id: "books", label: `${plural(live.length, "published book")} ready`, detail: "Every published book has a price, photo and description.", status: "ok", tab: "catalog", action: "Open Books" });
  }

  // Shipping
  items.push((shippingProfiles || []).length
    ? { id: "shipping", label: "Shipping is configured", detail: plural(shippingProfiles.length, "shipping profile"), status: "ok", tab: "shipping", action: "Open Shipping" }
    : { id: "shipping", label: "No shipping profiles", detail: "Checkout falls back to a flat rate. Add zones and rates for the countries you ship to.", status: "warn", tab: "shipping", action: "Open Shipping" });

  // Sales tax (charged server-side from Settings › Taxes rates)
  const rates = (settings?.taxes?.rates || []).filter((r: any) => Number(r?.rate) > 0);
  items.push(rates.length
    ? { id: "tax", label: "Sales tax rates are set", detail: plural(rates.length, "tax rate"), status: "ok", tab: "taxes", action: "Open Taxes" }
    : { id: "tax", label: "No sales tax rates", detail: "Checkout charges no tax. Add GST/HST/PST rates if you are registered to collect them.", status: "warn", tab: "taxes", action: "Open Taxes" });

  // Policies
  const missing = REQUIRED_POLICIES.filter(([k]) => !hasText(settings?.policies?.[k])).map(([, label]) => label);
  items.push(missing.length
    ? { id: "policies", label: `Missing store policies: ${missing.join(", ")}`, detail: "Card networks and shoppers expect shipping, returns, privacy and terms pages.", status: "warn", tab: "general", action: "Open General" }
    : { id: "policies", label: "Store policies are published", detail: "Shipping, returns, privacy and terms.", status: "ok", tab: "general", action: "Open General" });

  // Email
  const lastEmail = (emailLog || [])[0];
  items.push(!lastEmail
    ? { id: "email", label: "No emails sent yet", detail: "Send a test from Notifications to confirm receipts reach customers.", status: "warn", tab: "notifications", action: "Open Notifications" }
    : lastEmail.status === "failed"
      ? { id: "email", label: "The last email failed to send", detail: String(lastEmail.error || "See Recent deliveries for the reason."), status: "block", tab: "notifications", action: "Open Notifications" }
      : { id: "email", label: "Emails are sending", detail: "The latest delivery succeeded.", status: "ok", tab: "notifications", action: "Open Notifications" });

  // End-to-end proof
  items.push((orders || []).some(isRealPaidOrder)
    ? { id: "first-sale", label: "A real paid order has gone through", detail: "Payment, webhook and order recording all worked.", status: "ok", tab: "orders", action: "Open Orders" }
    : { id: "first-sale", label: "No real paid order yet", detail: "Place one small live order (then refund it) to prove checkout end to end.", status: "warn", tab: "orders", action: "Open Orders" });

  return items;
}

export function readinessSummary(items: ReadinessItem[]): ReadinessStatus {
  if (items.some(i => i.status === "block")) return "block";
  if (items.some(i => i.status === "warn")) return "warn";
  return "ok";
}

/** "6 of 8 ready": how many checks are green, and the ones still open (blocking first). */
export function readinessProgress(items: ReadinessItem[]) {
  const open = items.filter(i => i.status !== "ok").sort((a, b) => Number(b.status === "block") - Number(a.status === "block"));
  return { done: items.length - open.length, total: items.length, open, completed: items.filter(i => i.status === "ok") };
}
