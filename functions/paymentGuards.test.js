import { test, expect } from 'vitest';
import { createRequire } from 'node:module';
const { checkoutCurrencyOf, paidAmountCheck, toMinor } = createRequire(import.meta.url)('./paymentGuards');

test('only the shop currencies are accepted', () => {
  expect(checkoutCurrencyOf(undefined)).toBe('cad');
  expect(checkoutCurrencyOf('USD')).toBe('usd');
  expect(checkoutCurrencyOf('inr')).toBeNull();
  expect(checkoutCurrencyOf('mxn')).toBeNull();
});

test('a payment must match the amount and currency it was created for', () => {
  const order = { expectedAmountMinor: 10000, expectedCurrency: 'cad' };
  expect(paidAmountCheck(order, 10000, 'CAD').ok).toBe(true);
  expect(paidAmountCheck(order, 165, 'cad').ok).toBe(false);
  expect(paidAmountCheck(order, 10000, 'inr').ok).toBe(false);
  expect(paidAmountCheck({}, 1, 'inr')).toEqual({ ok: true, unverified: true });
  expect(toMinor('12.34')).toBe(1234);
});

test('discount dates follow the shop calendar day in Toronto', () => {
  const { discountDateState } = createRequire(import.meta.url)('./paymentGuards');
  // 9pm Toronto on 6 Oct = 01:00 UTC on 7 Oct: a code whose last day is the 6th still works.
  const evening = new Date('2026-10-07T01:00:00Z');
  expect(discountDateState({ expiryDate: '2026-10-06' }, evening)).toBeNull();
  expect(discountDateState({ expiryDate: '2026-10-05' }, evening)).toBe('expired');
  expect(discountDateState({ startDate: '2026-10-07' }, evening)).toBe('not_started');
  expect(discountDateState({ startDate: '2026-10-06' }, evening)).toBeNull();
  expect(discountDateState({ expiryDate: '2026-10-06T12:00:00Z' }, evening)).toBe('expired');
});

test('only live, published books (as an edition when they have editions) can be bought', () => {
  const { purchaseProblem } = createRequire(import.meta.url)('./paymentGuards');
  const now = '2026-10-06T12:00:00.000Z';
  expect(purchaseProblem({ status: 'published' }, null, now)).toBeNull();
  expect(purchaseProblem({}, null, now)).toBeNull();
  expect(purchaseProblem({ status: 'draft' }, null, now)).toBe('unavailable');
  expect(purchaseProblem({ status: 'archived' }, null, now)).toBe('unavailable');
  expect(purchaseProblem({ status: 'published', scheduleDate: '2026-10-07' }, null, now)).toBe('unavailable');
  expect(purchaseProblem({ status: 'published', scheduleDate: '2026-10-06' }, null, now)).toBeNull();
  expect(purchaseProblem({ status: 'published', variants: [{ id: 'pb' }] }, null, now)).toBe('choose_edition');
  expect(purchaseProblem({ status: 'published', variants: [{ id: 'pb' }] }, 'pb', now)).toBeNull();
});
