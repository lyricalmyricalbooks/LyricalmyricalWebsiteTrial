import { describe, it, expect } from 'vitest';
import { getFeaturedBooks } from './selectors';
import { DEFAULT_BOOKS } from './constants';
import type { Book } from './types';

describe('getFeaturedBooks', () => {
  it('returns featured books that are published', () => {
    const mockBooks = [
      { id: '1', title: 'Featured 1', status: 'published', isFeatured: true },
      { id: '2', title: 'Not Featured', status: 'published', isFeatured: false },
      { id: '3', title: 'Featured but Draft', status: 'draft', isFeatured: true },
    ] as Book[];

    const result = getFeaturedBooks(mockBooks);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('limits the result to 4 books', () => {
    const mockBooks = Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      title: `Book ${i}`,
      status: 'published',
      isFeatured: true,
    })) as Book[];

    const result = getFeaturedBooks(mockBooks);
    expect(result).toHaveLength(4);
  });

  it('returns DEFAULT_BOOKS if no books match the criteria', () => {
    const mockBooks = [
      { id: '1', title: 'Not Featured', status: 'published', isFeatured: false },
    ] as Book[];

    const result = getFeaturedBooks(mockBooks);
    expect(result).toEqual(DEFAULT_BOOKS.slice(0, 4));
  });

  it('returns DEFAULT_BOOKS when input array is empty', () => {
    const result = getFeaturedBooks([]);
    expect(result).toEqual(DEFAULT_BOOKS.slice(0, 4));
  });
});
