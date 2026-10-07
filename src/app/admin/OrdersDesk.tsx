import { useEffect, useMemo, useRef, useState } from "react";
import { OrderDetail } from "./OrderDetail";
import { Orders, refreshOrdersCache } from "./Orders";
import { EmptyState, LoadingState, SearchField, SecondaryButton, StatusBadge, Toggle } from "./riso/components";
import { deskCounts, deskOrders, nextToOpen, rowStatus, type DeskView } from "./ordersDesk";

const VIEW_KEY = "orders-desk-view";
const LAYOUT_KEY = "orders-desk-layout";
const read = (k: string, d: string) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };
const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");

// Orders, inbox style: the list on the left, the selected order on the right.
// The right side IS the full order page (OrderDetail), so payment sync with
// Stripe, refunds, disputes, labels and dispatch all work exactly as before —
// and finishing an order moves straight to the next one in "Needs me".
export function OrdersDesk({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string | null) => void }) {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<DeskView>(() => read(VIEW_KEY, "needs") as DeskView);
  const [layout, setLayout] = useState(() => read(LAYOUT_KEY, "desk"));
  const [query, setQuery] = useState("");
  const [showTest, setShowTest] = useState(false);
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(max-width: 900px)").matches);
  const refreshing = useRef<Promise<void> | null>(null);

  const refresh = () => {
    if (refreshing.current) return refreshing.current;
    refreshing.current = refreshOrdersCache()
      .then((data) => { setOrders(data); setFailed(false); })
      .catch(() => setFailed(true))
      .finally(() => { refreshing.current = null; });
    return refreshing.current;
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 60 * 1000);
    const mq = window.matchMedia?.("(max-width: 900px)");
    const onMq = () => setNarrow(!!mq?.matches);
    mq?.addEventListener?.("change", onMq);
    return () => { window.clearInterval(timer); mq?.removeEventListener?.("change", onMq); };
  }, []);

  const list = useMemo(() => deskOrders(orders || [], view, query, showTest), [orders, view, query, showTest]);
  const counts = useMemo(() => deskCounts(orders || [], showTest), [orders, showTest]);
  const ids = useMemo(() => list.map((o) => o.id), [list]);

  // Desktop: always have an order open — the oldest one that needs you.
  useEffect(() => {
    if (narrow || !orders || layout !== "desk") return;
    if (!selectedId) {
      const next = nextToOpen(list, null);
      if (next) onSelect(next);
    }
  }, [orders, list, selectedId, narrow, layout]);

  const pickView = (v: DeskView) => { setView(v); write(VIEW_KEY, v); };
  const pickLayout = (l: string) => { setLayout(l); write(LAYOUT_KEY, l); };

  if (layout === "table") {
    return (
      <div className="rp-stack" style={{ gap: 12 }}>
        <div><SecondaryButton size="sm" onClick={() => pickLayout("desk")}>← Back to order desk</SecondaryButton></div>
        <Orders onSelectOrder={(order) => { pickLayout("desk"); onSelect(order.id); }} />
      </div>
    );
  }

  const tabs: Array<{ id: DeskView; label: string; n: number }> = [
    { id: "needs", label: "Needs me", n: counts.needs },
    { id: "shipped", label: "Shipped", n: counts.shipped },
    { id: "all", label: "All", n: counts.all },
  ];

  const listPane = (
    <aside aria-label="Orders" className="od-list">
      <div className="od-list-head">
        <SearchField label="Find an order" placeholder="Order, reader, email, tracking or book" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div role="group" aria-label="Show" className="od-switch">
          {tabs.map((t) => (
            <button key={t.id} type="button" aria-pressed={view === t.id} className={view === t.id ? "is-on" : ""} onClick={() => pickView(t.id)}>
              {t.label} <span className="rp-mono">{t.n}</span>
            </button>
          ))}
        </div>
        {counts.waitingPayment > 0 && view === "needs" && (
          <p className="rp-hint" style={{ margin: 0 }}>{counts.waitingPayment} waiting on an e-Transfer or cash payment — see <button type="button" className="od-link" onClick={() => pickView("all")}>All</button>.</p>
        )}
      </div>
      {failed && !orders ? (
        <div style={{ padding: 20 }}><EmptyState title="Orders didn't load" description="Check the connection and try again." action={<SecondaryButton size="sm" onClick={refresh}>Try again</SecondaryButton>} /></div>
      ) : !orders ? (
        <LoadingState label="Loading orders…" />
      ) : list.length === 0 ? (
        <div style={{ padding: 20 }}>
          <EmptyState
            title={query ? "No orders match" : view === "needs" ? "All caught up" : "No orders yet"}
            description={query ? "Try a different name, email or order number." : view === "needs" ? "Nothing to pack or ship right now. New paid orders appear here first." : "Orders show up here as soon as customers check out."}
          />
        </div>
      ) : (
        <ul className="od-rows">
          {list.map((o) => {
            const s = rowStatus(o);
            const books = (o.items || []).reduce((n: number, i: any) => n + (Number(i.quantity) || 0), 0);
            return (
              <li key={o.id}>
                <button type="button" className={`od-row${o.id === selectedId ? " is-on" : ""}`} aria-current={o.id === selectedId ? "true" : undefined} onClick={() => onSelect(o.id)}>
                  <span className="od-row-top"><strong className="rp-mono">{o.orderId || o.id}</strong><span className="rp-mono">{money(o.total)}</span></span>
                  <span className="od-row-mid">{o.customer?.name || "—"} · {books} book{books === 1 ? "" : "s"}{o.isTest ? " · test" : ""}</span>
                  <span className="od-row-bot"><StatusBadge tone={s.tone}>{s.text}</StatusBadge><span className="rp-hint">{day(o.paidAt || o.createdAt)}</span></span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="od-list-foot">
        <Toggle label="Show test orders" checked={showTest} onChange={setShowTest} />
        <SecondaryButton size="sm" onClick={() => pickLayout("table")}>Table view · bulk actions &amp; CSV</SecondaryButton>
      </div>
    </aside>
  );

  const detailPane = selectedId ? (
    <section aria-label="Selected order" className="od-detail">
      <OrderDetail
        key={selectedId}
        orderId={selectedId}
        onClose={() => onSelect(null)}
        queueIds={ids.includes(selectedId) ? ids : [selectedId, ...ids]}
        onNavigate={(id) => onSelect(id)}
        onChanged={() => { void refresh(); }}
      />
    </section>
  ) : (
    <section className="od-detail od-empty"><EmptyState title={view === "needs" ? "All caught up" : "Pick an order"} description="Choose an order on the left to see it here." /></section>
  );

  return (
    <div className="od-desk">
      <style>{DESK_CSS}</style>
      {narrow ? (selectedId ? detailPane : listPane) : (<>{listPane}{detailPane}</>)}
    </div>
  );
}

const DESK_CSS = `
.od-desk{display:grid;grid-template-columns:minmax(300px,380px) minmax(0,1fr);gap:24px;align-items:start}
@media (max-width:900px){.od-desk{grid-template-columns:minmax(0,1fr)}}
.od-list{position:sticky;top:16px;display:flex;flex-direction:column;border:2px solid var(--rp-border-strong);background:var(--rp-surface);max-height:calc(100vh - 140px);min-height:420px}
@media (max-width:900px){.od-list{position:static;max-height:none}}
.od-list-head{display:flex;flex-direction:column;gap:12px;padding:14px;border-bottom:1px solid var(--rp-border)}
.od-switch{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:2px solid var(--rp-border-strong)}
.od-switch button{min-height:40px;border:0;border-left:1px solid var(--rp-border);background:var(--rp-surface);color:var(--rp-text);font:800 11px var(--rp-font-body);letter-spacing:.09em;text-transform:uppercase;cursor:pointer}
.od-switch button:first-child{border-left:0}
.od-switch button.is-on{background:var(--rp-inverse);color:var(--rp-on-inverse)}
.od-switch button:focus-visible,.od-row:focus-visible{outline:2px solid var(--rp-focus);outline-offset:2px}
.od-rows{list-style:none;margin:0;padding:0;overflow:auto;flex:1}
.od-row{display:flex;flex-direction:column;gap:6px;width:100%;text-align:left;padding:14px 16px;border:0;border-bottom:1px solid var(--rp-border);border-left:6px solid transparent;background:transparent;color:var(--rp-text);cursor:pointer;font:inherit}
.od-row:hover{background:var(--rp-surface-sunken)}
.od-row.is-on{background:var(--rp-surface-sunken);border-left-color:var(--rp-primary)}
.od-row-top{display:flex;justify-content:space-between;gap:8px;font-size:13px}
.od-row-mid{font-size:13px;color:var(--rp-text-muted)}
.od-row-bot{display:flex;justify-content:space-between;align-items:center;gap:8px}
.od-list-foot{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-top:1px solid var(--rp-border)}
.od-link{border:0;background:none;padding:0;color:var(--rp-primary-text);text-decoration:underline;cursor:pointer;font:inherit}
.od-detail{min-width:0}
.od-empty{padding:40px 0}
`;
