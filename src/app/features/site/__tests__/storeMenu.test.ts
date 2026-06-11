import { describe, it, expect } from 'vitest';
import { resolveHref, MenuItem } from '../storeMenu';

describe('resolveHref', () => {
  it('should return "/" for type "home"', () => {
    const item: MenuItem = { id: '1', label: 'Home', type: 'home' };
    expect(resolveHref(item)).toBe('/');
  });

  it('should return "/page/{value}" for type "page" when value is provided', () => {
    const item: MenuItem = { id: '2', label: 'About', type: 'page', value: 'about-us' };
    expect(resolveHref(item)).toBe('/page/about-us');
  });

  it('should return "/" for type "page" when value is empty', () => {
    const item: MenuItem = { id: '3', label: 'Empty Page', type: 'page', value: '' };
    expect(resolveHref(item)).toBe('/');
  });

  it('should return "/" for type "page" when value is undefined', () => {
    const item: MenuItem = { id: '4', label: 'Undefined Page', type: 'page' };
    expect(resolveHref(item)).toBe('/');
  });

  it('should return "/collections/{slugified-value}" for type "collection" when value is provided', () => {
    const item: MenuItem = { id: '5', label: 'New Arrivals', type: 'collection', value: 'New Arrivals!' };
    expect(resolveHref(item)).toBe('/collections/new-arrivals');
  });

  it('should return "/" for type "collection" when value is empty', () => {
    const item: MenuItem = { id: '6', label: 'Empty Collection', type: 'collection', value: '' };
    expect(resolveHref(item)).toBe('/');
  });

  it('should return "/" for type "collection" when value is undefined', () => {
    const item: MenuItem = { id: '7', label: 'Undefined Collection', type: 'collection' };
    expect(resolveHref(item)).toBe('/');
  });

  it('should return the value for type "url" when value is provided', () => {
    const item: MenuItem = { id: '8', label: 'Google', type: 'url', value: 'https://google.com' };
    expect(resolveHref(item)).toBe('https://google.com');
  });

  it('should return "#" for type "url" when value is empty', () => {
    const item: MenuItem = { id: '9', label: 'Empty URL', type: 'url', value: '' };
    expect(resolveHref(item)).toBe('#');
  });

  it('should return "#" for type "url" when value is undefined', () => {
    const item: MenuItem = { id: '10', label: 'Undefined URL', type: 'url' };
    expect(resolveHref(item)).toBe('#');
  });

  it('should return "#" for an unknown type', () => {
    // We have to cast to MenuItem since 'unknown-type' isn't valid for MenuLinkType
    const item = { id: '11', label: 'Unknown', type: 'unknown-type' as any };
    expect(resolveHref(item)).toBe('#');
  });
});
