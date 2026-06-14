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
import { useCurrency } from "../CurrencyContext";

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
      className="relative aspect-[3/4] bg-slate-100 rounded-3xl overflow-hidden group border border-slate-200 cursor-grab active:cursor-grabbing hover:border-violet-500/30 transition-all duration-500 shadow-sm"
    >
      <img src={photo.url} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-4">
        <button 
          type="button" 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }} 
          className="w-full py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-[9px] font-black tracking-widest shadow-md cursor-pointer"
        >
          Remove Image
        </button>
      </div>
      <div className="absolute top-3 left-3 px-2 py-1 bg-slate-900/80 backdrop-blur-md text-[8px] text-white rounded-full font-black tracking-[0.1em]">
        Image {index + 1}
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
  const { rates } = useCurrency();
  const [formData, setFormData] = useState<any>({
    title: "",
    subtitle: "",
    description: "",
    isbn: "",
    barcode: "",
    sku: "",
    retailPrice: 0,
    usdPrice: 0,
    eurPrice: 0,
    costPrice: 0,
    usdCostPrice: 0,
    eurCostPrice: 0,
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
    usdSalePrice: 0,
    eurSalePrice: 0,
    manualCurrencyOverrides: false,
    categories: [],
    tags: [],
    variants: [],
    scheduleDate: "",
    publisher: "",
    publishDate: "",
    pageCount: 0,
    edition: "",
    chargeTax: true,
    trackInventory: true,
    allowBackorder: false,
    metaTitle: "",
    metaDescription: "",
  });

  const [shippingProfiles, setShippingProfiles] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoInput, setPhotoInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const digitalFileInputRef = useRef<HTMLInputElement>(null);

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
        barcode: "",
        sku: "",
        retailPrice: 0,
        usdPrice: 0,
        eurPrice: 0,
        costPrice: 0,
        usdCostPrice: 0,
        eurCostPrice: 0,
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
        usdSalePrice: 0,
        eurSalePrice: 0,
        manualCurrencyOverrides: false,
        scheduleDate: "",
        publisher: "",
        publishDate: "",
        pageCount: 0,
        edition: "",
        chargeTax: true,
        trackInventory: true,
        allowBackorder: false,
        metaTitle: "",
        metaDescription: "",
      };

      const dataToLoad = {
        ...defaults,
        ...book,
        photos: Array.isArray(book.photos) ? book.photos : [],
        variants: Array.isArray(book.variants) ? book.variants : [],
        categories: Array.isArray(book.categories) ? book.categories : [],
        tags: Array.isArray((book as any).tags) ? (book as any).tags : [],
      };
      // Sanitize through JSON round-trip to strip any non-serializable Firebase
      // SDK internals (e.g. PlatformLoggerServiceImpl) that Firestore may attach
      // to document objects. Without this they end up in formData and cause a
      // DataCloneError when the live-preview postMessage fires, crashing the editor.
      const safeData = JSON.parse(JSON.stringify(dataToLoad));
      setFormData(safeData);
      setInitialData(JSON.parse(JSON.stringify(safeData)));
    } else {
      // Set initial data for new books to current empty formData state
      setInitialData(JSON.parse(JSON.stringify(formData)));
    }
  }, [book]);
  
  useEffect(() => {
    // Broadcast changes for live preview
    if (typeof window !== 'undefined') {
      try {
        // Sanitize before postMessage — structured clone rejects non-serializable
        // values such as Firebase SDK service instances.
        const update = {
          type: "BOOK_PREVIEW_UPDATE",
          book: JSON.parse(JSON.stringify({
            ...formData,
            id: book?.id || 'new-book-preview'
          }))
        };

        // Iframe communication
        window.parent.postMessage(update, "*");

        // Cross-tab communication
        const bc = new BroadcastChannel("site_preview_updates");
        bc.postMessage(update);
        bc.close();
      } catch (err) {
        // Non-fatal: preview broadcast failed but the editor stays functional
        console.warn("[BookEditor] Could not broadcast live preview update:", err);
      }
    }
  }, [formData, book?.id]);

  // Auto-calculate USD/EUR prices using exchange rates if manual overrides are disabled
  useEffect(() => {
    if (!formData.manualCurrencyOverrides) {
      const usdRate = rates.USD || 0.73;
      const eurRate = rates.EUR || 0.67;
      
      setFormData((prev: any) => {
        const retailPrice = prev.retailPrice || 0;
        const costPrice = prev.costPrice || 0;
        const salePrice = prev.salePrice || 0;

        const newUsdPrice = Number((retailPrice * usdRate).toFixed(2));
        const newEurPrice = Number((retailPrice * eurRate).toFixed(2));
        const newUsdCostPrice = Number((costPrice * usdRate).toFixed(2));
        const newEurCostPrice = Number((costPrice * eurRate).toFixed(2));
        const newUsdSalePrice = Number((salePrice * usdRate).toFixed(2));
        const newEurSalePrice = Number((salePrice * eurRate).toFixed(2));

        if (
          prev.usdPrice === newUsdPrice &&
          prev.eurPrice === newEurPrice &&
          prev.usdCostPrice === newUsdCostPrice &&
          prev.eurCostPrice === newEurCostPrice &&
          prev.usdSalePrice === newUsdSalePrice &&
          prev.eurSalePrice === newEurSalePrice
        ) {
          return prev;
        }

        return {
          ...prev,
          usdPrice: newUsdPrice,
          eurPrice: newEurPrice,
          usdCostPrice: newUsdCostPrice,
          eurCostPrice: newEurCostPrice,
          usdSalePrice: newUsdSalePrice,
          eurSalePrice: newEurSalePrice,
        };
      });
    }
  }, [
    formData.retailPrice,
    formData.costPrice,
    formData.salePrice,
    formData.manualCurrencyOverrides,
    rates
  ]);

  // Auto-calculate variant pricing if overrides are disabled
  const prevVariantPricesRef = useRef<string>("");
  useEffect(() => {
    if (!formData.manualCurrencyOverrides && Array.isArray(formData.variants)) {
      const usdRate = rates.USD || 0.73;
      const eurRate = rates.EUR || 0.67;
      
      const currentPricesHash = formData.variants.map((v: any) => `${v.id}:${v.price}`).join(",");
      if (currentPricesHash !== prevVariantPricesRef.current) {
        prevVariantPricesRef.current = currentPricesHash;
        
        setFormData((prev: any) => ({
          ...prev,
          variants: prev.variants.map((v: any) => ({
            ...v,
            usdPrice: Number((v.price * usdRate).toFixed(2)),
            eurPrice: Number((v.price * eurRate).toFixed(2)),
          }))
        }));
      }
    }
  }, [
    formData.variants,
    formData.manualCurrencyOverrides,
    rates
  ]);

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
      const filteredCats = Array.isArray(siteCats) 
        ? siteCats
            .filter((c: any) => c && typeof c === 'string' && c !== 'PUBLICATIONS')
        : CATEGORIES.filter(c => c !== 'PUBLICATIONS');
      
      setCategories(filteredCats);

      if (sh.length > 0) {
        const defaultProfile = sh.find(p => p.id === "general-profile") || sh[0];
        if (!book) {
          setFormData((prev: any) => ({ ...prev, shippingProfileId: defaultProfile.id }));
        } else if (!book.shippingProfileId) {
          setFormData((prev: any) => ({ ...prev, shippingProfileId: defaultProfile.id }));
        }
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

    if (formData.manualCurrencyOverrides) {
      if (formData.usdPrice < 0 || formData.eurPrice < 0) {
        toast.error("Override prices cannot be negative.");
        return;
      }
      if (formData.costPrice < 0 || formData.usdCostPrice < 0 || formData.eurCostPrice < 0) {
        toast.error("Cost prices cannot be negative.");
        return;
      }
      if (formData.isOnSale && (formData.usdSalePrice < 0 || formData.eurSalePrice < 0)) {
        toast.error("Sale prices cannot be negative.");
        return;
      }
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
      setInitialData(formData);
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

  const handleDigitalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDigital(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const url = await adminApi.uploadFile(file, `digital-assets/${fileName}`);
      setFormData((prev: any) => ({
        ...prev,
        digitalFileUrl: url,
        digitalFileName: fileName,
      }));
      toast.success("Digital asset uploaded successfully");
    } catch (err: any) {
      console.error("Digital upload error:", err);
      toast.error("Failed to upload digital asset. Please try again.");
    } finally {
      setUploadingDigital(false);
      if (digitalFileInputRef.current) digitalFileInputRef.current.value = "";
    }
  };

  const removePhoto = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      photos: (prev.photos || []).filter((p: any) => p.id !== id)
    }));
  };

  const addVariant = () => {
    const usdRate = rates.USD || 0.73;
    const eurRate = rates.EUR || 0.67;
    const variantPrice = formData.retailPrice || 0;

    setFormData((prev: any) => ({
      ...prev,
      variants: [...(prev.variants || []), { 
        name: "", 
        price: variantPrice, 
        usdPrice: Number((variantPrice * usdRate).toFixed(2)),
        eurPrice: Number((variantPrice * eurRate).toFixed(2)),
        stock: 0, 
        stockLevel: 0,
        photoUrl: "",
        sku: `${prev.sku || 'SKU'}-${(prev.variants || []).length + 1}`,
        weight: prev.weight || "",
        id: crypto.randomUUID() 
      }]
    }));
  };

  const updateVariant = (id: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      variants: (prev.variants || []).map((v: any) => {
        if (v.id === id) {
          const updated = { ...v, [field]: value };
          if (field === "stock") {
            updated.stockLevel = Number(value) || 0;
          } else if (field === "stockLevel") {
            updated.stock = Number(value) || 0;
          }
          return updated;
        }
        return v;
      })
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
    <div className="bg-[#F9F8FA] w-full h-full flex flex-col text-slate-800 relative overflow-hidden">
      {/* Background Soft Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-violet-100 blur-[100px] pointer-events-none opacity-40" />
      
      {/* Header */}
      <header className="px-10 py-6 border-b border-slate-800 flex justify-between items-center bg-[#1E1E1F] text-white sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            type="button"
            onClick={handleClose} 
            className="p-3 bg-white text-[#1E1E1F] rounded-full hover:bg-slate-100 transition-all flex items-center justify-center shadow-md cursor-pointer border border-slate-200"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3 className="text-2xl font-black tracking-tighter text-white uppercase">{book ? "Edit Book" : "New Book"}</h3>
            {book && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[9px] font-black text-violet-400 uppercase tracking-[0.3em]">
                  Product ID: {book.id}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-6 items-center">
          {book && (book.slug || formData.slug) && (
            <a
              href={`/#/books/${book.slug || formData.slug}?preview=true`}
              target="_blank"
              rel="noreferrer"
              title={book.slug && book.slug !== formData.slug ? "Opens with the last-saved slug. Save to update the live URL." : "Opens the public page in a new tab. Edits broadcast live."}
              className="px-6 py-3.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black tracking-[0.2em] text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <ExternalLink size={14} className="text-violet-400" />
              PREVIEW PAGE
            </a>
          )}
          <button 
            type="button" 
            onClick={handleClose} 
            className="px-6 py-3.5 text-[10px] font-black tracking-[0.2em] text-slate-400 hover:text-red-400 transition-all cursor-pointer"
          >
            CANCEL
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-3 bg-violet-600 text-white px-8 py-3.5 rounded-xl text-[10px] font-black tracking-[0.2em] hover:bg-violet-500 active:scale-95 transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> SAVING...</> : <><Save size={14} /> SAVE BOOK</>}
          </button>
        </div>
      </header>

      <form className="p-10 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10 custom-scrollbar flex-1">
        {/* Left Column: Essential Info */}
        <div className="lg:col-span-2 space-y-12">
          <section className="bg-white border border-[#EBEAEF] rounded-[2rem] p-8 shadow-sm space-y-8 relative overflow-hidden text-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h4 className="text-xs font-black tracking-[0.4em] text-slate-400 uppercase mb-8 pb-4 border-b border-slate-100">Book Details</h4>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Book Title</label>
                  <input 
                    name="title" 
                    value={formData.title} 
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm text-slate-900 focus:border-violet-500/50 focus:bg-white outline-none transition-all font-bold placeholder:text-slate-400"
                    placeholder="e.g. Find Still Catches Me Shifted"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Author / Contributors</label>
                    <input 
                      name="subtitle" 
                      value={formData.subtitle} 
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-violet-500/50 focus:bg-white outline-none transition-all font-semibold placeholder:text-slate-400"
                      placeholder="e.g. Zoe Moss, Lucia Bellemare..."
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Web Link Address (URL Slug)</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-mono">/books/</div>
                      <input 
                        name="slug" 
                        value={formData.slug} 
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-20 pr-6 text-xs text-violet-600 focus:border-violet-500/50 focus:bg-white outline-none transition-all font-mono"
                        placeholder="the-book-slug"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Description</label>
                  <textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleChange}
                    rows={8}
                    className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-6 px-8 text-xs text-slate-800 focus:border-violet-500/50 focus:bg-white outline-none transition-all leading-relaxed custom-scrollbar placeholder:text-slate-400"
                    placeholder="Enter book description, blurb, and additional notes..."
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-[#EBEAEF] rounded-[2rem] p-8 shadow-sm space-y-8 relative overflow-hidden text-slate-800">
            <div className="absolute inset-0 bg-gradient-to-bl from-cyan-500/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10">
               <h4 className="text-xs font-black tracking-[0.4em] text-slate-400 uppercase mb-8 pb-4 border-b border-slate-100">Publishing Details</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">ISBN</label>
                     <input 
                       name="isbn" 
                       value={formData.isbn} 
                       onChange={handleChange} 
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-mono font-semibold" 
                       placeholder="978-0-..."
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">SKU</label>
                     <input 
                       name="sku" 
                       value={formData.sku} 
                       onChange={handleChange} 
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-mono font-semibold" 
                       placeholder="LM-2024-..."
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Format</label>
                     <select
                       name="format"
                       value={formData.format}
                       onChange={handleChange}
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-cyan-500/50 outline-none transition-all appearance-none cursor-pointer font-semibold"
                     >
                       <option>Paperback</option>
                       <option>Hardcover</option>
                       <option>Special Edition</option>
                       <option>Box Set</option>
                       <option>Zine</option>
                       <option>E-book (PDF)</option>
                       <option>E-book (EPUB)</option>
                       <option>Audiobook</option>
                     </select>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Publisher</label>
                    <input
                      name="publisher"
                      value={formData.publisher || ""}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-semibold"
                      placeholder="Lyrical Myrical Press"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Publication Date</label>
                    <input
                      type="date"
                      name="publishDate"
                      value={formData.publishDate || ""}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-mono font-semibold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Edition</label>
                    <input
                      name="edition"
                      value={formData.edition || ""}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-semibold"
                      placeholder="First Edition"
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Page Count</label>
                    <input
                      type="number"
                      min={0}
                      name="pageCount"
                      value={formData.pageCount ?? 0}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-mono font-semibold"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Language</label>
                    <input
                      name="language"
                      value={formData.language || ""}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-semibold"
                      placeholder="English"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Dimensions</label>
                    <input
                      name="dimensions"
                      value={formData.dimensions || ""}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-semibold"
                      placeholder="6 x 9 in"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Barcode / UPC</label>
                    <input
                      name="barcode"
                      value={formData.barcode || ""}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-mono font-semibold"
                      placeholder="0-00000-00000-0"
                    />
                  </div>
               </div>

               <div className="pt-8 border-t border-slate-100 mt-8">
                 <div className="flex justify-between items-center mb-6">
                   <div>
                     <h5 className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Editions & Pricing</h5>
                     <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-widest">Multi-format management</p>
                   </div>
                   <button 
                     type="button" 
                     onClick={addVariant} 
                     className="bg-slate-50 border border-slate-200 px-5 py-2.5 rounded-xl text-[9px] font-black text-slate-700 flex items-center gap-2.5 hover:bg-slate-100 transition-all shadow-sm cursor-pointer"
                   >
                     <Plus size={14} className="text-cyan-500" /> 
                     Add Edition
                   </button>
                 </div>
                 <div className="space-y-6">
                    {formData.variants.map((v: Variant) => (
                      <div key={v.id} className="bg-slate-50 border border-slate-200 p-8 rounded-[2rem] relative group hover:border-cyan-500/30 transition-all shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-3">
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Edition Name</label>
                            <input 
                              placeholder="e.g. Signed Collector's Copy" 
                              value={v.name} 
                              onChange={(e) => updateVariant(v.id, "name", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-[11px] text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-bold"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">SKU</label>
                            <input 
                              placeholder="SKU-..." 
                              value={v.sku || ""} 
                              onChange={(e) => updateVariant(v.id, "sku", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-[11px] text-cyan-600 focus:border-cyan-500/50 outline-none transition-all font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Stock</label>
                              <input 
                                type="number" 
                                value={v.stock} 
                                onChange={(e) => updateVariant(v.id, "stock", Number(e.target.value))}
                                className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-[11px] text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-mono font-bold"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Weight</label>
                              <input 
                                placeholder="0.5kg" 
                                value={v.weight || ""} 
                                onChange={(e) => updateVariant(v.id, "weight", e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-[11px] text-slate-700 focus:border-cyan-500/50 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200/60">
                          <div className="space-y-3">
                             <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Price (CAD)</label>
                             <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">$</span>
                                <input 
                                  type="number" 
                                  value={v.price} 
                                  onChange={(e) => updateVariant(v.id, "price", Number(e.target.value))}
                                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-10 pr-6 text-[11px] text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-mono font-bold"
                                />
                             </div>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Price (USD)</label>
                             <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">$</span>
                                <input 
                                  type="number" 
                                  disabled={!formData.manualCurrencyOverrides}
                                  value={(v as any).usdPrice ?? 0} 
                                  onChange={(e) => updateVariant(v.id, "usdPrice", Number(e.target.value))}
                                  className={`w-full bg-white border border-slate-200 rounded-2xl py-4 pl-10 pr-6 text-[11px] text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-mono font-bold ${!formData.manualCurrencyOverrides ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`}
                                />
                             </div>
                          </div>
                          <div className="space-y-3">
                             <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Price (EUR)</label>
                             <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">€</span>
                                <input 
                                  type="number" 
                                  disabled={!formData.manualCurrencyOverrides}
                                  value={(v as any).eurPrice ?? 0} 
                                  onChange={(e) => updateVariant(v.id, "eurPrice", Number(e.target.value))}
                                  className={`w-full bg-white border border-slate-200 rounded-2xl py-4 pl-10 pr-6 text-[11px] text-slate-900 focus:border-cyan-500/50 outline-none transition-all font-mono font-bold ${!formData.manualCurrencyOverrides ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`}
                                />
                             </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/60 items-center">
                          <div className="space-y-3">
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Edition Image Selection</label>
                            <div className="flex gap-4 items-center">
                              {v.photoUrl && (
                                <img
                                  src={v.photoUrl}
                                  alt="Variant Preview"
                                  className="w-10 h-12 object-cover rounded-lg border border-slate-200 bg-white"
                                />
                              )}
                              <div className="flex-1 space-y-2">
                                <select
                                  value={v.photoUrl || ""}
                                  onChange={(e) => updateVariant(v.id, "photoUrl", e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-[11px] text-slate-700 focus:border-cyan-500/50 outline-none transition-all font-bold"
                                >
                                  <option value="">-- No variant image --</option>
                                  {(formData.photos || []).map((p: any, idx: number) => (
                                    <option key={p.id || idx} value={p.url}>
                                      Photo {idx + 1} ({p.altText || "No Alt"})
                                    </option>
                                  ))}
                                </select>
                                <input
                                  placeholder="Manual URL Override..."
                                  value={v.photoUrl || ""}
                                  onChange={(e) => updateVariant(v.id, "photoUrl", e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-[10px] text-slate-700 focus:border-cyan-500/50 outline-none transition-all"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button" 
                          onClick={() => removeVariant(v.id)} 
                          className="absolute -right-3 -top-3 p-2.5 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all border border-red-200 opacity-0 group-hover:opacity-100 shadow-md z-10 cursor-pointer flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {formData.variants.length === 0 && (
                      <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] gap-3 group hover:border-cyan-500/20 transition-all bg-slate-50/50">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-cyan-500 transition-colors">
                          <Plus size={16} />
                        </div>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">No special editions defined. Base pricing and stock will apply.</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </section>

          {/* Section: Digital Asset Delivery (Conditional) */}
          {["E-book (PDF)", "E-book (EPUB)", "Audiobook"].includes(formData.format) && (
            <section className="bg-violet-50/40 rounded-[2rem] p-8 border border-violet-100 space-y-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.01] to-transparent pointer-events-none" />
              <div className="relative z-10">
                <h4 className="text-xs font-black tracking-[0.4em] text-violet-600 uppercase mb-4 pb-4 border-b border-violet-100">Secure Digital File</h4>
                <div className="space-y-6">
                  <p className="text-[9px] text-slate-500 leading-relaxed uppercase tracking-wider">
                    Upload the primary digital book file here. This file is stored securely and delivered to paying customers.
                  </p>
                  {formData.digitalFileName ? (
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Digital File</p>
                        <p className="text-xs font-mono text-violet-600 font-bold truncate max-w-[200px]">{formData.digitalFileName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((prev: any) => ({ ...prev, digitalFileName: "", digitalFileUrl: "" }))}
                        className="p-2.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-xl transition-all border border-red-100 shadow-sm cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        ref={digitalFileInputRef}
                        onChange={handleDigitalUpload}
                        accept={formData.format.includes("PDF") ? ".pdf" : formData.format.includes("EPUB") ? ".epub" : ".mp3,.m4a,.zip"}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => digitalFileInputRef.current?.click()}
                        disabled={uploadingDigital}
                        className="w-full h-28 flex flex-col items-center justify-center border-2 border-dashed border-violet-200 rounded-2xl gap-3 bg-white hover:bg-violet-50/50 transition-all group cursor-pointer"
                      >
                        {uploadingDigital ? (
                          <Loader2 size={20} className="animate-spin text-violet-500" />
                        ) : (
                          <Upload size={20} className="text-slate-400 group-hover:text-violet-500 transition-colors" />
                        )}
                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] group-hover:text-violet-600 transition-colors">
                          {uploadingDigital ? "UPLOADING FILE..." : "UPLOAD DIGITAL BOOK FILE"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="bg-white border border-[#EBEAEF] rounded-[2rem] p-8 shadow-sm space-y-8 relative overflow-hidden text-slate-800">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h4 className="text-xs font-black tracking-[0.4em] text-slate-400 uppercase mb-8 pb-4 border-b border-slate-100">Categories</h4>
              <div className="flex flex-wrap gap-4">
                {Array.from(new Set([...categories, "Photography", "Contemporary", "Artist Book", "Zine", "Archive"])).map(cat => {
                  const isSelected = Array.isArray(formData.categories) && formData.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-6 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {String(cat).toUpperCase()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Tags</label>
                  <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-1 ml-1">Searchable keywords. Comma-separated.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(Array.isArray(formData.tags) ? formData.tags : []).map((tag: string) => (
                    <span key={tag} className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-black text-emerald-600 tracking-widest">
                      {tag.toUpperCase()}
                      <button
                        type="button"
                        onClick={() => setFormData((prev: any) => ({ ...prev, tags: (prev.tags || []).filter((t: string) => t !== tag) }))}
                        className="w-4 h-4 rounded-md flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type a tag and press Enter or comma..."
                  onKeyDown={(e) => {
                    const target = e.target as HTMLInputElement;
                    if ((e.key === "Enter" || e.key === ",") && target.value.trim()) {
                      e.preventDefault();
                      const newTags = target.value.split(",").map(t => t.trim()).filter(Boolean);
                      setFormData((prev: any) => {
                        const existing = Array.isArray(prev.tags) ? prev.tags : [];
                        const merged = Array.from(new Set([...existing, ...newTags]));
                        return { ...prev, tags: merged };
                      });
                      target.value = "";
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-800 focus:border-emerald-500/50 outline-none transition-all font-semibold"
                />
              </div>
            </div>
          </section>

          <section className="bg-white border border-[#EBEAEF] rounded-[2rem] p-8 shadow-sm space-y-8 relative overflow-hidden text-slate-800">
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h4 className="text-xs font-black tracking-[0.4em] text-slate-400 uppercase mb-8 pb-4 border-b border-slate-100">Search Engine Listing (SEO)</h4>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Meta Title</label>
                  <input
                    name="metaTitle"
                    value={formData.metaTitle || ""}
                    onChange={handleChange}
                    maxLength={70}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-sky-500/50 outline-none transition-all font-semibold"
                    placeholder={formData.title || "Search engine title"}
                  />
                  <p className="text-[8px] text-slate-400 uppercase tracking-widest ml-1">{(formData.metaTitle || "").length}/70 characters</p>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Meta Description</label>
                  <textarea
                    name="metaDescription"
                    value={formData.metaDescription || ""}
                    onChange={handleChange}
                    rows={3}
                    maxLength={160}
                    className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-4 px-6 text-xs text-slate-800 focus:border-sky-500/50 outline-none transition-all leading-relaxed placeholder:text-slate-400 font-semibold"
                    placeholder="Short summary that appears in search results"
                  />
                  <p className="text-[8px] text-slate-400 uppercase tracking-widest ml-1">{(formData.metaDescription || "").length}/160 characters</p>
                </div>

                <div className="p-6 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Search Listing Preview</p>
                  <p className="text-sky-600 text-xs font-mono truncate">/books/{formData.slug || "your-book"}</p>
                  <p className="text-slate-900 text-sm font-bold truncate">{formData.metaTitle || formData.title || "Your book title"}</p>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{formData.metaDescription || formData.description || "Your book description will appear here."}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Imagery & Commerce */}
        <div className="space-y-12">
          <section className="bg-white border border-[#EBEAEF] rounded-[2rem] p-8 shadow-sm space-y-8 relative overflow-hidden text-slate-800">
            <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h4 className="text-xs font-black tracking-[0.4em] text-slate-400 uppercase mb-8 pb-4 border-b border-slate-100">Book Cover Images</h4>
              
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-2 gap-4 mb-8">
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
                      className="aspect-[3/4] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-violet-500/30 hover:bg-violet-50/50 hover:text-slate-600 transition-all disabled:opacity-50 group cursor-pointer"
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                           <div className="w-6 h-6 border-2 border-slate-250 border-t-violet-500 rounded-full animate-spin" />
                           <span className="text-[8px] tracking-[0.2em] font-black uppercase">Ingesting...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                            <Upload size={18} className="text-violet-500" />
                          </div>
                          <span className="text-[8px] tracking-[0.2em] font-black uppercase">Upload Cover</span>
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1">Add Image from URL</label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={photoInput} 
                    onChange={(e) => setPhotoInput(e.target.value)}
                    placeholder="https://cloud.assets.com/img.jpg"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-800 focus:border-violet-500/50 outline-none transition-all font-mono font-semibold"
                  />
                  <button 
                    type="button" 
                    onClick={addPhoto}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 text-violet-500 transition-all cursor-pointer shadow-sm flex items-center justify-center"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <p className="text-[8px] text-slate-400 uppercase tracking-widest text-center mt-2">Supports web URLs and direct image links</p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-[#EBEAEF] rounded-[2rem] p-8 shadow-sm space-y-8 relative overflow-hidden text-slate-800">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h4 className="text-xs font-black tracking-[0.4em] text-slate-400 uppercase mb-8 pb-4 border-b border-slate-100">Pricing & Inventory</h4>
              <div className="space-y-8">
                
                {/* Manual Pricing Overrides Toggle */}
                <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] block">Override Pricing</label>
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest">Manually enter USD & EUR values</p>
                      </div>
                      <input
                        type="checkbox"
                        name="manualCurrencyOverrides"
                        checked={formData.manualCurrencyOverrides}
                        onChange={handleChange}
                        className="w-6 h-6 rounded-lg bg-white border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                   </div>
                </div>

                {/* Base Retail Price Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] block ml-1">Price (CAD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        name="retailPrice"
                        min={0}
                        step="0.01"
                        value={formData.retailPrice ?? 0}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-8 pr-4 text-xs text-slate-900 focus:border-amber-500/50 outline-none transition-all font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] block ml-1">Price (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        name="usdPrice"
                        min={0}
                        step="0.01"
                        disabled={!formData.manualCurrencyOverrides}
                        value={formData.usdPrice ?? 0}
                        onChange={handleChange}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-8 pr-4 text-xs text-slate-900 focus:border-amber-500/50 outline-none transition-all font-mono font-bold ${!formData.manualCurrencyOverrides ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] block ml-1">Price (EUR)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                      <input
                        type="number"
                        name="eurPrice"
                        min={0}
                        step="0.01"
                        disabled={!formData.manualCurrencyOverrides}
                        value={formData.eurPrice ?? 0}
                        onChange={handleChange}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-8 pr-4 text-xs text-slate-900 focus:border-amber-500/50 outline-none transition-all font-mono font-bold ${!formData.manualCurrencyOverrides ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Base Cost Price Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] block ml-1">Cost (CAD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        name="costPrice"
                        min={0}
                        step="0.01"
                        value={formData.costPrice ?? 0}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-8 pr-4 text-xs text-slate-900 focus:border-amber-500/50 outline-none transition-all font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] block ml-1">Cost (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        name="usdCostPrice"
                        min={0}
                        step="0.01"
                        disabled={!formData.manualCurrencyOverrides}
                        value={formData.usdCostPrice ?? 0}
                        onChange={handleChange}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-8 pr-4 text-xs text-slate-900 focus:border-amber-500/50 outline-none transition-all font-mono font-bold ${!formData.manualCurrencyOverrides ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] block ml-1">Cost (EUR)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                      <input
                        type="number"
                        name="eurCostPrice"
                        min={0}
                        step="0.01"
                        disabled={!formData.manualCurrencyOverrides}
                        value={formData.eurCostPrice ?? 0}
                        onChange={handleChange}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-8 pr-4 text-xs text-slate-900 focus:border-amber-500/50 outline-none transition-all font-mono font-bold ${!formData.manualCurrencyOverrides ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">
                      Stock Level {formData.variants?.length > 0 && "(Editions)"}
                    </label>
                    <input 
                      type="number" 
                      name="stockLevel" 
                      value={formData.stockLevel} 
                      onChange={handleChange} 
                      disabled={formData.variants?.length > 0}
                      className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm text-slate-900 focus:border-amber-500/50 outline-none transition-all font-mono font-bold ${formData.variants?.length > 0 ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`} 
                    />
                  </div>
                </div>

                <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] block">Charge Tax</label>
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest">Apply sales tax at checkout</p>
                      </div>
                      <input
                        type="checkbox"
                        name="chargeTax"
                        checked={!!formData.chargeTax}
                        onChange={handleChange}
                        className="w-6 h-6 rounded-lg bg-white border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                   </div>
                </div>

                <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] block">Track Inventory</label>
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest">Decrement stock on each sale</p>
                      </div>
                      <input
                        type="checkbox"
                        name="trackInventory"
                        checked={!!formData.trackInventory}
                        onChange={handleChange}
                        className="w-6 h-6 rounded-lg bg-white border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                   </div>
                   {formData.trackInventory && (
                     <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-200">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] block">Allow Backorders</label>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest">Continue selling when out of stock</p>
                        </div>
                        <input
                          type="checkbox"
                          name="allowBackorder"
                          checked={!!formData.allowBackorder}
                          onChange={handleChange}
                          className="w-6 h-6 rounded-lg bg-white border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        />
                     </div>
                   )}
                </div>

                {/* On Sale Section */}
                <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] block">On Sale</label>
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest">Toggle promotional pricing</p>
                      </div>
                      <input
                        type="checkbox"
                        name="isOnSale"
                        checked={formData.isOnSale}
                        onChange={handleChange}
                        className="w-6 h-6 rounded-lg bg-white border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                   </div>
                   {formData.isOnSale && (
                     <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-200 animate-in slide-in-from-top-4 duration-300">
                       <div className="space-y-3">
                         <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] block ml-1">Sale (CAD)</label>
                         <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                           <input 
                             type="number" 
                             name="salePrice" 
                             value={formData.salePrice} 
                             onChange={handleChange} 
                             className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-8 pr-4 text-xs text-slate-900 focus:border-amber-500/50 outline-none transition-all font-mono font-bold" 
                           />
                         </div>
                       </div>
                       <div className="space-y-3">
                         <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] block ml-1">Sale (USD)</label>
                         <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                           <input 
                             type="number" 
                             name="usdSalePrice" 
                             disabled={!formData.manualCurrencyOverrides}
                             value={formData.usdSalePrice} 
                             onChange={handleChange} 
                             className={`w-full bg-white border border-slate-200 rounded-2xl py-4 pl-8 pr-4 text-xs text-slate-900 focus:border-amber-500/50 outline-none transition-all font-mono font-bold ${!formData.manualCurrencyOverrides ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`} 
                           />
                         </div>
                       </div>
                       <div className="space-y-3">
                         <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] block ml-1">Sale (EUR)</label>
                         <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                           <input 
                             type="number" 
                             name="eurSalePrice" 
                             disabled={!formData.manualCurrencyOverrides}
                             value={formData.eurSalePrice} 
                             onChange={handleChange} 
                             className={`w-full bg-white border border-slate-200 rounded-2xl py-4 pl-8 pr-4 text-xs text-slate-900 focus:border-amber-500/50 outline-none transition-all font-mono font-bold ${!formData.manualCurrencyOverrides ? 'opacity-60 bg-slate-100 cursor-not-allowed' : ''}`} 
                           />
                         </div>
                       </div>
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Shipping Profile</label>
                    <select 
                      name="shippingProfileId" 
                      value={formData.shippingProfileId} 
                      onChange={handleChange} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-xs text-slate-900 focus:border-amber-500/50 outline-none transition-all appearance-none cursor-pointer font-semibold"
                    >
                      {shippingProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block ml-1">Status</label>
                    <select 
                      name="status" 
                      value={formData.status} 
                      onChange={handleChange} 
                      className={`w-full border rounded-2xl py-4 px-6 text-xs font-black tracking-widest outline-none transition-all appearance-none cursor-pointer ${
                        formData.status === 'published' 
                          ? 'bg-emerald-55 text-emerald-600 border-emerald-200' 
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
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
