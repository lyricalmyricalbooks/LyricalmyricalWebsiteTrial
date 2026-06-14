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
import { auth } from "../../lib/firebase";
import { functionUrl } from "./functionsBase";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";
export type FulfillmentStatus =
  | "unfulfilled"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
export type OrderLifecycleStatus = "open" | "completed" | "cancelled" | "archived";
export type OrderStatusField = "paymentStatus" | "fulfillmentStatus" | "status";

export const FULFILLMENT_FLOW: FulfillmentStatus[] = [
  "unfulfilled",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "Unfulfilled",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: ["pending", "paid"],
  pending: ["unpaid", "paid"],
  paid: ["refunded"],
  refunded: [],
};

export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  unfulfilled: ["processing", "shipped", "cancelled"],
  processing: ["unfulfilled", "shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const ORDER_LIFECYCLE_TRANSITIONS: Record<OrderLifecycleStatus, OrderLifecycleStatus[]> = {
  open: ["completed", "cancelled", "archived"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

export interface OrderTransition {
  field: OrderStatusField;
  status: PaymentStatus | FulfillmentStatus | OrderLifecycleStatus;
  note?: string;
  trackingCarrier?: string;
  trackingNumber?: string;
}

export function getCanonicalOrderStatuses(order: any): {
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  status: OrderLifecycleStatus;
} {
  const legacyFulfillment = order.fulfillmentStatus;
  return {
    paymentStatus: order.paymentStatus || "unpaid",
    fulfillmentStatus:
      legacyFulfillment === "paid" || legacyFulfillment === "pending_payment"
        ? "unfulfilled"
        : legacyFulfillment || (order.status === "completed" ? "delivered" : "unfulfilled"),
    status: order.status === "pending_payment" ? "open" : order.status || "open",
  };
}

async function transitionOrders(orderIds: string[], transition: OrderTransition) {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("You must be signed in as an administrator.");
  const response = await fetch(functionUrl("transitionOrderStatus"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ orderIds, transition }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Order transition failed.");
  return payload;
}

// ──────────────────────────────────────────────────────────────
// Order helpers
// ──────────────────────────────────────────────────────────────
export const orderApi = {
  setFulfillmentStatus: async (
    orderId: string,
    status: FulfillmentStatus,
    options: Omit<OrderTransition, "field" | "status"> = {},
  ) => {
    return transitionOrders([orderId], { field: "fulfillmentStatus", status, ...options });
  },

  bulkSetStatus: async (orderIds: string[], status: FulfillmentStatus) => {
    return transitionOrders(orderIds, { field: "fulfillmentStatus", status });
  },

  setLifecycleStatus: async (orderId: string, status: OrderLifecycleStatus, note?: string) =>
    transitionOrders([orderId], { field: "status", status, note }),

  setPaymentStatus: async (orderId: string, status: PaymentStatus, note?: string) =>
    transitionOrders([orderId], { field: "paymentStatus", status, note }),

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
