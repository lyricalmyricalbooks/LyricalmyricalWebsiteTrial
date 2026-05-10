/**
 * Firebase Cloud Functions for Lyricalmyrical Books
 *
 *   1. onOrderCreated   →  email customer + admin
 *   2. onOrderShipped   →  email customer with tracking
 *   3. abandonedCartSweep (scheduled)  →  send recovery email after 1h
 *
 * Setup:
 *   1. cd functions && npm install
 *   2. firebase functions:secrets:set RESEND_API_KEY
 *   3. firebase deploy --only functions
 *
 * Add a `from` address that matches a verified domain in Resend.
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();
const db = admin.firestore();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const FROM = "Lyricalmyrical Books <orders@lyricalmyricalbooks.com>";
const ADMIN_TO = "lyricalmyricalbooks@gmail.com";

function moneyFmt(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function orderRowsHtml(items = []) {
  return items
    .map(
      i => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee;">
          ${i.title}${i.variantName ? ` <span style="color:#888;">(${i.variantName})</span>` : ""}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;color:#888;">×${i.quantity}</td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;">${moneyFmt(i.price * i.quantity)}</td>
      </tr>`,
    )
    .join("");
}

async function sendEmail({ to, subject, html, secret }) {
  const resend = new Resend(secret);
  return resend.emails.send({ from: FROM, to, subject, html });
}

// ──────────────────────────────────────────────────────────────
// 1. New order: email customer receipt + notify admin
// ──────────────────────────────────────────────────────────────
exports.onOrderCreated = onDocumentCreated(
  { document: "orders/{orderId}", secrets: [RESEND_API_KEY] },
  async event => {
    const order = event.data?.data();
    if (!order || !order.customer?.email) return;

    const customerHtml = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:32px;color:#111;">
        <h1 style="font-size:18px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:24px;">Thank you for your order</h1>
        <p>Hi ${order.customer.name || "there"},</p>
        <p>Your order <strong>${order.orderId || event.params.orderId}</strong> has been received and is being processed.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          ${orderRowsHtml(order.items)}
          <tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Subtotal</td><td style="text-align:right;">${moneyFmt(order.subtotal)}</td></tr>
          <tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Shipping</td><td style="text-align:right;">${moneyFmt(order.shipping)}</td></tr>
          ${order.discount ? `<tr><td colspan="2" style="padding:8px 0;text-align:right;color:#0a7;">Discount</td><td style="text-align:right;color:#0a7;">−${moneyFmt(order.discount)}</td></tr>` : ""}
          <tr><td colspan="2" style="padding:12px 0;text-align:right;font-weight:bold;">Total</td><td style="text-align:right;font-weight:bold;">${moneyFmt(order.total)}</td></tr>
        </table>
        <p style="color:#888;font-size:12px;">A second email will follow when your order ships.</p>
        <p style="color:#aaa;font-size:11px;margin-top:32px;">Lyricalmyrical Books · Toronto</p>
      </div>`;

    const adminHtml = `
      <p>New order <strong>${order.orderId || event.params.orderId}</strong> · ${moneyFmt(order.total)}</p>
      <p>${order.customer.name} &lt;${order.customer.email}&gt;</p>
      <p>${(order.items || []).length} item(s)</p>`;

    try {
      await sendEmail({
        to: order.customer.email,
        subject: `Order confirmed · ${order.orderId || event.params.orderId}`,
        html: customerHtml,
        secret: RESEND_API_KEY.value(),
      });
      await sendEmail({
        to: ADMIN_TO,
        subject: `[NEW ORDER] ${order.orderId || event.params.orderId}`,
        html: adminHtml,
        secret: RESEND_API_KEY.value(),
      });
    } catch (err) {
      console.error("Email failed", err);
    }
  },
);

// ──────────────────────────────────────────────────────────────
// 2. Order shipped: email customer with tracking
// ──────────────────────────────────────────────────────────────
exports.onOrderShipped = onDocumentUpdated(
  { document: "orders/{orderId}", secrets: [RESEND_API_KEY] },
  async event => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const becameShipped =
      before.fulfillmentStatus !== "shipped" && after.fulfillmentStatus === "shipped";
    if (!becameShipped || !after.customer?.email) return;

    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:32px;color:#111;">
        <h1 style="font-size:18px;letter-spacing:.3em;text-transform:uppercase;">Your order is on its way</h1>
        <p>Order <strong>${after.orderId || event.params.orderId}</strong> shipped via <strong>${after.trackingCarrier || "carrier"}</strong>.</p>
        ${after.trackingNumber ? `<p>Tracking number: <strong>${after.trackingNumber}</strong></p>` : ""}
        <p style="color:#888;font-size:12px;">Estimated delivery 5–7 business days.</p>
      </div>`;

    try {
      await sendEmail({
        to: after.customer.email,
        subject: `Shipped · ${after.orderId || event.params.orderId}`,
        html,
        secret: RESEND_API_KEY.value(),
      });
    } catch (err) {
      console.error("Shipping email failed", err);
    }
  },
);

// ──────────────────────────────────────────────────────────────
// 3. Abandoned cart sweep: every hour, recover carts older than 1h
// ──────────────────────────────────────────────────────────────
exports.abandonedCartSweep = onSchedule(
  { schedule: "every 60 minutes", secrets: [RESEND_API_KEY] },
  async () => {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const snap = await db
      .collection("abandoned-carts")
      .where("recovered", "==", false)
      .where("notified", "!=", true)
      .where("updatedAt", "<", cutoff)
      .get();

    for (const doc of snap.docs) {
      const c = doc.data();
      if (!c.email) continue;
      const html = `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:32px;color:#111;">
          <h1 style="font-size:18px;letter-spacing:.3em;text-transform:uppercase;">You left something behind</h1>
          <p>Your cart at Lyricalmyrical Books is still waiting. Total: <strong>${moneyFmt(c.subtotal)}</strong>.</p>
          <p><a href="https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/checkout" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:11px;letter-spacing:.3em;text-transform:uppercase;">Resume checkout</a></p>
        </div>`;
      try {
        await sendEmail({
          to: c.email,
          subject: "You left something behind",
          html,
          secret: RESEND_API_KEY.value(),
        });
        await doc.ref.update({ notified: true, notifiedAt: new Date().toISOString() });
      } catch (err) {
        console.error("Abandoned cart email failed", err);
      }
    }
  },
);
