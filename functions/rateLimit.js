// Fixed-window rate limits for the public endpoints (order lookup, discount
// codes, checkout). Counters live in the server-only `rate-limits` collection;
// firestore.rules deny every browser read/write there.
const crypto = require("crypto");

// First address in X-Forwarded-For is the shopper (Cloud Functions sits behind Google's front end).
function clientIpOf(req) {
  const fwd = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req?.ip || req?.socket?.remoteAddress || "unknown";
}

// Pure: given the saved counter, decide whether this hit is allowed and what to store.
function nextWindow(saved, nowMs, { max, windowMs }) {
  const start = Number(saved?.windowStart) || 0;
  if (!start || nowMs - start >= windowMs) {
    return { allowed: true, record: { windowStart: nowMs, count: 1 } };
  }
  const count = (Number(saved?.count) || 0) + 1;
  return { allowed: count <= max, record: { windowStart: start, count } };
}

// Returns true when allowed. Fails open if Firestore is unavailable: a broken
// counter must never stop a real customer from paying.
async function hitLimit(db, bucket, req, opts) {
  const id = `${bucket}_${crypto.createHash("sha256").update(clientIpOf(req)).digest("hex").slice(0, 32)}`;
  const ref = db.collection("rate-limits").doc(id);
  try {
    return await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const { allowed, record } = nextWindow(snap.exists ? snap.data() : null, Date.now(), opts);
      tx.set(ref, { ...record, bucket, expiresAt: new Date(record.windowStart + opts.windowMs * 2) });
      return allowed;
    });
  } catch (err) {
    console.warn(`Rate limit check failed (${bucket}):`, err.message);
    return true;
  }
}

const LIMITS = {
  track: { max: 60, windowMs: 10 * 60 * 1000 },
  discount: { max: 30, windowMs: 10 * 60 * 1000 },
  checkout: { max: 30, windowMs: 10 * 60 * 1000 },
};

module.exports = { clientIpOf, nextWindow, hitLimit, LIMITS };
