#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sitemapArtifacts } from './sitemapData.mjs';
import { readPublicStorefront, publishedFingerprint } from './publicStorefrontData.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const siteUrl = process.env.SITE_URL || 'https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial';
const { books, pages, settings } = await readPublicStorefront();
const indexed = sitemapArtifacts(siteUrl, books, pages, [], settings);
// Keep noindex public listings crawlable so Google can read their robots tags.
const rendered = sitemapArtifacts(siteUrl, books.map(book => ({ ...book, seoNoindex: false })), pages, [], settings);
for (const directory of ['dist', 'public']) {
  mkdirSync(resolve(root, directory), { recursive: true });
  writeFileSync(resolve(root, directory, 'sitemap.xml'), indexed.xml);
  writeFileSync(resolve(root, directory, 'robots.txt'), indexed.robots);
}
writeFileSync(resolve(root, 'dist/prerender-routes.xml'), rendered.xml);
writeFileSync(resolve(root, 'dist/seo-published-fingerprint.txt'), publishedFingerprint({ books, pages, settings }) + '\n');
console.log(`Generated ${indexed.count} indexable URLs and ${rendered.count} public HTML routes.`);
