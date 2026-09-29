import { useState, useEffect, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi } from "./api";
import toast from "react-hot-toast";
import {
  DataTable, EmptyState, ErrorState, GhostButton, LoadingState, MetricCard, SecondaryButton, SectionCard,
  SectionHead, StatusBadge, Tabs, type BadgeTone, type Column,
} from "./riso/components";

type Period = "today" | "7d" | "30d";
const money = (n: number) => `CA$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const LOW_STOCK = 5;

const getTrend = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? "0.0%" : current > 0 ? "+100.0%" : "-100.0%";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
};
const trendTone = (t: string): BadgeTone => (t.startsWith("+") ? "success" : t.startsWith("-") ? "danger" : "neutral");

export function AnalyticsDashboard({ setActiveTab, onEditBook }: { setActiveTab?: (tab: string) => void; onEditBook?: (book: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState<Period>("30d");
  const [chartTab, setChartTab] = useState<"traffic" | "revenue">("traffic");
  const [fetchingBookId, setFetchingBookId] = useState<string | null>(null);
  // Secondary panels load independently so one failure never blanks the page.
  const [recent, setRecent] = useState<{ orders: any[] | null; error: boolean }>({ orders: null, error: false });
  const [stock, setStock] = useState<{ books: any[] | null; error: boolean }>({ books: null, error: false });

  useEffect(() => {
    loadAnalytics();
    adminApi.getOrders(50).then((o: any[]) => setRecent({ orders: o.filter(x => x.isTest !== true).slice(0, 6), error: false }))
      .catch(() => setRecent({ orders: null, error: true }));
    adminApi.getBooks(200).then((b: any[]) => setStock({ books: b, error: false }))
      .catch(() => setStock({ books: null, error: true }));
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

  const allDaily: any[] = data?.daily || [];
  const size = period === "30d" ? 30 : period === "7d" ? 7 : 1;
  const currentSlice = allDaily.slice(-size);
  const previousSlice = allDaily.slice(-size * 2, -size);
  // Hourly data isn't recorded, so "Today" charts the last 7 days for context.
  const chartData = period === "today" ? allDaily.slice(-7) : currentSlice;

  const sum = (arr: any[], f: string) => arr.reduce((a, d) => a + (d[f] || 0), 0);
  const cur = { visits: sum(currentSlice, "visits"), orders: sum(currentSlice, "orders"), revenue: sum(currentSlice, "revenue") };
  const prev = { visits: sum(previousSlice, "visits"), orders: sum(previousSlice, "orders"), revenue: sum(previousSlice, "revenue") };
  const curConv = cur.visits > 0 ? (cur.orders / cur.visits) * 100 : 0;
  const prevConv = prev.visits > 0 ? (prev.orders / prev.visits) * 100 : 0;

  // Funnel: only what was recorded — never invented.
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

  const chartSummary = chartData.length
    ? `${chartTab === "traffic" ? "Visitors and sales" : "Gross and net revenue"} over ${chartData.length} day${chartData.length === 1 ? "" : "s"}: ` +
      (chartTab === "traffic"
        ? `${sum(chartData, "visits").toLocaleString()} visitors, ${sum(chartData, "orders").toLocaleString()} sales.`
        : `${money(sum(chartData, "grossRevenue"))} gross, ${money(sum(chartData, "netRevenue"))} net.`)
    : "No chart data for this period.";

  const recentColumns: Column<any>[] = [
    { key: "id", header: "Order", lead: true, render: o => <span className="rp-mono">{o.orderId}</span> },
    { key: "cust", header: "Customer", render: o => o.customer?.name || "—" },
    { key: "total", header: "Total", numeric: true, render: o => money(o.total) },
    { key: "pay", header: "Payment", render: o => <StatusBadge tone={o.paymentStatus === "paid" ? "success" : "danger"}>{o.paymentStatus === "paid" ? "Paid" : "Unpaid"}</StatusBadge> },
  ];

  if (loading) return <LoadingState label="Loading overview…" />;
  if (failed) return <ErrorState title="Analytics unavailable" description="The sales figures could not be loaded. Orders and books below may still be available." onRetry={loadAnalytics} />;

  const kpis: Array<{ label: string; value: string; trend: string; sub: string; tone?: "gold" | "warn" | "danger" }> = [
    { label: "Visitors", value: cur.visits.toLocaleString(), trend: getTrend(cur.visits, prev.visits), sub: "Total visits" },
    { label: "Orders", value: cur.orders.toLocaleString(), trend: getTrend(cur.orders, prev.orders), sub: "Total sales" },
    { label: "Conversion", value: `${curConv.toFixed(1)}%`, trend: getTrend(curConv, prevConv), sub: "Visitor to sale" },
    { label: "Revenue", value: money(cur.revenue), trend: getTrend(cur.revenue, prev.revenue), sub: "Gross sales", tone: "gold" },
  ];

  return (
    <div className="rp-stack">
      {/* Release banner (updated on every deploy — see CLAUDE.md) */}
      <SectionCard>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 420px", minWidth: 0 }}>
            <div className="rp-kicker">System status &amp; recent release</div>
            <h3 className="rp-sec-title">Lyricalmyrical e-commerce platform updated</h3>
            <p className="rp-page-desc" style={{ maxWidth: "none" }}>
              The storefront, checkout, and admin dashboard were successfully updated on <strong>September 29, 2026 at 5:10 AM UTC</strong>.
              This release completes the Riso Press redesign of the admin: the shell, Orders (list and detail), this Overview, Books,
              Discounts, Pages, and Settings (General, Payments, Shipping, Notifications) now use the design system; the theme editor top bar, tabs and section library do too, and the remaining pages take
              its palette. The Overview no longer shows simulated figures and adds recent orders and low-stock alerts. The storefront Riso
              preset matches the published tokens, and the cart drawer and checkout messages are accessible (dialog focus, stock limits,
              inline errors instead of alerts). Stripe and Resend secret fields are write-only in Settings. Checkout, totals, and the
              Stripe payment path remain untouched.
            </p>
          </div>
          <div className="rp-card" style={{ padding: 14, boxShadow: "none", minWidth: 170, alignSelf: "flex-start" }}>
            <div className="rp-label">Build status</div>
            <div style={{ margin: "6px 0 12px" }}><StatusBadge tone="success">Deploy success</StatusBadge></div>
            <div className="rp-label">Last code push</div>
            <div className="rp-mono" style={{ marginTop: 6 }}>September 29, 05:10 UTC</div>
          </div>
        </div>
      </SectionCard>

      <div>
        <SectionHead kicker="Performance" title="Store metrics" subcopy="Compared with the previous period of the same length."
          actions={<Tabs<Period> label="Period" value={period} onChange={setPeriod}
            tabs={[{ id: "today", label: "Today" }, { id: "7d", label: "7 days" }, { id: "30d", label: "30 days" }]} />} />
        <div className="rp-kpi-grid">
          {kpis.map(k => (
            <MetricCard key={k.label} label={k.label} value={k.value} tone={k.tone}
              footer={<><StatusBadge tone={trendTone(k.trend)}>{k.trend}</StatusBadge> <span style={{ marginLeft: 6 }}>{k.sub}</span></>} />
          ))}
        </div>
      </div>

      <SectionCard title={chartTab === "traffic" ? "Traffic" : "Revenue"}
        description={period === "today" ? "Hourly data isn't recorded — showing the last 7 days for context." : chartSummary}
        actions={<Tabs<"traffic" | "revenue"> label="Chart" value={chartTab} onChange={setChartTab} tabs={[{ id: "traffic", label: "Traffic" }, { id: "revenue", label: "Revenue" }]} />}>
        {chartData.length === 0 ? (
          <EmptyState title="No analytics yet" description="Visits and orders will chart here once the storefront records them." />
        ) : (
          <>
            <p className="rp-sr-only">{chartSummary}</p>
            <div style={{ height: 320, width: "100%" }} role="img" aria-label={chartSummary}>
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

      <div className="rp-split" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}>
        <SectionCard flush title="Recent orders" actions={<SecondaryButton size="sm" onClick={() => setActiveTab?.("orders")}>All orders</SecondaryButton>}>
          {recent.error ? <ErrorState title="Orders unavailable" description="Recent orders could not be loaded." />
            : recent.orders === null ? <LoadingState label="Loading orders…" />
            : <DataTable caption="Recent orders" columns={recentColumns} rows={recent.orders} rowKey={o => o.id}
                empty={<EmptyState title="No orders yet" description="New orders appear here as soon as customers check out." />} />}
        </SectionCard>

        <SectionCard flush title="Low stock" description={`${LOW_STOCK} units or fewer`}
          actions={<SecondaryButton size="sm" onClick={() => setActiveTab?.("catalog")}>Manage books</SecondaryButton>}>
          {stock.error ? <ErrorState title="Inventory unavailable" description="Stock levels could not be loaded." />
            : stock.books === null ? <LoadingState label="Loading inventory…" />
            : lowStock.length === 0 ? <EmptyState icon="✓" title="Stock looks healthy" description="No published titles are at or below the low-stock threshold." />
            : (
              <ul className="rp-list" aria-label="Low stock titles">
                {lowStock.map(b => (
                  <li key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <span style={{ minWidth: 0, overflowWrap: "anywhere", fontWeight: 600 }}>{b.title}</span>
                    <StatusBadge tone={(b.stockLevel || 0) <= 0 ? "danger" : "warning"}>{(b.stockLevel || 0) <= 0 ? "Sold out" : `${b.stockLevel} left`}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
        </SectionCard>
      </div>

      <div className="rp-split" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}>
        <SectionCard flush title="Popular books" actions={<SecondaryButton size="sm" onClick={() => setActiveTab?.("catalog")}>Manage inventory</SecondaryButton>}>
          {data?.topSellers?.length > 0 ? (
            <ul className="rp-list" aria-label="Best selling books">
              {data.topSellers.map((item: any) => (
                <li key={item.id} style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                    {item.photoUrl && <img src={item.photoUrl} alt="" width={40} height={56} style={{ objectFit: "cover", border: "1px solid var(--rp-border-strong)" }} />}
                    <div style={{ minWidth: 0 }}>
                      <GhostButton size="sm" onClick={() => handleEditClick(item.id)} disabled={fetchingBookId === item.id}
                        aria-label={`Edit ${item.title}`} style={{ padding: 0, textAlign: "left", whiteSpace: "normal", textTransform: "none", letterSpacing: 0, fontSize: "var(--rp-text-base)" }}>
                        {item.title}
                      </GhostButton>
                      <div className="rp-hint rp-mono">{item.sold} sold</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="rp-mono" style={{ fontSize: "var(--rp-text-base)" }}>{money(item.revenue)}</div>
                    <StatusBadge tone={item.trend?.startsWith("-") ? "danger" : "success"}>{item.trend || "0%"}</StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No sales recorded yet" description="Your best sellers will rank here after the first paid orders." />}
        </SectionCard>

        <SectionCard flush title="Inventory categories">
          {data?.categories?.length > 0 ? (
            <ul className="rp-list" aria-label="Categories">
              {data.categories.map((cat: any) => (
                <li key={cat.name} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
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

      <div className="rp-split" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))" }}>
        <SectionCard title="Referrals & campaigns" description="Orders placed with a ?ref= parameter.">
          {data?.referrals?.length > 0 ? (
            <ol className="rp-list" style={{ margin: -20 }} aria-label="Referral sources">
              {data.referrals.map((ref: any) => {
                const max = Math.max(1, ...data.referrals.map((r: any) => r.revenue));
                return (
                  <li key={ref.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{ref.name}</strong>
                      <span className="rp-mono">{money(ref.revenue)} · {ref.ordersCount} sales</span>
                    </div>
                    <div role="presentation" style={{ height: 8, marginTop: 8, background: "var(--rp-surface-inset)", border: "1px solid var(--rp-border)" }}>
                      <div style={{ height: "100%", width: `${(ref.revenue / max) * 100}%`, background: "var(--rp-primary)" }} />
                    </div>
                  </li>
                );
              })}
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
                  <li key={step.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span>{step.label}</span>
                      <span className="rp-mono">{step.count.toLocaleString()}{dropPct && <span style={{ color: "var(--rp-danger)" }}> −{dropPct}%</span>}</span>
                    </div>
                    <div role="presentation" style={{ height: 8, marginTop: 8, background: "var(--rp-surface-inset)", border: "1px solid var(--rp-border)" }}>
                      <div style={{ height: "100%", width: `${(step.count / maxFunnel) * 100}%`, background: "var(--rp-info)" }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
