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
