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

const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { Resend } = require("resend");
const Stripe = require("stripe");
const { matchShippingZone } = require("./shippingGeo");

admin.initializeApp();
const db = admin.firestore();

const IS_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";

const ADMIN_EMAILS = ["lyricalmyricalbooks@gmail.com"];

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4000",
  "https://lyricalmyricalbooks.github.io",
  "https://lyricalmyricalbooks.com",
  "https://www.lyricalmyricalbooks.com",
];

// Returns true when the request was an OPTIONS preflight (already answered).
function applyCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return true;
  }
  return false;
}

// Verifies the Firebase ID token in the Authorization header and that it
// belongs to an admin. Sends the error response itself; returns null on failure.
async function requireAdmin(req, res) {
  const match = (req.headers.authorization || "").match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ error: "Missing Authorization token" });
    return null;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    if (!ADMIN_EMAILS.includes(decoded.email) || decoded.email_verified !== true) {
      res.status(403).json({ error: "Admin access required" });
      return null;
    }
    return decoded;
  } catch (err) {
    res.status(401).json({ error: "Invalid Authorization token" });
    return null;
  }
}

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");
const PAYPAL_WEBHOOK_ID = defineSecret("PAYPAL_WEBHOOK_ID");
const SHIPPO_API_TOKEN = defineSecret("SHIPPO_API_TOKEN");
const SHIPPO_CONFIG_DOC = db.collection("private-integrations").doc("shippo");

async function getShippoToken() {
  const configDoc = await SHIPPO_CONFIG_DOC.get();
  const savedToken = configDoc.exists ? configDoc.data()?.apiToken : null;
  if (typeof savedToken === "string" && savedToken.trim()) {
    const trimmed = savedToken.trim();
    return trimmed !== "dummy_value" && trimmed !== "your_shippo_api_token" ? trimmed : null;
  }

  try {
    const secretToken = SHIPPO_API_TOKEN.value();
    return secretToken && secretToken !== "your_shippo_api_token" && secretToken !== "dummy_value" ? secretToken : null;
  } catch (err) {
    console.warn("SHIPPO_API_TOKEN secret not configured.");
    return null;
  }
}

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
// Shippo API Normalizers & Helpers
// ──────────────────────────────────────────────────────────────
const US_STATES = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY"
};

const CA_PROVINCES = {
  "ontario": "ON", "quebec": "QC", "nova scotia": "NS", "new brunswick": "NB", "manitoba": "MB", "british columbia": "BC", "prince edward island": "PE", "saskatchewan": "SK", "alberta": "AB", "newfoundland and labrador": "NL", "newfoundland": "NL", "labrador": "NL", "northwest territories": "NT", "yukon": "YT", "nunavut": "NU"
};

function getCountryCode(countryName) {
  const clean = (countryName || "").trim().toLowerCase();
  if (clean === "united states" || clean === "us" || clean === "usa" || clean === "united states of america") {
    return "US";
  }
  if (clean === "canada" || clean === "ca") {
    return "CA";
  }
  if (clean.length === 2) {
    return clean.toUpperCase();
  }
  return "US"; // default fallback
}

function getStateCode(stateName) {
  const clean = (stateName || "").trim().toLowerCase();
  if (clean.length === 2) {
    return clean.toUpperCase();
  }
  return US_STATES[clean] || CA_PROVINCES[clean] || stateName.toUpperCase();
}

async function callShippo(endpoint, method, body, token) {
  const headers = {
    "Authorization": `ShippoToken ${token}`,
    "Content-Type": "application/json"
  };
  const res = await fetch(`https://api.goshippo.com/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Shippo API error: ${res.status} - ${errorText}`);
  }
  return await res.json();
}

