// Order IDs and email addresses are identifiers, not authentication secrets.
const crypto = require("crypto");
const normEmail = v => String(v || "").trim().toLowerCase();
function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || a.length > 256) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function canViewOrder(order, { key, identity } = {}) {
  if (!order) return false;
  if (sameSecret(key, order.trackingKey)) return true;
  if (identity?.email_verified !== true) return false;
  const email = normEmail(identity.email);
  return !!email && (email === normEmail(order.customer?.email) || email === "lyricalmyricalbooks@gmail.com");
}
const PUBLIC_FIELDS = ["orderId", "createdAt", "updatedAt", "status", "paymentStatus", "fulfillmentStatus",
  "paidAt", "shippedAt", "deliveredAt", "readyForPickupAt", "collectedAt", "readyForDeliveryAt", "outForDeliveryAt",
  "subtotal", "discount", "shipping", "tax", "total", "checkoutCurrency", "exchangeRate", "paymentMethod",
  "paymentInstructions", "shippingMethod", "shippingEstimate", "trackingNumber", "trackingCarrier", "trackingUrl",
  "downloadToken", "fulfillment", "customerRequest"];
const pick = (value, keys) => Object.fromEntries(keys.filter(k => value && Object.hasOwn(value, k)).map(k => [k, value[k]]));
function publicOrderView(id, order) {
  const out = { id, ...pick(order, PUBLIC_FIELDS) };
  if (order.returnProgress) out.returnProgress = pick(order.returnProgress, ["state", "instructions", "approvedAt", "receivedAt", "inspectedAt", "rejectedAt", "updatedAt"]);
  out.customer = pick(order.customer, ["name", "email", "phone"]);
  out.customer.address = pick(order.customer?.address, ["street", "unit", "city", "state", "zip", "country"]);
  out.items = (order.items || []).map(item => pick(item, ["id", "variantId", "variantName", "title", "price", "quantity", "photoUrl"]));
  return out;
}
module.exports = { canViewOrder, publicOrderView, normEmail };
