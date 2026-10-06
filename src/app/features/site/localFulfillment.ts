import type { LocalFulfillmentConfig } from './types';
export type LocalFulfillmentQuote = { id: string; method: 'pickup' | 'local_delivery'; name: string; price: number; locationId?: string; zoneId?: string; address?: LocalFulfillmentConfig['pickupLocations'][number]['address']; instructions: string; hours?: string; estimate: string };
export const normalizePostalCode = (value: any) => typeof value === 'string' ? value.toUpperCase().replace(/\s/g, '') : '';
const postalPattern = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;
const prefixPattern = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/;
// Pickup areas may be a whole postal district: "M" = all of Toronto, "M6G" = one area.
const pickupAreaPattern = /^[ABCEGHJ-NPRSTVXY](\d[ABCEGHJ-NPRSTV-Z]?)?$/;
const pickupAreas = (location: any): string[] => Array.isArray(location?.postalPrefixes) ? location.postalPrefixes.map(normalizePostalCode).filter(Boolean) : [];
const money = (value: any) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
const canadian = (country: any) => ['CA', 'CANADA'].includes(String(country || '').trim().toUpperCase());
export function validPickupAddress(address: any) {
  // The street and postal code are optional: a shop may share its exact pickup spot after the order.
  // Province and country are required because they set the tax for pickup orders.
  if (!address || typeof address.state !== 'string' || !canadian(address.country)) return false;
  if (!/^(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|ONTARIO|QUEBEC|BRITISH COLUMBIA|ALBERTA|MANITOBA|SASKATCHEWAN|NOVA SCOTIA|NEW BRUNSWICK|NEWFOUNDLAND AND LABRADOR|PRINCE EDWARD ISLAND|YUKON|NUNAVUT|NORTHWEST TERRITORIES)$/.test(address.state.trim().toUpperCase())) return false;
  const zip = normalizePostalCode(address.zip || address.postalCode);
  return !zip || postalPattern.test(zip);
}
export function validateLocalFulfillment(config: any) {
  const errors: string[] = [];
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
      if (kind === 'pickup' && record?.postalPrefixes !== undefined && (!Array.isArray(record.postalPrefixes) || record.postalPrefixes.length > 500 || record.postalPrefixes.some((value: any) => !pickupAreaPattern.test(normalizePostalCode(value))))) errors.push('Pickup areas must be Canadian postal prefixes of one to three characters, such as M for Toronto (maximum 500).');
      if (kind === 'pickup' && record?.enabled && !validPickupAddress(record.address)) errors.push('Pickup needs a Canadian province (e.g. ON); a postal code, if entered, must be valid.');
      if (kind === 'delivery') {
        if (!money(record?.minimumSubtotal)) errors.push('Delivery minimum must be a valid non-negative amount.');
        const prefixes = record?.postalPrefixes, codes = record?.postalCodes;
        if (!Array.isArray(prefixes) || !Array.isArray(codes) || prefixes.length + codes.length === 0 || prefixes.length + codes.length > 500 || prefixes.some((value: any) => !prefixPattern.test(normalizePostalCode(value))) || codes.some((value: any) => !postalPattern.test(normalizePostalCode(value)))) errors.push('Delivery needs valid three-character Canadian prefixes or complete six-character postal codes (maximum 500).');
      }
    }
  }
  return [...new Set(errors)];
}
// cartSubtotal is discounted physical merchandise, excluding delivery and tax.
export function quoteLocalFulfillment(config: LocalFulfillmentConfig | undefined, destination: any, cartSubtotal: number, physicalItems: any[]): LocalFulfillmentQuote[] {
  if (!config?.enabled || !money(cartSubtotal) || !Array.isArray(physicalItems) || !physicalItems.some(item => item && !/digital|ebook|e-book|epub|pdf|audiobook/i.test(String(item.format || '')) && item.digital !== true && item.isDigital !== true && Number.isInteger(item.quantity) && item.quantity > 0) || validateLocalFulfillment(config).length) return [];
  const quotes: LocalFulfillmentQuote[] = [];
  const postal = normalizePostalCode(destination?.zip || destination?.postalCode);
  const servesPostal = canadian(destination?.country) && postalPattern.test(postal);
  for (const location of config.pickupLocations) if (location.enabled && (!pickupAreas(location).length || (servesPostal && pickupAreas(location).some(area => postal.startsWith(area))))) quotes.push({ id: `pickup:${location.id}`, method: 'pickup', locationId: location.id, name: location.name, price: Math.round(location.price * 100) / 100, address: { ...location.address, zip: normalizePostalCode(location.address.zip || location.address.postalCode) }, instructions: location.instructions ?? '', hours: location.hours ?? '', estimate: location.estimate ?? '' });
  if (servesPostal) for (const zone of config.deliveryZones) {
    if (zone.enabled && Math.round(cartSubtotal * 100) >= Math.round(zone.minimumSubtotal * 100) && (zone.postalPrefixes.some(prefix => postal.startsWith(normalizePostalCode(prefix))) || zone.postalCodes.some(code => postal === normalizePostalCode(code)))) quotes.push({ id: `local_delivery:${zone.id}`, method: 'local_delivery', zoneId: zone.id, name: zone.name, price: Math.round(zone.price * 100) / 100, instructions: zone.instructions ?? '', estimate: zone.estimate ?? '' });
  }
  return quotes;
}
