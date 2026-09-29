import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "./api";
import {
  buildCustomers, customerStats, customersToCsv, SEGMENT_LABELS, type CustomerRow, type CustomerSegment,
} from "./customerInsights";
import {
  DataTable, Dialog, EmptyState, ErrorState, FilterBar, LoadingState, MetricCard, Pagination, SearchField,
  SecondaryButton, SectionCard, SelectField, StatusBadge, Tabs, type BadgeTone, type Column,
} from "./riso/components";

const money = (n: number) => `CA$${n.toFixed(2)}`;
const TONE: Record<CustomerSegment, BadgeTone> = { vip: "primary", returning: "success", new: "info", "at-risk": "warning" };
const PAGE_SIZE = 25;

export function Customers() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [seg, setSeg] = useState<"all" | CustomerSegment>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"spent" | "orders" | "recent" | "name">("spent");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<CustomerRow | null>(null);

  const load = async () => {
    setFailed(false); setLoading(true);
    try { setOrders(await adminApi.getOrders(500)); }
    catch (e) { console.error(e); setFailed(true); toast.error("Customers could not be loaded"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const all = useMemo(() => buildCustomers(orders), [orders]);
  const stats = useMemo(() => customerStats(all), [all]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length, vip: 0, returning: 0, new: 0, "at-risk": 0 };
    all.forEach((x) => c[x.segment]++);
    return c;
  }, [all]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all
      .filter((c) => (seg === "all" || c.segment === seg) && (!s || `${c.email} ${c.name} ${c.city}`.toLowerCase().includes(s)))
      .sort((a, b) =>
        sort === "orders" ? b.orderCount - a.orderCount
        : sort === "recent" ? b.lastOrderAt - a.lastOrderAt
        : sort === "name" ? (a.name || a.email).localeCompare(b.name || b.email)
        : b.totalSpent - a.totalSpent);
  }, [all, seg, q, sort]);

  useEffect(() => setPage(1), [seg, q, sort]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((Math.min(page, pageCount) - 1) * PAGE_SIZE, Math.min(page, pageCount) * PAGE_SIZE);

  const exportCsv = () => {
    if (!rows.length) return toast.error("Nothing to export");
    const blob = new Blob([customersToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<CustomerRow>[] = [
    { key: "customer", header: "Customer", lead: true, render: (c) => (
      <button type="button" onClick={() => setOpen(c)} aria-label={`View ${c.name || c.email}`}
        style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", color: "var(--rp-primary-text)", overflowWrap: "anywhere" }}>
        <div style={{ fontWeight: 600, textDecoration: "underline" }}>{c.name || "—"}</div>
        <div className="rp-hint">{c.email}</div>
      </button>
    ) },
    { key: "segment", header: "Segment", render: (c) => <StatusBadge tone={TONE[c.segment]}>{SEGMENT_LABELS[c.segment]}</StatusBadge> },
    { key: "location", header: "Location", render: (c) => [c.city, c.country].filter(Boolean).join(", ") || "—" },
    { key: "orders", header: "Orders", numeric: true, render: (c) => c.orderCount },
    { key: "spent", header: "Total spent", numeric: true, render: (c) => money(c.totalSpent) },
    { key: "aov", header: "Avg order", numeric: true, render: (c) => money(c.avgOrder) },
    { key: "last", header: "Last order", render: (c) => `${new Date(c.lastOrderAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} (${c.daysSinceLast}d ago)` },
  ];

  if (loading) return <LoadingState label="Loading customers…" />;
  if (failed) return <ErrorState title="Customers could not be loaded" onRetry={load} />;

  return (
    <div className="rp-stack">
      <div className="rp-grid" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <MetricCard label="Customers" value={stats.total} footer="With at least one paid order" />
        <MetricCard label="Repeat rate" value={`${Math.round(stats.repeatRate * 100)}%`} footer={`${stats.repeat} bought more than once`} />
        <MetricCard label="Avg lifetime value" value={money(stats.avgLtv)} footer="Per customer" />
        <MetricCard label="At risk" value={counts["at-risk"]} tone={counts["at-risk"] ? "warn" : undefined} footer="No order in 180+ days" />
      </div>
      <Tabs label="Customer segments" value={seg} onChange={(v) => setSeg(v as any)}
        tabs={[
          { id: "all", label: "All", count: counts.all },
          { id: "vip", label: "VIP", count: counts.vip },
          { id: "returning", label: "Returning", count: counts.returning },
          { id: "new", label: "New", count: counts.new },
          { id: "at-risk", label: "At risk", count: counts["at-risk"] },
        ]} />
      <FilterBar>
        <div className="rp-grow"><SearchField label="Search customers" placeholder="Search name, email or city…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <SelectField label="Sort customers" hideLabel value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="spent">Total spent</option>
          <option value="orders">Order count</option>
          <option value="recent">Most recent</option>
          <option value="name">Name A–Z</option>
        </SelectField>
        <SecondaryButton icon={<Download size={16} aria-hidden />} onClick={exportCsv}>Export CSV</SecondaryButton>
      </FilterBar>
      <SectionCard flush title="Customers" description={`${rows.length} customer${rows.length === 1 ? "" : "s"} · built from your ${orders.length} most recent orders (paid, non-test)`}>
        <DataTable caption="Customers" columns={columns} rows={pageRows} rowKey={(c) => c.key}
          empty={<EmptyState title="No customers match" description="Customers appear after their first paid order." />} />
        {rows.length > PAGE_SIZE && <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onPage={setPage} />}
      </SectionCard>

      {open && (
        <Dialog open size="lg" title={open.name || open.email} description={`${open.email} · ${SEGMENT_LABELS[open.segment]}`} onClose={() => setOpen(null)}>
          <div className="rp-stack">
            <p className="rp-hint">
              {open.orderCount} order{open.orderCount === 1 ? "" : "s"} · {money(open.totalSpent)} lifetime · first order {new Date(open.firstOrderAt).toLocaleDateString()}
            </p>
            <DataTable caption="Order history" rowKey={(o) => o.id}
              rows={open.orders}
              columns={[
                { key: "id", header: "Order", render: (o: any) => <span className="rp-mono">{o.orderId}</span> },
                { key: "date", header: "Date", render: (o: any) => new Date(o.createdAt).toLocaleDateString() },
                { key: "items", header: "Items", numeric: true, render: (o: any) => o.items?.length || 0 },
                { key: "total", header: "Total", numeric: true, render: (o: any) => money(Number(o.total) || 0) },
              ]} />
            <a className="rp-btn" data-variant="secondary" href={`mailto:${open.email}`}>Email customer</a>
          </div>
        </Dialog>
      )}
    </div>
  );
}
