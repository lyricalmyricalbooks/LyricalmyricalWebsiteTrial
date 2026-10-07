import { useMemo } from "react";
import { DataTable, EmptyState, SectionCard, StatusBadge, type Column } from "./riso/components";
import type { Book, Order } from "./overviewInsights";
import {
  bookInterest, funnelRates, funnelTotals, rankMap, recordedSince, sourcePerformance, sumMap, type Daily, type SourceRow,
} from "./overviewTraffic";
import { BarRow, SPLIT, StatRow, money, percent } from "./OverviewParts";

const since = (key: string | null) => (key ? new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null);
const NOT_YET = (what: string) => <EmptyState icon="⏳" title="Not recorded yet" description={`${what} start counting once shoppers visit the updated storefront. Until then there is nothing to show — not even zero.`} />;

/** Overview › Dig deeper › Marketing & traffic: how people arrive, what they look for, and where they drop off. */
export function OverviewMarketing({ dailyCurrent, dailyAll, current, books }: {
  dailyCurrent: Daily[]; dailyAll: Daily[]; current: Order[]; books: Book[];
}) {
  const funnel = useMemo(() => funnelRates(funnelTotals(dailyCurrent)), [dailyCurrent]);
  const visitsBySource = useMemo(() => sumMap(dailyCurrent, "sources"), [dailyCurrent]);
  const sources = useMemo(() => sourcePerformance(visitsBySource, current), [visitsBySource, current]);
  const devices = useMemo(() => rankMap(sumMap(dailyCurrent, "devices"), 3), [dailyCurrent]);
  const searches = useMemo(() => rankMap(sumMap(dailyCurrent, "searches"), 8), [dailyCurrent]);
  const missed = useMemo(() => rankMap(sumMap(dailyCurrent, "noResults"), 8), [dailyCurrent]);
  const interest = useMemo(() => bookInterest(sumMap(dailyCurrent, "bookViews"), current, books), [dailyCurrent, current, books]);

  const deviceTotal = devices.reduce((s, d) => s + d.count, 0);
  const maxFunnel = Math.max(1, ...funnel.map(s => s.count));
  const sourceColumns: Column<SourceRow>[] = [
    { key: "src", header: "Source", lead: true, render: r => r.source },
    { key: "visits", header: "Visits", numeric: true, render: r => (r.visits ? r.visits.toLocaleString() : "—") },
    { key: "orders", header: "Orders", numeric: true, render: r => r.orders },
    { key: "rev", header: "Revenue", numeric: true, render: r => money(r.revenue) },
    { key: "conv", header: "Visit → sale", numeric: true, render: r => (r.conversion === null ? "—" : percent(r.conversion)) },
  ];

  return (
    <div className="rp-split" style={SPLIT}>
      <SectionCard title="Conversion funnel"
        description={funnel[0].count > 0 ? `${percent((funnel[3].count / funnel[0].count) * 100, 2)} of product views end in a purchase` : "Only recorded events are shown."}>
        {funnel[0].count === 0 ? (
          <EmptyState title="No funnel events recorded" description="Views, add-to-cart, checkout and purchase events chart here once shoppers generate them." />
        ) : (
          <ol className="rp-list" style={{ margin: -20 }} aria-label="Conversion funnel">
            {funnel.map(step => (
              <BarRow key={step.key} label={step.label} color="var(--rp-info)" share={(step.count / maxFunnel) * 100}
                value={<>{step.count.toLocaleString()}{step.ofPrevious !== null && <span style={{ color: "var(--rp-text-muted)" }}> · {percent(step.ofPrevious, 0)} of previous</span>}</>} />
            ))}
          </ol>
        )}
      </SectionCard>

      <SectionCard flush title="Traffic sources"
        description={recordedSince(dailyAll, "sources") ? `Where visits came from, and which of them bought · recorded since ${since(recordedSince(dailyAll, "sources"))}` : "Where visits came from, and which of them bought"}>
        {sources.length === 0
          ? (recordedSince(dailyAll, "sources") ? <EmptyState title="No visits in this period" description="Sources appear when shoppers arrive." /> : NOT_YET("Traffic sources"))
          : <DataTable caption="Traffic sources" columns={sourceColumns} rows={sources} rowKey={r => r.source} />}
        <p className="rp-hint" style={{ padding: "12px 20px 16px" }}>Share a link ending in <span className="rp-mono">?ref=name</span> and it shows up here under that name. Visits with no referrer count as direct.</p>
      </SectionCard>

      <SectionCard flush title="Devices" description="What shoppers browse on">
        {devices.length === 0 ? NOT_YET("Devices") : (
          <ul className="rp-list" aria-label="Visits by device">
            {devices.map(d => <BarRow key={d.key} label={d.key[0].toUpperCase() + d.key.slice(1)} value={`${d.count.toLocaleString()} · ${percent(deviceTotal ? (d.count / deviceTotal) * 100 : 0, 0)}`}
              share={deviceTotal ? (d.count / deviceTotal) * 100 : 0} color="var(--rp-info)" />)}
          </ul>
        )}
      </SectionCard>

      <SectionCard flush title="What people search for" description="Most common searches that found books">
        {searches.length === 0 ? NOT_YET("Search terms") : (
          <ul className="rp-list" aria-label="Top searches">
            {searches.map(s => <StatRow key={s.key} label={s.key} value={`${s.count}×`} />)}
          </ul>
        )}
      </SectionCard>

      <SectionCard flush title="Searches that found nothing" description="Books or topics shoppers want that the shop doesn't show">
        {missed.length === 0
          ? (recordedSince(dailyAll, "noResults") || recordedSince(dailyAll, "searches")
              ? <EmptyState icon="✓" title="No empty searches" description="Every recorded search found something." />
              : NOT_YET("Empty searches"))
          : (
            <ul className="rp-list" aria-label="Searches with no results">
              {missed.map(s => <StatRow key={s.key} label={s.key} value={<StatusBadge tone="warning">{s.count}×</StatusBadge>} />)}
            </ul>
          )}
      </SectionCard>

      <SectionCard flush title="Most viewed books" description="Product-page views beside copies sold in this period">
        {interest.rows.length === 0 ? NOT_YET("Book views") : (
          <ul className="rp-list" aria-label="Most viewed books">
            {interest.rows.slice(0, 8).map(r => (
              <StatRow key={r.id} label={r.title}
                hint={`${r.views.toLocaleString()} views · ${r.sold} sold${r.viewToSale !== null ? ` · ${percent(r.viewToSale)} of viewers bought` : ""}`}
                value={interest.watch.some(w => w.id === r.id) ? <StatusBadge tone="warning">looked at, not bought</StatusBadge> : <StatusBadge tone={r.sold > 0 ? "success" : "neutral"}>{r.sold > 0 ? "selling" : "quiet"}</StatusBadge>} />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
