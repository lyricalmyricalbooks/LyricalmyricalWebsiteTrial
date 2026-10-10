// Pure readers for shop-wide settings (Settings › General / Notifications) used by several
// functions. Tested in shopSettings.test.js.

// Before the owner filled in General › Location these were the hard-coded shipping origin.
const ORIGIN_FALLBACK = {
  street: "456 Montrose Ave", city: "Toronto", state: "ON", zip: "M6G3H1", country: "CA", phone: "6474096863",
};
const SHOP_EMAIL = "lyricalmyricalbooks@gmail.com";

const text = value => (typeof value === "string" ? value.trim() : "");

/**
 * The shop's shipping origin from settings/website.location (Settings › General › Location).
 * Each blank field keeps the old default, so labels and live rates never lose an address.
 * State and country are returned as entered; the caller turns them into codes.
 */
function shopOrigin(settings) {
  const location = (settings && settings.location) || {};
  const pick = key => text(location[key]) || ORIGIN_FALLBACK[key];
  // Shippo wants digits (and an optional +); "(647) 409-6863" becomes "6474096863".
  const phone = text(location.phone).replace(/[^\d+]/g, "") || ORIGIN_FALLBACK.phone;
  return {
    name: text(settings?.info?.name) || "Lyricalmyrical Books",
    street1: pick("street"),
    city: pick("city"),
    state: pick("state"),
    zip: text(location.zip).replace(/\s+/g, "").toUpperCase() || ORIGIN_FALLBACK.zip,
    country: pick("country"),
    phone,
    email: SHOP_EMAIL,
  };
}

/** Settings › General › Store status › Maintenance: no new checkouts while it is on. */
function checkoutClosed(settings) {
  return settings?.maintenance?.enabled === true;
}

/** Settings › Notifications › Shop alerts › Daily "orders needing you" email (on unless switched off). */
function dailyDigestEnabled(notificationSettings) {
  return notificationSettings?.shopAlerts?.dailyOrderDigest !== false;
}

/** What the nightly backup writes to the admin-only systemStatus/backup doc. */
function backupStatusRecord({ ok, day, at, operation = "", error = "", previous = null }) {
  const record = { lastAttemptAt: at, lastDay: day, ok: ok === true };
  if (ok) {
    record.lastSuccessAt = at;
    record.lastSuccessDay = day;
    record.operation = String(operation || "").slice(0, 300);
    record.error = "";
  } else {
    record.error = String(error || "Unknown error").slice(0, 500);
    // A failure keeps the last good backup on record.
    if (previous?.lastSuccessAt) {
      record.lastSuccessAt = previous.lastSuccessAt;
      record.lastSuccessDay = previous.lastSuccessDay || "";
    }
  }
  return record;
}

module.exports = { ORIGIN_FALLBACK, shopOrigin, checkoutClosed, dailyDigestEnabled, backupStatusRecord };
