import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Tag, 
  Calendar, 
  Percent, 
  DollarSign, 
  Truck, 
  X, 
  Save,
  Ticket,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export function Discounts() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newDiscount, setNewDiscount] = useState({
    code: "",
    type: "percentage",
    value: 10,
    isActive: true,
    expiryDate: "",
  });

  useEffect(() => {
    loadDiscounts();
  }, []);

  async function loadDiscounts() {
    try {
      const data = await adminApi.getDiscounts();
      setDiscounts(data);
    } catch (err) {
      console.error("Failed to load discounts", err);
      toast.error("Registry connection interrupted");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!newDiscount.code) return;
    try {
      await adminApi.saveDiscount({
        ...newDiscount,
        code: newDiscount.code.toUpperCase()
      });
      setIsAdding(false);
      setNewDiscount({ code: "", type: "percentage", value: 10, isActive: true, expiryDate: "" });
      toast.success("Promotion code manifested");
      loadDiscounts();
    } catch (err) {
      toast.error("Code crystallization failed");
    }
  };

  const deleteDiscount = async (id: string) => {
    if (confirm("De-manifest this discount code?")) {
      try {
        await adminApi.deleteDiscount(id);
        toast.success("Code purged from registry");
        loadDiscounts();
      } catch (err) {
        toast.error("Purge sequence failed");
      }
    }
  };

  return (
    <div className="space-y-12 pb-32">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">Promotion Registry</h2>
          <p className="text-[10px] tracking-[0.4em] text-slate-500 uppercase mt-2 font-black flex items-center gap-3">
             <Ticket size={12} className="text-violet-400" /> Catalog of active incentives
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-violet-600 text-white px-10 py-4 rounded-3xl text-[10px] tracking-[0.4em] font-black hover:bg-violet-500 transition-all shadow-[0_20px_40px_rgba(124,58,237,0.3)] active:scale-95 flex items-center gap-4"
        >
          <Plus size={16} /> ADD DISCOUNT
        </button>
      </header>

      {loading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center space-y-6">
           <div className="w-16 h-16 border-2 border-violet-500/10 border-t-violet-500 rounded-full animate-spin"></div>
           <p className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Syncing Promotional Buffer...</p>
        </div>
      ) : discounts.length === 0 && !isAdding ? (
        <div className="py-32 flex flex-col items-center justify-center bg-white/[0.01] rounded-[4rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none" />
          <Tag size={64} strokeWidth={0.5} className="text-slate-800 mb-10 group-hover:scale-110 transition-transform duration-700" />
          <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter italic">Registry Vacant</h3>
          <p className="text-[10px] tracking-[0.3em] text-slate-500 uppercase mb-12 font-black">Initiate growth protocols with your first code</p>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-white/5 text-white border border-white/10 px-12 py-5 rounded-3xl text-[10px] tracking-[0.4em] font-black hover:bg-white/10 transition-all shadow-2xl active:scale-95"
          >
            INITIALIZE CODE
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {discounts.map((d, i) => (
            <motion.div 
              key={d.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] shadow-sm hover:border-violet-500/30 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] transition-all duration-700 relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-[60px] -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex justify-between items-start mb-10">
                <div className="p-5 bg-white/[0.03] rounded-3xl border border-white/5 text-violet-400 shadow-inner group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-500">
                  {d.type === 'percentage' && <Percent size={24} />}
                  {d.type === 'fixed' && <DollarSign size={24} />}
                  {d.type === 'freeship' && <Truck size={24} />}
                </div>
                <button 
                  onClick={() => deleteDiscount(d.id)}
                  className="p-3 bg-white/[0.01] rounded-2xl border border-white/5 text-slate-600 hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-90"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-2 mb-10">
                <h4 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">{d.code}</h4>
                <p className="text-[10px] tracking-[0.3em] text-slate-500 uppercase font-black">
                  {d.type === 'percentage' ? `${d.value}% RELATIVE ADJUSTMENT` : d.type === 'fixed' ? `CA$${d.value} FLAT DEDUCTION` : 'LOGISTICS EXEMPTION'}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-8 border-t border-white/5">
                <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${d.isActive ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-slate-700'}`} />
                   <span className={`text-[9px] font-black tracking-[.3em] uppercase ${d.isActive ? 'text-emerald-500' : 'text-slate-600'}`}>
                    {d.isActive ? 'OPERATIONAL' : 'DORMANT'}
                  </span>
                </div>
                {d.expiryDate && (
                  <div className="flex items-center gap-3 text-slate-500 group-hover:text-slate-300 transition-colors">
                    <Calendar size={12} />
                    <span className="text-[9px] font-black tracking-[.2em] uppercase">{new Date(d.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal overlay */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-slate-950/80 backdrop-blur-3xl" 
               onClick={() => setIsAdding(false)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[4rem] shadow-2xl p-12 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />
              
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">Code Formulation</h3>
                  <p className="text-[10px] tracking-[0.4em] text-slate-500 uppercase font-black mt-2">Configuring promotional metadata</p>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-4 bg-white/5 rounded-3xl text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black ml-2">Manifestation Code</label>
                  <input 
                    type="text" 
                    value={newDiscount.code} 
                    onChange={e => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
                    placeholder="E.G. NOIR25"
                    className="w-full bg-white/[0.03] border border-white/5 rounded-3xl py-6 px-10 text-3xl font-black tracking-tighter uppercase italic text-white focus:border-violet-500/50 outline-none transition-all placeholder:text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {[
                    { id: 'percentage', icon: Percent, label: 'Relative' },
                    { id: 'fixed', icon: DollarSign, label: 'Absolute' },
                    { id: 'freeship', icon: Truck, label: 'Logistics' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setNewDiscount({ ...newDiscount, type: t.id })}
                      className={`p-8 rounded-[2.5rem] border flex flex-col items-center gap-4 transition-all duration-500 ${
                        newDiscount.type === t.id 
                          ? 'bg-violet-600 text-white border-violet-400 shadow-[0_20px_40px_rgba(124,58,237,0.3)]' 
                          : 'bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/[0.05] hover:border-white/10'
                      }`}
                    >
                      <t.icon size={28} strokeWidth={newDiscount.type === t.id ? 2.5 : 1.5} />
                      <span className="text-[10px] font-black tracking-[0.4em] uppercase">{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {newDiscount.type !== 'freeship' && (
                    <div className="space-y-4">
                      <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black ml-2">Impact Magnitude</label>
                      <div className="relative">
                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xl">
                          {newDiscount.type === 'percentage' ? '%' : 'CA$'}
                        </span>
                        <input 
                          type="number" 
                          value={newDiscount.value} 
                          onChange={e => setNewDiscount({ ...newDiscount, value: Number(e.target.value) })}
                          className="w-full bg-white/[0.03] border border-white/5 rounded-3xl py-6 pl-16 pr-8 text-2xl font-black text-white focus:border-violet-500/50 outline-none transition-all shadow-inner"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black ml-2">Temporal Limit</label>
                    <div className="relative">
                      <Calendar className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                      <input 
                        type="date" 
                        value={newDiscount.expiryDate} 
                        onChange={e => setNewDiscount({ ...newDiscount, expiryDate: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-3xl py-6 pl-16 pr-8 text-sm font-black text-white focus:border-violet-500/50 outline-none transition-all shadow-inner uppercase tracking-widest"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 pt-10">
                  <button onClick={() => setIsAdding(false)} className="flex-1 px-10 py-6 text-[10px] tracking-[0.5em] font-black text-slate-500 hover:text-white transition-colors uppercase">Abortion</button>
                  <button 
                    onClick={handleSave} 
                    className="flex-1 bg-violet-600 text-white rounded-[2.5rem] py-6 text-[10px] tracking-[0.5em] font-black shadow-2xl hover:bg-violet-500 transition-all active:scale-95 flex items-center justify-center gap-4"
                  >
                    SAVE LOGIC <ShieldCheck size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

