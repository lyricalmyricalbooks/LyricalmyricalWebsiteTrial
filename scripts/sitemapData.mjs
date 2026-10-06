import { effectivePublishedSettings } from './publicStorefrontData.mjs';
import { resolveProductRoutes } from '../src/app/features/site/productRouteData.mjs';
const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const slugify = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export function sitemapArtifacts(siteUrl, books, pages, collections, settings = {}) {
  const base = siteUrl.replace(/\/$/, '');
  const urls = [{ loc: base + '/' }];
  // Same live-book set (and so the same collision-safe slugs) as the storefront's useSiteData / isLiveBook.
  const nowISO = new Date().toISOString();
  const live = books.filter(book => (!book.status || book.status === 'published') && (!book.scheduleDate || String(book.scheduleDate) <= nowISO));
  for (const book of resolveProductRoutes(live)) {
    if (book.seoNoindex === true) continue;
    urls.push({ loc: `${base}/books/${encodeURIComponent(book.slug)}`, lastmod: book.updatedAt || book._updateTime });
  }
  for (const page of pages) {
    if (page.status !== 'published' || !page.slug) continue;
    urls.push({ loc: `${base}/page/${encodeURIComponent(page.slug)}`, lastmod: page.updatedAt || page._updateTime });
  }
  // Collection pages resolve Studio category names, not a separate Firestore collection.
  const design = effectivePublishedSettings(settings, nowISO).design || {};
  const categories = design.categories ?? design.storefront?.categories ?? design.heroPage?.categories ?? [];
  if (Array.isArray(categories)) for (const category of categories) {
    if (category?.showInNav === false) continue;
    if (category?.parentId && categories.some(parent => parent?.id === category.parentId && parent.showInNav === false)) continue;
    const name = typeof category === 'string' ? category : category?.name;
    const slug = slugify(name);
    if (slug) urls.push({ loc: `${base}/collections/${encodeURIComponent(slug)}` });
  }
  const unique = [...new Map(urls.map(url => [url.loc, url])).values()];
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + unique.map(url => {
    const date = typeof url.lastmod === 'string' ? url.lastmod.slice(0, 10) : '';
    const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `\n    <lastmod>${date}</lastmod>` : '';
    return `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${lastmod}\n  </url>`;
  }).join('\n') + '\n</urlset>\n';
  const path = new URL(base).pathname.replace(/\/$/, '');
  const robots = 'User-agent: *\nAllow: /\n' + ['admin', 'checkout', 'account', 'wishlist', 'cart', 'track'].map(route => `Disallow: ${path}/${route}\n`).join('') + `\nSitemap: ${base}/sitemap.xml\n`;
  return { xml, robots, count: unique.length };
}
