// Currencies the shop prices in (exchange rates exist only for these). Any other
// value would fall back to a 1:1 rate and let a shopper pay e.g. 100 INR for a
// CA$100 order, so it is refused before a payment is created.
const CHECKOUT_CURRENCIES = ["cad", "usd", "eur"];

function checkoutCurrencyOf(value) {
  const currency = String(value || "cad").trim().toLowerCase();
  return CHECKOUT_CURRENCIES.includes(currency) ? currency : null;
}

// Compares what a provider reports as paid with the amount and currency this
// order's payment was created for (stored as expectedAmountMinor/Currency).
// Orders created before those fields existed have nothing to compare with.
function paidAmountCheck(order, paidMinor, paidCurrency) {
  const expectedMinor = Number(order && order.expectedAmountMinor);
  const expectedCurrency = String((order && order.expectedCurrency) || "").toLowerCase();
  if (!Number.isFinite(expectedMinor) || !expectedCurrency) return { ok: true, unverified: true };
  const currency = String(paidCurrency || "").toLowerCase();
  const minor = Math.round(Number(paidMinor));
  if (currency !== expectedCurrency || minor !== expectedMinor) {
    return { ok: false, expected: { minor: expectedMinor, currency: expectedCurrency }, paid: { minor, currency } };
  }
  return { ok: true };
}

// "12.34" (PayPal decimal string) -> 1234
const toMinor = value => Math.round(Number(value) * 100);

// The shop's calendar day (Toronto). Discount start/expiry dates are entered as
// plain dates ("2026-10-06" = "Last day the code works"), so they are compared
// with the shop's date, not a UTC timestamp (which ended codes at 8pm the day before).
function shopDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// null when the code may be used today, otherwise "not_started" | "expired".
function discountDateState(discount, now = new Date()) {
  const today = shopDate(now);
  const isDateOnly = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  const start = discount && discount.startDate;
  if (start) {
    if (isDateOnly(start) ? String(start) > today : Date.parse(start) > now.getTime()) return "not_started";
  }
  const expiry = discount && (discount.expiryDate || discount.expiry);
  if (expiry) {
    if (isDateOnly(expiry) ? String(expiry) < today : Date.parse(expiry) < now.getTime()) return "expired";
  }
  return null;
}

// Why a catalog line can't be bought right now, or null. Matches what the
// storefront shows: only published books whose release date has arrived, and a
// book sold in editions is bought as one of them (a bare line would be priced
// at the book's own price and skip the editions' stock).
function purchaseProblem(book, variantId, nowISO = new Date().toISOString()) {
  if (!book) return "missing";
  // Books saved before statuses existed have none; the storefront treats them as published.
  if (book.status && book.status !== "published") return "unavailable";
  if (book.scheduleDate && String(book.scheduleDate) > nowISO) return "unavailable";
  if (!variantId && Array.isArray(book.variants) && book.variants.length) return "choose_edition";
  return null;
}

// PayPal returns the original order for a repeated request id, so the id carries the amount and currency.
function paypalCreateRequestId(orderId, currency, total) {
  return `create-${orderId}-${String(currency || "").toLowerCase()}-${toMinor(Number(total).toFixed(2))}`;
}

// Stripe's checkout.session.async_payment_failed may arrive after the shopper paid another way.
function lateFailureMayMarkFailed(order, sessionId) {
  if (!order) return false;
  if (order.paymentStatus === "paid" || String(order.paymentStatus || "").startsWith("refund")) return false;
  if (order.stripeCheckoutSessionId && sessionId && order.stripeCheckoutSessionId !== sessionId) return false;
  return true;
}

// Who can give the money back for this order. null = a card/PayPal order whose payment id is missing,
// which must not be "refunded" by just changing its status.
function refundProviderOf(order) {
  if (!order) return null;
  if (typeof order.stripePaymentIntentId === "string" && order.stripePaymentIntentId.startsWith("pi_")) return "stripe";
  if (order.paypalCaptureId) return "paypal";
  const method = String(order.paymentMethod || "").toLowerCase();
  if (/stripe|card|paypal|apple|google/.test(method)) return null;
  return "manual";
}

