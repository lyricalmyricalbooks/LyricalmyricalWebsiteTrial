/**
 * Firebase Cloud Functions for Lyricalmyrical Books
 *
 *   1. createStripeCheckoutSession (HTTP) -> Secure session creation
 *   2. stripeWebhook (HTTP)               -> Secure payment webhook
 *   3. downloadDigitalAsset (HTTP)        -> Secure digital ebook downloads
 *   4. onOrderPaid (Firestore update)     -> Email customer + admin on payment success
 *   5. onOrderShipped (Firestore update)  -> Email customer with tracking
 *   6. abandonedCartSweep (scheduled)     -> Send recovery email after 1h
 */

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

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
// Dynamic Shipping Cost Calculation Helper
// ──────────────────────────────────────────────────────────────
function calculateShipping(items, customerAddress, profiles) {
  const country = (customerAddress.country || "Canada").trim().toLowerCase();
  let highestBase = 0;
  let totalAdditional = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let profile = profiles.find(p => p.id === item.shippingProfileId);
    if (!profile) {
      // Fallback matching logic
      profile = profiles.find(p => p.region.toLowerCase() === country) ||
                profiles.find(p => p.region.toLowerCase() === "international") ||
                profiles.find(p => p.region.toLowerCase() === "everywhere else") ||
                profiles[0];
    }

    const base = Number(profile?.base || 15);
    const additional = Number(profile?.additional || 5);

    if (i === 0) {
      highestBase = base;
      totalAdditional += additional * (item.quantity - 1);
    } else {
      if (base > highestBase) {
        totalAdditional += highestBase;
        highestBase = base;
        totalAdditional += additional * (item.quantity - 1);
      } else {
        totalAdditional += additional * item.quantity;
      }
    }
  }

  return highestBase + totalAdditional;
}

const FALLBACK_RATES = {
  cad: 1.0,
  usd: 0.73,
  eur: 0.67,
};

async function getExchangeRates() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/CAD");
    if (res.ok) {
      const data = await res.json();
      if (data.rates) {
        return {
          cad: 1.0,
          usd: data.rates.USD || FALLBACK_RATES.usd,
          eur: data.rates.EUR || FALLBACK_RATES.eur,
        };
      }
    }
  } catch (err) {
    console.warn("Could not fetch live exchange rates on backend, using static fallbacks:", err);
  }
  return FALLBACK_RATES;
}

