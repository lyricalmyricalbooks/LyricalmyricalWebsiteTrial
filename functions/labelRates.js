const CANADA_POST_NAMES = ["canada post", "canadapost", "canada_post"];

function isCanadaPostRate(rate) {
  const carrier = [rate?.provider, rate?.carrier, rate?.servicelevel?.token].filter(Boolean).join(" ").toLowerCase();
  return CANADA_POST_NAMES.some(name => carrier.includes(name));
}

function canadaPostLabelRates(rates, limit = 5) {
  const cheapestByService = new Map();
  (rates || []).filter(isCanadaPostRate).forEach(rate => {
    const service = String(rate?.servicelevel?.token || rate?.servicelevel?.name || rate?.object_id || "").toLowerCase();
    const current = cheapestByService.get(service);
    if (!current || Number(rate.amount) < Number(current.amount)) cheapestByService.set(service, rate);
  });
  return [...cheapestByService.values()]
    .filter(rate => Number.isFinite(Number(rate.amount)))
    .sort((a, b) => Number(a.amount) - Number(b.amount))
    .slice(0, limit);
}

module.exports = { canadaPostLabelRates, isCanadaPostRate };
