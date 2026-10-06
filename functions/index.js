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
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { Resend } = require("resend");
const { explainEmailError } = require("./emailErrors");
const { risoButton, risoLayout } = require("./emailTheme");
const Stripe = require("stripe");
const { calculateShipping, applyStockDelta } = require("./orderMath");
const { quoteShipping, pickQuote, parseWeightGrams } = require("./shippingEngine");
const { labelProblem, addressKey: guardAddressKey } = require("./fulfillmentGuard");
const { buildOrderDigest, TRANSIT_DAYS } = require("./orderDigest");
const { checkoutRate } = require("./checkoutRate");
const { canadaPostLabelRates, isCanadaPostRate } = require("./labelRates");
const { discountedPhysicalSubtotal, resolveLocalSelection, isPhysicalItem, bogoPercent } = require("./localFulfillment");
const { readBooks, writeStock } = require("./inventory");
const { resolveCountry } = require("./shippingGeo");
const { REQUIRED_WEBHOOK_EVENTS, modesToTry, intentAsSession, paidIntentOrderId, webhookEndpointReport, signingSecrets, reversalState, ordersDueReversalCheck } = require("./stripeRecovery");
const { checkoutCurrencyOf, paidAmountCheck, toMinor, discountDateState, purchaseProblem } = require("./paymentGuards");

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

exports.deleteTestOrders = onRequest(async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  if (!await requireAdmin(req, res)) return;

  const orderIds = Array.isArray(req.body?.orderIds) ? req.body.orderIds : [];
  if (!orderIds.length || orderIds.length > 100 || orderIds.some(id => typeof id !== "string" || !id)) {
    res.status(400).json({ error: "Provide between 1 and 100 valid order IDs." });
    return;
  }

  const refs = orderIds.map(id => db.collection("orders").doc(id));
  const snapshots = await db.getAll(...refs);
  if (snapshots.some(snapshot => snapshot.exists && snapshot.data()?.isTest !== true)) {
    res.status(400).json({ error: "Only records carrying isTest: true may be bulk deleted." });
    return;
  }

  const existing = snapshots.filter(snapshot => snapshot.exists);
  const batch = db.batch();
  existing.forEach(snapshot => batch.delete(snapshot.ref));
  await batch.commit();
  res.json({ deleted: existing.length });
});

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

// Secret keys entered in the admin live in the admin-only adminSecrets/* docs.
// Older saves put them in public settings/*; those are still honoured until the
// admin next opens Settings (which moves them), but adminSecrets wins.
async function readAdminSecret(id) {
  try {
    const snap = await db.collection("adminSecrets").doc(id).get();
    return snap.exists ? snap.data() || {} : {};
  } catch (err) {
    console.warn(`Could not read adminSecrets/${id}:`, err);
    return {};
  }
}

async function withPrivateStripeKeys(stripeSettings) {
  const merged = { ...(stripeSettings || {}) };
  const priv = await readAdminSecret("stripe");
  if (priv.secretKey) merged.secretKey = priv.secretKey;
  if (priv.testSecretKey) merged.testSecretKey = priv.testSecretKey;
  return merged;
}

async function getStripeClientForMode(mode, stripeAccountId = null) {
  const settingsDoc = await db.collection("settings").doc("website").get();
  const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
  const stripeSettings = await withPrivateStripeKeys(settings.payments?.stripe);
  const stripeSecret = mode === "test"
    ? stripeSettings.testSecretKey
    : (stripeSettings.secretKey || STRIPE_SECRET_KEY.value());

  if (!stripeSecret) {
    throw new Error(`Stripe ${mode === "test" ? "test" : "live"} secret key is not configured.`);
  }

  return {
    stripe: new Stripe(stripeSecret),
    requestOptions: stripeAccountId ? { stripeAccount: stripeAccountId } : {},
  };
}

// The secret key for one Stripe mode, or "" when none is set (never throws).
async function stripeSecretFor(mode) {
  const settingsDoc = await db.collection("settings").doc("website").get();
  const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
  const stripeSettings = await withPrivateStripeKeys(settings.payments?.stripe);
  if (mode === "test") return stripeSettings.testSecretKey || "";
  try { return stripeSettings.secretKey || STRIPE_SECRET_KEY.value() || ""; } catch { return stripeSettings.secretKey || ""; }
}

async function shopTestMode() {
  const settingsDoc = await db.collection("settings").doc("website").get();
  return !!(settingsDoc.exists && settingsDoc.data()?.payments?.testMode);
}

// Asks Stripe (test and live accounts, the order's own mode first) for one of the
// order's saved payments. Returns { found, mode } or null when no account knows it.
// Only a payment whose metadata/client_reference_id names this order counts.
async function retrieveOrderPayment(orderId, order, { paymentIntentId, sessionId } = {}) {
  const testMode = await shopTestMode();
  for (const mode of modesToTry(order, testMode)) {
    const secret = await stripeSecretFor(mode);
    if (!secret) continue;
    const stripe = new Stripe(secret);
    try {
      if (paymentIntentId) {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.metadata?.order_id !== orderId) return null;
        return { intent, mode };
      }
      if (sessionId) {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.client_reference_id !== orderId) return null;
        return { session, mode };
      }
      return null;
    } catch (err) {
      // Wrong account for this id: try the other one. Anything else is a real failure.
      if (err?.code === "resource_missing" || err?.statusCode === 404 || err?.type === "StripeAuthenticationError") continue;
      throw err;
    }
  }
  return null;
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
          ${escapeHtml(i.title)}${i.variantName ? ` <span style="color:#888;">(${escapeHtml(i.variantName)})</span>` : ""}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;color:#888;">×${i.quantity}</td>
        <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;">${moneyFmt(i.price * i.quantity)}</td>
      </tr>`,
    )
    .join("");
}

// Admin-only delivery log (firestore.rules: emailLog is readable by the admin, writable by no client).
// Shown in Admin › Notifications so failed sends are visible instead of only in Functions logs.
async function logEmailAttempt(entry) {
  try {
    await db.collection("emailLog").add({ ...entry, at: new Date().toISOString() });
  } catch (err) {
    console.warn("Could not write emailLog entry:", err);
  }
}

async function sendEmail({ to, subject, html, secret }) {
  let apiKey = secret;
  let keySource = secret ? "secret" : "none";
  let fromName = "Lyricalmyrical Books";
  let fromEmail = "orders@lyricalmyricalbooks.com";
  let replyTo = null;
  let brand = {};

  try {
    const settingsDoc = await db.collection("settings").doc("website").get();
    if (settingsDoc.exists) {
      const settings = settingsDoc.data() || {};
      const comms = settings.communications || {};
      if (comms.fromName) fromName = comms.fromName;
      if (comms.replyTo) replyTo = comms.replyTo;
      if (comms.fromEmail) fromEmail = comms.fromEmail;
      if (comms.resendApiKey) { apiKey = comms.resendApiKey; keySource = "settings"; }
    }
  } catch (err) {
    console.warn("Failed to load custom sender details, using default fallbacks:", err);
  }

  // Also check settings/notifications for custom API Key
  try {
    const notificationsDoc = await db.collection("settings").doc("notifications").get();
    if (notificationsDoc.exists) {
      const notifications = notificationsDoc.data() || {};
      if (notifications.resendApiKey) { apiKey = notifications.resendApiKey; keySource = "settings"; }
      if (notifications.brand && notifications.brand.resendApiKey) { apiKey = notifications.brand.resendApiKey; keySource = "settings"; }
      brand = notifications.brand || {};
    }
  } catch (err) {
    console.warn("Failed to load notifications custom API Key:", err);
  }

  const privateResend = await readAdminSecret("resend");
  if (privateResend.apiKey) { apiKey = privateResend.apiKey; keySource = "settings"; }

  if (typeof apiKey === "string") apiKey = apiKey.trim();
  const recipients = Array.isArray(to) ? to.join(", ") : String(to || "");

  // Gmail SMTP is the primary sender while the shop has no verified domain in Resend. Gmail
  // always sends from the authenticated account, so customers get real inbox delivery.
  // If it is unset or fails, fall through to Resend below.
  let gmailPass = "";
  try {
    const gmailDoc = await db.collection("adminSecrets").doc("gmail").get();
    if (gmailDoc.exists) gmailPass = String(gmailDoc.data()?.appPassword || "").replace(/\s+/g, "");
  } catch (err) {
    console.warn("Could not read adminSecrets/gmail:", err);
  }
  if (gmailPass) {
    try {
      if (html && !/<html[\s>]/i.test(html)) {
        html = risoLayout(html, { logoUrl: brand.logoUrl || "", accent: brand.brandColor, theme: brand.emailTheme });
      }
      const transport = nodemailer.createTransport({ service: "gmail", auth: { user: ADMIN_TO, pass: gmailPass } });
      const info = await transport.sendMail({
        from: `"${String(fromName).replace(/"/g, "")}" <${ADMIN_TO}>`,
        to,
        subject,
        html,
        replyTo: replyTo || undefined,
      });
      await logEmailAttempt({ to: recipients, subject: String(subject || ""), status: "sent", from: ADMIN_TO, keySource: "gmail", id: info.messageId || null });
      return { id: info.messageId || null };
    } catch (err) {
      console.error("Gmail SMTP send failed, falling back to Resend:", err);
      await logEmailAttempt({ to: recipients, subject: String(subject || ""), status: "failed", from: ADMIN_TO, keySource: "gmail",
        error: `Gmail SMTP rejected the send (${err?.message || err}). Re-enter the Gmail app password in Settings › Notifications › Gmail sending; falling back to Resend.` });
    }
  }
  const fail = async (message, extra = {}) => {
    await logEmailAttempt({ to: recipients, subject: String(subject || ""), status: "failed", error: message, from: fromEmail, keySource, ...extra });
    throw new Error(message);
  };

  if (!apiKey || apiKey === "dummy_value" || !apiKey.startsWith("re_")) {
    await fail(explainEmailError("Missing API key", { fromEmail }));
  }

  const resend = new Resend(apiKey);

  // Every email gets the Riso Press shell (light/dark, accent and logo from Notifications › Email branding);
  // templates from compileEmailTemplate are already full documents.
  if (html && !/<html[\s>]/i.test(html)) {
    html = risoLayout(html, { logoUrl: brand.logoUrl || "", accent: brand.brandColor, theme: brand.emailTheme });
  }

  // If using a Resend onboarding key, force the sender to onboarding@resend.dev
  if (apiKey.startsWith("re_onb_")) {
    fromEmail = "onboarding@resend.dev";
  }

  const send = (fromAddress) => resend.emails.send({
    from: `${fromName} <${fromAddress}>`,
    to,
    subject,
    html,
    replyTo: replyTo || undefined
  }).catch(err => ({ data: null, error: { message: err?.message || String(err) } }));

  let response = await send(fromEmail);
  let usedSandbox = fromEmail === "onboarding@resend.dev";

  if (response.error && !usedSandbox) {
    const errorMsg = (response.error.message || "").toLowerCase();
    // If it's a domain validation / verification error, retry using the Resend sandbox address
    if (["verify", "domain", "sender", "from address", "unverified"].some(word => errorMsg.includes(word))) {
      console.warn(`Domain not verified for '${fromEmail}'. Retrying send via 'onboarding@resend.dev' sandbox fallback...`);
      const fallbackResponse = await send("onboarding@resend.dev");
      usedSandbox = true;
      if (!fallbackResponse.error) {
        await logEmailAttempt({ to: recipients, subject: String(subject || ""), status: "sent", from: "onboarding@resend.dev", keySource, id: fallbackResponse.data?.id || null,
          note: `${fromEmail.split("@")[1] || "Sender domain"} is not verified in Resend; sent from onboarding@resend.dev, which only reaches the Resend account owner.` });
        return fallbackResponse.data;
      }
      response = fallbackResponse; // If fallback also fails, report the fallback's error
    }
  }

  if (response.error) {
    console.error(`Resend rejected email to ${recipients}:`, response.error);
    await fail(explainEmailError(response.error.message, { fromEmail, usedSandbox }), usedSandbox ? { sandbox: true } : {});
  }
  await logEmailAttempt({ to: recipients, subject: String(subject || ""), status: "sent", from: usedSandbox ? "onboarding@resend.dev" : fromEmail, keySource, id: response.data?.id || null });
  return response.data;
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

// Country name or code -> ISO code. Unknown names give "" (never a guess: the
// old fallback turned every unrecognised country into "US", so French
// addresses were quoted as American and US-allowlisted live rates leaked abroad).
function getCountryCode(countryName) {
  const resolved = resolveCountry(countryName);
  if (resolved) return resolved.code;
  const clean = String(countryName || "").trim();
  return /^[a-z]{2}$/i.test(clean) ? clean.toUpperCase() : "";
}

function getStateCode(stateName) {
  const clean = (stateName || "").trim().toLowerCase();
  if (clean.length === 2) {
    return clean.toUpperCase();
  }
  return US_STATES[clean] || CA_PROVINCES[clean] || stateName.toUpperCase();
}

// fetch() with a hard timeout so a slow/hung third party can never stall a
// request that sits on the checkout critical path. Resolves/rejects like fetch;
// aborts (and throws) after `ms` milliseconds.
async function fetchWithTimeout(url, options = {}, ms = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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

// `calculateShipping` now lives in ./orderMath (pure + unit-tested).

// Region-aware tax matching: prefer a rate whose region matches the
// destination state/province, otherwise fall back to the country-wide rate.
function matchTaxRate(rates, country, state) {
  const normalizeCountry = value => {
    const clean = String(value || '').trim().toLowerCase();
    if (clean === 'ca' || clean === 'canada') return 'ca';
    if (['us', 'usa', 'united states', 'united states of america'].includes(clean)) return 'us';
    return clean;
  };
  const c = normalizeCountry(country);
  const countryRates = (rates || []).filter(
    r => normalizeCountry(r.country) === c
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
  const dateState = discountDateState(data);
  if (dateState === "not_started") throw new Error("This code is not active yet");
  if (dateState === "expired") throw new Error("This code has expired");
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

  // 1. BOGO Calculation
  if (discount.type === "bogo") {
    const buyQty = Number(discount.buyQuantity) || 1;
    const getQty = Number(discount.getQuantity) || 1;
    const getVal = bogoPercent(discount.getDiscountValue);

    let qualItems = [];
    if (discount.appliesTo === "categories") {
      const selected = discount.selectedCategories || [];
      qualItems = items.filter(i => {
        const cats = (booksById[i.id] && booksById[i.id].categories) || [];
        return cats.some(c => selected.includes(c));
      });
      if (qualItems.length === 0) {
        throw new Error("This BOGO code only applies to specific categories not in your cart.");
      }
    } else if (discount.appliesTo === "products") {
      const selected = discount.selectedProducts || [];
      qualItems = items.filter(i => selected.includes(i.id));
      if (qualItems.length === 0) {
        throw new Error("This BOGO code only applies to specific products not in your cart.");
      }
    } else {
      qualItems = items;
    }

    const unitPrices = [];
    qualItems.forEach(i => {
      for (let k = 0; k < i.quantity; k++) {
        unitPrices.push(i.price);
      }
    });

    const totalQualUnits = unitPrices.length;
    const requiredUnits = buyQty + getQty;
    if (totalQualUnits < requiredUnits) {
      throw new Error(`This code requires buying at least ${requiredUnits} qualifying items.`);
    }

    unitPrices.sort((a, b) => b - a);

    const sets = Math.floor(totalQualUnits / requiredUnits);
    const discountQty = sets * getQty;

    let discountAmount = 0;
    const cheapestUnits = unitPrices.slice(-discountQty);
    cheapestUnits.forEach(price => {
      discountAmount += price * (getVal / 100);
    });

    return discountAmount;
  }

  // 2. Tiered Calculation
  if (discount.type === "tiered") {
    const tiers = discount.tiers || [];
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return 0;
    }

    let qualSubtotal = subtotal;
    if (discount.appliesTo === "categories") {
      const selected = discount.selectedCategories || [];
      qualSubtotal = items.reduce((s, i) => {
        const cats = (booksById[i.id] && booksById[i.id].categories) || [];
        return cats.some(c => selected.includes(c)) ? s + i.price * i.quantity : s;
      }, 0);
      if (qualSubtotal === 0) {
        throw new Error("This tiered code only applies to specific categories not in your cart.");
      }
    } else if (discount.appliesTo === "products") {
      const selected = discount.selectedProducts || [];
      qualSubtotal = items.reduce(
        (s, i) => (selected.includes(i.id) ? s + i.price * i.quantity : s), 0
      );
      if (qualSubtotal === 0) {
        throw new Error("This tiered code only applies to specific products not in your cart.");
      }
    }

    const sortedTiers = [...tiers].sort((a, b) => Number(b.minSpend) - Number(a.minSpend));
    const matchingTier = sortedTiers.find(t => qualSubtotal >= Number(t.minSpend));

    if (!matchingTier) {
      const lowestMinSpend = Math.min(...tiers.map(t => Number(t.minSpend)));
      throw new Error(`This code requires a minimum spend of ${moneyFmt(lowestMinSpend)} on qualifying items.`);
    }

    const val = Number(matchingTier.value);
    if (matchingTier.type === "percentage") {
      return qualSubtotal * (val / 100);
    } else if (matchingTier.type === "fixed") {
      return Math.min(val, qualSubtotal);
    }
    return 0;
  }

  // 3. Legacy Percentage & Fixed Calculation
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
  return 0;
}

// "One use per customer": a customer (matched by email) who already has a paid order that used
// this code cannot use it again. Runs on the trusted server path only.
async function assertDiscountNotUsedByCustomer(discount, email) {
  if (!discount.onePerCustomer) return;
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) throw new Error("Enter your email address to use this code.");
  const snap = await db.collection("orders")
    .where("appliedDiscount.id", "==", discount.id)
    .where("customer.email", "==", normalized)
    .where("paymentStatus", "==", "paid")
    .limit(1)
    .get();
  if (!snap.empty) throw new Error("You have already used this code.");
}

