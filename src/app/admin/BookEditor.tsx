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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative aspect-[3/4] bg-neutral-100 rounded-xl overflow-hidden group border border-neutral-50 cursor-grab active:cursor-grabbing">
      <img src={photo.url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 pointer-events-none" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }} className="p-2 bg-white text-black rounded-lg hover:bg-neutral-100 transition-colors z-10">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-[8px] text-white rounded font-bold tracking-widest">
        IMAGE {index + 1}
      </div>
    </div>
  );
}

interface BookEditorProps {
  book: any | null;
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
      const dataToLoad = {
        ...book,
        photos: book.photos || [],
      };
      setFormData(dataToLoad);
      setInitialData(dataToLoad);
    } else {
      // Set initial data for new books to current empty formData state
      setInitialData(formData);
    }
  }, [book]);

  async function loadMetadata() {
    try {
      const [sh, au] = await Promise.all([
        adminApi.getShippingProfiles(),
        adminApi.getAuthors(),
      ]);
      setShippingProfiles(sh);
      setAuthors(au);
      if (!book && sh.length > 0) {
        setFormData(prev => ({ ...prev, shippingProfileId: sh[0].id }));
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
      toast.error("Canonical title is required.");
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
        toast.success("Volume updated successfully");
      } else {
        await adminApi.createBook(formData);
        toast.success("New edition created");
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
      photos: prev.photos.filter((p: any) => p.id !== id)
    }));
  };

  const addVariant = () => {
    setFormData((prev: any) => ({
      ...prev,
      variants: [...prev.variants, { name: "", price: prev.retailPrice, stock: 10, id: crypto.randomUUID() }]
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
      variants: prev.variants.filter((v: any) => v.id !== id)
    }));
  };

  const toggleCategory = (cat: string) => {
    setFormData((prev: any) => ({
      ...prev,
      categories: prev.categories.includes(cat) 
        ? prev.categories.filter((c: string) => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <header className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={handleClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-neutral-400" />
          </button>
          <div>
            <h3 className="text-xl font-light tracking-tight">{book ? "Edit Volume" : "New Edition"}</h3>
            <p className="text-[10px] tracking-widest text-neutral-400 uppercase mt-1">
              {book ? `ID: ${book.id}` : "Catalogue Entry"}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          {book && (
            <a 
              href={`/#/product/${formData.slug}`} 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-2.5 flex items-center gap-2 text-[10px] tracking-[.3em] font-bold text-neutral-400 hover:text-black transition-colors"
            >
              <ExternalLink size={14} />
              PREVIEW
            </a>
          )}
          <button 
            type="button" 
            onClick={handleClose} 
            className="px-6 py-2.5 text-[10px] tracking-[.3em] font-bold text-neutral-400 hover:text-black transition-colors"
          >
            DISCARD
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-black text-white px-8 py-2.5 rounded-full text-[10px] tracking-[.3em] font-bold hover:bg-neutral-800 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> COMMITTING...</> : <><Save size={14} /> COMMIT CHANGES</>}
          </button>
        </div>
      </header>

      <form className="p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Essential Info */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h4 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-8 pb-2 border-b border-neutral-50">Core Metadata</h4>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Canonical Title</label>
                <input 
                  name="title" 
                  value={formData.title} 
                  onChange={handleChange}
                  className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-1 focus:ring-black outline-none transition-all font-medium"
                  placeholder="e.g. Find Still Catches Me Shifted"
                  required
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Subtitle / Artist Attribution</label>
                <div className="flex gap-4">
                  <input 
                    name="subtitle" 
                    value={formData.subtitle} 
                    onChange={handleChange}
                    className="flex-1 bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none transition-all"
                    placeholder="e.g. Zoe Moss, Lucia Bellemare..."
                  />
                  <div className="w-1/3 flex flex-col gap-1">
                    <label className="text-[8px] tracking-widest text-neutral-400 uppercase">URL Handle / Slug</label>
                    <input 
                      name="slug" 
                      value={formData.slug} 
                      onChange={handleChange}
                      className="w-full bg-neutral-100/50 border-none rounded-lg py-1.5 px-3 text-[10px] focus:ring-1 focus:ring-black outline-none"
                      placeholder="the-book-slug"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Abstract / Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange}
                  rows={6}
                  className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-xs focus:ring-1 focus:ring-black outline-none transition-all leading-relaxed"
                  placeholder="Enter publication notes, artistic intent, and technical specifications..."
                />
              </div>
            </div>
          </section>

          <section>
             <h4 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-8 pb-2 border-b border-neutral-50">Technical Specifications</h4>
             {/* ... existing tech fields ... */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* ... (re-adding dimensions/weight/format from original but with variants below) ... */}
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] tracking-widest text-neutral-500 uppercase">ISBN</label>
                  <input name="isbn" value={formData.isbn} onChange={handleChange} className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none" />
               </div>
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] tracking-widest text-neutral-500 uppercase">SKU / ID</label>
                  <input name="sku" value={formData.sku} onChange={handleChange} className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none" />
               </div>
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Format</label>
                  <select name="format" value={formData.format} onChange={handleChange} className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none">
                    <option>Paperback</option>
                    <option>Hardcover</option>
                    <option>Special Edition</option>
                    <option>Box Set</option>
                    <option>Zine</option>
                  </select>
               </div>
             </div>

             <div className="mt-12">
               <div className="flex justify-between items-center mb-6">
                 <h5 className="text-[10px] tracking-widest text-neutral-500 uppercase">Product Variants</h5>
                 <button type="button" onClick={addVariant} className="text-[10px] tracking-widest font-bold text-black flex items-center gap-2 hover:opacity-60">
                   <Plus size={12} /> ADD VARIANT
                 </button>
               </div>
               <div className="space-y-3">
                 {formData.variants.map((v: any) => (
                   <div key={v.id} className="flex gap-3 bg-neutral-50 p-3 rounded-xl items-center">
                     <input 
                       placeholder="Variant Name" 
                       value={v.name} 
                       onChange={(e) => updateVariant(v.id, "name", e.target.value)}
                       className="flex-1 bg-white border-none rounded-lg py-2 px-3 text-[10px] focus:ring-1 focus:ring-black outline-none"
                     />
                     <div className="w-24 relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">$</span>
                        <input 
                          type="number" 
                          value={v.price} 
                          onChange={(e) => updateVariant(v.id, "price", Number(e.target.value))}
                          className="w-full bg-white border-none rounded-lg py-2 pl-5 pr-2 text-[10px] focus:ring-1 focus:ring-black outline-none"
                        />
                     </div>
                     <button type="button" onClick={() => removeVariant(v.id)} className="p-2 text-neutral-300 hover:text-red-500">
                       <Plus size={14} className="rotate-45" />
                     </button>
                   </div>
                 ))}
                 {formData.variants.length === 0 && (
                   <p className="text-[9px] text-neutral-300 italic">No variants defined (Single product edition)</p>
                 )}
               </div>
             </div>
          </section>

          <section>
            <h4 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-8 pb-2 border-b border-neutral-50">Taxonomy & Categorization</h4>
            <div className="flex flex-wrap gap-2">
              {["Photography", "Contemporary", "Ephemera", "Artist Book", "Zine", "Limited Edition", "Archive"].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-full text-[10px] tracking-widest font-bold transition-all ${
                    formData.categories.includes(cat)
                      ? "bg-black text-white"
                      : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Imagery & Commerce */}
        <div className="space-y-12">
          <section>
            <h4 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-8 pb-2 border-b border-neutral-50">Visual Archive ({formData.photos.length}/10)</h4>
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-2 gap-3 mb-6">
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
                    className="aspect-[3/4] border-2 border-dashed border-neutral-100 rounded-xl flex flex-col items-center justify-center gap-2 text-neutral-300 hover:border-black/20 hover:text-neutral-400 transition-all disabled:opacity-50"
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                         <div className="w-5 h-5 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
                         <span className="text-[8px] tracking-widest font-bold">UPLOADING...</span>
                      </div>
                    ) : (
                      <>
                        <LucideImage size={24} strokeWidth={1} />
                        <span className="text-[8px] tracking-widest font-bold">READY FOR UPLOAD</span>
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

            <div className="flex flex-col gap-3">
              <label className="text-[10px] tracking-widest text-neutral-500 uppercase">External Asset URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={photoInput} 
                  onChange={(e) => setPhotoInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-neutral-50 border-none rounded-xl py-2.5 px-4 text-xs focus:ring-1 focus:ring-black outline-none"
                />
                <button 
                  type="button" 
                  onClick={addPhoto}
                  className="p-2.5 bg-black text-white rounded-xl hover:bg-neutral-800 transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-8 pb-2 border-b border-neutral-50">Commerce & Status</h4>
            <div className="space-y-6">
              <div className="flex flex-col gap-4 p-6 bg-neutral-50 rounded-2xl">
                 <div className="flex flex-col gap-2 border-b border-white pb-4 mb-2">
                    <label className="text-[10px] tracking-widest text-neutral-500 uppercase flex items-center gap-2">
                       Stripe Price ID 
                       <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded">OPTIONAL</span>
                    </label>
                    <input 
                      type="text" 
                      name="stripePriceId" 
                      value={formData.stripePriceId || ''} 
                      onChange={handleChange} 
                      placeholder="price_1Ns..." 
                      className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-4 text-xs focus:ring-1 focus:ring-black outline-none font-mono" 
                    />
                    <p className="text-[8px] text-neutral-400">Required if using Client-Only Stripe Checkout</p>
                 </div>
                 <div className="flex items-center justify-between">
                    <label className="text-[10px] tracking-widest text-neutral-500 uppercase">On Sale</label>
                    <input type="checkbox" name="isOnSale" checked={formData.isOnSale} onChange={handleChange} className="w-4 h-4 accent-black" />
                 </div>
                 {formData.isOnSale && (
                   <div className="flex flex-col gap-2 mt-4">
                     <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Sale Price</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">$</span>
                       <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="w-full bg-white border border-neutral-200 rounded-xl py-2 pl-8 pr-4 text-xs focus:ring-1 focus:ring-black outline-none" />
                     </div>
                   </div>
                 )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Stock Inventory</label>
                <input type="number" name="stockLevel" value={formData.stockLevel} onChange={handleChange} className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none font-bold" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Release Schedule</label>
                <input type="datetime-local" name="scheduleDate" value={formData.scheduleDate} onChange={handleChange} className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none" />
                <p className="text-[8px] text-neutral-400 tracking-wider">LEAVE EMPTY TO PUBLISH IMMEDIATELY</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Shipping Profile</label>
                <select name="shippingProfileId" value={formData.shippingProfileId} onChange={handleChange} className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none">
                  {shippingProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className={`w-full border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none font-bold ${formData.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-neutral-50 text-neutral-500'}`}>
                  <option value="draft">DRAFT</option>
                  <option value="published">PUBLISHED / LIVE</option>
                  <option value="archived">ARCHIVED</option>
                </select>
              </div>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