// ──────────────────────────────────────────────────────────────
// Dynamic Shipping Cost Calculation Helper
// ──────────────────────────────────────────────────────────────
function calculateShipping(items, customerAddress, profiles) {
  const country = customerAddress.country || "Canada";
  let highestBase = 0;
  let totalAdditional = 0;

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

  // Geography-aware zone for this destination: explicit country > continent >
  // legacy region name > rest-of-world. Per-item shippingProfileId still wins.
  const zoneForCountry = matchShippingZone(country, profiles) || profiles[0];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let profile = profiles.find(p => p.id === item.shippingProfileId) || zoneForCountry;

    const freeThreshold = profile?.freeThreshold ? Number(profile.freeThreshold) : 0;
    let base = Number(profile?.base || 15);
    let additional = Number(profile?.additional || 5);

    if (freeThreshold > 0 && subtotal >= freeThreshold) {
      base = 0;
      additional = 0;
    }

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

// Region-aware tax matching: prefer a rate whose region matches the
// destination state/province, otherwise fall back to the country-wide rate.
function matchTaxRate(rates, country, state) {
  const c = (country || "").trim().toLowerCase();
  const countryRates = (rates || []).filter(
    r => (r.country || "").trim().toLowerCase() === c
  );
  if (countryRates.length === 0) return null;
  const stateCode = getStateCode(state || "");
  const regional = countryRates.find(r => {
    const region = (r.region || "").trim();
    return region && getStateCode(region) === stateCode;
  });
  return regional || countryRates.find(r => !r.region) || null;
}

// Loads a discount by code and enforces active / expiry / usage limits.
// Throws with a customer-readable message when the code cannot be used.
async function fetchValidDiscount(code) {
  const snap = await db
    .collection("discounts")
    .where("code", "==", String(code || "").toUpperCase())
    .limit(1)
    .get();
  if (snap.empty) throw new Error("Invalid or expired discount code");
  const docSnap = snap.docs[0];
  const data = docSnap.data();
  const isActive = data.isActive ?? data.active ?? true;
  if (!isActive) throw new Error("This code is not currently active");
  const expiry = data.expiryDate || data.expiry;
  if (expiry && expiry < new Date().toISOString()) throw new Error("This code has expired");
  if (data.usageLimit && (data.usageCount || 0) >= data.usageLimit) {
    throw new Error("This code has reached its usage limit");
  }
  return { id: docSnap.id, ...data };
}

// Computes the discount amount from server-trusted item prices.
// booksById maps item.id -> book data (for category targeting).
function computeDiscountAmount(discount, items, booksById) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (discount.minOrderAmount && subtotal < Number(discount.minOrderAmount)) {
    throw new Error(`This code requires a minimum order of ${moneyFmt(discount.minOrderAmount)}.`);
  }
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  if (discount.minQuantity && totalQty < Number(discount.minQuantity)) {
    throw new Error(`This code requires a minimum of ${discount.minQuantity} items.`);
  }

  let qualifying = subtotal;
  if (discount.appliesTo === "categories") {
    const selected = discount.selectedCategories || [];
    qualifying = items.reduce((s, i) => {
      const cats = (booksById[i.id] && booksById[i.id].categories) || [];
      return cats.some(c => selected.includes(c)) ? s + i.price * i.quantity : s;
    }, 0);
    if (qualifying === 0) throw new Error("This code only applies to specific categories not in your cart.");
  } else if (discount.appliesTo === "products") {
    const selected = discount.selectedProducts || [];
    qualifying = items.reduce(
      (s, i) => (selected.includes(i.id) ? s + i.price * i.quantity : s), 0
    );
    if (qualifying === 0) throw new Error("This code only applies to specific products not in your cart.");
  }

  if (discount.type === "percentage") return qualifying * (Number(discount.value) / 100);
  if (discount.type === "fixed") return Math.min(Number(discount.value), qualifying);
  return 0; // "freeship" is applied to the shipping line instead
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
// PayPal Orders API helpers
// ──────────────────────────────────────────────────────────────
function paypalBaseUrl(testMode) {
  return testMode ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

async function getPayPalConfig() {
  const settingsDoc = await db.collection("settings").doc("website").get();
  const settings = settingsDoc.data() || {};
  return {
    settings,
    testMode: Boolean(settings.payments?.testMode),
    clientId: PAYPAL_CLIENT_ID.value(),
    clientSecret: PAYPAL_CLIENT_SECRET.value(),
  };
}

async function getPayPalAccessToken(config) {
  if (!config.clientId || !config.clientSecret) throw new Error("PayPal credentials are not configured.");
  const response = await fetch(`${paypalBaseUrl(config.testMode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || "PayPal authentication failed.");
  return data.access_token;
}

async function paypalRequest(config, path, options = {}) {
  const accessToken = await getPayPalAccessToken(config);
  const response = await fetch(`${paypalBaseUrl(config.testMode)}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.details?.[0]?.description || data.message || "PayPal request failed.";
    throw new Error(detail);
  }
  return data;
}

async function recalculateOrder(orderRef, order, checkoutCurrency) {
  const booksById = {};
  const items = [];
  for (const requested of order.items || []) {
    const bookDoc = await db.collection("books").doc(requested.id).get();
    if (!bookDoc.exists) throw new Error(`Book ${requested.title || requested.id} not found in library catalog.`);
    const book = bookDoc.data();
    booksById[requested.id] = book;
    const quantity = Math.max(1, Math.min(99, Math.floor(Number(requested.quantity) || 1)));
    const variant = requested.variantId
      ? (book.variants || []).find(v => v.id === requested.variantId) || null
      : null;
    if (book.trackInventory) {
      const available = variant ? Number(variant.stock || 0) : Number(book.stockLevel || 0);
      if (available < quantity) throw new Error(`Insufficient stock for ${requested.title}. Only ${available} left.`);
    }
    const price = variant
      ? Number(variant.price)
      : (book.isOnSale && book.salePrice ? Number(book.salePrice) : Number(book.retailPrice));
    items.push({ ...requested, quantity, price, shippingProfileId: book.shippingProfileId || null });
  }
  if (!items.length) throw new Error("Order has no items.");

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discount = 0;
  let appliedDiscount = null;
  if (order.appliedDiscount?.code) {
    const verified = await fetchValidDiscount(order.appliedDiscount.code);
    discount = computeDiscountAmount(verified, items, booksById);
    appliedDiscount = { id: verified.id, code: verified.code, type: verified.type, value: verified.value };
  }
  const profilesSnap = await db.collection("shipping-profiles").get();
  const profiles = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  let shipping = calculateShipping(items, order.customer.address, profiles);
  if (appliedDiscount?.type === "freeship") shipping = 0;

  const settingsDoc = await db.collection("settings").doc("website").get();
  const settings = settingsDoc.data() || {};
  const taxRate = matchTaxRate(settings.taxes?.rates || [], order.customer.address.country, order.customer.address.state);
  const tax = (subtotal - discount) * (Number(taxRate?.rate || 0) / 100);
  const total = subtotal - discount + shipping + tax;
  const rates = await getExchangeRates();
  const exchangeRate = rates[checkoutCurrency] || FALLBACK_RATES[checkoutCurrency] || 1;
  const convertedTotal = Math.round(total * exchangeRate * 100) / 100;
  const update = {
    items: items.map(({ shippingProfileId, ...item }) => item), subtotal, discount, appliedDiscount,
    shipping, tax, total, checkoutCurrency: checkoutCurrency.toUpperCase(), exchangeRate,
    updatedAt: new Date().toISOString(),
  };
  await orderRef.update(update);
  return { ...update, convertedTotal, settings };
}

async function markOrderPaidFromPayPal(orderId, paypalData) {
  const orderRef = db.collection("orders").doc(orderId);
  let paidTotal = null;
  await db.runTransaction(async transaction => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) throw new Error("Order not found.");
    const order = orderDoc.data();
    if (order.paymentStatus === "paid") return;
    if (order.paypalOrderId !== paypalData.paypalOrderId) throw new Error("PayPal order does not match checkout order.");

    const bookRefs = (order.items || []).map(item => db.collection("books").doc(item.id));
    const bookDocs = await Promise.all(bookRefs.map(ref => transaction.get(ref)));
    let discountRef = null;
    let discountDoc = null;
    if (order.appliedDiscount?.id) {
      discountRef = db.collection("discounts").doc(order.appliedDiscount.id);
      discountDoc = await transaction.get(discountRef);
    }
    const now = new Date().toISOString();
    transaction.update(orderRef, {
      paymentStatus: "paid", fulfillmentStatus: "paid", status: "open",
      paidAt: now, updatedAt: now, downloadToken: crypto.randomBytes(32).toString("hex"),
      paypalCaptureId: paypalData.captureId || null,
      paypalPayerId: paypalData.payerId || null,
      paypalTransactionId: paypalData.transactionId || paypalData.captureId || null,
      paypalCaptureStatus: paypalData.captureStatus || "COMPLETED",
      paypalCapture: paypalData.capture || null,
      activity: [...(order.activity || []), { type: "event", message: "Payment completed (verified PayPal capture)", createdAt: now }],
    });
    (order.items || []).forEach((item, index) => {
      const bookDoc = bookDocs[index];
      if (!bookDoc.exists || !bookDoc.data().trackInventory) return;
      const book = bookDoc.data();
      if (item.variantId) {
        const variants = (book.variants || []).map(v => v.id === item.variantId
          ? { ...v, stock: Math.max(0, Number(v.stock || 0) - item.quantity) } : v);
        transaction.update(bookRefs[index], { variants, stockLevel: Math.max(0, Number(book.stockLevel || 0) - item.quantity), updatedAt: now });
      } else {
        transaction.update(bookRefs[index], { stockLevel: Math.max(0, Number(book.stockLevel || 0) - item.quantity), updatedAt: now });
      }
    });
    if (discountRef && discountDoc?.exists) {
      transaction.update(discountRef, { usageCount: (discountDoc.data().usageCount || 0) + 1, updatedAt: now });
    }
    paidTotal = Number(order.total) || 0;
  });
  if (paidTotal !== null) {
    const today = new Date().toISOString().split("T")[0];
    await db.collection("analytics").doc(today).set({
      date: today,
      orders: admin.firestore.FieldValue.increment(1),
      revenue: admin.firestore.FieldValue.increment(paidTotal),
    }, { merge: true });
  }
}

