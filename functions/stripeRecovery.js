// Pure helpers that keep a Stripe payment and its shop order in step even when the
// webhook is missing, misconfigured or pointed at the other (test/live) account.
// index.js does the Stripe and Firestore calls.

// Every event stripeWebhook acts on. The webhook health check makes sure the
// Stripe endpoint sends all of them.
const REQUIRED_WEBHOOK_EVENTS = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
  "charge.dispute.created",
];

// Which Stripe account(s) to ask about an order's payment, best guess first: the
// mode the order was created in, then the shop's current mode, then the other one.
// A test-mode order looked up with the live key comes back "No such payment_intent",
// which is how sandbox orders used to stay unpaid forever.
function modesToTry(order, shopTestMode) {
  const out = [];
  const push = (m) => { if ((m === "test" || m === "live") && !out.includes(m)) out.push(m); };
  push(order && order.stripeMode);
  push(order && order.isTest === true ? "test" : null);
  push(shopTestMode ? "test" : "live");
  push("test");
  push("live");
  return out;
}

// A succeeded PaymentIntent shaped like the Checkout Session fields markStripeOrderPaid reads.
function intentAsSession(intent) {
  return {
    id: null,
    client_reference_id: intent.metadata && intent.metadata.order_id,
    payment_status: "paid",
    payment_intent: intent.id,
    livemode: intent.livemode,
    amount_total: intent.amount_received ?? intent.amount,
    currency: intent.currency,
  };
}

// A webhook event that proves a PaymentIntent for one of our orders succeeded,
// from either checkout path (card form or hosted Checkout). Duplicates with
// checkout.session.completed are harmless: marking paid is idempotent.
function paidIntentOrderId(event) {
  if (!event || event.type !== "payment_intent.succeeded") return null;
  const id = event.data && event.data.object && event.data.object.metadata && event.data.object.metadata.order_id;
  return typeof id === "string" && id && !id.includes("/") ? id : null;
}

function normaliseUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "").toLowerCase();
}

// Looks through the Stripe account's webhook endpoints for the one that calls
// stripeWebhook and reports what is wrong with it.
function webhookEndpointReport(endpoints, webhookUrl) {
  const target = normaliseUrl(webhookUrl);
  const list = Array.isArray(endpoints) ? endpoints : [];
  const match = list.find((e) => normaliseUrl(e && e.url) === target)
    || list.find((e) => /\/stripeWebhook$/i.test(String((e && e.url) || "").replace(/\/+$/, "")));
  if (!match) return { found: false, endpointId: null, url: null, enabled: false, missingEvents: REQUIRED_WEBHOOK_EVENTS.slice(), wrongUrl: false };
  const events = Array.isArray(match.enabled_events) ? match.enabled_events : [];
  const all = events.includes("*");
  return {
    found: true,
    endpointId: match.id,
    url: match.url,
    enabled: match.status !== "disabled",
    missingEvents: all ? [] : REQUIRED_WEBHOOK_EVENTS.filter((e) => !events.includes(e)),
    wrongUrl: normaliseUrl(match.url) !== target,
  };
}

// Signing secrets to try on an incoming webhook: the deployed Functions secret and
// any endpoint secrets saved by the admin's "Fix webhook" action (test and live
// endpoints each have their own). Blank and duplicate values are dropped.
function signingSecrets(...values) {
  const out = [];
  for (const v of values.flat()) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s.startsWith("whsec_") && !out.includes(s)) out.push(s);
  }
  return out;
}

module.exports = { REQUIRED_WEBHOOK_EVENTS, modesToTry, intentAsSession, paidIntentOrderId, webhookEndpointReport, signingSecrets };
