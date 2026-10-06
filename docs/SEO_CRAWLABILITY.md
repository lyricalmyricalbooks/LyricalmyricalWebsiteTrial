# Crawlable public HTML

Google can execute JavaScript, but this GitHub Pages SPA previously served its
redirecting 404 document for direct book/custom-page URLs. The production build
now renders the public sitemap in Chromium and writes an `index.html` for each
public route, including the home page. These files contain actual published
Studio layouts, text, links, metadata and current page structured data. React
starts normally and continues loading live catalog and checkout data.

## Building and publishing

- Install dependencies with pnpm 10 (the deployment uses pnpm 10).
- Run `pnpm exec playwright install chromium` once locally. Linux CI installs
  Chromium and its OS dependencies before the build.
- Run `npm run build`. It builds Vite, generates the sitemap, then prerenders.
- `SITE_URL` is the public origin plus deployment path; `SITE_BASE` is the Vite
  base. For a custom root domain, set `SITE_URL=https://your-domain` and
  `SITE_BASE=/` together.
- Merge and deploy through the existing GitHub Pages workflow. Generated HTML
  lives only in `dist`; it is not committed and no Firebase deployment is needed.

Snapshots refresh on deployment. After publishing catalog, page or Studio
changes, rerun the Pages workflow so the first HTML response reflects the saved
content. Live React data, authoritative prices and checkout validation remain
in force between deployments. Removed books/pages lose their generated route at
the next build, while the existing missing-page recovery handles unknown URLs.

## Boundaries

Only same-site home, book, custom-page and collection sitemap URLs are rendered.
Account, wishlist, checkout, tracking and admin routes are excluded. Rendering
uses a fresh unauthenticated browser context per page; browser caches, settings
objects and draft data are never serialized into output. Firestore Write-channel
and external analytics requests are blocked to avoid generating store activity.
An unavailable public-data load, application exception or empty shell fails the
build before new snapshots are written. No alternate content is served to bots.

The prerenderer consumes the existing sitemap. It does not invent categories,
product descriptions, reviews, ISBNs or catalog assignments. Route/canonical,
book metadata and sitemap changes are owned by the separate book SEO work.

## Verification after deployment

Fetch a published `/books/<slug>/` or `/page/<slug>/` URL without JavaScript.
It should return HTTP 200, that page's title/content, its public canonical URL
and crawlable links. Check the rendered page with JavaScript too: navigation
and Add to bag must still work and payment must keep using live server totals.
Then use Search Console URL Inspection and Google's Rich Results Test. Code and
local checks cannot certify indexing, ranking, or eligibility for rich results.

Sources:
- https://developers.google.com/search/docs/fundamentals/get-started-developers
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
