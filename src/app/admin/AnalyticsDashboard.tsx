import { openFirstActionQueue } from "./Orders";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi } from "./api";
import { launchReadiness, readinessSummary } from "./launchReadiness";
import toast from "react-hot-toast";
import {
  DataTable, EmptyState, ErrorState, GhostButton, LoadingState, MetricCard, SecondaryButton, SectionCard,
  SectionHead, StatusBadge, Tabs, type BadgeTone, type Column,
} from "./riso/components";
import {
  bestSellers, change, customerMix, dormantStock, formatMix, newsletterSummary, reprintWatch, reviewSummary,
  splitPeriods, stockValue, titleStock, toFulfil, topCountries, totals, REORDER_COVER_DAYS, DORMANT_DAYS,
} from "./overviewInsights";

type Period = "today" | "7d" | "30d" | "90d" | "365d";
type Section = "sales" | "stock" | "readers";
const PERIODS: Array<{ id: Period; label: string; days: number; phrase: string }> = [
  { id: "today", label: "Today", days: 1, phrase: "today" },
  { id: "7d", label: "7 days", days: 7, phrase: "the last 7 days" },
  { id: "30d", label: "30 days", days: 30, phrase: "the last 30 days" },
  { id: "90d", label: "90 days", days: 90, phrase: "the last 90 days" },
  { id: "365d", label: "1 year", days: 365, phrase: "the last year" },
];
const money = (n: number) => `CA$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const LOW_STOCK = 5;
const SPLIT = { gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" } as const;
const ROW = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 } as const;

/** % change badge; "new" when there is nothing earlier to compare with. */
function Trend({ now, before }: { now: number; before: number }) {
  const v = change(now, before);
  const tone: BadgeTone = v === null || v > 0 ? "success" : v < 0 ? "danger" : "neutral";
  return <StatusBadge tone={tone}>{v === null ? "new" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}</StatusBadge>;
}

/** A bar row: label + value, with a proportional bar underneath. */
function BarRow({ label, value, share, color = "var(--rp-primary)" }: { label: ReactNode; value: ReactNode; share: number; color?: string }) {
  return (
    <li>
      <div style={ROW}><strong style={{ minWidth: 0, overflowWrap: "anywhere" }}>{label}</strong><span className="rp-mono" style={{ whiteSpace: "nowrap" }}>{value}</span></div>
      <div role="presentation" style={{ height: 8, marginTop: 8, background: "var(--rp-surface-inset)", border: "1px solid var(--rp-border)" }}>
        <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, share))}%`, background: color }} />
      </div>
    </li>
  );
}

/** One line of the "to do" list: glyph + word status, what it is, and where to fix it. */
function TodoRow({ label, detail, count, loading, onOpen, openLabel }: {
  label: string; detail: string; count: number | null; loading: boolean; onOpen: () => void; openLabel: string;
}) {
  const clear = count === 0;
  return (
    <li style={ROW}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{loading ? "…" : count} <span style={{ fontWeight: 400 }}>{label}</span></div>
        <div className="rp-hint">{loading ? "Loading…" : clear ? "Nothing to do here" : detail}</div>
      </div>
      {loading ? null : clear
        ? <StatusBadge tone="success">✓ All clear</StatusBadge>
        : <SecondaryButton size="sm" onClick={onOpen}>{openLabel}</SecondaryButton>}
    </li>
  );
}

