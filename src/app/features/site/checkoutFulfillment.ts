import type { FulfillmentSelection } from './FulfillmentMethodPicker';

export type CatalogFulfillmentItem = { id: string; variantId?: string; price: number; quantity: number; format: string; physical: boolean };
const digitalFormat = /digital|ebook|e-book|epub|pdf|audiobook/i;
const cents = (value: number) => Math.round(Number(value || 0) * 100);
export function catalogFulfillmentItems(cart: Array<{ id: string; variantId?: string; price: number; quantity: number }>, books: Map<string, any>): CatalogFulfillmentItem[] | null {
  const items: CatalogFulfillmentItem[] = [];
  for (const item of cart) {
    const book = books.get(item.id);
    if (!book) return null;
    const variant = item.variantId ? (book.variants || []).find((v: any) => v.id === item.variantId) : null;
    if (item.variantId && !variant) return null;
    const format = variant?.format || (digitalFormat.test(String(variant?.name || '')) || /paperback|hardcover|hardback|softcover/i.test(String(variant?.name || '')) ? variant.name : book.format || '');
    const digital = variant?.digital === true || variant?.isDigital === true || (!variant && (book.digital === true || book.isDigital === true)) || digitalFormat.test(String(format));
    items.push({ id: item.id, variantId: item.variantId, price: item.price, quantity: item.quantity, format, physical: !digital });
  }
  return items;
}
export function discountedPhysicalSubtotal(items: CatalogFulfillmentItem[], discountAmount: number, discount: any, books: Map<string, any>): number {
  const physicalCents = items.filter(item => item.physical).reduce((sum, item) => sum + cents(item.price) * item.quantity, 0);
  const allCents = items.reduce((sum, item) => sum + cents(item.price) * item.quantity, 0);
  if (!physicalCents || !allCents) return 0;
  const discountCents = Math.max(0, Math.min(cents(discountAmount), allCents));
  if (!discountCents) return physicalCents / 100;
  const selected = (item: CatalogFulfillmentItem) => discount?.appliesTo === 'products'
    ? (discount.selectedProducts || []).includes(item.id)
    : discount?.appliesTo === 'categories'
      ? (books.get(item.id)?.categories || []).some((category: string) => (discount.selectedCategories || []).includes(category))
      : true;
  const eligible = items.filter(selected);
  if (discount?.type === 'bogo') {
    const getQty = Number(discount.getQuantity) || 1;
    const setSize = (Number(discount.buyQuantity) || 1) + getQty;
    const units = eligible.flatMap(item => Array.from({ length: item.quantity }, () => ({ price: cents(item.price), physical: item.physical })));
    units.sort((a, b) => b.price - a.price);
    const count = Math.floor(units.length / setSize) * getQty;
    const physicalDiscount = (count ? units.slice(-count) : []).filter(unit => unit.physical).reduce((sum, unit) => sum + Math.round(unit.price * bogoPercent(discount.getDiscountValue) / 100), 0);
    return Math.max(0, physicalCents - Math.min(physicalDiscount, discountCents)) / 100;
  }
  const eligibleCents = eligible.reduce((sum, item) => sum + cents(item.price) * item.quantity, 0);
  const eligiblePhysicalCents = eligible.filter(item => item.physical).reduce((sum, item) => sum + cents(item.price) * item.quantity, 0);
  const physicalDiscount = eligibleCents ? Math.round(discountCents * eligiblePhysicalCents / eligibleCents) : 0;
  return Math.max(0, physicalCents - physicalDiscount) / 100;
}
export function selectionAfterChange(selection: FulfillmentSelection, previousKey: string, nextKey: string): FulfillmentSelection {
  return previousKey === nextKey ? selection : { ...selection, optionId: '' };
}

/** BOGO "% off the free items": missing/blank/invalid means 100; otherwise clamped 0-100 (mirrors functions/localFulfillment.js). */
export function bogoPercent(value: unknown): number {
  if (value === undefined || value === null || value === '') return 100;
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 100;
}
