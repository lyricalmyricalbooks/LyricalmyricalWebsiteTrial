// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { publicRoutes, routeOutputPath, captureDocument } from './prerenderHtml.mjs';

const base = 'https://example.com/shop';
describe('public HTML snapshots', () => {
  it('limits generation to public sitemap routes in this deployment', () => {
    const xml = '<urlset>' + ['https://example.com/shop/', 'https://example.com/shop/books/a', 'https://example.com/shop/page/about', 'https://example.com/shop/collections/art', 'https://example.com/shop/account', 'https://example.com/shop/wishlist', 'https://elsewhere.com/shop/books/a'].map(u => `<url><loc>${u}</loc></url>`).join('') + '</urlset>';
    expect(publicRoutes(xml, base)).toEqual(['/', '/books/a', '/page/about', '/collections/art']);
  });
  it('rejects path traversal and encoded separators before writing files', () => {
    expect(routeOutputPath('/books/photo-book')).toBe('books/photo-book.html');
    expect(routeOutputPath('/books/a.b')).toBe('books/a.b.html');
    for (const route of ['/books/../a', '/books/%2e%2e', '/books/a%2fb', '/books/a%5cb', '/books/%252e%252e', '/admin']) {
      expect(() => routeOutputPath(route)).toThrow();
    }
  });
  it('writes slash-less route files so GitHub Pages answers the canonical URL with 200, not a redirect to a trailing slash', () => {
    expect(routeOutputPath('/')).toBe('index.html');
    for (const route of ['/books/a', '/page/about', '/collections/art']) {
      const file = routeOutputPath(route);
      expect(file).toBe(route.slice(1) + '.html');
      expect(file).not.toMatch(/\/index\.html$/);
    }
  });
  it('captures real rendered content, public URLs and metadata without browser caches or runtime scripts', () => {
    document.documentElement.innerHTML = '<head><title>Book</title><link rel="canonical" href="http://localhost/shop/"><meta property="og:url" content="http://localhost/shop/"><script type="application/ld+json" id="seo-jsonld-page">{"url":"http://localhost/shop/books/a"}</script></head><body><div id="root"><h1>Saved book title</h1><a href="/shop/books/b">Next book</a><script>privateRuntime()</script><button onclick="danger()">Bag</button></div></body>';
    sessionStorage.setItem('private-cache', 'DO-NOT-EMBED');
    const template = '<html><head></head><body><script type="module" src="/shop/assets/app.js"></script><script>window.history.replaceState(null,null,"/")</script></body></html>';
    const html = captureDocument({ template, publicUrl: base + '/books/a', localOrigin: 'http://localhost' });
    expect(html).toContain('<h1>Saved book title</h1>');
    expect(html).toContain('href="https://example.com/shop/books/a"');
    expect(html).toContain('"url":"https://example.com/shop/books/a"');
    expect(html).toContain('/shop/assets/app.js');
    expect(html).toContain('window.history.replaceState');
    expect(html).not.toContain('privateRuntime');
    expect(html).not.toContain('DO-NOT-EMBED');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('localhost');
  });
  it('rejects loading or mismatched custom pages until the expected page is ready', () => {
    document.documentElement.innerHTML = '<head></head><body><div id="root"><div data-fm-store data-studio-label="Page">Loading</div></div></body>';
    const args = { template: '<html><body></body></html>', publicUrl: base + '/page/about', localOrigin: 'http://localhost' };
    expect(() => captureDocument(args)).toThrow('unfinished custom page');
    document.querySelector('[data-fm-store]')!.setAttribute('data-seo-page', 'other');
    expect(() => captureDocument(args)).toThrow('unfinished custom page');
    document.querySelector('[data-fm-store]')!.setAttribute('data-seo-page', 'about');
    expect(captureDocument(args)).toContain('data-seo-page="about"');
  });
  it('refuses empty shells and error pages instead of publishing them', () => {
    document.documentElement.innerHTML = '<head></head><body><div id="root"></div></body>';
    expect(() => captureDocument({ template: '<html></html>', publicUrl: base + '/', localOrigin: 'http://localhost' })).toThrow();
  });
});

it('rejects category snapshots until the requested collection is selected', () => {
 document.documentElement.innerHTML = '<head></head><body><div id="root"><div data-seo-collection="books">Books</div></div></body>';
 const args = { template: '<html><body></body></html>', publicUrl: base + '/collections/zines', localOrigin: 'http://localhost' };
 expect(() => captureDocument(args)).toThrow('unfinished collection');
 document.querySelector('[data-seo-collection]')!.setAttribute('data-seo-collection', 'zines');
 expect(captureDocument(args)).toContain('data-seo-collection="zines"');
});
