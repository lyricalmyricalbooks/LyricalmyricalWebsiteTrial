const { isCanadaPostRate } = require("./labelRates");

function checkoutCarrierRates(rates) {
  const services = new Map();
  for (const rate of rates || []) {
    const price = Number(rate.amount);
    if (!isCanadaPostRate(rate) || rate.amount == null || rate.amount === "" || !Number.isFinite(price) || price < 0) continue;
    const service = rate.servicelevel?.name || rate.servicelevel?.token || "Shipping";
    const quote = {
      name: `Canada Post ${service}`,
      provider: "Canada Post",
      price,
      base: price,
      additional: 0,
      deliveryDays: rate.estimated_days != null ? String(rate.estimated_days) : (rate.duration_terms || "3-7"),
    };
    const key = service.trim().toLowerCase();
    if (!services.has(key) || price < services.get(key).price) services.set(key, quote);
  }
  return [...services.values()].sort((a, b) => a.price - b.price).slice(0, 5);
}

module.exports = { checkoutCarrierRates };