// ──────────────────────────────────────────────────────────────
// 1. HTTP Endpoint: Create Stripe Checkout Session (Secure)
// ──────────────────────────────────────────────────────────────
exports.createStripeCheckoutSession = onRequest(
  { secrets: [STRIPE_SECRET_KEY] },
  async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Max-Age", "3600");
      res.status(204).send("");
      return;
    }

    const { orderId, currency: reqCurrency } = req.body;
    const checkoutCurrency = (reqCurrency || "cad").toLowerCase();
    if (!orderId) {
      res.status(400).json({ error: "Missing orderId" });
      return;
    }

    try {
      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const order = orderDoc.data();
      if (order.paymentStatus === "paid" || order.status === "completed") {
        res.status(400).json({ error: "Order has already been paid" });
        return;
      }

      // 1. Verify Inventory levels first
      for (const item of order.items || []) {
        const bookDoc = await db.collection("books").doc(item.id).get();
        if (!bookDoc.exists) {
          res.status(400).json({ error: `Book ${item.title} not found in library catalog.` });
          return;
        }
        const book = bookDoc.data();
        if (book.trackInventory) {
          if (item.variantId) {
            const variant = (book.variants || []).find(v => v.id === item.variantId);
            if (variant && variant.stock < item.quantity) {
              res.status(400).json({ error: `Insufficient stock for ${item.title} (${variant.name}). Only ${variant.stock} left.` });
              return;
            }
          } else {
            if (book.stockLevel < item.quantity) {
              res.status(400).json({ error: `Insufficient stock for ${item.title}. Only ${book.stockLevel} left.` });
              return;
            }
          }
        }
      }

      // 2. Dynamic Shipping Calculation
      const profilesSnap = await db.collection("shipping-profiles").get();
      const profiles = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const itemsWithProfiles = [];
      for (const item of order.items) {
        const bookDoc = await db.collection("books").doc(item.id).get();
        const bookData = bookDoc.data() || {};
        itemsWithProfiles.push({
          ...item,
          shippingProfileId: bookData.shippingProfileId
        });
      }

      const shippingCost = calculateShipping(itemsWithProfiles, order.customer.address, profiles);

      // 3. Dynamic Tax Calculation
      const settingsDoc = await db.collection("settings").doc("website").get();
      const settings = settingsDoc.data() || {};
      const taxRates = settings.taxes?.rates || [];
      const country = (order.customer.address.country || "Canada").trim().toLowerCase();

      const matchedTaxRate = taxRates.find(r => r.country.toLowerCase() === country);
      const taxRatePercent = matchedTaxRate ? Number(matchedTaxRate.rate) : 0;
      const taxCost = (order.subtotal - (order.discount || 0)) * (taxRatePercent / 100);

      // Update Order totals in database
      const finalTotal = order.subtotal - (order.discount || 0) + shippingCost + taxCost;
      
      const rates = await getExchangeRates();
      const exchangeRate = rates[checkoutCurrency] || FALLBACK_RATES[checkoutCurrency] || 1.0;

      await orderRef.update({
        shipping: shippingCost,
        tax: taxCost,
        total: finalTotal,
        checkoutCurrency: checkoutCurrency.toUpperCase(),
        exchangeRate: exchangeRate,
        updatedAt: new Date().toISOString()
      });

      // 4. Stripe checkout parameters
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const subtotal = order.subtotal;
      const discount = order.discount || 0;
      const discountFactor = subtotal > 0 ? (subtotal - discount) / subtotal : 1;

      const lineItems = order.items.map(item => {
        const convertedPrice = item.price * exchangeRate;
        const itemPriceInCents = Math.round(convertedPrice * discountFactor * 100);
        let title = item.title;
        if (item.variantName) {
          title += ` (${item.variantName})`;
        }
        return {
          price_data: {
            currency: checkoutCurrency,
            product_data: {
              name: title,
              images: item.photoUrl ? [item.photoUrl] : [],
            },
            unit_amount: itemPriceInCents,
          },
          quantity: item.quantity,
        };
      });

      if (shippingCost > 0) {
        lineItems.push({
          price_data: {
            currency: checkoutCurrency,
            product_data: {
              name: "Shipping & Handling",
            },
            unit_amount: Math.round(shippingCost * exchangeRate * 100),
          },
          quantity: 1,
        });
      }

      if (taxCost > 0) {
        lineItems.push({
          price_data: {
            currency: checkoutCurrency,
            product_data: {
              name: "Estimated Sales Tax",
            },
            unit_amount: Math.round(taxCost * exchangeRate * 100),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        client_reference_id: orderId,
        customer_email: order.customer.email,
        success_url: `${req.headers.origin || "http://localhost:5173"}/checkout?success=true&order_id=${orderId}`,
        cancel_url: `${req.headers.origin || "http://localhost:5173"}/checkout?canceled=true`,
      });

      res.status(200).json({ sessionId: session.id, url: session.url });
    } catch (err) {
      console.error("Stripe Session Creation Failed:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 2. HTTP Endpoint: Stripe Payment Webhook (Secure)
// ──────────────────────────────────────────────────────────────
exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err) {
      console.error("Signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.client_reference_id;

      if (orderId) {
        try {
          const orderRef = db.collection("orders").doc(orderId);
          await db.runTransaction(async transaction => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) return;
            const order = orderDoc.data();

            if (order.paymentStatus === "paid") {
              return;
            }

            transaction.update(orderRef, {
              paymentStatus: "paid",
              fulfillmentStatus: "paid",
              status: "open",
              updatedAt: new Date().toISOString(),
              activity: [
                ...(order.activity || []),
                { type: "event", message: "Payment completed (Stripe Webhook)", createdAt: new Date().toISOString() }
              ]
            });

            // Atomic Stock Level Decrement
            for (const item of order.items || []) {
              const bookRef = db.collection("books").doc(item.id);
              const bookDoc = await transaction.get(bookRef);
              if (!bookDoc.exists) continue;
              const book = bookDoc.data();

              if (book.trackInventory) {
                if (item.variantId) {
                  const variants = book.variants || [];
                  const updatedVariants = variants.map(v => {
                    if (v.id === item.variantId) {
                      return { ...v, stock: Math.max(0, v.stock - item.quantity) };
                    }
                    return v;
                  });
                  transaction.update(bookRef, {
                    variants: updatedVariants,
                    stockLevel: Math.max(0, (book.stockLevel || 0) - item.quantity),
                    updatedAt: new Date().toISOString()
                  });
                } else {
                  transaction.update(bookRef, {
                    stockLevel: Math.max(0, (book.stockLevel || 0) - item.quantity),
                    updatedAt: new Date().toISOString()
                  });
                }
              }
            }
          });
          console.log(`Order ${orderId} successfully processed via webhook.`);
        } catch (err) {
          console.error("Failed to process order update in transaction:", err);
          res.status(500).send(`Transaction failure: ${err.message}`);
          return;
        }
      }
    }

    res.json({ received: true });
  }
);

