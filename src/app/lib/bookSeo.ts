import type { Book } from '../features/site/types';

/** Search descriptions are plain text, even when catalog descriptions are rich HTML. */
export function searchText(value = ''): string {
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi, (_, entity) => {
      const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      if (entity[0] !== '#') return named[entity.toLowerCase()] ?? '';
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/\s+/g, ' ').trim();
}

export function canonicalUrl(value: string): string {
  const url = new URL(value);
  url.search = '';
  url.hash = '';
  return url.href;
}

export function bookMetadata(book: Partial<Book>) {
  return {
    title: searchText(book.metaTitle) || searchText(book.title),
    exactTitle: !!searchText(book.metaTitle),
    description: searchText(book.metaDescription) || searchText(book.description).slice(0, 160),
    image: book.seoImage?.trim() || book.photos?.[0]?.url || '',
  };
}

export function bookStructuredData(book: Book & Record<string, any>, options: { currency: string; price: number; url: string }) {
  const variants = book.variants || [];
  const backorder = book.onBackorder || (variants.length > 0 && variants.every((v: any) => v.onBackorder));
  const available = variants.length ? variants.some(v => Number(v.stockLevel ?? v.stock ?? 0) > 0) : Number(book.stockLevel ?? 999) > 0;
  return {
    '@context': 'https://schema.org',
    '@type': ['Product', 'Book'],
    '@id': options.url + '#book',
    url: options.url,
    name: book.title,
    description: searchText(book.description),
    image: (book.photos || []).map(p => p.url).filter(Boolean).map(url => new URL(url, options.url).href),
    ...(book.isbn ? { isbn: book.isbn } : {}),
    ...(book.sku ? { sku: book.sku } : {}),
    ...(book.language ? { inLanguage: book.language } : {}),
    ...(book.authorName ? { author: { '@type': 'Person', name: book.authorName } } : {}),
    ...(book.publisher ? { publisher: { '@type': 'Organization', name: book.publisher } } : {}),
    offers: {
      '@type': 'Offer', url: options.url,
      priceCurrency: options.currency,
      price: Number(options.price).toFixed(2),
      availability: `https://schema.org/${backorder ? 'BackOrder' : available ? 'InStock' : 'OutOfStock'}`,
    },
  };
}

export function seoChecks(book: Partial<Book>, listingTitle = bookMetadata(book).title) {
  const meta = bookMetadata(book);
  return [
    { id: 'title', ok: listingTitle.length > 0 && listingTitle.length <= 60, label: 'Use a clear, unique search title; about 60 characters is a useful guide.' },
    { id: 'description', ok: meta.description.length >= 80 && meta.description.length <= 160, label: 'Write a useful search summary of about 80–160 characters. Google may choose its own snippet.' },
    { id: 'content', ok: searchText(book.description).length >= 100, label: 'Describe this book’s subject, creator and edition in the book description.' },
    { id: 'cover', ok: !!book.photos?.[0]?.url, label: 'Add a cover photo so product results can include an image.' },
    { id: 'alt', ok: !!book.photos?.length && book.photos.every(p => !!p.altText?.trim()), label: 'Describe each book photo with meaningful alt text in Media.' },
    { id: 'isbn', ok: !!book.isbn?.trim(), label: 'Add the ISBN when this edition has one; do not invent an identifier.' },
    { id: 'published', ok: book.status === 'published', label: 'Publish the book to make its public page available to search engines.' },
  ];
}
