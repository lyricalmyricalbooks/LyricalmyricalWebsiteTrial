#!/usr/bin/env node
import { sitemapArtifacts } from "./sitemapData.mjs";
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
  const documents = [];
  let pageToken;
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed ${collectionId}: ${res.status}`);
    const data = await res.json();
    documents.push(...(data.documents || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return documents.map(doc => {
    const fields = doc.fields || {};
    const obj = { id: doc.name.split("/").at(-1), _updateTime: doc.updateTime };
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

async function main() {
  const projectId = readProjectId();
  if (!projectId) {
    console.error("Could not detect Firebase projectId; aborting.");
    process.exit(1);
  }

  // An unavailable catalog must fail the build instead of silently deleting book URLs.
  const [books, pages, collections] = await Promise.all([
    fetchCollection(projectId, "books"),
    fetchCollection(projectId, "pages"),
    fetchCollection(projectId, "collections").catch(error => {
      console.warn("Optional collections omitted:", error.message);
      return [];
    }),
  ]);
  const { xml, robots, count } = sitemapArtifacts(SITE_URL, books, pages, collections);

  for (const dir of ["dist", "public"]) {
    const out = resolve(ROOT, dir);
    mkdirSync(out, { recursive: true });
    writeFileSync(resolve(out, "sitemap.xml"), xml);
    writeFileSync(resolve(out, "robots.txt"), robots);
  }

  console.log(`✓ Wrote sitemap with ${count} URLs (${books.length} books, ${pages.length} pages, ${collections.length} collections)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
