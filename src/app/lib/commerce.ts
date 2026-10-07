import { inEditorPreview, trackingAllowed } from "./trackingGuard";
import { cleanSearchTerm, deviceOf } from "../admin/overviewTraffic";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  limit,
  increment,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { adminApi } from "../admin/api";

export type FulfillmentStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export const FULFILLMENT_FLOW: FulfillmentStatus[] = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  pending_payment: "Awaiting Payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

// ──────────────────────────────────────────────────────────────
// Order helpers
// ──────────────────────────────────────────────────────────────
export const orderApi = {
  setFulfillmentStatus: async (
    orderId: string,
    status: FulfillmentStatus,
    note?: string,
  ) => {
    await updateDoc(doc(db, "orders", orderId), {
      fulfillmentStatus: status,
      updatedAt: new Date().toISOString(),
    });
    await adminApi.addOrderNote(
      orderId,
      note || `Fulfillment status changed to ${FULFILLMENT_LABELS[status]}.`,
    );
  },

  bulkSetStatus: async (orderIds: string[], status: FulfillmentStatus) => {
    await Promise.all(
      orderIds.map(id =>
        updateDoc(doc(db, "orders", id), {
          fulfillmentStatus: status,
          updatedAt: new Date().toISOString(),
        }),
      ),
    );
  },

  exportToCsv: (orders: any[]): string => {
    const header = [
      "OrderID",
      "Date",
      "Customer",
      "Email",
      "Status",
      "FulfillmentStatus",
      "Subtotal",
      "Discount",
      "Shipping",
      "Total",
      "TrackingCarrier",
      "TrackingNumber",
      "ItemCount",
    ];
    const rows = orders.filter(o => o.isTest !== true).map(o => [
      o.orderId || o.id,
      o.createdAt || "",
      (o.customer?.name || "").replace(/[",\n]/g, " "),
      o.customer?.email || "",
      o.status || "",
      o.fulfillmentStatus || (o.status === "completed" ? "delivered" : "paid"),
      o.subtotal ?? "",
      o.discount ?? "",
      o.shipping ?? "",
      o.total ?? "",
      o.trackingCarrier || "",
      o.trackingNumber || "",
      (o.items || []).reduce((acc: number, i: any) => acc + (i.quantity || 0), 0),
    ]);
    return [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  },

  downloadCsv: (filename: string, csv: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ──────────────────────────────────────────────────────────────
// Abandoned cart tracking
// ──────────────────────────────────────────────────────────────
export const abandonedCartApi = {
  upsert: async (
    cartKey: string,
    payload: {
      email: string;
      items: any[];
      subtotal: number;
      customer?: any;
    },
  ) => {
    if (!payload.email) return;
    const ref = doc(db, "abandoned-carts", cartKey);
    const now = new Date().toISOString();
    // createdAt/recovered are set once: later saves must not reset the cart's
    // age or reopen a cart that was already bought (firestore.rules forbids that).
    const existing = await getDoc(ref).catch(() => null);
    if (existing?.exists() && existing.data()?.recovered === true) return;
    await setDoc(
      ref,
      {
        ...payload,
        cartKey,
        updatedAt: now,
        ...(existing?.exists() ? {} : { recovered: false, createdAt: now }),
      },
      { merge: true },
    );
  },

  markRecovered: async (cartKey: string) => {
    try {
      await updateDoc(doc(db, "abandoned-carts", cartKey), {
        recovered: true,
        recoveredAt: new Date().toISOString(),
      });
    } catch {}
  },

  list: async (max = 100) => {
    const snap = await getDocs(
      query(
        collection(db, "abandoned-carts"),
        orderBy("updatedAt", "desc"),
        limit(max),
      ),
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};

// ──────────────────────────────────────────────────────────────
// Funnel + traffic analytics
// ──────────────────────────────────────────────────────────────
// Everything lands in today's `analytics/<date>` doc as `increment(1)` merges, which Firestore applies itself, so
// shoppers arriving at the same moment never overwrite each other's counts. Each call checks consent, the Studio
// preview and the admin session (see trackingGuard). Best-effort: tracking must never break browsing or checkout.
const dayKey = () => new Date().toISOString().split("T")[0];
const mapKey = (v: string) => v.replace(/[.~*/[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);

async function bump(patch: Record<string, Record<string, ReturnType<typeof increment>>>) {
  if (!(await trackingAllowed())) return;
  const today = dayKey();
  try {
    await setDoc(doc(db, "analytics", today), { date: today, ...patch }, { merge: true });
  } catch {
    // best-effort
  }
}

/** True the first time `key` is seen this browser session (so reloads and back-and-forth don't double count). */
function firstThisSession(key: string): boolean {
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // storage unavailable: count it
  }
  return true;
}

export const funnelApi = {
  track: async (event: "view" | "add_to_cart" | "checkout_start" | "purchase") => {
    await bump({ funnel: { [event]: increment(1) } });
  },

  trackCategory: async (categoryName: string) => {
    const key = mapKey((categoryName || "").toUpperCase());
    if (!key || inEditorPreview()) return;
    await bump({ categoryViews: { [key]: increment(1) } });
  },

  /** Where this session came from and on what kind of screen — once per session, in its own write. */
  trackSession: async () => {
    if (typeof window === "undefined" || !firstThisSession(`fm_session_${dayKey()}`)) return;
    let source = "direct";
    try { source = mapKey((window.sessionStorage.getItem("referral_source") || "direct").toLowerCase()) || "direct"; } catch { /* direct */ }
    await bump({ sources: { [source]: increment(1) }, devices: { [deviceOf(window.innerWidth)]: increment(1) } });
  },

  /** A product page opened — once per book per session. */
  trackProductView: async (bookId: string) => {
    if (!bookId || typeof window === "undefined" || !firstThisSession(`fm_bookview_${bookId}`)) return;
    await bump({ bookViews: { [mapKey(bookId)]: increment(1) } });
  },

  /** What shoppers type into search, and whether it found anything. Personal-looking terms are never stored. */
  trackSearch: async (rawTerm: string, resultCount: number) => {
    const term = cleanSearchTerm(rawTerm);
    if (!term || typeof window === "undefined") return;
    const field = resultCount > 0 ? "searches" : "noResults";
    if (!firstThisSession(`fm_search_${field}_${term}`)) return;
    await bump({ [field]: { [term]: increment(1) } });
  },
};
