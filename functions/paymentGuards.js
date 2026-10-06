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

module.exports = { purchaseProblem, CHECKOUT_CURRENCIES, checkoutCurrencyOf, paidAmountCheck, toMinor, shopDate, discountDateState };
