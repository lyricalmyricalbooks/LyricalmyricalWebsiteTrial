import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState, MetricCard, SecondaryButton, SectionCard, StatusBadge } from "./riso/components";
import type { Order } from "./overviewInsights";
import { cartRecovery } from "./overviewTraffic";
import { buildCustomers, customerStats, SEGMENT_LABELS } from "./customerInsights";
import { abandonedCartApi } from "../lib/commerce";
import { SPLIT, StatRow, money, percent } from "./OverviewParts";

type Mix = { total: number; returning: number; fresh: number; returningRate: number };
type Reviews = { pending: number; approved: number; average: number | null } | null;
type Subs = { total: number; added: number } | null;

/** Overview › Dig deeper › Customers: who buys, who comes back, and what happens to carts people leave. */
export function OverviewCustomers({ paid, mix, startMs, reviews, subs, audienceFailed, setActiveTab }: {
  paid: Order[]; mix: Mix; startMs: number; reviews: Reviews; subs: Subs; audienceFailed: boolean; setActiveTab?: (tab: string) => void;
}) {
  // Carts are read only when this tab is opened (the panel mounts then), so the Overview itself stays light.
  const [carts, setCarts] = useState<{ rows: any[] | null; error: boolean }>({ rows: null, error: false });
  const load = () => {
    setCarts({ rows: null, error: false });
    abandonedCartApi.list(500).then(rows => setCarts({ rows, error: false })).catch(() => setCarts({ rows: null, error: true }));
  };
  useEffect(load, []);

  const customers = useMemo(() => buildCustomers(paid), [paid]);
  const stats = useMemo(() => customerStats(customers), [customers]);
  const top = useMemo(() => [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5), [customers]);
  const recovery = useMemo(() => (carts.rows ? cartRecovery(carts.rows, startMs) : null), [carts.rows, startMs]);

  return (
    <>
      <div className="rp-kpi-grid">
        <MetricCard label="Returning readers" value={percent(mix.returningRate, 0)}
          footer={`${mix.returning} returning · ${mix.fresh} new of ${mix.total} buyers this period`} />
        <MetricCard label="Repeat customers" value={percent(stats.repeatRate * 100, 0)}
          footer={`${stats.repeat} of ${stats.total} customers ever bought twice`} />
        <MetricCard label="Lifetime value" value={money(stats.avgLtv)} footer="average spend per customer, all time" />
        <MetricCard label="Subscribers" value={subs ? subs.total.toLocaleString() : audienceFailed ? "—" : "…"}
          footer={subs ? `+${subs.added} in this period` : audienceFailed ? "Newsletter unavailable" : "Loading…"} />
      </div>

      <div className="rp-split" style={SPLIT}>
        <SectionCard flush title="Top customers" description="By total spend, all time"
          actions={<SecondaryButton size="sm" onClick={() => setActiveTab?.("customers")}>All customers</SecondaryButton>}>
          {top.length === 0 ? <EmptyState title="No customers yet" description="Customers appear after their first paid order." /> : (
            <ul className="rp-list" aria-label="Top customers">
              {top.map(c => (
                <StatRow key={c.key} label={c.name || c.email}
                  hint={`${c.orderCount} order${c.orderCount === 1 ? "" : "s"} · last ${c.daysSinceLast} day${c.daysSinceLast === 1 ? "" : "s"} ago${c.country ? ` · ${c.country}` : ""}`}
                  value={<span style={{ display: "flex", gap: 8, alignItems: "center" }}><StatusBadge tone={c.segment === "vip" ? "primary" : c.segment === "at-risk" ? "warning" : "neutral"}>{SEGMENT_LABELS[c.segment]}</StatusBadge>{money(c.totalSpent)}</span>} />
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard flush title="Abandoned carts" description="Carts left with an email address, started in this period">
          {carts.error ? <ErrorState title="Carts unavailable" description="The saved carts could not be loaded." onRetry={load} />
            : !recovery ? <LoadingState label="Loading carts…" />
            : recovery.total === 0 ? <EmptyState icon="✓" title="No abandoned carts" description="Carts shoppers leave behind (after typing an email) are tracked here." />
            : (
              <ul className="rp-list" aria-label="Abandoned carts">
                <StatRow label="Carts left behind" hint={`${recovery.reminded} reminded by email`} value={recovery.total} />
                <StatRow label="Came back and bought" hint={`${percent(recovery.recoveryRate, 0)} of carts`} value={`${recovery.recovered} · ${money(recovery.recoveredValue)}`} />
                <StatRow label="Still waiting" hint="value of books left in bags" value={money(recovery.openValue)} tone={recovery.openValue > 0 ? "danger" : "muted"} />
              </ul>
            )}
        </SectionCard>

        <SectionCard flush title="Reader reviews" description="What readers say about your books"
          actions={<SecondaryButton size="sm" onClick={() => setActiveTab?.("reviews")}>Moderate</SecondaryButton>}>
          {!reviews ? (audienceFailed ? <ErrorState title="Reviews unavailable" description="Reviews could not be loaded." /> : <LoadingState label="Loading reviews…" />) : (
            <ul className="rp-list" aria-label="Reviews">
              <StatRow label="Average rating" hint={`${reviews.approved} approved review${reviews.approved === 1 ? "" : "s"}`}
                value={reviews.average !== null ? `${reviews.average.toFixed(1)} / 5` : "None yet"} />
              <StatRow label="Waiting for moderation" value={reviews.pending > 0 ? <StatusBadge tone="warning">{reviews.pending}</StatusBadge> : <StatusBadge tone="success">✓ None</StatusBadge>} />
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}
