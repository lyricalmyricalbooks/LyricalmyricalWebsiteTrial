// Per-code performance from paid, non-test orders. Read-only.
export interface CodePerformance { orders: number; revenue: number; discountGiven: number; avgOrder: number }

export function discountPerformance(orders: any[]): Map<string, CodePerformance> {
  const map = new Map<string, CodePerformance>();
  for (const o of orders) {
    if (o?.isTest === true || o?.paymentStatus !== "paid") continue;
    const code = String(o.appliedDiscount?.code || "").trim().toUpperCase();
    if (!code) continue;
    const p = map.get(code) || { orders: 0, revenue: 0, discountGiven: 0, avgOrder: 0 };
    p.orders += 1;
    p.revenue += Number(o.total) || 0;
    p.discountGiven += Number(o.discount) || 0;
    map.set(code, p);
  }
  map.forEach((p) => { p.avgOrder = p.orders ? p.revenue / p.orders : 0; });
  return map;
}

/** Copy of a discount for "Duplicate": new unique-looking code, inactive, no usage, no id. */
export function duplicateDiscount(d: any, existingCodes: string[]) {
  const taken = new Set(existingCodes.map((c) => String(c).toUpperCase()));
  const base = String(d.code || "CODE").toUpperCase().replace(/-COPY\d*$/, "");
  let code = `${base}-COPY`;
  for (let i = 2; taken.has(code); i++) code = `${base}-COPY${i}`;
  const { id, usageCount, createdAt, updatedAt, _lastDoc, ...rest } = d;
  return { ...rest, code, isActive: false };
}
