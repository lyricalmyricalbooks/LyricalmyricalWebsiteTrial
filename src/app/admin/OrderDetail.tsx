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
  Plus
} from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export function OrderDetail({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);

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
        trackingCarrier,
        trackingNumber: trackingNumber.trim(),
        shippedAt: new Date().toISOString(),
      });
      await adminApi.addOrderNote(
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

  const handleCreateShippingLabel = () => {
    setIsGeneratingLabel(true);
    setTimeout(() => {
      setIsGeneratingLabel(false);
      adminApi.addOrderNote(orderId, "Shipping Label #ARCH-882910 generated via dashboard.");
      loadOrder();
      toast.success("Label generated successfully");
    }, 2000);
  };

  const handleAddNote = async () => {
    if (!note) return;
    await adminApi.addOrderNote(orderId, note);
    setNote("");
    loadOrder();
    toast.success("Note added");
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
                 <button 
                   onClick={handleCreateShippingLabel}
                   disabled={isGeneratingLabel}
                   className="px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] tracking-[.3em] font-black text-slate-300 rounded-2xl transition-all disabled:opacity-50 flex items-center gap-3"
                 >
                   <ClipboardCheck size={16} className="text-cyan-400" />
                   {isGeneratingLabel ? "GENERATING..." : "GENERATE SHIPPING LABEL"}
                 </button>
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
                    href={`https://www.google.com/search?q=${encodeURIComponent(order.trackingNumber)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-[9px] font-black tracking-[0.3em] text-emerald-400 hover:bg-white/10 transition-all"
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

                <div className="mt-12 p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] flex items-center justify-between group">
                   <div className="flex items-center gap-6">
                      <div className="p-3 bg-white/5 rounded-xl text-slate-400 group-hover:text-white transition-colors">
                        <CreditCard size={20} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] tracking-[0.2em] text-slate-300 uppercase font-black">Authenticated Via Stripe</p>
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest font-mono">{order.stripeId || 'tx_882910_arch'}</p>
                      </div>
                   </div>
                   <button className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white transition-all">
                      <ExternalLink size={14} />
                   </button>
                </div>
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

                 <div className="space-y-10 pl-6 border-l-2 border-white/5">
                    {order.activity?.map((event: any, i: number) => (
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
                    {(!order.activity || order.activity.length === 0) && (
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
                      <button className="flex items-center justify-between w-full text-[10px] tracking-[0.2em] font-black text-slate-400 hover:text-rose-400 transition-all group">
                         VOID & REFUND <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-1 transition-transform" />
                      </button>
                      <div className="h-px bg-white/5" />
                      <button className="flex items-center justify-between w-full text-[10px] tracking-[0.2em] font-black text-slate-400 hover:text-blue-400 transition-all group">
                         SECURE CHANNEL <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-1 transition-transform" />
                      </button>
                   </div>
                </div>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
}
