import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit3, 
  Trash2,
  Package,
  CheckCircle2,
  Clock,
  Image as LucideImage
} from "lucide-react";
import { adminApi } from "./api";
import { motion } from "motion/react";

interface BookCatalogProps {
  onEdit: (book: any) => void;
  onAdd: () => void;
}

export function BookCatalog({ onEdit, onAdd }: BookCatalogProps) {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.isbn.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              placeholder="Search by title, ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 border-none rounded-xl py-2.5 pl-12 pr-4 text-xs focus:ring-1 focus:ring-black outline-none transition-all"
            />
          </div>
          <button className="p-2.5 bg-neutral-50 rounded-xl text-neutral-400 hover:text-black transition-colors">
            <Filter size={16} />
          </button>
        </div>
        
        <div className="text-[10px] tracking-widest text-neutral-400">
          SHOWING {filteredBooks.length} OF {books.length} TITLES
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50/50 border-b border-neutral-100">
              <th className="px-6 py-4 text-[10px] tracking-widest uppercase text-neutral-400 font-medium">Book Details</th>
              <th className="px-6 py-4 text-[10px] tracking-widest uppercase text-neutral-400 font-medium">Inventory</th>
              <th className="px-6 py-4 text-[10px] tracking-widest uppercase text-neutral-400 font-medium">Price</th>
              <th className="px-6 py-4 text-[10px] tracking-widest uppercase text-neutral-400 font-medium">Status</th>
              <th className="px-6 py-4 text-[10px] tracking-widest uppercase text-neutral-400 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-xs text-neutral-400 animate-pulse uppercase tracking-[.2em]">Synchronizing Catalog...</td></tr>
            ) : filteredBooks.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-xs text-neutral-400 uppercase tracking-[.2em]">No books found matching search</td></tr>
            ) : (
              filteredBooks.map((book) => (
                <tr key={book.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-14 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                        {book.photos?.[0] ? (
                          <img src={book.photos[0].url} className="w-full h-full object-cover grayscale" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300">
                            <LucideImage size={16} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-900">{book.title}</p>
                        <p className="text-[9px] text-neutral-400 tracking-wider mt-0.5">ISBN: {book.isbn || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Package size={12} className={book.stockLevel > 5 ? "text-neutral-300" : "text-amber-500"} />
                      <span className={`text-xs ${book.stockLevel <= 5 ? "text-amber-600 font-medium" : "text-neutral-600"}`}>
                        {book.stockLevel} units
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs font-medium text-neutral-900">${book.retailPrice?.toFixed(2)}</p>
                    <p className="text-[9px] text-neutral-400 tracking-wider mt-0.5">Cost: ${book.costPrice?.toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5">
                      {book.status === 'published' ? (
                        <>
                          <CheckCircle2 size={12} className="text-green-500" />
                          <span className="text-[10px] tracking-widest text-green-600 font-bold uppercase">Live</span>
                        </>
                      ) : (
                        <>
                          <Clock size={12} className="text-neutral-300" />
                          <span className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase">Draft</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(book)}
                        className="p-2 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-all"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