exports.createPayPalOrder = onRequest(
  { secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET] },
  async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    try {
      const { orderId, currency: requestedCurrency, returnUrl } = req.body || {};
      if (!orderId) return res.status(400).json({ error: "Missing orderId" });
      const currency = String(requestedCurrency || "cad").toLowerCase();
      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) return res.status(404).json({ error: "Order not found" });
      const order = orderDoc.data();
      if (order.paymentStatus === "paid") return res.status(409).json({ error: "Order is already paid" });
      const priced = await recalculateOrder(orderRef, order, currency);
      const config = await getPayPalConfig();
      let checkoutBase = `${req.headers.origin || "http://localhost:5173"}/checkout`;
      if (typeof returnUrl === "string" && ALLOWED_ORIGINS.some(origin => returnUrl === origin || returnUrl.startsWith(`${origin}/`))) checkoutBase = returnUrl;
      const joiner = checkoutBase.includes("?") ? "&" : "?";
      const paypalOrder = await paypalRequest(config, "/v2/checkout/orders", {
        method: "POST",
        headers: { "PayPal-Request-Id": `create-${orderId}` },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: orderId,
            custom_id: orderId,
            invoice_id: orderId,
            amount: { currency_code: currency.toUpperCase(), value: priced.convertedTotal.toFixed(2) },
          }],
          payment_source: { paypal: { experience_context: {
            user_action: "PAY_NOW",
            return_url: `${checkoutBase}${joiner}paypal_return=true&order_id=${encodeURIComponent(orderId)}`,
            cancel_url: `${checkoutBase}${joiner}canceled=true&order_id=${encodeURIComponent(orderId)}`,
          } } },
        }),
      });
      const approvalUrl = paypalOrder.links?.find(link => link.rel === "payer-action" || link.rel === "approve")?.href;
      await orderRef.update({
        paymentMethod: "PayPal", paypalOrderId: paypalOrder.id, paypalOrderStatus: paypalOrder.status,
        paypalCurrency: currency.toUpperCase(), updatedAt: new Date().toISOString(),
      });
      res.json({ orderToken: paypalOrder.id, approvalUrl });
    } catch (err) {
      console.error("PayPal order creation failed:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

exports.capturePayPalOrder = onRequest(
  { secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET] },
  async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    try {
      const { orderId, paypalOrderId } = req.body || {};
      if (!orderId || !paypalOrderId) return res.status(400).json({ error: "Missing order identifiers" });
      const orderDoc = await db.collection("orders").doc(orderId).get();
      if (!orderDoc.exists || orderDoc.data().paypalOrderId !== paypalOrderId) return res.status(400).json({ error: "PayPal order mismatch" });
      if (orderDoc.data().paymentStatus === "paid") return res.json({ paid: true });
      const config = await getPayPalConfig();
      const captured = await paypalRequest(config, `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
        method: "POST", headers: { "PayPal-Request-Id": `capture-${orderId}` }, body: "{}",
      });
      const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];
      if (captured.status !== "COMPLETED" || capture?.status !== "COMPLETED") throw new Error("PayPal capture has not completed.");
      await markOrderPaidFromPayPal(orderId, {
        paypalOrderId, captureId: capture.id, transactionId: capture.id,
        payerId: captured.payer?.payer_id || null, captureStatus: capture.status, capture,
      });
      res.json({ paid: true });
    } catch (err) {
      console.error("PayPal capture failed:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

exports.paypalWebhook = onRequest(
  { secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID] },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    try {
      const config = await getPayPalConfig();
      const verification = await paypalRequest(config, "/v1/notifications/verify-webhook-signature", {
        method: "POST",
        body: JSON.stringify({
          auth_algo: req.headers["paypal-auth-algo"], cert_url: req.headers["paypal-cert-url"],
          transmission_id: req.headers["paypal-transmission-id"], transmission_sig: req.headers["paypal-transmission-sig"],
          transmission_time: req.headers["paypal-transmission-time"], webhook_id: PAYPAL_WEBHOOK_ID.value(),
          webhook_event: req.body,
        }),
      });
      if (verification.verification_status !== "SUCCESS") return res.status(400).send("Invalid PayPal webhook signature");
      const eventRef = db.collection("payment-webhook-events").doc(`paypal-${req.body.id}`);
      if ((await eventRef.get()).exists) return res.json({ received: true, duplicate: true });
      if (req.body.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        const capture = req.body.resource;
        const orderId = capture.custom_id || capture.invoice_id;
        const paypalOrderId = capture.supplementary_data?.related_ids?.order_id;
        if (orderId && paypalOrderId) await markOrderPaidFromPayPal(orderId, {
          paypalOrderId, captureId: capture.id, transactionId: capture.id,
          payerId: capture.supplementary_data?.related_ids?.payer_id || null,
          captureStatus: capture.status, capture,
        });
      }
      await eventRef.set({ eventType: req.body.event_type, paypalEventId: req.body.id, processedAt: new Date().toISOString() });
      res.json({ received: true });
    } catch (err) {
      console.error("PayPal webhook failed:", err);
      res.status(500).send(err.message);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 1. HTTP Endpoint: Create Stripe Checkout Session (Secure)
// ──────────────────────────────────────────────────────────────
exports.createStripeCheckoutSession = onRequest(
  { secrets: [STRIPE_SECRET_KEY] },
  async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { orderId, currency: reqCurrency, returnUrl } = req.body;
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

      // 1. Load each book once: inventory check + authoritative pricing +
      //    shipping profile. Client-supplied prices are never trusted.
      const booksById = {};
      const items = [];
      for (const item of order.items || []) {
        const bookDoc = await db.collection("books").doc(item.id).get();
        if (!bookDoc.exists) {
          res.status(400).json({ error: `Book ${item.title} not found in library catalog.` });
          return;
        }
        const book = bookDoc.data();
        booksById[item.id] = book;

        let variant = null;
        if (item.variantId) {
          variant = (book.variants || []).find(v => v.id === item.variantId) || null;
        }
        if (book.trackInventory) {
          if (variant) {
            if (variant.stock < item.quantity) {
              res.status(400).json({ error: `Insufficient stock for ${item.title} (${variant.name}). Only ${variant.stock} left.` });
              return;
            }
          } else if (book.stockLevel < item.quantity) {
            res.status(400).json({ error: `Insufficient stock for ${item.title}. Only ${book.stockLevel} left.` });
            return;
          }
        }

        const unitPrice = variant
          ? Number(variant.price)
          : (book.isOnSale && book.salePrice ? Number(book.salePrice) : Number(book.retailPrice));
        items.push({
          ...item,
          price: unitPrice,
          quantity: Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1))),
          shippingProfileId: book.shippingProfileId || null,
        });
      }

      const subtotalTrusted = items.reduce((s, i) => s + i.price * i.quantity, 0);

      // 2. Server-side discount validation (codes, limits, targeting)
      let discountAmount = 0;
      let appliedDiscount = null;
      if (order.appliedDiscount && order.appliedDiscount.code) {
        let discount;
        try {
          discount = await fetchValidDiscount(order.appliedDiscount.code);
          discountAmount = computeDiscountAmount(discount, items, booksById);
        } catch (discountErr) {
          res.status(400).json({ error: `Discount code error: ${discountErr.message}` });
          return;
        }
        appliedDiscount = {
          id: discount.id,
          code: discount.code,
          type: discount.type,
          value: discount.value,
        };
      }

      // 3. Dynamic Shipping Calculation (free when a freeship code applies)
      const profilesSnap = await db.collection("shipping-profiles").get();
      const profiles = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      let shippingCost = calculateShipping(items, order.customer.address, profiles);
      if (appliedDiscount && appliedDiscount.type === "freeship") {
        shippingCost = 0;
      }

      // 4. Dynamic Tax Calculation (region-aware: state/province before country)
      const settingsDoc = await db.collection("settings").doc("website").get();
      const settings = settingsDoc.data() || {};
      const taxRates = settings.taxes?.rates || [];
      const matchedTaxRate = matchTaxRate(
        taxRates,
        order.customer.address.country || "Canada",
        order.customer.address.state || ""
      );
      const taxRatePercent = matchedTaxRate ? Number(matchedTaxRate.rate) : 0;
      const taxCost = (subtotalTrusted - discountAmount) * (taxRatePercent / 100);

      const finalTotal = subtotalTrusted - discountAmount + shippingCost + taxCost;
      const rates = await getExchangeRates();
      const exchangeRate = rates[checkoutCurrency] || FALLBACK_RATES[checkoutCurrency] || 1.0;

      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      let ipCountry = req.headers["x-appengine-country"] || "";
      if (!ipCountry && clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
        try {
          const firstIp = clientIp.split(",")[0].trim();
          const ipRes = await fetch(`http://ip-api.com/json/${firstIp}`);
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData.countryCode) {
              ipCountry = ipData.countryCode;
            }
          }
        } catch (ipErr) {
          console.warn("Could not geolocate IP on backend:", ipErr);
        }
      }

      const shippingCountryCode = getCountryCode(order.customer.address.country);
      const ipCountryMatchesShipping = !ipCountry || ipCountry.toUpperCase() === shippingCountryCode.toUpperCase();

      await orderRef.update({
        items: items.map(({ shippingProfileId, ...rest }) => rest),
        subtotal: subtotalTrusted,
        discount: discountAmount,
        appliedDiscount: appliedDiscount,
        shipping: shippingCost,
        tax: taxCost,
        total: finalTotal,
        checkoutCurrency: checkoutCurrency.toUpperCase(),
        exchangeRate: exchangeRate,
        clientIp: clientIp,
        ipCountry: ipCountry || null,
        ipCountryMatchesShipping: ipCountryMatchesShipping,
        updatedAt: new Date().toISOString()
      });

      // 5. Stripe checkout parameters
      const testMode = settings.payments?.testMode || false;
      const stripeSettings = settings.payments?.stripe || {};
      const stripeSecret = testMode 
        ? stripeSettings.testSecretKey 
        : (stripeSettings.secretKey || STRIPE_SECRET_KEY.value());

      if (!stripeSecret) {
        throw new Error(testMode 
          ? "Stripe Test Secret Key is not configured in settings." 
          : "Stripe Secret Key is not configured.");
      }

      const stripe = new Stripe(stripeSecret);
      const subtotal = subtotalTrusted;
      const discount = discountAmount;
      const discountFactor = subtotal > 0 ? (subtotal - discount) / subtotal : 1;

      const lineItems = items.map(item => {
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

      // The storefront passes its own checkout URL (it may live under a
      // sub-path, e.g. GitHub Pages). Only accept it if it belongs to an
      // allowed origin; otherwise fall back to origin + /checkout.
      let checkoutBase = `${req.headers.origin || "http://localhost:5173"}/checkout`;
      if (
        typeof returnUrl === "string" &&
        ALLOWED_ORIGINS.some(o => returnUrl === o || returnUrl.startsWith(`${o}/`))
      ) {
        checkoutBase = returnUrl;
      }
      const joiner = checkoutBase.includes("?") ? "&" : "?";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        client_reference_id: orderId,
        customer_email: order.customer.email,
        // Apple Pay and Google Pay are rendered by Stripe Checkout as
        // card wallets when the customer's device/browser is eligible and
        // the storefront domain is registered in Stripe. Keeping the method
        // type as `card` avoids a second, conflicting wallet selector here.
        payment_intent_data: {
          metadata: { order_id: orderId },
        },
        // Shorten the unpaid-stock-hold window: session dies after 30 minutes.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${checkoutBase}${joiner}success=true&order_id=${orderId}`,
        cancel_url: `${checkoutBase}${joiner}canceled=true`,
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

    let testMode = false;
    let stripeSecret = STRIPE_SECRET_KEY.value();
    try {
      const settingsDoc = await db.collection("settings").doc("website").get();
      if (settingsDoc.exists) {
        const settings = settingsDoc.data() || {};
        testMode = settings.payments?.testMode || false;
        const stripeSettings = settings.payments?.stripe || {};
        if (testMode && stripeSettings.testSecretKey) {
          stripeSecret = stripeSettings.testSecretKey;
        } else if (!testMode && stripeSettings.secretKey) {
          stripeSecret = stripeSettings.secretKey;
        }
      }
    } catch (dbErr) {
      console.warn("Failed to load settings in webhook, falling back to env secret key:", dbErr);
    }

    const stripe = new Stripe(stripeSecret);
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
          let paidTotal = null;

          await db.runTransaction(async transaction => {
            // Firestore transactions require ALL reads before any writes.
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) return;
            const order = orderDoc.data();

            if (order.paymentStatus === "paid") {
              return;
            }

            const itemList = order.items || [];
            const bookRefs = itemList.map(item => db.collection("books").doc(item.id));
            const bookDocs = await Promise.all(bookRefs.map(ref => transaction.get(ref)));

            let discountRef = null;
            let discountDoc = null;
            if (order.appliedDiscount?.id) {
              discountRef = db.collection("discounts").doc(order.appliedDiscount.id);
              discountDoc = await transaction.get(discountRef);
            }

            // Single-use token securing digital download links in emails.
            const downloadToken = crypto.randomBytes(32).toString("hex");

            transaction.update(orderRef, {
              paymentStatus: "paid",
              fulfillmentStatus: "paid",
              status: "open",
              downloadToken,
              paidAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              activity: [
                ...(order.activity || []),
                { type: "event", message: "Payment completed (Stripe Webhook)", createdAt: new Date().toISOString() }
              ]
            });

            // Atomic Stock Level Decrement
            itemList.forEach((item, idx) => {
              const bookDoc = bookDocs[idx];
              if (!bookDoc.exists) return;
              const book = bookDoc.data();
              if (!book.trackInventory) return;

              if (item.variantId) {
                const variants = book.variants || [];
                const updatedVariants = variants.map(v => {
                  if (v.id === item.variantId) {
                    return { ...v, stock: Math.max(0, v.stock - item.quantity) };
                  }
                  return v;
                });
                transaction.update(bookRefs[idx], {
                  variants: updatedVariants,
                  stockLevel: Math.max(0, (book.stockLevel || 0) - item.quantity),
                  updatedAt: new Date().toISOString()
                });
              } else {
                transaction.update(bookRefs[idx], {
                  stockLevel: Math.max(0, (book.stockLevel || 0) - item.quantity),
                  updatedAt: new Date().toISOString()
                });
              }
            });

            // Count discount redemptions so usage limits are enforceable.
            if (discountRef && discountDoc?.exists) {
              transaction.update(discountRef, {
                usageCount: (discountDoc.data().usageCount || 0) + 1,
                updatedAt: new Date().toISOString()
              });
            }

            paidTotal = Number(order.total) || 0;
          });

          // Revenue/order analytics are recorded here — at payment time —
          // never client-side at order creation.
          if (paidTotal !== null) {
            const today = new Date().toISOString().split("T")[0];
            await db.collection("analytics").doc(today).set({
              date: today,
              orders: admin.firestore.FieldValue.increment(1),
              revenue: admin.firestore.FieldValue.increment(paidTotal),
            }, { merge: true });
          }

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
    const { orderId, itemId, token } = req.query;
    if (!orderId || !itemId || !token) {
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
      // The token is a random secret generated at payment time and only ever
      // delivered to the buyer's inbox — possession proves entitlement.
      const expected = order.downloadToken || "";
      const provided = String(token);
      const valid =
        expected.length > 0 &&
        expected.length === provided.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
      if (!valid) {
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
// 4. Notification Settings and Helper Functions
// ──────────────────────────────────────────────────────────────
const DEFAULT_NOTIFICATIONS = {
  brand: {
    logoUrl: "",
    brandColor: "#7C3AED"
  },
  order_confirmation: {
    subject: "Order confirmed: {{order_id}}",
    body: "Hi {{customer_name}},\n\nThank you for your purchase! We've received your order and are preparing it for shipment. We will send you another email when it has shipped.",
    buttonText: "View your order",
    signoff: "Thanks,\nThe Lyricalmyrical Team",
    enabled: true
  },
  shipping_confirmation: {
    subject: "Your order is on the way!",
    body: "Hi {{customer_name}},\n\nGood news! Your order has been shipped and is on the way. You can track its progress using the link below.",
    buttonText: "Track your shipment",
    signoff: "Best,\nThe Lyricalmyrical Team",
    enabled: true
  },
  abandoned_cart: {
    subject: "Did you forget something?",
    body: "Hi {{customer_name}},\n\nWe noticed you left some items in your cart. We've saved them for you, so you can easily complete your purchase whenever you're ready!",
    buttonText: "Resume purchase",
    signoff: "Thanks,\nThe Lyricalmyrical Team",
    enabled: true
  },
  order_cancelled: {
    subject: "Order cancelled: {{order_id}}",
    body: "Hi {{customer_name}},\n\nYour order has been cancelled and you will not be charged. If you have any questions, please contact us.",
    buttonText: "",
    signoff: "Best,\nThe Lyricalmyrical Team",
    enabled: true
  },
  order_refunded: {
    subject: "Order refunded: {{order_id}}",
    body: "Hi {{customer_name}},\n\nWe have successfully refunded CA${{total_price}} for your order. The funds should return to your original payment method in 5-10 business days.",
    buttonText: "",
    signoff: "Best,\nThe Lyricalmyrical Team",
    enabled: true
  },
  customer_welcome: {
    subject: "Welcome to Lyricalmyrical Books!",
    body: "Hi {{customer_name}},\n\nThank you for creating an account with Lyricalmyrical Books! You can now log in to view your orders, save shipping addresses, and download digital library books.",
    buttonText: "Go to your account",
    signoff: "Warmly,\nThe Lyricalmyrical Team",
    enabled: true
  },
  delivery_update: {
    subject: "Delivery Update: Your order is {{status}}",
    body: "Hi {{customer_name}},\n\nYour package tracking status has been updated: {{status}}.\n\nCarrier: {{tracking_carrier}}\nTracking: {{tracking_number}}",
    buttonText: "Track shipment",
    signoff: "Best,\nThe Lyricalmyrical Team",
    enabled: true
  }
};

async function loadNotificationSettings() {
  let dbSettings = {};
  try {
    const snap = await db.collection("settings").doc("notifications").get();
    if (snap.exists) {
      dbSettings = snap.data() || {};
    }
  } catch (err) {
    console.warn("Failed to load notifications from Firestore, using default fallback:", err);
  }

  const merged = { ...DEFAULT_NOTIFICATIONS };
  for (const key of Object.keys(DEFAULT_NOTIFICATIONS)) {
    if (key === "brand") {
      merged.brand = { ...DEFAULT_NOTIFICATIONS.brand, ...(dbSettings.brand || {}) };
    } else {
      merged[key] = { ...DEFAULT_NOTIFICATIONS[key], ...(dbSettings[key] || {}) };
    }
  }
  return merged;
}

function getTrackingUrl(carrier, trackingNum) {
  const cleanCarrier = (carrier || "").trim().toLowerCase();
  const cleanNum = (trackingNum || "").trim();
  if (cleanCarrier.includes("canada post")) {
    return `https://www.canadapost-postescanada.ca/track-reperage/en#/resultList?searchKeys=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("fedex")) {
    return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(cleanNum)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(carrier + " " + cleanNum)}`;
}

function compileEmailTemplate(templateId, settings, vars, additionalSection) {
  const brand = settings.brand || {};
  const logoUrl = brand.logoUrl || "";
  const brandColor = brand.brandColor || "#7C3AED";
  
  const template = settings[templateId] || DEFAULT_NOTIFICATIONS[templateId];
  let subject = template.subject || DEFAULT_NOTIFICATIONS[templateId].subject;
  let body = template.body || DEFAULT_NOTIFICATIONS[templateId].body;
  let buttonText = template.buttonText !== undefined ? template.buttonText : DEFAULT_NOTIFICATIONS[templateId].buttonText;
  let signoff = template.signoff || DEFAULT_NOTIFICATIONS[templateId].signoff;

  // Replace placeholders in subject and body
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(regex, value || "");
    body = body.replace(regex, value || "");
  }

  let ctaButtonHtml = "";
  if (buttonText && vars.button_url) {
    ctaButtonHtml = `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${vars.button_url}" style="background-color: ${brandColor}; color: #ffffff; padding: 12px 30px; text-decoration: none; font-size: 13px; font-weight: bold; border-radius: 8px; letter-spacing: 0.1em; text-transform: uppercase; display: inline-block;">
          ${buttonText}
        </a>
      </div>
    `;
  }

  let itemsTableHtml = "";
  if (vars.items_table) {
    itemsTableHtml = vars.items_table;
  }

  const finalBody = body.replace(/\n/g, "<br/>");
  const signoffHtml = signoff.replace(/\n/g, "<br/>");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f6f6f9;
          color: #333333;
          margin: 0;
          padding: 20px;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          max-height: 40px;
          width: auto;
        }
        .content {
          font-size: 14px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 11px;
          color: #999999;
          border-top: 1px solid #eeeeee;
          padding-top: 20px;
          letter-spacing: 0.05em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" />` : `<h2 style="margin: 0; font-weight: 800; letter-spacing: -0.03em; color: #111;">Lyricalmyrical</h2>`}
        </div>
        <div class="content">
          <p>${finalBody}</p>
          ${ctaButtonHtml}
          ${itemsTableHtml}
          ${additionalSection || ""}
          <p style="margin-top: 30px; font-weight: 500; color: #555555;">${signoffHtml}</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Lyricalmyrical Books. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

// ──────────────────────────────────────────────────────────────
// 5a. New Order: Notify admin immediately when any order is placed
// ──────────────────────────────────────────────────────────────
exports.onOrderCreated = onDocumentCreated(
  { document: "orders/{orderId}", secrets: [RESEND_API_KEY] },
  async event => {
    const order = event.data?.data() || {};
    const orderId = event.params.orderId;

    if (!order.customer?.email) return;

    const itemsTable = `
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
        ${orderRowsHtml(order.items)}
        <tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Subtotal</td><td style="text-align:right;">${moneyFmt(order.subtotal)}</td></tr>
        <tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Shipping</td><td style="text-align:right;">${moneyFmt(order.shipping)}</td></tr>
        ${order.tax ? `<tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Tax</td><td style="text-align:right;">${moneyFmt(order.tax)}</td></tr>` : ""}
        ${order.discount ? `<tr><td colspan="2" style="padding:8px 0;text-align:right;color:#0a7;">Discount</td><td style="text-align:right;color:#0a7;">−${moneyFmt(order.discount)}</td></tr>` : ""}
        <tr><td colspan="2" style="padding:12px 0;text-align:right;font-weight:bold;">Total</td><td style="text-align:right;font-weight:bold;">${moneyFmt(order.total)}</td></tr>
      </table>
    `;

    const paymentLabel = order.paymentStatus === "pending"
      ? `${order.paymentMethod || "Manual"} — awaiting payment`
      : order.paymentMethod || "Unknown";

    const adminHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="margin-top:0;">New Order Received</h2>
        <p><strong>Order:</strong> ${order.orderId || orderId}</p>
        <p><strong>Customer:</strong> ${order.customer.name} &lt;${order.customer.email}&gt;</p>
        ${order.customer.phone ? `<p><strong>Phone:</strong> ${order.customer.phone}</p>` : ""}
        <p><strong>Payment:</strong> ${paymentLabel}</p>
        ${itemsTable}
        ${order.customer.address ? `<p><strong>Ship to:</strong> ${[order.customer.address.street, order.customer.address.city, order.customer.address.state, order.customer.address.zip, order.customer.address.country].filter(Boolean).join(", ")}</p>` : ""}
        ${order.paymentInstructions ? `<p><strong>Payment instructions sent:</strong> ${order.paymentInstructions}</p>` : ""}
      </div>
    `;

    try {
      await sendEmail({
        to: ADMIN_TO,
        subject: `[NEW ORDER] ${order.orderId || orderId} · ${moneyFmt(order.total)} · ${order.customer.name}`,
        html: adminHtml,
        secret: RESEND_API_KEY.value(),
      });
    } catch (err) {
      console.error("New order admin notification failed", err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 5b. Order Paid: Trigger notifications only AFTER successful payment
// ──────────────────────────────────────────────────────────────
exports.onOrderUpdated = onDocumentUpdated(
  { document: "orders/{orderId}", secrets: [RESEND_API_KEY] },
  async event => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const orderId = event.params.orderId;

    if (!after.customer?.email) return;

    const notificationSettings = await loadNotificationSettings();

    // 1. Order Confirmation (Order Paid)
    const becamePaid = before.paymentStatus !== "paid" && after.paymentStatus === "paid";
    if (becamePaid && notificationSettings.order_confirmation?.enabled !== false) {
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
                    <a href="https://us-central1-lyricalmyrical-web-v2.cloudfunctions.net/downloadDigitalAsset?orderId=${encodeURIComponent(orderId)}&itemId=${encodeURIComponent(item.id)}&token=${encodeURIComponent(order.downloadToken || "")}"
                       style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:6px 12px;border-radius:6px;font-size:10px;font-weight:bold;letter-spacing:.05em;text-transform:uppercase;">Download File</a>
                  </td>
                </tr>
              `).join("")}
            </table>
          </div>
        `;
      }

      const itemsTable = `
        <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:13px;">
          ${orderRowsHtml(order.items)}
          <tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Subtotal</td><td style="text-align:right;">${moneyFmt(order.subtotal)}</td></tr>
          <tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Shipping</td><td style="text-align:right;">${moneyFmt(order.shipping)}</td></tr>
          ${order.tax ? `<tr><td colspan="2" style="padding:8px 0;text-align:right;color:#666;">Tax</td><td style="text-align:right;">${moneyFmt(order.tax)}</td></tr>` : ""}
          ${order.discount ? `<tr><td colspan="2" style="padding:8px 0;text-align:right;color:#0a7;">Discount</td><td style="text-align:right;color:#0a7;">−${moneyFmt(order.discount)}</td></tr>` : ""}
          <tr><td colspan="2" style="padding:12px 0;text-align:right;font-weight:bold;">Total</td><td style="text-align:right;font-weight:bold;">${moneyFmt(order.total)}</td></tr>
        </table>
      `;

      const compiled = compileEmailTemplate("order_confirmation", notificationSettings, {
        customer_name: order.customer.name || "there",
        order_id: order.orderId || orderId,
        button_url: `https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/track?orderId=${orderId}`,
        items_table: itemsTable,
        total_price: moneyFmt(order.total)
      }, downloadSection);

      const adminOrderUrl = `https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/admin#orders/${orderId}`;
      const adminAddr = order.customer?.address
        ? [order.customer.address.street, order.customer.address.city, order.customer.address.state, order.customer.address.zip, order.customer.address.country].filter(Boolean).join(", ")
        : "—";
      const adminPaidHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="margin-top:0;color:#16a34a;">&#10003; Payment Received</h2>
          <p><strong>Order:</strong> ${order.orderId || orderId} &nbsp;·&nbsp; <strong>${moneyFmt(order.total)}</strong></p>
          <p><strong>Customer:</strong> ${order.customer.name} &lt;${order.customer.email}&gt;${order.customer.phone ? ` · ${order.customer.phone}` : ""}</p>
          <p><strong>Ship to:</strong> ${adminAddr}</p>
          <p><strong>Payment:</strong> ${order.paymentMethod || "Stripe"}</p>
          ${itemsTable}
          <p style="margin-top:24px;">
            <a href="${adminOrderUrl}" style="background:#7c3aed;color:#fff;padding:10px 22px;text-decoration:none;border-radius:8px;font-size:13px;font-weight:bold;">View Order in Admin</a>
          </p>
        </div>
      `;

      try {
        await sendEmail({
          to: order.customer.email,
          subject: compiled.subject,
          html: compiled.html,
          secret: RESEND_API_KEY.value(),
        });
        await sendEmail({
          to: ADMIN_TO,
          subject: `[PAYMENT SUCCESS] ${order.orderId || orderId} · ${moneyFmt(order.total)} · ${order.customer.name}`,
          html: adminPaidHtml,
          secret: RESEND_API_KEY.value(),
        });
      } catch (err) {
        console.error("Payment confirmation email failed", err);
      }
    }

    // 2. Shipping Confirmation (Order Shipped)
    const becameShipped = before.fulfillmentStatus !== "shipped" && after.fulfillmentStatus === "shipped";
    if (becameShipped && notificationSettings.shipping_confirmation?.enabled !== false) {
      const trackingUrl = getTrackingUrl(after.trackingCarrier, after.trackingNumber);
      const compiled = compileEmailTemplate("shipping_confirmation", notificationSettings, {
        customer_name: after.customer?.name || "there",
        order_id: after.orderId || orderId,
        tracking_carrier: after.trackingCarrier || "carrier",
        tracking_number: after.trackingNumber || "",
        button_url: trackingUrl,
        tracking_url: trackingUrl
      });

      const shippedAdminHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="margin-top:0;">&#128666; Order Shipped</h2>
          <p><strong>Order:</strong> ${after.orderId || orderId}</p>
          <p><strong>Customer:</strong> ${after.customer?.name} &lt;${after.customer?.email}&gt;</p>
          <p><strong>Carrier:</strong> ${after.trackingCarrier || "—"} &nbsp;·&nbsp; <strong>Tracking:</strong> ${after.trackingNumber || "—"}</p>
          ${after.trackingNumber ? `<p><a href="${trackingUrl}">Track shipment &rarr;</a></p>` : ""}
        </div>
      `;

      try {
        await sendEmail({
          to: after.customer.email,
          subject: compiled.subject,
          html: compiled.html,
          secret: RESEND_API_KEY.value(),
        });
        await sendEmail({
          to: ADMIN_TO,
          subject: `[SHIPPED] ${after.orderId || orderId} · ${after.customer?.name}`,
          html: shippedAdminHtml,
          secret: RESEND_API_KEY.value(),
        });
      } catch (err) {
        console.error("Shipping confirmation email failed", err);
      }
    }

    // 2b. Delivered (manual status change by admin — Shippo webhook handles the carrier push)
    // Skip if Shippo already sent the email via its own webhook (shippoDeliveryNotified was just set)
    const becameDelivered = before.fulfillmentStatus !== "delivered" && after.fulfillmentStatus === "delivered";
    const shippoAlreadyNotified = after.shippoDeliveryNotified && after.shippoDeliveryNotified !== before.shippoDeliveryNotified;
    if (becameDelivered && !shippoAlreadyNotified && notificationSettings.delivery_update?.enabled !== false) {
      const trackingUrl = after.trackingNumber
        ? getTrackingUrl(after.trackingCarrier || "", after.trackingNumber)
        : `https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/track?orderId=${orderId}`;
      const compiled = compileEmailTemplate("delivery_update", notificationSettings, {
        customer_name: after.customer?.name || "there",
        order_id: after.orderId || orderId,
        status: "delivered",
        tracking_carrier: after.trackingCarrier || "",
        tracking_number: after.trackingNumber || "",
        tracking_url: trackingUrl,
        button_url: trackingUrl
      });

      try {
        await sendEmail({
          to: after.customer.email,
          subject: compiled.subject,
          html: compiled.html,
          secret: RESEND_API_KEY.value(),
        });
      } catch (err) {
        console.error("Delivery confirmation email failed", err);
      }
    }

    // 3. Order Cancelled
    const becameCancelled = before.status !== "cancelled" && after.status === "cancelled";
    if (becameCancelled && notificationSettings.order_cancelled?.enabled !== false) {
      const compiled = compileEmailTemplate("order_cancelled", notificationSettings, {
        customer_name: after.customer?.name || "there",
        order_id: after.orderId || orderId,
        button_url: `https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/track?orderId=${orderId}`
      });

      try {
        await sendEmail({
          to: after.customer.email,
          subject: compiled.subject,
          html: compiled.html,
          secret: RESEND_API_KEY.value(),
        });
      } catch (err) {
        console.error("Order cancelled email failed", err);
      }
    }

    // 4. Order Refunded
    const becameRefunded = before.paymentStatus !== "refunded" && after.paymentStatus === "refunded";
    if (becameRefunded && notificationSettings.order_refunded?.enabled !== false) {
      const compiled = compileEmailTemplate("order_refunded", notificationSettings, {
        customer_name: after.customer?.name || "there",
        order_id: after.orderId || orderId,
        total_price: Number(after.total || 0).toFixed(2),
        button_url: `https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/track?orderId=${orderId}`
      });

      try {
        await sendEmail({
          to: after.customer.email,
          subject: compiled.subject,
          html: compiled.html,
          secret: RESEND_API_KEY.value(),
        });
      } catch (err) {
        console.error("Order refunded email failed", err);
      }
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 7. Abandoned cart sweep: every hour, recover carts older than 1h
// ──────────────────────────────────────────────────────────────
exports.abandonedCartSweep = onSchedule(
  { schedule: "every 60 minutes", secrets: [RESEND_API_KEY] },
  async () => {
    const notificationSettings = await loadNotificationSettings();
    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const snap = await db
      .collection("abandoned-carts")
      .where("recovered", "==", false)
      .where("updatedAt", "<", cutoff)
      .get();

    const pending = snap.docs.filter(doc => doc.data().notified !== true);

    const promises = pending.map(async (doc) => {
      const c = doc.data();
      if (!c.email) return;

      const itemsTable = `
        <div style="margin: 20px 0; border-top: 1px solid #eee; padding-top: 15px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            ${(c.items || []).map(item => {
              const qty = item.qty || item.quantity || 1;
              return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0;">${item.title} (x${qty})</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace;">${moneyFmt(item.price * qty)}</td>
              </tr>`;
            }).join("")}
            <tr style="font-weight: bold;">
              <td style="padding: 12px 0;">Total</td>
              <td style="padding: 12px 0; text-align: right; font-family: monospace;">${moneyFmt(c.subtotal)}</td>
            </tr>
          </table>
        </div>
      `;

      const cartUrl = `https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/checkout?cartId=${doc.id}`;
      const compiled = compileEmailTemplate("abandoned_cart", notificationSettings, {
        customer_name: c.customer?.name || c.name || "there",
        cart_url: cartUrl,
        button_url: cartUrl,
        items_table: itemsTable
      });

      try {
        await sendEmail({
          to: c.email,
          subject: compiled.subject,
          html: compiled.html,
          secret: RESEND_API_KEY.value(),
        });
        await doc.ref.update({ notified: true, notifiedAt: new Date().toISOString() });
      } catch (err) {
        console.error("Abandoned cart email failed", err);
      }
    });

    await Promise.allSettled(promises);
  },
);

// ──────────────────────────────────────────────────────────────
// 7. HTTP Endpoint: Validate Address via Shippo (Secure)
// ──────────────────────────────────────────────────────────────
exports.getShippoConfig = onRequest({ secrets: [SHIPPO_API_TOKEN] }, async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  try {
    const configDoc = await SHIPPO_CONFIG_DOC.get();
    const config = configDoc.exists ? configDoc.data() : {};
    const fallbackToken = await getShippoToken();
    res.status(200).json({
      configured: Boolean(fallbackToken),
      source: configDoc.exists && config?.apiToken ? "firebase" : fallbackToken ? "environment" : null,
      lastFour: config?.lastFour || (fallbackToken ? fallbackToken.slice(-4) : null),
      updatedAt: config?.updatedAt || null,
    });
  } catch (err) {
    console.error("getShippoConfig failed:", err);
    res.status(500).json({ error: "Unable to load Shippo configuration." });
  }
});

exports.saveShippoConfig = onRequest(async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const apiToken = typeof req.body?.apiToken === "string" ? req.body.apiToken.trim() : "";
  if (apiToken.length < 20 || apiToken.length > 250 || /\s/.test(apiToken)) {
    res.status(400).json({ error: "Enter a valid Shippo API key without spaces." });
    return;
  }

  try {
    const updatedAt = new Date().toISOString();
    await SHIPPO_CONFIG_DOC.set({
      apiToken,
      lastFour: apiToken.slice(-4),
      updatedAt,
      updatedBy: adminUser.email,
    });
    res.status(200).json({ configured: true, source: "firebase", lastFour: apiToken.slice(-4), updatedAt });
  } catch (err) {
    console.error("saveShippoConfig failed:", err);
    res.status(500).json({ error: "Unable to save the Shippo API key." });
  }
});

exports.validateAddress = onRequest(
  { secrets: [SHIPPO_API_TOKEN] },
  async (req, res) => {
    if (applyCors(req, res)) return;

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { address } = req.body;
    if (!address || !address.street || !address.city || !address.state || !address.zip) {
      res.status(400).json({ error: "Missing address fields" });
      return;
    }

    try {
      const shippoToken = await getShippoToken();

      if (!shippoToken) {
        if (IS_EMULATOR) {
          console.warn("Using dev address verification fallback (emulator only).");
          const isTestInvalid = (address.street || "").toLowerCase().includes("invalid");
          if (isTestInvalid) {
            res.status(200).json({
              isValid: false,
              messages: [{
                code: "address_not_found",
                text: "The street address 'invalid' is not recognized by carrier databases.",
                source: "USPS"
              }]
            });
          } else {
            res.status(200).json({ isValid: true, messages: [] });
          }
          return;
        }
        // In production a missing token must not silently "verify" every
        // address. Let checkout proceed, but flag the order as unverified.
        console.error("SHIPPO_API_TOKEN missing in production — address NOT verified.");
        res.status(200).json({
          isValid: true,
          unverified: true,
          messages: [{ code: "verification_unavailable", text: "Address verification service is not configured; address was not verified." }]
        });
        return;
      }

      const countryCode = getCountryCode(address.country);
      const stateCode = getStateCode(address.state);

      const shippoRes = await callShippo("addresses/", "POST", {
        name: address.name || "Customer",
        street1: address.street,
        city: address.city,
        state: stateCode,
        zip: address.zip,
        country: countryCode,
        validate: true
      }, shippoToken);

      const validationResults = shippoRes.validation_results || {};
      const isValid = validationResults.is_valid === true;

      res.status(200).json({
        isValid,
        messages: validationResults.messages || []
      });
    } catch (err) {
      console.error("validateAddress failed:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 8. HTTP Endpoint: Create Shipping Label via Shippo (Secure)
// ──────────────────────────────────────────────────────────────
exports.createShippingLabel = onRequest(
  { secrets: [SHIPPO_API_TOKEN] },
  async (req, res) => {
    if (applyCors(req, res)) return;

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Buying a label spends real money on the Shippo account — admin only.
    const adminUser = await requireAdmin(req, res);
    if (!adminUser) return;

    const { orderId, mode } = req.body;
    if (!orderId) {
      res.status(400).json({ error: "Missing orderId" });
      return;
    }

    // When mode === "shippoOrder" we only stage a pre-filled order in the
    // Shippo dashboard (no money spent) and return this URL for the admin to
    // finish buying the label on Shippo's site.
    const SHIPPO_DASHBOARD_URL = "https://app.goshippo.com/orders";

    try {
      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const order = orderDoc.data();
      if (!order.customer || !order.customer.address) {
        res.status(400).json({ error: "Order has no customer address data" });
        return;
      }

      // 1. Resolve Settings (API keys and Origin address)
      const settingsDoc = await db.collection("settings").doc("website").get();
      const settings = settingsDoc.data() || {};
      const origin = settings.location || {};

      const shippoToken = await getShippoToken();

      if (!shippoToken) {
        if (!IS_EMULATOR) {
          // Never hand out fake tracking numbers on real orders.
          const reason = mode === "shippoOrder"
            ? "SHIPPO_API_TOKEN is not configured — cannot push the order to Shippo."
            : "SHIPPO_API_TOKEN is not configured — cannot generate a real shipping label.";
          res.status(500).json({ error: reason });
          return;
        }
        if (mode === "shippoOrder") {
          // Dev fallback: skip the API call, just hand back the dashboard URL.
          console.warn("Shippo token missing — skipping order push (Dev Fallback).");
          res.status(200).json({ dashboardUrl: SHIPPO_DASHBOARD_URL, shippoOrderId: null });
          return;
        }
        console.warn("Using dev label generation fallback (mock PDF and tracking).");
        const mockTracking = `MOCK-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const mockLabelUrl = "https://goshippo.com/wp-content/uploads/2016/04/Shippo_Label.pdf";
        
        await orderRef.update({
          labelUrl: mockLabelUrl,
          trackingNumber: mockTracking,
          trackingCarrier: "USPS (Sandbox)",
          updatedAt: new Date().toISOString(),
          activity: [
            ...(order.activity || []),
            { 
              type: "note", 
              message: `Shipping Label #${mockTracking} generated via dashboard (Dev Fallback).`, 
              createdAt: new Date().toISOString() 
            }
          ]
        });

        res.status(200).json({
          labelUrl: mockLabelUrl,
          trackingNumber: mockTracking,
          trackingCarrier: "USPS (Sandbox)"
        });
        return;
      }

      const addressFrom = {
        name: settings.info?.name || "Lyricalmyrical Books",
        street1: origin.street || "456 Montrose Ave",
        city: origin.city || "Toronto",
        state: getStateCode(origin.state || "ON"),
        zip: origin.zip || "M6G3H1",
        country: getCountryCode(origin.country || "CA"),
        phone: "6474096863",
        email: "lyricalmyricalbooks@gmail.com"
      };

      // 2. Resolve Destination Address
      const dest = order.customer.address;
      const addressTo = {
        name: order.customer.name || "Customer",
        street1: dest.street,
        city: dest.city,
        state: getStateCode(dest.state),
        zip: dest.zip,
        country: getCountryCode(dest.country),
        phone: order.customer.phone || "",
        email: order.customer.email
      };

      // Push-to-Shippo mode: stage a pre-filled Order in the Shippo dashboard
      // (no label purchased) and return the site URL for the admin to finish.
      if (mode === "shippoOrder") {
        const currency = (order.checkoutCurrency || order.currency || "CAD").toUpperCase();
        const orderItems = order.items || [];
        const orderQty = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

        const lineItems = orderItems.map(item => {
          const qty = item.quantity || 1;
          return {
            title: item.title || "Item",
            quantity: qty,
            total_price: ((item.price || 0) * qty).toFixed(2),
            currency,
            weight: (1.5 * qty).toFixed(2),
            weight_unit: "lb",
            sku: item.id || item.sku || ""
          };
        });

        const shippoOrder = await callShippo("orders/", "POST", {
          to_address: addressTo,
          from_address: addressFrom,
          line_items: lineItems,
          placed_at: order.createdAt || new Date().toISOString(),
          order_number: order.orderId || orderId,
          order_status: "PAID",
          shipping_cost: (order.shipping || 0).toFixed(2),
          shipping_cost_currency: currency,
          subtotal_price: (order.subtotal || 0).toFixed(2),
          total_price: (order.total || 0).toFixed(2),
          total_tax: (order.tax || 0).toFixed(2),
          currency,
          weight: (1.5 * orderQty).toFixed(2),
          weight_unit: "lb"
        }, shippoToken);

        await orderRef.update({
          shippoOrderId: shippoOrder.object_id || null,
          updatedAt: new Date().toISOString(),
          activity: [
            ...(order.activity || []),
            {
              type: "note",
              message: "Order pushed to Shippo dashboard for label creation.",
              createdAt: new Date().toISOString()
            }
          ]
        });

        res.status(200).json({
          dashboardUrl: SHIPPO_DASHBOARD_URL,
          shippoOrderId: shippoOrder.object_id || null,
          orderNumber: order.orderId || orderId
        });
        return;
      }

      // 3. Define Parcel (scale weight by quantity or use custom parameters from req.body)
      const totalQty = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      const customParcel = req.body.parcel || {};
      const parcel = {
        length: customParcel.length ? String(customParcel.length) : "10",
        width: customParcel.width ? String(customParcel.width) : "8",
        height: customParcel.height ? String(customParcel.height) : "2",
        distance_unit: customParcel.distance_unit || "in",
        weight: customParcel.weight ? String(customParcel.weight) : (1.5 * totalQty).toFixed(1),
        mass_unit: customParcel.mass_unit || "lb"
      };

      // 4. Create Shipment on Shippo
      const shipment = await callShippo("shipments/", "POST", {
        address_from: addressFrom,
        address_to: addressTo,
        parcels: [parcel],
        async: false
      }, shippoToken);

      const rates = shipment.rates || [];
      if (rates.length === 0) {
        throw new Error("No shipping rates returned by Shippo.");
      }

      // 5. Select cheapest rate
      const cheapestRate = rates.reduce((min, rate) => {
        const rateVal = parseFloat(rate.amount);
        const minVal = parseFloat(min.amount);
        return rateVal < minVal ? rate : min;
      }, rates[0]);

      // 6. Purchase Rate to create Transaction (Label)
      const transaction = await callShippo("transactions/", "POST", {
        rate: cheapestRate.object_id,
        async: false
      }, shippoToken);

      if (transaction.status !== "SUCCESS") {
        const messages = (transaction.messages || []).map(m => m.text).join(", ");
        throw new Error(`Transaction creation failed: ${transaction.status} - ${messages}`);
      }

      const trackingNumber = transaction.tracking_number;
      const trackingCarrier = transaction.tracking_provider;
      const labelUrl = transaction.label_url;

      // 7. Update Firestore Order document
      await orderRef.update({
        labelUrl: labelUrl,
        trackingNumber: trackingNumber,
        trackingCarrier: trackingCarrier,
        updatedAt: new Date().toISOString(),
        activity: [
          ...(order.activity || []),
          { 
            type: "note", 
            message: `Shipping Label #${trackingNumber} generated via dashboard. Carrier: ${trackingCarrier}.`, 
            createdAt: new Date().toISOString() 
          }
        ]
      });

      res.status(200).json({
        labelUrl,
        trackingNumber,
        trackingCarrier
      });

    } catch (err) {
      console.error("createShippingLabel failed:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 9. HTTP Endpoint: Validate Discount Code (public checkout)
//    The discounts collection is admin-only in Firestore rules, so the
//    storefront validates codes through this endpoint instead.
// ──────────────────────────────────────────────────────────────
exports.validateDiscountCode = onRequest(async (req, res) => {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const { code } = req.body;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing discount code" });
    return;
  }

  try {
    const d = await fetchValidDiscount(code);
    res.status(200).json({
      discount: {
        id: d.id,
        code: d.code,
        type: d.type,
        value: d.value,
        minOrderAmount: d.minOrderAmount ?? null,
        minQuantity: d.minQuantity ?? null,
        onePerCustomer: d.onePerCustomer ?? false,
        appliesTo: d.appliesTo ?? "all",
        selectedCategories: d.selectedCategories ?? [],
        selectedProducts: d.selectedProducts ?? [],
        allowedEmailDomains: d.allowedEmailDomains ?? "",
        allowedCustomerEmails: d.allowedCustomerEmails ?? "",
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────
// 10. Customer Welcome Trigger
// ──────────────────────────────────────────────────────────────
exports.onCustomerCreated = onDocumentCreated(
  { document: "customers/{customerId}", secrets: [RESEND_API_KEY] },
  async event => {
    const customer = event.data?.data() || {};
    if (!customer.email) return;

    const notificationSettings = await loadNotificationSettings();
    if (notificationSettings.customer_welcome?.enabled === false) {
      return;
    }

    const compiled = compileEmailTemplate("customer_welcome", notificationSettings, {
      customer_name: customer.name || "there",
      email: customer.email,
      button_url: "https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/account",
    });

    try {
      await sendEmail({
        to: customer.email,
        subject: compiled.subject,
        html: compiled.html,
        secret: RESEND_API_KEY.value(),
      });
      console.log(`Welcome email successfully sent to customer: ${customer.email}`);
    } catch (err) {
      console.error("Welcome email failed", err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 11. HTTP Endpoint: Send Test Email (Admin Secure)
// ──────────────────────────────────────────────────────────────
exports.sendTestEmail = onRequest(
  { secrets: [RESEND_API_KEY] },
  async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const adminUser = await requireAdmin(req, res);
    if (!adminUser) return;

    const { templateId, email } = req.body;
    if (!templateId || !email) {
      res.status(400).json({ error: "Missing templateId or email" });
      return;
    }

    try {
      const notificationSettings = await loadNotificationSettings();

      const mockVars = {
        customer_name: "Julianne Smith",
        order_id: "LM-98241",
        tracking_carrier: "Canada Post",
        tracking_number: "123456789012",
        total_price: "45.00",
        email: "julianne.smith@gmail.com",
        status: "out for delivery",
        tracking_url: "https://www.canadapost-postescanada.ca/track-reperage/en",
        cart_url: "https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/checkout",
        button_url: "https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/account",
        items_table: `
          <div style="margin: 30px 0; border-top: 1px solid #eeeeee; padding-top: 20px;">
            <h4 style="margin-top: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #888888;">Order Details</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #eeeeee;">
                <td style="padding: 10px 0; font-weight: bold;">Visions of Toronto - Limited Edition (x1)</td>
                <td style="padding: 10px 0; text-align: right; font-family: monospace;">CA$35.00</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666666;">Subtotal</td>
                <td style="padding: 10px 0; text-align: right; font-family: monospace;">CA$35.00</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #666666;">Shipping</td>
                <td style="padding: 5px 0; text-align: right; font-family: monospace;">CA$10.00</td>
              </tr>
              <tr style="font-size: 15px; font-weight: bold; border-top: 1px solid #dddddd;">
                <td style="padding: 15px 0;">Total</td>
                <td style="padding: 15px 0; text-align: right; font-family: monospace;">CA$45.00</td>
              </tr>
            </table>
          </div>
        `
      };

      let sampleDownloadSection = "";
      if (templateId === "order_confirmation") {
        sampleDownloadSection = `
          <div style="margin-top:28px;padding:24px;background:#f8f6ff;border-radius:16px;border:1px solid #7c3aed20;">
            <h3 style="margin-top:0;font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#7c3aed;">Digital Library Access (Sample)</h3>
            <p style="font-size:11px;color:#666;margin-bottom:16px;line-height:1.5;">Click the links below to download your digital books. For security, these download links are active for 24 hours.</p>
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #7c3aed10;"><strong>Visions of Toronto - PDF Edition</strong></td>
                <td style="padding:8px 0;text-align:right;border-bottom:1px solid #7c3aed10;">
                  <a href="#" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:6px 12px;border-radius:6px;font-size:10px;font-weight:bold;letter-spacing:.05em;text-transform:uppercase;">Download File</a>
                </td>
              </tr>
            </table>
          </div>
        `;
      }

      const compiled = compileEmailTemplate(templateId, notificationSettings, mockVars, sampleDownloadSection);

      await sendEmail({
        to: email,
        subject: `[TEST] ${compiled.subject}`,
        html: compiled.html,
        secret: RESEND_API_KEY.value(),
      });

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("sendTestEmail failed:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 12. HTTP Endpoint: Shippo Webhook Status Updates (Carrier Integration)
// ──────────────────────────────────────────────────────────────
exports.shippoWebhook = onRequest(
  { secrets: [RESEND_API_KEY] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const payload = req.body || {};
    const trackingNum = payload.data?.tracking_number;
    const trackingStatusObj = payload.data?.tracking_status;
    const trackingStatus = trackingStatusObj?.status;
    const carrier = payload.data?.carrier;

    if (!trackingNum) {
      console.warn("Shippo webhook invoked without tracking number.");
      res.status(400).send("Missing tracking number");
      return;
    }

    try {
      const snap = await db.collection("orders").where("trackingNumber", "==", trackingNum).limit(1).get();
      if (snap.empty) {
        console.log(`Shippo webhook: No order matches tracking number ${trackingNum}`);
        res.status(200).json({ success: true, message: "No matching order found" });
        return;
      }

      const orderDoc = snap.docs[0];
      const order = orderDoc.data();
      const orderId = orderDoc.id;

      const prevFulfillmentStatus = order.fulfillmentStatus;
      let nextFulfillmentStatus = null;
      let orderStatus = order.status;

      if (trackingStatus === "DELIVERED") {
        nextFulfillmentStatus = "delivered";
        orderStatus = "completed";
      } else if (trackingStatus === "OUT_FOR_DELIVERY") {
        nextFulfillmentStatus = "out_for_delivery";
      }

      if (nextFulfillmentStatus && nextFulfillmentStatus !== prevFulfillmentStatus) {
        const activity = order.activity || [];
        const newNote = {
          type: "event",
          message: `Shippo tracking update: ${trackingStatus.replace(/_/g, " ")}.`,
          createdAt: new Date().toISOString()
        };

        await orderDoc.ref.update({
          fulfillmentStatus: nextFulfillmentStatus,
          status: orderStatus,
          activity: [...activity, newNote],
          updatedAt: new Date().toISOString(),
          // Flag so onOrderUpdated knows Shippo already sent the delivery email
          shippoDeliveryNotified: new Date().toISOString()
        });

        // Send delivery_update CRM email automatically
        const notificationSettings = await loadNotificationSettings();
        if (notificationSettings.delivery_update?.enabled !== false) {
          const finalCarrier = carrier || order.trackingCarrier || "Carrier";
          const trackingUrl = getTrackingUrl(finalCarrier, trackingNum);
          const humanStatus = trackingStatus === "DELIVERED" ? "delivered" : "out for delivery";

          const compiled = compileEmailTemplate("delivery_update", notificationSettings, {
            customer_name: order.customer?.name || "there",
            order_id: order.orderId || orderId,
            status: humanStatus,
            tracking_carrier: finalCarrier,
            tracking_number: trackingNum,
            tracking_url: trackingUrl,
            button_url: trackingUrl
          });

          try {
            await sendEmail({
              to: order.customer.email,
              subject: compiled.subject,
              html: compiled.html,
              secret: RESEND_API_KEY.value(),
            });
            console.log(`Delivery update email sent for order ${orderId} (${humanStatus})`);
          } catch (emailErr) {
            console.error("Failed to send delivery update email:", emailErr);
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("shippoWebhook error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

