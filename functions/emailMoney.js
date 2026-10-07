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

module.exports = { orderMoneyFmt };
