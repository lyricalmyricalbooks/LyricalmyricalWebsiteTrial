import { useEffect, useState } from 'react';
import { SectionCard, TextField, TextArea } from './riso/components';
import { adminApi } from './api';
import { loadCatalog } from '../features/site/loadCatalog';
import { resolveProductRoutes } from '../features/site/productRoutes';
import { getCopy } from '../features/site/storeCopy';
import { bookMetadata, seoChecks } from '../lib/bookSeo';
import type { Book } from '../features/site/types';

export function BookSeoPane({ book, onChange }: { book: Partial<Book>; onChange: (key: string, value: string) => void }) {
  const [design, setDesign] = useState<any>(null);
  const [catalog, setCatalog] = useState<Book[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([adminApi.getSettings(), loadCatalog((size, cursor) => adminApi.getBooks(size, cursor))])
      .then(([settings, books]) => { if (!cancelled) { setDesign(settings?.design); setCatalog(books as Book[]); setLoaded(true); } })
      .catch(() => { /* Show pending URL guidance; never pretend the route was verified. */ });
    return () => { cancelled = true; };
  }, []);
  const meta = bookMetadata(book);
  const title = meta.exactTitle ? meta.title : getCopy(design, 'siteTitleFormat', { title: meta.title });
  const description = meta.description || getCopy(design, 'seoBookDescription', { title: book.title || '' });
  const resolved = loaded && book.id ? resolveProductRoutes([...catalog.filter(b => b.id !== book.id), book]).find(b => b.id === book.id) : null;
  const url = resolved ? new URL(`${import.meta.env.BASE_URL}books/${encodeURIComponent(resolved.slug)}`, window.location.origin).href : '';
  const image = meta.image || design?.shareImageUrl || '';
  const checks = seoChecks(book, title);
  return <>
    <SectionCard title="Search engine listing" description="Edit this book’s search and sharing details. Google may rewrite titles and snippets; rankings are not guaranteed.">
      <div className="be-grid">
        <div className="be-span-2"><TextField label="Search title" value={book.metaTitle || ''} onChange={e => onChange('metaTitle', e.target.value)} placeholder={getCopy(design, 'siteTitleFormat', { title: book.title || '' })} hint={`${title.length} characters in the effective title. A custom title is used exactly as written.`} /></div>
        <div className="be-span-2"><TextArea label="Search description" value={book.metaDescription || ''} onChange={e => onChange('metaDescription', e.target.value)} rows={3} placeholder={meta.description} hint={`${description.length} characters. Leave blank to use a plain-text summary of the book description.`} /></div>
        <div className="be-span-2"><TextField label="Sharing image URL" type="url" value={book.seoImage || ''} onChange={e => onChange('seoImage', e.target.value)} placeholder={book.photos?.[0]?.url || design?.shareImageUrl || ''} hint="Optional HTTPS image. Leave blank to use the cover, then the Studio sharing image." /></div>
      </div>
      <div className="be-serp" aria-label="Search listing preview" aria-live="polite">
        <span className="be-label-xs">Search preview · approximate</span>
        <p className="be-serp-url">{url || (book.id ? 'Loading canonical book URL…' : 'Save the book to establish its public URL.')}</p>
        <p className="be-serp-title">{title || 'Your book title'}</p>
        <p className="be-serp-desc">{description || 'Add a useful description of this book.'}</p>
      </div>
      {image && <div className="be-serp"><span className="be-label-xs">Sharing image preview</span><img src={image} alt="Sharing preview" style={{ display: 'block', maxWidth: '100%', maxHeight: 180, marginTop: 12 }} /></div>}
      <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => { onChange('metaTitle', ''); onChange('metaDescription', ''); onChange('seoImage', ''); }}>Use catalog defaults</button>
    </SectionCard>
    <SectionCard title={`SEO checks · ${checks.filter(c => c.ok).length}/${checks.length}`} description="Content checks are guidance, not a Google ranking score. Changes save with the book.">
      <ul className="be-check">{checks.map(c => <li key={c.id} className={c.ok ? 'is-ok' : ''}><span aria-hidden>{c.ok ? '✓' : '○'}</span> {c.label}<span className="rp-sr-only">{c.ok ? ' Complete.' : ' Needs attention.'}</span></li>)}</ul>
      <p className="rp-hint">Canonical URLs and product details are generated automatically. The public price, currency and availability feed structured data. Submit the deployed sitemap in Google Search Console and inspect the book URL after publishing.</p>
      {url && <a className="rp-btn rp-btn-ghost rp-btn-sm" href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Test deployed URL with Google</a>}
    </SectionCard>
  </>;
}
