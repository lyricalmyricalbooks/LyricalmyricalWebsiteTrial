// Admin-wide alerts shown above every admin page (AdminAlerts.tsx). Pure, tested.
// Payment problems come first: money that arrived but isn't recorded, or vice versa.

export type AlertTone = "danger" | "warning" | "info";
export type AdminAlert = {
  id: string;
  tone: AlertTone;
  title: string;
  detail: string;
  orderIds: string[];
  action: "order" | "orders" | "webhook";
};

export type WebhookStatus = { lastReceivedAt?: string | null; lastFailureAt?: string | null; lastFailure?: string | null } | null;

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const STRIPE_GRACE_MS = 10 * MIN;   // the webhook normally lands within seconds
const SHIP_LATE_MS = 3 * DAY;
const MANUAL_LATE_MS = 2 * DAY;

const age = (o: any, now: number) => now - Date.parse(o?.createdAt || "");
const label = (o: any) => o?.orderId || o?.id;
const list = (orders: any[]) => {
  const names = orders.slice(0, 3).map(label).join(", ");
  return orders.length > 3 ? `${names} and ${orders.length - 3} more` : names;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const hasStripePayment = (o: any) =>
  String(o?.stripePaymentIntentId || "").startsWith("pi_") || String(o?.stripeCheckoutSessionId || "").startsWith("cs_");
const isFinished = (o: any) => ["cancelled", "completed"].includes(o?.status)
  || ["shipped", "out_for_delivery", "delivered", "cancelled", "refunded", "picked_up"].includes(o?.fulfillmentStatus);

function alert(id: string, tone: AlertTone, title: string, detail: string, orders: any[], action?: AdminAlert["action"]): AdminAlert {
  return { id, tone, title, detail, orderIds: orders.map((o) => o.id), action: action || (orders.length === 1 ? "order" : "orders") };
}

export function buildAdminAlerts(allOrders: any[], webhook: WebhookStatus = null, now = Date.now()): AdminAlert[] {
  const orders = (allOrders || []).filter((o) => o && o.isTest !== true);
  const out: AdminAlert[] = [];

  const mismatch = orders.filter((o) => o.paymentMismatch && o.paymentStatus !== "paid" && o.paymentStatus !== "refunded");
  if (mismatch.length) out.push(alert("mismatch", "danger", `${plural(mismatch.length, "payment doesn't", "payments don't")} match the order total`,
    `Stripe or PayPal took a different amount than the order expected: ${list(mismatch)}. Review and refund in Stripe before shipping.`, mismatch));

  const paidTwice = orders.filter((o) => Array.isArray(o.duplicatePayments) && o.duplicatePayments.length && o.paymentStatus === "paid" && !isFinished(o));
  if (paidTwice.length) out.push(alert("paid-twice", "danger", `${plural(paidTwice.length, "order was", "orders were")} paid twice`,
    `Stripe took a second payment for an order that was already paid: ${list(paidTwice)}. Refund the extra payment in the Stripe Dashboard.`, paidTwice));

  const overLimit = orders.filter((o) => o.discountOverLimit && o.paymentStatus === "paid" && !isFinished(o));
  if (overLimit.length) out.push(alert("discount-over-limit", "warning", `${plural(overLimit.length, "order used", "orders used")} a discount code past its limit`,
    `Two shoppers used the last copy of a limited code at the same moment: ${list(overLimit)}. Decide whether to honour it before shipping.`, overLimit));

  const stuck = orders.filter((o) => o.paymentStatus === "unpaid" && hasStripePayment(o) && age(o, now) >= STRIPE_GRACE_MS && age(o, now) <= 7 * DAY && !o.paymentMismatch);
  if (stuck.length) out.push(alert("unpaid-stripe", "danger", `${plural(stuck.length, "order is", "orders are")} unpaid after starting a card payment`,
    `The customer may have paid but Stripe hasn't confirmed it to the shop: ${list(stuck)}. Open the order — it checks with Stripe automatically.`, stuck));

  const disputes = orders.filter((o) => o.disputeStatus && ["needs_response", "warning_needs_response"].includes(o.disputeStatus));
  if (disputes.length) out.push(alert("dispute", "danger", `${plural(disputes.length, "payment dispute needs", "payment disputes need")} a response`,
    `Answer in the Stripe Dashboard before the deadline: ${list(disputes)}.`, disputes));

  if (webhook?.lastFailureAt && (!webhook.lastReceivedAt || webhook.lastFailureAt > webhook.lastReceivedAt) && now - Date.parse(webhook.lastFailureAt) <= 7 * DAY) {
    out.push(alert("webhook", "danger", "Stripe's payment messages are being rejected",
      "The last Stripe webhook failed its security check, so paid orders may stay unpaid. Settings › Payments › Webhook health › Reset webhook signing.", [], "webhook"));
  }

  const partial = orders.filter((o) => o.partiallyRefunded && o.paymentStatus === "paid" && !isFinished(o));
  if (partial.length) out.push(alert("partial-refund", "warning", `${plural(partial.length, "order was", "orders were")} partly refunded in Stripe`,
    `Check what still needs to ship before packing: ${list(partial)}.`, partial));

  const oversold = orders.filter((o) => o.oversold && o.paymentStatus === "paid" && !isFinished(o));
  if (oversold.length) out.push(alert("oversold", "warning", `${plural(oversold.length, "paid order was", "paid orders were")} oversold`,
    `More copies were sold than were in stock: ${list(oversold)}. Restock or contact the customer.`, oversold));

  const late = orders.filter((o) => o.paymentStatus === "paid" && !isFinished(o) && age(o, now) >= SHIP_LATE_MS);
  if (late.length) out.push(alert("ship-late", "warning", `${plural(late.length, "paid order has", "paid orders have")} waited over 3 days to ship`,
    `Oldest first: ${list(late.sort((a, b) => age(b, now) - age(a, now)))}.`, late));

  const manual = orders.filter((o) => o.paymentStatus === "pending" && age(o, now) >= MANUAL_LATE_MS && o.status !== "cancelled");
  if (manual.length) out.push(alert("manual-pending", "info", `${plural(manual.length, "order is", "orders are")} still waiting for a manual payment`,
    `e-Transfer / cash orders with no payment after 2 days: ${list(manual)}. Confirm the payment or cancel the order.`, manual));

  return out;
}

// Changes whenever the set of problems changes, so a dismissed alert comes back
// when a new order joins it.
export function alertSignature(a: AdminAlert): string {
  return `${a.id}:${[...a.orderIds].sort().join(",")}`;
}
