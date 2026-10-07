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

/**
 * True when the server's charge (minor units) differs from the total on screen by more than
 * rounding and a day's exchange-rate drift: 5 cents or 1%, whichever is larger. The server
 * rounds each line, shipping and tax separately, so a few cents of difference is normal.
 */
export function totalNeedsConfirming(serverMinor: number, shownMinor: number): boolean {
  if (!Number.isFinite(serverMinor) || !Number.isFinite(shownMinor)) return false;
  return Math.abs(serverMinor - shownMinor) > Math.max(5, Math.round(shownMinor * 0.01));
}
