import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCopy, DEFAULT_COPY } from './storeCopy';

describe('getCopy', () => {
  const currentYear = new Date().getFullYear();

  it('should resolve a string from design.copy[key]', () => {
    const design = { copy: { testKey: 'Copy from design.copy' } };
    expect(getCopy(design, 'testKey')).toBe('Copy from design.copy');
  });

  it('should resolve a string from legacy flat design[key]', () => {
    const design = { testKey: 'Copy from legacy flat design' };
    expect(getCopy(design, 'testKey')).toBe('Copy from legacy flat design');
  });

  it('should prioritize design.copy[key] over design[key]', () => {
    const design = {
      copy: { testKey: 'Priority Copy' },
      testKey: 'Legacy Copy'
    };
    expect(getCopy(design, 'testKey')).toBe('Priority Copy');
  });

  it('should fallback to DEFAULT_COPY[key] when not found in design', () => {
    const defaultKey = Object.keys(DEFAULT_COPY)[0];
    const expectedValue = DEFAULT_COPY[defaultKey];
    expect(getCopy({}, defaultKey)).toBe(expectedValue);
  });

  it('should return empty string when key is not found anywhere', () => {
    expect(getCopy({}, 'nonExistentKey')).toBe('');
  });

  it('should correctly replace {year} token', () => {
    const design = { copy: { yearKey: 'Copyright {year}' } };
    expect(getCopy(design, 'yearKey')).toBe(`Copyright ${currentYear}`);
  });

  it('should correctly replace multiple {year} tokens', () => {
    const design = { copy: { yearKey: '{year} - The Year {year}' } };
    expect(getCopy(design, 'yearKey')).toBe(`${currentYear} - The Year ${currentYear}`);
  });

  it('should correctly replace custom variables passed via vars', () => {
    const design = { copy: { greetingKey: 'Hello {name}, welcome to {place}!' } };
    const vars = { name: 'Alice', place: 'Wonderland' };
    expect(getCopy(design, 'greetingKey', vars)).toBe('Hello Alice, welcome to Wonderland!');
  });

  it('should leave unknown tokens unchanged', () => {
    const design = { copy: { tokenKey: 'This is an {unknown} token.' } };
    expect(getCopy(design, 'tokenKey')).toBe('This is an {unknown} token.');
  });

  it('should handle both custom vars and {year} replacement', () => {
    const design = { copy: { mixedKey: 'In {year}, {author} wrote a book.' } };
    const vars = { author: 'John Doe' };
    expect(getCopy(design, 'mixedKey', vars)).toBe(`In ${currentYear}, John Doe wrote a book.`);
  });

  it('should handle null/undefined design', () => {
    const defaultKey = Object.keys(DEFAULT_COPY)[0];
    const expectedValue = DEFAULT_COPY[defaultKey];

    // @ts-expect-error - testing invalid input
    expect(getCopy(null, defaultKey)).toBe(expectedValue);
    // @ts-expect-error - testing invalid input
    expect(getCopy(undefined, defaultKey)).toBe(expectedValue);
  });

  it('should handle null/undefined design with missing keys (return empty string)', () => {
    // @ts-expect-error - testing invalid input
    expect(getCopy(null, 'nonExistentKey')).toBe('');
    // @ts-expect-error - testing invalid input
    expect(getCopy(undefined, 'nonExistentKey')).toBe('');
  });

  it('should allow vars to override year if explicitly provided', () => {
    const design = { copy: { yearKey: 'Year: {year}' } };
    const vars = { year: 1999 };
    expect(getCopy(design, 'yearKey', vars)).toBe('Year: 1999');
  });

  it('should allow number values in vars', () => {
    const design = { copy: { countKey: 'You have {count} items.' } };
    const vars = { count: 42 };
    expect(getCopy(design, 'countKey', vars)).toBe('You have 42 items.');
  });
});
