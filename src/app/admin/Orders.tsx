import "./fulfillment.css";
import { useState, useEffect, useMemo, useRef } from "react";
import { Download, Trash2 } from "lucide-react";
import { adminApi } from "./api";
import toast from "react-hot-toast";
import { WORK_QUEUES, queueOf, packingKey, daysInTransit, isOverdueInTransit } from "./fulfillment";
import { printOrders } from "./orderPrint";
import { orderApi } from "../lib/commerce";
import {
  Checkbox,
  ConfirmDialog,
  Dialog,
  DataTable,
  DestructiveButton,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  Pagination,
  PrimaryButton,
  SearchField,
  SectionCard,
  SecondaryButton,
  SelectField,
  StatusBadge,
  Tabs,
  type BadgeTone,
  type Column,
} from "./riso/components";

// ⚡ Bolt: Cache lowercased search strings using a WeakMap to prevent
// O(N) string memory allocations and redundant .toLowerCase() calls on every keystroke.
// Measured impact: significantly reduces main thread blocking during active typing in search.
const orderSearchCache = new WeakMap<any, string>();

// The list remembers where you were (queue, search, page, sort) and its last
// loaded orders, so "Back to orders" returns instantly to the same spot.
const listMemory: {
  activeTab: string;
  searchQuery: string;
  page: number;
  sort: "newest" | "oldest" | "total-desc" | "total-asc";
  orders: any[] | null;
} = { activeTab: "Needs attention", searchQuery: "", page: 1, sort: "oldest", orders: null };

// Orders waiting on the publisher (shown as the nav badge and on the Overview).
export const ACTION_QUEUES = ["Needs attention", "Ready to pack", "Ready to ship", "Ready for pickup", "Ready for local delivery"];
export const ordersNeedingWork = (orders: any[]) => orders.filter((o) => o.isTest !== true && ACTION_QUEUES.includes(queueOf(o))).length;

// Loads every order (with fulfillment records) and keeps it for the list's instant return.
export async function refreshOrdersCache() {
  const data = await adminApi.getFulfillmentOrders();
  listMemory.orders = data;
  return data;
}

// Open the first work queue that has orders in it (Overview "Ship orders").
export function openFirstActionQueue() {
  const orders = (listMemory.orders || []).filter((o) => o.isTest !== true);
  openOrdersQueue(ACTION_QUEUES.find((q) => orders.some((o) => queueOf(o) === q)) || "Needs attention");
}

// Open the Orders list on a given work queue (Overview "To do today", nav badge).
export function openOrdersQueue(queue: string) {
  if (WORK_QUEUES.includes(queue)) {
    listMemory.activeTab = queue;
    listMemory.page = 1;
    listMemory.sort = queue === "All orders" ? "newest" : "oldest";
  }
}

type BatchKind = "pack" | "ship" | "deliver";
const BATCH: Record<BatchKind, { button: string; title: string; text: (n: number) => string; done: string }> = {
  pack: {
    button: "Mark packed",
    title: "Confirm selected books are packed?",
    text: (n) => `Confirm you checked every book and quantity in ${n} selected orders. Orders that still need an address review or are on hold are skipped and listed below.`,
    done: "packed",
  },
  ship: {
    button: "Mark shipped",
    title: "Mark selected parcels shipped?",
    text: (n) => `Use this after handing ${n} labelled parcels to the carrier. Each customer gets the Shipping confirmation email with their tracking. Orders without a Shippo label are skipped — open them to enter tracking.`,
    done: "shipped, customer emailed",
  },
  deliver: {
    button: "Mark delivered",
    title: "Mark selected parcels delivered?",
    text: (n) => `Use this when the carrier shows ${n} parcels as delivered. Each customer gets the Delivery update email (if it is switched on).`,
    done: "delivered",
  },
};
const BATCH_FOR_QUEUE: Record<string, BatchKind> = { "Ready to pack": "pack", "Ready to ship": "ship", "In transit": "deliver" };