// The PayPal capture a refund/reversal webhook is about. REFUNDED events carry the refund
// (its "up" link points at the capture); REVERSED/DENIED events carry the capture itself.
function paypalReversalCaptureId(event) {
  const type = event && event.event_type;
  const resource = (event && event.resource) || {};
  if (type === "PAYMENT.CAPTURE.REVERSED" || type === "PAYMENT.CAPTURE.DENIED") return resource.id || null;
  if (type !== "PAYMENT.CAPTURE.REFUNDED") return null;
  const up = (resource.links || []).find(l => l && l.rel === "up" && /\/captures\//.test(String(l.href || "")));
  return up ? String(up.href).split("/captures/")[1].split(/[/?#]/)[0] || null : null;
}

// The code had already reached its usage limit before this order used it.
function discountUsedUp(discount) {
  const limit = Number(discount && discount.usageLimit) || 0;
  return limit > 0 && (Number(discount && discount.usageCount) || 0) >= limit;
}

// Why a new payment must not be opened for this order, or null. A cancelled order is
// closed: taking money for it would revive it behind the shop's back.
function checkoutRefusal(order) {
  if (!order) return "missing";
  if (order.paymentStatus === "paid" || order.status === "completed") return "paid";
  if (order.status === "cancelled" || order.status === "refunded" || String(order.paymentStatus || "").startsWith("refund")) return "closed";
  return null;
}

// Why an admin may not cancel this order as "unpaid", or null. A paid (or refunding) order
// must go through Refund, never a plain cancel that would hide money already taken.
function cancelRefusal(order) {
  if (!order) return "missing";
  if (order.paymentStatus === "paid") return "paid";
  if (String(order.paymentStatus || "").startsWith("refund")) return "refunded";
  if (order.status === "cancelled") return "already_cancelled";
  if (order.status === "completed") return "completed";
  return null;
}

// A payment that arrived after the order was cancelled, or a mismatch, that the owner has dealt with.
function mismatchResolved(order) {
  return !!(order && order.paymentMismatch && order.paymentMismatch.resolvedAt);
}

// Why an admin may not mark this order paid by hand, or null. Card and PayPal orders are
// paid only when the provider says so (webhook, verified status check or capture); marking
// them by hand would ship books for money that was never taken.
function manualPaidRefusal(order) {
  if (!order) return "missing";
  if (order.paymentStatus === "paid") return null; // idempotent no-op
  if (order.status === "cancelled" || order.status === "refunded") return "closed";
  const method = String(order.paymentMethod || "").toLowerCase();
  if (order.stripePaymentIntentId || order.stripeCheckoutSessionId || order.paypalOrderId) return "provider";
  if (/stripe|card|paypal|apple|google/.test(method)) return "provider";
  return null;
}

// Stripe idempotency key for a payment attempt. Two simultaneous requests for the same order,
// amount and currency (two tabs, a double click) get the same PaymentIntent back instead of two
// live ones. The previous intent id is part of the key, so a deliberate retry after the earlier
// intent was cancelled opens a fresh one.
function stripeIntentKey(orderId, amountMinor, currency, previousIntentId) {
  return `pi-${orderId}-${String(currency || "").toLowerCase()}-${Math.round(Number(amountMinor))}-${previousIntentId || "first"}`;
}

module.exports = { cancelRefusal, mismatchResolved, checkoutRefusal, manualPaidRefusal, stripeIntentKey, discountUsedUp, refundProviderOf, paypalReversalCaptureId, paypalCreateRequestId, lateFailureMayMarkFailed, purchaseProblem, CHECKOUT_CURRENCIES, checkoutCurrencyOf, paidAmountCheck, toMinor, shopDate, discountDateState };
