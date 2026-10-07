// Order amounts are stored in CAD. Customer emails show what the customer was charged:
// the order's own checkout currency at the rate saved when it was priced.
const SYMBOLS = { CAD: "CA$", USD: "US$", EUR: "€" };

function orderMoneyFmt(cad, order) {
  const n = Number(cad || 0);
  const currency = String((order && order.checkoutCurrency) || "CAD").toUpperCase();
  const rate = Number(order && order.exchangeRate);
  const value = currency !== "CAD" && rate > 0 ? n * rate : n;
  return `${SYMBOLS[currency] || `${currency} `}${value.toFixed(2)}`;
}

// The refund line in the customer's email: the refunded amount in the currency it went back in.
// Older records without a currency are treated as the order total in CAD.
function refundAmountText(order) {
  const refunded = Number(order && order.refund && order.refund.amount);
  if (!Number.isFinite(refunded)) return orderMoneyFmt(order && order.total, order);
  const currency = String((order.refund && order.refund.currency) || "CAD").toUpperCase();
  return `${SYMBOLS[currency] || `${currency} `}${refunded.toFixed(2)}`;
}

// The shipped email when no tracking number was entered: drop the lines about the carrier's
// tracking, and "with {{tracking_carrier}}", so the customer doesn't see blanks.
function withoutTrackingLines(body) {
  return String(body || "")
    .split("\n")
    .filter(line => !/\{\{tracking_number\}\}|\{\{tracking_url\}\}|carrier'?s website/i.test(line))
    .join("\n")
    .replace(/\s+with \{\{tracking_carrier\}\}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

module.exports = { orderMoneyFmt, refundAmountText, withoutTrackingLines };
