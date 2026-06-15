import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CreditCard, 
  ClipboardCheck, 
  Copy, 
  ExternalLink,
  ChevronDown,
  Info,
  Clock,
  User,
  Plus,
  AlertCircle
} from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { orderApi, FULFILLMENT_FLOW, FULFILLMENT_LABELS, type FulfillmentStatus } from "../lib/commerce";

const getTrackingUrl = (carrier: string, trackingNum: string) => {
  const cleanCarrier = (carrier || "").trim().toLowerCase();
  const cleanNum = (trackingNum || "").trim();
  if (cleanCarrier.includes("canada post")) {
    return `https://www.canadapost-postescanada.ca/track-reperage/en#/resultList?searchKeys=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("fedex")) {
    return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(cleanNum)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(carrier + " " + cleanNum)}`;
};

export function OrderDetail({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [restockOnRefund, setRestockOnRefund] = useState(true);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "event" | "note">("all");

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function loadOrder() {
    try {
      const data = await adminApi.getOrderById(orderId);
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingCarrier, setTrackingCarrier] = useState("Canada Post");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isShipping, setIsShipping] = useState(false);

  const markAsShipped = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number.");
      return;
    }
    setIsShipping(true);
    try {
      await adminApi.updateOrder(orderId, {
        status: "completed",
        fulfillmentStatus: "shipped",
        trackingCarrier,
        trackingNumber: trackingNumber.trim(),
        shippedAt: new Date().toISOString(),
      });
      await adminApi.addOrderEvent(
        orderId,
        `Order shipped via ${trackingCarrier}. Tracking: ${trackingNumber.trim()}`
      );
      setShowShipForm(false);
      setTrackingNumber("");
      loadOrder();
      toast.success("Order marked as shipped");
    } catch (err) {
      toast.error("Error updating order.");
    } finally {
      setIsShipping(false);
    }
  };

  const handlePrintPackingSlip = () => {
    window.print();
  };

  const SHIPPO_SITE_URL = "https://app.goshippo.com/orders";

  const handlePushToShippo = async () => {
    setIsGeneratingLabel(true);
    // Open the tab synchronously so the browser doesn't block the popup after the await.
    const shippoTab = window.open("", "_blank");
    const goTo = (url: string) => {
      if (shippoTab) shippoTab.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    };
    try {
      const result = await adminApi.createShippoOrder(orderId);
      goTo(result?.dashboardUrl || SHIPPO_SITE_URL);
      loadOrder();
      toast.success("Order sent to Shippo — finish the label on Shippo.");
    } catch (err: any) {
      // Even if pre-filling fails, still take the admin to Shippo's site.
      goTo(SHIPPO_SITE_URL);
      toast.error(`Opened Shippo, but couldn't pre-fill the order: ${err.message || "request failed"}`);
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const handleAddNote = async () => {
    if (!note) return;
    await adminApi.addOrderNote(orderId, note);
    setNote("");
    loadOrder();
    toast.success("Note added");
  };

  const handleRefund = async () => {
    const isManual = order.paymentMethod && order.paymentMethod !== "Stripe" && order.paymentMethod !== "PayPal";
    const confirmText = isManual
      ? `Refund this paid manual order?${restockOnRefund ? " The purchased quantities will also be restocked." : ""} This action is irreversible.`
      : `Refund this paid order through Stripe?${restockOnRefund ? " The purchased quantities will also be restocked." : ""} This action is irreversible.`;
    if (!window.confirm(confirmText)) return;
    setIsVoiding(true);
    try {
      await adminApi.refundOrder(orderId);
      toast.success(isManual ? "Manual order marked as refunded" : "Stripe refund issued and order cancelled");
      loadOrder();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to refund order.");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleCancelUnpaid = async () => {
    if (!window.confirm("Cancel this unpaid order? No Stripe refund will be created.")) return;
    setIsVoiding(true);
    try {
      await adminApi.updateOrder(orderId, { status: "cancelled" });
      await adminApi.addOrderEvent(orderId, "Unpaid order cancelled by administrator.");
      await loadOrder();
      toast.success("Unpaid order cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel unpaid order.");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!window.confirm("Mark this order as paid? This will decrement inventory, record revenue, and send the customer a confirmation email.")) return;
    setIsMarkingPaid(true);
    try {
      await adminApi.markOrderPaid(orderId);
      toast.success("Order marked as paid — confirmation email sent");
      loadOrder();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to mark order as paid.");
    } finally {
      setIsMarkingPaid(false);
    }
  };


  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center py-32 space-y-6">
       <div className="w-12 h-12 border-4 border-white/5 border-t-violet-500 rounded-full animate-spin" />
       <p className="text-slate-500 text-[10px] tracking-[0.4em] uppercase font-black">Retrieving Order Manifest...</p>
    </div>
  );

  if (!order) return (
    <div className="p-20 text-center space-y-4">
       <Info size={48} className="mx-auto text-slate-800" />
       <p className="text-slate-500 text-xs font-black tracking-widest uppercase">ORDER MANIFEST NOT FOUND</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-20 print:p-0 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-8">
          <button 
            onClick={onClose} 
            className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-4">
              <h2 className="text-4xl font-black tracking-tighter text-white">{order.orderId}</h2>
              <span className={`text-[10px] font-black tracking-[.3em] px-4 py-2 rounded-xl shadow-lg ${
                order.status === 'open' 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {order.status.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] tracking-[0.2em] text-slate-500 font-black uppercase mt-2">
              {new Date(order.createdAt).toLocaleString()} <span className="mx-3 opacity-30">|</span> {order.paymentStatus.toUpperCase()}
            </p>
          </div>
        </div>
      </header>

      {/* Fulfillment status timeline */}
      <section className="glass-card rounded-[2rem] border border-white/5 p-8 print:hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] tracking-[0.4em] text-slate-400 uppercase font-black">Fulfillment Pipeline</h3>
          <select
            value={order.fulfillmentStatus || (order.status === "completed" ? "delivered" : "paid")}
            onChange={async (e) => {
              const next = e.target.value as FulfillmentStatus;
              await orderApi.setFulfillmentStatus(orderId, next);
              loadOrder();
              toast.success(`Status: ${FULFILLMENT_LABELS[next]}`);
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] tracking-widest uppercase text-white outline-none focus:border-violet-500/50 cursor-pointer"
          >
            {(Object.keys(FULFILLMENT_LABELS) as FulfillmentStatus[]).map(k => (
              <option key={k} value={k} className="bg-[#0A0A0B]">{FULFILLMENT_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <ol className="grid grid-cols-5 gap-2">
          {FULFILLMENT_FLOW.map((step, idx) => {
            const current = order.fulfillmentStatus || (order.status === "completed" ? "delivered" : "paid");
            const currentIdx = FULFILLMENT_FLOW.indexOf(current as FulfillmentStatus);
            const reached = idx <= currentIdx;
            return (
              <li key={step} className="flex flex-col gap-2">
                <div className={`h-1 rounded-full ${reached ? "bg-violet-500" : "bg-white/5"}`} />
                <span className={`text-[9px] tracking-widest uppercase font-black ${reached ? "text-white" : "text-white/30"}`}>
                  {FULFILLMENT_LABELS[step]}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Shipment Card */}
          <section className="glass-card rounded-[3rem] p-12 border border-white/5 relative overflow-hidden print:border-none print:shadow-none">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-xs tracking-[.4em] text-slate-500 uppercase font-black flex items-center gap-4">
                  <Package size={18} className="text-violet-400" /> Line Items
                </h3>
                <span className="text-[10px] font-black tracking-[0.3em] text-slate-600 uppercase border border-white/5 px-4 py-1.5 rounded-full">
                  {order.status === 'completed' ? 'DISPATCHED' : 'AWAITING FULFILLMENT'}
                </span>
              </div>
              
              <div className="space-y-10">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex gap-10 group">
                    <div className="w-20 h-28 bg-slate-900 rounded-2xl overflow-hidden flex-shrink-0 border border-white/5 shadow-2xl group-hover:border-violet-500/50 transition-all">
                      <img src={item.photoUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h4 className="text-sm font-black tracking-tight text-white uppercase group-hover:text-violet-400 transition-colors">{item.title}</h4>
                      <p className="text-[10px] text-slate-500 font-black tracking-widest mt-2">QUANTITY: {item.quantity}</p>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                      <p className="text-lg font-black text-white font-mono">CA${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-16 flex flex-wrap gap-4 pt-10 border-t border-white/5 print:hidden">
                 {order.labelUrl ? (
                   <a 
                     href={order.labelUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="px-8 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] tracking-[.3em] font-black rounded-2xl transition-all flex items-center gap-3 shadow-lg shadow-cyan-600/20 animate-in fade-in"
                   >
                     <ExternalLink size={16} />
                     DOWNLOAD SHIPPING LABEL
                   </a>
                 ) : (
                   <button
                     onClick={handlePushToShippo}
                     disabled={isGeneratingLabel}
                     className="px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] tracking-[.3em] font-black text-slate-300 rounded-2xl transition-all disabled:opacity-50 flex items-center gap-3"
                   >
                     <ClipboardCheck size={16} className="text-cyan-400" />
                     {isGeneratingLabel ? "CONNECTING TO SHIPPO..." : "GENERATE SHIPPING LABEL"}
                   </button>
                 )}
                 {order.status !== 'completed' && !showShipForm && (
                   <button 
                     onClick={() => setShowShipForm(true)}
                     className="px-10 py-3.5 bg-violet-600 text-white text-[10px] tracking-[.3em] font-black rounded-2xl hover:bg-violet-500 transition-all shadow-xl shadow-violet-600/20 flex items-center gap-3"
                   >
                     <Truck size={16} />
                     INITIATE DISPATCH
                   </button>
                 )}
                 <button 
                    onClick={handlePrintPackingSlip}
                    className="px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] tracking-[.3em] font-black text-slate-300 rounded-2xl transition-all flex items-center gap-3"
                 >
                    <Copy size={16} className="text-slate-500" />
                    PRINT PACKING SLIP
                 </button>
              </div>

              {/* Shipping form */}
              <AnimatePresence>
                {showShipForm && order.status !== 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-10 overflow-hidden"
                  >
                    <div className="p-8 bg-white/[0.02] rounded-[2rem] border border-white/5 space-y-8">
                      <h4 className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-400">Logistics Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Fulfillment Carrier</label>
                          <select
                            value={trackingCarrier}
                            onChange={(e) => setTrackingCarrier(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
                          >
                            <option className="bg-[#0A0A0B]">Canada Post</option>
                            <option className="bg-[#0A0A0B]">USPS</option>
                            <option className="bg-[#0A0A0B]">UPS</option>
                            <option className="bg-[#0A0A0B]">FedEx</option>
                            <option className="bg-[#0A0A0B]">DHL</option>
                            <option className="bg-[#0A0A0B]">Purolator</option>
                            <option className="bg-[#0A0A0B]">Other</option>
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Tracking Token</label>
                          <input
                            type="text"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="e.g. 1234 5678 9012"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-violet-500/50 font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={markAsShipped}
                          disabled={isShipping || !trackingNumber.trim()}
                          className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-[10px] tracking-[.3em] font-black hover:bg-emerald-500 transition-all shadow-lg disabled:opacity-50"
                        >
                          {isShipping ? "PROCESSING..." : "CONFIRM DISPATCH"}
                        </button>
                        <button
                          onClick={() => setShowShipForm(false)}
                          className="px-8 py-3 text-[10px] tracking-[.3em] font-black text-slate-500 hover:text-white transition-colors"
                        >
                          ABORT
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Show tracking info if already shipped */}
              {order.status === 'completed' && order.trackingNumber && (
                <div className="mt-10 p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                       <Truck size={24} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black tracking-[0.3em] text-emerald-400 uppercase mb-1">Package in Transit</p>
                      <p className="text-xs font-mono text-slate-300">{order.trackingCarrier} <span className="mx-2 text-slate-700">—</span> {order.trackingNumber}</p>
                    </div>
                  </div>
                  <a
                    href={getTrackingUrl(order.trackingCarrier, order.trackingNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-[9px] font-black tracking-[.35em] text-emerald-400 hover:bg-white/10 transition-all"
                  >
                    LIVE TRACKING
                  </a>
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Payment Details */}
            <section className="glass-card rounded-[3rem] p-10 border border-white/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.03] to-transparent pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-xs tracking-[.4em] text-slate-500 uppercase font-black mb-10 flex items-center gap-4">
                  <CreditCard size={18} className="text-cyan-400" /> Fiscal Audit
                </h3>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-[11px] tracking-widest text-slate-400">
                    <span className="uppercase font-black">Gross Subtotal</span>
                    <span className="text-white font-mono">CA${order.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] tracking-widest text-slate-400">
                    <span className="uppercase font-black">Logistics Fee</span>
                    <span className="text-white font-mono">CA${order.shipping?.toFixed(2)}</span>
                  </div>
                  {order.tax > 0 && (
                    <div className="flex justify-between items-center text-[11px] tracking-widest text-slate-400">
                      <span className="uppercase font-black">Tax</span>
                      <span className="text-white font-mono">CA${order.tax?.toFixed(2)}</span>
                    </div>
                  )}
                  {order.discount > 0 && (
                    <div className="flex justify-between items-center text-[11px] tracking-widest text-emerald-400">
                      <span className="uppercase font-black">Discount Applied</span>
                      <span className="font-mono">- CA${order.discount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-8 border-t border-white/5 flex justify-between items-end">
                    <span className="text-xs tracking-[.3em] font-black uppercase text-slate-500">Net Revenue</span>
                    <span className="text-4xl font-black text-white font-mono tracking-tighter">CA${order.total?.toFixed(2)}</span>
                  </div>
                </div>

                {order.stripePaymentIntentId && (
                  <div className="mt-12 p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] flex items-center justify-between group">
                     <div className="flex items-center gap-6">
                        <div className="p-3 bg-white/5 rounded-xl text-slate-400 group-hover:text-white transition-colors">
                          <CreditCard size={20} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] tracking-[0.2em] text-slate-300 uppercase font-black">Paid via Stripe</p>
                          <p className="text-[8px] text-slate-600 uppercase tracking-widest font-mono">{order.stripePaymentIntentId}</p>
                        </div>
                     </div>
                     <a
                       href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white transition-all"
                     >
                        <ExternalLink size={14} />
                     </a>
                  </div>
                )}
              </div>
            </section>

            {/* Activity Timeline */}
            <section className="glass-card rounded-[3rem] p-10 border border-white/5 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-bl from-amber-500/[0.03] to-transparent pointer-events-none" />
               <div className="relative z-10 space-y-10">
                 <h3 className="text-xs tracking-[.4em] text-slate-500 uppercase font-black flex items-center gap-4">
                   <ClipboardCheck size={18} className="text-amber-400" /> Registry Log
                 </h3>

                 <div className="relative">
                   <input 
                     type="text" 
                     value={note}
                     onChange={(e) => setNote(e.target.value)}
                     onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                     placeholder="Annotate order registry..."
                     className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 pr-16 text-xs text-white focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-700"
                   />
                   <button 
                     onClick={handleAddNote} 
                     className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-amber-500 text-black rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center shadow-lg shadow-amber-500/20"
                   >
                      <Plus size={18} />
                   </button>
                 </div>
                  {/* Filter tabs */}
                  <div className="flex border-b border-white/5 pb-2 gap-4">
                    {(["all", "event", "note"] as const).map(tab => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setTimelineFilter(tab)}
                        className={`text-[9px] font-black tracking-widest uppercase transition-all pb-1.5 border-b-2 ${
                          timelineFilter === tab
                            ? "border-amber-500 text-white"
                            : "border-transparent text-slate-500 hover:text-slate-350"
                        }`}
                      >
                        {tab === "all" ? "All" : tab === "event" ? "System Events" : "Notes Only"}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-10 pl-6 border-l-2 border-white/5">
                     {(order.activity || [])
                       .filter((e: any) => timelineFilter === "all" || e.type === timelineFilter)
                       .map((event: any, i: number) => (
                       <div key={i} className="relative group">
                         <div className="absolute -left-[2.1rem] top-1 w-3 h-3 bg-slate-900 border-2 border-white/10 rounded-full group-hover:border-amber-500 transition-colors"></div>
                         <div className={`p-5 rounded-2xl border transition-all ${
                           event.type === 'note' 
                             ? 'bg-amber-500/5 border-amber-500/20 text-slate-200' 
                             : 'bg-white/[0.01] border-white/5 text-slate-400'
                         }`}>
                           <p className="text-xs leading-relaxed">{event.message}</p>
                         </div>
                         <p className="text-[8px] text-slate-600 uppercase tracking-[0.3em] mt-3 font-black">{new Date(event.createdAt).toLocaleString()}</p>
                       </div>
                     )).reverse()}
                     {((order.activity || [])
                       .filter((e: any) => timelineFilter === "all" || e.type === timelineFilter).length === 0) && (
                       <div className="text-center py-10 opacity-30">
                         <Clock size={32} className="mx-auto mb-4" />
                         <p className="text-[8px] tracking-[0.4em] uppercase font-black">No Registry Entries</p>
                       </div>
                     )}
                  </div>
               </div>
            </section>
          </div>
        </div>

        {/* Right Sidebar: Customer */}
        <div className="space-y-12">
           <section className="glass-card rounded-[3.5rem] p-12 border border-white/5 sticky top-28 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none" />
              <div className="relative z-10 space-y-12">
                <h3 className="text-xs tracking-[.4em] text-slate-500 uppercase font-black flex items-center gap-4">
                  <User size={18} className="text-blue-400" /> Origin Profiling
                </h3>

                <div className="space-y-10">
                   <div className="flex items-start gap-8">
                      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 shadow-inner">
                         <User size={28} className="text-slate-700" />
                      </div>
                      <div className="pt-2">
                        <p className="text-lg font-black tracking-tight text-white mb-2">{order.customer?.name}</p>
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-400 leading-relaxed font-bold tracking-wide uppercase">
                            {order.customer?.address?.street}<br/>
                            {order.customer?.address?.city}, {order.customer?.address?.state} {order.customer?.address?.zip}<br/>
                            {order.customer?.address?.country}
                          </p>
                          {order.addressVerified === false && (
                            <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] text-rose-400 uppercase tracking-widest font-black leading-relaxed flex items-start gap-3 animate-in fade-in">
                              <AlertCircle size={14} className="shrink-0 mt-0.5" />
                              <div>
                                <p className="font-extrabold text-rose-300">Unverified Address</p>
                                <p className="text-[9px] text-rose-400/80 mt-1 normal-case font-mono font-medium">{order.addressError || "Could not verify address with postal systems."}</p>
                              </div>
                            </div>
                          )}
                          {order.ipCountryMatchesShipping === false && (
                            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[10px] text-amber-400 uppercase tracking-widest font-black leading-relaxed flex items-start gap-3 animate-in fade-in">
                              <AlertCircle size={14} className="shrink-0 mt-0.5" />
                              <div>
                                <p className="font-extrabold text-amber-300">IP Location Mismatch</p>
                                <p className="text-[9px] text-amber-400/80 mt-1 normal-case font-medium">
                                  IP Location Mismatch: Placed from IP in {order.ipCountry || 'Unknown'} but shipping to {order.customer?.address?.country}.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                   </div>

                   <div className="space-y-8 pt-8 border-t border-white/5">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black tracking-[0.3em] text-slate-600 uppercase ml-1">Communication Channel</label>
                         <p className="text-xs font-black text-white bg-white/5 px-6 py-4 rounded-2xl border border-white/10">{order.customer?.email}</p>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black tracking-[0.3em] text-slate-600 uppercase ml-1">Telemetry Contact</label>
                         <p className="text-xs font-black text-white bg-white/5 px-6 py-4 rounded-2xl border border-white/10">{order.customer?.phone || 'ANONYMOUS'}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => { navigator.clipboard.writeText(order.customer?.email); toast.success("Email copied"); }}
                        className="flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 text-[9px] tracking-widest font-black text-slate-400 rounded-2xl hover:bg-white/10 hover:text-white transition-all uppercase"
                      >
                         <Copy size={14} /> EMAIL
                      </button>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(`${order.customer?.address?.street}, ${order.customer?.address?.city}`); toast.success("Address copied"); }}
                        className="flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 text-[9px] tracking-widest font-black text-slate-400 rounded-2xl hover:bg-white/10 hover:text-white transition-all uppercase"
                      >
                         <Copy size={14} /> ADDR
                      </button>
                   </div>

                   <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] space-y-4">
                      <p className="text-[9px] tracking-[0.3em] text-slate-700 font-black uppercase mb-4 text-center">Administrative Overrides</p>
                      {(order.paymentStatus === "pending" || order.paymentStatus === "unpaid") && order.status !== "cancelled" && (
                        <>
                          <button
                            onClick={handleMarkAsPaid}
                            disabled={isMarkingPaid}
                            className="flex items-center justify-between w-full text-[10px] tracking-[0.2em] font-black text-slate-400 hover:text-emerald-400 transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {isMarkingPaid ? "PROCESSING..." : "MARK AS PAID"} <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-1 transition-transform" />
                          </button>
                          <div className="h-px bg-white/5" />
                        </>
                      )}
                      {order.paymentStatus === "paid" ? (
                        <>
                          <button
                            onClick={handleRefund}
                            disabled={isVoiding}
                            className="flex items-center justify-between w-full text-[10px] tracking-[0.2em] font-black text-slate-400 hover:text-rose-400 transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {isVoiding ? "REFUNDING..." : "REFUND PAID ORDER"} <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-1 transition-transform" />
                          </button>
                          <label className="flex items-center justify-between gap-4 text-[10px] tracking-[0.2em] font-black text-slate-500 uppercase cursor-pointer">
                            <span>Restock items</span>
                            <input
                              type="checkbox"
                              checked={restockOnRefund}
                              onChange={event => setRestockOnRefund(event.target.checked)}
                              className="accent-violet-500"
                            />
                          </label>
                        </>
                      ) : order.paymentStatus === "refunded" || order.paymentStatus === "refund_pending" ? (
                        <p className="text-[10px] tracking-[0.2em] font-black text-emerald-400 uppercase">
                           {order.paymentStatus === "refund_pending" ? "Refund pending" : "Refunded"}
                           {order.inventoryRestockedAt ? " · Items restocked" : ""}
                        </p>
                      ) : (
                        <button
                          onClick={handleCancelUnpaid}
                          disabled={isVoiding || order.status === "cancelled"}
                          className="flex items-center justify-between w-full text-[10px] tracking-[0.2em] font-black text-slate-400 hover:text-amber-400 transition-all group disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {isVoiding ? "CANCELLING..." : order.status === "cancelled" ? "UNPAID ORDER CANCELLED" : "CANCEL UNPAID ORDER"} <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                   </div>
                </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
