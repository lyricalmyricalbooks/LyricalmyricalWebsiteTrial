// Bulk price maths for the Books catalog. Pure; the caller writes the results.
export type PriceMode = "percent" | "amount" | "set";

/** Returns the new price in dollars (2dp, never below 0), or null when the input can't be applied. */
export function adjustPrice(current: number, mode: PriceMode, value: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(current)) return null;
  const next = mode === "percent" ? current * (1 + value / 100) : mode === "amount" ? current + value : value;
  if (mode === "set" && value < 0) return null;
  return Math.max(0, Math.round(next * 100) / 100);
}

export interface PricePreview { id: string; title: string; from: number; to: number }

export function previewPrices(books: any[], mode: PriceMode, value: number): PricePreview[] {
  const out: PricePreview[] = [];
  for (const b of books) {
    const from = Number(b.retailPrice);
    if (!Number.isFinite(from)) continue;
    const to = adjustPrice(from, mode, value);
    if (to !== null && to !== from) out.push({ id: b.id, title: b.title || "Untitled", from, to });
  }
  return out;
}

export function catalogToCsv(books: any[]): string {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;
  const head = ["Title", "Author", "Format", "ISBN", "SKU", "Status", "Featured", "Price", "Stock"];
  return [head.map(cell).join(","), ...books.map((b) => [
    b.title, b.authorName, b.format, b.isbn, b.sku, b.status || "published", (b.isFeatured ?? b.featured) ? "yes" : "no",
    Number(b.retailPrice || 0).toFixed(2), b.stockLevel ?? "",
  ].map(cell).join(","))].join("\n");
}
