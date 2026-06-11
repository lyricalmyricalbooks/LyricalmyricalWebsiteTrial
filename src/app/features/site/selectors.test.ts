import { describe, it, expect } from 'vitest';
import { getFeaturedBooks } from './selectors';
import { DEFAULT_BOOKS } from './constants';
import type { Book } from './types';

describe('getFeaturedBooks', () => {
  it('should return published and featured books', () => {
    const books: Book[] = [
      { id: '1', title: 'Book 1', status: 'published', isFeatured: true } as Book,
      { id: '2', title: 'Book 2', status: 'draft', isFeatured: true } as Book,
      { id: '3', title: 'Book 3', status: 'published', isFeatured: false } as Book,
    ];

    const result = getFeaturedBooks(books);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should return a maximum of 4 books', () => {
    const books: Book[] = [
      { id: '1', title: 'Book 1', status: 'published', isFeatured: true } as Book,
      { id: '2', title: 'Book 2', status: 'published', isFeatured: true } as Book,
      { id: '3', title: 'Book 3', status: 'published', isFeatured: true } as Book,
      { id: '4', title: 'Book 4', status: 'published', isFeatured: true } as Book,
      { id: '5', title: 'Book 5', status: 'published', isFeatured: true } as Book,
    ];

    const result = getFeaturedBooks(books);
    expect(result).toHaveLength(4);
    expect(result.map(b => b.id)).toEqual(['1', '2', '3', '4']);
  });

  it('should return DEFAULT_BOOKS when no matching books are found', () => {
    const books: Book[] = [
      { id: '1', title: 'Book 1', status: 'draft', isFeatured: true } as Book,
      { id: '2', title: 'Book 2', status: 'published', isFeatured: false } as Book,
    ];

    const result = getFeaturedBooks(books);
    expect(result).toEqual(DEFAULT_BOOKS.slice(0, 4));
  });

  it('should return DEFAULT_BOOKS when the input array is empty', () => {
    const result = getFeaturedBooks([]);
    expect(result).toEqual(DEFAULT_BOOKS.slice(0, 4));
  });
});
