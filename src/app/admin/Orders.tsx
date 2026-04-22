import { useState, useEffect } from "react";
import { 
  Search, 
  Grid, 
  List as ListIcon, 
  ChevronRight, 
  Package, 
  DollarSign, 
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  ArrowUpRight
} from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export function Orders({ onSelectOrder }: { onSelectOrder: (order: any) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Open");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const data = await adminApi.getOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders", err);
      toast.error("Registry access denied");
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchesTab = 
      activeTab === "All orders" || 
      (activeTab === "Open" && o.status === "open") ||
      (activeTab === "Completed" && o.status === "completed");
    
    const matchesSearch = 
      (o.orderId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-12 pb-32">
      <div className="flex flex-col xl:flex-row gap-8 items-center justify-between">
        <div className="relative w-full xl:w-[500px] group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="Search Order ID, Customer, or Registry Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-3xl py-5 pl-14 pr-6 text-sm text-white focus:border-violet-500/50 focus:bg-white/[0.07] outline-none transition-all shadow-2xl tracking-wide placeholder:text-slate-600 backdrop-blur-md"
          />
        </div>

        <div className="flex bg-white/[0.03] rounded-[2.5rem] p-2 border border-white/5 backdrop-blur-md">
           {["Open", "Completed", "All orders"].map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-10 py-3.5 rounded-3xl text-[10px] tracking-[0.3em] font-black transition-all ${
                 activeTab === tab ? 'bg-violet-600 text-white shadow-[0_10px_20px_rgba(124,58,237,0.3)]' : 'text-slate-500 hover:text-slate-300'
               }`}
             >
               {tab.toUpperCase()}
             </button>
           ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-8">
           <div className="relative">
              <div className="w-24 h-24 border-2 border-violet-500/5 border-t-violet-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-24 h-24 border-2 border-cyan-500/5 border-b-cyan-500 rounded-full animate-spin-slow"></div>
           </div>
           <p className="text-[10px] tracking-[0.6em] text-slate-500 uppercase font-black animate-pulse">Decrypting Transaction Ledger...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="h-[50vh] flex flex-col items-center justify-center bg-white/[0.01] rounded-[4rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-600/5 blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="p-10 bg-white/[0.02] rounded-full border border-white/5 text-slate-800 mb-8 shadow-inner group-hover:scale-110 transition-transform duration-700">
            <Package size={64} strokeWidth={0.5} />
          </div>
          <h3 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter italic">Void Detected</h3>
          <p className="text-[10px] tracking-[0.4em] text-slate-500 uppercase mb-12 font-black">No transactions identified in this spectral range</p>
          <button 
            onClick={async () => {
              const samples = [
                { name: "Patrick Kane", email: "patkanephoto@gmail.com", address: "5207 55 St, Yellowknife, NT X1A 1X4", total: 85, items: 1 },
                { name: "Selena PB", email: "selena.pb@example.com", address: "123 Main St, Toronto, ON M5V 1A1", total: 85, items: 1 },
                { name: "William Boland", email: "w.boland@example.com", address: "456 Oak Ave, Vancouver, BC V6B 1A1", total: 81, items: 1 }
              ];
              for (const s of samples) {
                await adminApi.createOrder({
                  customer: { name: s.name, email: s.email, address: { street: s.address, city: "", state: "", zip: "", country: "Canada" } },
                  items: [{ title: "[PRESALE] - The Hound by Ian Willms", price: s.total, quantity: s.items, photoUrl: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format" }],
                  total: s.total, subtotal: s.total, shipping: 0, discount: 0,
                  paymentStatus: "paid", status: "open"
                });
              }
              toast.success("Synthetic data manifested");
              loadOrders();
            }}
            className="bg-violet-600 text-white px-12 py-5 rounded-3xl text-[10px] tracking-[0.4em] font-black hover:bg-violet-500 transition-all shadow-[0_20px_40px_rgba(124,58,237,0.3)] active:scale-95 flex items-center gap-4"
          >
            GENERATE SYNTHETIC DATA <ArrowUpRight size={16} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10">
          {filteredOrders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: "easeOut" }}
              onClick={() => onSelectOrder(order)}
              className="group relative bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden cursor-pointer transition-all duration-700 hover:border-violet-500/30 hover:-translate-y-2 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] flex flex-col"
            >
              <div className="aspect-[16/10] bg-slate-950 relative overflow-hidden">
                <img 
                  src={order.items?.[0]?.photoUrl || "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format"} 
                  className="w-full h-full object-cover grayscale opacity-60 transition-all duration-1000 group-hover:scale-110 group-hover:rotate-1 group-hover:grayscale-0 group-hover:opacity-100"
                />
                
                {/* Status Overlay */}
                <div className="absolute top-6 left-6 z-10 flex gap-2">
                   <span className={`text-[8px] font-black tracking-[0.2em] px-4 py-2 rounded-xl backdrop-blur-3xl border shadow-2xl flex items-center gap-2 ${
                     order.status === 'open' 
                       ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                       : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                   }`}>
                     <div className={`w-1 h-1 rounded-full animate-pulse ${order.status === 'open' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                     {order.status.toUpperCase()}
                   </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent">
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Dispatch Code</span>
                        <h4 className="text-2xl font-black tracking-tighter text-white uppercase italic">{order.orderId}</h4>
                      </div>
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl group-hover:bg-violet-600 group-hover:border-violet-400 transition-all duration-500">
                        <ExternalLink size={18} className="text-white" />
                      </div>
                   </div>
                </div>
              </div>

              <div className="p-8 space-y-8 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500">
                      <Users size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-tight leading-none mb-2">{order.customer?.name}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none truncate max-w-[150px]">{order.customer?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">Economic Flow</span>
                        <span className="text-lg font-black text-white tracking-tighter">CA${order.total?.toFixed(2)}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1">Payload</span>
                          <span className="text-xs font-black text-slate-400 uppercase">{order.items?.length || 0} Artifacts</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-3 text-slate-500">
                      <Clock size={14} />
                      <span className="text-[10px] font-black tracking-[0.2em] uppercase">{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      {order.paymentStatus === 'paid' ? (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-500" />
                      )}
                      <span className={`text-[10px] font-black tracking-widest uppercase ${order.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {order.paymentStatus === 'paid' ? 'Authenticated' : 'Pending'}
                      </span>
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

