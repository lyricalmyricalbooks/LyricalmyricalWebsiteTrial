#!/usr/bin/env node
// Generates dist/sitemap.xml and dist/robots.txt by reading published books + pages from Firestore.
// Usage: node scripts/generate-sitemap.mjs
//
// Requires Firebase Admin credentials via GOOGLE_APPLICATION_CREDENTIALS or
// FIREBASE_SERVICE_ACCOUNT (JSON string). Falls back to public REST endpoint
// using the firebaseConfig in src/lib/firebase.ts when no service account is set.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SITE_URL =
  process.env.SITE_URL || "https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial";

async function fetchCollection(projectId, collectionId) {
  // Firestore REST: list documents (for collections with public read rules)
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}?pageSize=300`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${collectionId}: ${res.status}`);
  const data = await res.json();
  return (data.documents || []).map(doc => {
    const fields = doc.fields || {};
    const obj = {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = v.stringValue ?? v.integerValue ?? v.booleanValue ?? v.timestampValue ?? null;
    }
    return obj;
  });
}

function readProjectId() {
  const fb = readFileSync(resolve(ROOT, "src/lib/firebase.ts"), "utf8");
  const m = fb.match(/projectId:\s*"([^"]+)"/);
  return m ? m[1] : null;
}

function xmlUrl(loc, lastmod) {
  return `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod.split("T")[0]}</lastmod>` : ""}\n  </url>`;
}

const slugify = s => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  const projectId = readProjectId();
  if (!projectId) {
    console.error("Could not detect Firebase projectId; aborting.");
    process.exit(1);
  }

  const urls = [`${SITE_URL}/`, `${SITE_URL}/#/wishlist`, `${SITE_URL}/#/account`];

  let books = [];
  let pages = [];
  try {
    books = await fetchCollection(projectId, "books");
    pages = await fetchCollection(projectId, "pages");
  } catch (e) {
    console.warn("Could not fetch live data, generating shell sitemap:", e.message);
  }

  for (const b of books) {
    if (b.status !== "published") continue;
    const slug = b.slug || slugify(b.title);
    if (!slug) continue;
    urls.push(`${SITE_URL}/#/books/${slug}`);
  }
  for (const p of pages) {
    if (p.status !== "published") continue;
    if (!p.slug) continue;
    urls.push(`${SITE_URL}/#/page/${p.slug}`);
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => xmlUrl(u)).join("\n") +
    `\n</urlset>\n`;

  const robots =
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;

  const out = resolve(ROOT, "dist");
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, "sitemap.xml"), xml);
  writeFileSync(resolve(out, "robots.txt"), robots);

  // Also write to /public so Vite picks them up on dev
  const pub = resolve(ROOT, "public");
  mkdirSync(pub, { recursive: true });
  writeFileSync(resolve(pub, "sitemap.xml"), xml);
  writeFileSync(resolve(pub, "robots.txt"), robots);

  console.log(`✓ Wrote sitemap with ${urls.length} URLs`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