// Enforce customer targeting on the trusted server path. Client validation is
// only an early UX hint and must never authorize a restricted promotion.
function validateDiscountCustomer(discount, email) {
  const normalized = String(email || "").trim().toLowerCase();
  const emails = String(discount.allowedCustomerEmails || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  const domains = String(discount.allowedEmailDomains || "").split(",").map(v => v.trim().toLowerCase().replace(/^[@.]+/, "")).filter(Boolean);
  if ((emails.length || domains.length) && !normalized) throw new Error("Enter your email address to use this code.");
  if (emails.length && !emails.includes(normalized)) throw new Error("This code is restricted to selected customers.");
  if (domains.length) {
    const customerDomain = normalized.split("@")[1] || "";
    if (!domains.some(domain => customerDomain === domain || customerDomain.endsWith(`.${domain}`))) throw new Error("This code is restricted to selected email domains.");
  }
}

const FALLBACK_RATES = {
  cad: 1.0,
  usd: 0.73,
  eur: 0.67,
};

async function getExchangeRates() {
  try {
    const res = await fetchWithTimeout("https://open.er-api.com/v6/latest/CAD", {}, 3000);
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

// What the customer is told to expect, saved on the order for the thank-you page,
// tracking page and emails. `days` is a carrier number or a profile range ("3-7").
function shippingEstimateOf(days, terms) {
  const cleanDays = days === undefined || days === null || days === "" ? "" : String(days).trim().slice(0, 20);
  const cleanTerms = String(terms || "").trim().slice(0, 200);
  return cleanDays || cleanTerms ? { days: cleanDays, terms: cleanTerms } : null;
}

// Server-authoritative shipping: quotes every configured rate for the cart and
// charges the one the customer selected (order.shippingMethod), else the
// cheapest. Profiles without zones keep the legacy flat calculation. Returns
// { cost, method } or throws when the destination can't be served.
async function resolveShipping(items, order, profiles, freeShipping, settings, discountedPhysical) {
  const address = order.customer && order.customer.address;
  const selection = order.fulfillmentSelection;
  const physicalItems = items.filter(isPhysicalItem);
  if (selection && selection.method !== 'shipping') {
    return resolveLocalSelection(settings.localFulfillment, selection, address, discountedPhysical, physicalItems, freeShipping);
  }
  if (!physicalItems.length) {
    if (selection && selection.method !== 'shipping') throw new Error('That fulfillment option is unavailable for digital orders.');
    return { cost: 0, method: null, fulfillment: null };
  }
  if (selection && (selection.method !== 'shipping' || /^(pickup|local_delivery):/.test(String(selection.optionId || '')))) throw new Error('Choose an available fulfillment option.');
  if (address) {
    const configDoc = await SHIPPO_CONFIG_DOC.get();
    const config = configDoc.exists ? configDoc.data() || {} : {};
    const destinationCountry = getCountryCode(address.country);
    const enabledCountries = Array.isArray(config.dynamicRateCountries) ? config.dynamicRateCountries : [];
    if (config.dynamicRatesEnabled === true && enabledCountries.includes(destinationCountry)) {
      // A free-shipping code covers whichever live carrier rate the shopper picked;
      // the profile rates below never contain carrier names, so they can't match it.
      if (freeShipping) return { cost: 0, method: String(selection?.optionId || order.shippingMethod || '').slice(0, 200) || null };
      const shippoToken = await getShippoToken();
      // No usable live rates (no token, Shippo down, no carrier quotes, or the shopper
      // was shown profile rates instead): fall through to the profile/zone rates below,
      // exactly as checkout does in the browser. The charge is still priced here.
      const liveQuote = shippoToken ? await (async () => {
      const settingsDoc = await db.collection("settings").doc("website").get();
      const settings = settingsDoc.data() || {};
      const origin = settings.location || {};
      const totalWeightLb = physicalItems.reduce((sum, item) => {
        const grams = Number(item.weightGrams);
        return sum + ((Number.isFinite(grams) && grams > 0 ? grams / 453.592 : 1.5) * (item.quantity || 1));
      }, 0);
      const shipment = await callShippo("shipments/", "POST", {
        address_from: {
          name: settings.info?.name || "Lyricalmyrical Books",
          street1: origin.street || "456 Montrose Ave",
          city: origin.city || "Toronto",
          state: getStateCode(origin.state || "ON"),
          zip: origin.zip || "M6G3H1",
          country: getCountryCode(origin.country || "CA"),
          phone: "6474096863",
          email: "lyricalmyricalbooks@gmail.com",
        },
        address_to: {
          name: order.customer?.name || "Customer",
          street1: address.street,
          city: address.city,
          state: getStateCode(address.state),
          zip: address.zip,
          country: destinationCountry,
        },
        parcels: [{ length: "10", width: "8", height: "2", distance_unit: "in", weight: Math.max(0.1, totalWeightLb).toFixed(1), mass_unit: "lb" }],
        async: false,
      }, shippoToken);
      const carrierQuotes = (shipment.rates || []).map(rate => ({
        name: `${rate.provider || ""} ${rate.servicelevel?.name || rate.servicelevel?.token || "Shipping"}`.trim(),
        price: Number(rate.amount),
        estimate: shippingEstimateOf(rate.estimated_days, rate.duration_terms),
      })).filter(rate => Number.isFinite(rate.price)).sort((a, b) => a.price - b.price);
      if (!carrierQuotes.length) return null;
      const selectedCarrier = selection?.optionId || order.shippingMethod;
      const pickedCarrier = selection ? carrierQuotes.find(quote => quote.name === selectedCarrier) : pickQuote(carrierQuotes, selectedCarrier);
      if (pickedCarrier) return { cost: pickedCarrier.price, method: pickedCarrier.name, estimate: pickedCarrier.estimate };
      // The shopper picked a profile rate (browser fallback) — price it from profiles below.
      const profileIds = new Set(quoteShipping(physicalItems, address, profiles, {}).flatMap(q => [q.id, q.name]));
      if (selection && profileIds.has(selection.optionId)) return null;
      throw new Error("That live carrier rate is no longer available. Please review the shipping options and try again.");
      })().catch(err => {
        if (/no longer available/.test(err.message)) throw err;
        console.warn("Live carrier rates unavailable, using profile rates:", err.message);
        return null;
      }) : null;
      if (liveQuote) return liveQuote;
    }
  }
  const hasZones = profiles.some((p) => Array.isArray(p.zones) && p.zones.length);
  if (!hasZones) {
    if (selection) {
      const choices = quoteShipping(physicalItems, address, profiles, { freeAll: !!freeShipping }).filter(quote => quote.type !== 'pickup');
      const chosen = choices.find(quote => quote.id === selection.optionId || quote.name === selection.optionId);
      if (!chosen) throw new Error('That shipping rate is no longer available. Please review the options and try again.');
      return { cost: chosen.price, method: chosen.name, estimate: shippingEstimateOf(chosen.deliveryDays) };
    }
    return { cost: freeShipping ? 0 : calculateShipping(physicalItems, address, profiles), method: order.shippingMethod || null };
  }
  const quotes = quoteShipping(physicalItems, address, profiles, { freeAll: !!freeShipping }).filter(quote => quote.type !== 'pickup');
  const selectedRate = selection?.optionId || order.shippingMethod;
  const picked = selection ? quotes.find(quote => quote.id === selectedRate || quote.name === selectedRate) : pickQuote(quotes, selectedRate);
  if (!picked) {
    throw new Error(`We don't currently ship these items to ${(address && address.country) || "that destination"}. Please contact us for a custom quote.`);
  }
  return { cost: picked.price, method: picked.name, estimate: shippingEstimateOf(picked.deliveryDays) };
}

function authoritativeTax(items, discountAmount, discount, booksById, settings, order, fulfillment) {
  const rates = settings.taxes?.rates || [];
  const discountedPhysical = discountedPhysicalSubtotal(items, discountAmount, discount, booksById);
  const taxableTotal = Math.max(0, items.reduce((sum, item) => sum + item.price * item.quantity, 0) - discountAmount);
  const address = order.customer?.address || {};
  if (fulfillment?.method === 'pickup') {
    const pickup = fulfillment.address;
    // Pickup limited to an area collects the shopper's address instead of a separate billing location.
    const given = order.customer?.billingAddress;
    const billing = given?.country && given?.state ? given : order.customer?.address;
    if (!billing || !billing.country || !billing.state) throw new Error('Billing country and province or state are required for pickup.');
    const physicalRate = matchTaxRate(rates, pickup.country, pickup.state);
    const digitalRate = matchTaxRate(rates, billing.country, billing.state);
    return discountedPhysical * (Number(physicalRate?.rate || 0) / 100) + (taxableTotal - discountedPhysical) * (Number(digitalRate?.rate || 0) / 100);
  }
  const basis = Object.keys(address).length ? address : order.customer?.billingAddress || {};
  if (!basis.country) throw new Error('Destination country is required for tax.');
  const taxRate = matchTaxRate(rates, basis.country, basis.state);
  return taxableTotal * (Number(taxRate?.rate || 0) / 100);
}

function itemWeightGrams(book, variant) {
  return parseWeightGrams(variant && variant.weight) ?? parseWeightGrams(book.weight);
}
function catalogFormat(book, variant) {
  if (variant?.format) return variant.format;
  if (/digital|ebook|e-book|epub|pdf|audiobook|paperback|hardcover|hardback|softcover/i.test(String(variant?.name || ''))) return variant.name;
  return book.format || '';
}
function catalogDigital(book, variant) {
  return variant?.digital === true || variant?.isDigital === true || (!variant && (book.digital === true || book.isDigital === true));
}

async function recalculateOrder(orderRef, order, checkoutCurrency) {
  const booksById = {};
  const items = [];
  for (const requested of order.items || []) {
    const bookDoc = await db.collection("books").doc(requested.id).get();
    if (!bookDoc.exists) throw new Error(`Book ${requested.title || requested.id} not found in library catalog.`);
    const book = bookDoc.data();
    booksById[requested.id] = book;
    const problem = purchaseProblem(book, requested.variantId);
    if (problem === "choose_edition") throw new Error(`Choose an edition of "${book.title || requested.id}" before checking out.`);
    if (problem) throw new Error(`"${book.title || requested.id}" is not available to buy right now. Please remove it from your bag.`);
    const quantity = Math.max(1, Math.min(99, Math.floor(Number(requested.quantity) || 1)));
    const variant = requested.variantId
      ? (book.variants || []).find(v => v.id === requested.variantId) || null
      : null;
    if (requested.variantId && !variant) throw new Error(`Selected edition for book ${requested.id} is no longer available.`);
    if (book.trackInventory && !book.allowBackorder) {
      const available = variant ? Number(variant.stock || 0) : Number(book.stockLevel || 0);
      if (available < quantity) throw new Error(`Insufficient stock for ${requested.title}. Only ${available} left.`);
    }
    const price = variant
      ? Number(variant.price)
      : (book.isOnSale && book.salePrice ? Number(book.salePrice) : Number(book.retailPrice));
    if (!Number.isFinite(price) || price < 0) throw new Error(`Book ${requested.id} is temporarily unavailable for purchase (pricing error).`);
    items.push({ ...requested, title: book.title || requested.title || "", variantName: variant ? (variant.name || null) : null, quantity, price, format: catalogFormat(book, variant), digital: catalogDigital(book, variant), isDigital: catalogDigital(book, variant), shippingProfileId: book.shippingProfileId || null, weightGrams: itemWeightGrams(book, variant) });
  }
  if (!items.length) throw new Error("Order has no items.");

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discount = 0;
  let appliedDiscount = null;
  let verifiedDiscount = null;
  if (order.appliedDiscount?.code) {
    // Same "Discount code error:" prefix as the Stripe path, so checkout can drop the code and explain.
    try {
      const verified = await fetchValidDiscount(order.appliedDiscount.code);
      verifiedDiscount = verified;
      validateDiscountCustomer(verified, order.customer?.email);
      await assertDiscountNotUsedByCustomer(verified, order.customer?.email);
      discount = computeDiscountAmount(verified, items, booksById);
      appliedDiscount = { id: verified.id, code: verified.code, type: verified.type, value: verified.value };
    } catch (discountErr) {
      throw new Error(`Discount code error: ${discountErr.message}`);
    }
  }
  const profilesSnap = await db.collection("shipping-profiles").get();
  const profiles = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const settingsDoc = await db.collection("settings").doc("website").get();
  const settings = settingsDoc.data() || {};
  const discountedPhysical = discountedPhysicalSubtotal(items, discount, verifiedDiscount, booksById);
  const shipResult = await resolveShipping(items, order, profiles, appliedDiscount?.type === "freeship", settings, discountedPhysical);
  const shipping = shipResult.cost;
  const tax = authoritativeTax(items, discount, verifiedDiscount, booksById, settings, order, shipResult.fulfillment);
  const total = subtotal - discount + shipping + tax;
  const rates = await getExchangeRates();
  const exchangeRate = rates[checkoutCurrency] || FALLBACK_RATES[checkoutCurrency] || 1;
  const convertedTotal = Math.round(total * exchangeRate * 100) / 100;
  const update = {
    items: items.map(({ shippingProfileId, ...item }) => item), subtotal, discount, appliedDiscount,
    shipping, tax, total, checkoutCurrency: checkoutCurrency.toUpperCase(), exchangeRate,
    ...(shipResult.method ? { shippingMethod: shipResult.method } : {}),
    shippingEstimate: shipResult.estimate || null,
    fulfillment: shipResult.fulfillment || null,
    updatedAt: new Date().toISOString(),
  };
  await orderRef.update(update);
  return { ...update, convertedTotal, settings };
}

async function markOrderPaidFromPayPal(orderId, paypalData) {
  const orderRef = db.collection("orders").doc(orderId);
  let paidTotal = null;
  await db.runTransaction(async transaction => {
    paidTotal = null; // a retried attempt must not keep the last attempt's value
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) throw new Error("Order not found.");
    const order = orderDoc.data();
    if (order.paymentStatus === "paid") return;
    if (order.paypalOrderId !== paypalData.paypalOrderId) throw new Error("PayPal order does not match checkout order.");
    const amountCheck = paidAmountCheck(order, toMinor(paypalData.capture?.amount?.value), paypalData.capture?.amount?.currency_code);
    if (!amountCheck.ok) {
      const at = new Date().toISOString();
      transaction.update(orderRef, {
        paymentMismatch: { ...amountCheck, provider: "paypal", captureId: paypalData.captureId || null, at },
        activity: [...(order.activity || []), { type: "event", message: `PayPal capture did not match the order total (expected ${amountCheck.expected.minor} ${amountCheck.expected.currency}, got ${amountCheck.paid.minor} ${amountCheck.paid.currency}). Not marked paid — review in PayPal.`, createdAt: at }],
        updatedAt: at,
      });
      console.error(`PayPal amount mismatch on order ${orderId}`, amountCheck);
      return;
    }

    const books = await readBooks(transaction, db, order.items);
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
    if (writeStock(transaction, db, order.items, books, -1, now)) transaction.update(orderRef, { oversold: true });
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
  // SHIPPO_API_TOKEN: live carrier rates are re-priced here; an undeclared secret reads as empty.
  { secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, SHIPPO_API_TOKEN] },
  async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    try {
      const { orderId, currency: requestedCurrency, returnUrl } = req.body || {};
      if (!orderId) return res.status(400).json({ error: "Missing orderId" });
      const currency = checkoutCurrencyOf(requestedCurrency);
      if (!currency) return res.status(400).json({ error: "Unsupported currency." });
      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) return res.status(404).json({ error: "Order not found" });
      const order = orderDoc.data();
      if (order.paymentStatus === "paid") return res.status(409).json({ error: "Order is already paid" });
      let priced;
      try {
        priced = await recalculateOrder(orderRef, order, currency);
      } catch (pricingErr) {
        return res.status(400).json({ error: pricingErr.message });
      }
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
        paypalCurrency: currency.toUpperCase(),
        // Capture marks the order paid only for exactly this amount and currency.
        expectedAmountMinor: toMinor(priced.convertedTotal.toFixed(2)), expectedCurrency: currency,
        updatedAt: new Date().toISOString(),
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
  // SHIPPO_API_TOKEN: live carrier rates are re-priced here; STRIPE_WEBHOOK_SECRET: webhook health reports it.
  { secrets: [STRIPE_SECRET_KEY, SHIPPO_API_TOKEN, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    if (req.body?.action === "status") return handleCheckoutStatus(req, res);
    if (req.body?.action === "registerPaymentDomain") return handleRegisterPaymentDomain(req, res);
    if (req.body?.action === "webhookHealth") return handleWebhookHealth(req, res);
    if (req.body?.action === 'createManualLocalOrder') {
      try {
        const source = req.body.orderDraft;
        if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Order details are required.');
        if (!Array.isArray(source.items) || !source.items.length || source.items.length > 50) throw new Error('Choose between 1 and 50 books.');
        const items = source.items.map(item => {
          if (typeof item?.id !== 'string' || !item.id || item.id.length > 160 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error('Check the selected books and quantities.');
          return { id: item.id, variantId: typeof item.variantId === 'string' ? item.variantId.slice(0, 160) : null, quantity: item.quantity };
        });
        const contact = source.customer || {};
        if (typeof contact.name !== 'string' || !contact.name.trim() || typeof contact.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) throw new Error('Customer name and email are required.');
        const cleanAddress = value => Object.fromEntries(['street', 'city', 'state', 'zip', 'country'].map(key => [key, typeof value?.[key] === 'string' ? value[key].trim().slice(0, 200) : '']));
        const selection = source.fulfillmentSelection;
        if (!['pickup', 'local_delivery'].includes(selection?.method) || typeof selection.optionId !== 'string') throw new Error('Choose a local fulfillment option.');
        const settingsDoc = await db.collection('settings').doc('website').get();
        const settings = settingsDoc.data() || {};
        const manual = (settings.payments?.manualMethods || []).find(method => method.id === req.body.manualMethodId && method.enabled === true);
        if (!manual) throw new Error('That payment method is no longer available.');
        const now = new Date().toISOString();
        const order = {
          customer: { name: contact.name.trim().slice(0, 200), email: contact.email.trim().toLowerCase().slice(0, 320), phone: typeof contact.phone === 'string' ? contact.phone.trim().slice(0, 80) : '', address: cleanAddress(contact.address), billingAddress: cleanAddress(contact.billingAddress) },
          items, fulfillmentSelection: { method: selection.method, optionId: selection.optionId },
          appliedDiscount: typeof source.appliedDiscount?.code === 'string' ? { code: source.appliedDiscount.code.slice(0, 100) } : null,
          ...(typeof source.orderNote === 'string' ? { orderNote: source.orderNote.slice(0, 500) } : {}),
          ...(typeof source.locale === 'string' ? { locale: source.locale.slice(0, 20) } : {}),
        };
        const priced = await recalculateOrder({ update: async () => {} }, order, checkoutCurrencyOf(req.body.currency) || 'cad');
        const { convertedTotal, settings: ignoredSettings, ...trusted } = priced;
        const orderId = crypto.randomBytes(12).toString('hex').toUpperCase();
        await db.collection('orders').doc(orderId).create({ ...order, ...trusted, orderId, paymentStatus: 'pending', status: 'pending_payment', paymentMethod: manual.name, paymentInstructions: manual.instructions || '', createdAt: now, updatedAt: now, activity: [{ type: 'event', message: 'Order created', createdAt: now }] });
        return res.status(200).json({ orderId, shipping: trusted.shipping, tax: trusted.tax, total: trusted.total, fulfillment: trusted.fulfillment });
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    const { orderId, currency: reqCurrency, returnUrl, embedded, paymentElement } = req.body;
    const checkoutCurrency = checkoutCurrencyOf(reqCurrency);
    if (!checkoutCurrency) {
      res.status(400).json({ error: "Unsupported currency." });
      return;
    }
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
      if (order.isTest === true) {
        res.status(400).json({ error: "Test orders cannot enter checkout." });
        return;
      }
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
        const problem = purchaseProblem(book, item.variantId);
        if (problem) {
          res.status(400).json({ error: problem === "choose_edition"
            ? `Choose an edition of "${book.title || item.title}" before checking out.`
            : `"${book.title || item.title}" is not available to buy right now. Please remove it from your bag.` });
          return;
        }

        let variant = null;
        if (item.variantId) {
          variant = (book.variants || []).find(v => v.id === item.variantId) || null;
          if (!variant) {
            res.status(400).json({ error: `Selected edition for book ${item.id} is no longer available.` });
            return;
          }
        }
        if (book.trackInventory && !book.allowBackorder) {
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
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          res.status(400).json({ error: `"${item.title}" is temporarily unavailable for purchase (pricing error).` });
          return;
        }
        items.push({
          ...item,
          // Names come from the catalog, never from the browser (they go into emails).
          title: book.title || item.title || "",
          variantName: variant ? (variant.name || null) : null,
          price: unitPrice,
          format: catalogFormat(book, variant),
          digital: catalogDigital(book, variant),
          isDigital: catalogDigital(book, variant),
          quantity: Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1))),
          shippingProfileId: book.shippingProfileId || null,
          weightGrams: itemWeightGrams(book, variant),
        });
      }

      const subtotalTrusted = items.reduce((s, i) => s + i.price * i.quantity, 0);

      // 2. Server-side discount validation (codes, limits, targeting)
      let discountAmount = 0;
      let appliedDiscount = null;
      let verifiedDiscount = null;
      if (order.appliedDiscount && order.appliedDiscount.code) {
        let discount;
        try {
          discount = await fetchValidDiscount(order.appliedDiscount.code);
          verifiedDiscount = discount;
          validateDiscountCustomer(discount, order.customer?.email);
          await assertDiscountNotUsedByCustomer(discount, order.customer?.email);
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
      let shippingCost;
      let shippingMethodCharged;
      let shippingEstimate = null;
      let fulfillment;
      const settingsDoc = await db.collection("settings").doc("website").get();
      const settings = settingsDoc.data() || {};
      try {
        const discountedPhysical = discountedPhysicalSubtotal(items, discountAmount, verifiedDiscount, booksById);
        const shipResult = await resolveShipping(items, order, profiles, appliedDiscount && appliedDiscount.type === "freeship", settings, discountedPhysical);
        shippingCost = shipResult.cost;
        shippingMethodCharged = shipResult.method;
        shippingEstimate = shipResult.estimate || null;
        fulfillment = shipResult.fulfillment || null;
      } catch (shipErr) {
        res.status(400).json({ error: shipErr.message });
        return;
      }

      // 4. Dynamic Tax Calculation (region-aware: state/province before country)
      let taxCost;
      try {
        taxCost = authoritativeTax(items, discountAmount, verifiedDiscount, booksById, settings, order, fulfillment);
      } catch (taxErr) {
        return res.status(400).json({ error: taxErr.message });
      }

      const finalTotal = subtotalTrusted - discountAmount + shippingCost + taxCost;
      const rates = await getExchangeRates();
      const exchangeRate = rates[checkoutCurrency] || FALLBACK_RATES[checkoutCurrency] || 1.0;

      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      let ipCountry = req.headers["x-appengine-country"] || "";
      if (!ipCountry && clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
        try {
          const firstIp = clientIp.split(",")[0].trim();
          // Soft signal only (sets ipCountryMatchesShipping); never let it
          // block the customer from reaching Stripe — short timeout + swallow.
          const ipRes = await fetchWithTimeout(`https://ip-api.com/json/${firstIp}`, {}, 2000);
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

      const shippingCountryCode = getCountryCode((fulfillment?.method === 'pickup' ? fulfillment.address : order.customer?.address)?.country || order.customer?.billingAddress?.country || '');
      const ipCountryMatchesShipping = !ipCountry || ipCountry.toUpperCase() === shippingCountryCode.toUpperCase();
      const testMode = settings.payments?.testMode || false;
      const stripeSettings = await withPrivateStripeKeys(settings.payments?.stripe);

      await orderRef.update({
        // Lower-case so "one use per customer" cannot be dodged by changing the email's capitalisation.
        ...(order.customer?.email ? { "customer.email": String(order.customer.email).trim().toLowerCase() } : {}),
        items: items.map(({ shippingProfileId, ...rest }) => rest),
        subtotal: subtotalTrusted,
        discount: discountAmount,
        appliedDiscount: appliedDiscount,
        shipping: shippingCost,
        ...(shippingMethodCharged ? { shippingMethod: shippingMethodCharged } : {}),
        shippingEstimate,
        fulfillment,
        tax: taxCost,
        total: finalTotal,
        checkoutCurrency: checkoutCurrency.toUpperCase(),
        exchangeRate: exchangeRate,
        stripeMode: testMode ? "test" : "live",
        clientIp: clientIp,
        ipCountry: ipCountry || null,
        ipCountryMatchesShipping: ipCountryMatchesShipping,
        updatedAt: new Date().toISOString()
      });

      // 5. Stripe checkout parameters
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

      // Payment Element on the checkout page: charge the same server-priced
      // total through a PaymentIntent instead of a Checkout Session.
      if (paymentElement) {
        const amount = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);
        const intent = await stripe.paymentIntents.create({
          amount,
          currency: checkoutCurrency,
          automatic_payment_methods: { enabled: true },
          receipt_email: order.customer?.email || undefined,
          description: `Order ${orderId}`,
          metadata: { order_id: orderId, checkout: "payment_element" },
        });
        // The webhook marks the order paid only for exactly this amount and currency.
        await orderRef.update({ stripePaymentIntentId: intent.id, expectedAmountMinor: amount, expectedCurrency: checkoutCurrency, updatedAt: new Date().toISOString() });
        res.status(200).json({ clientSecret: intent.client_secret, amount, currency: checkoutCurrency });
        return;
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

      await orderRef.update({
        expectedAmountMinor: lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0),
        expectedCurrency: checkoutCurrency,
        updatedAt: new Date().toISOString(),
      });
      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "payment",
        client_reference_id: orderId,
        customer_email: order.customer.email,
        // Let Stripe select eligible methods from Dashboard configuration.
        // Delayed methods remain unpaid until the success webhook settles them.
        payment_intent_data: {
          metadata: { order_id: orderId },
        },
        // Shorten the unpaid-stock-hold window: session dies after 30 minutes.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        // Embedded mode keeps the card form on the storefront's checkout page;
        // the webhook still receives checkout.session.completed either way.
        ...(embedded
          ? {
            ui_mode: "embedded",
            return_url: `${checkoutBase}${joiner}success=true&order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
          }
          : {
            success_url: `${checkoutBase}${joiner}success=true&order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${checkoutBase}${joiner}canceled=true`,
          }),
      });

      res.status(200).json({
        sessionId: session.id,
        url: session.url || null,
        clientSecret: embedded ? session.client_secret : null,
      });
    } catch (err) {
      console.error("Stripe Session Creation Failed:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Read-only status check for the checkout return page. Only reports on a
// session that belongs to the given order, and never marks anything paid —
// the webhook stays the single source of truth for payment.
// Admin-only: register the storefront domain with Stripe so Apple Pay and
// Google Pay appear in the card form. Only allowed origins can be registered.
// Served through createStripeCheckoutSession (body.action) so no new public
// function needs deploying — the CI deploy account can't set IAM on new ones.
const STRIPE_WEBHOOK_URL = "https://us-central1-lyricalmyrical-web-v2.cloudfunctions.net/stripeWebhook";

// Admin: checks (and with fix: true repairs) the Stripe webhook endpoint for the
// mode the shop is using. Repair adds missing events, re-enables a disabled
// endpoint, or creates the endpoint and saves its signing secret privately in
// adminSecrets/stripeWebhook so stripeWebhook can verify it.
async function handleWebhookHealth(req, res) {
  if (!await requireAdmin(req, res)) return;
  try {
    const testMode = await shopTestMode();
    const mode = testMode ? "test" : "live";
    const secret = await stripeSecretFor(mode);
    if (!secret) { res.status(400).json({ error: `Add your Stripe ${mode} secret key first.` }); return; }
    const stripe = new Stripe(secret);
    const listed = await stripe.webhookEndpoints.list({ limit: 100 });
    let report = webhookEndpointReport(listed.data, STRIPE_WEBHOOK_URL);
    const actions = [];
    // Stripe only reveals an endpoint's signing secret when it is created. If the
    // signatures keep failing, replace the endpoint so a known secret is saved.
    if (req.body?.recreate === true && report.found) {
      await stripe.webhookEndpoints.del(report.endpointId);
      report = webhookEndpointReport([], STRIPE_WEBHOOK_URL);
      actions.push("Removed the old webhook endpoint (its signing secret didn't match).");
    }
    if (req.body?.fix === true || req.body?.recreate === true) {
      if (!report.found) {
        const created = await stripe.webhookEndpoints.create({
          url: STRIPE_WEBHOOK_URL,
          enabled_events: REQUIRED_WEBHOOK_EVENTS,
          description: "Lyricalmyrical shop orders (created by Admin › Payments)",
        });
        await db.collection("adminSecrets").doc("stripeWebhook").set({ [mode]: created.secret, [`${mode}EndpointId`]: created.id, updatedAt: new Date().toISOString() }, { merge: true });
        actions.push("Created the webhook endpoint in Stripe and saved its signing secret.");
      } else {
        const update = {};
        if (report.missingEvents.length) {
          const current = (listed.data.find(e => e.id === report.endpointId)?.enabled_events) || [];
          update.enabled_events = Array.from(new Set([...current, ...report.missingEvents]));
          actions.push(`Turned on ${report.missingEvents.length} missing event${report.missingEvents.length === 1 ? "" : "s"}: ${report.missingEvents.join(", ")}.`);
        }
        if (!report.enabled) { update.disabled = false; actions.push("Re-enabled the endpoint."); }
        if (report.wrongUrl) { update.url = STRIPE_WEBHOOK_URL; actions.push("Pointed the endpoint at the shop's webhook address."); }
        if (Object.keys(update).length) await stripe.webhookEndpoints.update(report.endpointId, update);
      }
      const relisted = await stripe.webhookEndpoints.list({ limit: 100 });
      report = webhookEndpointReport(relisted.data, STRIPE_WEBHOOK_URL);
    }
    const status = (await db.collection("adminSecrets").doc("stripeWebhookStatus").get()).data() || {};
    const saved = await readAdminSecret("stripeWebhook");
    res.status(200).json({
      mode,
      url: STRIPE_WEBHOOK_URL,
      ...report,
      savedSecret: !!saved[mode],
      lastReceivedAt: status.lastReceivedAt || null,
      lastEventType: status.lastEventType || null,
      lastFailureAt: status.lastFailureAt || null,
      lastFailure: status.lastFailure || null,
      actions,
    });
  } catch (err) {
    console.error("Webhook health check failed:", err);
    res.status(500).json({ error: err.message });
  }
}

async function handleRegisterPaymentDomain(req, res) {
  {
    if (!await requireAdmin(req, res)) return;
    const origin = ALLOWED_ORIGINS.find(o => o === req.body?.origin);
    if (!origin) {
      res.status(400).json({ error: "That address isn't an allowed storefront origin." });
      return;
    }
    const domainName = new URL(origin).hostname;
    if (domainName === "localhost" || domainName === "127.0.0.1") {
      res.status(400).json({ error: "Wallets can't be registered for localhost." });
      return;
    }
    try {
      const settingsDoc = await db.collection("settings").doc("website").get();
      const settings = settingsDoc.exists ? settingsDoc.data() : {};
      const testMode = settings.payments?.testMode || false;
      const stripeSettings = await withPrivateStripeKeys(settings.payments?.stripe);
      const stripeSecret = testMode
        ? stripeSettings.testSecretKey
        : (stripeSettings.secretKey || STRIPE_SECRET_KEY.value());
      if (!stripeSecret) throw new Error("Stripe is not configured.");
      const stripe = new Stripe(stripeSecret);
      const existing = await stripe.paymentMethodDomains.list({ domain_name: domainName, limit: 1 });
      let domain = existing.data[0];
      if (!domain) domain = await stripe.paymentMethodDomains.create({ domain_name: domainName, enabled: true });
      else domain = await stripe.paymentMethodDomains.validate(domain.id);
      res.status(200).json({
        domain: domainName,
        applePay: domain.apple_pay?.status || "unknown",
        googlePay: domain.google_pay?.status || "unknown",
      });
    } catch (err) {
      console.error("Payment domain registration failed:", err);
      res.status(500).json({ error: err.message });
    }
  }
}

// Served through createStripeCheckoutSession (body.action) so no new public
// function needs deploying — the CI deploy account can't set IAM on new ones.
// Marks a Stripe-paid order paid: stock, discount usage, download token and
// analytics, once (idempotent — a repeat sees "paid" and only refreshes the
// Stripe ids). `session` is a Checkout Session, or a PaymentIntent shaped like
// one, that the server itself fetched from Stripe or received in a signed
// webhook — never browser data. The amount and currency must match the payment
// this order was created for.
async function markStripeOrderPaid(orderId, session, opts = {}) {
    const orderRef = db.collection("orders").doc(orderId);
    let paidTotal = null;

    await db.runTransaction(async transaction => {
      paidTotal = null; // a retried attempt must not keep the last attempt's value
      // Firestore transactions require ALL reads before any writes.
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) return;
      const order = orderDoc.data();
      const now = new Date().toISOString();
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null;
      const stripeTransaction = {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeAccountId: opts.account || null,
        stripeMode: session.livemode ? "live" : "test",
        stripeAmountTotal: session.amount_total,
        stripeCurrency: session.currency,
        updatedAt: now,
      };

      if (order.paymentStatus === "paid") {
        transaction.update(orderRef, stripeTransaction);
        return;
      }

      const amountCheck = paidAmountCheck(order, session.amount_total, session.currency);
      if (!amountCheck.ok) {
        transaction.update(orderRef, {
          ...stripeTransaction,
          paymentMismatch: { ...amountCheck, provider: "stripe", paymentIntentId, at: now },
          activity: [...(order.activity || []), { type: "event", message: `Stripe payment did not match the order total (expected ${amountCheck.expected.minor} ${amountCheck.expected.currency}, got ${amountCheck.paid.minor} ${amountCheck.paid.currency}). Not marked paid — refund or review in Stripe.`, createdAt: now }],
        });
        console.error(`Stripe amount mismatch on order ${orderId}`, amountCheck);
        return;
      }

      const itemList = order.items || [];
      const books = await readBooks(transaction, db, itemList);

      let discountRef = null;
      let discountDoc = null;
      if (order.appliedDiscount?.id) {
        discountRef = db.collection("discounts").doc(order.appliedDiscount.id);
        discountDoc = await transaction.get(discountRef);
      }

      // Single-use token securing digital download links in emails.
      const downloadToken = crypto.randomBytes(32).toString("hex");

      transaction.update(orderRef, {
        ...stripeTransaction,
        paymentStatus: "paid",
        fulfillmentStatus: "paid",
        status: "open",
        downloadToken,
        stripePaymentIntentId: session.payment_intent || null,
        paidAt: now,
        updatedAt: now,
        activity: [
          ...(order.activity || []),
          { type: "event", message: opts.message, createdAt: now }
        ]
      });

      // Atomic stock decrement, one write per book (two editions of a book both count).
      if (writeStock(transaction, db, itemList, books, -1, now)) transaction.update(orderRef, { oversold: true });

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
  return paidTotal !== null;
}

// Brings a paid order in line with what Stripe says happened to its charge after
// payment: a full refund (order refunded + cancelled, stock back, revenue
// reversed — once), a partial refund (amount recorded, order stays paid), or a
// dispute (status recorded). Used by the charge.refunded webhook AND by the
// direct Stripe checks, so a missed webhook can't leave a refunded order "Paid".
async function syncStripeReversal(orderId, { charge, dispute = null, source }) {
  const r = reversalState(charge, dispute);
  const orderRef = db.collection("orders").doc(orderId);
  let reversal = null;
  await db.runTransaction(async transaction => {
    reversal = null;
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) return;
    const order = orderDoc.data();
    const now = new Date().toISOString();
    const notes = [];
    const update = {};

    if (r.disputeStatus && r.disputeStatus !== order.disputeStatus) {
      update.disputeStatus = r.disputeStatus;
      if (dispute?.id) update.disputeId = dispute.id;
      notes.push(`Stripe dispute ${r.disputeStatus.replace(/_/g, " ")} (${source}).`);
    }

    if (r.fullyRefunded && order.paymentStatus === "paid") {
      const itemList = order.items || [];
      const shouldRestock = order.inventoryRestockedAt == null;
      const books = shouldRestock ? await readBooks(transaction, db, itemList) : new Map();
      if (shouldRestock) writeStock(transaction, db, itemList, books, 1, now);
      Object.assign(update, {
        paymentStatus: "refunded",
        status: "cancelled",
        refundedAt: now,
        refundedBy: "stripe-dashboard",
        refundedAmountMinor: r.refundedMinor,
        ...(shouldRestock ? { inventoryRestockedAt: now } : {}),
      });
      notes.push(`Refund synced from Stripe (${(r.refundedMinor / 100).toFixed(2)} ${r.currency})${shouldRestock ? "; inventory restocked" : ""} — ${source}.`);
      reversal = { revenue: Number(order.total) || 0, paidDay: typeof order.paidAt === "string" ? order.paidAt.split("T")[0] : null };
    } else if (r.partiallyRefunded && order.paymentStatus === "paid" && (order.refundedAmountMinor || 0) !== r.refundedMinor) {
      update.refundedAmountMinor = r.refundedMinor;
      update.partiallyRefunded = true;
      notes.push(`Partial refund in Stripe: ${(r.refundedMinor / 100).toFixed(2)} ${r.currency} of ${(r.amountMinor / 100).toFixed(2)}. Order stays paid — adjust what you ship (${source}).`);
    }

    if (!notes.length) return;
    transaction.update(orderRef, {
      ...update,
      updatedAt: now,
      activity: [...(order.activity || []), ...notes.map(message => ({ type: "event", message, createdAt: now }))],
    });
  });

  if (reversal) {
    const day = reversal.paidDay || new Date().toISOString().split("T")[0];
    await db.collection("analytics").doc(day).set({
      date: day,
      orders: admin.firestore.FieldValue.increment(-1),
      revenue: admin.firestore.FieldValue.increment(-(reversal.revenue || 0)),
      refunds: admin.firestore.FieldValue.increment(1),
      refundedRevenue: admin.firestore.FieldValue.increment(reversal.revenue || 0),
    }, { merge: true });
  }
  return r;
}

// Asks Stripe for a paid order's charge (and any dispute) and syncs refunds/disputes.
async function checkStripeReversal(orderId, order, source) {
  const pi = String(order.stripePaymentIntentId || "");
  if (!pi.startsWith("pi_")) return null;
  const testMode = await shopTestMode();
  for (const mode of modesToTry(order, testMode)) {
    const secret = await stripeSecretFor(mode);
    if (!secret) continue;
    const stripe = new Stripe(secret);
    try {
      const intent = await stripe.paymentIntents.retrieve(pi, { expand: ["latest_charge"] });
      if (intent.metadata?.order_id !== orderId) return null;
      const charge = intent.latest_charge && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
      if (!charge) return null;
      let dispute = null;
      if (charge.disputed) {
        const list = await stripe.disputes.list({ payment_intent: pi, limit: 1 });
        dispute = list.data[0] || null;
      }
      await db.collection("orders").doc(orderId).update({ stripeCheckedAt: new Date().toISOString() });
      return await syncStripeReversal(orderId, { charge, dispute, source });
    } catch (err) {
      if (err?.code === "resource_missing" || err?.statusCode === 404 || err?.type === "StripeAuthenticationError") continue;
      throw err;
    }
  }
  return null;
}

async function handleCheckoutStatus(req, res) {
  let { orderId, sessionId, paymentIntentId } = req.body || {};
  if (typeof orderId !== "string" || !orderId || orderId.includes("/")) {
    res.status(400).json({ error: "Missing orderId" });
    return;
  }
  try {
    const orderSnap = await db.collection("orders").doc(orderId).get();
    if (!orderSnap.exists) { res.status(404).json({ error: "Order not found" }); return; }
    const saved = orderSnap.data() || {};
    if (saved.paymentStatus === "paid") {
      // Already paid: still ask Stripe whether it was since refunded or disputed.
      const r = await checkStripeReversal(orderId, saved, "checked from the order page").catch(err => { console.warn("Reversal check failed:", err.message); return null; });
      res.status(200).json({ status: "complete", paymentStatus: r?.fullyRefunded ? "refunded" : "paid", reversal: r || null });
      return;
    }
    // The tracking page and the admin may only know the order number: fall back to
    // the payment ids this server saved on the order when it created the payment.
    if (!(typeof paymentIntentId === "string" && paymentIntentId.startsWith("pi_"))) paymentIntentId = "";
    if (!(typeof sessionId === "string" && sessionId.startsWith("cs_"))) sessionId = "";
    if (!paymentIntentId && !sessionId) {
      paymentIntentId = typeof saved.stripePaymentIntentId === "string" && saved.stripePaymentIntentId.startsWith("pi_") ? saved.stripePaymentIntentId : "";
      sessionId = typeof saved.stripeCheckoutSessionId === "string" && saved.stripeCheckoutSessionId.startsWith("cs_") ? saved.stripeCheckoutSessionId : "";
    }
    if (!paymentIntentId && !sessionId) {
      res.status(200).json({ status: "open", paymentStatus: "unpaid" });
      return;
    }

    const found = await retrieveOrderPayment(orderId, saved, paymentIntentId ? { paymentIntentId } : { sessionId });
    if (!found) { res.status(404).json({ error: "Payment not found" }); return; }

    if (found.intent) {
      const intent = found.intent;
      // Stripe itself says this order's payment succeeded: finish the order now
      // rather than leaving it "unpaid" if the webhook was missed or delayed.
      // Same idempotent, amount-checked path the webhook uses.
      let marked = false;
      if (intent.status === "succeeded") {
        await markStripeOrderPaid(orderId, intentAsSession(intent), { message: "Payment confirmed with Stripe (checked from the order page)" });
        marked = true;
      }
      const status = intent.status === "succeeded" || intent.status === "processing" ? "complete" : "open";
      res.status(200).json({ status, paymentStatus: intent.status, mode: found.mode, checked: marked });
      return;
    }
    const session = found.session;
    if (session.payment_status === "paid") {
      await markStripeOrderPaid(orderId, session, { message: "Payment confirmed with Stripe (checked from the order page)" });
    }
    res.status(200).json({ status: session.status, paymentStatus: session.payment_status, mode: found.mode });
  } catch (err) {
    console.error("Stripe status check failed:", err);
    res.status(500).json({ error: err.message });
  }
}

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
        const stripeSettings = await withPrivateStripeKeys(settings.payments?.stripe);
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

    // Test and live endpoints each sign with their own secret: accept the deployed
    // Functions secret and the endpoint secrets saved by Settings › Payments ›
    // "Check & fix webhook". A signature must still verify against one of them.
    const savedSecrets = await readAdminSecret("stripeWebhook");
    let deployedSecret = "";
    try { deployedSecret = STRIPE_WEBHOOK_SECRET.value(); } catch { /* not set */ }
    const secrets = signingSecrets(deployedSecret, savedSecrets.live, savedSecrets.test);
    let event;
    let lastError = null;
    for (const secret of secrets) {
      try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!event) {
      const message = lastError?.message || "No webhook signing secret is configured.";
      console.error("Signature verification failed:", message);
      // Leave a trace the admin can see (Settings › Payments › Webhook health).
      await db.collection("adminSecrets").doc("stripeWebhookStatus").set({
        lastFailureAt: new Date().toISOString(),
        lastFailure: `Signature check failed: ${String(message).slice(0, 300)}`,
      }, { merge: true }).catch(() => {});
      res.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    // Event-level idempotency: Stripe can deliver the same event more than once.
    // Mirror the PayPal webhook's dedupe so each event is processed at most once.
    const stripeEventRef = db.collection("payment-webhook-events").doc(`stripe-${event.id}`);
    if ((await stripeEventRef.get()).exists) {
      res.json({ received: true, duplicate: true });
      return;
    }

    // Stripe-side outcomes that never mark an order paid: record them on the
    // order timeline so the admin can see what happened.
    const noteOnOrder = async (orderId, message, extra = {}) => {
      if (!orderId) return;
      const ref = db.collection("orders").doc(orderId);
      await db.runTransaction(async t => {
        const snap = await t.get(ref);
        if (!snap.exists) return;
        const now = new Date().toISOString();
        t.update(ref, {
          ...extra,
          updatedAt: now,
          activity: [...(snap.data().activity || []), { type: "event", message, createdAt: now }],
        });
      });
    };

    try {
      if (event.type === "checkout.session.expired") {
        await noteOnOrder(event.data.object.client_reference_id, "Stripe Checkout session expired without payment.");
      } else if (event.type === "checkout.session.async_payment_failed") {
        await noteOnOrder(event.data.object.client_reference_id, "Delayed payment failed (Stripe).", { paymentStatus: "failed" });
      } else if (event.type === "payment_intent.payment_failed" && event.data.object?.metadata?.checkout === "payment_element") {
        const reason = event.data.object.last_payment_error?.message || "unknown reason";
        await noteOnOrder(event.data.object.metadata.order_id, `Card payment attempt failed (Stripe): ${reason}`);
      } else if (event.type.startsWith("charge.dispute.")) {
        const dispute = event.data.object;
        const piId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
        if (piId) {
          const snap = await db.collection("orders").where("stripePaymentIntentId", "==", piId).limit(1).get();
          if (!snap.empty) {
            await noteOnOrder(snap.docs[0].id,
              event.type === "charge.dispute.created"
                ? `Stripe dispute opened (${(dispute.amount / 100).toFixed(2)} ${(dispute.currency || "").toUpperCase()}, reason: ${dispute.reason || "unknown"}). Respond in the Stripe Dashboard before the evidence deadline.`
                : `Stripe dispute is now ${String(dispute.status || "updated").replace(/_/g, " ")}.`,
              { disputeStatus: dispute.status || "needs_response", disputeId: dispute.id });
          }
        }
      }
    } catch (err) {
      console.error(`Failed to record ${event.type}:`, err);
      res.status(500).send(`Webhook failure: ${err.message}`);
      return;
    }

    // Any succeeded PaymentIntent that names one of our orders settles it (card form
    // or hosted Checkout — a duplicate of checkout.session.completed is a no-op).
    const isElementPayment = !!paidIntentOrderId(event);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded" || isElementPayment) {
      // A succeeded intent is shaped into the session fields used below.
      const session = isElementPayment ? intentAsSession(event.data.object) : event.data.object;
      const orderId = session.client_reference_id;
      // completed can fire before delayed methods settle; only paid sessions count.
      const settled = session.payment_status === "paid" || session.payment_status === "no_payment_required";

      if (orderId && settled) {
        try {
          await markStripeOrderPaid(orderId, session, { account: event.account || null, message: isElementPayment ? "Payment completed (Stripe card form)" : "Payment completed (Stripe Webhook)" });
          console.log(`Order ${orderId} successfully processed via webhook.`);
        } catch (err) {
          console.error("Failed to process order update in transaction:", err);
          res.status(500).send(`Transaction failure: ${err.message}`);
          return;
        }
      }
    }

    // Refunds issued directly from the Stripe Dashboard (or by any other path)
    // arrive as charge.refunded — sync them back so the order, inventory, and
    // analytics don't drift out of "paid".
    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id || null;
      if (paymentIntentId) {
        try {
          const snap = await db.collection("orders")
            .where("stripePaymentIntentId", "==", paymentIntentId).limit(1).get();
          if (!snap.empty) await syncStripeReversal(snap.docs[0].id, { charge, source: "Stripe webhook" });
        } catch (err) {
          console.error("Failed to sync charge.refunded:", err);
          res.status(500).send(`Refund sync failure: ${err.message}`);
          return;
        }
      }
    }

    // Mark this event processed (after successful handling) for idempotency.
    await stripeEventRef.set({
      eventType: event.type,
      stripeEventId: event.id,
      processedAt: new Date().toISOString(),
    });
    await db.collection("adminSecrets").doc("stripeWebhookStatus").set({
      lastReceivedAt: new Date().toISOString(),
      lastEventType: event.type,
      lastMode: event.livemode ? "live" : "test",
    }, { merge: true }).catch(() => {});

    res.json({ received: true });
  }
);

// ──────────────────────────────────────────────────────────────
// 3. HTTP Endpoint: Refund a paid Stripe order (admin only)
// ──────────────────────────────────────────────────────────────
exports.refundOrder = onRequest(
  { secrets: [STRIPE_SECRET_KEY] },
  async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const adminUser = await requireAdmin(req, res);
    if (!adminUser) return;

    const { orderId, reason, restock = true } = req.body || {};
    if (!orderId) {
      res.status(400).json({ error: "Missing orderId" });
      return;
    }

    const orderRef = db.collection("orders").doc(orderId);
    try {
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const order = orderDoc.data();
      if (order.paymentStatus !== "paid") {
        res.status(409).json({
          error: order.paymentStatus === "refunded"
            ? "This order has already been refunded."
            : "Only paid orders can be refunded.",
        });
        return;
      }
      if (!order.stripePaymentIntentId) {
        res.status(409).json({ error: "This order does not have a saved Stripe Payment Intent ID." });
        return;
      }

      const stripeMode = order.stripeMode === "test" ? "test" : "live";
      const { stripe, requestOptions } = await getStripeClientForMode(
        stripeMode,
        order.stripeAccountId || null,
      );
      const idempotencyKey = `order-refund-${orderId}-full`;
      const refund = await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          order_id: orderId,
          admin_email: adminUser.email || "",
          reason: String(reason || "Admin refund").slice(0, 500),
        },
      }, {
        ...requestOptions,
        idempotencyKey,
      });

      if (!["succeeded", "pending"].includes(refund.status)) {
        throw new Error(`Stripe refund was not accepted (status: ${refund.status}).`);
      }

      const result = await db.runTransaction(async transaction => {
        const freshOrderDoc = await transaction.get(orderRef);
        if (!freshOrderDoc.exists) throw new Error("Order not found");
        const freshOrder = freshOrderDoc.data();

        if (freshOrder.refund?.id === refund.id || freshOrder.paymentStatus === "refunded") {
          return { alreadyRecorded: true, order: freshOrder };
        }
        if (freshOrder.paymentStatus !== "paid") {
          throw new Error("Order is no longer eligible for a refund.");
        }

        const itemList = freshOrder.items || [];
        const shouldRestock = restock !== false && freshOrder.inventoryRestockedAt == null;
        const books = shouldRestock ? await readBooks(transaction, db, itemList) : new Map();

        let discountRef = null;
        let discountDoc = null;
        const shouldReverseDiscount =
          freshOrder.appliedDiscount?.id && freshOrder.discountUsageReversedAt == null;
        if (shouldReverseDiscount) {
          discountRef = db.collection("discounts").doc(freshOrder.appliedDiscount.id);
          discountDoc = await transaction.get(discountRef);
        }

        const now = new Date().toISOString();
        if (shouldRestock) writeStock(transaction, db, itemList, books, 1, now);

        if (discountRef && discountDoc?.exists) {
          transaction.update(discountRef, {
            usageCount: Math.max(0, (Number(discountDoc.data().usageCount) || 0) - 1),
            updatedAt: now,
          });
        }

        const refundAmount = refund.amount / 100;
        const actor = adminUser.email || adminUser.uid;
        const stripePaymentStatus = refund.status === "succeeded" ? "refunded" : "refund_pending";
        transaction.update(orderRef, {
          paymentStatus: stripePaymentStatus,
          status: "cancelled",
          refund: {
            id: refund.id,
            amount: refundAmount,
            currency: refund.currency?.toUpperCase() || freshOrder.checkoutCurrency || "CAD",
            reason: String(reason || "Admin refund").slice(0, 500),
            status: refund.status,
            actor,
            createdAt: now,
          },
          refundedAt: now,
          refundedBy: actor,
          ...(shouldRestock ? {
            inventoryRestockedAt: now,
            restockedItems: itemList.map(item => ({
              id: item.id,
              variantId: item.variantId || null,
              quantity: Number(item.quantity) || 0,
            })),
          } : {}),
          ...(shouldReverseDiscount ? { discountUsageReversedAt: now } : {}),
          updatedAt: now,
          activity: [
            ...(freshOrder.activity || []),
            {
              type: "event",
              message: `Stripe refund ${refund.id} ${refund.status} for ${refundAmount.toFixed(2)} ${refund.currency?.toUpperCase() || ""}${shouldRestock ? "; inventory restocked" : ""}.`,
              createdAt: now,
              actor,
            },
          ],
        });
        // Reverse the analytics this order contributed at payment time. Revenue
        // was recorded as `order.total` (base currency), so we reverse the same
        // figure — not the Stripe refund amount, which is in checkout currency.
        return {
          alreadyRecorded: false,
          reversedRevenue: Number(freshOrder.total) || 0,
          paidDay: typeof freshOrder.paidAt === "string" ? freshOrder.paidAt.split("T")[0] : null,
        };
      });

      // Net out revenue/order count for refunds. Keyed by the original paid day
      // when known (so each day's net is correct), else today.
      if (!result.alreadyRecorded) {
        const day = result.paidDay || new Date().toISOString().split("T")[0];
        await db.collection("analytics").doc(day).set({
          date: day,
          orders: admin.firestore.FieldValue.increment(-1),
          revenue: admin.firestore.FieldValue.increment(-(result.reversedRevenue || 0)),
          refunds: admin.firestore.FieldValue.increment(1),
          refundedRevenue: admin.firestore.FieldValue.increment(result.reversedRevenue || 0),
        }, { merge: true });
      }

      res.status(200).json({
        refundId: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency?.toUpperCase(),
        status: refund.status,
        alreadyRecorded: result.alreadyRecorded,
      });
    } catch (err) {
      console.error("refundOrder failed:", err);
      const status = err.type?.startsWith("Stripe") ? 400 : 500;
      res.status(status).json({ error: err.message || "Refund failed" });
    }
  },
);

// ──────────────────────────────────────────────────────────────
// 4. HTTP Endpoint: Secure Digital Ebook Asset Downloads
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
    brandColor: "#e8402a",
    emailTheme: "light"
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
    body: "Hi {{customer_name}},\n\nGood news! Your order {{order_id}} has shipped with {{tracking_carrier}} and is on its way.\n\nTracking number: {{tracking_number}}\n\nUse the button below to follow your parcel on the carrier's website.",
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
  contact_reply: {
    subject: "We got your message",
    body: "Hi {{customer_name}},\n\nThanks for getting in touch with Lyricalmyrical Books! We've received your message and will reply as soon as we can.\n\nYour message:\n{{message}}",
    buttonText: "",
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

// Studio › Style › Customer accounts. On unless the published design turns it off.
async function customerAccountsEnabled() {
  try {
    const design = (await db.collection("settings").doc("website").get()).data()?.design || {};
    return (design.storefront?.customerAccounts ?? design.customerAccounts) !== false;
  } catch (err) {
    console.warn("Could not read customer-accounts setting:", err);
    return true;
  }
}

// Keep in step with src/app/lib/tracking.ts. A publisher-entered link (manual
// dispatch with a carrier we don't recognise) wins over the built-in pages.
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

// How the order reaches the customer, for the order confirmation email.
function deliveryDetails(order) {
  const local = order.fulfillment || {};
  if (local.method === "pickup") {
    const a = local.address || {};
    return {
      heading: "Pickup",
      method: local.name || "Pickup",
      estimate: local.estimate || "",
      lines: [local.name, [a.street, a.city, a.state, a.zip].filter(Boolean).join(", "), local.hours, local.estimate, "We'll email you when your order is ready to collect."].filter(Boolean),
    };
  }
  if (local.method === "local_delivery") {
    return { heading: "Local delivery", method: local.name || "Local delivery", estimate: local.estimate || "", lines: [local.name, local.estimate].filter(Boolean) };
  }
  if (!order.shippingMethod) return { heading: "", method: "", estimate: "", lines: [] };
  const est = order.shippingEstimate || {};
  const days = String(est.days || "").trim();
  const estimate = days ? `${days} business day${days === "1" ? "" : "s"} after dispatch` : String(est.terms || "").trim();
  const a = order.customer?.address || {};
  return {
    heading: "Shipping",
    method: order.shippingMethod,
    estimate,
    lines: [order.shippingMethod, estimate && `Expected delivery: ${estimate}`, [a.street, a.city, a.state, a.zip, a.country].filter(Boolean).join(", "), "We'll email your tracking number as soon as it ships."].filter(Boolean),
  };
}

// Public storefront address for links in emails. Override with the SITE_URL env var
// (functions/.env) when the shop moves to its own domain.
const SITE_URL = String(process.env.SITE_URL || "https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial").replace(/\/+$/, "");
const siteLink = path => `${SITE_URL}${path}`;

// One-click order link for emails: /track opens the order straight away when the
// key matches, instead of asking the customer to type the order number and email.
async function orderTrackUrl(orderId, order) {
  let key = typeof order?.trackingKey === "string" && /^[a-f0-9]{32}$/.test(order.trackingKey) ? order.trackingKey : "";
  if (!key) {
    key = crypto.randomBytes(16).toString("hex");
    try {
      await db.collection("orders").doc(orderId).update({ trackingKey: key });
    } catch (err) {
      console.warn("Could not save order tracking key", err);
      return siteLink(`/track?orderId=${encodeURIComponent(orderId)}`);
    }
  }
  return siteLink(`/track?orderId=${encodeURIComponent(orderId)}&key=${key}`);
}

function getTrackingUrl(carrier, trackingNum, customUrl) {
  try {
    const custom = new URL(String(customUrl || "").trim());
    if (custom.protocol === "https:" || custom.protocol === "http:") return custom.toString();
  } catch (_) { /* no usable custom link */ }
  // Shippo reports carriers as tokens ("canada_post"), people type "Canada Post".
  const cleanCarrier = (carrier || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  const cleanNum = (trackingNum || "").trim();
  if (cleanCarrier.includes("purolator")) {
    return `https://www.purolator.com/en/shipping/tracker?pin=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("canpar")) {
    return `https://www.canpar.com/en/tracking/delivery_options.htm?barcode=${encodeURIComponent(cleanNum)}`;
  }
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
  const brandColor = brand.brandColor || "#e8402a";
  
  const template = settings[templateId] || DEFAULT_NOTIFICATIONS[templateId];
  let subject = template.subject || DEFAULT_NOTIFICATIONS[templateId].subject;
  let body = template.body || DEFAULT_NOTIFICATIONS[templateId].body;
  let buttonText = template.buttonText !== undefined ? template.buttonText : DEFAULT_NOTIFICATIONS[templateId].buttonText;
  let signoff = template.signoff || DEFAULT_NOTIFICATIONS[templateId].signoff;

  // Replace placeholders in subject and body
  // Values are shopper-controlled (names, messages, statuses): HTML-escaped in the
  // body, newline-stripped in the subject. A replacer function keeps "$" literal.
  // items_table is the one var built here as trusted HTML.
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const text = String(value ?? "");
    subject = subject.replace(regex, () => text.replace(/[\r\n]+/g, " "));
    body = body.replace(regex, () => (key === "items_table" ? text : escapeHtml(text)));
  }

  const ctaButtonHtml = buttonText && vars.button_url ? risoButton(vars.button_url, buttonText, brandColor, brand.emailTheme) : "";

  let itemsTableHtml = "";
  if (vars.items_table) {
    itemsTableHtml = vars.items_table;
  }

  const finalBody = body.replace(/\n/g, "<br/>");
  const signoffHtml = signoff.replace(/\n/g, "<br/>");

  const html = risoLayout(`
    <p style="margin-top:0;">${finalBody}</p>
    ${ctaButtonHtml}
    ${itemsTableHtml}
    ${additionalSection || ""}
    <p style="margin-top:30px;font-weight:600;">${signoffHtml}</p>
  `, { logoUrl, accent: brandColor, theme: brand.emailTheme });

  return { subject, html };
}


// [Duplicate exports.onOrderCreated removed; logic consolidated in export at bottom]

// ──────────────────────────────────────────────────────────────
// 5b. Order Paid: Trigger notifications only AFTER successful payment
// ──────────────────────────────────────────────────────────────
exports.onOrderUpdated = onDocumentUpdated(
  { document: "orders/{orderId}", secrets: [RESEND_API_KEY, SHIPPO_API_TOKEN] },
  async event => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const orderId = event.params.orderId;

    if (after.isTest === true) return;
    if (!after.customer?.email) return;

    const notificationSettings = await loadNotificationSettings();
    let trackUrlPromise;
    const trackUrl = () => (trackUrlPromise = trackUrlPromise || orderTrackUrl(orderId, after));

    // 1. Order Confirmation (Order Paid)
    const becamePaid = before.paymentStatus !== "paid" && after.paymentStatus === "paid";
    // A paid order ends its checkout cart, so abandonedCartSweep never emails a paying customer.
    if (becamePaid && typeof after.cartId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(after.cartId)) {
      try {
        await db.collection("abandoned-carts").doc(after.cartId).set({ recovered: true, recoveredAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.warn("Could not mark checkout cart recovered", err);
      }
    }
    if (becamePaid) {
      try {
        await autoApproveShippingAddress(orderId, after);
      } catch (err) {
        console.warn("Automatic address check failed; publisher review stays required", err);
      }
    }
    if (becamePaid) {
      // If it is a manual payment method, decrement stock levels
      const isManual = after.paymentMethod && after.paymentMethod !== "Stripe" && after.paymentMethod !== "PayPal";
      if (isManual && after.inventoryDecrementedAt == null) {
        const itemList = after.items || [];
        try {
          await db.runTransaction(async transaction => {
            const books = await readBooks(transaction, db, itemList);
            const oversold = writeStock(transaction, db, itemList, books, -1, new Date().toISOString());
            if (oversold) transaction.update(db.collection("orders").doc(orderId), { oversold: true });
            // Mark as decremented on the order document
            transaction.update(db.collection("orders").doc(orderId), {
              inventoryDecrementedAt: new Date().toISOString()
            });
          });
          console.log(`Successfully decremented inventory for manual order ${orderId}`);
        } catch (err) {
          console.error(`Failed to decrement inventory for manual order ${orderId}:`, err);
        }
      }

      if (notificationSettings.order_confirmation?.enabled !== false) {
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
                  <td style="padding:8px 0;border-bottom:1px solid #7c3aed10;"><strong>${escapeHtml(item.title)}</strong></td>
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

      let paymentConfirmedSection = "";
      if (order.paymentMethod && order.paymentMethod !== "Stripe" && order.paymentMethod !== "PayPal") {
        paymentConfirmedSection = `
          <div style="margin-top:28px;padding:24px;background:#ecfdf5;border-radius:16px;border:1px solid #10b98120;">
            <h3 style="margin-top:0;font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#10b981;">Payment Verified</h3>
            <p style="font-size:12px;color:#065f46;margin-bottom:0;line-height:1.6;">We have verified your payment via <strong>${order.paymentMethod}</strong>. Your order is now confirmed and being prepared for shipment.</p>
          </div>
        `;
      }
      const delivery = deliveryDetails(order);
      const deliverySection = delivery.heading ? `
          <div style="margin-top:28px;padding:20px 24px;border:2px solid #111;">
            <h3 style="margin-top:0;font-size:13px;letter-spacing:.15em;text-transform:uppercase;">${escapeHtml(delivery.heading)}</h3>
            ${delivery.lines.map(line => `<p style="font-size:13px;margin:4px 0;line-height:1.6;">${escapeHtml(line)}</p>`).join("")}
          </div>` : "";
      const combinedSection = [deliverySection, paymentConfirmedSection, downloadSection].filter(Boolean).join("\n");

      const compiled = compileEmailTemplate("order_confirmation", notificationSettings, {
        customer_name: order.customer.name || "there",
        order_id: order.orderId || orderId,
        shipping_method: delivery.method,
        delivery_estimate: delivery.estimate,
        order_url: await trackUrl(),
        button_url: await trackUrl(),
        items_table: itemsTable,
        total_price: moneyFmt(order.total)
      }, combinedSection);

      const adminOrderUrl = siteLink(`/admin#orders/${orderId}`);
      const adminAddr = order.customer?.address
        ? [order.customer.address.street, order.customer.address.city, order.customer.address.state, order.customer.address.zip, order.customer.address.country].filter(Boolean).join(", ")
        : "—";
      const adminPaidHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="margin-top:0;color:#16a34a;">&#10003; Payment Received</h2>
          <p><strong>Order:</strong> ${order.orderId || orderId} &nbsp;·&nbsp; <strong>${moneyFmt(order.total)}</strong></p>
          <p><strong>Customer:</strong> ${escapeHtml(order.customer.name)} &lt;${escapeHtml(order.customer.email)}&gt;${order.customer.phone ? ` · ${escapeHtml(order.customer.phone)}` : ""}</p>
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
      } catch (err) {
        console.error("Payment confirmation email to customer failed", err);
      }
      // The shop's own copy goes out even when the customer's address is rejected.
      try {
        await sendEmail({
          to: ADMIN_TO,
          subject: `[PAYMENT SUCCESS] ${order.orderId || orderId} · ${moneyFmt(order.total)} · ${order.customer.name}`,
          html: adminPaidHtml,
          secret: RESEND_API_KEY.value(),
        });
      } catch (err) {
        console.error("Payment admin notification email failed", err);
      }
    }
  }

    // 2. Shipping Confirmation (Order Shipped)
    const becameShipped = before.fulfillmentStatus !== "shipped" && after.fulfillmentStatus === "shipped";
    // Admin "Resend shipping email" (Order detail › In transit) stamps shippingEmailRequestedAt.
    const resendShipped = !!after.shippingEmailRequestedAt && after.shippingEmailRequestedAt !== before.shippingEmailRequestedAt;
    if ((becameShipped || resendShipped) && notificationSettings.shipping_confirmation?.enabled !== false) {
      // Straight to the carrier's tracking page; without a tracking number, the shop's order-status page.
      const trackingUrl = after.trackingNumber
        ? getTrackingUrl(after.trackingCarrier, after.trackingNumber, after.trackingUrl)
        : await trackUrl();
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
          <p><strong>Customer:</strong> ${escapeHtml(after.customer?.name)} &lt;${escapeHtml(after.customer?.email)}&gt;</p>
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
      } catch (err) {
        console.error("Shipping confirmation email to customer failed", err);
      }
      // The shop's own copy goes out even when the customer's address is rejected (first dispatch only).
      if (becameShipped) try {
        await sendEmail({
          to: ADMIN_TO,
          subject: `[SHIPPED] ${after.orderId || orderId} · ${after.customer?.name}`,
          html: shippedAdminHtml,
          secret: RESEND_API_KEY.value(),
        });
      } catch (err) {
        console.error("Shipping admin notification email failed", err);
      }
    }

    // 2b. Out for delivery / delivered (manual status change by admin — Shippo webhook handles the carrier push)
    // Skip if Shippo already sent the email via its own webhook (shippoDeliveryNotified was just set)
    const deliveryStatus = ["out_for_delivery", "delivered"].includes(after.fulfillmentStatus) ? after.fulfillmentStatus : "";
    const becameDelivered = !!deliveryStatus && before.fulfillmentStatus !== deliveryStatus;
    const shippoAlreadyNotified = after.shippoDeliveryNotified && after.shippoDeliveryNotified !== before.shippoDeliveryNotified;
    // Local handoffs stay out of the existing carrier-email path until the
    // store has explicitly enabled a matching customer notification workflow.
    const isLocalFulfillment = ["pickup", "local_delivery"].includes(after.fulfillmentSelection?.method);
    if (becameDelivered && !isLocalFulfillment && !shippoAlreadyNotified && notificationSettings.delivery_update?.enabled !== false) {
      const trackingUrl = after.trackingNumber
        ? getTrackingUrl(after.trackingCarrier || "", after.trackingNumber, after.trackingUrl)
        : await trackUrl();
      const compiled = compileEmailTemplate("delivery_update", notificationSettings, {
        customer_name: after.customer?.name || "there",
        order_id: after.orderId || orderId,
        status: deliveryStatus === "delivered" ? "delivered" : "out for delivery",
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

    // 3. Order Cancelled (skip if the order is being refunded simultaneously — the refund email is more accurate)
    const becameCancelled = before.status !== "cancelled" && after.status === "cancelled"
      && after.paymentStatus !== "refunded";
    if (becameCancelled && notificationSettings.order_cancelled?.enabled !== false) {
      const compiled = compileEmailTemplate("order_cancelled", notificationSettings, {
        customer_name: after.customer?.name || "there",
        order_id: after.orderId || orderId,
        button_url: await trackUrl()
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
    if (becameRefunded) {
      // If it is a manual payment method, handle restocking
      const isManual = after.paymentMethod && after.paymentMethod !== "Stripe" && after.paymentMethod !== "PayPal";
      const shouldRestock = isManual && after.restockOnRefund !== false && after.inventoryRestockedAt == null;
      if (shouldRestock) {
        const itemList = after.items || [];
        try {
          await db.runTransaction(async transaction => {
            const books = await readBooks(transaction, db, itemList);
            writeStock(transaction, db, itemList, books, 1, new Date().toISOString());
            // Mark as restocked on the order document
            transaction.update(db.collection("orders").doc(orderId), {
              inventoryRestockedAt: new Date().toISOString()
            });
          });
          console.log(`Successfully restocked manual order ${orderId}`);
        } catch (err) {
          console.error(`Failed to restock manual order ${orderId}:`, err);
        }
      }

      if (notificationSettings.order_refunded?.enabled !== false) {
      const compiled = compileEmailTemplate("order_refunded", notificationSettings, {
        customer_name: after.customer?.name || "there",
        order_id: after.orderId || orderId,
        // A partial refund shows what was actually refunded, not the order total.
        // The template says "CA$", while Stripe reports the refund in the checkout
        // currency, so a USD/EUR refund is converted back with the order's rate.
        total_price: (() => {
          const refunded = Number(after.refund?.amount);
          if (!Number.isFinite(refunded)) return Number(after.total || 0).toFixed(2);
          const currency = String(after.refund?.currency || after.checkoutCurrency || "CAD").toUpperCase();
          const rate = Number(after.exchangeRate);
          return (currency !== "CAD" && rate > 0 ? refunded / rate : refunded).toFixed(2);
        })(),
        button_url: await trackUrl()
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
}
);

// ──────────────────────────────────────────────────────────────
// 7. Abandoned cart sweep: every hour, recover carts older than 1h
// ──────────────────────────────────────────────────────────────
// Daily 8am (Toronto) email to the publisher listing paid parcels not shipped after
// 3 days, parcels in transit 14+ days and label purchases that need checking in
// Shippo. Nothing is sent on days with nothing to report.
exports.dailyOrderDigest = onSchedule(
  { schedule: "every day 08:00", timeZone: "America/Toronto", secrets: [RESEND_API_KEY] },
  async () => {
    const [paidSnap, opsSnap] = await Promise.all([
      db.collection("orders").where("paymentStatus", "==", "paid").get(),
      db.collection("order-operations").get(),
    ]);
    const orders = paidSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const ops = new Map(opsSnap.docs.map(doc => [doc.id, doc.data()]));
    const digest = buildOrderDigest(orders, ops);
    if (!digest.total) return;
    const link = id => siteLink(`/admin#orders/${encodeURIComponent(id)}`);
    const rows = (items, describe) => items.map(item => `<li style="margin:6px 0;"><a href="${link(item.id)}">${escapeHtml(item.label)}</a> — ${escapeHtml(describe(item))}</li>`).join("");
    const section = (title, items, describe) => items.length ? `<h3 style="margin:24px 0 8px;">${title} (${items.length})</h3><ul style="padding-left:18px;">${rows(items, describe)}</ul>` : "";
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="margin-top:0;">Orders needing you today</h2>
        ${section("Paid, not shipped yet", digest.unshipped, o => `${o.days} days since payment${o.customer ? ` · ${o.customer}` : ""}`)}
        ${section(`In transit ${TRANSIT_DAYS}+ days`, digest.stuck, o => `${o.days} days · ${[o.carrier, o.tracking].filter(Boolean).join(" ")} — check tracking or open a claim`)}
        ${section("Label purchase to check in Shippo", digest.labelChecks, () => "a label purchase didn't finish; check Shippo before buying again")}
        <p style="margin-top:24px;"><a href="${siteLink("/admin#orders")}">Open Orders &rarr;</a></p>
      </div>`;
    try {
      await sendEmail({
        to: ADMIN_TO,
        subject: `[TO DO] ${digest.total} order${digest.total === 1 ? "" : "s"} need attention`,
        html,
        secret: RESEND_API_KEY.value(),
      });
    } catch (err) {
      console.error("Daily order digest failed", err);
    }
  }
);

const ABANDONED_CART_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ABANDONED_CART_THROTTLE_MS = 3 * 24 * 60 * 60 * 1000;
const ABANDONED_CART_MAX_ITEMS = 20;

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

    // Cart docs are written by anonymous browsers, so nothing in them is trusted
    // for the email: items/prices are rebuilt from the catalog, text is escaped,
    // stale or forged timestamps are skipped and each address is throttled.
    const oldest = new Date(Date.now() - ABANDONED_CART_MAX_AGE_MS).toISOString();
    const pending = snap.docs.filter(doc => doc.data().notified !== true && String(doc.data().updatedAt || "") >= oldest);
    const bookCache = new Map();
    const loadBook = async id => {
      if (!bookCache.has(id)) bookCache.set(id, db.collection("books").doc(id).get().then(d => (d.exists ? d.data() : null)).catch(() => null));
      return bookCache.get(id);
    };
    const emailedThisRun = new Set();

    const promises = pending.map(async (doc) => {
      const c = doc.data();
      const email = String(c.email || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

      const lines = [];
      for (const item of (Array.isArray(c.items) ? c.items : []).slice(0, ABANDONED_CART_MAX_ITEMS)) {
        if (!item || typeof item.id !== "string" || !item.id || item.id.includes("/")) continue;
        const book = await loadBook(item.id);
        if (!book) continue;
        const variant = item.variantId ? (book.variants || []).find(v => v.id === item.variantId) : null;
        if (item.variantId && !variant) continue;
        const price = variant ? Number(variant.price) : (book.isOnSale && Number(book.salePrice) > 0 ? Number(book.salePrice) : Number(book.retailPrice));
        if (!Number.isFinite(price) || price < 0) continue;
        const qty = Math.max(1, Math.min(99, Math.floor(Number(item.qty || item.quantity) || 1)));
        lines.push({ title: `${book.title || ""}${variant?.name ? ` (${variant.name})` : ""}`, qty, price });
      }
      if (!lines.length || emailedThisRun.has(email)) return;
      emailedThisRun.add(email);

      // One reminder per address per throttle window, however many cart docs exist for it.
      const throttleRef = db.collection("abandoned-cart-throttle").doc(crypto.createHash("sha256").update(email).digest("hex"));
      let previousThrottle = null;
      const throttled = await db.runTransaction(async tx => {
        const t = await tx.get(throttleRef);
        if (t.exists && Date.now() - Date.parse(t.data().lastSentAt || 0) < ABANDONED_CART_THROTTLE_MS) return true;
        previousThrottle = t.exists ? t.data() : null;
        tx.set(throttleRef, { lastSentAt: new Date().toISOString() });
        return false;
      }).catch(() => true);
      if (throttled) {
        await doc.ref.update({ notified: true, notifiedAt: new Date().toISOString(), notifySkipped: "throttled" }).catch(() => {});
        return;
      }

      const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
      const itemsTable = `
        <div style="margin: 20px 0; border-top: 1px solid #eee; padding-top: 15px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            ${lines.map(line => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0;">${escapeHtml(line.title)} (x${line.qty})</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace;">${moneyFmt(line.price * line.qty)}</td>
              </tr>`).join("")}
            <tr style="font-weight: bold;">
              <td style="padding: 12px 0;">Total</td>
              <td style="padding: 12px 0; text-align: right; font-family: monospace;">${moneyFmt(subtotal)}</td>
            </tr>
          </table>
        </div>
      `;

      const cartUrl = siteLink(`/checkout?cartId=${doc.id}`);
      const compiled = compileEmailTemplate("abandoned_cart", notificationSettings, {
        customer_name: String(c.customer?.name || c.name || "there").slice(0, 80),
        cart_url: cartUrl,
        button_url: cartUrl,
        items_table: itemsTable
      });

      try {
        await sendEmail({
          to: email,
          subject: compiled.subject,
          html: compiled.html,
          secret: RESEND_API_KEY.value(),
        });
        await doc.ref.update({ notified: true, notifiedAt: new Date().toISOString() });
      } catch (err) {
        // Release the claim so a failed send doesn't block this address's reminder.
        await (previousThrottle ? throttleRef.set(previousThrottle) : throttleRef.delete()).catch(() => {});
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
      dynamicRatesEnabled: config?.dynamicRatesEnabled ?? false,
      dynamicRateCountries: Array.isArray(config?.dynamicRateCountries) ? config.dynamicRateCountries : [],
    });
  } catch (err) {
    console.error("getShippoConfig failed:", err);
    res.status(500).json({ error: "Unable to load Shippo configuration." });
  }
});

exports.setShippoDynamicRates = onRequest(async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const adminUser = await requireAdmin(req, res);
  if (!adminUser) return;

  const enabled = Boolean(req.body?.enabled);
  const dynamicRateCountries = Array.isArray(req.body?.countries)
    ? [...new Set(req.body.countries.map(country => String(country).trim().toUpperCase()).filter(country => /^[A-Z]{2}$/.test(country)))].slice(0, 250)
    : null;

  try {
    const configDoc = await SHIPPO_CONFIG_DOC.get();
    const current = configDoc.exists ? configDoc.data() : {};
    await SHIPPO_CONFIG_DOC.set({
      ...current,
      dynamicRatesEnabled: enabled,
      ...(dynamicRateCountries ? { dynamicRateCountries } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: adminUser.email,
    });
    res.status(200).json({
      success: true,
      dynamicRatesEnabled: enabled,
      dynamicRateCountries: dynamicRateCountries ?? current.dynamicRateCountries ?? [],
    });
  } catch (err) {
    console.error("setShippoDynamicRates failed:", err);
    res.status(500).json({ error: "Unable to update Shippo dynamic rates setting." });
  }
});

exports.getShippoRates = onRequest(
  { secrets: [SHIPPO_API_TOKEN] },
  async (req, res) => {
    if (applyCors(req, res)) return;

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { address, items } = req.body;
    if (!address || !items || !Array.isArray(items)) {
      res.status(400).json({ error: "Missing address or items" });
      return;
    }

    try {
      const configDoc = await SHIPPO_CONFIG_DOC.get();
      const config = configDoc.exists ? configDoc.data() : {};
      if (config.dynamicRatesEnabled !== true) {
        res.status(400).json({ error: "Dynamic rates are disabled" });
        return;
      }

      const destinationCountry = getCountryCode(address.country);
      const enabledCountries = Array.isArray(config.dynamicRateCountries) ? config.dynamicRateCountries : [];
      if (!enabledCountries.includes(destinationCountry)) {
        res.status(200).json({ rates: [], useRegularRates: true });
        return;
      }

      const shippoToken = await getShippoToken();
      if (!shippoToken) {
        res.status(400).json({ error: "Shippo is not configured" });
        return;
      }

      const settingsDoc = await db.collection("settings").doc("website").get();
      const settings = settingsDoc.data() || {};
      const origin = settings.location || {};

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

      const addressTo = {
        name: address.name || "Customer",
        street1: address.street,
        city: address.city,
        state: getStateCode(address.state),
        zip: address.zip,
        country: getCountryCode(address.country),
      };

      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      if (totalQty === 0) {
        res.status(200).json({ rates: [] });
        return;
      }

      const bookRefs = items.map(item => db.collection("books").doc(item.id));
      const bookDocs = await Promise.all(bookRefs.map(ref => ref.get()));

      // Same parcel weight as the charge path (resolveShipping): physical items only,
      // catalog weights read as grams ("450 g", "0.5 kg", bare numbers = grams).
      let totalWeightLb = 0;
      items.forEach((item, index) => {
        const bookDoc = bookDocs[index];
        if (!bookDoc.exists) return;
        const book = bookDoc.data();
        const variant = item.variantId ? (book.variants || []).find(v => v.id === item.variantId) || null : null;
        const line = { format: catalogFormat(book, variant), digital: catalogDigital(book, variant), isDigital: catalogDigital(book, variant) };
        if (!isPhysicalItem(line)) return;
        const qty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
        const grams = Number(itemWeightGrams(book, variant));
        totalWeightLb += (Number.isFinite(grams) && grams > 0 ? grams / 453.592 : 1.5) * qty;
      });
      if (totalWeightLb === 0) {
        res.status(200).json({ rates: [], useRegularRates: true });
        return;
      }

      const parcel = {
        length: "10",
        width: "8",
        height: "2",
        distance_unit: "in",
        weight: Math.max(0.1, totalWeightLb).toFixed(1),
        mass_unit: "lb"
      };

      const shipment = await callShippo("shipments/", "POST", {
        address_from: addressFrom,
        address_to: addressTo,
        parcels: [parcel],
        async: false
      }, shippoToken);

      const rates = shipment.rates || [];
      const formattedRates = rates.map(checkoutRate);

      res.status(200).json({ rates: formattedRates });
    } catch (err) {
      console.error("getShippoRates failed:", err);
      res.status(500).json({ error: err.message });
    }
  }
);


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
    }, { merge: true });
    const saved = (await SHIPPO_CONFIG_DOC.get()).data() || {};
    res.status(200).json({
      configured: true,
      source: "firebase",
      lastFour: apiToken.slice(-4),
      updatedAt,
      dynamicRatesEnabled: saved.dynamicRatesEnabled ?? false,
      dynamicRateCountries: Array.isArray(saved.dynamicRateCountries) ? saved.dynamicRateCountries : [],
    });
  } catch (err) {
    console.error("saveShippoConfig failed:", err);
    res.status(500).json({ error: "Unable to save the Shippo API key." });
  }
});

// Server-side carrier check of a paid order's shipping address. A valid address is
// recorded as reviewed in the admin-only order-operations record, so the publisher
// goes straight to packing. Anything else keeps the order in "Needs attention".
async function autoApproveShippingAddress(orderId, order) {
  const method = order.fulfillmentSelection?.method || order.fulfillment?.method || "shipping";
  const address = order.customer?.address || {};
  if (method !== "shipping" || order.isTest || !address.street || !address.city || !address.state || !address.zip) return;
  const shippoToken = await getShippoToken();
  if (!shippoToken) return;
  const result = await callShippo("addresses/", "POST", {
    name: order.customer?.name || "Customer",
    street1: address.street,
    city: address.city,
    state: getStateCode(address.state),
    zip: address.zip,
    country: getCountryCode(address.country),
    validate: true,
  }, shippoToken);
  if (result?.validation_results?.is_valid !== true) return;
  const opsRef = db.collection("order-operations").doc(orderId);
  const now = new Date().toISOString();
  await db.runTransaction(async tx => {
    const [fresh, ops] = await Promise.all([tx.get(db.collection("orders").doc(orderId)), tx.get(opsRef)]);
    const current = fresh.data() || {};
    const key = guardAddressKey(current);
    // Only approve the address that was checked, and never override a publisher decision.
    if (key !== guardAddressKey(order) || (ops.data() || {}).addressReviewed) return;
    tx.set(opsRef, {
      addressReviewed: key,
      updatedAt: now,
      activity: [...((ops.data() || {}).activity || []), { type: "event", message: "Shipping address verified automatically with the carrier after payment.", createdAt: now }],
    }, { merge: true });
  });
}

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

    const { orderId, mode, shipmentId, rateId } = req.body;
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
      const operationsRef = db.collection("order-operations").doc(orderId);
      const operations = (await operationsRef.get()).data() || {};
      const preparationProblem = labelProblem(order, operations);
      if (preparationProblem) { res.status(409).json({ error: preparationProblem }); return; }
      // A transaction claims any money-spending request. Uncertain failures remain
      // locked so retrying cannot silently buy a second label.
      const claimPurchase = async () => db.runTransaction(async tx => {
        const freshOrder = await tx.get(orderRef);
        const freshOperations = await tx.get(operationsRef);
        const current = freshOperations.data() || {};
        const problem = labelProblem(freshOrder.data() || {}, current);
        if (problem) throw new Error(problem);
        if (mode === "purchase" && (current.quotedShipmentId !== shipmentId || current.quotedAddress !== JSON.stringify(freshOrder.data().customer.address))) throw new Error("Label quote changed or expired. Refresh the rates.");
        tx.set(operationsRef, { labelPurchasePending: true, labelPurchaseStartedAt: new Date().toISOString() }, { merge: true });
      });
      const completePurchase = async () => operationsRef.set({ labelPurchasePending: false }, { merge: true });
      if (order.isTest === true) {
        res.status(400).json({ error: "Test orders are excluded from fulfillment." });
        return;
      }
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
        
        await claimPurchase();
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

        await completePurchase();
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

      if (mode === "purchase") {
        if (!shipmentId || !rateId) {
          res.status(400).json({ error: "Choose a Canada Post rate before buying the label." });
          return;
        }
        const quotedShipment = await callShippo(`shipments/${encodeURIComponent(shipmentId)}/`, "GET", null, shippoToken);
        const chosenRate = (quotedShipment.rates || []).find(rate => rate.object_id === rateId);
        if (!chosenRate || !isCanadaPostRate(chosenRate)) {
          res.status(400).json({ error: "That Canada Post rate is no longer available. Refresh the choices and try again." });
          return;
        }
        await claimPurchase();
        const transaction = await callShippo("transactions/", "POST", { rate: chosenRate.object_id, async: false }, shippoToken);
        if (transaction.status !== "SUCCESS") {
          const messages = (transaction.messages || []).map(message => message.text).join(", ");
          throw new Error(`Transaction creation failed: ${transaction.status} - ${messages}`);
        }
        const trackingNumber = transaction.tracking_number;
        const trackingCarrier = transaction.tracking_provider || "Canada Post";
        const labelUrl = transaction.label_url;
        await orderRef.update({ labelUrl, trackingNumber, trackingCarrier, updatedAt: new Date().toISOString(), activity: [
          ...(order.activity || []),
          { type: "note", message: `Shipping Label #${trackingNumber} generated via dashboard. Carrier: ${trackingCarrier}.`, createdAt: new Date().toISOString() }
        ] });
        await completePurchase();
        res.status(200).json({ labelUrl, trackingNumber, trackingCarrier });
        return;
      }

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

      if (mode === "rates") {
        await operationsRef.set({ quotedShipmentId: shipment.object_id, quotedAddress: JSON.stringify(order.customer.address) }, { merge: true });
        const canadaPostRates = canadaPostLabelRates(rates);
        res.status(200).json({ shipmentId: shipment.object_id, rates: canadaPostRates.map(rate => ({
          id: rate.object_id,
          name: rate.servicelevel?.name || "Canada Post",
          amount: Number(rate.amount),
          currency: rate.currency || "CAD",
          estimatedDays: Number.isFinite(Number(rate.estimated_days)) ? Number(rate.estimated_days) : null,
          durationTerms: rate.duration_terms || ""
        })) });
        return;
      }

      // 5. Select cheapest rate
      const cheapestRate = rates.reduce((min, rate) => {
        const rateVal = parseFloat(rate.amount);
        const minVal = parseFloat(min.amount);
        return rateVal < minVal ? rate : min;
      }, rates[0]);

      await claimPurchase();
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

      await completePurchase();
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
        buyQuantity: d.buyQuantity ?? null,
        getQuantity: d.getQuantity ?? null,
        getDiscountValue: d.getDiscountValue ?? null,
        tiers: d.tiers ?? null,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────
// 10. Order Created Trigger (New Order Admin Alert / Customer Manual Order Confirmation)
// ──────────────────────────────────────────────────────────────
exports.onOrderCreated = onDocumentCreated(
  { document: "orders/{orderId}", secrets: [RESEND_API_KEY] },
  async event => {
    const order = event.data?.data() || {};
    const orderId = event.params.orderId;

    if (order.isTest === true) return;
    if (!order.customer?.email) return;

    const notificationSettings = await loadNotificationSettings();

    // 1. Admin Alert: Send email to ADMIN_TO about new order
    if (notificationSettings.new_order_admin?.enabled !== false) {
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

      const adminHtml = `
        <p>A new order has been placed: <strong>${order.orderId || orderId}</strong> · ${moneyFmt(order.total)}</p>
        <p><strong>Customer:</strong> ${escapeHtml(order.customer.name)} &lt;${escapeHtml(order.customer.email)}&gt;</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod || "Stripe"}</p>
        <p><strong>Shipping Method:</strong> ${order.shippingMethod || "Standard"}</p>
        ${itemsTable}
      `;

      try {
        await sendEmail({
          to: ADMIN_TO,
          subject: `[NEW ORDER] ${order.orderId || orderId}`,
          html: adminHtml,
          secret: RESEND_API_KEY.value(),
        });
      } catch (err) {
        console.error("New order admin email notification failed", err);
      }
    }

    // 2. Customer Email: Send "Order Received (Pending Payment)" confirmation email if order was placed via manual payment method (i.e. starts as "pending")
    if (order.paymentStatus === "pending") {
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

      // Instructions come from the shop's own settings, never from the order
      // document (which a browser can write), so nobody can make the shop email
      // someone "pay to this account" text.
      const websiteSettings = (await db.collection("settings").doc("website").get()).data() || {};
      const manualMethod = (websiteSettings.payments?.manualMethods || []).find(m => m && m.name === order.paymentMethod);
      const paymentInstructions = String(manualMethod?.instructions || "");
      if (!manualMethod) return; // not a payment method this shop offers: no customer email
      let additionalSection = "";
      if (paymentInstructions) {
        additionalSection = `
          <div style="margin-top:28px;padding:24px;background:#fffbeb;border-radius:16px;border:1px solid #d9770620;">
            <h3 style="margin-top:0;font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#d97706;">Payment Instructions</h3>
            <p style="font-size:12px;color:#451a03;margin-bottom:0;line-height:1.6;white-space:pre-wrap;">${escapeHtml(paymentInstructions)}</p>
          </div>
        `;
      }

      const compiled = compileEmailTemplate("order_confirmation", notificationSettings, {
        customer_name: order.customer.name || "there",
        order_id: order.orderId || orderId,
        button_url: await orderTrackUrl(orderId, order),
        items_table: itemsTable,
        total_price: moneyFmt(order.total)
      }, additionalSection);

      try {
        await sendEmail({
          to: order.customer.email,
          subject: `Order Received (Pending Payment) - #${order.orderId || orderId}`,
          html: compiled.html,
          secret: RESEND_API_KEY.value(),
        });
      } catch (err) {
        console.error("Order pending payment customer email failed", err);
      }
    }
  }
);

// ──────────────────────────────────────────────────────────────
// 11. Customer Welcome Trigger
// ──────────────────────────────────────────────────────────────
// Storefront contact form (ContactFormSection) → email the shop.
const escContact = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

exports.onContactMessage = onDocumentCreated(
  { document: "contactMessages/{messageId}", secrets: [RESEND_API_KEY] },
  async event => {
    const m = event.data?.data() || {};
    if (!m.email || !m.message) return;
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="margin-top:0;">New message from your website</h2>
        <p><strong>From:</strong> ${escContact(m.name)} &lt;<a href="mailto:${escContact(m.email)}">${escContact(m.email)}</a>&gt;${m.phone ? ` · ${escContact(m.phone)}` : ""}</p>
        ${m.subject ? `<p><strong>Subject:</strong> ${escContact(m.subject)}</p>` : ""}
        <p style="white-space:pre-wrap;border-left:3px solid #ccc;padding-left:12px;">${escContact(m.message)}</p>
        ${m.page ? `<p style="color:#888;font-size:12px;">Sent from ${escContact(m.page)}</p>` : ""}
      </div>`;
    try {
      await sendEmail({
        to: ADMIN_TO,
        subject: `[CONTACT] ${String(m.subject || m.name || "New message").slice(0, 120)}`,
        html,
        secret: RESEND_API_KEY.value(),
      });
      // Don't undo an admin who already opened/archived it in Messages.
      await db.runTransaction(async (tx) => {
        const cur = await tx.get(event.data.ref);
        if (cur.exists && cur.get("status") === "new") tx.update(event.data.ref, { status: "emailed" });
      });
    } catch (err) {
      console.error("Contact message email failed", err);
    }

    // Confirmation to the visitor (Settings › Notifications › Contact form › Message received).
    const notificationSettings = await loadNotificationSettings();
    if (notificationSettings.contact_reply?.enabled === false) return;
    // compileEmailTemplate escapes and keeps "$" literal itself.
    const safe = (v) => String(v == null ? "" : v);
    const compiled = compileEmailTemplate("contact_reply", notificationSettings, {
      customer_name: safe(m.name || "there"),
      email: safe(m.email),
      subject: safe(m.subject),
      message: safe(m.message),
    });
    try {
      await sendEmail({
        to: m.email,
        subject: compiled.subject.replace(/&lt;|&gt;|&amp;|&quot;/g, (x) => ({ "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"' }[x])),
        html: compiled.html,
        secret: RESEND_API_KEY.value(),
      });
    } catch (err) {
      console.error("Contact confirmation email failed", err);
    }
  }
);

exports.onCustomerCreated = onDocumentCreated(
  { document: "customers/{customerId}", secrets: [RESEND_API_KEY] },
  async event => {
    const customer = event.data?.data() || {};
    if (!customer.email) return;

    const notificationSettings = await loadNotificationSettings();
    if (notificationSettings.customer_welcome?.enabled === false) {
      return;
    }
    if (!(await customerAccountsEnabled())) return;

    const compiled = compileEmailTemplate("customer_welcome", notificationSettings, {
      customer_name: customer.name || "there",
      email: customer.email,
      button_url: siteLink("/account"),
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
        subject: "Stocking your books",
        message: "Hello! Do you sell wholesale to independent bookshops?",
        tracking_url: "https://www.canadapost-postescanada.ca/track-reperage/en",
        cart_url: siteLink("/checkout"),
        button_url: siteLink("/account"),
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
          const trackingUrl = getTrackingUrl(finalCarrier, trackingNum, order.trackingUrl);
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

// ──────────────────────────────────────────────────────────────
// 12b. Back-in-stock alerts: email shoppers who signed up on a sold-out product
// ──────────────────────────────────────────────────────────────
function stockOf(item, fallback) {
  if (!item) return fallback;
  if (item.stockLevel !== undefined) return Number(item.stockLevel);
  if (item.stock !== undefined) return Number(item.stock);
  return fallback;
}

exports.onBookRestocked = onDocumentUpdated(
  { document: "books/{bookId}", secrets: [RESEND_API_KEY] },
  async event => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const bookId = event.params.bookId;
    if (after.isTest === true || after.status === "draft") return;

    // Which variant ids (and the base product, "") just went from 0 to available?
    const restocked = new Set();
    if (stockOf(before, 999) <= 0 && stockOf(after, 999) > 0) restocked.add("");
    const beforeVariants = Array.isArray(before.variants) ? before.variants : [];
    for (const v of Array.isArray(after.variants) ? after.variants : []) {
      const prev = beforeVariants.find(x => x.id === v.id);
      if (prev && stockOf(prev, 999) <= 0 && stockOf(v, 999) > 0) restocked.add(String(v.id));
    }
    // A base restock also covers signups made before variants existed.
    if (restocked.size === 0) return;

    const snap = await db
      .collection("stockAlerts")
      .where("bookId", "==", bookId)
      .where("status", "==", "waiting")
      .limit(500)
      .get();
    if (snap.empty) return;

    const link = siteLink(`/books/${encodeURIComponent(after.slug || bookId)}`);
    const esc = t => String(t || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    for (const doc of snap.docs) {
      const alert = doc.data();
      if (!restocked.has(String(alert.variantId || ""))) continue;
      // Claim first so a duplicate trigger never double-sends.
      const claimed = await db.runTransaction(async tx => {
        const cur = await tx.get(doc.ref);
        if (!cur.exists || cur.data().status !== "waiting") return false;
        tx.update(doc.ref, { status: "sending" });
        return true;
      });
      if (!claimed) continue;
      try {
        const title = esc(after.title || alert.bookTitle);
        const variant = alert.variantName ? ` (${esc(alert.variantName)})` : "";
        await sendEmail({
          to: alert.email,
          subject: `Back in stock: ${after.title || alert.bookTitle}`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <h2 style="margin-top:0;">It's back!</h2>
            <p style="font-size:15px;line-height:1.6;"><strong>${title}</strong>${variant} is available again. Stock is limited, so grab your copy while you can.</p>
            <p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:12px 22px;text-decoration:none;font-weight:bold;">Shop now</a></p>
            <p style="font-size:12px;color:#888;">You received this because you asked to be notified. This is a one-time message.</p>
          </div>`,
          secret: RESEND_API_KEY.value(),
        });
        await doc.ref.update({ status: "notified", notifiedAt: new Date().toISOString() });
      } catch (err) {
        console.error("Back-in-stock email failed:", err);
        await doc.ref.update({ status: "waiting" });
      }
    }
  },
);

// ──────────────────────────────────────────────────────────────
// 12. Low Stock Alerts: Email admin when product or variant stock drops below 3 or hits 0
// ──────────────────────────────────────────────────────────────
exports.onBookUpdated = onDocumentUpdated(
  { document: "books/{bookId}", secrets: [RESEND_API_KEY] },
  async event => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};

    if (after.isTest === true) return;
    if (!after.trackInventory) return;

    const stockBefore = before.stockLevel !== undefined ? Number(before.stockLevel) : 999;
    const stockAfter = after.stockLevel !== undefined ? Number(after.stockLevel) : 0;

    let shouldAlert = false;
    let alertLines = [];

    // Check parent product stock
    const parentBecameLowStock = (stockBefore > 3 && stockAfter <= 3 && stockAfter > 0);
    const parentBecameSoldOut = (stockBefore > 0 && stockAfter === 0);

    if (parentBecameLowStock) {
      shouldAlert = true;
      alertLines.push(`Product "<strong>${after.title}</strong>" is running low on stock (${stockAfter} remaining).`);
    } else if (parentBecameSoldOut) {
      shouldAlert = true;
      alertLines.push(`Product "<strong>${after.title}</strong>" is now sold out!`);
    }

    // Check individual variants
    if (after.variants && Array.isArray(after.variants)) {
      const beforeVariants = before.variants || [];
      after.variants.forEach(vAfter => {
        const vBefore = beforeVariants.find(v => v.id === vAfter.id);
        const vStockBefore = vBefore ? (vBefore.stockLevel !== undefined ? Number(vBefore.stockLevel) : (vBefore.stock !== undefined ? Number(vBefore.stock) : 999)) : 999;
        const vStockAfter = vAfter.stockLevel !== undefined ? Number(vAfter.stockLevel) : (vAfter.stock !== undefined ? Number(vAfter.stock) : 0);

        const vBecameLowStock = (vStockBefore > 3 && vStockAfter <= 3 && vStockAfter > 0);
        const vBecameSoldOut = (vStockBefore > 0 && vStockAfter === 0);

        if (vBecameLowStock) {
          shouldAlert = true;
          alertLines.push(`Variant "<strong>${vAfter.name}</strong>" of product "${after.title}" is running low on stock (${vStockAfter} remaining).`);
        } else if (vBecameSoldOut) {
          shouldAlert = true;
          alertLines.push(`Variant "<strong>${vAfter.name}</strong>" of product "${after.title}" is now sold out!`);
        }
      });
    }

    if (shouldAlert && alertLines.length > 0) {
      const alertHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #f3f4f6;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <h2 style="margin-top:0;color:#dc2626;font-size:18px;">&#9888; Inventory Alert</h2>
          <p style="font-size:14px;color:#374151;line-height:1.6;">${alertLines.join("<br><br>")}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="font-size:12px;color:#9ca3af;margin-bottom:0;">
            This email was sent automatically because inventory tracking is enabled for this item.
            You can update your catalog settings in the storefront dashboard.
          </p>
        </div>
      `;

      try {
        await sendEmail({
          to: ADMIN_TO,
          subject: `[INVENTORY ALERT] ${after.title}`,
          html: alertHtml,
          secret: RESEND_API_KEY.value(),
        });
        console.log(`Inventory alert email sent to admin for book ${after.title}`);
      } catch (err) {
        console.error("Failed to send inventory low stock email alert:", err);
      }
    }
  }
);

// (The second, weaker `refundOrder` definition that previously lived here was
// removed: it shadowed the robust idempotent implementation above — see the
// `exports.refundOrder` near the top of this file. The version above carries a
// Stripe idempotency key, partial-refund recording, restock-once guards, and
// manual-payment handling.)

// ──────────────────────────────────────────────────────────────
// 14. HTTP Endpoint: Mark Manual Order as Paid (Admin Secure)
//     Decrements stock, records analytics, flips status to paid.
//     onOrderUpdated fires the customer order-confirmation email automatically.
// ──────────────────────────────────────────────────────────────
exports.markOrderPaid = onRequest(
  async (req, res) => {
    if (applyCors(req, res)) return;
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

    const adminUser = await requireAdmin(req, res);
    if (!adminUser) return;

    const { orderId } = req.body;
    if (!orderId) { res.status(400).json({ error: "Missing orderId" }); return; }

    try {
      const orderRef = db.collection("orders").doc(orderId);
      let paidTotal = null;

      await db.runTransaction(async transaction => {
        paidTotal = null; // a retried attempt must not keep the last attempt's value
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) return;
        const order = orderDoc.data();
        if (order.paymentStatus === "paid") return; // idempotent

        const itemList = order.items || [];
        const books = await readBooks(transaction, db, itemList);

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
            { type: "event", message: `Payment confirmed manually by ${adminUser.email}.`, createdAt: new Date().toISOString() }
          ]
        });

        // Stock comes out here once; recording it stops onOrderUpdated taking it out again.
        const now = new Date().toISOString();
        const oversold = order.inventoryDecrementedAt == null && writeStock(transaction, db, itemList, books, -1, now);
        transaction.update(orderRef, { inventoryDecrementedAt: order.inventoryDecrementedAt || now, ...(oversold ? { oversold: true } : {}) });

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

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("markOrderPaid failed:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * Safety net for the Stripe webhook (every 15 minutes): if Stripe says an order's
 * payment succeeded but the order is still unpaid, finish it through the same
 * amount-checked, idempotent path the webhook uses, and email the shop so the
 * webhook setup gets fixed. Each order is looked up in the Stripe account (test or
 * live) it was created in, then the other one.
 */
exports.unpaidPaymentSweep = onSchedule(
  { schedule: "every 15 minutes", secrets: [STRIPE_SECRET_KEY, RESEND_API_KEY] },
  async () => {
    const { suspectOrders, alertHtml } = require("./paymentSweep");
    const snap = await db.collection("orders").where("paymentStatus", "==", "unpaid").limit(300).get();
    const candidates = suspectOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    const found = [];
    for (const order of candidates) {
      try {
        const result = await retrieveOrderPayment(order.id, order, { paymentIntentId: order.stripePaymentIntentId });
        const intent = result?.intent;
        if (intent && intent.status === "succeeded") {
          const marked = await markStripeOrderPaid(order.id, intentAsSession(intent), { message: "Payment confirmed with Stripe by the automatic check (the webhook did not arrive)" })
            .catch(err => { console.error(`unpaidPaymentSweep: could not finish order ${order.id}:`, err); return false; });
          found.push({ orderId: order.id, email: order.customer?.email, amount: intent.amount, currency: intent.currency, intentId: intent.id, fixed: marked });
        }
      } catch (err) {
        console.warn(`unpaidPaymentSweep: could not check order ${order.id}:`, err.message);
      }
    }
    // Safety net for refunds/disputes made in Stripe whose webhook never arrived.
    try {
      const { ordersDueReversalCheck } = require("./stripeRecovery");
      const paidSnap = await db.collection("orders").where("paymentStatus", "==", "paid").limit(500).get();
      for (const order of ordersDueReversalCheck(paidSnap.docs.map((d) => ({ id: d.id, ...d.data() })))) {
        await checkStripeReversal(order.id, order, "automatic check").catch(err => console.warn(`reversal check ${order.id}:`, err.message));
      }
    } catch (err) {
      console.warn("unpaidPaymentSweep: reversal checks failed:", err.message);
    }

    if (!found.length) return;
    const at = new Date().toISOString();
    await Promise.all(found.map((f) => db.collection("orders").doc(f.orderId).update({ paymentAlertSentAt: at })));
    await sendEmail({
      to: ADMIN_TO,
      subject: `⚠ Stripe webhook missed ${found.length} paid order${found.length === 1 ? "" : "s"}`,
      html: alertHtml(found),
      secret: RESEND_API_KEY.value(),
    });
  }
);

/**
 * Nightly Firestore export to the project's default Storage bucket (backups/YYYY-MM-DD).
 * The Functions service account needs the "Cloud Datastore Import Export Admin" role
 * and write access to the bucket.
 */
exports.nightlyFirestoreBackup = onSchedule(
  { schedule: "every day 03:17", timeZone: "America/Toronto" },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
    const client = new admin.firestore.v1.FirestoreAdminClient();
    const day = new Date().toISOString().slice(0, 10);
    const [operation] = await client.exportDocuments({
      name: client.databasePath(projectId, "(default)"),
      outputUriPrefix: `gs://${admin.app().options.storageBucket || `${projectId}.firebasestorage.app`}/backups/${day}`,
      collectionIds: [],
    });
    console.log(`Firestore backup started: ${operation.name}`);
  }
);
