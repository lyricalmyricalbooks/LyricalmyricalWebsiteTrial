import { useState, useEffect } from "react";
import { Plus, Trash2, Tag, Calendar, Percent, DollarSign, Truck, X, Save } from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "framer-motion";

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
      loadDiscounts();
    } catch (err) {
      alert("Error saving discount");
    }
  };

  const deleteDiscount = async (id: string) => {
    if (confirm("Delete this discount code?")) {
      await adminApi.deleteDiscount(id);
      loadDiscounts();
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-light tracking-tight">Discounts</h2>
          <p className="text-[10px] tracking-widest text-neutral-400 uppercase mt-1">Manage promotion codes & offers</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-full text-[10px] tracking-[.3em] font-bold hover:bg-neutral-800 transition-all shadow-lg"
        >
          <Plus size={14} /> ADD DISCOUNT
        </button>
      </header>

      {loading ? (
        <div className="py-20 text-center text-neutral-400 text-xs tracking-widest">LOADING DISCOUNT ARCHIVE...</div>
      ) : discounts.length === 0 && !isAdding ? (
        <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-neutral-100 rounded-3xl bg-neutral-50/50">
          <Tag size={48} strokeWidth={1} className="text-neutral-200 mb-6" />
          <h3 className="text-xl font-light text-neutral-400 mb-2">Create your first discount!</h3>
          <p className="text-[10px] tracking-widest text-neutral-400 uppercase mb-8">Add codes to entice new customers</p>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-black text-white px-8 py-3 rounded-full text-[10px] tracking-[.3em] font-bold hover:scale-105 transition-all shadow-xl"
          >
            ADD DISCOUNT
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {discounts.map((d) => (
            <div key={d.id} className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-neutral-50 rounded-2xl">
                  {d.type === 'percentage' && <Percent size={20} className="text-neutral-400" />}
                  {d.type === 'fixed' && <DollarSign size={20} className="text-neutral-400" />}
                  {d.type === 'freeship' && <Truck size={20} className="text-neutral-400" />}
                </div>
                <button 
                  onClick={() => deleteDiscount(d.id)}
                  className="p-2 opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h4 className="text-2xl font-bold tracking-tighter mb-1">{d.code}</h4>
              <p className="text-[10px] tracking-widest text-neutral-400 uppercase flex items-center gap-2">
                {d.type === 'percentage' ? `${d.value}% OFF ORDER` : d.type === 'fixed' ? `$${d.value} OFF ORDER` : 'FREE SHIPPING'}
              </p>
              
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-neutral-50">
                <span className={`text-[8px] font-bold tracking-[.2em] px-2 py-1 rounded ${d.isActive ? 'bg-green-50 text-green-600' : 'bg-neutral-100 text-neutral-400'}`}>
                  {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
                {d.expiryDate && (
                  <span className="text-[8px] tracking-widest text-neutral-400 flex items-center gap-1">
                    <Calendar size={10} /> {new Date(d.expiryDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal overlay */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-white/80 backdrop-blur-md" 
               onClick={() => setIsAdding(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white border border-neutral-100 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
            >
              <h3 className="text-2xl font-light mb-8">New Promotion</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] tracking-widest text-neutral-400 uppercase">Discount Code</label>
                  <input 
                    type="text" 
                    value={newDiscount.code} 
                    onChange={e => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SUMMER25"
                    className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-xl font-bold tracking-tighter focus:ring-1 focus:ring-black outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {['percentage', 'fixed', 'freeship'].map(t => (
                    <button
                      key={t}
                      onClick={() => setNewDiscount({ ...newDiscount, type: t })}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                        newDiscount.type === t ? 'bg-black text-white border-black' : 'border-neutral-100 hover:bg-neutral-50'
                      }`}
                    >
                      {t === 'percentage' && <Percent size={18} />}
                      {t === 'fixed' && <DollarSign size={18} />}
                      {t === 'freeship' && <Truck size={18} />}
                      <span className="text-[8px] font-bold tracking-widest uppercase">{t}</span>
                    </button>
                  ))}
                </div>

                {newDiscount.type !== 'freeship' && (
                  <div className="space-y-2">
                    <label className="text-[10px] tracking-widest text-neutral-400 uppercase">Discount Value</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">
                        {newDiscount.type === 'percentage' ? '%' : '$'}
                      </span>
                      <input 
                        type="number" 
                        value={newDiscount.value} 
                        onChange={e => setNewDiscount({ ...newDiscount, value: Number(e.target.value) })}
                        className="w-full bg-neutral-50 border-none rounded-2xl py-4 pl-12 pr-6 text-xl font-bold focus:ring-1 focus:ring-black outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] tracking-widest text-neutral-400 uppercase">Expiry Date (Optional)</label>
                  <input 
                    type="date" 
                    value={newDiscount.expiryDate} 
                    onChange={e => setNewDiscount({ ...newDiscount, expiryDate: e.target.value })}
                    className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-sm focus:ring-1 focus:ring-black outline-none"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button onClick={() => setIsAdding(false)} className="flex-1 px-8 py-4 text-[10px] tracking-[.3em] font-bold text-neutral-400 hover:text-black">CANCEL</button>
                  <button onClick={handleSave} className="flex-1 bg-black text-white rounded-full py-4 text-[10px] tracking-[.3em] font-bold shadow-xl hover:bg-neutral-800 transition-all">SAVE CODE</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
