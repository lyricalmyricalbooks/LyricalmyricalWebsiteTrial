import { test, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { canViewOrder, publicOrderView } = require('./orderAccess');
const { nextWindow, clientIpOf } = require('./rateLimit');

const order = { customer: { email: 'Reader@Example.com' }, trackingKey: 'a'.repeat(32), paymentStatus: 'paid' };

test('an order opens only for its own email or email-link key', () => {
  expect(canViewOrder(order, { email: ' reader@example.com ' })).toBe(true);
  expect(canViewOrder(order, { key: 'a'.repeat(32) })).toBe(true);
  expect(canViewOrder(order, { email: 'someone@else.com' })).toBe(false);
  expect(canViewOrder(order, { key: 'b'.repeat(32) })).toBe(false);
  expect(canViewOrder(order, {})).toBe(false);
  expect(canViewOrder({ customer: {} }, { email: '' })).toBe(false);
  expect(canViewOrder({ customer: { email: 'x@y.z' } }, { key: '' })).toBe(false);
});

test('the shopper copy never carries the tracking key', () => {
  const view = publicOrderView('AB-1', order);
  expect(view.id).toBe('AB-1');
  expect(view.trackingKey).toBeUndefined();
  expect(view.paymentStatus).toBe('paid');
});

test('rate limit window counts hits and resets', () => {
  const opts = { max: 2, windowMs: 1000 };
  let r = nextWindow(null, 10_000, opts);
  expect(r).toEqual({ allowed: true, record: { windowStart: 10_000, count: 1 } });
  r = nextWindow(r.record, 10_100, opts); expect(r.allowed).toBe(true);
  r = nextWindow(r.record, 10_200, opts); expect(r.allowed).toBe(false);
  r = nextWindow(r.record, 11_000, opts); expect(r).toEqual({ allowed: true, record: { windowStart: 11_000, count: 1 } });
});

test('client IP is the first forwarded address', () => {
  expect(clientIpOf({ headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } })).toBe('1.2.3.4');
  expect(clientIpOf({ headers: {}, ip: '5.6.7.8' })).toBe('5.6.7.8');
});
