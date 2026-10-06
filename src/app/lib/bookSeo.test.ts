import { describe, expect, it } from 'vitest';
import { bookMetadata, bookStructuredData, canonicalUrl, seoChecks } from './bookSeo';
const book = { id: 'one', title: 'Photo book', description: '<p>Art &amp; photography.</p>', retailPrice: 24, stockLevel: 0, status: 'published', slug: 'photo-book', metaTitle: 'An artist’s photo book', metaDescription: 'A unique collection of photographs.', seoImage: 'https://example.com/share.jpg' };
describe('book search metadata', () => {
  it('uses saved search fields and sharing image', () => {
    expect(bookMetadata(book)).toMatchObject({ title: book.metaTitle, description: book.metaDescription, image: book.seoImage, exactTitle: true });
  });
  it('falls back to clean catalog text without changing the catalog', () => {
    expect(bookMetadata({ ...book, metaTitle: '', metaDescription: '', seoImage: '' }).description).toBe('Art & photography.');
    expect(book.description).toBe('<p>Art &amp; photography.</p>');
  });
  it('strips tracking parameters and fragments from canonical URLs', () => {
    expect(canonicalUrl('https://example.com/shop/books/one?utm_source=x#reviews')).toBe('https://example.com/shop/books/one');
  });
  it('emits Product and Book markup using the displayed currency and price', () => {
    const data = bookStructuredData(book, { currency: 'EUR', price: 19.2, url: 'https://example.com/shop/books/one' });
    expect(data['@type']).toEqual(['Product', 'Book']);
    expect(data.offers).toMatchObject({ priceCurrency: 'EUR', price: '19.20', availability: 'https://schema.org/OutOfStock' });
    expect(data.description).toBe('Art & photography.');
    expect(data.aggregateRating).toBeUndefined();
  });
  it('supports backorders and variant availability without inventing stock', () => {
    const options = { currency: 'CAD', price: 24, url: 'https://example.com/books/one' };
    expect(bookStructuredData({ ...book, onBackorder: true }, options).offers.availability).toBe('https://schema.org/BackOrder');
    expect(bookStructuredData({ ...book, variants: [{ stock: 2 }, { stock: 0 }] }, options).offers.availability).toBe('https://schema.org/InStock');
  });
  it('resolves relative cover images to absolute URLs for crawlers', () => {
    const data = bookStructuredData({ ...book, photos: [{ url: '/shop/cover.jpg' }] }, { currency: 'CAD', price: 24, url: 'https://example.com/shop/books/one' });
    expect(data.image).toEqual(['https://example.com/shop/cover.jpg']);
  });
  it('flags missing content and draft visibility with actionable checks', () => {
    const checks = seoChecks({ ...book, description: '', metaDescription: '', status: 'draft' });
    expect(checks.find(c => c.id === 'description')?.ok).toBe(false);
    expect(checks.find(c => c.id === 'published')?.ok).toBe(false);
  });
});
