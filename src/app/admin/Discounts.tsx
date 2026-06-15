import { useState, useEffect } from "react";
import {
  Plus, Trash2, Tag, Calendar, Percent, DollarSign, Truck, X, Save,
  Ticket, ShieldCheck, AlertCircle, ToggleLeft, ToggleRight, Copy,
  Users, ShoppingCart, Edit3, ChevronDown, ChevronUp, Hash, BarChart2,
  Clock, Infinity as InfinityIcon, RefreshCw, BookOpen
} from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { CATEGORIES } from "../features/site/constants";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  return n != null ? `$${Number(n).toFixed(2)}` : "—";
}

const TYPE_OPTIONS = [
  { id: "percentage", icon: Percent,    label: "Percentage",     desc: "e.g. 20% off" },
  { id: "fixed",      icon: DollarSign, label: "Fixed amount",   desc: "e.g. $10 off" },
  { id: "freeship",   icon: Truck,      label: "Free shipping",  desc: "Waive shipping cost" },
  { id: "bogo",       icon: ShoppingCart, label: "BOGO",        desc: "Buy X Get Y" },
  { id: "tiered",     icon: BarChart2,  label: "Tiered",         desc: "Tiered spend" },
];

const APPLIES_OPTIONS = [
  { id: "all",     label: "All products" },
  { id: "catalog", label: "Entire catalog" },
];

const EMPTY: any = {
  code: "",
  type: "percentage",
  value: 10,
  isActive: true,
  expiryDate: "",
  minOrderAmount: "",
  minQuantity: "",
  usageLimit: "",
  onePerCustomer: false,
  appliesTo: "all",
  selectedCategories: [],
  selectedProducts: [],
  allowedEmailDomains: "",
  allowedCustomerEmails: "",
  description: "",
  buyQuantity: 1,
  getQuantity: 1,
  getDiscountValue: 100,
  tiers: [{ minSpend: 0, value: 0, type: "percentage" }],
};

// ─── Stat chip ──────────────────────────────────────────────────────────────

