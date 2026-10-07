// Orders desk (split view): which orders show in each view, in what order, and
// which one opens next. Pure; the queues themselves come from fulfillment.queueOf.
import { queueOf } from "./fulfillment";

export type DeskView = "needs" | "shipped" | "all";

// Work the shop must do, most urgent first.
export const NEEDS_ME_QUEUES = ["Needs attention", "Ready to pack", "Ready to ship", "Ready for pickup", "Ready for local delivery"];
const SHIPPED_QUEUES = ["In transit", "Completed"];

const time = (o: any) => Date.parse(o?.paidAt || o?.createdAt || "") || 0;

function matches(o: any, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const c = o.customer || {};
  return [o.orderId, o.id, c.name, c.email, o.trackingNumber, ...(o.items || []).map((i: any) => i.title)]
    .some((v) => String(v || "").toLowerCase().includes(q));
}

export function deskOrders(orders: any[], view: DeskView, query = "", showTest = false): any[] {
  const base = (orders || []).filter((o) => o && (showTest || o.isTest !== true) && matches(o, query));
  if (view === "needs") {
    return base
      .filter((o) => NEEDS_ME_QUEUES.includes(queueOf(o)))
      // Problems first, then oldest paid first (the order that has waited longest).
      .sort((a, b) => NEEDS_ME_QUEUES.indexOf(queueOf(a)) - NEEDS_ME_QUEUES.indexOf(queueOf(b)) || time(a) - time(b));
  }
  if (view === "shipped") return base.filter((o) => SHIPPED_QUEUES.includes(queueOf(o))).sort((a, b) => time(b) - time(a));
  return base.slice().sort((a, b) => time(b) - time(a));
}

export function deskCounts(orders: any[], showTest = false) {
  return {
    needs: deskOrders(orders, "needs", "", showTest).length,
    shipped: deskOrders(orders, "shipped", "", showTest).length,
    all: deskOrders(orders, "all", "", showTest).length,
    waitingPayment: (orders || []).filter((o) => o && (showTest || o.isTest !== true) && queueOf(o) === "Unpaid" && o.paymentStatus === "pending").length,
  };
}

/** The order to open when nothing is selected (or the selected one just left the list). */
export function nextToOpen(list: any[], currentId?: string | null): string | null {
  if (!list.length) return null;
  if (currentId && list.some((o) => o.id === currentId)) return currentId;
  return list[0].id;
}

/** One short status line for a list row: what the shop does next. */
export function rowStatus(o: any): { tone: "danger" | "warning" | "info" | "success" | "neutral"; text: string } {
  const q = queueOf(o);
  if (o.paymentMismatch && o.paymentStatus !== "paid") return { tone: "danger", text: "⚠ Payment doesn't match" };
  if (Array.isArray(o.duplicatePayments) && o.duplicatePayments.length) return { tone: "danger", text: "⚠ Paid twice — refund the extra" };
  if (o.disputeStatus === "needs_response") return { tone: "danger", text: "⚠ Dispute — respond in Stripe" };
  if (o.partiallyRefunded) return { tone: "warning", text: "⚠ Partly refunded" };
  if (q === "Needs attention") return { tone: "danger", text: "⚠ Check before packing" };
  if (q === "Ready to pack") return { tone: "warning", text: "● Pack" };
  if (q === "Ready to ship") return { tone: "warning", text: "● Label & ship" };
  if (q === "Ready for pickup") return { tone: "warning", text: "● Hand over at pickup" };
  if (q === "Ready for local delivery") return { tone: "warning", text: "● Deliver" };
  if (q === "In transit") return { tone: "info", text: "● On the way" };
  if (o.paymentStatus === "refunded") return { tone: "neutral", text: "✕ Refunded" };
  if (q === "Completed") return { tone: "success", text: "✓ Done" };
  if (o.paymentStatus === "pending") return { tone: "neutral", text: "○ Waiting on payment" };
  return { tone: "neutral", text: "○ Not paid" };
}
