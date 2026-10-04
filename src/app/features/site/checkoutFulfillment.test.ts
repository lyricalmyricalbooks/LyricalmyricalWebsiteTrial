import { expect, it } from 'vitest';
import { catalogFulfillmentItems, discountedPhysicalSubtotal, selectionAfterChange } from './checkoutFulfillment';

const books = new Map<string, any>([['print', { format: 'Paperback' }], ['mixed', { format: 'Paperback', variants: [{ id: 'epub', name: 'E-book', price: 10, format: 'EPUB' }] }]]);
it('classifies a digital variant from the complete catalog and allocates a cart-wide discount in cents', () => {
  const items = catalogFulfillmentItems([{ id: 'print', price: 20, quantity: 1 }, { id: 'mixed', variantId: 'epub', price: 10, quantity: 1 }], books);
  expect(items?.map(item => item.physical)).toEqual([true, false]);
  expect(discountedPhysicalSubtotal(items!, 9, { appliesTo: 'all', type: 'fixed' }, books)).toBe(14);
});
it('cannot offer local fulfillment from a truncated catalog or a digital-only cart', () => {
  expect(catalogFulfillmentItems([{ id: 'missing', price: 20, quantity: 1 }], books)).toBeNull();
  const digital = catalogFulfillmentItems([{ id: 'mixed', variantId: 'epub', price: 10, quantity: 1 }], books)!;
  expect(discountedPhysicalSubtotal(digital, 0, null, books)).toBe(0);
});
it('clears a changed option but keeps the selected method for review', () => {
  expect(selectionAfterChange({ method: 'pickup', optionId: 'pickup:shop' }, 'before', 'after')).toEqual({ method: 'pickup', optionId: '' });
  expect(selectionAfterChange({ method: 'shipping', optionId: 'mail' }, 'same', 'same')).toEqual({ method: 'shipping', optionId: 'mail' });
});
