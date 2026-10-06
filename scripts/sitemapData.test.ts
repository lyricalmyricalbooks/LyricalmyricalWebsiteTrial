import { expect, it } from 'vitest';
import { sitemapArtifacts } from './sitemapData.mjs';
it('uses unique catalog routes, escapes XML, excludes private and draft pages, and scopes robots to the deployment path', () => {
  const result = sitemapArtifacts('https://example.com/shop/', [
    { id: 'one', title: 'One', slug: 'same', status: 'published' },
    { id: 'two', title: 'Two', slug: 'same', status: 'published' },
    { id: 'draft', title: 'Draft', status: 'draft' },
  ], [{ slug: 'about&us', status: 'published' }], []);
  expect(result.xml).toContain('https://example.com/shop/books/one');
  expect(result.xml).toContain('https://example.com/shop/books/two');
  expect(result.xml).toContain('/page/about%26us');
  expect(result.xml).not.toContain('/books/draft');
  expect(result.xml).not.toContain('/account');
  expect(result.xml).not.toContain('/wishlist');
  expect(result.robots).toContain('Disallow: /shop/admin');
  expect(result.robots).toContain('Sitemap: https://example.com/shop/sitemap.xml');
});
