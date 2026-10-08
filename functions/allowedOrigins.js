// Browser origins the storefront is served from. CORS, payment return URLs and the
// wallet-domain button only accept these. Firebase Hosting adds the project's own
// web.app / firebaseapp.com addresses and short-lived PR preview channels
// (`<project>--<channel>-<hash>.web.app`), which only this project's deployers can create.
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4000",
  "https://lyricalmyricalbooks.github.io",
  "https://lyricalmyrical-web-v2.web.app",
  "https://lyricalmyrical-web-v2.firebaseapp.com",
  "https://lyricalmyricalbooks.com",
  "https://www.lyricalmyricalbooks.com",
];
const PREVIEW_CHANNEL_ORIGIN = /^https:\/\/lyricalmyrical-web-v2--[a-z0-9-]+\.web\.app$/;

const isAllowedOrigin = origin =>
  typeof origin === "string" && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_CHANNEL_ORIGIN.test(origin));

// A storefront-supplied return URL is accepted only when its real origin is allowed.
function isAllowedReturnUrl(url) {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return !parsed.username && !parsed.password && isAllowedOrigin(parsed.origin);
  } catch {
    return false;
  }
}

module.exports = { ALLOWED_ORIGINS, isAllowedOrigin, isAllowedReturnUrl };