// ──────────────────────────────────────────────────────────────
// 3. HTTP Endpoint: Secure Digital Ebook Asset Downloads
// ──────────────────────────────────────────────────────────────
exports.downloadDigitalAsset = onRequest(
  async (req, res) => {
    const { orderId, email, itemId } = req.query;
    if (!orderId || !email || !itemId) {
      res.status(400).send("Missing download parameters");
      return;
    }

    try {
      const orderDoc = await db.collection("orders").doc(orderId).get();
      if (!orderDoc.exists) {
        res.status(404).send("Order not found");
        return;
      }

      const order = orderDoc.data();
      if (order.customer.email.toLowerCase() !== email.toLowerCase()) {
        res.status(403).send("Unauthorized access");
        return;
      }

      if (order.paymentStatus !== "paid") {
        res.status(402).send("Order has not been paid yet");
        return;
      }

      const item = (order.items || []).find(i => i.id === itemId);
      if (!item) {
        res.status(404).send("Item not found in this order");
        return;
      }

      const bookDoc = await db.collection("books").doc(itemId).get();
      if (!bookDoc.exists) {
        res.status(404).send("Product details not found");
        return;
      }

      const book = bookDoc.data();
      if (!book.digitalFileName) {
        res.status(400).send("This publication does not have a digital download configured.");
        return;
      }

      // Generate signed Storage URL expiring in 24 hours
      const bucket = admin.storage().bucket();
      const file = bucket.file(`digital-assets/${book.digitalFileName}`);

      const exists = await file.exists();
      if (!exists[0]) {
        res.status(404).send("Digital asset file not found in storage.");
        return;
      }

      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 24 * 60 * 60 * 1000,
      });

      res.redirect(signedUrl);
    } catch (err) {
      console.error("Download redirection failed:", err);
      res.status(500).send(`Server error: ${err.message}`);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 4. Order Paid: Trigger notifications only AFTER successful payment
// ──────────────────────────────────────────────────────────────
exports.onOrderPaid = onDocumentUpdated(
  { document: "orders/{orderId}", secrets: [RESEND_API_KEY] },
  async event => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};

    const becamePaid = before.paymentStatus !== "paid" && after.paymentStatus === "paid";
    if (!becamePaid || !after.customer?.email) return;

    const order = after;

    // Compile digital items download section if any digital formats exist
    const digitalItems = (order.items || []).filter(item => {
      const format = (item.format || "").toLowerCase();
      return format.includes("e-book") || format.includes("epub") || format.includes("pdf") || format.includes("audiobook");
    });

    let downloadSection = "";
    if (digitalItems.length > 0) {
      downloadSection = `
        <div style="margin-top:28px;padding:24px;background:#f8f6ff;border-radius:16px;border:1px solid #7c3aed20;">
          <h3 style="margin-top:0;font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#7c3aed;">Digital Library Access</h3>
          <p style="font-size:11px;color:#666;margin-bottom:16px;line-height:1.5;">Click the links below to download your digital books. For security, these download links are active for 24 hours.</p>
          <table style="width:100%;font-size:12px;border-collapse:collapse;">
            ${digitalItems.map(item => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #7c3aed10;"><strong>${item.title}</strong></td>
                <td style="padding:8px 0;text-align:right;border-bottom:1px solid #7c3aed10;">
                  <a href="https://us-central1-lyricalmyrical-web-v2.cloudfunctions.net/downloadDigitalAsset?orderId=${order.orderId || event.params.orderId}&email=${encodeURIComponent(order.customer.email)}&itemId=${item.id}" 
                     style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:6px 12px;border-radius:6px;font-size:10px;font-weight:bold;letter-spacing:.05em;text-transform:uppercase;">Download File</a>
                </td>
              </tr>
            `).join("")}
          </table>
        </div>
      `;
    }

    const customerHtml = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:32px;color:#111;">
        <h1 style="font-size:18px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:24px;">Thank you for your order</h1>
        <p>Hi ${order.customer.name || "there"},</p>
        <p>Your payment for order <strong>${order.orderId || event.params.orderId}</strong> has been successfully received and is being processed.</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          ${orderRowsHtml(order.items)}
          <tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Subtotal</td><td style="text-align:right;">${moneyFmt(order.subtotal)}</td></tr>
          <tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Shipping</td><td style="text-align:right;">${moneyFmt(order.shipping)}</td></tr>
          ${order.tax ? `<tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Tax</td><td style="text-align:right;">${moneyFmt(order.tax)}</td></tr>` : ""}
          ${order.discount ? `<tr><td colspan="2" style="padding:8px 0;text-align:right;color:#0a7;">Discount</td><td style="text-align:right;color:#0a7;">−${moneyFmt(order.discount)}</td></tr>` : ""}
          <tr><td colspan="2" style="padding:12px 0;text-align:right;font-weight:bold;">Total</td><td style="text-align:right;font-weight:bold;">${moneyFmt(order.total)}</td></tr>
        </table>
        ${downloadSection}
        <p style="color:#888;font-size:12px;margin-top:24px;">A second email will follow when your physical package ships.</p>
        <p style="color:#aaa;font-size:11px;margin-top:32px;">Lyricalmyrical Books · Toronto</p>
      </div>`;

    const adminHtml = `
      <p>Payment completed for order <strong>${order.orderId || event.params.orderId}</strong> · ${moneyFmt(order.total)}</p>
      <p>${order.customer.name} &lt;${order.customer.email}&gt;</p>
      <p>${(order.items || []).length} item(s)</p>`;

    try {
      await sendEmail({
        to: order.customer.email,
        subject: `Order payment received · ${order.orderId || event.params.orderId}`,
        html: customerHtml,
        secret: RESEND_API_KEY.value(),
      });
      await sendEmail({
        to: ADMIN_TO,
        subject: `[PAYMENT SUCCESS] ${order.orderId || event.params.orderId}`,
        html: adminHtml,
        secret: RESEND_API_KEY.value(),
      });
    } catch (err) {
      console.error("Email failed", err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 5. Order shipped: email customer with tracking
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
// 6. Abandoned cart sweep: every hour, recover carts older than 1h
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
