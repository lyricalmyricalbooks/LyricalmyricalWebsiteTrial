// Guest order tracking. Orders are no longer publicly readable in Firestore:
// the browser asks the server, which hands the order back only to someone who
// proves they own it — the matching customer email, or the private key from
// the order email link.
const crypto = require("crypto");

const normEmail = v => String(v || "").trim().toLowerCase();

function sameSecret(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

// true when the request proves ownership of this order.
function canViewOrder(order, { email, key } = {}) {
  if (!order) return false;
  if (key && typeof order.trackingKey === "string" && sameSecret(key, order.trackingKey)) return true;
  const owner = normEmail(order.customer?.email);
  return Boolean(owner) && normEmail(email) === owner;
}

// Fields a shopper never needs to see. The tracking key stays server-side so a
// copied order can't be turned into a reusable link.
const PRIVATE_FIELDS = ["trackingKey", "paymentAlertSentAt", "stripeCheckedAt", "ipCountry", "clientIp"];

function publicOrderView(id, order) {
  const out = { id, ...order };
  for (const f of PRIVATE_FIELDS) delete out[f];
  return out;
}

module.exports = { canViewOrder, publicOrderView, normEmail };
