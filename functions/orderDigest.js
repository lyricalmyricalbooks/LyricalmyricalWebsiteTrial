// Daily "orders needing you" digest for the publisher. Pure so it can be tested.
const DAY = 86400000;
const UNSHIPPED_DAYS = 3;
const TRANSIT_DAYS = 14; // Same as OVERDUE_TRANSIT_DAYS in src/app/admin/fulfillment.ts.

const { isPhysicalItem } = require("./localFulfillment");
const { waitingPreorderLines } = require("./preorder");
const methodOf = order => order.fulfillmentSelection?.method || order.fulfillment?.method || "shipping";
const ageDays = (iso, now) => {
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? Math.floor((now - t) / DAY) : null;
};

function buildOrderDigest(orders, operationsById = new Map(), now = Date.now()) {
  const unshipped = [];
  const stuck = [];
  const labelChecks = [];
  for (const order of orders) {
    if (order.isTest || order.paymentStatus !== "paid" || order.status === "cancelled") continue;
    if (["cancelled", "refunded"].includes(order.fulfillmentStatus)) continue;
    if (!(order.items || []).some(isPhysicalItem)) continue;
    const ops = operationsById.get(order.id) || {};
    const label = order.orderId || order.id;
    if (ops.labelPurchasePending) labelChecks.push({ id: order.id, label });
    if (methodOf(order) !== "shipping") continue;
    const fs = order.fulfillmentStatus;
    if (fs === "shipped" || fs === "out_for_delivery") {
      const days = ageDays(order.shippedAt, now);
      if (days !== null && days >= TRANSIT_DAYS) stuck.push({ id: order.id, label, days, carrier: order.trackingCarrier || "", tracking: order.trackingNumber || "" });
      continue;
    }
    if (fs === "delivered") continue;
    // Pre-orders wait for their release date; after it, the clock starts on release day.
    if (waitingPreorderLines(order, ops, new Date(now)).length) continue;
    const release = (order.items || []).filter(i => i && i.preorder && i.releaseDate).map(i => `${i.releaseDate}T12:00:00Z`).sort().pop();
    const paidDays = ageDays(order.paidAt || order.createdAt, now);
    const days = release && paidDays !== null ? Math.min(paidDays, ageDays(release, now)) : paidDays;
    if (days !== null && days >= UNSHIPPED_DAYS) unshipped.push({ id: order.id, label, days, customer: order.customer?.name || "" });
  }
  const byAge = (a, b) => b.days - a.days;
  return { unshipped: unshipped.sort(byAge), stuck: stuck.sort(byAge), labelChecks, total: unshipped.length + stuck.length + labelChecks.length };
}

module.exports = { buildOrderDigest, UNSHIPPED_DAYS, TRANSIT_DAYS };
