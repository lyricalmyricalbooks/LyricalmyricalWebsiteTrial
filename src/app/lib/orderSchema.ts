export type OrderTransactionKind = "authorization" | "capture" | "refund" | "failure";

export interface OrderTransaction {
  id: string;
  kind: OrderTransactionKind;
  status: "pending" | "succeeded" | "failed";
  provider: string;
  providerId: string | null;
  amount: number;
  currency: string;
  createdAt: string;
  message?: string;
}

export interface FulfillmentLine {
  lineId: string;
  quantity: number;
}

export interface OrderFulfillment {
  id: string;
  lines: FulfillmentLine[];
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  status: "pending" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";
  notificationState: "pending" | "sent" | "suppressed";
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export const orderLineId = (item: any, index: number) =>
  String(item.lineId || `${item.id || "line"}:${item.variantId || "default"}:${index}`);

export const totalRefunded = (order: any) =>
  (order?.transactions || [])
    .filter((transaction: OrderTransaction) => transaction.kind === "refund" && transaction.status === "succeeded")
    .reduce((sum: number, transaction: OrderTransaction) => sum + Number(transaction.amount || 0), 0);

export const normalizeOrderLines = (items: any[] = []) =>
  items.map((item, index) => ({
    ...item,
    lineId: orderLineId(item, index),
    fulfilledQuantity: Number(item.fulfilledQuantity || 0),
    refundedQuantity: Number(item.refundedQuantity || 0),
    restockedQuantity: Number(item.restockedQuantity || 0),
  }));
