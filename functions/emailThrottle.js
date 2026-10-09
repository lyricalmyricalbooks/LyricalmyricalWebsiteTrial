// Per-address email throttles for emails a visitor can trigger without signing in (the
// contact form). Counters live in the server-only `contact-email-throttle` collection
// (firestore.rules deny every browser access), one doc per purpose + sha256 of the
// normalised address, so the address itself is never stored there. Same transactional
// pattern as the abandoned-cart reminder throttle.
const crypto = require("crypto");

// Visitor "we got your message" copy: at most one per address per day, so the form can't be
// used to send mail to a stranger's inbox over and over. Owner notification: at most a few per
// sender per hour, so a flood from one address can't burn the shop's daily sending quota.
const CONTACT_LIMITS = {
  visitorReply: { max: 1, windowMs: 24 * 60 * 60 * 1000 },
  ownerNotify: { max: 5, windowMs: 60 * 60 * 1000 },
};

const normaliseEmail = email => String(email || "").trim().toLowerCase();
const emailKey = email => crypto.createHash("sha256").update(normaliseEmail(email)).digest("hex");

// Pure: fixed-window counter. Returns whether this send is allowed and what to store.
function nextEmailWindow(saved, nowMs, { max, windowMs }) {
  const start = Number(saved?.windowStart) || 0;
  if (!start || nowMs - start >= windowMs || nowMs < start) return { allowed: true, record: { windowStart: nowMs, count: 1 } };
  const count = Number(saved?.count) || 0;
  if (count >= max) return { allowed: false, record: null };
  return { allowed: true, record: { windowStart: start, count: count + 1 } };
}

// Claims one send for `purpose` to/from `email`. Resolves true when the email may go out.
// `failOpen` decides what a Firestore failure means (false = don't send).
async function claimEmailSend(db, purpose, email, { now = Date.now(), failOpen = false } = {}) {
  const limits = CONTACT_LIMITS[purpose];
  if (!limits || !normaliseEmail(email)) return false;
  const ref = db.collection("contact-email-throttle").doc(`${purpose}_${emailKey(email)}`);
  try {
    return await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const { allowed, record } = nextEmailWindow(snap.exists ? snap.data() : null, now, limits);
      if (allowed) tx.set(ref, { ...record, purpose, expiresAt: new Date(record.windowStart + limits.windowMs * 2) });
      return allowed;
    });
  } catch (err) {
    console.warn(`Email throttle unavailable (${purpose}):`, err.message);
    return failOpen;
  }
}

module.exports = { CONTACT_LIMITS, emailKey, normaliseEmail, nextEmailWindow, claimEmailSend };
