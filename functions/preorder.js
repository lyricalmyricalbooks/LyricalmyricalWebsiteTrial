// Pre-orders: a published book the shop sells before its publication date.
// Kept in parity with src/app/features/site/preorder.ts (preorder.parity.test.ts).
//
// A book is on pre-order while Books › edit › Inventory › "Take pre-orders" is on and its
// Publication date (`publishDate`, a plain YYYY-MM-DD shop date) has not arrived yet. With no
// date it stays on pre-order ("date to be announced") until the switch is turned off. On the
// release day it becomes an ordinary book by itself. Stock, prices and payment are unchanged:
// pre-orders use the book's normal inventory settings.
const { shopDate } = require("./paymentGuards");

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function releaseDateOf(book) {
  const value = String((book && book.publishDate) || "").slice(0, 10);
  return DATE_ONLY.test(value) ? value : "";
}

function preorderActive(book, now = new Date()) {
  if (!book || book.preorder !== true) return false;
  const date = releaseDateOf(book);
  return !date || date > shopDate(now);
}

// The fields every server-built order line carries. Always set, so a browser-sent
// `preorder` flag on a line can never stick.
function preorderLine(book, now = new Date()) {
  const active = preorderActive(book, now);
  return { preorder: active, releaseDate: active ? (releaseDateOf(book) || null) : null };
}

const isDigitalLine = item => item && (item.digital === true || item.isDigital === true || /digital|e-book|ebook|epub|pdf|audiobook/.test(String(item.format || "").toLowerCase()));

// The pre-order lines that still hold a parcel back: physical, and released neither by date
// nor by the publisher ("Ready to ship now" stamps order.preorderReleasedAt + operations.preorderReleased).
function waitingPreorderLines(order, operations = {}, now = new Date()) {
  if (!order || order.preorderReleasedAt || (operations && operations.preorderReleased)) return [];
  const today = shopDate(now);
  return (order.items || []).filter(item => item && item.preorder === true && !isDigitalLine(item) && (!item.releaseDate || String(item.releaseDate) > today));
}

// "2026-11-12" when every waiting line has a date (the latest one), "" when any is still unannounced.
function shipDateOf(lines) {
  if (!lines.length || lines.some(item => !item.releaseDate)) return "";
  return lines.map(item => String(item.releaseDate)).sort().pop();
}

// When the parcel could first ship because of its pre-orders (ms), for "waited too long to ship"
// clocks: the early-release moment, else the latest physical pre-order release day. 0 = no pre-order.
function preorderClockStart(order, operations = {}) {
  const physical = (order && order.items || []).filter(item => item && item.preorder === true && !isDigitalLine(item));
  if (!physical.length) return 0;
  const early = Date.parse((order && order.preorderReleasedAt) || (operations && operations.preorderReleasedAt) || "");
  if (Number.isFinite(early)) return early;
  const dated = physical.filter(item => item.releaseDate).map(item => String(item.releaseDate)).sort().pop();
  return dated ? Date.parse(`${dated}T12:00:00Z`) || 0 : 0;
}

// Plain-text lines for order emails (customer and shop). [] for orders with no pre-orders.
function preorderEmailLines(order, now = new Date()) {
  const lines = (order && order.items || []).filter(item => item && item.preorder === true);
  if (!lines.length) return [];
  const out = lines.map(item => `${item.title || "A book"}${item.variantName ? ` (${item.variantName})` : ""}: ${item.releaseDate ? `releases ${item.releaseDate}` : "release date to be announced"}.`);
  const waiting = waitingPreorderLines(order, {}, now);
  if (waiting.length) {
    const date = shipDateOf(waiting);
    out.push(date ? `Your parcel ships when the last pre-order is released (${date}).` : "Your parcel ships once the release date is announced and the book is out.");
  }
  if (lines.some(isDigitalLine)) out.push("Digital pre-orders can be downloaded from the release date.");
  return out;
}

module.exports = { releaseDateOf, preorderActive, preorderLine, waitingPreorderLines, shipDateOf, preorderClockStart, preorderEmailLines, isDigitalLine };
