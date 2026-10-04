const normalizePostalCode = value => typeof value === 'string' ? value.toUpperCase().replace(/\s/g, '') : '';
const postalPattern = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;
const prefixPattern = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/;
const money = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
const canadian = country => ['CA', 'CANADA'].includes(String(country || '').trim().toUpperCase());
function validPickupAddress(address) {
  return !!address && ['street', 'city', 'state'].every(key => typeof address[key] === 'string' && address[key].trim()) && /^(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|ONTARIO|QUEBEC|BRITISH COLUMBIA|ALBERTA|MANITOBA|SASKATCHEWAN|NOVA SCOTIA|NEW BRUNSWICK|NEWFOUNDLAND AND LABRADOR|PRINCE EDWARD ISLAND|YUKON|NUNAVUT|NORTHWEST TERRITORIES)$/.test(String(address.state).trim().toUpperCase()) && canadian(address.country) && postalPattern.test(normalizePostalCode(address.zip || address.postalCode));
}
function validateLocalFulfillment(config) {
  const errors = [];
  if (!config || typeof config.enabled !== 'boolean' || !Array.isArray(config.pickupLocations) || !Array.isArray(config.deliveryZones)) return ['Local fulfillment requires an enable switch, pickup locations and delivery zones.'];
  const ids = new Set();
  for (const [kind, records] of [['pickup', config.pickupLocations], ['delivery', config.deliveryZones]]) {
    for (const record of records) {
      if (!record || typeof record.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(record.id) || ids.has(record.id)) errors.push('Every location and zone needs a unique stable ID.');
      ids.add(record?.id);
      if (!record || typeof record.enabled !== 'boolean') errors.push('Every option needs an enable switch.');
      if (!record || !money(record.price)) errors.push('Fees must be valid non-negative amounts with at most two decimals.');
      if (!record || typeof record.name !== 'string' || !record.name.trim() || record.name.length > 200) errors.push('Every option needs a name (up to 200 characters).');
      for (const field of ['instructions', 'hours', 'estimate']) if (record?.[field] !== undefined && (typeof record[field] !== 'string' || record[field].length > 4000)) errors.push('Public instructions, hours and estimates must be text up to 4000 characters.');
      if (kind === 'pickup' && (!record?.address || typeof record.address !== 'object' || Array.isArray(record.address) || !['street', 'city', 'state', 'zip', 'country'].every(key => typeof record.address[key] === 'string'))) errors.push('Pickup address fields must be text, even while disabled.');
      if (kind === 'pickup' && record?.enabled && !validPickupAddress(record.address)) errors.push('Enabled pickup needs a complete Canadian address and valid postal code.');
      if (kind === 'delivery') {
        if (!money(record?.minimumSubtotal)) errors.push('Delivery minimum must be a valid non-negative amount.');
        const prefixes = record?.postalPrefixes, codes = record?.postalCodes;
        if (!Array.isArray(prefixes) || !Array.isArray(codes) || prefixes.length + codes.length === 0 || prefixes.length + codes.length > 500 || prefixes.some(value => !prefixPattern.test(normalizePostalCode(value))) || codes.some(value => !postalPattern.test(normalizePostalCode(value)))) errors.push('Delivery needs valid three-character Canadian prefixes or complete six-character postal codes (maximum 500).');
      }
    }
  }
  return [...new Set(errors)];
}
// cartSubtotal is discounted physical merchandise, excluding delivery and tax.
function quoteLocalFulfillment(config, destination, cartSubtotal, physicalItems) {
  if (!config?.enabled || !money(cartSubtotal) || !Array.isArray(physicalItems) || !physicalItems.some(item => item && !/digital|ebook|e-book|epub|pdf|audiobook/i.test(String(item.format || '')) && item.digital !== true && item.isDigital !== true && Number.isInteger(item.quantity) && item.quantity > 0) || validateLocalFulfillment(config).length) return [];
  const quotes = [];
  for (const location of config.pickupLocations) if (location.enabled) quotes.push({ id: `pickup:${location.id}`, method: 'pickup', locationId: location.id, name: location.name, price: Math.round(location.price * 100) / 100, address: { ...location.address, zip: normalizePostalCode(location.address.zip || location.address.postalCode) }, instructions: location.instructions ?? '', hours: location.hours ?? '', estimate: location.estimate ?? '' });
  const postal = normalizePostalCode(destination?.zip || destination?.postalCode);
  if (canadian(destination?.country) && postalPattern.test(postal)) for (const zone of config.deliveryZones) {
    if (zone.enabled && Math.round(cartSubtotal * 100) >= Math.round(zone.minimumSubtotal * 100) && (zone.postalPrefixes.some(prefix => postal.startsWith(normalizePostalCode(prefix))) || zone.postalCodes.some(code => postal === normalizePostalCode(code)))) quotes.push({ id: `local_delivery:${zone.id}`, method: 'local_delivery', zoneId: zone.id, name: zone.name, price: Math.round(zone.price * 100) / 100, instructions: zone.instructions ?? '', estimate: zone.estimate ?? '' });
  }
  return quotes;
}
module.exports = { normalizePostalCode, validPickupAddress, validateLocalFulfillment, quoteLocalFulfillment };
