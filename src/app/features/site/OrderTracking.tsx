import { useState, useEffect } from "react";
import { Link } from "react-router";
import { 
  ArrowLeft, Lock, Package, Truck, CheckCircle2, 
  MapPin, Calendar, AlertCircle, Loader2, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { functionUrl } from "../../lib/functionsBase";
import { useCurrency } from "../../CurrencyContext";

export default function OrderTracking() {
  const [orderIdInput, setOrderIdInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusToken, setStatusToken] = useState("");
  
  const { formatPrice, currency: defaultCurrency } = useCurrency();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedOrderId = params.get("orderId") || "";
    const linkedToken = params.get("token") || "";
    if (!linkedOrderId) return;
    setOrderIdInput(linkedOrderId);
    if (linkedToken) {
      setStatusToken(linkedToken);
      void lookupOrder(linkedOrderId, "", linkedToken);
    }
  }, []);

  const lookupOrder = async (orderId: string, email: string, token: string) => {
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const response = await fetch(functionUrl("lookupGuestOrder"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.trim(), email: email.trim(), token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.order) {
        throw new Error("Unable to verify those order details.");
      }
      setOrder(data.order);
    } catch {
      setError("Unable to verify those order details.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdInput.trim() || (!emailInput.trim() && !statusToken)) {
      setError("Please fill in both order ID and email.");
      return;
    }

    await lookupOrder(orderIdInput, emailInput, statusToken);
  };

  // Resolve tracking status step index
  const getStepIndex = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered" || s === "completed") return 3;
    if (s === "shipped") return 2;
    if (s === "processing" || s === "open") return 1;
    return 0; // Paid / Pending
  };

  const currentStep = order ? getStepIndex(order.fulfillmentStatus || order.status) : 0;
  
  const steps = [
    { label: "Paid", desc: "Order confirmed", icon: CheckCircle2 },
    { label: "Processing", desc: "Packing items", icon: Package },
    { label: "Shipped", desc: "In transit", icon: Truck },
    { label: "Delivered", desc: "Arrival confirmed", icon: MapPin },
  ];

  // Format order prices using checkout currency if available, else fallback
  const orderFormatPrice = (priceInCAD: number) => {
    if (order?.checkoutCurrency && order?.exchangeRate) {
      const symbols: Record<string, string> = { CAD: "CA$ ", USD: "$ ", EUR: "€ " };
      const symbol = symbols[order.checkoutCurrency] || "$ ";
      const converted = priceInCAD * order.exchangeRate;
      return `${symbol}${converted.toFixed(2)}`;
    }
    return formatPrice(priceInCAD);
  };

  return (
    <div className="min-h-screen bg-[#050506] text-white font-sans selection:bg-violet-500/30 relative overflow-hidden pb-24">
      {/* Ambient background glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-violet-600/8 blur-[140px] rounded-full pointer-events-none -mr-72 -mt-72" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <nav className="relative z-10 px-8 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-black/20">
        <Link to="/" className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-white/40 hover:text-white transition-colors group uppercase">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Store
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase">Order Ledger</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-16 relative z-10">
        <AnimatePresence mode="wait">
          {!order ? (
            /* Search Form */
            <motion.div
              key="search-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white/[0.03] border border-white/8 rounded-[2.5rem] p-10 backdrop-blur-xl max-w-lg mx-auto shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] to-transparent pointer-events-none" />
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_40px_rgba(124,58,237,0.2)]">
                  <Lock size={24} className="text-violet-400" />
                </div>
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">Track Order</h2>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mt-2 font-bold">Secure Order Status Ledger</p>
              </div>

              <form onSubmit={handleTrack} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">ORDER IDENTIFIER</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABCD-123456"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all font-mono uppercase placeholder:text-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">CUSTOMER EMAIL</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. reader@archive.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all placeholder:text-white/10"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-[10px] font-black tracking-widest text-red-400 uppercase">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white py-5 rounded-2xl text-[10px] font-black tracking-[0.4em] uppercase transition-all active:scale-[0.98] disabled:opacity-60 shadow-[0_15px_40px_rgba(124,58,237,0.3)] flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Querying...</>
                  ) : (
                    "Initialize Pulse"
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* Order Status Display */
            <motion.div
              key="order-display"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              {/* Reset button */}
              <button 
                onClick={() => setOrder(null)} 
                className="flex items-center gap-2 text-[9px] font-black tracking-[0.25em] text-white/30 hover:text-white uppercase transition-colors"
              >
                <ArrowLeft size={12} /> Track Another Order
              </button>

              {/* Order Header Summary */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] font-black tracking-[0.3em] text-violet-400 uppercase mb-2">ARCHIVE MATCH FOUND</p>
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">ORDER #{order.orderId}</h2>
                  <p className="text-[10px] font-mono text-white/30 mt-3 uppercase tracking-widest flex items-center gap-3">
                    <Calendar size={12} /> Created: {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 self-stretch md:self-auto border-t md:border-t-0 border-white/5 pt-6 md:pt-0">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Payable</span>
                  <span className="text-3xl font-black text-white">{orderFormatPrice(order.total)}</span>
                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest mt-1">
                    {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                  </span>
                </div>
              </div>

              {/* Horizontal Progress Steps */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-12 backdrop-blur-sm">
                <h3 className="text-xs font-black tracking-[0.4em] uppercase text-white/40 mb-10 pb-4 border-b border-white/5">Transit Status Timeline</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
                  {steps.map((step, index) => {
                    const isCompleted = index <= currentStep;
                    const isActive = index === currentStep;
                    const StepIcon = step.icon;
                    return (
                      <div key={index} className="flex flex-col items-center md:items-start text-center md:text-left relative z-10 space-y-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border
                          ${isCompleted 
                            ? "bg-violet-600/20 border-violet-500/40 text-violet-400 shadow-[0_0_30px_rgba(124,58,237,0.25)]" 
                            : "bg-white/[0.03] border-white/10 text-white/20"
                          }
                          ${isActive ? "ring-2 ring-violet-500 ring-offset-4 ring-offset-[#050506]" : ""}
                        `}>
                          <StepIcon size={18} />
                        </div>
                        <div>
                          <p className={`text-xs font-black uppercase tracking-wider ${isCompleted ? "text-white" : "text-white/20"}`}>{step.label}</p>
                          <p className={`text-[10px] mt-1 font-medium ${isCompleted ? "text-slate-500" : "text-white/10"}`}>{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shipping carrier information */}
              {order.trackingUrl && (
                <div className="bg-gradient-to-r from-violet-950/20 to-cyan-950/20 border border-violet-500/15 rounded-[2.5rem] p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black tracking-[0.3em] text-violet-400 uppercase">Fulfillment Logistics</p>
                    <h4 className="text-2xl font-black tracking-tighter uppercase italic leading-none">Carrier Assigned</h4>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-md mt-2">
                      Your parcel is in transit
                      {order.carrier ? ` with ${order.carrier.toUpperCase()}` : ""}.
                    </p>
                  </div>
                  {order.trackingUrl && (
                    <a 
                      href={order.trackingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-white text-black hover:bg-slate-200 px-8 py-4 rounded-2xl text-[9px] font-black tracking-[0.25em] uppercase transition-all active:scale-95 flex items-center gap-3 shrink-0 shadow-xl"
                    >
                      Track Shipment <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}

              {/* Items breakdown list */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10">
                <h3 className="text-xs font-black tracking-[0.4em] uppercase text-white/40 mb-8 pb-4 border-b border-white/5">Cart Items Ledger</h3>
                
                <div className="space-y-6">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-6 items-center">
                      <div className="w-14 aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden border border-white/10 shrink-0">
                        <img src={item.photoUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white uppercase tracking-wider truncate leading-tight">{item.title}</p>
                        {item.variantName && (
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">{item.variantName}</p>
                        )}
                        <p className="text-[10px] text-slate-500 font-mono mt-2">QTY: {item.quantity} × {orderFormatPrice(item.price)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white font-mono">{orderFormatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotals list */}
                <div className="border-t border-white/5 mt-8 pt-8 space-y-4 text-sm font-bold text-white/60">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Subtotal</span>
                    <span className="font-mono text-white/80">{orderFormatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em]">Discount</span>
                      <span className="font-mono">−{orderFormatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Shipping</span>
                    <span className="font-mono text-white/80">{order.shipping > 0 ? orderFormatPrice(order.shipping) : "FREE"}</span>
                  </div>
                  {order.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Estimated Tax</span>
                      <span className="font-mono text-white/80">{orderFormatPrice(order.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/5 pt-6 text-white text-base">
                    <span className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">Total</span>
                    <span className="font-mono text-xl font-black text-white">{orderFormatPrice(order.total)}</span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
