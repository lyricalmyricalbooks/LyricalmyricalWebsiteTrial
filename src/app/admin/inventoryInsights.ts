// Inventory classification for the admin Inventory page. Pure + read-only.
import { isDigitalBook, titleStock } from "./overviewInsights";

export type StockStatus = "out" | "low" | "reprint" | "ok" | "digital";

export interface InventoryRow {
  id: string; title: string; format: string; stock: number; price: number; value: number;
  sold30: number; coverDays: number | null; status: StockStatus; digital: boolean; book: any;
}

export const DEFAULT_LOW_STOCK = 5;
export const STATUS_LABELS: Record<StockStatus, string> = {
  out: "Out of stock", low: "Low stock", reprint: "Reprint soon", ok: "In stock", digital: "Digital",
};

const isDigital = (b: any) => isDigitalBook(b);

export function statusOf(stock: number, coverDays: number | null, threshold: number, digital: boolean): StockStatus {
  if (digital) return "digital";
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  if (coverDays !== null && coverDays <= 30) return "reprint";
  return "ok";
}

export function buildInventory(books: any[], paidOrders: any[], threshold = DEFAULT_LOW_STOCK, now = Date.now()): InventoryRow[] {
  const velocity = new Map(titleStock(paidOrders, books, now).map((t) => [t.id, t]));
  return books.filter((b) => b.status !== "draft").map((b) => {
    const digital = isDigital(b);
    const stock = Math.max(0, Number(b.stockLevel) || 0);
    const v = velocity.get(b.id);
    const price = Number(b.retailPrice ?? b.price) || 0;
    return {
      id: b.id, title: b.title || "Untitled", format: b.format || "", stock, price,
      value: digital ? 0 : stock * price, sold30: v?.sold30 ?? 0, coverDays: v?.coverDays ?? null,
      status: statusOf(stock, v?.coverDays ?? null, threshold, digital), digital, book: b,
    };
  });
}

export function inventorySummary(rows: InventoryRow[]) {
  const print = rows.filter((r) => !r.digital);
  return {
    units: print.reduce((s, r) => s + r.stock, 0),
    value: print.reduce((s, r) => s + r.value, 0),
    out: rows.filter((r) => r.status === "out").length,
    low: rows.filter((r) => r.status === "low").length,
    reprint: rows.filter((r) => r.status === "reprint").length,
  };
}

/** Clamp a manual stock edit to a whole number >= 0; null when the input isn't a number. */
export function parseStock(input: string | number): number | null {
  const n = typeof input === "number" ? input : Number(String(input).trim());
  if (!Number.isFinite(n) || String(input).trim() === "") return null;
  return Math.max(0, Math.round(n));
}

export function inventoryToCsv(rows: InventoryRow[]): string {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;
  const head = ["Title", "Format", "Status", "On hand", "Price", "Stock value", "Sold (30d)", "Days of cover"];
  return [head.map(cell).join(","), ...rows.map((r) => [
    r.title, r.format, STATUS_LABELS[r.status], r.digital ? "" : r.stock, r.price.toFixed(2), r.value.toFixed(2), r.sold30, r.coverDays ?? "",
  ].map(cell).join(","))].join("\n");
}
