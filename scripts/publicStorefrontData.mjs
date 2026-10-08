import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dueScheduledDesign } from '../src/app/features/site/scheduledDesign.mjs';

export function decodeValue(value = {}) {
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, child]) => [key, decodeValue(child)]));
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('integerValue' in value) return Number(value.integerValue);
  return value.stringValue ?? value.doubleValue ?? value.booleanValue ?? value.timestampValue ?? null;
}
const decodeDocument = document => ({ ...decodeValue({ mapValue: { fields: document.fields } }), id: document.name.split('/').at(-1), _updateTime: document.updateTime });
async function publicRead(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Public data read failed: ${response.status}`);
  return response.json();
}
export async function readPublicStorefront() {
  const config = await readFile(new URL('../src/lib/firebase.ts', import.meta.url), 'utf8');
  const project = config.match(/projectId:\s*"([^"]+)"/)?.[1];
  if (!project) throw new Error('Firebase project ID missing');
  const endpoint = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/`;
  async function collection(name) {
    const documents = [];
    let token;
    do {
      const url = new URL(endpoint + name);
      url.searchParams.set('pageSize', '300');
      if (token) url.searchParams.set('pageToken', token);
      const data = await publicRead(url);
      documents.push(...(data.documents || []).map(decodeDocument));
      token = data.nextPageToken;
    } while (token);
    return documents;
  }
  const [books, pages, settings] = await Promise.all([collection('books'), collection('pages'), publicRead(endpoint + 'settings/website').then(decodeDocument)]);
  return { books, pages, settings };
}
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().filter(key => !['updatedAt', '_updateTime'].includes(key)).map(key => [key, stable(value[key])])) : value;
export function effectivePublishedSettings(settings, now = new Date().toISOString()) {
  const { draftDesign, scheduledPublish, savedThemes, designPublishedAt, ...published } = settings;
  const scheduled = dueScheduledDesign(settings, now);
  if (scheduled) published.design = scheduled;
  return published;
}
// A plain release date starts that day in Toronto (src/app/features/site/liveBook.ts releaseArrived).
export function releaseArrived(scheduleDate, nowISO = new Date().toISOString()) {
  if (!scheduleDate) return true;
  const value = String(scheduleDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(nowISO));
    return value <= today;
  }
  const at = Date.parse(value);
  return Number.isFinite(at) ? at <= Date.parse(nowISO) : value <= nowISO;
}
export function publishedFingerprint({ books, pages, settings }, now = new Date().toISOString()) {
  const publishedSettings = effectivePublishedSettings(settings, now);
  const live = books.filter(book => (!book.status || book.status === 'published') && releaseArrived(book.scheduleDate, now));
  const snapshot = { books: [...live].sort((a, b) => a.id.localeCompare(b.id)), pages: pages.filter(page => page.status === 'published').sort((a, b) => a.id.localeCompare(b.id)), settings: publishedSettings };
  return createHash('sha256').update(JSON.stringify(stable(snapshot))).digest('hex');
}
