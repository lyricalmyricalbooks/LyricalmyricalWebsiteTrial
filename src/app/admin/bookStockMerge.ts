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

function sameNumber(a: any, b: any): boolean {
  return (a ?? null) === (b ?? null) || (a !== "" && b !== "" && a != null && b != null && Number(a) === Number(b));
}
