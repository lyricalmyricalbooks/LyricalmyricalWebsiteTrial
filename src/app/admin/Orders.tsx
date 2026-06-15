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
  Users,
  Trash2
} from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { orderApi, FULFILLMENT_LABELS, type FulfillmentStatus } from "../lib/commerce";
import { Download, CheckSquare, Square } from "lucide-react";

export function Orders({ onSelectOrder }: { onSelectOrder: (order: any) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Open");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<FulfillmentStatus>("processing");
  const [orderType, setOrderType] = useState<"production" | "test" | "all">("production");

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = (ids: string[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const handleExportCsv = () => {
    const list = (selected.size > 0 ? orders.filter(o => selected.has(o.id)) : filteredOrders)
      .filter(o => o.isTest !== true);
    if (!list.length) {
      toast.error("Nothing to export");
      return;
    }
    const csv = orderApi.exportToCsv(list);
    orderApi.downloadCsv(`orders-${new Date().toISOString().split("T")[0]}.csv`, csv);
    toast.success(`Exported ${list.length} order${list.length === 1 ? "" : "s"}`);
  };

  const handleBulkDeleteTests = async () => {
    const ids = Array.from(selected);
    if (!ids.length || !ids.every(id => orders.find(o => o.id === id)?.isTest === true)) {
      toast.error("Bulk deletion is limited to marked test orders");
      return;
    }
    if (!window.confirm(`Permanently delete ${ids.length} marked test order${ids.length === 1 ? "" : "s"}?`)) return;
    try {
      const result = await adminApi.deleteTestOrders(ids);
      toast.success(`Deleted ${result.deleted} test order${result.deleted === 1 ? "" : "s"}`);
      setSelected(new Set());
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Test-order deletion failed");
    }
  };

  const handleBulkUpdate = async () => {
    if (selected.size === 0) return;
    try {
      await orderApi.bulkSetStatus(Array.from(selected), bulkStatus);
      toast.success(`Updated ${selected.size} order${selected.size === 1 ? "" : "s"} → ${FULFILLMENT_LABELS[bulkStatus]}`);
      setSelected(new Set());
      loadOrders();
    } catch {
      toast.error("Bulk update failed");
    }
  };

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

    const matchesOrderType =
      orderType === "all" ||
      (orderType === "test" && o.isTest === true) ||
      (orderType === "production" && o.isTest !== true);

    return matchesTab && matchesSearch && matchesOrderType;
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

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-slate-300 px-5 py-3 rounded-2xl text-[10px] tracking-[0.3em] font-black uppercase transition-all"
          >
            <Download size={14} /> Export CSV
          </button>
          <select
            aria-label="Filter test orders"
            value={orderType}
            onChange={e => {
              setOrderType(e.target.value as "production" | "test" | "all");
              setSelected(new Set());
            }}
            className="bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3 text-[10px] tracking-[0.2em] font-black uppercase text-slate-300 outline-none"
          >
            <option value="production" className="bg-[#0A0A0B]">Production orders</option>
            <option value="test" className="bg-[#0A0A0B]">Test orders</option>
            <option value="all" className="bg-[#0A0A0B]">All orders</option>
          </select>
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
        </div>
      ) : (
        <>
          {/* Selection / bulk action bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
            <button
              onClick={() => selectAllFiltered(filteredOrders.map(o => o.id))}
              className="flex items-center gap-3 text-[10px] font-black tracking-widest text-slate-400 hover:text-white uppercase"
            >
              {filteredOrders.every(o => selected.has(o.id)) ? <CheckSquare size={14} /> : <Square size={14} />}
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </button>
            {selected.size > 0 && (
              <div className="flex items-center gap-3">
                {Array.from(selected).every(id => orders.find(o => o.id === id)?.isTest === true) && (
                  <button
                    onClick={handleBulkDeleteTests}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-xl text-[10px] tracking-widest font-black uppercase transition-colors"
                  >
                    <Trash2 size={13} /> Delete tests
                  </button>
                )}
                {!Array.from(selected).some(id => orders.find(o => o.id === id)?.isTest === true) && (
                  <>
                <select
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value as FulfillmentStatus)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] tracking-widest uppercase text-white outline-none cursor-pointer"
                >
                  {(Object.keys(FULFILLMENT_LABELS) as FulfillmentStatus[]).map(k => (
                    <option key={k} value={k} className="bg-[#0A0A0B]">{FULFILLMENT_LABELS[k]}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkUpdate}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-xl text-[10px] tracking-widest font-black uppercase transition-colors"
                >
                  Apply to {selected.size}
                </button>
                  </>
                )}
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-[10px] font-black tracking-widest text-slate-500 hover:text-white uppercase"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

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
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelect(order.id); }}
                aria-label="Select order"
                className={`absolute top-4 right-4 z-20 w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md border transition-colors ${
                  selected.has(order.id)
                    ? "bg-violet-500 border-violet-400 text-white"
                    : "bg-black/40 border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {selected.has(order.id) ? <CheckSquare size={14} /> : <Square size={14} />}
              </button>
              <div className="aspect-[16/10] bg-slate-950 relative overflow-hidden">
                <img 
                  src={order.items?.[0]?.photoUrl || "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format"} 
                  className="w-full h-full object-cover grayscale opacity-60 transition-all duration-1000 group-hover:scale-110 group-hover:rotate-1 group-hover:grayscale-0 group-hover:opacity-100"
                />
                
                {/* Status Overlay */}
                <div className="absolute top-6 left-6 z-10 flex gap-2">
                   {order.isTest === true && (
                     <span className="text-[8px] font-black tracking-[0.2em] px-4 py-2 rounded-xl bg-rose-600 text-white border border-rose-300 shadow-2xl">
                       TEST ORDER
                     </span>
                   )}
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
        </>
      )}
    </div>
  );
}
