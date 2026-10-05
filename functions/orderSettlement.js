// Marking an order paid — the one way it happens.
//
// An order is settled from three places: the Stripe webhook (Checkout and the
// on-page card form), a verified PayPal capture, and the admin's "Mark as paid"
// button for e-Transfer / cash / other manual methods. Each used to carry its
// own copy of the write, and the copies drifted: a manual payment never counted
// its discount code, and because it didn't stamp `inventoryDecrementedAt`, the
// onOrderUpdated trigger took the stock down a second time. Every path now
// calls settleOrderPaid, so a Stripe payment lands exactly like a manual one —
// same order fields, same stock effect, same discount count, same revenue.

const crypto = require("crypto");
const { applyStockDelta } = require("./orderMath");

/**
 * What settling `order` writes, given the books (one per item, null when the
 * book is gone) and its discount (or null). Pure, so the rules are testable.
 *
 * `fields` are the payment-specific facts (Stripe ids, PayPal capture…). With
 * `refreshWhenPaid` they are written even when the order is already paid, so a
 * late or second Stripe event still leaves its reference on the order without
 * settling it twice.
 */
function settlementWrites(order, books, discount, { message, fields = {}, refreshWhenPaid = false, now, downloadToken }) {
  if (order.paymentStatus === "paid") {
    return {
      alreadyPaid: true,
      orderPatch: refreshWhenPaid && Object.keys(fields).length ? { ...fields, updatedAt: now } : null,
      bookPatches: [],
      discountPatch: null,
      paidTotal: null,
    };
  }
  const items = order.items || [];
  return {
    alreadyPaid: false,
    orderPatch: {
      ...fields,
      paymentStatus: "paid",
      fulfillmentStatus: "paid",
      status: "open",
      downloadToken,
      paidAt: now,
      updatedAt: now,
      // Tells onOrderUpdated the stock is already taken care of.
      inventoryDecrementedAt: now,
      activity: [...(order.activity || []), { type: "event", message, createdAt: now }],
    },
    bookPatches: items.map((item, index) => {
      const patch = books[index] ? applyStockDelta(books[index], item, -(Number(item.quantity) || 0)) : null;
      return patch ? { ...patch, updatedAt: now } : null;
    }),
    discountPatch: discount ? { usageCount: (Number(discount.usageCount) || 0) + 1, updatedAt: now } : null,
    paidTotal: Number(order.total) || 0,
  };
}

/**
 * Settle one order in a transaction, then record its revenue. Returns the
 * settled total, or null when the order is missing or was already paid.
 * `check(order)` may throw to refuse (PayPal uses it to match the capture).
 */
async function settleOrderPaid({ db, increment, orderId, message, fields = {}, refreshWhenPaid = false, check }) {
  const orderRef = db.collection("orders").doc(orderId);
  let paidTotal = null;
  await db.runTransaction(async transaction => {
    // Firestore transactions require ALL reads before any writes.
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) return;
    const order = orderDoc.data();
    if (check && order.paymentStatus !== "paid") check(order);

    const items = order.paymentStatus === "paid" ? [] : (order.items || []);
    const bookRefs = items.map(item => db.collection("books").doc(item.id));
    const bookDocs = await Promise.all(bookRefs.map(ref => transaction.get(ref)));
    let discountRef = null;
    let discountDoc = null;
    if (order.paymentStatus !== "paid" && order.appliedDiscount?.id) {
      discountRef = db.collection("discounts").doc(order.appliedDiscount.id);
      discountDoc = await transaction.get(discountRef);
    }

    const writes = settlementWrites(
      order,
      bookDocs.map(doc => (doc.exists ? doc.data() : null)),
      discountDoc?.exists ? discountDoc.data() : null,
      { message, fields, refreshWhenPaid, now: new Date().toISOString(), downloadToken: crypto.randomBytes(32).toString("hex") },
    );
    if (writes.orderPatch) transaction.update(orderRef, writes.orderPatch);
    writes.bookPatches.forEach((patch, index) => { if (patch) transaction.update(bookRefs[index], patch); });
    if (writes.discountPatch) transaction.update(discountRef, writes.discountPatch);
    paidTotal = writes.paidTotal;
  });

  // Revenue/order analytics are recorded here — at payment time — never
  // client-side at order creation.
  if (paidTotal !== null) {
    const today = new Date().toISOString().split("T")[0];
    await db.collection("analytics").doc(today).set({
      date: today,
      orders: increment(1),
      revenue: increment(paidTotal),
    }, { merge: true });
  }
  return paidTotal;
}

module.exports = { settlementWrites, settleOrderPaid };
