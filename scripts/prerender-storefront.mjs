#!/usr/bin/env node
// Render the public sitemap with the same app used by shoppers. Nothing is
// bot-specific: every visitor gets the same initial HTML and live React app.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicRoutes, routeOutputPath, captureDocument } from './prerenderHtml.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const siteUrl = (process.env.SITE_URL || 'https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial').replace(/\/$/, '');
const base = (process.env.SITE_BASE ?? new URL(siteUrl).pathname).replace(/\/+$/, '');
const template = await readFile(resolve(dist, 'index.html'), 'utf8');
const routes = publicRoutes(await readFile(resolve(dist, 'sitemap.xml'), 'utf8'), siteUrl);
if (!routes.includes('/')) throw new Error('Public sitemap must include the home page');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
// Always serve the pristine shell during capture. Write snapshots only after all
// pages succeed, so no later page can accidentally inherit another page's DOM.
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith(base + '/')) { response.writeHead(404).end(); return; }
    const relative = decodeURIComponent(pathname.slice(base.length + 1));
    const target = resolve(dist, relative);
    if (target !== dist && !target.startsWith(dist + sep)) { response.writeHead(400).end(); return; }
    if (routes.includes('/' + relative.replace(/\/$/, '')) || !extname(relative)) { response.setHeader('Content-Type', 'text/html'); response.end(template); return; }
    response.setHeader('Content-Type', types[extname(target)] || 'application/octet-stream');
    response.end(await readFile(target));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const localOrigin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const captures = [];
  for (const route of routes) {
    // A fresh context prevents cart, wishlist, recent-book and cookie state from
    // one page contaminating another snapshot. No authentication is performed.
    const context = await browser.newContext({ locale: 'en-CA', reducedMotion: 'reduce' });
    try {
      // Public rendering must never inflate store analytics or mutate Firestore.
      await context.route(/google\.firestore\.v1\.Firestore\/Write\//, request => request.abort());
      await context.route(/google-analytics\.com|googletagmanager\.com/, request => request.abort());
      await context.addInitScript(() => sessionStorage.setItem(`fm_visit_${new Date().toISOString().split('T')[0]}`, 'true'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(localOrigin + base + route, { waitUntil: 'domcontentloaded' });
      // This cache is written only after all published catalog/settings/pages
      // reads succeed. Never publish a fallback caused by a backend outage.
      await page.waitForFunction(() => !!sessionStorage.getItem('site-bootstrap-v1'), undefined, { timeout: 60000 });
      if (route.startsWith('/books/')) {
        await page.waitForFunction(() => !!document.querySelector('[data-studio-label="Product page"]') && !!document.getElementById('seo-jsonld-page'), undefined, { timeout: 30000 });
      } else if (route.startsWith('/page/')) {
        await page.locator('[data-studio-label="Page"][data-fm-store]').waitFor();
      } else {
        await page.locator('[data-fm-store]').first().waitFor();
      }
      // Finish React effects, lazy sections and motion before serializing DOM.
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (errors.length) throw new Error(`Render failed for ${route}: ${errors.join('; ')}`);
      const publicUrl = siteUrl + route;
      captures.push({ file: routeOutputPath(route), html: await page.evaluate(captureDocument, { template, publicUrl, localOrigin }) });
      console.log(`Rendered public HTML: ${route}`);
    } finally { await context.close(); }
  }
  for (const capture of captures) {
    const file = resolve(dist, capture.file);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, capture.html);
  }
  console.log(`Wrote ${captures.length} public HTML pages; customer/admin/payment pages excluded.`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
