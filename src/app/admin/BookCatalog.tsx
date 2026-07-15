import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  ChevronDown, 
  LayoutGrid, 
  List,
  Plus,
  Upload,
  ArrowUpAz,
  Settings2,
  Image as LucideImage,
  CheckSquare,
  Square,
  X,
  ArrowUpDown,
  Database,
  Filter,
  MoreVertical,
  ChevronRight,
  Eye,
  Edit3,
  ArrowDownRight,
  TrendingUp
} from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";

interface BookCatalogProps {
  onEdit: (book: any) => void;
  onAdd: () => void;
  refreshTrigger?: number;
}

export function BookCatalog({ onEdit, onAdd, refreshTrigger }: BookCatalogProps) {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeDropdown, setActiveDropdown] = useState<"status" | "categories" | "sort" | null>(null);
  const [openMenuBookId, setOpenMenuBookId] = useState<string | null>(null);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [sortField, setSortField] = useState<"title" | "price" | "inventory" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadBooks();
  }, [refreshTrigger]);

  async function loadBooks() {
    try {
      const data = await adminApi.getBooks();
      setBooks(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load archive");
    } finally {
      setLoading(false);
    }
  }

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    books.forEach(b => {
      const list = b.categories || b.genres || [];
      list.forEach((c: string) => {
        if (c) cats.add(c.trim());
      });
    });
    return ["All", ...Array.from(cats)];
  }, [books]);

  // ⚡ Bolt: Cache the search strings per item to prevent repeated allocations
  // and `.toLowerCase()` calls during active typing or filtering.
  // Measured impact: Reduces filter computation time by avoiding string
  // allocations on every re-render and keystroke.
  const haystackCache = useMemo(() => new WeakMap<any, string>(), []);

  // ⚡ Bolt: Wrap filtering logic in useMemo to prevent O(N) evaluations
  // blocking the main thread when unrelated UI state (like dropdowns) changes.
  // Measured impact: avoids O(N) redundant iteration and string allocations on every render.
  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();

    return books.filter(b => {
      let matchesSearch = true;

      if (q) {
        let haystack = haystackCache.get(b);
        if (!haystack) {
          haystack = [
            b.title || "",
            b.isbn || "",
            b.authorName || ""
          ].join(" ").toLowerCase();
          haystackCache.set(b, haystack);
        }
        matchesSearch = haystack.includes(q);
      }

      const bookCats = (b.categories || b.genres || []).map((c: string) => c.toUpperCase().trim());
      const matchesCategory = categoryFilter === "All" || bookCats.includes(categoryFilter.toUpperCase().trim());

      let matchesStatus = true;
      if (statusFilter === "Published") matchesStatus = b.status === "published" && b.stockLevel > 0;
      else if (statusFilter === "Sold Out") matchesStatus = b.stockLevel === 0;
      else if (statusFilter === "Drafts") matchesStatus = b.status === "draft";

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [books, search, categoryFilter, statusFilter, haystackCache]);

  // ⚡ Bolt: Wrap sorting logic in useMemo to prevent O(N log N) evaluations
  // on every render.
  const sortedAndFiltered = useMemo(() => {
    return [...filteredBooks].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "price") { aVal = a.retailPrice || 0; bVal = b.retailPrice || 0; }
      if (sortField === "inventory") { aVal = a.stockLevel || 0; bVal = b.stockLevel || 0; }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredBooks, sortField, sortOrder]);

  const handleBulkAction = async (action: "publish" | "draft" | "delete") => {
    if (selectedBooks.length === 0) return;
    
    if (action === "delete" && !window.confirm(`Are you sure you want to permanently delete ${selectedBooks.length} items?`)) return;

    const promise = Promise.all(selectedBooks.map(id => {
      if (action === "delete") return adminApi.deleteBook(id);
      return adminApi.updateBook(id, { status: action === "publish" ? "published" : "draft" });
    }));

    toast.promise(promise, {
      loading: 'Applying changes...',
      success: 'Bulk update successful!',
      error: 'Error applying updates.'
    });

    await promise;
    setSelectedBooks([]);
    loadBooks();
  };

  const toggleSelect = (id: string) => {
    setSelectedBooks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSort = (field: "title" | "price" | "inventory" | "createdAt") => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-12 pb-32">
      {/* Search & Filter Bar */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
         <div className="flex flex-wrap items-center gap-4 flex-1 w-full">
            <div className="relative flex-1 min-w-[300px] group">
               <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
               <input 
                 type="text"
                 placeholder="Search the archive by title, ISBN, or author..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full bg-white/[0.03] border border-white/5 rounded-3xl py-5 pl-14 pr-6 text-sm tracking-wide text-white focus:border-violet-500/50 focus:bg-white/[0.07] outline-none transition-all shadow-2xl backdrop-blur-md"
               />
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 xl:pb-0 scrollbar-none relative">
               {/* STATUS DROPDOWN */}
               <div className="relative">
                 <button 
                   onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
                   className={`bg-white/[0.03] border px-6 py-4 rounded-3xl text-[10px] font-black tracking-[0.2em] hover:text-white flex items-center gap-3 transition-all whitespace-nowrap backdrop-blur-md ${
                     activeDropdown === "status" || statusFilter !== "All"
                       ? "text-violet-400 border-violet-500/30"
                       : "text-slate-400 border-white/5 hover:border-white/10"
                   }`}
                 >
                    <Filter size={14} className={statusFilter !== "All" ? "text-violet-400" : "text-slate-500"} />
                    {statusFilter === "All" ? "STATUS" : `STATUS: ${statusFilter.toUpperCase()}`}
                    <ChevronDown size={14} className="text-slate-700" />
                 </button>
                 
                 <AnimatePresence>
                   {activeDropdown === "status" && (
                     <>
                       <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                       <motion.div
                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: 10, scale: 0.95 }}
                         className="absolute left-0 mt-3 w-56 rounded-2xl bg-[#0d0d10] border border-white/10 p-2 shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
                       >
                         {["All", "Published", "Sold Out", "Drafts"].map((val) => (
                           <button
                             key={val}
                             onClick={() => {
                               setStatusFilter(val);
                               setActiveDropdown(null);
                             }}
                             className={`w-full text-left px-4 py-3 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all ${
                               statusFilter === val 
                                 ? "bg-violet-600 text-white shadow-lg" 
                                 : "text-slate-400 hover:text-white hover:bg-white/5"
                             }`}
                           >
                             {val}
                           </button>
                         ))}
                       </motion.div>
                     </>
                   )}
                 </AnimatePresence>
               </div>

               {/* CATEGORIES DROPDOWN */}
               <div className="relative">
                 <button 
                   onClick={() => setActiveDropdown(activeDropdown === "categories" ? null : "categories")}
                   className={`bg-white/[0.03] border px-6 py-4 rounded-3xl text-[10px] font-black tracking-[0.2em] hover:text-white flex items-center gap-3 transition-all whitespace-nowrap backdrop-blur-md ${
                     activeDropdown === "categories" || categoryFilter !== "All"
                       ? "text-violet-400 border-violet-500/30"
                       : "text-slate-400 border-white/5 hover:border-white/10"
                   }`}
                 >
                    <List size={14} className={categoryFilter !== "All" ? "text-violet-400" : "text-slate-500"} />
                    {categoryFilter === "All" ? "CATEGORIES" : `CAT: ${categoryFilter.toUpperCase()}`}
                    <ChevronDown size={14} className="text-slate-700" />
                 </button>
                 
                 <AnimatePresence>
                   {activeDropdown === "categories" && (
                     <>
                       <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                       <motion.div
                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: 10, scale: 0.95 }}
                         className="absolute left-0 mt-3 w-64 max-h-72 overflow-y-auto rounded-2xl bg-[#0d0d10] border border-white/10 p-2 shadow-2xl backdrop-blur-xl z-50 custom-scrollbar"
                       >
                         {availableCategories.map((val) => (
                           <button
                             key={val}
                             onClick={() => {
                               setCategoryFilter(val);
                               setActiveDropdown(null);
                             }}
                             className={`w-full text-left px-4 py-3 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all ${
                               categoryFilter === val 
                                 ? "bg-violet-600 text-white shadow-lg" 
                                 : "text-slate-400 hover:text-white hover:bg-white/5"
                             }`}
                           >
                             {val}
                           </button>
                         ))}
                       </motion.div>
                     </>
                   )}
                 </AnimatePresence>
               </div>

               {/* SORT DROPDOWN */}
               <div className="relative">
                 <button 
                   onClick={() => setActiveDropdown(activeDropdown === "sort" ? null : "sort")}
                   className={`bg-white/[0.03] border px-6 py-4 rounded-3xl text-[10px] font-black tracking-[0.2em] hover:text-white flex items-center gap-3 transition-all whitespace-nowrap backdrop-blur-md ${
                     activeDropdown === "sort"
                       ? "text-violet-400 border-violet-500/30"
                       : "text-slate-400 border-white/5 hover:border-white/10"
                   }`}
                 >
                    <ArrowUpDown size={14} className="text-slate-500" />
                    SORT: {sortField === "createdAt" ? "DATE" : sortField.toUpperCase()} ({sortOrder.toUpperCase()})
                    <ChevronDown size={14} className="text-slate-700" />
                 </button>
                 
                 <AnimatePresence>
                   {activeDropdown === "sort" && (
                     <>
                       <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)} />
                       <motion.div
                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: 10, scale: 0.95 }}
                         className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#0d0d10] border border-white/10 p-2 shadow-2xl backdrop-blur-xl z-50 overflow-hidden"
                       >
                         {[
                           { label: "Title: A-Z", field: "title", order: "asc" },
                           { label: "Title: Z-A", field: "title", order: "desc" },
                           { label: "Price: Low to High", field: "price", order: "asc" },
                           { label: "Price: High to Low", field: "price", order: "desc" },
                           { label: "Stock: Low to High", field: "inventory", order: "asc" },
                           { label: "Stock: High to Low", field: "inventory", order: "desc" },
                           { label: "Created: Newest First", field: "createdAt", order: "desc" },
                           { label: "Created: Oldest First", field: "createdAt", order: "asc" }
                         ].map((opt) => {
                           const isSelected = sortField === opt.field && sortOrder === opt.order;
                           return (
                             <button
                               key={opt.label}
                               onClick={() => {
                                 setSortField(opt.field as any);
                                 setSortOrder(opt.order as any);
                                 setActiveDropdown(null);
                               }}
                               className={`w-full text-left px-4 py-3 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all ${
                                 isSelected 
                                   ? "bg-violet-600 text-white shadow-lg" 
                                   : "text-slate-400 hover:text-white hover:bg-white/5"
                               }`}
                             >
                               {opt.label}
                             </button>
                           );
                         })}
                       </motion.div>
                     </>
                   )}
                 </AnimatePresence>
               </div>
            </div>
         </div>

         <div className="flex bg-white/[0.03] p-2 rounded-[2rem] border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-2xl transition-all ${viewMode === 'list' ? 'bg-violet-600 shadow-xl text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <List size={22} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-violet-600 shadow-xl text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
               <LayoutGrid size={22} />
            </button>
         </div>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedBooks.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-violet-600 text-white px-10 py-6 rounded-[3rem] flex items-center gap-12 shadow-[0_25px_50px_-12px_rgba(124,58,237,0.5)] z-[100] border border-violet-400/30 backdrop-blur-3xl"
          >
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-violet-200">Bulk Selection</span>
                <span className="text-lg font-black tracking-tighter">{selectedBooks.length} TITLES SELECTED</span>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="flex items-center gap-3">
                <button onClick={() => handleBulkAction('publish')} className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all">Publish</button>
                <button onClick={() => handleBulkAction('draft')} className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all">Set Draft</button>
                <button onClick={() => handleBulkAction('delete')} className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-100 px-6 py-2.5 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all">Delete</button>
              </div>
            </div>
            <button onClick={() => setSelectedBooks([])} className="p-3 text-white/50 hover:text-white transition-colors bg-white/10 rounded-full border border-white/10">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      {loading ? (
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-8">
           <div className="relative">
              <div className="w-24 h-24 border-2 border-violet-500/5 border-t-violet-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-24 h-24 border-2 border-cyan-500/5 border-b-cyan-500 rounded-full animate-spin-slow"></div>
           </div>
           <p className="text-[10px] tracking-[0.6em] text-slate-500 uppercase font-black animate-pulse">Loading Titles...</p>
        </div>
      ) : sortedAndFiltered.length === 0 ? (
        <div className="h-[50vh] glass-card rounded-[4rem] border border-white/5 flex flex-col items-center justify-center space-y-6">
           <div className="p-10 bg-white/[0.02] rounded-full border border-white/5 text-slate-800">
              <Search size={64} strokeWidth={0.5} />
           </div>
           <div className="text-center">
             <p className="text-[10px] tracking-[0.5em] text-slate-500 uppercase font-black">No titles found</p>
             <div className="flex items-center justify-center gap-6 mt-8">
                <button onClick={() => setSearch("")} className="text-violet-400 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors">Clear selection</button>
                <div className="w-px h-6 bg-white/10" />
                <button 
                  onClick={onAdd}
                  className="flex items-center gap-3 bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl border border-violet-400/20"
                >
                  <Plus size={16} />
                  New Title
                </button>
             </div>
           </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
           {sortedAndFiltered.map((book, i) => {
             const isSoldOut = book.stockLevel <= 0;
             const isComingSoon = book.status === 'draft' || (book.scheduleDate && new Date(book.scheduleDate) > new Date());
             const isSelected = selectedBooks.includes(book.id);
             
             return (
               <motion.div 
                 key={book.id}
                 layout
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.03 }}
                 className="group relative"
               >
                 <div className="absolute top-4 right-4 z-20">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSelect(book.id); }}
                      className={`p-2.5 rounded-2xl backdrop-blur-3xl border transition-all duration-500 ${isSelected ? 'bg-violet-600 border-violet-400 text-white scale-110 shadow-[0_0_30px_rgba(124,58,237,0.4)]' : 'bg-black/60 border-white/10 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-black/80 hover:text-white'}`}
                    >
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                 </div>
                 
                 <div 
                   onClick={() => onEdit(book)} 
                   className="relative aspect-[3/4.5] bg-slate-900 overflow-hidden mb-6 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] border border-white/5 cursor-pointer transition-all duration-700 group-hover:-translate-y-2 group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] group-hover:border-violet-500/30"
                 >
                    {book.photos?.[0] ? (
                      <img src={book.photos[0].url} className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 group-hover:rotate-1 brightness-[0.85] group-hover:brightness-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-800 bg-gradient-to-br from-slate-900 to-black"><LucideImage size={48} strokeWidth={1} /></div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                    
                    {/* Status Badges */}
                    <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
                      {isSoldOut && (
                        <span className="bg-rose-500/90 backdrop-blur-md text-white text-[8px] font-black tracking-[0.2em] px-3 py-1.5 rounded-lg shadow-2xl border border-rose-400/50 uppercase">Depleted</span>
                      )}
                      {isComingSoon && !isSoldOut && (
                        <span className="bg-cyan-500/90 backdrop-blur-md text-white text-[8px] font-black tracking-[0.2em] px-3 py-1.5 rounded-lg shadow-2xl border border-cyan-400/50 uppercase">Upcoming</span>
                      )}
                      {book.status === 'published' && !isSoldOut && (
                        <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[8px] font-black tracking-[0.2em] px-3 py-1.5 rounded-lg shadow-2xl border border-emerald-400/50 uppercase">Active</span>
                      )}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                       <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-full shadow-2xl">
                          <Edit3 size={24} className="text-white" />
                       </div>
                    </div>
                 </div>
                 
                 <div className="space-y-2 px-2">
                    <h3 className="text-sm font-black tracking-tight text-white uppercase leading-tight group-hover:text-violet-400 transition-colors line-clamp-1">{book.title}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-500 tracking-wider">CA${book.retailPrice?.toFixed(2)}</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full ${isSoldOut ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <p className={`text-[9px] font-black uppercase tracking-widest ${isSoldOut ? 'text-rose-500' : 'text-slate-400'}`}>{book.stockLevel || 0} Units</p>
                      </div>
                    </div>
                 </div>
               </motion.div>
             );
           })}
        </div>
      ) : (
        <div className="bg-white/[0.01] rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm">
           <table className="w-full text-left border-collapse">
              <thead>
               <tr className="bg-white/[0.03] border-b border-white/5">
                 <th className="px-10 py-8 w-20">
                   <button onClick={() => setSelectedBooks(selectedBooks.length === sortedAndFiltered.length ? [] : sortedAndFiltered.map(b => b.id))} className="text-slate-600 hover:text-white transition-colors">
                     {selectedBooks.length > 0 && selectedBooks.length === sortedAndFiltered.length ? <CheckSquare size={20} /> : <Square size={20} />}
                   </button>
                 </th>
                 <th className="px-10 py-8 text-[10px] tracking-[0.3em] uppercase text-slate-500 font-black cursor-pointer group" onClick={() => handleSort("title")}>
                   <div className="flex items-center gap-3 group-hover:text-white transition-colors">Book Title <ArrowUpDown size={14} className="text-slate-700" /></div>
                 </th>
                 <th className="px-10 py-8 text-[10px] tracking-[0.3em] uppercase text-slate-500 font-black cursor-pointer group" onClick={() => handleSort("inventory")}>
                   <div className="flex items-center gap-3 group-hover:text-white transition-colors">Stock Level <ArrowUpDown size={14} className="text-slate-700" /></div>
                 </th>
                 <th className="px-10 py-8 text-[10px] tracking-[0.3em] uppercase text-slate-500 font-black cursor-pointer group" onClick={() => handleSort("price")}>
                   <div className="flex items-center gap-3 group-hover:text-white transition-colors">Retail Price <ArrowUpDown size={14} className="text-slate-700" /></div>
                 </th>
                 <th className="px-10 py-8 text-[10px] tracking-[0.3em] uppercase text-slate-500 font-black text-right">Operations</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {sortedAndFiltered.map((book) => {
                  const isSelected = selectedBooks.includes(book.id);
                  return (
                  <tr key={book.id} className={`transition-all group ${isSelected ? 'bg-violet-600/10' : 'hover:bg-white/[0.02]'}`}>
                    <td className="px-10 py-8" onClick={() => toggleSelect(book.id)}>
                      <button className={`transition-colors ${isSelected ? 'text-violet-400' : 'text-slate-700 hover:text-slate-500'}`}>
                         {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-10 py-8 cursor-pointer" onClick={() => onEdit(book)}>
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-24 bg-slate-900 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl border border-white/5 group-hover:border-violet-500/50 transition-all group-hover:scale-105 duration-500">
                          <img src={book.photos?.[0]?.url || ""} className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                        </div>
                        <div>
                          <p className="text-base font-black text-white uppercase tracking-tight group-hover:text-violet-400 transition-colors">{book.title}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <p className="text-[10px] text-slate-500 font-black tracking-[0.2em] border border-white/5 px-3 py-1 rounded-lg uppercase">REF: {book.id.slice(0, 8)}</p>
                            {book.status === 'published' && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                            {book.status === 'draft' && <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex items-center gap-4">
                         <div className="flex-1 h-2 w-32 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((book.stockLevel || 0) * 5, 100)}%` }}
                              className={`h-full rounded-full ${book.stockLevel <= 5 ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'}`}
                            />
                         </div>
                         <span className={`text-[11px] font-black tracking-widest uppercase ${book.stockLevel <= 5 ? "text-rose-400" : "text-slate-400"}`}>
                          {book.stockLevel || 0} Units
                         </span>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex flex-col">
                         <span className="text-base font-black text-white tracking-tighter">CA${book.retailPrice?.toFixed(2)}</span>
                         <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1">Market Value</span>
                       </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <div className="flex items-center justify-end gap-3">
                         <button onClick={() => onEdit(book)} className="p-4 text-slate-600 hover:text-violet-400 transition-all bg-white/[0.03] rounded-2xl border border-white/5 hover:border-violet-500/30 hover:shadow-xl" title="Edit details">
                            <Edit3 size={20} />
                         </button>
                         <div className="relative">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setOpenMenuBookId(openMenuBookId === book.id ? null : book.id);
                             }}
                             className={`p-4 transition-all rounded-2xl border ${
                               openMenuBookId === book.id
                                 ? "text-white bg-white/10 border-white/20"
                                 : "text-slate-600 hover:text-white bg-white/[0.03] border-white/5 hover:border-white/20"
                             }`}
                             title="Operations"
                           >
                              <MoreVertical size={20} />
                           </button>
                           
                           <AnimatePresence>
                             {openMenuBookId === book.id && (
                               <>
                                 <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuBookId(null); }} />
                                 <motion.div
                                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                   animate={{ opacity: 1, y: 0, scale: 1 }}
                                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                   className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#0d0d10] border border-white/10 p-2 shadow-2xl backdrop-blur-xl z-50 text-left overflow-hidden"
                                 >
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       onEdit(book);
                                       setOpenMenuBookId(null);
                                     }}
                                     className="w-full text-left px-4 py-3 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all text-slate-400 hover:text-white hover:bg-white/5"
                                   >
                                     Edit Details
                                   </button>
                                   <button
                                     onClick={async (e) => {
                                       e.stopPropagation();
                                       setOpenMenuBookId(null);
                                       try {
                                         await adminApi.duplicateBook(book.id);
                                         toast.success("Title duplicated");
                                         loadBooks();
                                       } catch (err) {
                                         toast.error("Failed to duplicate");
                                       }
                                     }}
                                     className="w-full text-left px-4 py-3 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all text-slate-400 hover:text-white hover:bg-white/5"
                                   >
                                     Duplicate
                                   </button>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       const bookSlug = book.slug || book.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                                       window.open(`/books/${bookSlug}`, "_blank");
                                       setOpenMenuBookId(null);
                                     }}
                                     className="w-full text-left px-4 py-3 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all text-slate-400 hover:text-white hover:bg-white/5"
                                   >
                                     View Listing
                                   </button>
                                   <div className="h-px bg-white/5 my-1" />
                                   <button
                                     onClick={async (e) => {
                                       e.stopPropagation();
                                       setOpenMenuBookId(null);
                                       if (window.confirm(`Are you sure you want to delete "${book.title}"?`)) {
                                         try {
                                           await adminApi.deleteBook(book.id);
                                           toast.success("Title deleted");
                                           loadBooks();
                                         } catch (err) {
                                           toast.error("Failed to delete");
                                         }
                                       }
                                     }}
                                     className="w-full text-left px-4 py-3 text-[10px] font-black tracking-widest uppercase rounded-xl transition-all text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                   >
                                     Delete
                                   </button>
                                 </motion.div>
                               </>
                             )}
                           </AnimatePresence>
                         </div>
                       </div>
                    </td>
                  </tr>
                )})}
             </tbody>
           </table>
        </div>
      )}
    </div>
  );
}