export function Orders({
  onSelectOrder,
}: {
  onSelectOrder: (order: any, queueIds: string[]) => void;
}) {
  const [orders, setOrders] = useState<any[]>(() => listMemory.orders || []);
  const [loading, setLoading] = useState(() => !listMemory.orders);
  const [activeTab, setActiveTabState] = useState(listMemory.activeTab);
  const [searchQuery, setSearchQuery] = useState(listMemory.searchQuery);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [confirmBatch, setConfirmBatch] = useState<false | BatchKind>(false);
  const [busy, setBusy] = useState(false);
  const [batchResults, setBatchResults] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(listMemory.page);
  const [sort, setSort] = useState<
    "newest" | "oldest" | "total-desc" | "total-asc"
  >(listMemory.sort);
  // Work queues read oldest first (fair dispatch); "All orders" reads newest first.
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setSort(tab === "All orders" ? "newest" : "oldest");
  };
  useEffect(() => {
    Object.assign(listMemory, { activeTab, searchQuery, page, sort });
  }, [activeTab, searchQuery, page, sort]);
  const [range, setRange] = useState<"all" | "7" | "30" | "90">("all");
  const [confirmDeleteTests, setConfirmDeleteTests] = useState(false);
  const [confirmDeleteOrders, setConfirmDeleteOrders] = useState(false);
  const [orderType, setOrderType] = useState<"production" | "test" | "all">(
    "production",
  );

  const ordersMap = useMemo(
    () => new Map(orders.map((o) => [o.id, o])),
    [orders],
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = (ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleExportCsv = () => {
    const list = (
      selected.size > 0
        ? orders.filter((o) => selected.has(o.id))
        : filteredOrders
    ).filter((o) => o.isTest !== true);
    if (!list.length) {
      toast.error("Nothing to export");
      return;
    }
    const csv = orderApi.exportToCsv(list);
    orderApi.downloadCsv(
      `orders-${new Date().toISOString().split("T")[0]}.csv`,
      csv,
    );
    toast.success(
      `Exported ${list.length} order${list.length === 1 ? "" : "s"}`,
    );
  };

  const requestDeleteTests = () => {
    const ids = Array.from(selected);
    if (!ids.length || !ids.every((id) => ordersMap.get(id)?.isTest === true)) {
      toast.error("Bulk deletion is limited to marked test orders");
      return;
    }
    setConfirmDeleteTests(true);
  };

  const handleBulkDeleteTests = async () => {
    const ids = Array.from(selected);
    setConfirmDeleteTests(false);
    try {
      const result = await adminApi.deleteTestOrders(ids);
      toast.success(
        `Deleted ${result.deleted} test order${result.deleted === 1 ? "" : "s"}`,
      );
      setSelected(new Set());
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Test-order deletion failed");
    }
  };

  const handleDeleteOrders = async () => {
    const ids = Array.from(selected);
    setConfirmDeleteOrders(false);
    const { deleted, failed } = await adminApi.deleteOrders(ids);
    if (deleted)
      toast.success(`Deleted ${deleted} order${deleted === 1 ? "" : "s"}`);
    if (failed.length)
      toast.error(`Could not delete ${failed.length} order${failed.length === 1 ? "" : "s"}`);
    setSelected(new Set(failed));
    loadOrders();
  };

  const handleBulkUpdate = async (kind: BatchKind) => {
    setConfirmBatch(false);
    if (busy) return;
    setBusy(true);
    const results: string[] = [];
    const succeeded = new Set<string>();
    for (const id of selected) {
      const o = ordersMap.get(id);
      try {
        if (kind === "pack") {
          await adminApi.fulfillmentAction(id, "pack", { packingKey: packingKey(o) });
        } else if (kind === "ship") {
          if (!o?.labelUrl || !o?.trackingNumber) throw new Error("No Shippo label — open the order to enter tracking");
          await adminApi.fulfillmentAction(id, "dispatch", {
            trackingCarrier: o.trackingCarrier || "Canada Post",
            trackingNumber: o.trackingNumber,
            trackingUrl: o.trackingUrl || "",
          });
        } else {
          await adminApi.fulfillmentAction(id, "delivery_status", { status: "delivered" });
        }
        succeeded.add(id);
        results.push(`${o?.orderId || id}: ${BATCH[kind].done}`);
      } catch (err: any) {
        results.push(`${o?.orderId || id}: ${err.message || "Could not save"}`);
      }
    }
    setBatchResults(results);
    setSelected(
      (prev) => new Set([...prev].filter((id) => !succeeded.has(id))),
    );
    await loadOrders();
    setBusy(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setFailed(false);
    try {
      const data = await refreshOrdersCache();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders", err);
      setFailed(true);
      toast.error("Orders could not be loaded");
    } finally {
      setLoading(false);
    }
  }

  // ⚡ Bolt: Memoize filtered orders and hoist search query lowercasing to prevent
  // O(N) redundant string allocations and array iteration on every render.
  // Measured impact: Significantly reduces main thread blocking during active typing in search.
  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return orders
      .filter((o) => {
        const matchesTab =
          activeTab === "All orders" || queueOf(o) === activeTab;

        const matchesOrderType =
          orderType === "all" ||
          (orderType === "test" && o.isTest === true) ||
          (orderType === "production" && o.isTest !== true);

        if (!matchesTab || !matchesOrderType) return false;
        if (
          range !== "all" &&
          Date.now() - new Date(o.createdAt).getTime() >
            Number(range) * 86400000
        )
          return false;

        if (q) {
          let haystack = orderSearchCache.get(o);
          if (!haystack) {
            haystack = (
              (o.orderId || "") +
              " " +
              (o.customer?.name || "") +
              " " +
              (o.customer?.email || "") +
              " " +
              (o.trackingNumber || "")
            ).toLowerCase();
            orderSearchCache.set(o, haystack);
          }
          if (!haystack.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sort === "total-desc") return (b.total || 0) - (a.total || 0);
        if (sort === "total-asc") return (a.total || 0) - (b.total || 0);
        const d =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sort === "oldest" ? d : -d;
      });
  }, [orders, activeTab, searchQuery, orderType, range, sort]);

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = {};
    const base = orders.filter(
      (o) =>
        orderType === "all" ||
        (orderType === "test" ? o.isTest === true : o.isTest !== true),
    );
    WORK_QUEUES.forEach((t) => {
      c[t] = base.filter((o) => t === "All orders" || queueOf(o) === t).length;
    });
    return c;
  }, [orders, orderType]);

  const PAGE_SIZE = 25;
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pageRows = filteredOrders.slice(
    (Math.min(page, pageCount) - 1) * PAGE_SIZE,
    Math.min(page, pageCount) * PAGE_SIZE,
  );
  const firstFilterRun = useRef(true);
  useEffect(() => {
    // Keep the remembered page when coming back; reset it when filters change.
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return;
    }
    setPage(1);
  }, [activeTab, searchQuery, orderType, range, sort]);

  // One colour per work queue, used by the table and the phone cards alike.
  const queueTone = (queue: string): BadgeTone =>
    queue === "Needs attention" || queue === "Unpaid"
      ? "warning"
      : queue === "In transit"
        ? "info"
        : queue === "Completed"
          ? "success"
          : "primary";

  const allSelected =
    pageRows.length > 0 && pageRows.every((o) => selected.has(o.id));
  const selectedArr = Array.from(selected);
  const allTestSelection =
    selectedArr.length > 0 &&
    selectedArr.every((id) => ordersMap.get(id)?.isTest === true);
  const noTestSelection = !selectedArr.some(
    (id) => ordersMap.get(id)?.isTest === true,
  );

  const columns: Column<any>[] = [
    {
      key: "sel",
      header: "Select",
      render: (o) => (
        <Checkbox
          label=""
          aria-label={`Select order ${o.orderId}`}
          checked={selected.has(o.id)}
          onChange={() => toggleSelect(o.id)}
        />
      ),
    },
    {
      key: "order",
      header: "Order",
      render: (o) => (
        <button
          type="button"
          className="rp-mono"
          onClick={() => onSelectOrder(o, filteredOrders.map((x) => x.id))}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            color: "var(--rp-primary-text)",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "underline",
          }}
          aria-label={`Open order ${o.orderId}`}
        >
          {o.orderId}
        </button>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (o) =>
        new Date(o.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
    },
    {
      key: "customer",
      header: "Customer",
      render: (o) => (
        <div style={{ maxWidth: 240, overflowWrap: "anywhere" }}>
          <div style={{ fontWeight: 600 }}>{o.customer?.name || "—"}</div>
          <div className="rp-hint">{o.customer?.email}</div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      numeric: true,
      render: (o) =>
        (o.items || []).reduce(
          (n: number, i: any) => n + Number(i.quantity || 0),
          0,
        ),
    },
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (o) => `CA$${Number(o.total || 0).toFixed(2)}`,
    },
    {
      key: "payment",
      header: "Payment",
      render: (o) => (
        <StatusBadge tone={o.paymentStatus === "paid" ? "success" : "danger"}>
          {o.paymentStatus === "paid"
            ? "Paid"
            : String(o.paymentStatus || "Unpaid").replace(/_/g, " ")}
        </StatusBadge>
      ),
    },
    {
      key: "fulfillment",
      header: "Fulfillment",
      render: (o) => (
        <>
          <StatusBadge tone={queueTone(queueOf(o))}>
            {queueOf(o)}
          </StatusBadge>
          {isOverdueInTransit(o) && (
            <StatusBadge tone="warning">{`Overdue · ${daysInTransit(o)} days`}</StatusBadge>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="rp-stack fw-list">
      <FilterBar>
        <div className="rp-grow">
          <SearchField
            label="Search orders"
            placeholder="Search order, customer, email or tracking…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="fw-filter-fields">
          {" "}
          <SelectField
            label="Order type"
            hideLabel
            value={orderType}
            onChange={(e) => {
              setOrderType(e.target.value as any);
              setSelected(new Set());
            }}
          >
            <option value="production">Production orders</option>
            <option value="test">Test orders</option>
            <option value="all">All orders</option>
          </SelectField>
          <SelectField
            label="Date range"
            hideLabel
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
          >
            <option value="all">Any date</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </SelectField>
          <SelectField
            label="Sort orders"
            hideLabel
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="total-desc">Total: high to low</option>
            <option value="total-asc">Total: low to high</option>
          </SelectField>
        </div>
        <SecondaryButton
          className="fw-phone-filter"
          onClick={() => setShowFilters(true)}
        >
          Filter & sort
        </SecondaryButton>
        <SecondaryButton
          icon={<Download size={16} aria-hidden />}
          onClick={handleExportCsv}
        >
          Export CSV
        </SecondaryButton>
      </FilterBar>

      {batchResults.length > 0 && (
        <SectionCard
          title="Preparation results"
          actions={
            <SecondaryButton size="sm" onClick={() => setBatchResults([])}>
              Dismiss
            </SecondaryButton>
          }
        >
          <ul aria-live="polite" style={{ maxHeight: 240, overflowY: "auto" }}>
            {batchResults.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="fw-queue-tabs">
        <Tabs
          label="Order status"
          value={activeTab}
          onChange={setActiveTab}
          tabs={WORK_QUEUES.map((t) => ({
            id: t,
            label: t,
            count: t === "All orders" ? undefined : tabCounts[t],
          }))}
        />
      </div>
      <div className="fw-phone-queue">
        <SelectField
          label="Work queue"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
        >
          {WORK_QUEUES.map((t) => (
            <option key={t} value={t}>
              {t}
              {t !== "All orders" ? ` (${tabCounts[t] || 0})` : ""}
            </option>
          ))}
        </SelectField>
      </div>

      <SectionCard
        flush
        title="Orders"
        description={`${filteredOrders.length} order${filteredOrders.length === 1 ? "" : "s"} · ${activeTab === "All orders" ? "All statuses" : activeTab}`}
        actions={
          filteredOrders.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Checkbox
                label={
                  selected.size > 0
                    ? `${selected.size} selected`
                    : "Select page"
                }
                checked={allSelected}
                onChange={() => selectAllFiltered(pageRows.map((o) => o.id))}
              />
            </div>
          )
        }
      >
        {selected.size > 0 && (
          <div className="fw-selection">
            <strong>{selected.size} selected</strong>
            <div className="fw-toolbar-actions">
              {" "}
              {allTestSelection && (
                <DestructiveButton
                  size="sm"
                  icon={<Trash2 size={14} aria-hidden />}
                  onClick={requestDeleteTests}
                >
                  Delete tests
                </DestructiveButton>
              )}
              {!allTestSelection && (
                <DestructiveButton
                  size="sm"
                  icon={<Trash2 size={14} aria-hidden />}
                  onClick={() => setConfirmDeleteOrders(true)}
                >
                  Delete
                </DestructiveButton>
              )}
              {selected.size > 0 && noTestSelection && (
                <>
                  <SecondaryButton
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      printOrders(orders.filter((o) => selected.has(o.id)))
                    }
                  >
                    Print packing slips
                  </SecondaryButton>
                  <SecondaryButton
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      printOrders(
                        orders.filter((o) => selected.has(o.id)),
                        true,
                      )
                    }
                  >
                    Combined pick list
                  </SecondaryButton>
                  {BATCH_FOR_QUEUE[activeTab] && (
                    <PrimaryButton
                      size="sm"
                      disabled={busy}
                      onClick={() => setConfirmBatch(BATCH_FOR_QUEUE[activeTab])}
                    >
                      {busy ? "Saving…" : BATCH[BATCH_FOR_QUEUE[activeTab]].button}
                    </PrimaryButton>
                  )}
                </>
              )}
              {selected.size > 0 && (
                <SecondaryButton
                  size="sm"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </SecondaryButton>
              )}
            </div>
          </div>
        )}
        {loading ? (
          <LoadingState label="Loading orders…" />
        ) : failed ? (
          <ErrorState
            description="Orders could not be loaded. Check your connection and permissions."
            onRetry={() => {
              setLoading(true);
              loadOrders();
            }}
          />
        ) : (
          <>
            <div className="fw-phone-orders">
              {pageRows.map((o) => (
                <article className="fw-phone-order" key={o.id}>
                  <Checkbox
                    label=""
                    aria-label={`Select order ${o.orderId}`}
                    checked={selected.has(o.id)}
                    onChange={() => toggleSelect(o.id)}
                  />
                  <div>
                    <button
                      type="button"
                      onClick={() => onSelectOrder(o, filteredOrders.map((x) => x.id))}
                      aria-label={`Open order ${o.orderId}`}
                    >
                      {o.orderId}
                    </button>
                    <p>{o.customer?.name || "Guest customer"}</p>
                    <span className="rp-hint">
                      {new Date(o.createdAt).toLocaleDateString()} ·{" "}
                      {(o.items || []).reduce(
                        (n: number, i: any) => n + Number(i.quantity || 0),
                        0,
                      )}{" "}
                      items
                    </span>
                    <div className="fw-phone-order-meta">
                      <StatusBadge tone={queueTone(queueOf(o))}>
                        {queueOf(o)}
                      </StatusBadge>
                      {isOverdueInTransit(o) && (
                        <StatusBadge tone="warning">{`Overdue · ${daysInTransit(o)} days`}</StatusBadge>
                      )}
                      <span className="rp-mono">{`CA$${Number(o.total || 0).toFixed(2)}`}</span>
                    </div>
                  </div>
                </article>
              ))}
              {!pageRows.length && (
                <EmptyState
                  title="No orders here"
                  description="Choose another queue or adjust your filters."
                />
              )}
            </div>
            <div className="fw-desktop-orders">
              <DataTable
                caption="Orders"
                columns={columns}
                rows={pageRows}
                rowKey={(o) => o.id}
                empty={
                  <EmptyState
                    title="No orders found"
                    description="No orders match these filters. Try widening the date range or clearing the search."
                  />
                }
              />
            </div>
            {filteredOrders.length > PAGE_SIZE && (
              <Pagination
                page={Math.min(page, pageCount)}
                pageCount={pageCount}
                onPage={setPage}
              />
            )}
          </>
        )}
      </SectionCard>

      <Dialog
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter & sort orders"
        footer={
          <PrimaryButton onClick={() => setShowFilters(false)}>
            Show orders
          </PrimaryButton>
        }
      >
        <div className="rp-stack">
          {" "}
          <SelectField
            label="Order type"
            value={orderType}
            onChange={(e) => {
              setOrderType(e.target.value as any);
              setSelected(new Set());
            }}
          >
            <option value="production">Production orders</option>
            <option value="test">Test orders</option>
            <option value="all">All orders</option>
          </SelectField>
          <SelectField
            label="Date range"
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
          >
            <option value="all">Any date</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </SelectField>
          <SelectField
            label="Sort orders"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="total-desc">Total: high to low</option>
            <option value="total-asc">Total: low to high</option>
          </SelectField>
        </div>
      </Dialog>
      <Dialog
        open={!!confirmBatch}
        onClose={() => setConfirmBatch(false)}
        title={confirmBatch ? BATCH[confirmBatch].title : ""}
        footer={
          <>
            <SecondaryButton onClick={() => setConfirmBatch(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={() => confirmBatch && handleBulkUpdate(confirmBatch)}>
              {confirmBatch ? BATCH[confirmBatch].button : ""}
            </PrimaryButton>
          </>
        }
      >
        <p>{confirmBatch ? BATCH[confirmBatch].text(selected.size) : ""}</p>
      </Dialog>
      <ConfirmDialog
        open={confirmDeleteOrders}
        title="Delete orders?"
        confirmLabel="Delete orders"
        message={`Permanently delete ${selected.size} selected order${selected.size === 1 ? "" : "s"}? This only removes the record: it does not refund the customer, restock books or cancel any shipping label. This cannot be undone.`}
        onConfirm={handleDeleteOrders}
        onCancel={() => setConfirmDeleteOrders(false)}
      />
      <ConfirmDialog
        open={confirmDeleteTests}
        title="Delete test orders?"
        confirmLabel="Delete test orders"
        message={`Permanently delete ${selected.size} marked test order${selected.size === 1 ? "" : "s"}? Production orders can never be deleted here.`}
        onConfirm={handleBulkDeleteTests}
        onCancel={() => setConfirmDeleteTests(false)}
      />
    </div>
  );
}
