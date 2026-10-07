import { test, expect } from 'vitest';
import { createRequire } from 'node:module';
const { orderMoneyFmt } = createRequire(import.meta.url)('./emailMoney');

test('emails show the currency the customer paid in', () => {
  expect(orderMoneyFmt(10, { checkoutCurrency: 'USD', exchangeRate: 0.73 })).toBe('US$7.30');
  expect(orderMoneyFmt(10, { checkoutCurrency: 'EUR', exchangeRate: 0.66 })).toBe('€6.60');
  expect(orderMoneyFmt(10, { checkoutCurrency: 'CAD', exchangeRate: 1 })).toBe('CA$10.00');
  expect(orderMoneyFmt(10, {})).toBe('CA$10.00');
});
