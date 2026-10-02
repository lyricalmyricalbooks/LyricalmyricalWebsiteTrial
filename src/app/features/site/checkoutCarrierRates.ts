// Keep in parity with functions/checkoutCarrierRates.js for older deployed APIs.
export function normalizeCheckoutRates(rates: any[]) {
  const cheapest = new Map<string, any>();
  for (const rate of rates) {
    if (!/^canada\s*post\b/i.test(rate.name || "")) continue;
    const amount = rate.price ?? rate.base;
    if (amount === "" || amount == null) continue;
    const price = Number(amount);
    if (!Number.isFinite(price) || price < 0) continue;
    const key = rate.name.trim().toLowerCase();
    if (!cheapest.has(key) || price < cheapest.get(key).price) cheapest.set(key, { ...rate, price });
  }
  return [...cheapest.values()].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)).slice(0, 5);
}
