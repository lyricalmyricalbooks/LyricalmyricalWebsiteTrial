#!/usr/bin/env node
// Generates dist/sitemap.xml and dist/robots.txt from Firestore data.
// Usage: node scripts/generate-sitemap.mjs
//
// Reads books, pages, and collections via the public Firestore REST endpoint
// (collections must have public read rules). Override SITE_URL via env if
// the site moves to a custom domain.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SITE_URL =
  process.env.SITE_URL ||
  "https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial";

async function fetchCollection(projectId, collectionId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}?pageSize=300`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${collectionId}: ${res.status}`);
  const data = await res.json();
  return (data.documents || []).map(doc => {
    const fields = doc.fields || {};
    const obj = { _updateTime: doc.updateTime };
    for (const [k, v] of Object.entries(fields)) {
      obj[k] =
        v.stringValue ?? v.integerValue ?? v.booleanValue ?? v.timestampValue ?? null;
    }
    return obj;
  });
}

function readProjectId() {
  const fb = readFileSync(resolve(ROOT, "src/lib/firebase.ts"), "utf8");
  const m = fb.match(/projectId:\s*"([^"]+)"/);
  return m ? m[1] : null;
}

function xmlUrl({ loc, lastmod, changefreq, priority }) {
  const parts = [`    <loc>${loc}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod.split("T")[0]}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

const slugify = s =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function main() {
  const projectId = readProjectId();
  if (!projectId) {
    console.error("Could not detect Firebase projectId; aborting.");
    process.exit(1);
  }

  const today = new Date().toISOString().split("T")[0];

  const urls = [
    { loc: `${SITE_URL}/`, lastmod: today, changefreq: "daily", priority: "1.0" },
    { loc: `${SITE_URL}/wishlist`, changefreq: "monthly", priority: "0.3" },
    { loc: `${SITE_URL}/account`, changefreq: "monthly", priority: "0.3" },
  ];

  let books = [];
  let pages = [];
  let collections = [];
  try {
    [books, pages, collections] = await Promise.all([
      fetchCollection(projectId, "books").catch(() => []),
      fetchCollection(projectId, "pages").catch(() => []),
      fetchCollection(projectId, "collections").catch(() => []),
    ]);
  } catch (e) {
    console.warn("Could not fetch live data, generating shell sitemap:", e.message);
  }

  for (const b of books) {
    if (b.status !== "published") continue;
    const slug = b.slug || slugify(b.title);
    if (!slug) continue;
    urls.push({
      loc: `${SITE_URL}/books/${slug}`,
      lastmod: b.updatedAt || b._updateTime,
      changefreq: "weekly",
      priority: "0.8",
    });
  }
  for (const p of pages) {
    if (p.status !== "published" || !p.slug) continue;
    urls.push({
      loc: `${SITE_URL}/page/${p.slug}`,
      lastmod: p.updatedAt || p._updateTime,
      changefreq: "monthly",
      priority: "0.5",
    });
  }
  for (const c of collections) {
    const slug = c.slug || slugify(c.name);
    if (!slug) continue;
    urls.push({
      loc: `${SITE_URL}/collections/${slug}`,
      lastmod: c.updatedAt || c._updateTime,
      changefreq: "weekly",
      priority: "0.6",
    });
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(xmlUrl).join("\n") +
    `\n</urlset>\n`;

  const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /account\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;

  for (const dir of ["dist", "public"]) {
    const out = resolve(ROOT, dir);
    mkdirSync(out, { recursive: true });
    writeFileSync(resolve(out, "sitemap.xml"), xml);
    writeFileSync(resolve(out, "robots.txt"), robots);
  }

  console.log(`✓ Wrote sitemap with ${urls.length} URLs (${books.length} books, ${pages.length} pages, ${collections.length} collections)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
