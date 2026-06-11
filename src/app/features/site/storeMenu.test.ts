import { describe, it, expect } from 'vitest';
import { isExternal, MenuItem } from './storeMenu';

describe('isExternal', () => {
  it('should return true for valid HTTP URLs when type is url', () => {
    const item: MenuItem = { id: '1', label: 'Link', type: 'url', value: 'http://example.com' };
    expect(isExternal(item)).toBe(true);
  });

  it('should return true for valid HTTPS URLs when type is url', () => {
    const item: MenuItem = { id: '2', label: 'Link', type: 'url', value: 'https://example.com' };
    expect(isExternal(item)).toBe(true);
  });

  it('should be case-insensitive for the protocol', () => {
    const item: MenuItem = { id: '3', label: 'Link', type: 'url', value: 'HTTPS://EXAMPLE.COM' };
    expect(isExternal(item)).toBe(true);
  });

  it('should return false for other protocols like ftp', () => {
    const item: MenuItem = { id: '4', label: 'Link', type: 'url', value: 'ftp://example.com' };
    expect(isExternal(item)).toBe(false);
  });

  it('should return false for mailto links', () => {
    const item: MenuItem = { id: '5', label: 'Link', type: 'url', value: 'mailto:test@example.com' };
    expect(isExternal(item)).toBe(false);
  });

  it('should return false for relative paths', () => {
    const item: MenuItem = { id: '6', label: 'Link', type: 'url', value: '/about' };
    expect(isExternal(item)).toBe(false);
  });

  it('should return false when value is an empty string', () => {
    const item: MenuItem = { id: '7', label: 'Link', type: 'url', value: '' };
    expect(isExternal(item)).toBe(false);
  });

  it('should return false when value is undefined', () => {
    const item: MenuItem = { id: '8', label: 'Link', type: 'url' };
    expect(isExternal(item)).toBe(false);
  });

  it('should return false if type is not url, even if value is an absolute URL', () => {
    const item: MenuItem = { id: '9', label: 'Link', type: 'page', value: 'https://example.com' };
    expect(isExternal(item)).toBe(false);
  });

  it('should return false if type is home', () => {
    const item: MenuItem = { id: '10', label: 'Link', type: 'home' };
    expect(isExternal(item)).toBe(false);
  });

  it('should return false if type is collection', () => {
    const item: MenuItem = { id: '11', label: 'Link', type: 'collection', value: 'https://example.com' };
    expect(isExternal(item)).toBe(false);
  });
});