function StatChip({ icon: Icon, label, value, accent = false }: any) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black tracking-widest uppercase ${
      accent ? "border-violet-500/30 bg-violet-500/10 text-violet-400" : "border-white/5 bg-white/[0.02] text-slate-500"
    }`}>
      <Icon size={10} />
      <span>{label}: {value}</span>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

function DiscountCard({ d, onDelete, onToggle, onEdit }: {
  d: any;
  onDelete: () => void;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const Icon = TYPE_OPTIONS.find(t => t.id === d.type)?.icon ?? Tag;
  const isExpired = d.expiryDate && d.expiryDate < new Date().toISOString().split("T")[0];
  const usedUp = d.usageLimit && (d.usageCount || 0) >= d.usageLimit;
  const effective = d.isActive && !isExpired && !usedUp;

  const copyCode = () => {
    navigator.clipboard.writeText(d.code);
    toast.success("Code copied");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:border-violet-500/20 transition-all duration-500 relative group overflow-hidden flex flex-col gap-6"
    >
      {/* glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-violet-600/5 blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* header row */}
      <div className="flex items-start justify-between gap-3">
        <div className={`p-4 rounded-2xl border transition-all duration-500 ${
          effective ? "bg-violet-600/10 border-violet-500/20 text-violet-400" : "bg-white/[0.03] border-white/5 text-slate-600"
        }`}>
          <Icon size={20} />
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} title="Edit" className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-slate-600 hover:text-white hover:border-white/20 transition-all">
            <Edit3 size={14} />
          </button>
          <button onClick={copyCode} title="Copy code" className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-slate-600 hover:text-violet-400 hover:border-violet-500/30 transition-all">
            <Copy size={14} />
          </button>
          <button onClick={onDelete} title="Delete" className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-slate-600 hover:text-rose-500 hover:border-rose-500/20 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* code + description */}
      <div>
        <h4 className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none mb-1">{d.code}</h4>
        {d.description && <p className="text-[10px] text-slate-500 tracking-wide mt-1 line-clamp-2">{d.description}</p>}
        {d.type === "tiered" && d.tiers && (
          <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-2 space-y-1 bg-black/25 p-3 rounded-xl border border-white/5">
            {d.tiers.map((t: any, idx: number) => (
              <div key={idx} className="flex justify-between">
                <span>Spend {fmt(t.minSpend)}:</span>
                <span className="font-bold text-violet-400">get {t.type === "percentage" ? `${t.value}%` : fmt(t.value)} off</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* value badge */}
      <div className="flex flex-wrap gap-2">
        {d.type === "percentage" && (
          <span className="px-3 py-1 rounded-full bg-white/5 text-white text-[10px] font-black tracking-widest uppercase">
            {d.value}% off
          </span>
        )}
        {d.type === "fixed" && (
          <span className="px-3 py-1 rounded-full bg-white/5 text-white text-[10px] font-black tracking-widest uppercase">
            {fmt(d.value)} off
          </span>
        )}
        {d.type === "freeship" && (
          <span className="px-3 py-1 rounded-full bg-white/5 text-white text-[10px] font-black tracking-widest uppercase">Free shipping</span>
        )}
        {d.type === "bogo" && (
          <span className="px-3 py-1 rounded-full bg-violet-600/20 border border-violet-500/20 text-violet-400 text-[10px] font-black tracking-widest uppercase">
            BOGO: Buy {d.buyQuantity || 1} Get {d.getQuantity || 1} ({d.getDiscountValue || 100}% off)
          </span>
        )}
        {d.type === "tiered" && (
          <span className="px-3 py-1 rounded-full bg-violet-600/20 border border-violet-500/20 text-violet-400 text-[10px] font-black tracking-widest uppercase">
            Tiered ({d.tiers?.length || 0} Tiers)
          </span>
        )}
        {d.minOrderAmount && (
          <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 text-slate-500 text-[9px] font-black tracking-widest uppercase">
            Min {fmt(d.minOrderAmount)}
          </span>
        )}
        {d.minQuantity && (
          <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 text-slate-500 text-[9px] font-black tracking-widest uppercase">
            Min qty: {d.minQuantity}
          </span>
        )}
        {d.appliesTo === "categories" && d.selectedCategories?.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[9px] font-black tracking-widest uppercase">
            {d.selectedCategories.join(", ")} Only
          </span>
        )}
        {d.appliesTo === "products" && d.selectedProducts?.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[9px] font-black tracking-widest uppercase">
            {d.selectedProducts.length} Books Only
          </span>
        )}
        {d.onePerCustomer && (
          <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 text-slate-500 text-[9px] font-black tracking-widest uppercase">
            1× / customer
          </span>
        )}
        {(d.allowedEmailDomains || d.allowedCustomerEmails) && (
          <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black tracking-widest uppercase">
            Restricted Email
          </span>
        )}
      </div>

      {/* stats row */}
      <div className="grid grid-cols-2 gap-2">
        <StatChip icon={Hash} label="Used" value={d.usageCount || 0} accent={(d.usageCount || 0) > 0} />
        <StatChip
          icon={d.usageLimit ? ShoppingCart : InfinityIcon}
          label="Limit"
          value={d.usageLimit ?? "∞"}
        />
      </div>

      {/* footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-[9px] font-black tracking-widest uppercase transition-colors"
        >
          {d.isActive
            ? <ToggleRight size={18} className="text-emerald-500" />
            : <ToggleLeft size={18} className="text-slate-600" />}
          <span className={d.isActive ? "text-emerald-500" : "text-slate-600"}>
            {isExpired ? "Expired" : usedUp ? "Exhausted" : d.isActive ? "Active" : "Paused"}
          </span>
        </button>
        {d.expiryDate && (
          <div className="flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase text-slate-500">
            <Clock size={10} />
            {new Date(d.expiryDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function DiscountModal({ initial, onClose, onSave }: {
  initial?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<any>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(
    !!(initial?.minOrderAmount || initial?.minQuantity || initial?.usageLimit || initial?.onePerCustomer || initial?.allowedEmailDomains || initial?.allowedCustomerEmails || initial?.description)
  );

  useEffect(() => {
    async function loadBooks() {
      try {
        const list = await adminApi.getBooks(100);
        setBooks(list);
      } catch (err) {
        console.error("Failed to load books", err);
      }
    }
    loadBooks();
  }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        code: form.code.toUpperCase().trim(),
        value: form.type === "freeship" ? 0 : Number(form.value) || 0,
        minOrderAmount: form.minOrderAmount !== "" ? Number(form.minOrderAmount) : null,
        minQuantity: form.minQuantity !== "" ? Number(form.minQuantity) : null,
        usageLimit: form.usageLimit !== "" ? Number(form.usageLimit) : null,
        selectedCategories: form.appliesTo === "categories" ? (form.selectedCategories || []) : [],
        selectedProducts: form.appliesTo === "products" ? (form.selectedProducts || []) : [],
        allowedEmailDomains: form.allowedEmailDomains || "",
        allowedCustomerEmails: form.allowedCustomerEmails || "",
        buyQuantity: form.type === "bogo" ? (Number(form.buyQuantity) || 1) : null,
        getQuantity: form.type === "bogo" ? (Number(form.getQuantity) || 1) : null,
        getDiscountValue: form.type === "bogo" ? (Number(form.getDiscountValue) ?? 100) : null,
        tiers: form.type === "tiered" ? (form.tiers || []) : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-3xl"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 16 }}
        className="relative bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

        {/* Header */}
        <div className="flex justify-between items-start p-10 pb-0 flex-shrink-0">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">
              {isEdit ? "Edit Discount" : "New Discount Code"}
            </h3>
            <p className="text-[10px] tracking-[0.4em] text-slate-500 uppercase font-black mt-1">
              {isEdit ? "Update promotional metadata" : "Configure a new incentive"}
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-10 pt-8 space-y-8">
          {/* Code */}
          <div className="space-y-3">
            <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Code</label>
            <input
              type="text"
              value={form.code}
              onChange={e => set("code", e.target.value.toUpperCase())}
              placeholder="E.G. SUMMER25"
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-5 px-8 text-2xl font-black tracking-tighter uppercase italic text-white focus:border-violet-500/50 outline-none transition-all placeholder:text-slate-800"
            />
          </div>

          {/* Description */}
          <div className="space-y-3">
            <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Description <span className="text-slate-700">(internal)</span></label>
            <input
              type="text"
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="e.g. Summer sale 2026"
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm text-white/80 focus:border-violet-500/50 outline-none transition-all placeholder:text-slate-700"
            />
          </div>

          {/* Applies To / Targeting */}
          <div className="space-y-4">
            <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Applies to</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: "all", label: "All Products" },
                { id: "categories", label: "Categories" },
                { id: "products", label: "Specific Books" }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => set("appliesTo", opt.id)}
                  className={`py-3 px-4 rounded-xl border text-[9px] font-black tracking-widest uppercase transition-all ${
                    form.appliesTo === opt.id
                      ? "bg-violet-600 text-white border-violet-400 shadow-[0_5px_15px_rgba(124,58,237,0.2)]"
                      : "bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/5 hover:border-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* If applies to categories */}
            {form.appliesTo === "categories" && (
              <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <p className="text-[9px] tracking-wider font-black uppercase text-slate-500 mb-2">Select Categories</p>
                <div className="flex flex-wrap gap-3">
                  {CATEGORIES.map(cat => {
                    const selected = form.selectedCategories?.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const current = form.selectedCategories || [];
                          if (current.includes(cat)) {
                            set("selectedCategories", current.filter((c: string) => c !== cat));
                          } else {
                            set("selectedCategories", [...current, cat]);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl border text-[9px] font-black tracking-widest uppercase transition-all ${
                          selected
                            ? "bg-violet-500/20 border-violet-500/50 text-violet-400"
                            : "bg-black/30 border-white/5 text-slate-500 hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* If applies to products */}
            {form.appliesTo === "products" && (
              <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <p className="text-[9px] tracking-wider font-black uppercase text-slate-500 mb-2">Select Books</p>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {books.length === 0 ? (
                    <p className="text-[9px] text-slate-600 uppercase tracking-widest font-black py-2">Loading catalog...</p>
                  ) : (
                    books.map(book => {
                      const selected = form.selectedProducts?.includes(book.id);
                      return (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => {
                            const current = form.selectedProducts || [];
                            if (current.includes(book.id)) {
                              set("selectedProducts", current.filter((id: string) => id !== book.id));
                            } else {
                              set("selectedProducts", [...current, book.id]);
                            }
                          }}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                            selected
                              ? "bg-violet-500/10 border-violet-500/35 text-white"
                              : "bg-black/20 border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                          }`}
                        >
                          <span className="text-xs font-bold uppercase tracking-tight">{book.title}</span>
                          <span className={`text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${selected ? "bg-violet-500 text-white" : "bg-white/5 text-slate-500"}`}>
                            {selected ? "SELECTED" : "SELECT"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Type */}
          <div className="space-y-3">
            <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Discount type</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => set("type", t.id)}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 text-center ${
                    form.type === t.id
                      ? "bg-violet-600 text-white border-violet-400 shadow-[0_10px_30px_rgba(124,58,237,0.3)]"
                      : "bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/5 hover:border-white/10"
                  }`}
                >
                  <t.icon size={18} strokeWidth={form.type === t.id ? 2.5 : 1.5} />
                  <div>
                    <p className="text-[8px] font-black tracking-[0.2em] uppercase">{t.label}</p>
                    <p className="text-[7px] opacity-70 mt-0.5 leading-none">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* BOGO Inputs */}
          {form.type === "bogo" && (
            <div className="grid grid-cols-3 gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div className="space-y-2">
                <label className="text-[9px] tracking-wider text-slate-500 uppercase font-black">Buy Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={form.buyQuantity ?? 1}
                  onChange={e => set("buyQuantity", parseInt(e.target.value) || 1)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 px-4 text-sm font-bold text-white focus:border-violet-500/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] tracking-wider text-slate-500 uppercase font-black">Get Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={form.getQuantity ?? 1}
                  onChange={e => set("getQuantity", parseInt(e.target.value) || 1)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 px-4 text-sm font-bold text-white focus:border-violet-500/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] tracking-wider text-slate-500 uppercase font-black">Discount Value (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.getDiscountValue ?? 100}
                  onChange={e => set("getDiscountValue", parseInt(e.target.value) || 0)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 px-4 text-sm font-bold text-white focus:border-violet-500/50 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Tiered Inputs */}
          {form.type === "tiered" && (
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[9px] tracking-wider text-slate-500 uppercase font-black">Tiers Configuration</label>
                {((form.tiers || []).length < 3) && (
                  <button
                    type="button"
                    onClick={() => {
                      const current = form.tiers || [];
                      set("tiers", [...current, { minSpend: 0, value: 0, type: "percentage" }]);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-[8px] font-black tracking-wider uppercase text-white transition-all"
                  >
                    <Plus size={10} /> Add Tier
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {(form.tiers || []).map((tier: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-end bg-black/20 p-3.5 rounded-xl border border-white/5 relative">
                    <div className="flex-1 space-y-1">
                      <label className="text-[8px] tracking-wider text-slate-500 uppercase font-black">Min Spend (CA$)</label>
                      <input
                        type="number"
                        min="0"
                        value={tier.minSpend}
                        onChange={e => {
                          const newTiers = [...form.tiers];
                          newTiers[idx].minSpend = parseFloat(e.target.value) || 0;
                          set("tiers", newTiers);
                        }}
                        className="w-full bg-[#1A1A1B] border border-white/5 rounded-lg py-2 px-3 text-xs font-bold text-white focus:border-violet-500/50 outline-none transition-all"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[8px] tracking-wider text-slate-500 uppercase font-black">Discount Value</label>
                      <input
                        type="number"
                        min="0"
                        value={tier.value}
                        onChange={e => {
                          const newTiers = [...form.tiers];
                          newTiers[idx].value = parseFloat(e.target.value) || 0;
                          set("tiers", newTiers);
                        }}
                        className="w-full bg-[#1A1A1B] border border-white/5 rounded-lg py-2 px-3 text-xs font-bold text-white focus:border-violet-500/50 outline-none transition-all"
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-[8px] tracking-wider text-slate-500 uppercase font-black">Type</label>
                      <select
                        value={tier.type}
                        onChange={e => {
                          const newTiers = [...form.tiers];
                          newTiers[idx].type = e.target.value;
                          set("tiers", newTiers);
                        }}
                        className="w-full bg-[#1A1A1B] border border-white/5 rounded-lg py-2 px-2 text-xs font-bold text-white focus:border-violet-500/50 outline-none transition-all"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed ($)</option>
                      </select>
                    </div>
                    {(form.tiers.length > 1) && (
                      <button
                        type="button"
                        onClick={() => {
                          set("tiers", form.tiers.filter((_: any, i: number) => i !== idx));
                        }}
                        className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-rose-500 hover:border-rose-500/20 transition-all"
                        title="Remove Tier"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Value + Expiry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {form.type !== "freeship" && form.type !== "bogo" && form.type !== "tiered" && (
              <div className="space-y-3">
                <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">
                  {form.type === "percentage" ? "Percentage off" : "Amount off (CA$)"}
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">
                    {form.type === "percentage" ? "%" : "$"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={form.type === "percentage" ? 100 : undefined}
                    value={form.value}
                    onChange={e => set("value", e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xl font-black text-white focus:border-violet-500/50 outline-none transition-all"
                  />
                </div>
              </div>
            )}
            <div className="space-y-3">
              <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Expiry date <span className="text-slate-700">(optional)</span></label>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="date"
                  value={form.expiryDate || ""}
                  onChange={e => set("expiryDate", e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white focus:border-violet-500/50 outline-none transition-all tracking-widest"
                />
              </div>
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] uppercase text-slate-500 hover:text-white transition-colors w-full"
          >
            <div className="flex-1 h-px bg-white/5" />
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>{showAdvanced ? "Hide" : "Show"} advanced options</span>
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <div className="flex-1 h-px bg-white/5" />
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Min order */}
                  <div className="space-y-3">
                    <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Minimum order (CA$)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black">$</span>
                      <input
                        type="number" min="0"
                        value={form.minOrderAmount}
                        onChange={e => set("minOrderAmount", e.target.value)}
                        placeholder="No minimum"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-10 pr-6 text-sm font-bold text-white focus:border-violet-500/50 outline-none transition-all placeholder:text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Min quantity */}
                  <div className="space-y-3">
                    <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Min quantity</label>
                    <div className="relative">
                      <ShoppingCart className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                      <input
                        type="number" min="0"
                        value={form.minQuantity}
                        onChange={e => set("minQuantity", e.target.value)}
                        placeholder="No minimum"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-10 pr-6 text-sm font-bold text-white focus:border-violet-500/50 outline-none transition-all placeholder:text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Usage limit */}
                  <div className="space-y-3">
                    <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Total usage limit</label>
                    <div className="relative">
                      <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                      <input
                        type="number" min="1"
                        value={form.usageLimit}
                        onChange={e => set("usageLimit", e.target.value)}
                        placeholder="Unlimited"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-10 pr-6 text-sm font-bold text-white focus:border-violet-500/50 outline-none transition-all placeholder:text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-4">
                  <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Restrictions</label>
                  <button
                    onClick={() => set("onePerCustomer", !form.onePerCustomer)}
                    className="flex items-center justify-between w-full p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <Users size={16} className="text-slate-500 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-black tracking-[0.2em] uppercase text-white">One use per customer</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Each email can redeem this code only once</p>
                      </div>
                    </div>
                    {form.onePerCustomer
                      ? <ToggleRight size={22} className="text-violet-400 flex-shrink-0" />
                      : <ToggleLeft size={22} className="text-slate-600 flex-shrink-0" />}
                  </button>
                  <button
                    onClick={() => set("isActive", !form.isActive)}
                    className="flex items-center justify-between w-full p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <ShieldCheck size={16} className="text-slate-500 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-black tracking-[0.2em] uppercase text-white">Code is active</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Disable to pause without deleting</p>
                      </div>
                    </div>
                    {form.isActive
                      ? <ToggleRight size={22} className="text-emerald-400 flex-shrink-0" />
                      : <ToggleLeft size={22} className="text-slate-600 flex-shrink-0" />}
                  </button>
                </div>

                {/* Email / Domain Restrictions */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Email Restrictions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white">Allowed Email Domains</p>
                        <p className="text-[8px] text-slate-500 mt-0.5">Comma separated, e.g. .edu, gmail.com</p>
                      </div>
                      <input
                        type="text"
                        value={form.allowedEmailDomains || ""}
                        onChange={e => set("allowedEmailDomains", e.target.value)}
                        placeholder="e.g. .edu, student.ca"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm text-white/80 focus:border-violet-500/50 outline-none transition-all placeholder:text-slate-700 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white">Allowed Customer Emails</p>
                        <p className="text-[8px] text-slate-500 mt-0.5">Comma separated list of specific VIP emails</p>
                      </div>
                      <input
                        type="text"
                        value={form.allowedCustomerEmails || ""}
                        onChange={e => set("allowedCustomerEmails", e.target.value)}
                        placeholder="e.g. vip@gmail.com, collector@mail.ca"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm text-white/80 focus:border-violet-500/50 outline-none transition-all placeholder:text-slate-700 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex gap-4 p-10 pt-0 flex-shrink-0 border-t border-white/5 mt-auto">
          <button onClick={onClose} className="px-8 py-4 text-[10px] tracking-[0.5em] font-black text-slate-500 hover:text-white transition-colors uppercase">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-violet-600 text-white rounded-2xl py-4 text-[10px] tracking-[0.5em] font-black shadow-xl hover:bg-violet-500 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? "SAVE CHANGES" : "CREATE CODE"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Discounts() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "paused">("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setDiscounts(await adminApi.getDiscounts());
    } catch {
      toast.error("Failed to load discounts");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (data: any) => {
    try {
      if (data.id) {
        await adminApi.updateDiscount(data.id, data);
        toast.success("Discount updated");
      } else {
        await adminApi.saveDiscount(data);
        toast.success("Discount code created");
      }
      setModalOpen(false);
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discount code?")) return;
    try {
      await adminApi.deleteDiscount(id);
      toast.success("Discount deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleToggle = async (d: any) => {
    try {
      await adminApi.updateDiscount(d.id, { isActive: !d.isActive });
      toast.success(d.isActive ? "Code paused" : "Code activated");
      load();
    } catch {
      toast.error("Toggle failed");
    }
  };

  const now = new Date().toISOString().split("T")[0];
  const filtered = discounts.filter(d => {
    if (filter === "active") return d.isActive && (!d.expiryDate || d.expiryDate >= now) && !(d.usageLimit && (d.usageCount || 0) >= d.usageLimit);
    if (filter === "expired") return d.expiryDate && d.expiryDate < now;
    if (filter === "paused") return !d.isActive;
    return true;
  });

  const totalRedemptions = discounts.reduce((acc, d) => acc + (d.usageCount || 0), 0);
  const activeCodes = discounts.filter(d => d.isActive && (!d.expiryDate || d.expiryDate >= now)).length;

  return (
    <div className="space-y-10 pb-32">
      {/* Header */}
      <header className="flex flex-wrap gap-6 justify-between items-start">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic">Discounts</h2>
          <p className="text-[10px] tracking-[0.4em] text-slate-500 uppercase mt-1 font-black flex items-center gap-2">
            <Ticket size={11} className="text-violet-400" /> Promotional code management
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="bg-violet-600 text-white px-8 py-4 rounded-2xl text-[10px] tracking-[0.4em] font-black hover:bg-violet-500 transition-all shadow-[0_12px_30px_rgba(124,58,237,0.3)] active:scale-95 flex items-center gap-3"
        >
          <Plus size={15} /> NEW CODE
        </button>
      </header>

      {/* Stats bar */}
      {discounts.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <StatChip icon={Tag} label="Total codes" value={discounts.length} />
          <StatChip icon={ShieldCheck} label="Active" value={activeCodes} accent={activeCodes > 0} />
          <StatChip icon={BarChart2} label="Total redemptions" value={totalRedemptions} accent={totalRedemptions > 0} />
        </div>
      )}

      {/* Filter tabs */}
      {discounts.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "expired", "paused"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-[9px] font-black tracking-[0.3em] uppercase transition-all border ${
                filter === f
                  ? "bg-white text-black border-white"
                  : "bg-white/[0.03] text-slate-500 border-white/5 hover:border-white/15 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center gap-6">
          <div className="w-12 h-12 border-2 border-violet-500/10 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">Loading…</p>
        </div>
      ) : discounts.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center bg-white/[0.01] rounded-[3rem] border border-white/5">
          <Tag size={52} strokeWidth={0.5} className="text-slate-800 mb-8" />
          <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter italic">No discount codes yet</h3>
          <p className="text-[10px] tracking-[0.3em] text-slate-500 uppercase mb-10 font-black">Create your first promotional code</p>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="bg-white/5 text-white border border-white/10 px-10 py-4 rounded-2xl text-[10px] tracking-[0.4em] font-black hover:bg-white/10 transition-all active:scale-95"
          >
            CREATE FIRST CODE
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-20 text-[10px] tracking-[0.4em] text-slate-600 uppercase font-black">No codes match this filter</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(d => (
            <DiscountCard
              key={d.id}
              d={d}
              onDelete={() => handleDelete(d.id)}
              onToggle={() => handleToggle(d)}
              onEdit={() => { setEditing(d); setModalOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <DiscountModal
            initial={editing}
            onClose={() => { setModalOpen(false); setEditing(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
