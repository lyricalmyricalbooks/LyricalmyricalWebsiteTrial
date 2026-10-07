// One-click unsubscribe for marketing email (abandoned-cart reminders), as Canada's
// anti-spam law requires. The link carries the address and an HMAC of it, so nobody
// can unsubscribe someone else; opt-outs are stored by hash, never as plain emails.
const crypto = require("crypto");

const normEmail = email => String(email || "").trim().toLowerCase();
const optOutId = email => crypto.createHash("sha256").update(normEmail(email)).digest("hex");
const unsubscribeToken = (email, key) => crypto.createHmac("sha256", String(key)).update(normEmail(email)).digest("hex").slice(0, 40);

function tokenMatches(email, token, key) {
  if (!key || typeof token !== "string" || token.length !== 40) return false;
  const expected = unsubscribeToken(email, key);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** Mailing address for the email footer, from Settings › General › Location. */
function footerAddress(location) {
  const l = location || {};
  return [l.street, l.city, l.state, l.zip, l.country].map(v => String(v || "").trim()).filter(Boolean).join(", ");
}

module.exports = { optOutId, unsubscribeToken, tokenMatches, footerAddress, normEmail };
