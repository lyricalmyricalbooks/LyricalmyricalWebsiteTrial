import { releaseArrived } from "../features/site/liveBook";
import { CatalogReviewDialog } from "./CatalogReviewDialog";
import { catalogPublishIssues } from "./catalogPublishReview";
import { useState, useEffect, useMemo } from "react";
import { Download, Plus } from "lucide-react";
import { catalogToCsv, previewPrices, type PriceMode } from "./bulkPricing";
import { adminApi } from "./api";
import toast from "react-hot-toast";
import {
  ActionMenu, Checkbox, ConfirmDialog, DataTable, Dialog, DestructiveButton, TextField, EmptyState, ErrorState, FilterBar, LoadingState, Pagination,
  PrimaryButton, SearchField, SecondaryButton, SectionCard, SelectField, StatusBadge, type BadgeTone, type Column,
} from "./riso/components";

interface BookCatalogProps {
  onEdit: (book: any) => void;
  onAdd: () => void;
  refreshTrigger?: number;
}

type SortKey = "newest" | "oldest" | "title" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";
const PAGE_SIZE = 25;
const LOW_STOCK = 5;

const slugOf = (b: any) => b.slug || (b.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Sub-path safe public URL (the site is served under /LyricalmyricalWebsiteTrial/ on GitHub Pages). */
const listingUrl = (b: any) =>
  `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/books/${slugOf(b)}`;

function stockBadge(b: any): { tone: BadgeTone; text: string } {
  const n = b.stockLevel || 0;
  if (n <= 0) return { tone: "danger", text: "Sold out" };
  if (n <= LOW_STOCK) return { tone: "warning", text: `${n} left` };
  return { tone: "success", text: `${n} in stock` };
}

function publicationBadge(b: any): { tone: BadgeTone; text: string } {
  if (b.status === "draft") return { tone: "neutral", text: "Draft" };
  // Same Toronto-day rule as the storefront and checkout (liveBook.ts releaseArrived).
  if (b.scheduleDate && !releaseArrived(b.scheduleDate)) return { tone: "info", text: "Scheduled" };
  return { tone: "success", text: "Published" };
}

export function BookCatalog({ onEdit, onAdd, refreshTrigger }: BookCatalogProps) {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [formatFilter, setFormatFilter] = useState("All");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [review, setReview] = useState<"publish" | "draft" | null>(null);
  const [qualityOnly, setQualityOnly] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceMode, setPriceMode] = useState<PriceMode>("percent");
  const [priceValue, setPriceValue] = useState("10");
  const [confirm, setConfirm] = useState<null | { kind: "bulk"; } | { kind: "one"; book: any }>(null);

  useEffect(() => { loadBooks(); }, [refreshTrigger]);

  async function loadBooks() {
    setFailed(false);
    try {
      setBooks(await adminApi.getAllBooks());
    } catch (err) {
      console.error(err);
      setFailed(true);
      toast.error("Failed to load books");
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const cats = new Set<string>();
    books.forEach(b => (b.categories || b.genres || []).forEach((c: string) => c && cats.add(c.trim())));
    return ["All", ...Array.from(cats)];
  }, [books]);
  const formats = useMemo(() => ["All", ...Array.from(new Set(books.map(b => b.format).filter(Boolean)))], [books]);

  const haystackCache = useMemo(() => new WeakMap<any, string>(), []);
  const q = search.trim().toLowerCase();

  const rows = useMemo(() => {
    const list = books.filter(b => {
      if (qualityOnly && !catalogPublishIssues(b).length) return false;
      if (q) {
        let h = haystackCache.get(b);
        if (!h) { h = [b.title, b.isbn, b.sku, b.authorName].join(" ").toLowerCase(); haystackCache.set(b, h); }
        if (!h.includes(q)) return false;
      }
      const cats = (b.categories || b.genres || []).map((c: string) => c.toUpperCase().trim());
      if (categoryFilter !== "All" && !cats.includes(categoryFilter.toUpperCase().trim())) return false;
      if (formatFilter !== "All" && b.format !== formatFilter) return false;
      if (statusFilter === "Published" && !(b.status === "published" && b.stockLevel > 0)) return false;
      if (statusFilter === "Sold Out" && b.stockLevel !== 0) return false;
      if (statusFilter === "Drafts" && b.status !== "draft") return false;
      return true;
    });
    const cmp: Record<SortKey, (a: any, b: any) => number> = {
      newest: (a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
      oldest: (a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
      title: (a, b) => String(a.title || "").localeCompare(String(b.title || "")),
      "price-asc": (a, b) => (a.retailPrice || 0) - (b.retailPrice || 0),
      "price-desc": (a, b) => (b.retailPrice || 0) - (a.retailPrice || 0),
      "stock-asc": (a, b) => (a.stockLevel || 0) - (b.stockLevel || 0),
      "stock-desc": (a, b) => (b.stockLevel || 0) - (a.stockLevel || 0),
    };
    return [...list].sort(cmp[sort]);
  }, [books, q, categoryFilter, formatFilter, statusFilter, sort, haystackCache, qualityOnly]);

  useEffect(() => { setPage(1); setSelected([]); }, [q, categoryFilter, formatFilter, statusFilter, sort, qualityOnly]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pageCount);
  const pageRows = rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const allSelected = pageRows.length > 0 && pageRows.every(b => selected.includes(b.id));
  const toggle = (id: string) => setSelected(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const bulkDelete = async () => {
    if (!selected.length) return;
    const promise = Promise.all(selected.map(id => adminApi.deleteBook(id)));
    toast.promise(promise, { loading: "Applying changes…", success: "Bulk update successful", error: "Some updates failed" });
    try { await promise; } catch { /* surfaced by toast */ }
    setSelected([]);
    loadBooks();
  };

  const selectedBooks = useMemo(() => books.filter(b => selected.includes(b.id)), [books, selected]);
  const pricePreview = useMemo(
    () => (priceOpen && priceValue.trim() !== "" ? previewPrices(selectedBooks, priceMode, Number(priceValue)) : []),
    [priceOpen, selectedBooks, priceMode, priceValue]);

  const applyPrices = async () => {
    const changes = pricePreview;
    setPriceOpen(false);
    if (!changes.length) return;
    const promise = Promise.all(changes.map(c => adminApi.updateBook(c.id, { title: c.title, retailPrice: c.to })));
    toast.promise(promise, { loading: "Updating prices…", success: `Updated ${changes.length} price${changes.length === 1 ? "" : "s"}`, error: "Some price updates failed" });
    try { await promise; } catch { /* surfaced by toast */ }
    setSelected([]);
    loadBooks();
  };

  const bulkFeature = async (featured: boolean) => {
    const promise = Promise.all(selectedBooks.map(b => adminApi.updateBook(b.id, { title: b.title, isFeatured: featured, featured })));
    toast.promise(promise, { loading: "Applying changes…", success: featured ? "Marked as featured" : "Removed from featured", error: "Some updates failed" });
    try { await promise; } catch { /* surfaced by toast */ }
    setSelected([]);
    loadBooks();
  };

  const exportCsv = () => {
    const list = selected.length ? selectedBooks : rows;
    if (!list.length) return toast.error("Nothing to export");
    const url = URL.createObjectURL(new Blob([catalogToCsv(list)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `books-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteOne = async (book: any) => {
    try { await adminApi.deleteBook(book.id); toast.success("Title deleted"); loadBooks(); } catch { toast.error("Failed to delete"); }
  };

  const columns: Column<any>[] = [
    { key: "sel", header: "Select", render: b => <Checkbox label="" aria-label={`Select ${b.title}`} checked={selected.includes(b.id)} onChange={() => toggle(b.id)} /> },
    { key: "title", header: "Title", lead: true, render: b => (
      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 220 }}>
        {b.photoUrl || b.photos?.[0]?.url
          ? <img src={b.photoUrl || b.photos?.[0]?.url} alt="" width={36} height={50} style={{ flexShrink: 0, objectFit: "cover", border: "1px solid var(--rp-border-strong)" }} />
          : <span aria-hidden="true" style={{ flexShrink: 0, width: 36, height: 50, border: "1px solid var(--rp-border)", background: "var(--rp-surface-inset)" }} />}
        <div style={{ minWidth: 0 }}>
          <button type="button" onClick={() => onEdit(b)} aria-label={`Edit ${b.title}`}
            style={{ all: "unset", cursor: "pointer", fontWeight: 600, overflowWrap: "anywhere", textDecoration: "underline", textUnderlineOffset: 3 }}>
            {b.title || "Untitled"}
          </button>
          <div className="rp-hint" style={{ overflowWrap: "anywhere" }}>{b.authorName || "No author"}</div>
        </div>
      </div>
    ) },
    { key: "status", header: "Status", render: b => { const s = publicationBadge(b); return <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}><StatusBadge tone={s.tone}>{s.text}</StatusBadge>{(b.isFeatured ?? b.featured) && <StatusBadge tone="primary">Featured</StatusBadge>}</span>; } },
    { key: "format", header: "Format", render: b => b.format || "—" },
    { key: "isbn", header: "ISBN / SKU", render: b => <span className="rp-mono">{b.isbn || b.sku || "—"}</span> },
    { key: "stock", header: "Inventory", render: b => { const s = stockBadge(b); return <StatusBadge tone={s.tone}>{s.text}</StatusBadge>; } },
    { key: "price", header: "Price", numeric: true, render: b => `CA$${Number(b.retailPrice || 0).toFixed(2)}` },
    { key: "actions", header: "Actions", render: b => (
      <ActionMenu label={`Actions for ${b.title}`} actions={[
        { label: "Edit", onSelect: () => onEdit(b) },
        { label: "Duplicate", onSelect: async () => { try { await adminApi.duplicateBook(b.id); toast.success("Title duplicated"); loadBooks(); } catch { toast.error("Failed to duplicate"); } } },
        { label: "View listing", onSelect: () => window.open(listingUrl(b), "_blank", "noopener") },
        { label: "Delete", tone: "danger", onSelect: () => setConfirm({ kind: "one", book: b }) },
      ]} />
    ) },
  ];

  if (loading) return <LoadingState label="Loading books…" />;
  if (failed) return <ErrorState description="Your books could not be loaded." onRetry={() => { setLoading(true); loadBooks(); }} />;

  if (books.length === 0) {
    return (
      <SectionCard>
        <EmptyState icon="📚" title="No books yet" description="Add your first title to start selling — it appears on the storefront as soon as it's published."
          action={<PrimaryButton icon={<Plus size={16} aria-hidden />} onClick={onAdd}>Add book</PrimaryButton>} />
      </SectionCard>
    );
  }

  return (
    <div className="rp-stack">
      <Checkbox label="Show books needing publish review" checked={qualityOnly} onChange={event => setQualityOnly(event.target.checked)} />
      <FilterBar>
        <div className="rp-grow"><SearchField label="Search books" placeholder="Search title, author, ISBN or SKU…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <SelectField label="Publication status" hideLabel value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {["All", "Published", "Sold Out", "Drafts"].map(v => <option key={v}>{v}</option>)}
        </SelectField>
        <SelectField label="Category" hideLabel value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          {categories.map(v => <option key={v} value={v}>{v === "All" ? "All categories" : v}</option>)}
        </SelectField>
        <SelectField label="Format" hideLabel value={formatFilter} onChange={e => setFormatFilter(e.target.value)}>
          {formats.map(v => <option key={v} value={v}>{v === "All" ? "All formats" : v}</option>)}
        </SelectField>
        <SelectField label="Sort books" hideLabel value={sort} onChange={e => setSort(e.target.value as SortKey)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="stock-asc">Stock: low to high</option>
          <option value="stock-desc">Stock: high to low</option>
        </SelectField>
        <PrimaryButton icon={<Plus size={16} aria-hidden />} onClick={onAdd}>Add book</PrimaryButton>
      </FilterBar>

      <SectionCard flush title="Catalog" description={`${rows.length} of ${books.length} title${books.length === 1 ? "" : "s"}`}
        actions={
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Checkbox label={selected.length ? `${selected.length} selected` : "Select page"} checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : pageRows.map(b => b.id))} />
            <SecondaryButton size="sm" icon={<Download size={14} aria-hidden />} onClick={exportCsv}>{selected.length ? "Export selected" : "Export CSV"}</SecondaryButton>
            {selected.length > 0 && (
              <>
                <SecondaryButton size="sm" onClick={() => setReview("publish")}>Publish</SecondaryButton>
                <SecondaryButton size="sm" onClick={() => setReview("draft")}>Move to draft</SecondaryButton>
                <SecondaryButton size="sm" onClick={() => setPriceOpen(true)}>Change price</SecondaryButton>
                <SecondaryButton size="sm" onClick={() => bulkFeature(true)}>Feature</SecondaryButton>
                <SecondaryButton size="sm" onClick={() => bulkFeature(false)}>Unfeature</SecondaryButton>
                <DestructiveButton size="sm" onClick={() => setConfirm({ kind: "bulk" })}>Delete</DestructiveButton>
              </>
            )}
          </div>
        }>
        <DataTable caption="Books" columns={columns} rows={pageRows} rowKey={b => b.id}
          empty={<EmptyState title="No books match" description="Try clearing the search or filters."
            action={<SecondaryButton onClick={() => { setSearch(""); setStatusFilter("All"); setCategoryFilter("All"); setFormatFilter("All"); }}>Reset filters</SecondaryButton>} />} />
        {rows.length > PAGE_SIZE && <Pagination page={cur} pageCount={pageCount} onPage={setPage} />}
      </SectionCard>

      {review && <CatalogReviewDialog books={selectedBooks} action={review} onClose={() => setReview(null)} onConfirm={async chosen => {
        const results = await Promise.allSettled(chosen.map(book => adminApi.updateBook(book.id, { status: review === "publish" ? "published" : "draft" })));
        const failed = chosen.filter((_, index) => results[index].status === "rejected");
        setSelected(failed.map(book => book.id));
        setReview(null);
        if (failed.length) toast.error(`Could not update: ${failed.map(book => book.title).join(", ")}. These books remain selected for retry.`);
        else toast.success(`Updated ${chosen.length} books.`);
        await loadBooks();
      }} />}
      <Dialog open={priceOpen} onClose={() => setPriceOpen(false)} title={`Change price for ${selected.length} title${selected.length === 1 ? "" : "s"}`}
        description="Preview the new prices before anything is saved."
        footer={<><SecondaryButton onClick={() => setPriceOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton onClick={applyPrices} disabled={!pricePreview.length}>Apply to {pricePreview.length}</PrimaryButton></>}>
        <div className="rp-stack">
          <SelectField label="How" value={priceMode} onChange={e => setPriceMode(e.target.value as PriceMode)}>
            <option value="percent">Change by percent (e.g. -10 for 10% off)</option>
            <option value="amount">Change by amount (e.g. 2 adds CA$2)</option>
            <option value="set">Set exact price</option>
          </SelectField>
          <TextField label="Value" type="number" step="0.01" value={priceValue} onChange={e => setPriceValue(e.target.value)} />
          <ul className="rp-hint" style={{ margin: 0, paddingLeft: 18, maxHeight: 200, overflow: "auto" }} aria-label="Price preview">
            {pricePreview.slice(0, 20).map(c => <li key={c.id}>{c.title}: CA${c.from.toFixed(2)} → <strong>CA${c.to.toFixed(2)}</strong></li>)}
            {pricePreview.length > 20 && <li>…and {pricePreview.length - 20} more</li>}
            {!pricePreview.length && <li>No prices would change.</li>}
          </ul>
        </div>
      </Dialog>
      <ConfirmDialog open={confirm?.kind === "bulk"} title={`Delete ${selected.length} title${selected.length === 1 ? "" : "s"}?`} confirmLabel="Delete permanently"
        message="This permanently removes the selected books from the catalog. Set them to draft instead if you may want them back."
        onConfirm={() => { setConfirm(null); bulkDelete(); }} onCancel={() => setConfirm(null)} />
      <ConfirmDialog open={confirm?.kind === "one"} title="Delete this title?" confirmLabel="Delete title"
        message={confirm?.kind === "one" ? `Are you sure you want to delete “${confirm.book.title}”? This cannot be undone.` : ""}
        onConfirm={() => { const b = (confirm as any).book; setConfirm(null); deleteOne(b); }} onCancel={() => setConfirm(null)} />
    </div>
  );
}
