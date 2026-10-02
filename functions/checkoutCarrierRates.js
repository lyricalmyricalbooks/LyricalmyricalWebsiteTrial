function normalizeCheckoutRates(rates) {
  const cheapest = new Map();
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

function checkoutCarrierRates(rates) {
  return normalizeCheckoutRates(rates.map(rate => ({
    name: `${rate.provider || ""} ${rate.servicelevel?.name || rate.servicelevel?.token || "Shipping"}`.trim(),
    price: rate.amount,
    deliveryDays: rate.estimated_days != null ? String(rate.estimated_days) : (rate.duration_terms || "3-7"),
  })));
}

module.exports = { checkoutCarrierRates, normalizeCheckoutRates };
