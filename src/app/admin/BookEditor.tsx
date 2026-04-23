import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Save, 
  ArrowLeft, 
  Image as LucideImage, 
  Upload, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Plus,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { adminApi } from "./api";
import { CATEGORIES } from "../features/site/constants";
import { Book, Variant } from "../features/site/types";

function SortablePhoto({ photo, index, onRemove }: { photo: any; index: number; onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className="relative aspect-[3/4] bg-white/[0.02] rounded-[2rem] overflow-hidden group border border-white/5 cursor-grab active:cursor-grabbing hover:border-violet-500/30 transition-all duration-500 shadow-xl shadow-black/40"
    >
      <img src={photo.url} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-6">
        <button 
          type="button" 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }} 
          className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[10px] font-black tracking-widest backdrop-blur-md border border-red-500/20"
        >
          REMOVE IMAGE
        </button>
      </div>
      <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md text-[8px] text-white/60 rounded-full font-black tracking-[0.2em] border border-white/5">
        ASSET {index + 1}
      </div>
    </div>
  );
}

interface BookEditorProps {
  book: Book | null;
  onClose: () => void;
  onSave: () => void;
}

export function BookEditor({ book, onClose, onSave }: BookEditorProps) {
  const [formData, setFormData] = useState<any>({
    title: "",
    subtitle: "",
    description: "",
    isbn: "",
    sku: "",
    retailPrice: 0,
    costPrice: 0,
    stockLevel: 0,
    format: "Paperback",
    dimensions: "",
    weight: "",
    language: "English",
    status: "draft",
    shippingProfileId: "",
    authorId: "",
    isFeatured: false,
    photos: [],
    slug: "",
    isOnSale: false,
    salePrice: 0,
    categories: [],
    variants: [],
    scheduleDate: "",
  });

  const [shippingProfiles, setShippingProfiles] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoInput, setPhotoInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialData, setInitialData] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFormData((prev: any) => {
        const oldIndex = prev.photos.findIndex((p: any) => p.id === active.id);
        const newIndex = prev.photos.findIndex((p: any) => p.id === over.id);
        return {
          ...prev,
          photos: arrayMove(prev.photos, oldIndex, newIndex),
        };
      });
    }
  }

  useEffect(() => {
    loadMetadata();
    if (book) {
      const defaults = {
        title: "",
        subtitle: "",
        description: "",
        isbn: "",
        sku: "",
        retailPrice: 0,
        costPrice: 0,
        stockLevel: 0,
        format: "Paperback",
        dimensions: "",
        weight: "",
        language: "English",
        status: "draft",
        shippingProfileId: "",
        authorId: "",
        isFeatured: false,
        slug: "",
        isOnSale: false,
        salePrice: 0,
        scheduleDate: "",
      };

      const dataToLoad = {
        ...defaults,
        ...book,
        photos: Array.isArray(book.photos) ? book.photos : [],
        variants: Array.isArray(book.variants) ? book.variants : [],
        categories: Array.isArray(book.categories) ? book.categories : [],
      };
      setFormData(dataToLoad);
      setInitialData(JSON.parse(JSON.stringify(dataToLoad)));
    } else {
      // Set initial data for new books to current empty formData state
      setInitialData(JSON.parse(JSON.stringify(formData)));
    }
  }, [book]);
  
  useEffect(() => {
    // Broadcast changes for live preview
    if (typeof window !== 'undefined') {
      const update = {
        type: "BOOK_PREVIEW_UPDATE",
        book: {
          ...formData,
          id: book?.id || 'new-book-preview'
        }
      };
      
      // Iframe communication
      window.parent.postMessage(update, "*");
      
      // Cross-tab communication
      const bc = new BroadcastChannel("site_preview_updates");
      bc.postMessage(update);
      bc.close();
    }
  }, [formData, book?.id]);

  // Aggregate stock calculation
  useEffect(() => {
    if (Array.isArray(formData.variants) && formData.variants.length > 0) {
      const totalStock = formData.variants.reduce((sum: number, v: Variant) => sum + (v.stock || 0), 0);
      if (totalStock !== formData.stockLevel) {
        setFormData((prev: any) => ({ ...prev, stockLevel: totalStock }));
      }
    }
  }, [formData.variants]);

  async function loadMetadata() {
    try {
      const [sh, au, settings] = await Promise.all([
        adminApi.getShippingProfiles(),
        adminApi.getAuthors(),
        adminApi.getSettings() as Promise<any>,
      ]);
      setShippingProfiles(sh);
      setAuthors(au);
      
      const siteCats = settings?.design?.categories || settings?.draftDesign?.categories || CATEGORIES;
      // Filter out 'PUBLICATIONS' as it's a catch-all and usually not a specific tag
      // Ensure all items are strings to prevent crashes later
      const filteredCats = Array.isArray(siteCats) 
        ? siteCats
            .filter((c: any) => c && typeof c === 'string' && c !== 'PUBLICATIONS')
        : CATEGORIES.filter(c => c !== 'PUBLICATIONS');
      
      setCategories(filteredCats);

      if (!book && sh.length > 0) {
        setFormData((prev: any) => ({ ...prev, shippingProfileId: sh[0].id }));
      }
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let val: any = value;
    if (type === "number") val = Number(value);
    if (type === "checkbox") val = (e.target as HTMLInputElement).checked;
    
    setFormData((prev: any) => {
      const newData = { ...prev, [name]: val };
      // Auto-generate slug if title changes and slug is empty or currently matches old title
      if (name === "title" && (!prev.slug || prev.slug === prev.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))) {
        newData.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      return newData;
    });
  };

  const handleClose = () => {
    if (initialData && JSON.stringify(formData) !== JSON.stringify(initialData)) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to discard them?")) return;
    }
    onClose();
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!formData.title.trim()) {
      toast.error("Book title is required.");
      return;
    }

    if (formData.retailPrice < 0) {
      toast.error("Retail price cannot be negative.");
      return;
    }

    setLoading(true);
    try {
      console.log("Saving book data:", formData);
      if (book) {
        await adminApi.updateBook(book.id, formData);
        toast.success("Book updated successfully");
      } else {
        await adminApi.createBook(formData);
        toast.success("New title added to library");
      }
      setInitialData(formData); // Update initial data after save so we don't prompt on close
      onSave();
    } catch (err: any) {
      console.error("Save error details:", err);
      toast.error(`Error saving book: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const addPhoto = () => {
    if (!photoInput) return;
    if (formData.photos.length >= 10) {
      toast.error("Maximum 10 photos allowed");
      return;
    }
    setFormData((prev: any) => ({
      ...prev,
      photos: [...prev.photos, { url: photoInput, id: Math.random().toString(36).substr(2, 9) }]
    }));
    setPhotoInput("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (formData.photos.length >= 10) {
      toast.error("Maximum 10 photos allowed");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const url = await adminApi.uploadFile(file, `products/${fileName}`);
      
      setFormData((prev: any) => ({
        ...prev,
        photos: [...prev.photos, { 
          url, 
          id: Math.random().toString(36).substr(2, 9),
          altText: file.name
        }]
      }));
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      photos: (prev.photos || []).filter((p: any) => p.id !== id)
    }));
  };

  const addVariant = () => {
    setFormData((prev: any) => ({
      ...prev,
      variants: [...(prev.variants || []), { 
        name: "", 
        price: prev.retailPrice || 0, 
        stock: 0, 
        sku: `${prev.sku || 'SKU'}-${(prev.variants || []).length + 1}`,
        weight: prev.weight || "",
        id: crypto.randomUUID() 
      }]
    }));
  };

  const updateVariant = (id: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      variants: prev.variants.map((v: any) => v.id === id ? { ...v, [field]: value } : v)
    }));
  };

  const removeVariant = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      variants: (prev.variants || []).filter((v: any) => v.id !== id)
    }));
  };

  const toggleCategory = (cat: string) => {
    setFormData((prev: any) => {
      const currentCats = Array.isArray(prev.categories) ? prev.categories : [];
      return {
        ...prev,
        categories: currentCats.includes(cat) 
          ? currentCats.filter((c: string) => c !== cat)
          : [...currentCats, cat]
      };
    });
  };

  return (
    <div className="bg-[#0A0A0B] rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 overflow-hidden flex flex-col h-full max-h-[95vh] text-white">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-violet-600/10 blur-[120px] pointer-events-none opacity-50" />
      
      {/* Header */}
      <header className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-[#0A0A0B]/80 backdrop-blur-3xl sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleClose} 
            className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
          >
            <ArrowLeft size={20} className="text-slate-400 group-hover:text-white transition-colors" />
          </button>
          <div>
            <h3 className="text-3xl font-black tracking-tighter text-white uppercase">{book ? "Edit Book" : "New Title"}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[9px] font-black text-violet-400 uppercase tracking-[0.3em]">
                {book ? `Library ID: ${book.id}` : "New Manuscript"}
              </span>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                Library System v2.4
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          {book && (
            <a 
              href={`/#/books/${formData.slug}`} 
              target="_blank" 
              rel="noreferrer"
              className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black tracking-[0.3em] text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
            >
              <ExternalLink size={16} className="text-violet-400" />
              LIVE PREVIEW
            </a>
          )}
          <button 
            type="button" 
            onClick={handleClose} 
            className="px-8 py-4 text-[10px] font-black tracking-[0.3em] text-slate-600 hover:text-red-400 transition-all"
          >
            CANCEL
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-4 bg-violet-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] hover:bg-violet-500 active:scale-95 transition-all shadow-2xl shadow-violet-600/20 disabled:opacity-50"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> SAVING...</> : <><Save size={16} /> SAVE TO LIBRARY</>}
          </button>
        </div>
      </header>

      <form className="p-10 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10 custom-scrollbar">
        {/* Left Column: Essential Info */}
        <div className="lg:col-span-2 space-y-16">
          <section className="glass-card rounded-[2.5rem] p-10 border border-white/5 space-y-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h4 className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-10 pb-4 border-b border-white/5">I. Book Details</h4>
              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">BOOK TITLE</label>
                  <input 
                    name="title" 
                    value={formData.title} 
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-violet-500/50 focus:bg-white/[0.08] outline-none transition-all font-bold"
                    placeholder="e.g. Find Still Catches Me Shifted"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">AUTHOR(S) / CONTRIBUTORS</label>
                    <input 
                      name="subtitle" 
                      value={formData.subtitle} 
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-white focus:border-violet-500/50 focus:bg-white/[0.08] outline-none transition-all"
                      placeholder="e.g. Zoe Moss, Lucia Bellemare..."
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">SYSTEM SLUG (URL HANDLE)</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 text-[10px] font-mono">/books/</div>
                      <input 
                        name="slug" 
                        value={formData.slug} 
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-20 pr-6 text-xs text-violet-400 focus:border-violet-500/50 focus:bg-white/[0.08] outline-none transition-all font-mono"
                        placeholder="the-book-slug"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">DESCRIPTION / BLURB</label>
                  <textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleChange}
                    rows={8}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 px-8 text-xs text-slate-300 focus:border-violet-500/50 focus:bg-white/[0.08] outline-none transition-all leading-relaxed custom-scrollbar"
                    placeholder="Enter book description, blurb, and additional notes..."
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-[2.5rem] p-10 border border-white/5 space-y-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-bl from-cyan-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative z-10">
               <h4 className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-10 pb-4 border-b border-white/5">II. Publishing Details</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">ISBN / EAN-13</label>
                     <input 
                       name="isbn" 
                       value={formData.isbn} 
                       onChange={handleChange} 
                       className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-white focus:border-cyan-500/50 outline-none transition-all font-mono" 
                       placeholder="978-0-..."
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">SKU / INTERNAL ID</label>
                     <input 
                       name="sku" 
                       value={formData.sku} 
                       onChange={handleChange} 
                       className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-white focus:border-cyan-500/50 outline-none transition-all font-mono" 
                       placeholder="LM-2024-..."
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">FORMAT</label>
                     <select 
                       name="format" 
                       value={formData.format} 
                       onChange={handleChange} 
                       className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-white focus:border-cyan-500/50 outline-none transition-all appearance-none cursor-pointer"
                     >
                       <option className="bg-[#0A0A0B]">Paperback</option>
                       <option className="bg-[#0A0A0B]">Hardcover</option>
                       <option className="bg-[#0A0A0B]">Special Edition</option>
                       <option className="bg-[#0A0A0B]">Box Set</option>
                       <option className="bg-[#0A0A0B]">Zine</option>
                     </select>
                  </div>
               </div>

               <div className="pt-12 border-t border-white/5 mt-12">
                 <div className="flex justify-between items-center mb-10">
                   <div>
                     <h5 className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Editions & Pricing</h5>
                     <p className="text-[8px] text-slate-600 mt-1 uppercase tracking-widest">Multi-format management</p>
                   </div>
                   <button 
                     type="button" 
                     onClick={addVariant} 
                     className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-[9px] font-black text-white flex items-center gap-3 hover:bg-white/10 transition-all shadow-xl"
                   >
                     <Plus size={14} className="text-cyan-400" /> 
                     ADD EDITION
                   </button>
                 </div>
                 <div className="space-y-4">
                  <div className="space-y-6">
                    {formData.variants.map((v: Variant) => (
                      <div key={v.id} className="grid grid-cols-1 md:grid-cols-6 gap-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] relative group hover:border-cyan-500/30 transition-all shadow-2xl">
                        <div className="md:col-span-2 space-y-3">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">EDITION NAME</label>
                          <input 
                            placeholder="e.g. Signed Collector's Copy" 
                            value={v.name} 
                            onChange={(e) => updateVariant(v.id, "name", e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-[11px] text-white focus:border-cyan-500/50 outline-none transition-all font-bold"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">SKU</label>
                          <input 
                            placeholder="SKU-..." 
                            value={v.sku || ""} 
                            onChange={(e) => updateVariant(v.id, "sku", e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-[11px] text-cyan-400 focus:border-cyan-500/50 outline-none transition-all font-mono"
                          />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">PRICE</label>
                           <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[11px] text-slate-600">$</span>
                              <input 
                                type="number" 
                                value={v.price} 
                                onChange={(e) => updateVariant(v.id, "price", Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-6 text-[11px] text-white focus:border-cyan-500/50 outline-none transition-all font-mono font-bold"
                              />
                           </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">STOCK</label>
                          <input 
                            type="number" 
                            value={v.stock} 
                            onChange={(e) => updateVariant(v.id, "stock", Number(e.target.value))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-[11px] text-white focus:border-cyan-500/50 outline-none transition-all font-mono font-bold"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">WEIGHT</label>
                          <input 
                            placeholder="0.5kg" 
                            value={v.weight || ""} 
                            onChange={(e) => updateVariant(v.id, "weight", e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-[11px] text-slate-400 focus:border-cyan-500/50 outline-none transition-all"
                          />
                        </div>
                        
                        <button 
                          type="button" 
                          onClick={() => removeVariant(v.id)} 
                          className="absolute -right-4 -top-4 p-4 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-all border border-red-500/20 opacity-0 group-hover:opacity-100 shadow-2xl backdrop-blur-xl z-10"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {formData.variants.length === 0 && (
                      <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem] gap-4 group hover:border-cyan-500/20 transition-all">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-700 group-hover:text-cyan-400 transition-colors">
                          <Plus size={20} />
                        </div>
                        <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.3em]">No variants defined. Using base book settings.</p>
                      </div>
                    )}
                  </div>
                 </div>
               </div>
            </div>
          </section>

          <section className="glass-card rounded-[2.5rem] p-10 border border-white/5 space-y-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h4 className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-10 pb-4 border-b border-white/5">III. Genres & Categories</h4>
              <div className="flex flex-wrap gap-4">
                {Array.from(new Set([...categories, "Photography", "Contemporary", "Artist Book", "Zine", "Archive"])).map(cat => {
                  const isSelected = Array.isArray(formData.categories) && formData.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-8 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all border ${
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10"
                      }`}
                    >
                      {String(cat).toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Imagery & Commerce */}
        <div className="space-y-16">
          <section className="glass-card rounded-[2.5rem] p-10 border border-white/5 space-y-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h4 className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-10 pb-4 border-b border-white/5">IV. Book Covers & Media</h4>
              
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-2 gap-6 mb-10">
                  <SortableContext items={formData.photos.map((p: any) => p.id)} strategy={rectSortingStrategy}>
                    {formData.photos.map((photo: any, i: number) => (
                      <SortablePhoto key={photo.id} photo={photo} index={i} onRemove={removePhoto} />
                    ))}
                  </SortableContext>
                  
                  {formData.photos.length < 10 && (
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="aspect-[3/4] border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-700 hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-slate-400 transition-all disabled:opacity-50 group"
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center gap-4">
                           <div className="w-8 h-8 border-2 border-slate-800 border-t-violet-500 rounded-full animate-spin" />
                           <span className="text-[8px] tracking-[0.3em] font-black uppercase">Ingesting...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload size={24} className="text-violet-400" />
                          </div>
                          <span className="text-[8px] tracking-[0.3em] font-black uppercase">Upload Cover / Image</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </DndContext>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">ADD IMAGE VIA URL</label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={photoInput} 
                    onChange={(e) => setPhotoInput(e.target.value)}
                    placeholder="https://cloud.assets.com/img.jpg"
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-white focus:border-violet-500/50 outline-none transition-all font-mono"
                  />
                  <button 
                    type="button" 
                    onClick={addPhoto}
                    className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-violet-400 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <p className="text-[8px] text-slate-600 uppercase tracking-widest text-center mt-2">Supports high-fidelity CDNs and direct image links</p>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-[2.5rem] p-10 border border-white/5 space-y-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h4 className="text-xs font-black tracking-[0.4em] text-slate-500 uppercase mb-10 pb-4 border-b border-white/5">V. Availability & Sales</h4>
              <div className="space-y-10">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">RETAIL PRICE (USD)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 text-xs">$</span>
                      <input
                        type="number"
                        name="retailPrice"
                        min={0}
                        step="0.01"
                        value={formData.retailPrice ?? 0}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-6 text-sm text-white focus:border-amber-500/50 outline-none transition-all font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">COST PRICE (USD)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 text-xs">$</span>
                      <input
                        type="number"
                        name="costPrice"
                        min={0}
                        step="0.01"
                        value={formData.costPrice ?? 0}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-6 text-sm text-white focus:border-amber-500/50 outline-none transition-all font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">
                      STOCK LEVEL {formData.variants?.length > 0 && "(CALCULATED FROM EDITIONS)"}
                    </label>
                    <input 
                      type="number" 
                      name="stockLevel" 
                      value={formData.stockLevel} 
                      onChange={handleChange} 
                      disabled={formData.variants?.length > 0}
                      className={`w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-amber-500/50 outline-none transition-all font-mono font-bold ${formData.variants?.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    />
                  </div>
                </div>

                <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">ON SALE</label>
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest">Toggle promotional pricing</p>
                      </div>
                      <input 
                        type="checkbox" 
                        name="isOnSale" 
                        checked={formData.isOnSale} 
                        onChange={handleChange} 
                        className="w-6 h-6 rounded-lg bg-white/5 border-white/10 text-amber-500 focus:ring-amber-500/50" 
                      />
                   </div>
                   {formData.isOnSale && (
                     <div className="space-y-4 mt-6 pt-6 border-t border-white/5 animate-in slide-in-from-top-4 duration-300">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">PROMOTIONAL PRICE (USD)</label>
                       <div className="relative">
                         <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 text-xs">$</span>
                         <input 
                           type="number" 
                           name="salePrice" 
                           value={formData.salePrice} 
                           onChange={handleChange} 
                           className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-6 text-sm text-white focus:border-amber-500/50 outline-none transition-all font-mono font-bold" 
                         />
                       </div>
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">SHIPPING PROFILE</label>
                    <select 
                      name="shippingProfileId" 
                      value={formData.shippingProfileId} 
                      onChange={handleChange} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-white focus:border-amber-500/50 outline-none transition-all appearance-none cursor-pointer"
                    >
                      {shippingProfiles.map(p => <option key={p.id} value={p.id} className="bg-[#0A0A0B]">{p.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">BOOK STATUS</label>
                    <select 
                      name="status" 
                      value={formData.status} 
                      onChange={handleChange} 
                      className={`w-full border rounded-2xl py-4 px-6 text-xs font-black tracking-widest outline-none transition-all appearance-none cursor-pointer ${
                        formData.status === 'published' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <option value="draft" className="bg-[#0A0A0B]">Draft</option>
                      <option value="published" className="bg-[#0A0A0B]">Published</option>
                      <option value="archived" className="bg-[#0A0A0B]">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
