// Short stock holds while a shopper pays, so two people can't both pay for the last copy.
// One server-only doc per book in `stock-holds` (firestore.rules deny every browser
// access): { holds: { <orderId>: { lines: { <variantId|"_">: qty }, expiresAt: ms } } }.
// The book doc and its hold doc are read and written in one transaction, so concurrent
// checkouts for the same book are serialized. Holds expire on their own (no sweep needed);
// paying, or giving up, releases them. Stock itself still only moves when the payment is
// confirmed (webhook / verified capture), exactly as before.

const HOLD_MS = 30 * 60 * 1000; // matches the hosted Stripe session lifetime

const lineKey = variantId => variantId || "_";

// Pure: holds still active at `now`, without the given order's own hold.
function activeHolds(holds, now, exceptOrderId) {
  const out = {};
  for (const [orderId, hold] of Object.entries(holds || {})) {
    if (orderId === exceptOrderId) continue;
    if (!hold || Number(hold.expiresAt) <= now) continue;
    out[orderId] = hold;
  }
  return out;
}

// Pure: units of one edition held by other shoppers right now.
function heldUnits(holds, key) {
  return Object.values(holds || {}).reduce((sum, hold) => sum + (Number(hold?.lines?.[key]) || 0), 0);
}

// Pure: what one book's lines need, grouped by edition. Quantities are clamped like checkout does.
function linesByBook(items) {
  const byBook = new Map();
  for (const item of items || []) {
    if (!item || !item.id) continue;
    const qty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
    const lines = byBook.get(item.id) || {};
    const key = lineKey(item.variantId);
    lines[key] = (lines[key] || 0) + qty;
    byBook.set(item.id, lines);
  }
  return byBook;
}

function stockOf(book, key) {
  if (key === "_") return Number(book.stockLevel) || 0;
  const variant = (book.variants || []).find(v => v.id === key);
  return variant ? Number(variant.stock ?? variant.stockLevel) || 0 : 0;
}

class StockHoldError extends Error {
  constructor(title, available) {
    super(available > 0
      ? `Only ${available} of "${title}" can be bought right now: other shoppers are checking out with the rest. Lower the quantity or try again in a few minutes.`
      : `"${title}" is being bought by another shopper right now. Try again in a few minutes, or remove it from your bag.`);
    this.code = "stock_held";
    this.available = available;
  }
}

// Holds the order's tracked stock for HOLD_MS (renewing its own earlier hold). Throws
// StockHoldError when someone else's active holds leave too little.
async function reserveStock(db, orderId, items, now = Date.now()) {
  const byBook = linesByBook(items);
  if (!byBook.size) return;
  const ids = [...byBook.keys()].sort(); // stable lock order
  try {
  await db.runTransaction(async tx => {
    const bookRefs = ids.map(id => db.collection("books").doc(id));
    const holdRefs = ids.map(id => db.collection("stock-holds").doc(id));
    const snaps = await Promise.all([...bookRefs, ...holdRefs].map(ref => tx.get(ref)));
    const writes = [];
    ids.forEach((id, i) => {
      const bookSnap = snaps[i];
      const holdSnap = snaps[ids.length + i];
      if (!bookSnap.exists) return;
      const book = bookSnap.data();
      if (!book.trackInventory || book.allowBackorder) return; // nothing to hold
      const others = activeHolds(holdSnap.exists ? holdSnap.data().holds : {}, now, orderId);
      const lines = byBook.get(id);
      for (const [key, qty] of Object.entries(lines)) {
        const available = Math.max(0, stockOf(book, key) - heldUnits(others, key));
        if (qty > available) {
          const variant = key === "_" ? null : (book.variants || []).find(v => v.id === key);
          throw new StockHoldError(variant?.name ? `${book.title} (${variant.name})` : book.title || "This book", available);
        }
      }
      writes.push([holdRefs[i], { holds: { ...others, [orderId]: { lines, expiresAt: now + HOLD_MS } }, updatedAt: new Date(now).toISOString() }]);
    });
    for (const [ref, data] of writes) tx.set(ref, data);
  });
  } catch (err) {
    if (err instanceof StockHoldError) throw err;
    // Like the rate limiter, a broken hold store must never stop a real customer paying;
    // the paid-order oversold flag still catches the rare clash.
    console.warn(`Stock hold failed for ${orderId}, continuing without it:`, err.message);
  }
}

// Drops the order's holds (after payment or when the order closes). Best effort: an expired
// hold frees itself anyway, so a failure here only delays other shoppers by up to HOLD_MS.
async function releaseStock(db, orderId, items) {
  const ids = [...linesByBook(items).keys()];
  if (!ids.length) return;
  try {
    await db.runTransaction(async tx => {
      const refs = ids.map(id => db.collection("stock-holds").doc(id));
      const snaps = await Promise.all(refs.map(ref => tx.get(ref)));
      snaps.forEach((snap, i) => {
        if (!snap.exists || !snap.data().holds?.[orderId]) return;
        const rest = activeHolds(snap.data().holds, Date.now(), orderId);
        tx.set(refs[i], { holds: rest, updatedAt: new Date().toISOString() });
      });
    });
  } catch (err) {
    console.warn(`Could not release stock holds for ${orderId}:`, err.message);
  }
}

async function releaseStockForOrder(db, orderId) {
  try {
    const snap = await db.collection("orders").doc(orderId).get();
    if (snap.exists) await releaseStock(db, orderId, snap.data().items || []);
  } catch (err) {
    console.warn(`Could not release stock holds for ${orderId}:`, err.message);
  }
}

module.exports = { HOLD_MS, activeHolds, heldUnits, linesByBook, reserveStock, releaseStock, releaseStockForOrder, StockHoldError };
