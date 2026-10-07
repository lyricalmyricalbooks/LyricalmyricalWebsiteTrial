// Amounts on an order are stored in CAD. A shopper who paid in USD or EUR is shown
// what they were charged: the order's own currency at the rate saved when it was priced.
const SYMBOLS: Record<string, string> = { CAD: "CA$ ", USD: "$ ", EUR: "€ " };

/** An amount already in `currency` (e.g. what Stripe will charge). */
export function amountIn(value: number, currency: string | undefined): string {
  const code = String(currency || "CAD").toUpperCase();
  return `${SYMBOLS[code] || `${code} `}${(Number(value) || 0).toFixed(2)}`;
}

/** A CAD amount from an order, in the currency the order was paid in. */
export function orderMoney(cad: number | undefined, order: any, fallback: (cad: number) => string): string {
  const n = Number(cad) || 0;
  if (order?.checkoutCurrency && Number(order?.exchangeRate) > 0) return amountIn(n * Number(order.exchangeRate), order.checkoutCurrency);
  return fallback(n);
}
