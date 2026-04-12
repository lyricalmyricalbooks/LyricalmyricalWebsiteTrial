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
import { motion } from "motion/react";

export function OrderDetail({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

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

  const markAsShipped = async () => {
    try {
      await adminApi.updateOrder(orderId, { status: "completed" });
      await adminApi.addOrderNote(orderId, "Shipment updated (Customer notified)");
      loadOrder();
    } catch (err) {
      alert("Error updating order");
    }
  };

  const handleAddNote = async () => {
    if (!note) return;
    await adminApi.addOrderNote(orderId, note);
    setNote("");
    loadOrder();
  };

  if (loading) return <div className="h-full flex items-center justify-center py-32 text-neutral-400 text-[10px] tracking-widest uppercase animate-pulse">Retrieving Order Manifest...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-neutral-50/80 backdrop-blur-md z-10 py-4">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-neutral-400" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tighter">{order.orderId}</h2>
              <span className={`text-[9px] font-bold tracking-[.3em] px-3 py-1.5 rounded-full ${order.status === 'open' ? 'bg-yellow-400 text-black' : 'bg-green-500 text-white'}`}>
                {order.status.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] tracking-widest text-neutral-400 uppercase mt-1">
              {new Date(order.createdAt).toLocaleString()} • {order.paymentStatus.toUpperCase()}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Shipment Card */}
          <div className="bg-white border border-neutral-100 rounded-[2.5rem] p-10 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase flex items-center gap-2">
                <Truck size={14} /> Shipment 1
              </h3>
              <span className="text-[9px] font-bold tracking-widest text-neutral-300 uppercase">PENDING</span>
            </div>
            
            <div className="space-y-8">
              {order.items?.map((item: any, i: number) => (
                <div key={i} className="flex gap-8 group">
                  <div className="w-16 h-20 bg-neutral-50 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.photoUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-[12px] font-bold tracking-widest uppercase">{item.title}</h4>
                    <p className="text-[10px] text-neutral-400 mt-1">QTY: {item.quantity}</p>
                  </div>
                  <div className="text-right flex flex-col justify-center">
                    <p className="text-sm font-light">$ {item.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-wrap gap-4 pt-8 border-t border-neutral-50">
               <button className="px-6 py-2.5 bg-neutral-100/50 hover:bg-neutral-100 text-[9px] tracking-[.3em] font-bold rounded-full transition-all">CREATE SHIPPING LABEL</button>
               <button 
                 onClick={markAsShipped}
                 className="px-6 py-2.5 bg-black text-white text-[9px] tracking-[.3em] font-bold rounded-full hover:scale-105 transition-all shadow-lg"
               >
                 MARK AS SHIPPED
               </button>
               <button className="px-6 py-2.5 bg-neutral-100/50 hover:bg-neutral-100 text-[9px] tracking-[.3em] font-bold rounded-full transition-all">PRINT PACKING SLIP</button>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white border border-neutral-100 rounded-[2.5rem] p-10 shadow-sm">
            <h3 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-10 flex items-center gap-2">
              <CreditCard size={14} /> Payment details
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between text-[11px] tracking-widest">
                <span className="text-neutral-400 uppercase">Subtotal</span>
                <span>$ {order.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] tracking-widest">
                <span className="text-neutral-400 uppercase">Shipping</span>
                <span>$ {order.shipping?.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-[11px] tracking-widest text-green-600">
                  <span className="uppercase">Discount</span>
                  <span>- $ {order.discount?.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-neutral-50 flex justify-between items-end">
                <span className="text-[10px] tracking-[.3em] font-bold uppercase">Total</span>
                <span className="text-3xl font-light">$ {order.total?.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-10 p-6 bg-neutral-50 rounded-2xl flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg"><CreditCard size={16} className="text-neutral-400" /></div>
                  <div className="space-y-1">
                    <p className="text-[10px] tracking-widest text-neutral-500 uppercase font-bold">Paid with Stripe</p>
                    <p className="text-[8px] text-neutral-400 uppercase tracking-widest">Transaction ID: {order.stripeId || 'tx_test_123'}</p>
                  </div>
               </div>
               <button className="text-[10px] font-bold tracking-widest text-black flex items-center gap-2 border-b border-black pb-0.5 hover:opacity-50">
                  VIEW ON STRIPE <ExternalLink size={10} />
               </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white border border-neutral-100 rounded-[2.5rem] p-10 shadow-sm">
            <h3 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-10 flex items-center gap-2">
              <ClipboardCheck size={14} /> Activity history
            </h3>

            <div className="space-y-8">
               <div className="relative">
                 <input 
                   type="text" 
                   value={note}
                   onChange={(e) => setNote(e.target.value)}
                   onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                   placeholder="Add a private note..."
                   className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-[11px] focus:ring-1 focus:ring-black outline-none transition-all"
                 />
                 <button onClick={handleAddNote} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black text-white rounded-xl hover:bg-neutral-800 transition-all">
                    <Plus size={14} />
                 </button>
               </div>

               <div className="space-y-6 pl-4 border-l-2 border-neutral-50">
                  {order.activity?.map((event: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[1.25rem] top-1 w-2.5 h-2.5 bg-neutral-100 border-2 border-white rounded-full"></div>
                      <p className={`text-[11px] tracking-wide mb-1 ${event.type === 'note' ? 'bg-yellow-50 p-3 rounded-xl border border-yellow-100 text-neutral-700' : 'text-neutral-500'}`}>
                        {event.message}
                      </p>
                      <p className="text-[8px] text-neutral-300 uppercase tracking-widest">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  )).reverse()}
               </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Customer */}
        <div className="space-y-8">
           <div className="bg-white border border-neutral-100 rounded-[2.5rem] p-10 shadow-sm sticky top-28">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase flex items-center gap-2">
                  <User size={14} /> Customer info
                </h3>
              </div>

              <div className="space-y-10">
                 <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                       <User size={20} className="text-neutral-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-tight mb-1">{order.customer?.name}</p>
                      <div className="space-y-1">
                        <p className="text-[10px] text-neutral-400 leading-relaxed font-medium">
                          {order.customer?.address?.street}<br/>
                          {order.customer?.address?.city}, {order.customer?.address?.state} {order.customer?.address?.zip}<br/>
                          {order.customer?.address?.country}
                        </p>
                      </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                       <label className="text-[8px] tracking-widest text-neutral-400 uppercase font-bold">Email Address</label>
                       <p className="text-[10px] font-medium text-black">{order.customer?.email}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                       <label className="text-[8px] tracking-widest text-neutral-400 uppercase font-bold">Contact Phone</label>
                       <p className="text-[10px] font-medium text-black">{order.customer?.phone || 'NOT PROVIDED'}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3 pt-6 border-t border-neutral-50">
                    <button className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-50 text-[9px] tracking-widest font-bold rounded-2xl hover:bg-neutral-100 transition-all">
                       <Copy size={12} /> COPY EMAIL
                    </button>
                    <button className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-50 text-[9px] tracking-widest font-bold rounded-2xl hover:bg-neutral-100 transition-all">
                       <Copy size={12} /> COPY ADDR
                    </button>
                 </div>

                 <div className="p-6 bg-neutral-50 rounded-[2rem] space-y-3">
                    <p className="text-[9px] tracking-[.1em] text-neutral-400 font-bold uppercase mb-2">Internal Support</p>
                    <button className="flex items-center justify-between w-full text-[10px] tracking-widest font-medium hover:opacity-50 transition-opacity">
                       ISSUE A REFUND <ChevronDown size={14} className="-rotate-90" />
                    </button>
                    <button className="flex items-center justify-between w-full text-[10px] tracking-widest font-medium hover:opacity-50 transition-opacity">
                       CONTACT CUSTOMER <ChevronDown size={14} className="-rotate-90" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
