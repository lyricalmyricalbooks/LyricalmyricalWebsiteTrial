const CANADA_POST_NAMES = ["canada post", "canadapost", "canada_post"];

function isCanadaPostRate(rate) {
  const carrier = [rate?.provider, rate?.carrier, rate?.servicelevel?.token].filter(Boolean).join(" ").toLowerCase();
  return CANADA_POST_NAMES.some(name => carrier.includes(name));
}

function canadaPostLabelRates(rates, limit = 5) {
  return (rates || [])
    .filter(rate => isCanadaPostRate(rate) && rate?.object_id && Number.isFinite(Number(rate.amount)) && Number(rate.amount) >= 0)
    .sort((a, b) => Number(a.amount) - Number(b.amount))
    .slice(0, limit);
}

module.exports = { canadaPostLabelRates, isCanadaPostRate };
