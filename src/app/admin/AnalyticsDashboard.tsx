import { openFirstActionQueue } from "./Orders";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi } from "./api";
import { launchReadiness } from "./launchReadiness";
import toast from "react-hot-toast";
import {
  Checkbox, DataTable, EmptyState, ErrorState, LoadingState, MetricCard, SecondaryButton, SectionCard,
  SectionHead, StatusBadge, Tabs, type Column,
} from "./riso/components";
import {
  customerMix, dormantStock, newsletterSummary, reprintWatch, reviewSummary, splitPeriods, stockValue, titleStock, toFulfil,
  totals, REORDER_COVER_DAYS,
} from "./overviewInsights";
import { buildSeries, conversionRate, dailyWindow, funnelRates, funnelTotals, sumField, type SeriesPoint } from "./overviewTraffic";
import { ReadinessPanel, SPLIT, TodoRow, Trend, money, percent } from "./OverviewParts";
import { OverviewSales } from "./OverviewSales";
import { OverviewMarketing } from "./OverviewMarketing";
import { OverviewCustomers } from "./OverviewCustomers";
import { OverviewStock } from "./OverviewStock";

type Period = "today" | "7d" | "30d" | "90d" | "365d";
type Section = "sales" | "marketing" | "customers" | "stock";
const PERIODS: Array<{ id: Period; label: string; days: number; phrase: string }> = [
  { id: "today", label: "Today", days: 1, phrase: "today" },
  { id: "7d", label: "7 days", days: 7, phrase: "the last 7 days" },
  { id: "30d", label: "30 days", days: 30, phrase: "the last 30 days" },
  { id: "90d", label: "90 days", days: 90, phrase: "the last 90 days" },
  { id: "365d", label: "1 year", days: 365, phrase: "the last year" },
];
const SECTION_COPY: Record<Section, string> = {
  sales: "What is selling, in which format, where, and at what discount.",
  marketing: "How people find you, what they search for, and where they drop off.",
  customers: "Who buys, who comes back, and what happens to the carts people leave.",
  stock: "What to reprint, what is gathering dust, what is running low, and who is waiting.",
};
const shortDate = (key: string) => {
  const d = new Date(`${key}T12:00:00Z`);
  return isNaN(d.getTime()) ? key : d.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
};

