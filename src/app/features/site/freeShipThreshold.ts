// The bag's "CA$X away from free shipping" bar must only promise what checkout charges.
// It reads the real Settings › Shipping rules: a profile's free-shipping-over amount
// (or the older `freeThreshold`) and any rate's "free over" amount. The lowest one wins.
// No rule anywhere → no bar. E-book-only bags never pay shipping → no bar.
export function shippingFreeThresholds(profiles: any[]): number[] {
  const found = new Set<number>();
  const add = (value: unknown) => { const n = Number(value); if (Number.isFinite(n) && n > 0) found.add(n); };
  for (const profile of profiles || []) {
    add(profile?.freeShippingOver);
    add(profile?.freeThreshold);
    for (const zone of profile?.zones || []) for (const rate of zone?.rates || []) add(rate?.freeOver);
  }
  return [...found].sort((a, b) => a - b);
}

/** null = don't show the bar (rules not loaded yet, no free-shipping rule, or nothing to ship). */
export function bagFreeShipThreshold(profiles: any[] | null, hasPhysicalItems: boolean): number | null {
  if (!profiles || !hasPhysicalItems) return null;
  return shippingFreeThresholds(profiles)[0] ?? null;
}
