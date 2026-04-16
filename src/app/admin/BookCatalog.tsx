import { useState, useEffect } from "react";
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
  ArrowUpDown
} from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface BookCatalogProps {
  onEdit: (book: any) => void;
  onAdd: () => void;
}

export function BookCatalog({ onEdit, onAdd }: BookCatalogProps) {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [sortField, setSortField] = useState<"title" | "price" | "inventory" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    try {
      const data = await adminApi.getBooks();
      setBooks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) || 
                          (b.isbn && b.isbn.toLowerCase().includes(search.toLowerCase()));
    
    if (statusFilter === "All") return matchesSearch;
    if (statusFilter === "Published") return matchesSearch && b.status === "published" && b.stockLevel > 0;
    if (statusFilter === "Sold Out") return matchesSearch && b.stockLevel === 0;
    if (statusFilter === "Drafts") return matchesSearch && b.status === "draft";
    return matchesSearch;
  });

  const sortedAndFiltered = [...filteredBooks].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (sortField === "price") { aVal = a.retailPrice || 0; bVal = b.retailPrice || 0; }
    if (sortField === "inventory") { aVal = a.stockLevel || 0; bVal = b.stockLevel || 0; }
    
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

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
    <div className="space-y-10">
      {/* Header Actions */}
      <header className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight uppercase">Products</h2>
        <div className="flex gap-3">
           <button className="bg-neutral-100 text-neutral-600 px-6 py-2 rounded-full text-[10px] font-bold tracking-widest hover:bg-neutral-200 transition-all flex items-center gap-2">
              <Upload size={12} /> IMPORT
           </button>
           <button className="bg-neutral-100 text-neutral-600 px-6 py-2 rounded-full text-[10px] font-bold tracking-widest hover:bg-neutral-200 transition-all flex items-center gap-2">
              <ArrowUpAz size={12} /> ARRANGE SHOP
           </button>
           <button 
             onClick={onAdd}
             className="bg-neutral-800 text-white px-6 py-2 rounded-full text-[10px] font-bold tracking-widest hover:bg-black transition-all flex items-center gap-2"
           >
              <Plus size={12} /> ADD PRODUCT
           </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-6">
         <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-sm w-full group">
               <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black transition-colors" />
               <input 
                 type="text"
                 placeholder="Search products..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full bg-white border border-neutral-100 rounded-xl py-3 pl-12 pr-4 text-xs tracking-wider focus:border-neutral-300 focus:ring-4 focus:ring-neutral-50 outline-none transition-all shadow-sm"
               />
            </div>
            <div className="flex items-center gap-2">
               <button className="bg-white border border-neutral-100 px-4 py-3 rounded-xl text-[10px] font-bold tracking-widest text-neutral-500 hover:bg-neutral-50 flex items-center gap-2 transition-all">
                  STATUS <ChevronDown size={12} />
               </button>
               <button className="bg-white border border-neutral-100 px-4 py-3 rounded-xl text-[10px] font-bold tracking-widest text-neutral-500 hover:bg-neutral-50 flex items-center gap-2 transition-all">
                  CATEGORIES <ChevronDown size={12} />
               </button>
               <button className="bg-white border border-neutral-100 px-4 py-3 rounded-xl text-[10px] font-bold tracking-widest text-neutral-500 hover:bg-neutral-50 flex items-center gap-2 transition-all">
                  EXTRA FILTERS <ChevronDown size={12} />
               </button>
            </div>
         </div>

         <div className="flex bg-neutral-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-black' : 'text-neutral-400'}`}
            >
               <List size={18} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-black' : 'text-neutral-400'}`}
            >
               <LayoutGrid size={18} />
            </button>
         </div>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedBooks.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="bg-black text-white px-6 py-4 rounded-xl flex items-center justify-between shadow-2xl sticky top-20 z-20"
          >
            <div className="flex items-center gap-6">
              <span className="text-[10px] tracking-[.2em] font-bold bg-white/20 px-3 py-1.5 rounded-lg">
                {selectedBooks.length} SELECTED
              </span>
              <button onClick={() => handleBulkAction('publish')} className="text-[10px] uppercase font-bold tracking-widest text-neutral-300 hover:text-white transition-colors">SET LIVE</button>
              <button onClick={() => handleBulkAction('draft')} className="text-[10px] uppercase font-bold tracking-widest text-neutral-300 hover:text-white transition-colors">SET DRAFT</button>
              <button onClick={() => handleBulkAction('delete')} className="text-[10px] uppercase font-bold tracking-widest text-red-400 hover:text-red-300 transition-colors">DELETE</button>
            </div>
            <button onClick={() => setSelectedBooks([])} className="p-2 text-neutral-400 hover:text-white transition-colors bg-white/10 rounded-full">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-4">
           <div className="w-8 h-8 border-2 border-neutral-200 border-t-black rounded-full animate-spin"></div>
           <p className="text-[10px] tracking-[.4em] text-neutral-400 uppercase">Synchronizing Archive...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="h-96 border-2 border-dashed border-neutral-100 rounded-[3rem] flex flex-col items-center justify-center space-y-4 bg-neutral-50/50">
           <Settings2 size={40} className="text-neutral-100" />
           <p className="text-[10px] tracking-[.4em] text-neutral-400 uppercase">No products found matching criteria</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-12 gap-x-8">
           {sortedAndFiltered.map((book) => {
             const isSoldOut = book.stockLevel <= 0;
             const isComingSoon = book.status === 'draft' || (book.scheduleDate && new Date(book.scheduleDate) > new Date());
             const isSelected = selectedBooks.includes(book.id);
             
             return (
               <motion.div 
                 key={book.id}
                 layout
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="group relative"
               >
                 <div className="absolute top-2 right-2 z-10">
                   <button 
                     onClick={(e) => { e.stopPropagation(); toggleSelect(book.id); }}
                     className={`p-1.5 rounded-md backdrop-blur-md transition-all ${isSelected ? 'bg-black text-white opacity-100' : 'bg-white/50 text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black'}`}
                   >
                     {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                   </button>
                 </div>
                 <div onClick={() => onEdit(book)} className="relative aspect-square bg-neutral-50 overflow-hidden mb-4 rounded-lg shadow-sm border border-neutral-100 cursor-pointer">
                    {book.photos?.[0] ? (
                      <img src={book.photos[0].url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-200"><LucideImage size={40} strokeWidth={1} /></div>
                    )}
                    
                    {/* Status Badges */}
                    <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                      {isSoldOut && (
                        <span className="bg-[#FDA4AF] text-white text-[8px] font-bold tracking-widest px-2 py-1 rounded shadow-sm">SOLD OUT</span>
                      )}
                      {isComingSoon && !isSoldOut && (
                        <span className="bg-[#60A5FA] text-white text-[8px] font-bold tracking-widest px-2 py-1 rounded shadow-sm">COMING SOON</span>
                      )}
                    </div>
                 </div>
                 
                 <div className="space-y-1">
                    <h3 className="text-[11px] font-bold tracking-tight uppercase leading-snug group-hover:text-neutral-600 transition-colors">{book.title}</h3>
                    <p className="text-[10px] font-semibold text-neutral-900">CA${book.retailPrice?.toFixed(2)}</p>
                    <p className="text-[9px] text-neutral-400 tracking-widest uppercase">{book.stockLevel || 0} IN STOCK</p>
                 </div>
               </motion.div>
             );
           })}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead>
               <tr className="bg-neutral-50/50 border-b border-neutral-100">
                 <th className="px-6 py-5 w-12">
                   <button onClick={() => setSelectedBooks(selectedBooks.length === sortedAndFiltered.length ? [] : sortedAndFiltered.map(b => b.id))} className="text-neutral-400 hover:text-black">
                     {selectedBooks.length > 0 && selectedBooks.length === sortedAndFiltered.length ? <CheckSquare size={16} /> : <Square size={16} />}
                   </button>
                 </th>
                 <th className="px-8 py-5 text-[10px] tracking-widest uppercase text-neutral-400 font-bold cursor-pointer hover:text-black" onClick={() => handleSort("title")}>
                   <div className="flex items-center gap-2">Product Details <ArrowUpDown size={12} /></div>
                 </th>
                 <th className="px-8 py-5 text-[10px] tracking-widest uppercase text-neutral-400 font-bold cursor-pointer hover:text-black" onClick={() => handleSort("inventory")}>
                   <div className="flex items-center gap-2">Inventory <ArrowUpDown size={12} /></div>
                 </th>
                 <th className="px-8 py-5 text-[10px] tracking-widest uppercase text-neutral-400 font-bold cursor-pointer hover:text-black" onClick={() => handleSort("price")}>
                   <div className="flex items-center gap-2">Price <ArrowUpDown size={12} /></div>
                 </th>
                 <th className="px-8 py-5 text-[10px] tracking-widest uppercase text-neutral-400 font-bold text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-neutral-50">
                {sortedAndFiltered.map((book) => {
                  const isSelected = selectedBooks.includes(book.id);
                  return (
                  <tr key={book.id} className={`transition-colors group ${isSelected ? 'bg-neutral-50/80' : 'hover:bg-neutral-50/50'}`}>
                    <td className="px-6 py-6" onClick={() => toggleSelect(book.id)}>
                      <button className={`text-neutral-400 hover:text-black ${isSelected ? 'text-black' : ''}`}>
                         {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-8 py-6 cursor-pointer" onClick={() => onEdit(book)}>
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-16 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                          <img src={book.photos?.[0]?.url || ""} className="w-full h-full object-cover grayscale" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 uppercase tracking-tight">{book.title}</p>
                          <p className="text-[9px] text-neutral-400 tracking-widest mt-1">ID: {book.id.toUpperCase().slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`text-[10px] font-bold tracking-widest uppercase ${book.stockLevel <= 5 ? "text-amber-500" : "text-neutral-400"}`}>
                        {book.stockLevel || 0} UNITS
                       </span>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-neutral-900">
                       CA${book.retailPrice?.toFixed(2)}
                    </td>
                    <td className="px-8 py-6 cursor-pointer text-right" onClick={() => onEdit(book)}>
                       <button className="p-2 text-neutral-300 hover:text-black transition-colors"><ChevronDown size={14} /></button>
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