export function AnalyticsDashboard({ setActiveTab, onEditBook }: { setActiveTab?: (tab: string) => void; onEditBook?: (book: any) => void }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [section, setSection] = useState<Section>("sales");
  const [chartTab, setChartTab] = useState<"traffic" | "revenue">("revenue");
  const [compare, setCompare] = useState(true);
  const [fetchingBookId, setFetchingBookId] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Every source loads on its own so one failure never blanks the page.
  const [daily, setDaily] = useState<{ rows: any[] | null; error: boolean }>({ rows: null, error: false });
  const [allOrders, setAllOrders] = useState<{ orders: any[] | null; error: boolean }>({ orders: null, error: false });
  const [stock, setStock] = useState<{ books: any[] | null; error: boolean }>({ books: null, error: false });
  const [audience, setAudience] = useState<{ data: { reviews: any[]; subscribers: any[] } | null; error: boolean }>({ data: null, error: false });
  const [launch, setLaunch] = useState<{ parts: any | null; error: boolean }>({ parts: null, error: false });

  const loadDaily = useCallback(() => {
    setDaily(d => ({ rows: d.rows, error: false }));
    adminApi.getDailyAnalytics().then((rows: any[]) => setDaily({ rows, error: false }))
      .catch((err: unknown) => { console.error(err); setDaily({ rows: null, error: true }); toast.error("Traffic figures could not be loaded"); });
  }, []);

  useEffect(() => {
    loadDaily();
    Promise.all([
      adminApi.getSettings(),
      adminApi.getShippingProfiles(),
      adminApi.getRecentEmailLog(5),
    ]).then(([settings, shippingProfiles, emailLog]) => setLaunch({ parts: { settings, shippingProfiles, emailLog }, error: false }))
      .catch(() => setLaunch({ parts: null, error: true }));
    // The whole catalogue and every order, so 90-day and 1-year figures are never cut off.
    adminApi.getAllOrders().then((o: any[]) => { setAllOrders({ orders: o, error: false }); setLoadedAt(new Date()); })
      .catch(() => setAllOrders({ orders: null, error: true }));
    adminApi.getAllBooks().then((b: any[]) => setStock({ books: b, error: false }))
      .catch(() => setStock({ books: null, error: true }));
    adminApi.getAudienceSnapshot().then((d: any) => setAudience({ data: d, error: false }))
      .catch(() => setAudience({ data: null, error: true }));
  }, [reloadKey, loadDaily]);

  const refresh = () => {
    setAllOrders({ orders: null, error: false }); setStock({ books: null, error: false });
    setAudience({ data: null, error: false }); setLaunch({ parts: null, error: false }); setDaily({ rows: null, error: false });
    // Panels that load their own extra data (carts, stock sign-ups) remount via their key.
    setReloadKey(k => k + 1);
  };

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
  const books = stock.books || [];

  // Everything sales-related comes from paid, real orders — one source of truth for revenue, orders and conversion.
  const periods = useMemo(() => (allOrders.orders ? splitPeriods(allOrders.orders, days) : null), [allOrders.orders, days]);
  const insights = useMemo(() => {
    if (!periods || !allOrders.orders) return null;
    const rows = titleStock(periods.paid, books);
    return {
      cur: totals(periods.current), prev: totals(periods.previous),
      mix: customerMix(periods.paid, periods.current, periods.start),
      shelf: stockValue(books), reprint: reprintWatch(rows), dormant: dormantStock(rows).slice(0, 5),
      fulfil: toFulfil(allOrders.orders),
    };
  }, [periods, allOrders.orders, books]);

  const readiness = useMemo(() => {
    if (!launch.parts || !allOrders.orders || !stock.books) return null;
    return launchReadiness({ ...launch.parts, books: stock.books, orders: allOrders.orders });
  }, [launch.parts, allOrders.orders, stock.books]);

  // Traffic is recorded per calendar day; windows use the same day keys as the orders above.
  const dw = useMemo(() => dailyWindow(daily.rows || [], days), [daily.rows, days]);
  const trafficReady = daily.rows !== null;
  const visits = { cur: sumField(dw.current, "visits"), prev: sumField(dw.previous, "visits") };
  const trafficSince = dw.firstKey && dw.firstKey > dw.startKey ? dw.firstKey : null;
  const conv = insights ? { cur: conversionRate(insights.cur.orders, visits.cur), prev: conversionRate(insights.prev.orders, visits.prev) } : null;
  const funnel = useMemo(() => funnelRates(funnelTotals(dw.current)), [dw.current]);
  const cartToCheckout = funnel[2].ofPrevious;

  const reviews = audience.data ? reviewSummary(audience.data.reviews) : null;
  const subs = audience.data && periods ? newsletterSummary(audience.data.subscribers, periods.start) : null;

  // "Today" has no hourly data, so its chart shows the last 7 days for context.
  const chartDays = period === "today" ? 7 : days;
  const series: SeriesPoint[] = useMemo(() => (periods ? buildSeries(periods.paid, daily.rows || [], chartDays) : []), [periods, daily.rows, chartDays]);
  const sumOf = (f: keyof SeriesPoint) => series.reduce((a, p) => a + (p[f] as number), 0);
  const chartSummary = series.length
    ? `${chartTab === "traffic" ? "Visitors and sales" : "Net revenue"} over ${series.length} day${series.length === 1 ? "" : "s"}: ` +
      (chartTab === "traffic" ? `${sumOf("visits").toLocaleString()} visitors, ${sumOf("orders").toLocaleString()} sales.` : `${money(sumOf("revenue"))} from ${sumOf("orders").toLocaleString()} paid orders.`)
    : "No chart data for this period.";

  const recentOrders = useMemo(() => (allOrders.orders || []).filter(o => o.isTest !== true).slice(0, 6), [allOrders.orders]);
  const recentColumns: Column<any>[] = [
    { key: "id", header: "Order", lead: true, render: o => <span className="rp-mono">{o.orderId}</span> },
    { key: "cust", header: "Customer", render: o => o.customer?.name || "—" },
    { key: "total", header: "Total", numeric: true, render: o => money(o.total) },
    { key: "pay", header: "Payment", render: o => <StatusBadge tone={o.paymentStatus === "paid" ? "success" : "danger"}>{o.paymentStatus === "paid" ? "✓ Paid" : "✕ Unpaid"}</StatusBadge> },
  ];

  const ordersLoading = !insights && !allOrders.error;
  const stockLoading = stock.books === null && !stock.error;
  const KPI_WAIT = "Loading…";
  const trafficFooter = (text: string) => (daily.error ? "Traffic unavailable" : !trafficReady ? KPI_WAIT : text);
  const refreshLabel = loadedAt ? `Updated ${loadedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loading…";

  return (
    <div className="rp-stack">
      {/* 1 · Period: one control for every figure that depends on it */}
      <SectionHead kicker="Overview" title="How the shop is doing"
        subcopy={`Paid orders in ${meta.phrase}, compared with the ${period === "today" ? "day" : "period"} before.`}
        actions={
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="rp-hint" aria-live="polite">{refreshLabel}</span>
            <SecondaryButton size="sm" onClick={refresh} disabled={ordersLoading}>Refresh</SecondaryButton>
            <Tabs<Period> label="Period" value={period} onChange={setPeriod} tabs={PERIODS.map(p => ({ id: p.id, label: p.label }))} />
          </div>
        } />

      {/* 2 · Launch checks: a slim strip while anything is open, gone once everything is green */}
      <ReadinessPanel error={launch.error} items={readiness} onRetry={refresh} onOpen={tab => setActiveTab?.(tab)} />

      {/* 3 · Headline numbers */}
      {allOrders.error ? <ErrorState title="Sales figures unavailable" description="Orders could not be loaded, so revenue can't be calculated." onRetry={refresh} /> : (
        <>
          <div className="rp-kpi-grid">
            <MetricCard label="Revenue" tone="gold" value={insights ? money(insights.cur.net) : "…"}
              footer={insights ? <><Trend now={insights.cur.net} before={insights.prev.net} /> <span style={{ marginLeft: 6 }}>{insights.cur.refunded > 0 ? `after ${money(insights.cur.refunded)} refunded` : "incl. shipping & tax"}</span></> : KPI_WAIT} />
            <MetricCard label="Orders" value={insights ? insights.cur.orders.toLocaleString() : "…"}
              footer={insights ? <><Trend now={insights.cur.orders} before={insights.prev.orders} /> <span style={{ marginLeft: 6 }}>{insights.cur.units.toLocaleString()} books sold</span></> : KPI_WAIT} />
            <MetricCard label="Average order" value={insights ? money(insights.cur.aov) : "…"}
              footer={insights ? <><Trend now={insights.cur.aov} before={insights.prev.aov} /> <span style={{ marginLeft: 6 }}>per paid order</span></> : KPI_WAIT} />
            <MetricCard label="Visitors → sale" value={conv && trafficReady ? percent(conv.cur) : daily.error ? "—" : "…"}
              footer={conv && trafficReady ? <><Trend now={conv.cur} before={conv.prev} /> <span style={{ marginLeft: 6 }}>paid orders ÷ visits</span></> : trafficFooter(KPI_WAIT)} />
          </div>
          <div className="rp-kpi-grid">
            <MetricCard label="Visitors" value={trafficReady ? visits.cur.toLocaleString() : daily.error ? "—" : "…"}
              footer={trafficReady ? <><Trend now={visits.cur} before={visits.prev} /> <span style={{ marginLeft: 6 }}>{trafficSince ? `recorded since ${shortDate(trafficSince)}` : "sessions in this period"}</span></> : trafficFooter(KPI_WAIT)} />
            <MetricCard label="Cart → checkout" value={trafficReady && funnel[1].count > 0 && cartToCheckout !== null ? percent(cartToCheckout, 0) : trafficReady ? "—" : "…"}
              footer={trafficReady ? (funnel[1].count > 0 ? `${funnel[2].count.toLocaleString()} of ${funnel[1].count.toLocaleString()} carts reached checkout` : "no carts recorded yet") : trafficFooter(KPI_WAIT)} />
            <MetricCard label="Returning readers" value={insights ? percent(insights.mix.returningRate, 0) : "…"}
              footer={insights ? `${insights.mix.returning} returning · ${insights.mix.fresh} new` : KPI_WAIT} />
            <MetricCard label="Refunds & discounts" value={insights ? money(insights.cur.refunded + insights.cur.discounts) : "…"} tone={insights && insights.cur.refunded > 0 ? "warn" : undefined}
              footer={insights ? `${money(insights.cur.refunded)} refunded · ${money(insights.cur.discounts)} in codes` : KPI_WAIT} />
          </div>
        </>
      )}

      {/* 4 · What needs doing, next to the newest orders */}
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

      {/* 5 · The trend behind the numbers */}
      <SectionCard title={chartTab === "traffic" ? "Traffic" : "Revenue"}
        description={period === "today" ? "Hourly data isn't recorded — showing the last 7 days for context." : chartSummary}
        actions={
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <Checkbox label="Compare with the period before" checked={compare} onChange={e => setCompare(e.target.checked)} />
            <Tabs<"traffic" | "revenue"> label="Chart" value={chartTab} onChange={setChartTab} tabs={[{ id: "revenue", label: "Revenue" }, { id: "traffic", label: "Traffic" }]} />
          </div>
        }>
        {allOrders.error ? <ErrorState title="Chart unavailable" description="Orders could not be loaded, so the trend can't be drawn." onRetry={refresh} />
          : chartTab === "traffic" && daily.error ? <ErrorState title="Traffic unavailable" description="Visits could not be loaded." onRetry={loadDaily} />
          : !periods || (chartTab === "traffic" && !trafficReady) ? <LoadingState label="Loading chart…" />
          : series.length === 0 || (sumOf(chartTab === "traffic" ? "visits" : "revenue") === 0 && sumOf("orders") === 0) ? (
            <EmptyState title="Nothing to chart yet" description={chartTab === "traffic" ? "Visits and sales will chart here once the storefront records them." : "Revenue will chart here once customers place paid orders."} />
          ) : (
            <>
              <p className="rp-sr-only">{chartSummary}</p>
              <div style={{ height: 300, width: "100%" }} role="img" aria-label={chartSummary}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--rp-divider)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={24} tick={{ fontSize: 11, fill: "var(--rp-text-subtle)" }} tickFormatter={shortDate} />
                    <YAxis axisLine={false} tickLine={false} width={40} tick={{ fontSize: 11, fill: "var(--rp-text-subtle)" }} />
                    <Tooltip labelFormatter={(k) => shortDate(String(k))} contentStyle={{ background: "var(--rp-surface)", border: "2px solid var(--rp-border-strong)", borderRadius: 0, color: "var(--rp-text)", fontSize: 12 }} />
                    {chartTab === "traffic" ? (
                      <>
                        {compare && <Area type="monotone" dataKey="prevVisits" name="Visitors (before)" stroke="var(--rp-primary)" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />}
                        <Area type="monotone" dataKey="visits" name="Visitors" stroke="var(--rp-primary)" strokeWidth={2.5} fill="var(--rp-primary)" fillOpacity={0.12} />
                        <Area type="monotone" dataKey="orders" name="Sales" stroke="var(--rp-info)" strokeWidth={2.5} fill="var(--rp-info)" fillOpacity={0.1} />
                      </>
                    ) : (
                      <>
                        {compare && <Area type="monotone" dataKey="prevRevenue" name="Net revenue before (CA$)" stroke="var(--rp-warning)" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />}
                        <Area type="monotone" dataKey="revenue" name="Net revenue (CA$)" stroke="var(--rp-success)" strokeWidth={2.5} fill="var(--rp-success)" fillOpacity={0.1} />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>View chart data as a table</summary>
                <div style={{ marginTop: 8 }}>
                  <DataTable caption="Chart data" rows={series} rowKey={(d: SeriesPoint) => d.date}
                    columns={chartTab === "traffic"
                      ? [{ key: "d", header: "Date", render: (d: SeriesPoint) => d.date }, { key: "v", header: "Visitors", numeric: true, render: (d: SeriesPoint) => d.visits }, { key: "o", header: "Sales", numeric: true, render: (d: SeriesPoint) => d.orders }]
                      : [{ key: "d", header: "Date", render: (d: SeriesPoint) => d.date }, { key: "r", header: "Net revenue", numeric: true, render: (d: SeriesPoint) => money(d.revenue) }, { key: "o", header: "Orders", numeric: true, render: (d: SeriesPoint) => d.orders }]} />
                </div>
              </details>
            </>
          )}
      </SectionCard>

      {/* 6 · Detail, grouped by the question you're asking */}
      <SectionHead kicker="Details" title="Dig deeper" subcopy={SECTION_COPY[section]}
        actions={<Tabs<Section> label="Detail" value={section} onChange={setSection}
          tabs={[{ id: "sales", label: "Sales" }, { id: "marketing", label: "Marketing & traffic" }, { id: "customers", label: "Customers" }, { id: "stock", label: "Stock" }]} />} />

      {section === "stock" ? (
        stock.error ? <ErrorState title="Stock unavailable" description="Books could not be loaded." onRetry={refresh} />
        : !insights ? (allOrders.error ? <ErrorState title="Stock insights unavailable" description="Orders could not be loaded, so sales pace can't be calculated." onRetry={refresh} /> : <LoadingState label="Calculating…" />)
        : <OverviewStock key={reloadKey} books={books} shelf={insights.shelf} reprint={insights.reprint} dormant={insights.dormant} setActiveTab={setActiveTab} />
      ) : allOrders.error ? <ErrorState title="Details unavailable" description="Orders could not be loaded, so these lists can't be calculated." onRetry={refresh} />
        : !insights || !periods ? <LoadingState label="Calculating…" />
        : section === "sales" ? (
          <OverviewSales current={periods.current} previous={periods.previous} books={books} dailyCurrent={dw.current}
            categoriesSetting={launch.parts?.settings?.design?.categories} onEditBook={handleEditClick} fetchingBookId={fetchingBookId} />
        ) : section === "marketing" ? (
          daily.error ? <ErrorState title="Traffic unavailable" description="Visits, searches and sources could not be loaded." onRetry={loadDaily} />
          : !trafficReady ? <LoadingState label="Loading traffic…" />
          : <OverviewMarketing dailyCurrent={dw.current} dailyAll={daily.rows || []} current={periods.current} books={books} />
        ) : (
          <OverviewCustomers key={reloadKey} paid={periods.paid} mix={insights.mix} startMs={periods.start} reviews={reviews} subs={subs} audienceFailed={audience.error} setActiveTab={setActiveTab} />
        )}
    </div>
  );
}
