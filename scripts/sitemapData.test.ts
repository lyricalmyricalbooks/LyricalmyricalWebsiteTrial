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

it('indexes only visible published Studio categories and excludes noindex books', () => {
 const settings = { design: { categories: ['PUBLICATIONS', { name: 'Books', id: 'books' }, { name: 'Hidden', id: 'hidden', showInNav: false }, { name: 'Hidden child', parentId: 'hidden' }, { name: 'Zines', parentId: 'books' }, { name: 'Books' }] }, draftDesign: { categories: ['Draft category'] } };
 const result = sitemapArtifacts('https://example.com/shop', [{ id: 'test', title: 'Test', status: 'published', seoNoindex: true }, { id: 'real', title: 'Real', status: 'published' }], [], [{ name: 'Old disconnected collection' }], settings);
 expect(result.xml).toContain('/collections/publications'); expect(result.xml).toContain('/collections/books'); expect(result.xml).toContain('/collections/zines');
 expect(result.xml).not.toContain('/books/test'); expect(result.xml).toContain('/books/real');
 expect(result.xml).not.toContain('hidden'); expect(result.xml).not.toContain('draft-category'); expect(result.xml).not.toContain('old-disconnected');
 expect(result.count).toBe(5);
});

it('uses activated scheduled Studio categories instead of the superseded design', () => {
 const settings = { design: { categories: ['Old'] }, scheduledPublish: { at: '2000-01-01T00:00:00Z', design: { categories: ['Scheduled'] } } };
 const result = sitemapArtifacts('https://example.com/shop', [], [], [], settings);
 expect(result.xml).toContain('/collections/scheduled'); expect(result.xml).not.toContain('/collections/old');
});

it('published store policies are listed so they render as real pages', () => {
  const result = sitemapArtifacts('https://example.com/shop', [], [], [], { policies: { returns: 'Thirty days.', terms: '  ', privacy: 'We keep little.' } });
  expect(result.xml).toContain('https://example.com/shop/page/policy-returns');
  expect(result.xml).toContain('https://example.com/shop/page/policy-privacy');
  expect(result.xml).not.toContain('policy-terms');
  expect(result.xml).not.toContain('policy-shipping');
});
