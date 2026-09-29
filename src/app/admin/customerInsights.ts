// Builds a customer directory from paid, non-test orders. Read-only: nothing here
// writes to Firestore or affects charging.

export type CustomerSegment = "vip" | "returning" | "new" | "at-risk";

export interface CustomerRow {
  key: string; // lowercased email
  email: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  avgOrder: number;
  firstOrderAt: number;
  lastOrderAt: number;
  daysSinceLast: number;
  segment: CustomerSegment;
  city: string;
  country: string;
  orders: any[];
}

export const VIP_SPEND = 250;
export const AT_RISK_DAYS = 180;

export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  vip: "VIP", returning: "Returning", new: "New", "at-risk": "At risk",
};

export function segmentOf(orderCount: number, totalSpent: number, daysSinceLast: number): CustomerSegment {
  if (totalSpent >= VIP_SPEND || orderCount >= 5) return "vip";
  if (daysSinceLast > AT_RISK_DAYS) return "at-risk";
  return orderCount >= 2 ? "returning" : "new";
}

export function buildCustomers(orders: any[], now = Date.now()): CustomerRow[] {
  const map = new Map<string, CustomerRow>();
  for (const o of orders) {
    if (o?.isTest === true || o?.paymentStatus !== "paid") continue;
    const email = String(o.customer?.email || "").trim();
    if (!email) continue;
    const key = email.toLowerCase();
    const at = new Date(o.createdAt).getTime() || 0;
    const addr = o.shippingAddress || o.customer?.address || {};
    let c = map.get(key);
    if (!c) {
      c = {
        key, email, name: o.customer?.name || "", orderCount: 0, totalSpent: 0, avgOrder: 0,
        firstOrderAt: at, lastOrderAt: at, daysSinceLast: 0, segment: "new",
        city: addr.city || "", country: addr.country || "", orders: [],
      };
      map.set(key, c);
    }
    c.orderCount += 1;
    c.totalSpent += Number(o.total) || 0;
    c.orders.push(o);
    if (at && (!c.firstOrderAt || at < c.firstOrderAt)) c.firstOrderAt = at;
    if (at >= c.lastOrderAt) {
      c.lastOrderAt = at;
      if (o.customer?.name) c.name = o.customer.name;
      if (addr.city) c.city = addr.city;
      if (addr.country) c.country = addr.country;
    }
  }
  const rows = Array.from(map.values());
  for (const c of rows) {
    c.avgOrder = c.orderCount ? c.totalSpent / c.orderCount : 0;
    c.daysSinceLast = c.lastOrderAt ? Math.max(0, Math.floor((now - c.lastOrderAt) / 86400000)) : 0;
    c.segment = segmentOf(c.orderCount, c.totalSpent, c.daysSinceLast);
    c.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return rows;
}

export function customerStats(rows: CustomerRow[]) {
  const total = rows.length;
  const repeat = rows.filter((c) => c.orderCount >= 2).length;
  const revenue = rows.reduce((s, c) => s + c.totalSpent, 0);
  return {
    total,
    repeat,
    repeatRate: total ? repeat / total : 0,
    avgLtv: total ? revenue / total : 0,
    revenue,
  };
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

export function customersToCsv(rows: CustomerRow[]): string {
  const head = ["Email", "Name", "Segment", "Orders", "Total spent", "Avg order", "First order", "Last order", "City", "Country"];
  const lines = rows.map((c) => [
    c.email, c.name, SEGMENT_LABELS[c.segment], c.orderCount, c.totalSpent.toFixed(2), c.avgOrder.toFixed(2),
    c.firstOrderAt ? new Date(c.firstOrderAt).toISOString().slice(0, 10) : "",
    c.lastOrderAt ? new Date(c.lastOrderAt).toISOString().slice(0, 10) : "", c.city, c.country,
  ].map(csvCell).join(","));
  return [head.map(csvCell).join(","), ...lines].join("\n");
}
