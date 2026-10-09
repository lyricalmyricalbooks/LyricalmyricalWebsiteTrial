// Email retry queue: an email every sender refused is kept (server-only emailOutbox) and sent
// again on a widening schedule; the admin can see, retry or stop it without ever reading its
// HTML. Bad addresses never send or queue; old delivery rows are pruned.
import { describe, expect, test } from "vitest";
import fs from "fs";
import path from "path";
import vm from "vm";
import { createRequire } from "module";
import { fileURLToPath } from "node:url";

const realRequire = createRequire(import.meta.url);
const outbox = realRequire("./emailOutbox");
const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "index.js"), "utf8");

describe("pure rules", () => {
  test("recipients must be real single-line addresses", () => {
    expect(outbox.cleanRecipients(" reader@example.com ")).toEqual(["reader@example.com"]);
    expect(outbox.cleanRecipients(["a@example.com", "b@example.org"])).toEqual(["a@example.com", "b@example.org"]);
    expect(outbox.cleanRecipients("reader@example.com\r\nBcc: x@evil.test")).toBeNull();
    expect(outbox.cleanRecipients("not-an-address")).toBeNull();
    expect(outbox.cleanRecipients("")).toBeNull();
    expect(outbox.cleanRecipients(undefined)).toBeNull();
  });

  test("subjects and sender names cannot break mail headers", () => {
    expect(outbox.cleanSubject("Hi\r\nBcc: x@evil.test")).toBe("Hi Bcc: x@evil.test");
    expect(outbox.cleanSubject("x".repeat(400))).toHaveLength(250);
    expect(outbox.cleanFromName('Shop "Books" <x>\nBcc')).toBe("Shop Books x Bcc");
    expect(outbox.cleanFromName("")).toBe("Lyricalmyrical Books");
  });

  test("retries widen from 15 minutes and give up after the last try", () => {
    const now = Date.parse("2026-10-09T12:00:00.000Z");
    expect(outbox.nextRetryAt(1, now)).toBe("2026-10-09T12:15:00.000Z");
    expect(outbox.nextRetryAt(2, now)).toBe("2026-10-09T12:30:00.000Z");
    expect(outbox.nextRetryAt(outbox.MAX_ATTEMPTS - 1, now)).toBe("2026-10-10T00:00:00.000Z");
    expect(outbox.nextRetryAt(outbox.MAX_ATTEMPTS, now)).toBeNull();
  });

  test("an entry sends when due and not leased; a given-up one only by hand", () => {
    const now = Date.parse("2026-10-09T12:00:00.000Z");
    const due = { status: "pending", nextAttemptAt: "2026-10-09T11:59:00.000Z" };
    expect(outbox.canSendNow(due, now)).toBe(true);
    expect(outbox.canSendNow({ ...due, nextAttemptAt: "2026-10-09T12:30:00.000Z" }, now)).toBe(false);
    expect(outbox.canSendNow({ ...due, nextAttemptAt: "2026-10-09T12:30:00.000Z" }, now, { force: true })).toBe(true);
    expect(outbox.canSendNow({ ...due, leaseUntil: "2026-10-09T12:05:00.000Z" }, now, { force: true })).toBe(false);
    expect(outbox.canSendNow({ status: "failed", nextAttemptAt: null }, now)).toBe(false);
    expect(outbox.canSendNow({ status: "failed", nextAttemptAt: null }, now, { force: true })).toBe(true);
    expect(outbox.canSendNow(null, now, { force: true })).toBe(false);
  });

  test("only a wrong address counts as permanent", () => {
    expect(outbox.isPermanentEmailError("reader@x is not a valid email address")).toBe(true);
    expect(outbox.isPermanentEmailError("550 5.1.1 Recipient address rejected")).toBe(true);
    expect(outbox.isPermanentEmailError("The Resend API key is missing or invalid.")).toBe(false);
    expect(outbox.isPermanentEmailError("ETIMEDOUT")).toBe(false);
  });

  test("the admin summary never carries the message itself", () => {
    const view = outbox.publicOutboxEntry("abc", { to: ["r@example.com"], subject: "S", html: "<p>GIFT-CODE</p>", attempts: 2, status: "pending" });
    expect(JSON.stringify(view)).not.toContain("GIFT-CODE");
    expect(view).toMatchObject({ id: "abc", to: "r@example.com", attempts: 2, status: "pending" });
  });

  test("a gift-card email always keeps its code; unknown placeholders read as blank", () => {
    expect(outbox.withRequiredPlaceholders("gift_card", "Enjoy!")).toBe("Enjoy!\n\nYour gift card code: {{code}}");
    expect(outbox.withRequiredPlaceholders("gift_card", "Code: {{ code }}")).toBe("Code: {{ code }}");
    expect(outbox.withRequiredPlaceholders("order_confirmation", "Hi")).toBe("Hi");
    expect(outbox.blankUnknownPlaceholders("Order {{order_number}} for {{ name }}")).toBe("Order  for ");
  });
});

