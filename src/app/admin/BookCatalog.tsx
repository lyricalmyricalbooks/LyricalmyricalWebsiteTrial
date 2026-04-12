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
  Image as LucideImage
} from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "motion/react";

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
           {filteredBooks.map((book) => {
             const isSoldOut = book.stockLevel <= 0;
             const isComingSoon = book.status === 'draft' || (book.scheduleDate && new Date(book.scheduleDate) > new Date());
             
             return (
               <motion.div 
                 key={book.id}
                 layout
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="group cursor-pointer"
                 onClick={() => onEdit(book)}
               >
                 <div className="relative aspect-square bg-neutral-50 overflow-hidden mb-4 rounded-lg shadow-sm border border-neutral-100">
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
                 <th className="px-8 py-5 text-[10px] tracking-widest uppercase text-neutral-400 font-bold">Product Details</th>
                 <th className="px-8 py-5 text-[10px] tracking-widest uppercase text-neutral-400 font-bold">Inventory</th>
                 <th className="px-8 py-5 text-[10px] tracking-widest uppercase text-neutral-400 font-bold">Price</th>
                 <th className="px-8 py-5 text-[10px] tracking-widest uppercase text-neutral-400 font-bold text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-neutral-50">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-neutral-50/50 transition-colors group cursor-pointer" onClick={() => onEdit(book)}>
                    <td className="px-8 py-6">
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
                    <td className="px-8 py-6 text-right">
                       <button className="p-2 text-neutral-300 hover:text-black transition-colors"><ChevronDown size={14} /></button>
                    </td>
                  </tr>
                ))}
             </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
