import { useState, useEffect } from "react";
import { 
  X, 
  Save, 
  ArrowLeft, 
  Image as LucideImage, 
  Upload, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Plus
} from "lucide-react";
import { motion } from "motion/react";
import { adminApi } from "./api";

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
  });

  const [shippingProfiles, setShippingProfiles] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoInput, setPhotoInput] = useState("");

  useEffect(() => {
    loadMetadata();
    if (book) {
      setFormData({
        ...book,
        photos: book.photos || [],
      });
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
    const val = type === "number" ? Number(value) : (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev: any) => ({ ...prev, [name]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (book) {
        await adminApi.updateBook(book.id, formData);
      } else {
        await adminApi.createBook(formData);
      }
      onSave();
    } catch (err) {
      alert("Error saving book");
    } finally {
      setLoading(false);
    }
  };

  const addPhoto = () => {
    if (!photoInput) return;
    if (formData.photos.length >= 10) {
      alert("Maximum 10 photos allowed");
      return;
    }
    setFormData((prev: any) => ({
      ...prev,
      photos: [...prev.photos, { url: photoInput, id: Math.random().toString(36).substr(2, 9) }]
    }));
    setPhotoInput("");
  };

  const removePhoto = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      photos: prev.photos.filter((p: any) => p.id !== id)
    }));
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <header className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
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
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2.5 text-[10px] tracking-[.3em] font-bold text-neutral-400 hover:text-black transition-colors"
          >
            DISCARD
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-black text-white px-8 py-2.5 rounded-full text-[10px] tracking-[.3em] font-bold hover:bg-neutral-800 transition-all shadow-lg disabled:opacity-50"
          >
            <Save size={14} />
            {loading ? "SAVING..." : "COMMIT CHANGES"}
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
                <input 
                  name="subtitle" 
                  value={formData.subtitle} 
                  onChange={handleChange}
                  className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none transition-all"
                  placeholder="e.g. Zoe Moss, Lucia Bellemare..."
                />
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
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Dimensions</label>
                  <input name="dimensions" value={formData.dimensions} onChange={handleChange} placeholder="5.5 x 8.5 in" className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none" />
               </div>
               <div className="flex flex-col gap-2">
                  <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Weight</label>
                  <input name="weight" value={formData.weight} onChange={handleChange} placeholder="0.8 lbs" className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none" />
               </div>
             </div>
          </section>
        </div>

        {/* Right Column: Imagery & Commerce */}
        <div className="space-y-12">
          <section>
            <h4 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-8 pb-2 border-b border-neutral-50">Visual Archive ({formData.photos.length}/10)</h4>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {formData.photos.map((photo: any, i: number) => (
                <div key={photo.id || i} className="relative aspect-[3/4] bg-neutral-100 rounded-xl overflow-hidden group border border-neutral-50">
                  <img src={photo.url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button type="button" onClick={() => removePhoto(photo.id)} className="p-2 bg-white text-black rounded-lg hover:bg-neutral-100 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-[8px] text-white rounded font-bold tracking-widest">
                    IMAGE {i + 1}
                  </div>
                </div>
              ))}
              
              {formData.photos.length < 10 && (
                <div className="aspect-[3/4] border-2 border-dashed border-neutral-100 rounded-xl flex flex-col items-center justify-center gap-2 text-neutral-300">
                  <LucideImage size={24} strokeWidth={1} />
                  <span className="text-[8px] tracking-widest font-bold">READY FOR UPLOAD</span>
                </div>
              )}
            </div>

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
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Retail Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">$</span>
                    <input type="number" name="retailPrice" value={formData.retailPrice} onChange={handleChange} className="w-full bg-neutral-50 border-none rounded-xl py-3 pl-8 pr-4 text-xs focus:ring-1 focus:ring-black outline-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Cost Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">$</span>
                    <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="w-full bg-neutral-50 border-none rounded-xl py-3 pl-8 pr-4 text-xs focus:ring-1 focus:ring-black outline-none" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] tracking-widest text-neutral-500 uppercase">Stock Inventory</label>
                <input type="number" name="stockLevel" value={formData.stockLevel} onChange={handleChange} className="w-full bg-neutral-50 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-black outline-none font-bold" />
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
