// Defend checkout against an older endpoint returning unfiltered carrier rates.
export function checkoutLiveRates(rates: any[]) {
  const services = new Map<string, any>();
  for (const rate of rates || []) {
    const carrier = String(rate.provider || rate.name || "").toLowerCase();
    const price = Number(rate.price);
    if (!/^canada[ _]?post(?:\s|$)/.test(carrier) || rate.price == null || rate.price === "" || !Number.isFinite(price) || price < 0) continue;
    const key = String(rate.name || "").trim().toLowerCase();
    if (!services.has(key) || price < services.get(key).price) services.set(key, { ...rate, price });
  }
  return [...services.values()].sort((a, b) => a.price - b.price).slice(0, 5);
}
