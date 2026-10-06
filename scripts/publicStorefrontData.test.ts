import { expect, it } from 'vitest';
import { decodeValue, publishedFingerprint } from './publicStorefrontData.mjs';
const source = () => ({ books: [{ id: 'one', title: 'Book', status: 'published', stockLevel: 2 }, { id: 'draft', status: 'draft', title: 'Draft' }], pages: [{ id: 'page', status: 'published', body: 'Published' }], settings: { design: { categories: [{ name: 'Books' }] }, draftDesign: { color: 'draft' } } });
it('decodes nested public settings and photo arrays without losing booleans or numeric prices', () => {
  expect(decodeValue({ mapValue: { fields: { price: { doubleValue: 3.5 }, hidden: { booleanValue: false }, photos: { arrayValue: { values: [{ mapValue: { fields: { altText: { stringValue: 'Cover' } } } }] } } } } })).toEqual({ price: 3.5, hidden: false, photos: [{ altText: 'Cover' }] });
});
it('ignores drafts and audit timestamps, while detecting public text, price, stock and publication changes', () => {
  const data = source(); const original = publishedFingerprint(data);
  data.settings.draftDesign.color = 'new draft'; data.books[1].title = 'Edited draft';
  Object.assign(data.settings, { updatedAt: 'today', _updateTime: 'today' });
  expect(publishedFingerprint(data)).toBe(original);
  data.books[0].stockLevel = 1;
  expect(publishedFingerprint(data)).not.toBe(original);
  data.books[0].stockLevel = 2; data.settings.design.categories[0].name = 'Zines';
  expect(publishedFingerprint(data)).not.toBe(original);
});
it('changes when a scheduled release becomes public even without another write', () => {
 const data = source(); data.books[0].scheduleDate = '2026-10-07T00:00:00Z';
 expect(publishedFingerprint(data, '2026-10-06T00:00:00Z')).not.toBe(publishedFingerprint(data, '2026-10-08T00:00:00Z'));
});
it('uses stable document and field order so API ordering cannot cause redundant deployments', () => {
 const data = source(); const hash = publishedFingerprint(data);
 expect(publishedFingerprint({ ...data, books: [...data.books].reverse(), settings: { draftDesign: data.settings.draftDesign, design: data.settings.design } })).toBe(hash);
});

it('changes when the scheduled Studio design activates, but ignores edits to a future design', () => {
 const data = source(); const before = publishedFingerprint(data, '2026-10-06T00:00:00Z');
 Object.assign(data.settings, { scheduledPublish: { at: '2026-10-07T00:00:00Z', design: { categories: [{ name: 'Scheduled zines' }] } } });
 expect(publishedFingerprint(data, '2026-10-06T00:00:00Z')).toBe(before);
 expect(publishedFingerprint(data, '2026-10-08T00:00:00Z')).not.toBe(before);
});