function harness({ docs: extra = {}, gmailFails = true, resendFails = true, patch = "" } = {}) {
  const docs = { settings: { website: { payments: {} }, notifications: {} }, adminSecrets: { gmail: { appPassword: "abcd" }, resend: { apiKey: "re_live_key" } }, ...extra };
  const logs = [];
  const delivered = [];
  const state = { gmailFails, resendFails };
  const clone = v => (v === undefined ? v : structuredClone(v));
  const ref = (name, id) => ({
    id,
    path: `${name}/${id}`,
    get ref() { return this; },
    async get() { const data = docs[name]?.[id]; return { id, exists: !!data, data: () => clone(data) }; },
    async set(data, opts) { docs[name] = docs[name] || {}; docs[name][id] = opts?.merge ? { ...(docs[name][id] || {}), ...data } : { ...data }; },
    async update(data) { docs[name][id] = { ...(docs[name][id] || {}), ...data }; },
    async delete() { if (docs[name]) delete docs[name][id]; },
  });
  const matches = (v, op, value) => op === "==" ? v === value : op === "<=" ? typeof v === "string" && v <= value
    : op === "<" ? typeof v === "string" && v < value : op === ">=" ? String(v || "") >= value : op === "in" ? value.includes(v) : true;
  const query = (name, filters = []) => ({
    where: (field, op, value) => query(name, [...filters, { field, op, value }]),
    orderBy: () => query(name, filters),
    limit: () => query(name, filters),
    async get() {
      const rows = Object.entries(docs[name] || {}).filter(([, d]) => filters.every(f => matches(d[f.field], f.op, f.value)))
        .map(([id, data]) => ({ id, ref: ref(name, id), data: () => clone(data) }));
      return { empty: !rows.length, docs: rows, size: rows.length };
    },
  });
  const db = {
    collection: name => ({
      doc: id => ref(name, id),
      add: async data => { if (name === "emailLog") logs.push(data); },
      ...query(name),
    }),
    async runTransaction(fn) { return fn({ get: r => r.get(), set: (r, d, o) => r.set(d, o), update: (r, d) => r.update(d), delete: r => r.delete(), create: (r, d) => r.set(d) }); },
  };
  const admin = {
    initializeApp() {},
    firestore: Object.assign(() => db, { FieldValue: { increment: n => n, arrayUnion: (...x) => x } }),
    auth: () => ({ verifyIdToken: async () => ({ email: "lyricalmyricalbooks@gmail.com", email_verified: true }) }),
  };
  const wrap = (...args) => args.at(-1);
  const nodemailer = { createTransport: () => ({ sendMail: async (m) => { if (state.gmailFails) throw new Error("Invalid login"); delivered.push(m); return { messageId: "gmail-1" }; } }) };
  const Resend = class { constructor() { this.emails = { send: async (m) => { if (state.resendFails) return { data: null, error: { message: "boom" } }; delivered.push(m); return { data: { id: "re-1" }, error: null }; } }; } };
  const mockRequire = name => {
    if (name === "firebase-admin") return admin;
    if (name === "stripe") return class {};
    if (name === "resend") return { Resend };
    if (name === "nodemailer") return nodemailer;
    if (name.startsWith("firebase-functions/v2/")) return new Proxy({}, { get: () => wrap });
    if (name === "firebase-functions/params") return { defineSecret: () => ({ value: () => "fake" }) };
    return realRequire(name);
  };
  const module = { exports: {} };
  vm.runInNewContext(`${source}\nautoApproveShippingAddress = async () => {};
module.exports.__sendEmail = (m) => sendEmail(m);
module.exports.__runOutbox = (now) => runEmailOutbox(now);
module.exports.__compile = (...a) => compileEmailTemplate(...a);
module.exports.__defaults = () => loadNotificationSettings();
${patch}`,
    { module, exports: module.exports, require: mockRequire, process: { env: { APP_CHECK_MODE: "off" } }, Buffer, console, setTimeout, clearTimeout, URL, AbortController, fetch: async () => { throw new Error("no network"); } },
    { filename: "index.js" });
  const call = async (body) => {
    const res = { code: 200, body: null, set() {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, send(b) { this.body = b; return this; } };
    await module.exports.sendTestEmail({ method: "POST", headers: { authorization: "Bearer t" }, body }, res);
    return res;
  };
  return { docs, logs, delivered, state, call, exports: module.exports };
}

const order = (extra = {}) => ({ orderId: "AB-1", customer: { name: "Reader", email: "reader@example.com", address: {} }, items: [{ id: "b", title: "Book", quantity: 1, price: 3 }], total: 3.39, subtotal: 3, shipping: 0, paymentMethod: "Stripe", ...extra });
const updated = (before, after) => ({ data: { before: { data: () => before }, after: { data: () => after } }, params: { orderId: "o1" } });

describe("sending", () => {
  test("a queued kind that every sender refuses is kept for a retry instead of lost", async () => {
    const app = harness();
    const err = await app.exports.__sendEmail({ to: "reader@example.com", subject: "Order confirmed", html: "<p>Hi</p>", queue: "orderConfirmed" }).catch(e => e);
    expect(err.queued).toMatch(/^[a-f0-9]{24}$/);
    const entry = app.docs.emailOutbox[err.queued];
    expect(entry).toMatchObject({ to: ["reader@example.com"], subject: "Order confirmed", html: "<p>Hi</p>", status: "pending", attempts: 1, kind: "orderConfirmed" });
    expect(Date.parse(entry.nextAttemptAt)).toBeGreaterThan(Date.now());
    expect(app.logs.map(l => l.status)).toEqual(["fallback", "queued"]);
    expect(app.logs[1]).toMatchObject({ outboxId: err.queued, kind: "orderConfirmed" });
  });

  test("an unqueued send that fails is only logged as failed", async () => {
    const app = harness();
    await expect(app.exports.__sendEmail({ to: "reader@example.com", subject: "Hi", html: "<p>Hi</p>" })).rejects.toThrow();
    expect(app.docs.emailOutbox).toBeUndefined();
    expect(app.logs.at(-1).status).toBe("failed");
  });

  test("a bad or header-smuggling address is refused before any sender is tried, and never queued", async () => {
    const app = harness({ gmailFails: false, resendFails: false });
    const err = await app.exports.__sendEmail({ to: "reader@example.com\nBcc: x@evil.test", subject: "Hi", html: "<p>Hi</p>", queue: "welcome" }).catch(e => e);
    expect(err.permanent).toBe(true);
    expect(app.delivered).toHaveLength(0);
    expect(app.docs.emailOutbox).toBeUndefined();
    expect(app.logs).toHaveLength(1);
    expect(app.logs[0]).toMatchObject({ status: "failed", permanent: true });
    expect(app.logs[0].to).not.toMatch(/\n/);
  });

  test("a newline in the subject never reaches the mail headers", async () => {
    const app = harness({ gmailFails: false });
    await app.exports.__sendEmail({ to: "reader@example.com", subject: "Hi\r\nBcc: x@evil.test", html: "<p>Hi</p>" });
    expect(app.delivered[0].subject).toBe("Hi Bcc: x@evil.test");
  });

  test("a queued order email keeps its claim, so a re-run trigger neither resends nor queues it twice", async () => {
    const app = harness();
    const event = updated(order({ paymentStatus: "unpaid" }), order({ paymentStatus: "paid" }));
    await app.exports.onOrderUpdated(event);
    await app.exports.onOrderUpdated(event);
    const entries = Object.values(app.docs.emailOutbox);
    expect(entries.map(e => e.kind).sort()).toEqual(["orderConfirmed", "shopNewOrder"]);
    expect(app.docs["email-claims"].o1_orderConfirmed.queuedAs).toBeTruthy();
    expect(entries.find(e => e.kind === "orderConfirmed").claimId).toBe("o1_orderConfirmed");
  });
});

describe("the retry sweep", () => {
  const pending = (extra = {}) => ({ to: ["reader@example.com"], subject: "Order confirmed", html: "<p>Hi</p>", kind: "orderConfirmed", status: "pending", attempts: 1,
    createdAt: "2026-10-09T10:00:00.000Z", nextAttemptAt: new Date(Date.now() - 60_000).toISOString(), leaseUntil: null, ...extra });
  const ID = "a".repeat(24);

  test("sends a due email once the sender works again and clears it from the queue", async () => {
    const app = harness({ gmailFails: false, docs: { emailOutbox: { [ID]: pending({ claimId: "o1_orderConfirmed" }) }, "email-claims": { o1_orderConfirmed: { queuedAs: ID } } } });
    const result = await app.exports.__runOutbox();
    expect(result).toMatchObject({ tried: 1, sent: 1 });
    expect(app.delivered).toHaveLength(1);
    expect(app.docs.emailOutbox[ID]).toBeUndefined();
    expect(app.logs.at(-1)).toMatchObject({ status: "sent", outboxId: ID, attempt: 2 });
    expect(app.docs["email-claims"].o1_orderConfirmed.sentAt).toBeTruthy();
  });

  test("leaves emails that aren't due yet alone", async () => {
    const app = harness({ gmailFails: false, docs: { emailOutbox: { [ID]: pending({ nextAttemptAt: new Date(Date.now() + 600_000).toISOString() }) } } });
    expect((await app.exports.__runOutbox()).tried).toBe(0);
    expect(app.delivered).toHaveLength(0);
  });

  test("a failed retry waits longer; the last one gives up and says so", async () => {
    const app = harness({ docs: { emailOutbox: { [ID]: pending() } } });
    await app.exports.__runOutbox();
    expect(app.docs.emailOutbox[ID]).toMatchObject({ attempts: 2, status: "pending", leaseUntil: null });
    expect(Date.parse(app.docs.emailOutbox[ID].nextAttemptAt) - Date.now()).toBeGreaterThan(25 * 60_000);
    expect(app.logs.at(-1)).toMatchObject({ status: "queued", attempt: 2 });

    app.docs.emailOutbox[ID] = { ...app.docs.emailOutbox[ID], attempts: outbox.MAX_ATTEMPTS - 1, nextAttemptAt: new Date(Date.now() - 1000).toISOString() };
    await app.exports.__runOutbox();
    expect(app.docs.emailOutbox[ID]).toMatchObject({ status: "failed", nextAttemptAt: null });
    expect(app.docs.emailOutbox[ID].gaveUpAt).toBeTruthy();
    expect(app.logs.at(-1).status).toBe("failed");
    expect(app.logs.at(-1).error).toMatch(/Gave up after/);
  });

  test("a leased entry (another run is sending it) is skipped", async () => {
    const app = harness({ gmailFails: false, docs: { emailOutbox: { [ID]: pending({ leaseUntil: new Date(Date.now() + 300_000).toISOString() }) } } });
    await app.exports.__runOutbox();
    expect(app.delivered).toHaveLength(0);
  });

  test("delivery rows older than 90 days and given-up entries older than 30 days are removed", async () => {
    const old = new Date(Date.now() - 100 * 86400_000).toISOString();
    const recent = new Date().toISOString();
    const app = harness({ docs: {
      emailLog: { a: { at: old, to: "x@example.com" }, b: { at: recent, to: "y@example.com" } },
      emailOutbox: { [ID]: pending({ status: "failed", nextAttemptAt: null, gaveUpAt: old }), ["b".repeat(24)]: pending({ status: "failed", nextAttemptAt: null, gaveUpAt: recent }) },
    } });
    const result = await app.exports.__runOutbox();
    expect(result).toMatchObject({ prunedLog: 1, prunedOutbox: 1 });
    expect(Object.keys(app.docs.emailLog)).toEqual(["b"]);
    expect(Object.keys(app.docs.emailOutbox)).toEqual(["b".repeat(24)]);
  });
});

describe("admin actions (Settings › Notifications)", () => {
  const ID = "c".repeat(24);
  const entry = (extra = {}) => ({ to: ["reader@example.com"], subject: "Your gift card", html: "<p>CODE-1234</p>", kind: "giftCard", status: "failed", attempts: 8, nextAttemptAt: null, createdAt: "2026-10-09T10:00:00.000Z", ...extra });

  test("lists the queue without the message bodies", async () => {
    const app = harness({ docs: { emailOutbox: { [ID]: entry() } } });
    const res = await app.call({ action: "emailQueue" });
    expect(res.code).toBe(200);
    expect(res.body.entries).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toContain("CODE-1234");
  });

  test("Retry now sends even a given-up email; Stop removes one and records it", async () => {
    const app = harness({ gmailFails: false, docs: { emailOutbox: { [ID]: entry(), ["d".repeat(24)]: entry({ status: "pending" }) } } });
    expect((await app.call({ action: "retryEmail", id: ID })).body).toMatchObject({ status: "sent" });
    expect(app.docs.emailOutbox[ID]).toBeUndefined();
    expect((await app.call({ action: "retryEmail", id: ID })).code).toBe(409);
    const stop = await app.call({ action: "cancelEmail", id: "d".repeat(24) });
    expect(stop.body).toMatchObject({ status: "cancelled" });
    expect(app.logs.at(-1)).toMatchObject({ status: "cancelled" });
    expect((await app.call({ action: "cancelEmail", id: "../x" })).code).toBe(400);
  });

  test("Send test uses unsaved edits and brand, and refuses unknown templates or addresses", async () => {
    const app = harness({ gmailFails: false });
    const res = await app.call({ templateId: "order_confirmation", email: "owner@example.com",
      template: { subject: "Draft subject {{order_id}}", body: "Draft body for {{customer_name}} {{typo}}" }, brand: { brandColor: "#123456", logoUrl: "javascript:alert(1)" } });
    expect(res.code).toBe(200);
    expect(app.delivered[0].subject).toBe("[TEST] Draft subject LM-98241");
    expect(app.delivered[0].html).toContain("Draft body for Julianne Smith");
    expect(app.delivered[0].html).not.toContain("{{typo}}");
    expect(app.delivered[0].html).toContain("#123456");
    expect(app.delivered[0].html).not.toContain("javascript:");
    expect((await app.call({ templateId: "brand", email: "owner@example.com" })).code).toBe(400);
    expect((await app.call({ templateId: "__proto__", email: "owner@example.com" })).code).toBe(400);
    expect((await app.call({ templateId: "order_confirmation", email: "a@b.com\nBcc: c@d.com" })).code).toBe(400);
  });
});

test("templates: spaced placeholders fill, button links must be web links, the gift-card code survives an edit", async () => {
  const app = harness();
  const settings = await app.exports.__defaults();
  settings.gift_card = { ...settings.gift_card, body: "Hi {{ recipient_name }}, enjoy!" };
  const gift = app.exports.__compile("gift_card", settings, { recipient_name: "Sam", code: "ABCD-EFGH", button_url: "javascript:alert(1)" });
  expect(gift.html).toContain("Hi Sam, enjoy!");
  expect(gift.html).toContain("ABCD-EFGH");
  expect(gift.html).not.toContain("javascript:");
  const ok = app.exports.__compile("order_cancelled", { ...settings, order_cancelled: { ...settings.order_cancelled, buttonText: "View" } }, { customer_name: "R", order_id: "1", button_url: 'https://shop.test/track?a=1&b="x"' });
  expect(ok.html).toContain('href="https://shop.test/track?a=1&amp;b=&quot;x&quot;"');
});
