// Catalog merchandising rules the server prices from: scheduled sale windows, paid add-ons
// (signed copy, inscription, gift wrap), box sets / bundles and gift-card products.
// Mirrored for display in src/app/features/site/promotions.ts (promotions.parity.test.ts).
// Everything here is pure: callers pass catalog data that the server read itself.
const { shopDate } = require("./paymentGuards");

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ── Scheduled sales ────────────────────────────────────────────────
// Books › edit › Pricing: "Sale starts" / "Sale ends" are plain shop dates (Toronto), both
// inclusive. Blank = no limit on that side, so a sale with neither date works as before.
function saleWindowOpen(book, now = new Date()) {
  const today = shopDate(now);
  const start = String((book && book.saleStartsAt) || "").slice(0, 10);
  const end = String((book && book.saleEndsAt) || "").slice(0, 10);
  if (DATE_ONLY.test(start) && start > today) return false;
  if (DATE_ONLY.test(end) && end < today) return false;
  return true;
}

function saleActive(book, now = new Date()) {
  return !!book && !!book.isOnSale && Number(book.salePrice) > 0 && saleWindowOpen(book, now);
}

// ── Paid add-ons ───────────────────────────────────────────────────
// Books › edit › Add-ons: up to 6 extras a shopper can tick for each copy. "text" add-ons
// (an inscription) also take a short message. Prices are per copy, in CAD.
const MAX_ADD_ONS = 6;

function bookAddOns(book) {
  if (!book || isGiftCardProduct(book) || isBundle(book)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(book.addOns) ? book.addOns : []) {
    if (!raw || typeof raw.id !== "string" || !raw.id || seen.has(raw.id)) continue;
    const label = String(raw.label || "").trim().slice(0, 80);
    const price = Number(raw.price);
    if (!label || !Number.isFinite(price) || price < 0 || raw.enabled === false) continue;
    seen.add(raw.id);
    const kind = raw.kind === "text" ? "text" : "option";
    const maxLength = Math.max(1, Math.min(300, Math.floor(Number(raw.maxLength) || 120)));
    out.push({ id: raw.id.slice(0, 60), label, price: Math.round(price * 100) / 100, kind, ...(kind === "text" ? { maxLength } : {}) });
    if (out.length >= MAX_ADD_ONS) break;
  }
  return out;
}

// The add-ons a shopper picked for one line, checked against the catalog. Throws a
// shopper-readable message for an add-on that no longer exists or a missing inscription.
// Returns { addOns: [{ id, label, price, text? }], price } — price is per copy.
function addOnSelection(book, requested) {
  const picked = Array.isArray(requested) ? requested : [];
  if (!picked.length) return { addOns: [], price: 0 };
  const offered = new Map(bookAddOns(book).map(addOn => [addOn.id, addOn]));
  const seen = new Set();
  const addOns = [];
  for (const choice of picked.slice(0, MAX_ADD_ONS)) {
    const id = choice && typeof choice.id === "string" ? choice.id : "";
    if (!id || seen.has(id)) continue;
    const addOn = offered.get(id);
    if (!addOn) throw new Error(`An extra you picked for "${(book && book.title) || "this book"}" is no longer offered. Please remove the book and add it again.`);
    seen.add(id);
    if (addOn.kind === "text") {
      const text = String((choice && choice.text) || "").replace(/\s+/g, " ").trim().slice(0, addOn.maxLength);
      if (!text) throw new Error(`Add the wording for "${addOn.label}" on "${(book && book.title) || "this book"}".`);
      addOns.push({ id, label: addOn.label, price: addOn.price, text });
    } else {
      addOns.push({ id, label: addOn.label, price: addOn.price });
    }
  }
  const price = Math.round(addOns.reduce((sum, addOn) => sum + addOn.price, 0) * 100) / 100;
  return { addOns, price };
}

// ── Box sets / bundles ─────────────────────────────────────────────
// Books › edit › Box set: a catalog entry made of other books, sold at its own price.
// The set has no stock of its own: each set sold takes stock from every book in it.
const MAX_BUNDLE_PARTS = 20;

function bundleComponents(book) {
  if (!book || !Array.isArray(book.bundleItems)) return [];
  const out = [];
  for (const raw of book.bundleItems) {
    if (!raw || typeof raw.bookId !== "string" || !raw.bookId) continue;
    const quantity = Math.max(1, Math.min(20, Math.floor(Number(raw.quantity) || 1)));
    out.push({ id: raw.bookId, variantId: typeof raw.variantId === "string" && raw.variantId ? raw.variantId : null, quantity });
    if (out.length >= MAX_BUNDLE_PARTS) break;
  }
  return out;
}

const isBundle = book => bundleComponents(book).length > 0;

// Order lines with every box set replaced by the books inside it, so stock holds, stock
// decrements and restocks all count the real books. Lines without components pass through.
function stockLines(items) {
  const out = [];
  for (const item of items || []) {
    if (!item) continue;
    if (Array.isArray(item.components) && item.components.length) {
      const sets = Math.max(0, Math.floor(Number(item.quantity) || 0));
      for (const part of item.components) {
        if (!part || typeof part.id !== "string" || !part.id) continue;
        out.push({ id: part.id, variantId: part.variantId || null, quantity: sets * Math.max(1, Math.floor(Number(part.quantity) || 1)) });
      }
    } else {
      out.push(item);
    }
  }
  return out;
}

function partStock(book, variantId) {
  if (!book) return 0;
  if (book.trackInventory !== true || book.allowBackorder === true) return Infinity;
  if (variantId) {
    const variant = (book.variants || []).find(v => v && v.id === variantId);
    return variant ? Math.max(0, Number(variant.stock ?? variant.stockLevel) || 0) : 0;
  }
  return Math.max(0, Number(book.stockLevel) || 0);
}

// How many sets can be sold from the books' stock. Infinity when no part tracks stock.
// `getBook(id)` returns catalog data or undefined.
function bundleAvailable(book, getBook) {
  let sets = Infinity;
  for (const part of bundleComponents(book)) {
    const stock = partStock(getBook(part.id), part.variantId);
    sets = Math.min(sets, Math.floor(stock / part.quantity));
  }
  return sets;
}

// ── Gift-card products ─────────────────────────────────────────────
// Books › edit › Product type "Gift card": each edition is an amount (CA$25, CA$50…).
// A paid gift-card line issues one card per copy, emailed to the recipient (or the buyer).
const isGiftCardProduct = book => !!book && book.productType === "giftCard";

function giftCardDetails(requested) {
  const raw = requested && typeof requested === "object" ? requested : {};
  const recipientEmail = String(raw.recipientEmail || "").trim().toLowerCase().slice(0, 320);
  if (recipientEmail && !EMAIL.test(recipientEmail)) throw new Error("Check the gift card recipient's email address.");
  return {
    recipientName: String(raw.recipientName || "").trim().slice(0, 100),
    recipientEmail,
    senderName: String(raw.senderName || "").trim().slice(0, 100),
    message: String(raw.message || "").trim().slice(0, 300),
  };
}

module.exports = {
  saleWindowOpen, saleActive,
  MAX_ADD_ONS, bookAddOns, addOnSelection,
  MAX_BUNDLE_PARTS, bundleComponents, isBundle, stockLines, bundleAvailable,
  isGiftCardProduct, giftCardDetails,
};
