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
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { adminApi } from "../admin/api";

export type FulfillmentStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export const FULFILLMENT_FLOW: FulfillmentStatus[] = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
];

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  pending_payment: "Awaiting Payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
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
    const rows = orders.map(o => [
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
    await setDoc(
      ref,
      {
        ...payload,
        cartKey,
        recovered: false,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
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

  list: async () => {
    const snap = await getDocs(
      query(
        collection(db, "abandoned-carts"),
        orderBy("updatedAt", "desc"),
        limit(100),
      ),
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};

// ──────────────────────────────────────────────────────────────
// Funnel analytics
// ──────────────────────────────────────────────────────────────
export const funnelApi = {
  track: async (event: "view" | "add_to_cart" | "checkout_start" | "purchase") => {
    const today = new Date().toISOString().split("T")[0];
    const ref = doc(db, "analytics", today);
    try {
      const snap = await getDoc(ref);
      const data = snap.exists() ? (snap.data() as any) : { date: today };
      const funnel = data.funnel || { view: 0, add_to_cart: 0, checkout_start: 0, purchase: 0 };
      funnel[event] = (funnel[event] || 0) + 1;
      await setDoc(ref, { ...data, funnel }, { merge: true });
    } catch {
      // best-effort, never break checkout
    }
  },

  trackCategory: async (categoryName: string) => {
    if (!categoryName) return;
    const today = new Date().toISOString().split("T")[0];
    const ref = doc(db, "analytics", today);
    try {
      const snap = await getDoc(ref);
      const data = snap.exists() ? (snap.data() as any) : { date: today };
      const categoryViews = data.categoryViews || {};
      const key = categoryName.toUpperCase().trim();
      categoryViews[key] = (categoryViews[key] || 0) + 1;
      await setDoc(ref, { ...data, categoryViews }, { merge: true });
    } catch {
      // best-effort
    }
  },
};
