// A label purchase claims a lock (order-operations.labelPurchasePending) so a retry can't buy
// two labels. A definite Shippo refusal (status ERROR) must release it and show Shippo's reasons;
// an uncertain failure keeps it until the owner checks Shippo and clears it (admin-only, logged).
import { test, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");
const { addressKey, packingKey, shippoTransactionOutcome } = require("./fulfillmentGuard.js");

const ADMIN = { email: "lyricalmyricalbooks@gmail.com", email_verified: true };

function harness({ transaction, identity = ADMIN, pending = false } = {}) {
  const order = { orderId: "AB-1", paymentStatus: "paid", status: "processing", customer: { name: "Reader", email: "reader@example.com", address: { street: "1 Main", city: "Toronto", state: "ON", zip: "M1M1M1", country: "CA" } }, items: [{ id: "b", title: "Book", quantity: 1, format: "Paperback" }] };
  const ops = { addressReviewed: addressKey(order), packed: packingKey(order), quotedShipmentId: "sh_1", quotedAddress: JSON.stringify(order.customer.address), ...(pending ? { labelPurchasePending: true, labelPurchaseStartedAt: "2026-10-01T00:00:00.000Z" } : {}) };
  const docs = { orders: { A: order }, "order-operations": { A: ops }, settings: { website: {} } };
  const merge = (target, data) => {
    for (const [k, v] of Object.entries(data)) {
      if (v && v.__arrayUnion) target[k] = [...(target[k] || []), ...v.__arrayUnion];
      else target[k] = v;
    }
  };
  const ref = (name, id) => ({
    path: `${name}/${id}`,
    async get() { const value = docs[name]?.[id]; return { id, exists: !!value, data: () => value }; },
    async set(data, opts) { docs[name] = docs[name] || {}; if (opts?.merge && docs[name][id]) merge(docs[name][id], data); else { docs[name][id] = {}; merge(docs[name][id], data); } },
    async update(data) { merge(docs[name][id], data); },
  });
  const db = {
    collection: name => ({ doc: id => ref(name, id), add: async () => {} }),
    async runTransaction(fn) { return fn({ get: r => r.get(), set: (r, d, o) => r.set(d, o), update: (r, d) => r.update(d) }); },
  };
  const FieldValue = { arrayUnion: (...items) => ({ __arrayUnion: items }), increment: n => n, serverTimestamp: () => "now", delete: () => undefined };
  const admin = { initializeApp() {}, firestore: Object.assign(() => db, { FieldValue }), auth: () => ({ verifyIdToken: async () => identity }), appCheck: () => ({ verifyToken: async () => ({}) }) };
  const wrap = (...args) => args.at(-1);
  const mockRequire = name => name === "firebase-admin" ? admin
    : name === "stripe" ? class {}
    : name.startsWith("firebase-functions/v2/") ? new Proxy({}, { get: () => wrap })
    : name === "firebase-functions/params" ? { defineSecret: () => ({ value: () => "shippo_live_token" }) }
    : require(name);
  const shippoCalls = [];
  const fetch = async (url, init = {}) => {
    shippoCalls.push({ url, method: init.method });
    if (String(url).includes("shipments/sh_1")) return { ok: true, json: async () => ({ rates: [{ object_id: "r1", provider: "Canada Post", amount: "12.00" }] }) };
    if (String(url).includes("transactions/")) {
      if (transaction instanceof Error) throw transaction;
      return { ok: true, json: async () => transaction };
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: mockRequire, process: { env: { APP_CHECK_MODE: "off" } }, Buffer, console, URL, setTimeout, clearTimeout, AbortController, fetch }, { filename: "index.js" });
  const call = async body => {
    const res = { code: 200, body: null, set() {}, status(code) { this.code = code; return this; }, json(b) { this.body = b; return this; }, send(b) { this.body = b; return this; } };
    await module.exports.createShippingLabel({ method: "POST", headers: { authorization: "Bearer t" }, body: { orderId: "A", ...body } }, res);
    return res;
  };
  return { call, docs, ops: () => docs["order-operations"].A, shippoCalls };
}

test("a definite Shippo refusal releases the purchase lock and reports Shippo's reasons", async () => {
  const app = harness({ transaction: { status: "ERROR", messages: [{ text: "Address could not be validated" }, { text: "Parcel too heavy" }] } });
  const res = await app.call({ mode: "purchase", shipmentId: "sh_1", rateId: "r1" });
  expect(res.code).toBe(500);
  expect(res.body.error).toContain("Address could not be validated");
  expect(res.body.error).toContain("Parcel too heavy");
  expect(app.ops().labelPurchasePending).toBe(false);
  expect(app.ops().activity.at(-1).message).toMatch(/Shippo refused the label purchase/);
});

test("a network failure while buying keeps the lock (the label may have been bought)", async () => {
  const app = harness({ transaction: new Error("socket hang up") });
  const res = await app.call({ mode: "purchase", shipmentId: "sh_1", rateId: "r1" });
  expect(res.code).toBe(500);
  expect(app.ops().labelPurchasePending).toBe(true);
});

test("a queued (unconfirmed) Shippo transaction keeps the lock", async () => {
  const app = harness({ transaction: { status: "QUEUED", messages: [] } });
  await app.call({ mode: "purchase", shipmentId: "sh_1", rateId: "r1" });
  expect(app.ops().labelPurchasePending).toBe(true);
});

test("the owner can clear a stuck lock after checking Shippo, and it is recorded", async () => {
  const app = harness({ pending: true });
  const res = await app.call({ mode: "clearPurchaseLock" });
  expect(res.code).toBe(200);
  expect(app.ops().labelPurchasePending).toBe(false);
  expect(app.ops().labelPurchaseClearedBy).toBe(ADMIN.email);
  expect(app.ops().activity.at(-1).message).toMatch(/checked Shippo and allowed a new label purchase/);
  expect(app.shippoCalls).toEqual([]);
});

test("clearing the lock is admin-only and refuses when nothing is pending", async () => {
  const stranger = harness({ pending: true, identity: { email: "someone@example.com", email_verified: true } });
  expect((await stranger.call({ mode: "clearPurchaseLock" })).code).toBe(403);
  expect(stranger.ops().labelPurchasePending).toBe(true);
  const idle = harness();
  expect((await idle.call({ mode: "clearPurchaseLock" })).code).toBe(409);
});

test("shippoTransactionOutcome treats only ERROR as definite", () => {
  expect(shippoTransactionOutcome({ status: "ERROR", messages: [{ text: "bad" }] })).toMatchObject({ definiteFailure: true, reasons: "bad" });
  expect(shippoTransactionOutcome({ status: "WAITING" }).definiteFailure).toBe(false);
  expect(shippoTransactionOutcome(undefined).definiteFailure).toBe(false);
});
