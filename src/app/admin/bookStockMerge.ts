/**
 * Saving a book must not put back a stock count the editor loaded earlier: a sale (the
 * Stripe webhook, functions/inventory.js) may have lowered it since. Stock the owner did
 * not change in the editor keeps the live value; stock the owner did change is saved as typed.
 * Pure; used by adminApi.updateBook.
 */
const variantStock = (v: any) => (v?.stockLevel !== undefined ? v.stockLevel : v?.stock);

export function keepLiveStock(form: any, initial: any, live: any): any {
  if (!form || !initial || !live) return form;
  const out = { ...form };
  if (sameNumber(form.stockLevel, initial.stockLevel) && live.stockLevel !== undefined) out.stockLevel = live.stockLevel;
  if (Array.isArray(form.variants)) {
    const before = new Map((initial.variants || []).map((v: any) => [v?.id, v]));
    const now = new Map((live.variants || []).map((v: any) => [v?.id, v]));
    out.variants = form.variants.map((v: any) => {
      const was: any = before.get(v?.id);
      const current: any = now.get(v?.id);
      if (!v?.id || !was || !current) return v;
      if (!sameNumber(variantStock(v), variantStock(was))) return v;
      const liveStock = variantStock(current);
      if (liveStock === undefined) return v;
      return { ...v, stock: liveStock, stockLevel: liveStock };
    });
  }
  return out;
}

/**
 * What a book save should write: only the fields the owner actually changed in the editor
 * (form differs from the snapshot it loaded, compared deeply), with stock merged through
 * keepLiveStock. Fields nobody touched keep whatever is live now, so a save never undoes a
 * change made elsewhere (another tab, the catalog list, an import, a sale) while the editor
 * was open. Pure; used by adminApi.updateBook.
 */
export function changedBookFields(form: any, initial: any, live: any): Record<string, any> {
  const merged = keepLiveStock(form, initial, live) || {};
  const out: Record<string, any> = {};
  for (const key of Object.keys(merged)) {
    if (key === "id" || key === "_lastDoc") continue;
    if (!sameValue(form?.[key], initial?.[key])) out[key] = merged[key];
  }
  return out;
}

/** Deep equality for plain book data (arrays, objects, dates); missing and null/undefined match. */
export function sameValue(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => sameValue(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    if (typeof a.isEqual === "function" && Object.getPrototypeOf(a) === Object.getPrototypeOf(b)) return a.isEqual(b);
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if (!sameValue(a[k], b[k])) return false;
    return true;
  }
  return false;
}

function sameNumber(a: any, b: any): boolean {
  return (a ?? null) === (b ?? null) || (a !== "" && b !== "" && a != null && b != null && Number(a) === Number(b));
}