export function AnalyticsDashboard({ setActiveTab, onEditBook }: { setActiveTab?: (tab: string) => void; onEditBook?: (book: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState<Period>("30d");
  const [section, setSection] = useState<Section>("sales");
  const [chartTab, setChartTab] = useState<"traffic" | "revenue">("revenue");
  const [fetchingBookId, setFetchingBookId] = useState<string | null>(null);
  // Secondary panels load independently so one failure never blanks the page.
  const [allOrders, setAllOrders] = useState<{ orders: any[] | null; error: boolean }>({ orders: null, error: false });
  const [stock, setStock] = useState<{ books: any[] | null; error: boolean }>({ books: null, error: false });
  const [audience, setAudience] = useState<{ data: { reviews: any[]; subscribers: any[] } | null; error: boolean }>({ data: null, error: false });

  const [launch, setLaunch] = useState<{ parts: any | null; error: boolean }>({ parts: null, error: false });

  useEffect(() => {
    loadAnalytics();
    Promise.all([
      adminApi.getSettings(),
      adminApi.getShippingProfiles().catch(() => []),
      adminApi.getRecentEmailLog(5).catch(() => []),
    ]).then(([settings, shippingProfiles, emailLog]) => setLaunch({ parts: { settings, shippingProfiles, emailLog }, error: false }))
      .catch(() => setLaunch({ parts: null, error: true }));
    adminApi.getOrders(500).then((o: any[]) => setAllOrders({ orders: o, error: false }))
      .catch(() => setAllOrders({ orders: null, error: true }));
    adminApi.getBooks(200).then((b: any[]) => setStock({ books: b, error: false }))
      .catch(() => setStock({ books: null, error: true }));
    adminApi.getAudienceSnapshot().then((d: any) => setAudience({ data: d, error: false }))
      .catch(() => setAudience({ data: null, error: true }));
  }, []);

  async function loadAnalytics() {
    setLoading(true); setFailed(false);
    try {
      setData(await adminApi.getAnalytics());
    } catch (err) {
      console.error(err);
      setFailed(true);
      toast.error("Analytics could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  const handleEditClick = async (id: string) => {
    if (!onEditBook) return;
    setFetchingBookId(id);
    try {
      const book = await adminApi.getBook(id);
      if (book) onEditBook(book); else toast.error("Could not find book records");
    } catch {
      toast.error("Failed to load book records");
    } finally {
      setFetchingBookId(null);
    }
  };

  const meta = PERIODS.find(p => p.id === period)!;
  const days = meta.days;

  // Everything sales-related below comes from paid, real orders — one source of truth.
  const insights = useMemo(() => {
    if (!allOrders.orders) return null;
    const p = splitPeriods(allOrders.orders, days);
    const books = stock.books || [];
    const rows = titleStock(p.paid, books);
    return {
      cur: totals(p.current), prev: totals(p.previous),
      mix: customerMix(p.paid, p.current, p.start),
      countries: topCountries(p.current),
      best: bestSellers(p.current, 5),
      formats: formatMix(p.current, books),
      shelf: stockValue(books),
      reprint: reprintWatch(rows),
      dormant: dormantStock(rows).slice(0, 5),
      fulfil: toFulfil(allOrders.orders),
      start: p.start,
    };
  }, [allOrders.orders, stock.books, days]);

  const readiness = useMemo(() => {
    if (!launch.parts || !allOrders.orders || !stock.books) return null;
    return launchReadiness({ ...launch.parts, books: stock.books, orders: allOrders.orders });
  }, [launch.parts, allOrders.orders, stock.books]);

  // Traffic (visits, funnel) is recorded per day; only what was recorded is shown.
  const allDaily: any[] = data?.daily || [];
  const currentSlice = allDaily.slice(-days);
  const previousSlice = allDaily.slice(-days * 2, -days);
  // Hourly data isn't recorded, so "Today" charts the last 7 days for context.
  const chartData = period === "today" ? allDaily.slice(-7) : currentSlice;
  const sum = (arr: any[], f: string) => arr.reduce((a, d) => a + (d[f] || 0), 0);
  const visits = { cur: sum(currentSlice, "visits"), prev: sum(previousSlice, "visits") };
  const conv = {
    cur: visits.cur > 0 ? (sum(currentSlice, "orders") / visits.cur) * 100 : 0,
    prev: visits.prev > 0 ? (sum(previousSlice, "orders") / visits.prev) * 100 : 0,
  };
  const trafficLimited = days > allDaily.length && allDaily.length > 0;

  const funnel = currentSlice.reduce((acc: any, d: any) => {
    const f = d.funnel || {};
    acc.view += f.view || 0; acc.add_to_cart += f.add_to_cart || 0;
    acc.checkout_start += f.checkout_start || 0; acc.purchase += f.purchase || 0;
    return acc;
  }, { view: 0, add_to_cart: 0, checkout_start: 0, purchase: 0 });
  const funnelSteps = [
    { key: "view", label: "Product views", count: funnel.view },
    { key: "add_to_cart", label: "Added to cart", count: funnel.add_to_cart },
    { key: "checkout_start", label: "Started checkout", count: funnel.checkout_start },
    { key: "purchase", label: "Completed purchase", count: funnel.purchase },
  ];
  const maxFunnel = Math.max(1, ...funnelSteps.map(s => s.count));

  const lowStock = useMemo(
    () => (stock.books || []).filter(b => b.status !== "draft" && (b.stockLevel || 0) <= LOW_STOCK)
      .sort((a, b) => (a.stockLevel || 0) - (b.stockLevel || 0)).slice(0, 6),
    [stock.books],
  );
  const reviews = audience.data ? reviewSummary(audience.data.reviews) : null;
  const subs = audience.data && insights ? newsletterSummary(audience.data.subscribers, insights.start) : null;

  const chartSummary = chartData.length
    ? `${chartTab === "traffic" ? "Visitors and sales" : "Gross and net revenue"} over ${chartData.length} day${chartData.length === 1 ? "" : "s"}: ` +
      (chartTab === "traffic"
        ? `${sum(chartData, "visits").toLocaleString()} visitors, ${sum(chartData, "orders").toLocaleString()} sales.`
        : `${money(sum(chartData, "grossRevenue"))} gross, ${money(sum(chartData, "netRevenue"))} net.`)
    : "No chart data for this period.";

  const recentOrders = useMemo(() => (allOrders.orders || []).filter(o => o.isTest !== true).slice(0, 6), [allOrders.orders]);
  const recentColumns: Column<any>[] = [
    { key: "id", header: "Order", lead: true, render: o => <span className="rp-mono">{o.orderId}</span> },
    { key: "cust", header: "Customer", render: o => o.customer?.name || "—" },
    { key: "total", header: "Total", numeric: true, render: o => money(o.total) },
    { key: "pay", header: "Payment", render: o => <StatusBadge tone={o.paymentStatus === "paid" ? "success" : "danger"}>{o.paymentStatus === "paid" ? "✓ Paid" : "✕ Unpaid"}</StatusBadge> },
  ];

  if (loading) return <LoadingState label="Loading overview…" />;
  if (failed) return <ErrorState title="Analytics unavailable" description="The sales figures could not be loaded. Orders and books below may still be available." onRetry={loadAnalytics} />;

  const ordersLoading = !insights && !allOrders.error;
  const stockLoading = stock.books === null && !stock.error;
  const noBooks = "Books could not be loaded.";

  return (
    <div className="rp-stack">
      {/* 1 · Period: one control for every figure that depends on it */}
      <SectionHead kicker="Overview" title="How the shop is doing"
        subcopy={`Paid orders in ${meta.phrase}, compared with the ${period === "today" ? "day" : "period"} before.`}
        actions={<Tabs<Period> label="Period" value={period} onChange={setPeriod} tabs={PERIODS.map(p => ({ id: p.id, label: p.label }))} />} />

      {/* 2 · Headline numbers */}
      {allOrders.error ? <ErrorState title="Sales figures unavailable" description="Orders could not be loaded, so revenue can't be calculated." /> : (
        <div className="rp-kpi-grid">
          <MetricCard label="Revenue" tone="gold" value={insights ? money(insights.cur.revenue) : "…"}
            footer={insights ? <><Trend now={insights.cur.revenue} before={insights.prev.revenue} /> <span style={{ marginLeft: 6 }}>incl. shipping &amp; tax</span></> : "Loading…"} />
          <MetricCard label="Orders" value={insights ? insights.cur.orders.toLocaleString() : "…"}
            footer={insights ? <><Trend now={insights.cur.orders} before={insights.prev.orders} /> <span style={{ marginLeft: 6 }}>{insights.cur.units.toLocaleString()} books sold</span></> : "Loading…"} />
          <MetricCard label="Average order" value={insights ? money(insights.cur.aov) : "…"}
            footer={insights ? <><Trend now={insights.cur.aov} before={insights.prev.aov} /> <span style={{ marginLeft: 6 }}>per paid order</span></> : "Loading…"} />
          <MetricCard label="Visitors → sale" value={`${conv.cur.toFixed(1)}%`}
            footer={<><Trend now={conv.cur} before={conv.prev} /> <span style={{ marginLeft: 6 }}>{visits.cur.toLocaleString()} visits{trafficLimited ? ` (last ${allDaily.length} days recorded)` : ""}</span></>} />
        </div>
      )}

      {/* Launch checklist — hidden once everything is green */}
      {launch.error ? null : !readiness ? null : readinessSummary(readiness) !== "ok" && (
        <SectionCard flush title="Ready to sell?" description="Launch checklist — everything here should be green before you open the shop">
          <ul className="rp-list" aria-label="Launch checklist">
            {readiness.map(item => (
              <li key={item.id} style={ROW}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                  <div className="rp-hint">{item.detail}</div>
                </div>
                {item.status === "ok"
                  ? <StatusBadge tone="success">Done</StatusBadge>
                  : <span style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      <StatusBadge tone={item.status === "block" ? "danger" : "warning"}>{item.status === "block" ? "Blocking" : "Check"}</StatusBadge>
                      <SecondaryButton size="sm" onClick={() => setActiveTab?.(item.tab)}>{item.action}</SecondaryButton>
                    </span>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* 3 · What needs doing, next to the newest orders */}
      <div className="rp-split" style={SPLIT}>
        <SectionCard flush title="To do today" description="Live status — not affected by the period above">
          <ul className="rp-list" aria-label="Things that need attention">
            <TodoRow label="paid orders waiting to ship" count={insights ? insights.fulfil.length : null} loading={ordersLoading}
              detail={insights && insights.fulfil[0] ? `Oldest has waited ${insights.fulfil[0].ageDays} day${insights.fulfil[0].ageDays === 1 ? "" : "s"}` : ""}
              onOpen={() => { openFirstActionQueue(); setActiveTab?.("orders"); }} openLabel="Ship orders" />
            <TodoRow label="reviews to moderate" count={reviews ? reviews.pending : null} loading={!audience.data && !audience.error}
              detail="Readers are waiting to see these" onOpen={() => setActiveTab?.("reviews")} openLabel="Moderate" />
            <TodoRow label="titles to reprint soon" count={insights ? insights.reprint.length : null} loading={ordersLoading || stockLoading}
              detail={`On course to sell out within ${REORDER_COVER_DAYS} days`} onOpen={() => setActiveTab?.("inventory")} openLabel="Open inventory" />
            <TodoRow label="print titles sold out" count={insights ? insights.shelf.soldOut : null} loading={ordersLoading || stockLoading}
              detail="Customers can't buy these right now" onOpen={() => setActiveTab?.("inventory")} openLabel="Open inventory" />
          </ul>
          {(allOrders.error || audience.error || stock.error) && (
            <p className="rp-hint" style={{ padding: "0 20px 16px" }}>
              {[allOrders.error && "orders", audience.error && "reviews", stock.error && "books"].filter(Boolean).join(", ")} could not be loaded, so some counts are missing.
            </p>
          )}
        </SectionCard>

        <SectionCard flush title="Newest orders" actions={<SecondaryButton size="sm" onClick={() => setActiveTab?.("orders")}>All orders</SecondaryButton>}>
          {allOrders.error ? <ErrorState title="Orders unavailable" description="Recent orders could not be loaded." />
            : !allOrders.orders ? <LoadingState label="Loading orders…" />
            : <DataTable caption="Newest orders" columns={recentColumns} rows={recentOrders} rowKey={o => o.id}
                empty={<EmptyState title="No orders yet" description="New orders appear here as soon as customers check out." />} />}
        </SectionCard>
      </div>

      {/* 4 · The trend behind the numbers */}
      <SectionCard title={chartTab === "traffic" ? "Traffic" : "Revenue"}
        description={period === "today" ? "Hourly data isn't recorded — showing the last 7 days for context." : chartSummary}
        actions={<Tabs<"traffic" | "revenue"> label="Chart" value={chartTab} onChange={setChartTab} tabs={[{ id: "revenue", label: "Revenue" }, { id: "traffic", label: "Traffic" }]} />}>
        {chartData.length === 0 ? (
          <EmptyState title="No analytics yet" description="Visits and orders will chart here once the storefront records them." />
        ) : (
          <>
            <p className="rp-sr-only">{chartSummary}</p>
            <div style={{ height: 300, width: "100%" }} role="img" aria-label={chartSummary}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--rp-divider)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={24}
                    tick={{ fontSize: 11, fill: "var(--rp-text-subtle)" }}
                    tickFormatter={(str) => { const d = new Date(str); return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, { day: "numeric", month: "short" }); }} />
                  <YAxis axisLine={false} tickLine={false} width={40} tick={{ fontSize: 11, fill: "var(--rp-text-subtle)" }} />
                  <Tooltip contentStyle={{ background: "var(--rp-surface)", border: "2px solid var(--rp-border-strong)", borderRadius: 0, color: "var(--rp-text)", fontSize: 12 }} />
                  {chartTab === "traffic" ? (
                    <>
                      <Area type="monotone" dataKey="visits" name="Visitors" stroke="var(--rp-primary)" strokeWidth={2.5} fill="var(--rp-primary)" fillOpacity={0.12} />
                      <Area type="monotone" dataKey="orders" name="Sales" stroke="var(--rp-info)" strokeWidth={2.5} fill="var(--rp-info)" fillOpacity={0.1} />
                    </>
                  ) : (
                    <>
                      <Area type="monotone" dataKey="grossRevenue" name="Gross revenue (CA$)" stroke="var(--rp-warning)" strokeWidth={2.5} fill="var(--rp-warning)" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="netRevenue" name="Net revenue (CA$)" stroke="var(--rp-success)" strokeWidth={2.5} fill="var(--rp-success)" fillOpacity={0.1} />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>View chart data as a table</summary>
              <div style={{ marginTop: 8 }}>
                <DataTable caption="Chart data" rows={chartData} rowKey={(d: any) => String(d.date)}
                  columns={chartTab === "traffic"
                    ? [{ key: "d", header: "Date", render: (d: any) => String(d.date) }, { key: "v", header: "Visitors", numeric: true, render: (d: any) => d.visits || 0 }, { key: "o", header: "Sales", numeric: true, render: (d: any) => d.orders || 0 }]
                    : [{ key: "d", header: "Date", render: (d: any) => String(d.date) }, { key: "g", header: "Gross", numeric: true, render: (d: any) => money(d.grossRevenue) }, { key: "n", header: "Net", numeric: true, render: (d: any) => money(d.netRevenue) }]} />
              </div>
            </details>
          </>
        )}
      </SectionCard>

      {/* 5 · Detail, grouped by the question you're asking */}
      <SectionHead kicker="Details" title="Dig deeper"
        subcopy={section === "sales" ? "What is selling, in which format, and where." : section === "stock" ? "What to reprint, what is gathering dust, what is running low." : "Who is buying, how they find you, and where they drop off."}
        actions={<Tabs<Section> label="Detail" value={section} onChange={setSection}
          tabs={[{ id: "sales", label: "Sales" }, { id: "stock", label: "Stock" }, { id: "readers", label: "Readers & traffic" }]} />} />

      {allOrders.error && section !== "stock" ? <ErrorState title="Details unavailable" description="Orders could not be loaded, so these lists can't be calculated." />
        : !insights && section !== "stock" ? <LoadingState label="Calculating…" /> : null}

      {section === "sales" && insights && (
        <div className="rp-split" style={SPLIT}>
          <SectionCard flush title="Best sellers" description="Top titles by revenue">
            {insights.best.length === 0 ? <EmptyState title="No sales in this period" description="Your top titles appear once paid orders arrive." /> : (
              <ul className="rp-list" aria-label="Best selling titles">
                {insights.best.map((b, i) => (
                  <li key={b.id} style={ROW}>
                    <div style={{ minWidth: 0 }}>
                      <span className="rp-mono">{i + 1}. </span>
                      <GhostButton size="sm" onClick={() => handleEditClick(b.id)} disabled={fetchingBookId === b.id}
                        aria-label={`Edit ${b.title}`} style={{ padding: 0, textAlign: "left", whiteSpace: "normal", textTransform: "none", letterSpacing: 0, fontSize: "var(--rp-text-base)" }}>
                        {b.title}
                      </GhostButton>
                      <div className="rp-hint rp-mono">{b.units} sold · {b.share.toFixed(0)}% of revenue</div>
                    </div>
                    <span className="rp-mono" style={{ whiteSpace: "nowrap" }}>{money(b.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard flush title="Format mix"
            description={insights.formats.total > 0 ? `${insights.formats.printShare.toFixed(0)}% print · ${insights.formats.digitalShare.toFixed(0)}% digital` : "Revenue by book format"}>
            {insights.formats.formats.length === 0 ? <EmptyState title="No sales in this period" description="Print vs digital revenue shows here once books sell." /> : (
              <ul className="rp-list" aria-label="Revenue by format">
                {insights.formats.formats.map(f => (
                  <BarRow key={f.format} label={f.format} value={`${money(f.revenue)} · ${f.units} sold`} share={insights.formats.total ? (f.revenue / insights.formats.total) * 100 : 0} />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard flush title="Where readers are" description="Top destinations by revenue">
            {insights.countries.length === 0 ? <EmptyState title="No orders in this period" description="Countries appear once paid orders arrive." /> : (
              <ul className="rp-list" aria-label="Top countries">
                {insights.countries.map(c => (
                  <BarRow key={c.country} label={c.country} value={`${money(c.revenue)} · ${c.orders} order${c.orders === 1 ? "" : "s"}`}
                    share={insights.cur.revenue > 0 ? (c.revenue / insights.cur.revenue) * 100 : 0} color="var(--rp-info)" />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard flush title="Categories" description="All-time sales and recorded visits">
            {data?.categories?.length > 0 ? (
              <ul className="rp-list" aria-label="Categories">
                {data.categories.map((cat: any) => (
                  <li key={cat.name} style={ROW}>
                    <div><strong>{cat.name}</strong><div className="rp-hint rp-mono">{cat.views.toLocaleString()} visits</div></div>
                    <div style={{ textAlign: "right" }}>
                      <div className="rp-mono">{money(cat.revenue)}</div>
                      <div className="rp-hint rp-mono">{cat.sold} sold</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No categories yet" description="Categories with visits or sales will be listed here." />}
          </SectionCard>
        </div>
      )}

      {section === "stock" && (
        stock.error ? <ErrorState title="Stock unavailable" description={noBooks} />
        : !insights ? (allOrders.error ? <ErrorState title="Stock insights unavailable" description="Orders could not be loaded, so sales pace can't be calculated." /> : <LoadingState label="Calculating…" />)
        : (
          <>
            <div className="rp-kpi-grid">
              <MetricCard label="Shelf value" value={money(insights.shelf.value)} footer={`${insights.shelf.units.toLocaleString()} print copies at retail`} />
              <MetricCard label="Print titles" value={insights.shelf.titles} footer={`${insights.shelf.soldOut} sold out`} tone={insights.shelf.soldOut > 0 ? "danger" : undefined} />
              <MetricCard label="Reprint soon" value={insights.reprint.length} footer={`under ${REORDER_COVER_DAYS} days of stock`} tone={insights.reprint.length > 0 ? "warn" : undefined} />
            </div>
            <div className="rp-split" style={SPLIT}>
              <SectionCard flush title="Reprint watch" description={`Selling fast, under ${REORDER_COVER_DAYS} days of stock`}
                actions={<SecondaryButton size="sm" onClick={() => setActiveTab?.("inventory")}>Open inventory</SecondaryButton>}>
                {insights.reprint.length === 0 ? <EmptyState icon="✓" title="No reprints urgent" description="No title is on course to sell out within a month." /> : (
                  <ul className="rp-list" aria-label="Titles to reprint">
                    {insights.reprint.slice(0, 6).map(r => (
                      <li key={r.id} style={ROW}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ overflowWrap: "anywhere", fontWeight: 600 }}>{r.title}</span>
                          <div className="rp-hint rp-mono">{r.sold30} sold in 30 days · {r.stock} left</div>
                        </div>
                        <StatusBadge tone={r.stock <= 0 || (r.coverDays ?? 0) <= 7 ? "danger" : "warning"}>{r.stock <= 0 ? "Sold out" : `~${r.coverDays} days`}</StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard flush title="Slow-moving stock" description={`In stock, no sale in ${DORMANT_DAYS}+ days`}>
                {insights.dormant.length === 0 ? <EmptyState icon="✓" title="Nothing dormant" description="Every title with stock has sold recently." /> : (
                  <ul className="rp-list" aria-label="Slow-moving titles">
                    {insights.dormant.map(r => (
                      <li key={r.id} style={ROW}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ overflowWrap: "anywhere", fontWeight: 600 }}>{r.title}</span>
                          <div className="rp-hint rp-mono">{r.lastSaleDays === null ? "Never sold" : `Last sale ${r.lastSaleDays} days ago`}</div>
                        </div>
                        <StatusBadge tone="neutral">{r.stock} in stock</StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard flush title="Running low" description={`${LOW_STOCK} units or fewer`}
                actions={<SecondaryButton size="sm" onClick={() => setActiveTab?.("catalog")}>Manage books</SecondaryButton>}>
                {lowStock.length === 0 ? <EmptyState icon="✓" title="Stock looks healthy" description="No published titles are at or below the low-stock threshold." /> : (
                  <ul className="rp-list" aria-label="Low stock titles">
                    {lowStock.map(b => (
                      <li key={b.id} style={ROW}>
                        <span style={{ minWidth: 0, overflowWrap: "anywhere", fontWeight: 600 }}>{b.title}</span>
                        <StatusBadge tone={(b.stockLevel || 0) <= 0 ? "danger" : "warning"}>{(b.stockLevel || 0) <= 0 ? "Sold out" : `${b.stockLevel} left`}</StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </>
        )
      )}

      {section === "readers" && insights && (
        <>
          <div className="rp-kpi-grid">
            <MetricCard label="Returning readers" value={`${insights.mix.returningRate.toFixed(0)}%`}
              footer={`${insights.mix.returning} returning · ${insights.mix.fresh} new of ${insights.mix.total} buyers`} />
            <MetricCard label="Subscribers" value={subs ? subs.total.toLocaleString() : audience.error ? "—" : "…"}
              footer={subs ? `+${subs.added} in this period` : audience.error ? "Newsletter unavailable" : "Loading…"} />
            <MetricCard label="Reader rating" value={reviews ? (reviews.average !== null ? `${reviews.average.toFixed(1)} / 5` : "None yet") : audience.error ? "—" : "…"}
              footer={reviews ? `${reviews.approved} approved review${reviews.approved === 1 ? "" : "s"}` : audience.error ? "Reviews unavailable" : "Loading…"} />
            <MetricCard label="Discounts given" value={money(insights.cur.discounts)} footer={`${insights.cur.discountRate.toFixed(1)}% of list price`} />
          </div>
          <div className="rp-split" style={SPLIT}>
            <SectionCard title="Referrals & campaigns" description="All-time orders placed with a ?ref= parameter.">
              {data?.referrals?.length > 0 ? (
                <ol className="rp-list" style={{ margin: -20 }} aria-label="Referral sources">
                  {data.referrals.map((ref: any) => (
                    <BarRow key={ref.name} label={ref.name} value={`${money(ref.revenue)} · ${ref.ordersCount} sales`}
                      share={(ref.revenue / Math.max(1, ...data.referrals.map((r: any) => r.revenue))) * 100} />
                  ))}
                </ol>
              ) : <EmptyState title="No campaign traffic yet" description="Share a link ending in ?ref=name and its orders will appear here." />}
            </SectionCard>

            <SectionCard title="Conversion funnel"
              description={funnel.view > 0 ? `${((funnel.purchase / funnel.view) * 100).toFixed(2)}% of product views end in a purchase` : "Only recorded events are shown."}>
              {funnel.view === 0 ? (
                <EmptyState title="No funnel events recorded" description="Views, add-to-cart, checkout and purchase events chart here once shoppers generate them." />
              ) : (
                <ol className="rp-list" style={{ margin: -20 }} aria-label="Conversion funnel">
                  {funnelSteps.map((step, idx) => {
                    const before = idx === 0 ? null : funnelSteps[idx - 1].count;
                    const dropPct = before ? ((Math.max(0, before - step.count) / before) * 100).toFixed(1) : null;
                    return (
                      <BarRow key={step.key} label={step.label} color="var(--rp-info)" share={(step.count / maxFunnel) * 100}
                        value={<>{step.count.toLocaleString()}{dropPct && <span style={{ color: "var(--rp-danger)" }}> −{dropPct}%</span>}</>} />
                    );
                  })}
                </ol>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
