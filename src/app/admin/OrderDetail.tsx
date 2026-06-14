import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CreditCard, Package, Plus, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "./api";
import {
  normalizeOrderLines,
  orderLineId,
  totalRefunded,
  type OrderFulfillment,
  type OrderTransaction,
} from "../lib/orderSchema";

const trackingUrl = (carrier: string, number: string) => {
  const name = carrier.toLowerCase();
  if (name.includes("canada post")) return `https://www.canadapost-postescanada.ca/track-reperage/en#/resultList?searchKeys=${encodeURIComponent(number)}`;
  if (name.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(number)}`;
  if (name.includes("ups")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(number)}`;
  if (name.includes("fedex")) return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${encodeURIComponent(number)}`;
  if (name.includes("dhl")) return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(number)}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} ${number}`)}`;
};

const uid = (prefix: string) =>
  `${prefix}_${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`}`;

export function OrderDetail({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [shipmentQuantities, setShipmentQuantities] = useState<Record<string, number>>({});
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});
  const [carrier, setCarrier] = useState("Canada Post");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [restockReturns, setRestockReturns] = useState(true);

  const loadOrder = async () => {
    setLoading(true);
    try {
      setOrder(await adminApi.getOrderById(orderId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => void loadOrder(), [orderId]);

  const lines = useMemo(() => normalizeOrderLines(order?.items || []), [order]);
  const refunded = totalRefunded(order);
  const refundable = Math.max(0, Number(order?.total || 0) - refunded);

  const setQuantity = (
    setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    lineId: string,
    value: number,
    maximum: number,
  ) => setter(current => ({ ...current, [lineId]: Math.max(0, Math.min(maximum, value || 0)) }));

  const createShipment = async () => {
    const selected = lines
      .map((item, index) => {
        const lineId = orderLineId(item, index);
        return { lineId, quantity: shipmentQuantities[lineId] || 0 };
      })
      .filter(line => line.quantity > 0);
    if (!selected.length || !trackingNumber.trim()) {
      toast.error("Select at least one quantity and enter tracking.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const fulfillment: OrderFulfillment = {
        id: uid("fulfillment"),
        lines: selected,
        carrier,
        trackingNumber: trackingNumber.trim(),
        trackingUrl: trackingUrl(carrier, trackingNumber.trim()),
        status: "shipped",
        notificationState: notifyCustomer ? "pending" : "suppressed",
        createdAt: now,
        shippedAt: now,
      };
      const items = lines.map((item, index) => {
        const quantity = selected.find(line => line.lineId === orderLineId(item, index))?.quantity || 0;
        return { ...item, fulfilledQuantity: item.fulfilledQuantity + quantity };
      });
      await adminApi.updateOrder(orderId, {
        items,
        fulfillments: [...(order.fulfillments || []), fulfillment],
        fulfillmentStatus: items.every(item => item.fulfilledQuantity >= item.quantity) ? "shipped" : "processing",
        status: "open",
      });
      await adminApi.addOrderNote(orderId, `Created shipment ${fulfillment.id}${notifyCustomer ? " with" : " without"} customer notification.`);
      setShipmentQuantities({});
      setTrackingNumber("");
      await loadOrder();
      toast.success("Shipment created");
    } finally {
      setBusy(false);
    }
  };

  const issueRefund = async () => {
    const selected = lines
      .map((item, index) => {
        const lineId = orderLineId(item, index);
        return { lineId, quantity: refundQuantities[lineId] || 0, price: Number(item.price || 0) };
      })
      .filter(line => line.quantity > 0);
    const amount = Math.min(refundable, selected.reduce((sum, line) => sum + line.quantity * line.price, 0));
    if (!selected.length || amount <= 0) {
      toast.error("Select at least one refundable quantity.");
      return;
    }
    if (!window.confirm(`Record a CA$${amount.toFixed(2)} partial refund?`)) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const transaction: OrderTransaction = {
        id: uid("refund"),
        kind: "refund",
        status: "succeeded",
        provider: order.paymentMethod || "manual",
        providerId: null,
        amount,
        currency: order.checkoutCurrency || "CAD",
        createdAt: now,
      };
      const items = lines.map((item, index) => {
        const quantity = selected.find(line => line.lineId === orderLineId(item, index))?.quantity || 0;
        return {
          ...item,
          refundedQuantity: item.refundedQuantity + quantity,
          restockedQuantity: item.restockedQuantity + (restockReturns ? quantity : 0),
        };
      });
      const nextRefunded = refunded + amount;
      await adminApi.updateOrder(orderId, {
        items,
        transactions: [...(order.transactions || []), transaction],
        paymentStatus: nextRefunded >= Number(order.total || 0) ? "refunded" : "partially_refunded",
        refundedTotal: nextRefunded,
      });
      await adminApi.addOrderNote(orderId, `Refunded CA$${amount.toFixed(2)}${restockReturns ? " and restocked selected quantities" : " without restocking"}.`);
      setRefundQuantities({});
      await loadOrder();
      toast.success("Refund recorded");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-32 text-center text-white/40">Loading order…</div>;
  if (!order) return <div className="py-32 text-center text-white/40">Order not found.</div>;

  return (
    <div className="space-y-8 pb-20 text-white">
      <header className="flex items-center gap-5">
        <button onClick={onClose} className="rounded-xl border border-white/10 p-3"><ArrowLeft size={18} /></button>
        <div>
          <h2 className="text-3xl font-black">{order.orderId}</h2>
          <p className="text-xs uppercase tracking-widest text-white/40">{order.paymentStatus} · {order.fulfillmentStatus}</p>
        </div>
      </header>

      <section className="glass-card rounded-3xl border border-white/5 p-8">
        <h3 className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-[.3em] text-violet-300"><Package size={18} /> Line quantities</h3>
        <div className="space-y-4">
          {lines.map((item, index) => {
            const lineId = orderLineId(item, index);
            const shippable = Math.max(0, item.quantity - item.fulfilledQuantity);
            const refundableQuantity = Math.max(0, item.quantity - item.refundedQuantity);
            return (
              <div key={lineId} className="grid gap-4 rounded-2xl border border-white/5 bg-white/[.02] p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
                    Ordered {item.quantity} · Fulfilled {item.fulfilledQuantity} · Refunded {item.refundedQuantity} · Restocked {item.restockedQuantity}
                  </p>
                </div>
                <label className="text-[10px] uppercase text-white/50">Ship
                  <input type="number" min="0" max={shippable} value={shipmentQuantities[lineId] || 0} onChange={event => setQuantity(setShipmentQuantities, lineId, Number(event.target.value), shippable)} className="ml-2 w-16 rounded-lg bg-white/5 p-2 text-white" />
                </label>
                <label className="text-[10px] uppercase text-white/50">Refund
                  <input type="number" min="0" max={refundableQuantity} value={refundQuantities[lineId] || 0} onChange={event => setQuantity(setRefundQuantities, lineId, Number(event.target.value), refundableQuantity)} className="ml-2 w-16 rounded-lg bg-white/5 p-2 text-white" />
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="glass-card rounded-3xl border border-white/5 p-8">
          <h3 className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-[.3em] text-emerald-300"><Truck size={18} /> Fulfillment actions</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <select value={carrier} onChange={event => setCarrier(event.target.value)} className="rounded-xl border border-white/10 bg-[#111] p-3 text-sm"><option>Canada Post</option><option>USPS</option><option>UPS</option><option>FedEx</option><option>DHL</option><option>Other</option></select>
            <input value={trackingNumber} onChange={event => setTrackingNumber(event.target.value)} placeholder="Tracking number" className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm" />
          </div>
          <label className="my-5 flex items-center gap-3 text-xs"><input type="checkbox" checked={notifyCustomer} onChange={event => setNotifyCustomer(event.target.checked)} /> Send shipment notification</label>
          <button disabled={busy} onClick={createShipment} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase"><Plus size={15} /> Create shipment</button>
          <div className="mt-8 space-y-3">
            {(order.fulfillments || []).map((shipment: OrderFulfillment, index: number) => (
              <div key={shipment.id} className="rounded-xl border border-white/5 p-4 text-xs">
                <p className="font-bold">Shipment {index + 1}: {shipment.carrier} · {shipment.status}</p>
                <a className="text-violet-300 underline" href={shipment.trackingUrl} target="_blank" rel="noreferrer">{shipment.trackingNumber}</a>
                <p className="mt-1 text-white/40">{shipment.lines.reduce((sum, line) => sum + line.quantity, 0)} items · notification {shipment.notificationState}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-3xl border border-white/5 p-8">
          <h3 className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-[.3em] text-cyan-300"><CreditCard size={18} /> Payment actions</h3>
          <p className="text-3xl font-black">CA${Number(order.total || 0).toFixed(2)}</p>
          <p className="mt-1 text-xs text-white/40">Refunded CA${refunded.toFixed(2)} · Remaining CA${refundable.toFixed(2)}</p>
          <label className="my-5 flex items-center gap-3 text-xs"><input type="checkbox" checked={restockReturns} onChange={event => setRestockReturns(event.target.checked)} /> Restock returned quantities</label>
          <button disabled={busy || refundable <= 0} onClick={issueRefund} className="rounded-xl bg-rose-600 px-5 py-3 text-xs font-black uppercase disabled:opacity-40">Issue selected refund</button>
          <div className="mt-8 space-y-3">
            {(order.transactions || []).map((transaction: OrderTransaction) => (
              <div key={transaction.id} className="rounded-xl border border-white/5 p-4 text-xs">
                <p className="font-bold uppercase">{transaction.kind} · {transaction.status}</p>
                <p>{transaction.currency} {Number(transaction.amount).toFixed(2)} · {transaction.provider}</p>
                <p className="text-white/40">{transaction.providerId || "No provider ID"} · {new Date(transaction.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
