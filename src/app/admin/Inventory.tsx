import { useEffect, useMemo, useState } from "react";
import { Download, Minus, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "./api";
import {
  buildInventory, inventorySummary, inventoryToCsv, parseStock, STATUS_LABELS, DEFAULT_LOW_STOCK,
  type InventoryRow, type StockStatus,
} from "./inventoryInsights";
import {
  DataTable, EmptyState, ErrorState, FilterBar, IconButton, LoadingState, MetricCard, Pagination, SearchField,
  SecondaryButton, SectionCard, StatusBadge, Tabs, TextField, type BadgeTone, type Column,
} from "./riso/components";

const TONE: Record<StockStatus, BadgeTone> = { out: "danger", low: "warning", reprint: "info", ok: "success", digital: "neutral" };
const PAGE_SIZE = 25;

export function Inventory() {
  const [books, setBooks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"all" | StockStatus>("all");
  const [q, setQ] = useState("");
  const [threshold, setThreshold] = useState(DEFAULT_LOW_STOCK);
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const load = async () => {
    setFailed(false); setLoading(true);
    try {
      const [b, o] = await Promise.all([adminApi.getAllBooks(), adminApi.getOrders(500)]);
      setBooks(b); setOrders(o.filter((x: any) => x.paymentStatus === "paid" && x.isTest !== true));
    } catch (e) { console.error(e); setFailed(true); toast.error("Inventory could not be loaded"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const all = useMemo(() => buildInventory(books, orders, threshold), [books, orders, threshold]);
  const sum = useMemo(() => inventorySummary(all), [all]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length, out: 0, low: 0, reprint: 0, ok: 0, digital: 0 };
    all.forEach((r) => c[r.status]++);
    return c;
  }, [all]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((r) => (tab === "all" || r.status === tab) && (!s || r.title.toLowerCase().includes(s)))
      .sort((a, b) => (a.digital ? 1 : 0) - (b.digital ? 1 : 0) || a.stock - b.stock);
  }, [all, tab, q]);
  useEffect(() => setPage(1), [tab, q, threshold]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((Math.min(page, pageCount) - 1) * PAGE_SIZE, Math.min(page, pageCount) * PAGE_SIZE);

  const setStock = async (r: InventoryRow, next: number) => {
    if (next === r.stock) { setDrafts((d) => { const { [r.id]: _, ...rest } = d; return rest; }); return; }
    setSaving((s) => new Set(s).add(r.id));
    try {
      await adminApi.updateBook(r.id, { title: r.title, stockLevel: next });
      setBooks((bs) => bs.map((b) => (b.id === r.id ? { ...b, stockLevel: next } : b)));
      toast.success(`${r.title}: ${r.stock} → ${next}`);
    } catch (e) { console.error(e); toast.error(`Could not update ${r.title}`); }
    finally {
      setSaving((s) => { const n = new Set(s); n.delete(r.id); return n; });
      setDrafts((d) => { const { [r.id]: _, ...rest } = d; return rest; });
    }
  };
  const commit = (r: InventoryRow) => {
    const raw = drafts[r.id];
    if (raw === undefined) return;
    const n = parseStock(raw);
    if (n === null) { toast.error("Enter a whole number"); setDrafts((d) => { const { [r.id]: _, ...rest } = d; return rest; }); return; }
    setStock(r, n);
  };

  const exportCsv = () => {
    if (!rows.length) return toast.error("Nothing to export");
    const url = URL.createObjectURL(new Blob([inventoryToCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<InventoryRow>[] = [
    { key: "title", header: "Title", lead: true, render: (r) => <div style={{ overflowWrap: "anywhere" }}><div style={{ fontWeight: 600 }}>{r.title}</div><div className="rp-hint">{r.format || "—"}</div></div> },
    { key: "status", header: "Status", render: (r) => <StatusBadge tone={TONE[r.status]}>{STATUS_LABELS[r.status]}</StatusBadge> },
    { key: "stock", header: "On hand", render: (r) => r.digital ? "—" : (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <IconButton label={`Decrease stock of ${r.title}`} disabled={saving.has(r.id) || r.stock <= 0} onClick={() => setStock(r, r.stock - 1)}><Minus size={14} aria-hidden /></IconButton>
        <input className="rp-input rp-mono" style={{ width: 72, textAlign: "right" }} inputMode="numeric" aria-label={`Stock for ${r.title}`}
          value={drafts[r.id] ?? String(r.stock)} disabled={saving.has(r.id)}
          onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
          onBlur={() => commit(r)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setDrafts((d) => { const { [r.id]: _, ...rest } = d; return rest; }); }} />
        <IconButton label={`Increase stock of ${r.title}`} disabled={saving.has(r.id)} onClick={() => setStock(r, r.stock + 1)}><Plus size={14} aria-hidden /></IconButton>
      </div>
    ) },
    { key: "sold", header: "Sold (30d)", numeric: true, render: (r) => r.sold30 },
    { key: "cover", header: "Days of cover", numeric: true, render: (r) => r.coverDays ?? "—" },
    { key: "value", header: "Stock value", numeric: true, render: (r) => r.digital ? "—" : `CA$${r.value.toFixed(2)}` },
  ];

  if (loading) return <LoadingState label="Loading inventory…" />;
  if (failed) return <ErrorState title="Inventory could not be loaded" onRetry={load} />;

  return (
    <div className="rp-stack">
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <MetricCard label="Units on hand" value={sum.units} footer="Print titles" />
        <MetricCard label="Stock value" value={`CA$${sum.value.toFixed(0)}`} footer="At retail price" />
        <MetricCard label="Out of stock" value={sum.out} tone={sum.out ? "danger" : undefined} footer="Cannot be bought" />
        <MetricCard label="Low / reprint soon" value={sum.low + sum.reprint} tone={sum.low + sum.reprint ? "warn" : undefined} footer={`${sum.low} low · ${sum.reprint} selling fast`} />
      </div>
      <Tabs label="Stock status" value={tab} onChange={(v) => setTab(v as any)}
        tabs={[
          { id: "all", label: "All", count: counts.all }, { id: "out", label: "Out of stock", count: counts.out },
          { id: "low", label: "Low stock", count: counts.low }, { id: "reprint", label: "Reprint soon", count: counts.reprint },
          { id: "ok", label: "In stock", count: counts.ok }, { id: "digital", label: "Digital", count: counts.digital },
        ]} />
      <FilterBar>
        <div className="rp-grow"><SearchField label="Search titles" placeholder="Search titles…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <TextField label="Low-stock at or below" type="number" min={0} value={String(threshold)} onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))} />
        <SecondaryButton icon={<Download size={16} aria-hidden />} onClick={exportCsv}>Export CSV</SecondaryButton>
      </FilterBar>
      <SectionCard flush title="Inventory" description="Edit a count and press Enter, or use − / +. Sales reduce stock automatically after payment; edits here are for receipts, reprints and corrections.">
        <DataTable caption="Inventory" columns={columns} rows={pageRows} rowKey={(r) => r.id}
          empty={<EmptyState title="No titles match" description="Try another status tab or search." />} />
        {rows.length > PAGE_SIZE && <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onPage={setPage} />}
      </SectionCard>
    </div>
  );
}
