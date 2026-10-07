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
  Loader2,
  Copy,
  RefreshCw,
  GripVertical
} from "lucide-react";
import { motion } from "motion/react";
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
import { normalizeCategories, parentOf } from "../features/site/navItems";
import { Book, Variant } from "../features/site/types";
import { useCurrency } from "../CurrencyContext";
import { ConfirmDialog, SectionCard, TextField, TextArea, SelectField, Toggle, StatusBadge, Tabs } from "./riso/components";
import { prepareProductImage } from "./prepareImage";

import { BookSeoPane } from "./BookSeoPane";

type BookTab = "details" | "media" | "pricing" | "inventory" | "editions" | "organize" | "seo";

function SortablePhoto({ photo, index, onRemove, onAlt, onMakeCover }: {
  photo: any; index: number; onRemove: (id: string) => void; onAlt: (id: string, alt: string) => void; onMakeCover: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : 1, opacity: isDragging ? 0.6 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="be-photo">
      <div className="be-photo-img">
        <img src={photo.url} alt={photo.altText || ""} />
        <span className="be-photo-badge">{index === 0 ? "Cover" : `Image ${index + 1}`}</span>
        <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} className="be-photo-grip" aria-label={`Reorder image ${index + 1}`}><GripVertical size={16} aria-hidden /></button>
      </div>
      <input className="rp-input" aria-label={`Alt text for image ${index + 1}`} placeholder="Alt text" value={photo.altText || ""} onChange={(e) => onAlt(photo.id, e.target.value)} />
      <div className="be-photo-actions">
        {index !== 0 && <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => onMakeCover(photo.id)}>Make cover</button>}
        <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => onRemove(photo.id)}><Trash2 size={13} aria-hidden /> Remove</button>
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
  const [recommendationCatalog, setRecommendationCatalog] = useState<any[]>([]);
  const [recommendationError, setRecommendationError] = useState(false);
  const [recommendationSearch, setRecommendationSearch] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryDefinitions, setCategoryDefinitions] = useState<any[]>([]);
  // Sub-category name → its parent's name (Studio › Menus › Shop categories › "Sits under").
  const [categoryParents, setCategoryParents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoInput, setPhotoInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const digitalFileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<BookTab>("details");
  const [dragOver, setDragOver] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryParent, setNewCategoryParent] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const saveRef = useRef<() => void>(() => {});

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
    adminApi.getAllBooks().then(setRecommendationCatalog).catch(() => setRecommendationError(true));
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
      
      // Draft first so categories just added in Studio › Menus › Shop categories show up before publishing.
      const siteCats = settings?.draftDesign?.categories || settings?.design?.categories || CATEGORIES;
      const all = normalizeCategories(Array.isArray(siteCats) ? siteCats : [...CATEGORIES]);
      setCategoryDefinitions(all);
      // PUBLICATIONS already shows every book, so it isn't something to file a book under.
      const pickable = all.filter((c: any) => c?.name && c.name !== 'PUBLICATIONS');
      setCategories(pickable.map((c: any) => c.name));
      setCategoryParents(Object.fromEntries(pickable.map((c: any) => {
        const pid = parentOf(c, all);
        return [c.name, pid ? all.find((p: any) => p.id === pid)?.name || "" : ""];
      })));

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

  const isDirty = !!initialData && JSON.stringify(formData) !== JSON.stringify(initialData);

  // Warn before the tab is closed or reloaded with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const handleClose = () => {
    if (isDirty) { setConfirmDiscard(true); return; }
    onClose();
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    // Collect every problem so the editor can list them together (not one toast at a time).
    const problems: string[] = [];
    if (formData.seoImage?.trim()) {
      try {
        if (new URL(formData.seoImage.trim()).protocol !== "https:") problems.push("Sharing image must use an HTTPS URL.");
      } catch { problems.push("Sharing image must be a valid HTTPS URL."); }
    }
    if (!formData.title.trim()) problems.push("Book title is required.");
    if (formData.retailPrice < 0) problems.push("Retail price cannot be negative.");
    if (formData.manualCurrencyOverrides) {
      if (formData.usdPrice < 0 || formData.eurPrice < 0) problems.push("Override prices cannot be negative.");
      if (formData.costPrice < 0 || formData.usdCostPrice < 0 || formData.eurCostPrice < 0) problems.push("Cost prices cannot be negative.");
      if (formData.isOnSale && (formData.usdSalePrice < 0 || formData.eurSalePrice < 0)) problems.push("Sale prices cannot be negative.");
    }
    setValidationErrors(problems);
    if (problems.length) {
      toast.error(problems.length === 1 ? problems[0] : `${problems.length} problems need fixing before this can be saved.`);
      return;
    }

    setLoading(true);
    try {
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

  saveRef.current = () => { handleSave(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveRef.current(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const uploadFiles = async (files: FileList | null) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const room = 10 - (formData.photos?.length || 0);
    if (room <= 0) { toast.error("Maximum 10 photos allowed"); return; }
    if (list.length > room) toast(`Only ${room} more image${room === 1 ? "" : "s"} fit — extra files skipped.`);
    setUploading(true);
    try {
      for (const file of list.slice(0, room)) {
        const ready = await prepareProductImage(file);
        const url = await adminApi.uploadFile(ready, `products/${Date.now()}-${ready.name}`);
        setFormData((prev: any) => ({ ...prev, photos: [...prev.photos, { url, id: Math.random().toString(36).substr(2, 9), altText: file.name.replace(/\.[^.]+$/, "") }] }));
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const commitTags = () => {
    const newTags = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (!newTags.length) { setTagInput(""); return; }
    setFormData((prev: any) => ({ ...prev, tags: Array.from(new Set([...(prev.tags || []), ...newTags])) }));
    setTagInput("");
  };

  const duplicateVariant = (id: string) => {
    setFormData((prev: any) => {
      const src = (prev.variants || []).find((v: any) => v.id === id);
      if (!src) return prev;
      return { ...prev, variants: [...prev.variants, { ...src, id: crypto.randomUUID(), name: src.name ? `${src.name} (copy)` : "", sku: src.sku ? `${src.sku}-2` : "" }] };
    });
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

  const createCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    if (categoryDefinitions.some((category) => category.name?.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      toast.error("That category already exists.");
      return;
    }
    const category = {
      id: `cat-${crypto.randomUUID()}`,
      name,
      description: "",
      showInNav: true,
      ...(newCategoryParent ? { parentId: newCategoryParent } : {}),
    };
    const next = [...categoryDefinitions, category];
    setSavingCategory(true);
    try {
      await adminApi.updateShopCategories(next);
      setCategoryDefinitions(next);
      setCategories((current) => [...current, name]);
      setCategoryParents((current) => ({
        ...current,
        [name]: newCategoryParent ? categoryDefinitions.find((item) => item.id === newCategoryParent)?.name || "" : "",
      }));
      setFormData((current: any) => ({ ...current, categories: [...new Set([...(current.categories || []), name])] }));
      setNewCategory("");
      setNewCategoryParent("");
      toast.success(`Created ${name} and assigned it to this book.`);
    } catch (error) {
      console.error("Failed to create category", error);
      toast.error("Could not create the category. Try again.");
    } finally {
      setSavingCategory(false);
    }
  };

  const set = (name: string, value: any) => setFormData((prev: any) => ({ ...prev, [name]: value }));
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const num = (n: any) => Number(n) || 0;
  const fmt = (n: any) => num(n).toFixed(2);
  const overrides = !!formData.manualCurrencyOverrides;
  const hasVariants = (formData.variants || []).length > 0;
  const isDigital = ["E-book (PDF)", "E-book (EPUB)", "Audiobook"].includes(formData.format);
  const activePrice = formData.isOnSale && num(formData.salePrice) > 0 ? num(formData.salePrice) : num(formData.retailPrice);
  const marginPct = activePrice > 0 ? ((activePrice - num(formData.costPrice)) / activePrice) * 100 : 0;
  const salePct = formData.isOnSale && num(formData.retailPrice) > 0 ? Math.round((1 - num(formData.salePrice) / num(formData.retailPrice)) * 100) : 0;
  const cover = formData.photos?.[0]?.url as string | undefined;
  const isbnDigits = String(formData.isbn || "").replace(/[^0-9Xx]/g, "");
  const isbnWarn = isbnDigits && ![10, 13].includes(isbnDigits.length) ? "ISBNs are 10 or 13 characters long." : undefined;
  const lowStock = formData.trackInventory && !hasVariants && num(formData.stockLevel) <= 3;

  const checklist = [
    { label: "Title", ok: !!formData.title?.trim(), tab: "details" as BookTab },
    { label: "Description", ok: (formData.description || "").trim().length >= 40, tab: "details" as BookTab },
    { label: "Cover image", ok: (formData.photos || []).length > 0, tab: "media" as BookTab },
    { label: "Price above $0", ok: num(formData.retailPrice) > 0 || (formData.variants || []).some((v: any) => num(v.price) > 0), tab: "pricing" as BookTab },
    { label: "ISBN or SKU", ok: !!(formData.isbn || formData.sku), tab: "details" as BookTab },
    { label: "Category", ok: (formData.categories || []).length > 0, tab: "organize" as BookTab },
    { label: "Search description", ok: !!formData.metaDescription, tab: "seo" as BookTab },
  ];
  const doneCount = checklist.filter((c) => c.ok).length;
  const tabIssues: Record<BookTab, number> = { details: 0, media: 0, pricing: 0, inventory: 0, editions: 0, organize: 0, seo: 0 };
  checklist.filter((c) => !c.ok).forEach((c) => { tabIssues[c.tab] += 1; });
  const tabs: Array<{ id: BookTab; label: string; count?: number }> = [
    { id: "details", label: "Details", count: tabIssues.details || undefined },
    { id: "media", label: "Images", count: (formData.photos || []).length },
    { id: "pricing", label: "Pricing", count: tabIssues.pricing || undefined },
    { id: "inventory", label: "Inventory & shipping" },
    { id: "editions", label: "Editions", count: (formData.variants || []).length },
    { id: "organize", label: "Categories & tags", count: tabIssues.organize || undefined },
    { id: "seo", label: "Search (SEO)", count: tabIssues.seo || undefined },
  ];
  const statusTone = formData.status === "published" ? "success" : formData.status === "archived" ? "neutral" : "warning";

  const money = (label: string, name: string, symbol: string, opts: { disabled?: boolean; hint?: string } = {}) => (
    <div className="be-money">
      <span className="be-money-sym" aria-hidden>{symbol}</span>
      <TextField label={label} type="number" min={0} step="0.01" name={name} value={formData[name] ?? 0}
        onChange={handleChange} disabled={opts.disabled} hint={opts.hint} />
    </div>
  );

  const stockBadge = (n: number) => (n <= 0 ? <StatusBadge tone="danger">Out of stock</StatusBadge> : n <= 3 ? <StatusBadge tone="warning">Low: {n}</StatusBadge> : <StatusBadge tone="success">{n} in stock</StatusBadge>);

  return (
    <div className="book-editor-riso w-full h-full flex flex-col relative overflow-hidden">
      <header className="rp-dialog-head be-head shrink-0">
        <div className="flex items-center gap-4">
          <button type="button" onClick={handleClose} className="rp-icon-btn" aria-label="Close book editor"><ArrowLeft size={18} aria-hidden /></button>
          <div className="be-title-block">
            <h2 className="rp-dialog-title">{formData.title?.trim() || (book ? "Edit book" : "New book")}</h2>
            <span className="be-id">
              {book ? `Product ID: ${book.id}` : "New book"} · <StatusBadge tone={statusTone as any}>{formData.status}</StatusBadge>
              {isDirty && <span className="be-dirty"> · Unsaved changes</span>}
            </span>
          </div>
        </div>
        <div className="be-actions">
          {book && (book.slug || formData.slug) && (
            <a
              href={`${import.meta.env.BASE_URL}books/${encodeURIComponent(book.id)}?preview=true`}
              target="_blank"
              rel="noreferrer"
              title={book.slug && book.slug !== formData.slug ? "Opens with the last-saved slug. Save to update the live URL." : "Opens the public page in a new tab. Edits broadcast live."}
              className="rp-btn rp-btn-secondary rp-btn-sm"
            >
              <ExternalLink size={14} aria-hidden /> Preview page
            </a>
          )}
          <button type="button" onClick={handleClose} className="rp-btn rp-btn-ghost rp-btn-sm">Cancel</button>
          <button type="button" onClick={() => handleSave()} disabled={loading} className="rp-btn rp-btn-primary rp-btn-sm" title="Ctrl/⌘ + S">
            {loading ? <><Loader2 size={14} className="animate-spin" aria-hidden /> Saving…</> : <><Save size={14} aria-hidden /> Save book</>}
          </button>
        </div>
      </header>

      {validationErrors.length > 0 && (
        <div role="alert" className="be-alert">
          <strong>⚠ Fix {validationErrors.length === 1 ? "this" : "these"} before saving:</strong>
          <ul className="mt-2 list-disc pl-5">{validationErrors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}
      <ConfirmDialog open={confirmDiscard} appearance="light" title="Discard unsaved changes?" confirmLabel="Discard changes"
        message="You have edits that haven't been saved. Closing now will lose them."
        onConfirm={() => { setConfirmDiscard(false); onClose(); }} onCancel={() => setConfirmDiscard(false)} />

      <div className="be-tabbar shrink-0">
        <Tabs label="Book editor sections" tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="be-body custom-scrollbar flex-1">
        <form className="be-main" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {tab === "details" && (
            <>
              <SectionCard title="Book details" description="The essentials shoppers see first.">
                <div className="be-grid">
                  <div className="be-span-2"><TextField label="Book title" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Find Still Catches Me Shifted" required /></div>
                  <SelectField label="Author (linked profile)" name="authorId" value={formData.authorId || ""} onChange={handleChange} hint="Optional. Links this book to an author page.">
                    <option value="">— None —</option>
                    {authors.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </SelectField>
                  <TextField label="Author / contributors (display)" name="subtitle" value={formData.subtitle} onChange={handleChange} placeholder="e.g. Zoe Moss, Lucia Bellemare" />
                  <div className="be-span-2">
                    <TextField label="Web address (URL slug)" name="slug" value={formData.slug} onChange={handleChange} placeholder="the-book-slug"
                      hint={`/books/${formData.slug || "your-book"}`} />
                    <div className="be-inline-actions">
                      <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => set("slug", slugify(formData.title || ""))}><RefreshCw size={13} aria-hidden /> Regenerate from title</button>
                      <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}${import.meta.env.BASE_URL}books/${formData.slug}`); toast.success("Link copied"); }} disabled={!formData.slug}><Copy size={13} aria-hidden /> Copy link</button>
                    </div>
                  </div>
                  <div className="be-span-2">
                    <TextArea label="Description" name="description" value={formData.description} onChange={handleChange} rows={9}
                      placeholder="Blurb, contents, notes on the edition…" hint={`${(formData.description || "").trim().split(/\s+/).filter(Boolean).length} words`} />
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Publishing details" description="Bibliographic data used on the product page and in search.">
                <div className="be-grid be-grid-3">
                  <TextField label="ISBN" name="isbn" value={formData.isbn} onChange={handleChange} placeholder="978-0-…" error={isbnWarn} />
                  <TextField label="SKU" name="sku" value={formData.sku} onChange={handleChange} placeholder="LM-2024-…" />
                  <TextField label="Barcode / UPC" name="barcode" value={formData.barcode || ""} onChange={handleChange} placeholder="0-00000-00000-0" />
                  <SelectField label="Format" name="format" value={formData.format} onChange={handleChange}>
                    {["Paperback", "Hardcover", "Special Edition", "Box Set", "Zine", "E-book (PDF)", "E-book (EPUB)", "Audiobook"].map((f) => <option key={f}>{f}</option>)}
                  </SelectField>
                  <TextField label="Publisher" name="publisher" value={formData.publisher || ""} onChange={handleChange} placeholder="Lyricalmyrical Books" />
                  <TextField label="Edition" name="edition" value={formData.edition || ""} onChange={handleChange} placeholder="First Edition" />
                  <TextField label="Publication date" type="date" name="publishDate" value={formData.publishDate || ""} onChange={handleChange} />
                  <TextField label="Page count" type="number" min={0} name="pageCount" value={formData.pageCount ?? 0} onChange={handleChange} />
                  <TextField label="Language" name="language" value={formData.language || ""} onChange={handleChange} placeholder="English" />
                  <TextField label="Dimensions" name="dimensions" value={formData.dimensions || ""} onChange={handleChange} placeholder="6 x 9 in" />
                  <TextField label="Weight" name="weight" value={formData.weight || ""} onChange={handleChange} placeholder="450 g" hint="Used for weight-based shipping." />
                </div>
              </SectionCard>
            </>
          )}

          {tab === "media" && (
            <SectionCard title="Book images" description="Drag the ⠿ handle to reorder. The first image is the cover shown in the shop and search."
              actions={<button type="button" className="rp-btn rp-btn-secondary rp-btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || formData.photos.length >= 10}><Upload size={14} aria-hidden /> Upload images</button>}>
              <div className={`be-drop ${dragOver ? "is-over" : ""}`}
                onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragOver(true); } }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <div className="be-photos">
                    <SortableContext items={formData.photos.map((p: any) => p.id)} strategy={rectSortingStrategy}>
                      {formData.photos.map((photo: any, i: number) => (
                        <SortablePhoto key={photo.id} photo={photo} index={i} onRemove={removePhoto}
                          onAlt={(id, alt) => setFormData((prev: any) => ({ ...prev, photos: prev.photos.map((p: any) => (p.id === id ? { ...p, altText: alt } : p)) }))}
                          onMakeCover={(id) => setFormData((prev: any) => { const p = prev.photos.find((x: any) => x.id === id); return { ...prev, photos: [p, ...prev.photos.filter((x: any) => x.id !== id)] }; })} />
                      ))}
                    </SortableContext>
                    {formData.photos.length < 10 && (
                      <button type="button" className="be-photo-add" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <Upload size={22} aria-hidden />}
                        <span>{uploading ? "Uploading…" : "Add or drop images"}</span>
                      </button>
                    )}
                  </div>
                </DndContext>
              </div>
              <input type="file" ref={fileInputRef} multiple onChange={(e) => uploadFiles(e.target.files)} accept="image/*" className="hidden" />
              <p className="be-note">{formData.photos.length}/10 images. Add alt text so the cover is described to screen readers and search engines.</p>
              <div className="be-url-row">
                <TextField label="Add image from URL" value={photoInput} onChange={(e) => setPhotoInput(e.target.value)} placeholder="https://…/cover.jpg"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhoto(); } }} />
                <button type="button" onClick={addPhoto} className="rp-btn rp-btn-secondary"><Plus size={16} aria-hidden /> Add</button>
              </div>
            </SectionCard>
          )}

          {tab === "pricing" && (
            <>
              <SectionCard title="Price" description="Enter the CAD price. Shoppers who pick USD or EUR see, and are charged, the CAD price converted at today's exchange rate. The USD/EUR figures below are for your reference only.">
                <div className="be-toggles"><Toggle label="Edit reference USD & EUR prices" checked={overrides} onChange={(v) => set("manualCurrencyOverrides", v)} /></div>
                <div className="be-grid be-grid-3">
                  {money("Price (CAD)", "retailPrice", "$")}
                  {money("Price (USD)", "usdPrice", "$", { disabled: !overrides })}
                  {money("Price (EUR)", "eurPrice", "€", { disabled: !overrides })}
                  {money("Cost (CAD)", "costPrice", "$", { hint: "What it costs you to print/acquire." })}
                  {money("Cost (USD)", "usdCostPrice", "$", { disabled: !overrides })}
                  {money("Cost (EUR)", "eurCostPrice", "€", { disabled: !overrides })}
                </div>
                <div className="be-stats">
                  <div><span>Profit / copy</span><strong>${fmt(activePrice - num(formData.costPrice))}</strong></div>
                  <div><span>Margin</span><strong>{activePrice > 0 ? `${marginPct.toFixed(0)}%` : "—"}</strong></div>
                  <div><span>Charge tax</span><Toggle label="Charge sales tax" checked={!!formData.chargeTax} onChange={(v) => set("chargeTax", v)} /></div>
                </div>
                {activePrice > 0 && num(formData.costPrice) > activePrice && <p className="be-warn" role="status">⚠ Cost is higher than the selling price — you'd lose money on each copy.</p>}
              </SectionCard>
              <SectionCard title="Sale pricing" description="Show a struck-through original price with a discounted one.">
                <Toggle label="This book is on sale" checked={!!formData.isOnSale} onChange={(v) => set("isOnSale", v)} />
                {formData.isOnSale && (
                  <>
                    <div className="be-grid be-grid-3 mt-4">
                      {money("Sale (CAD)", "salePrice", "$")}
                      {money("Sale (USD)", "usdSalePrice", "$", { disabled: !overrides })}
                      {money("Sale (EUR)", "eurSalePrice", "€", { disabled: !overrides })}
                    </div>
                    <div className="be-inline-actions">
                      {[10, 20, 30, 50].map((p) => (
                        <button key={p} type="button" className="rp-btn rp-btn-secondary rp-btn-sm" onClick={() => set("salePrice", Number((num(formData.retailPrice) * (1 - p / 100)).toFixed(2)))}>{p}% off</button>
                      ))}
                      {salePct > 0 && <StatusBadge tone="success">{salePct}% off</StatusBadge>}
                    </div>
                    {num(formData.salePrice) >= num(formData.retailPrice) && <p className="be-warn" role="status">⚠ The sale price isn't lower than the regular price.</p>}
                  </>
                )}
              </SectionCard>
            </>
          )}

          {tab === "inventory" && (
            <>
              <SectionCard title="Inventory" description={hasVariants ? "Stock is totalled from your editions." : "Track how many copies you have."}>
                <div className="be-toggles">
                  <Toggle label="Track inventory (decrement stock on each sale)" checked={!!formData.trackInventory} onChange={(v) => set("trackInventory", v)} />
                  {formData.trackInventory && <Toggle label="Allow backorders when out of stock" checked={!!formData.allowBackorder} onChange={(v) => set("allowBackorder", v)} />}
                </div>
                <div className="be-grid be-grid-3">
                  <TextField label={`Stock level${hasVariants ? " (from editions)" : ""}`} type="number" name="stockLevel" value={formData.stockLevel} onChange={handleChange} disabled={hasVariants} />
                  <div className="be-stock-status">{formData.trackInventory && stockBadge(num(formData.stockLevel))}</div>
                  <TextField label="Shelf location" name="shelfLocation" value={formData.shelfLocation || ""} onChange={handleChange} placeholder="e.g. B2 or Box 4" hint="Shown next to this book on the packing checklist." />
                </div>
                {lowStock && <p className="be-warn" role="status">⚠ Low stock. Consider reprinting or turning on backorders.</p>}
              </SectionCard>
              <SectionCard title="Shipping & visibility">
                <div className="be-grid">
                  <SelectField label="Shipping profile" name="shippingProfileId" value={formData.shippingProfileId} onChange={handleChange}>
                    {shippingProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </SelectField>
                  <SelectField label="Status" name="status" value={formData.status} onChange={handleChange} hint="Only Published books appear in the shop.">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </SelectField>
                  <TextField label="Schedule publish date" type="date" name="scheduleDate" value={formData.scheduleDate || ""} onChange={handleChange} hint="Optional. Leave blank to publish when you save." />
                  <div className="be-toggles be-self-end"><Toggle label="Featured on the homepage" checked={!!formData.isFeatured} onChange={(v) => set("isFeatured", v)} /></div>
                </div>
              </SectionCard>
              {isDigital && (
                <SectionCard title="Secure digital file" description="Stored securely and delivered to paying customers only.">
                  {formData.digitalFileName ? (
                    <div className="be-file">
                      <div><span className="be-label-xs">Active file</span><code>{formData.digitalFileName}</code></div>
                      <button type="button" className="rp-btn rp-btn-secondary rp-btn-sm" onClick={() => setFormData((prev: any) => ({ ...prev, digitalFileName: "", digitalFileUrl: "" }))}><Trash2 size={14} aria-hidden /> Remove</button>
                    </div>
                  ) : (
                    <>
                      <input type="file" ref={digitalFileInputRef} onChange={handleDigitalUpload} accept={formData.format.includes("PDF") ? ".pdf" : formData.format.includes("EPUB") ? ".epub" : ".mp3,.m4a,.zip"} className="hidden" />
                      <button type="button" className="be-photo-add be-wide" onClick={() => digitalFileInputRef.current?.click()} disabled={uploadingDigital}>
                        {uploadingDigital ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <Upload size={22} aria-hidden />}
                        <span>{uploadingDigital ? "Uploading…" : "Upload digital book file"}</span>
                      </button>
                    </>
                  )}
                </SectionCard>
              )}
            </>
          )}

          {tab === "editions" && (
            <SectionCard title="Editions & pricing" description="Sell multiple formats or special editions of the same book. Base price and stock are replaced by these."
              actions={<button type="button" onClick={addVariant} className="rp-btn rp-btn-primary rp-btn-sm"><Plus size={14} aria-hidden /> Add edition</button>}>
              {!hasVariants && <p className="be-note">No special editions. The base price and stock on the Pricing and Inventory tabs apply.</p>}
              <div className="be-variants">
                {(formData.variants || []).map((v: Variant, i: number) => (
                  <fieldset key={v.id} className="be-variant">
                    <legend>Edition {i + 1}{v.name ? ` — ${v.name}` : ""}</legend>
                    <div className="be-variant-tools">
                      {stockBadge(num(v.stock))}
                      <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => duplicateVariant(v.id)}><Copy size={13} aria-hidden /> Duplicate</button>
                      <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => removeVariant(v.id)} aria-label={`Remove edition ${v.name || i + 1}`}><Trash2 size={13} aria-hidden /> Remove</button>
                    </div>
                    <div className="be-grid be-grid-4">
                      <div className="be-span-2"><TextField label="Edition name" placeholder="e.g. Signed Collector's Copy" value={v.name} onChange={(e) => updateVariant(v.id, "name", e.target.value)} /></div>
                      <TextField label="SKU" value={v.sku || ""} onChange={(e) => updateVariant(v.id, "sku", e.target.value)} />
                      <TextField label="Weight" placeholder="0.5 kg" value={v.weight || ""} onChange={(e) => updateVariant(v.id, "weight", e.target.value)} />
                      <TextField label="Price (CAD)" type="number" min={0} step="0.01" value={v.price} onChange={(e) => updateVariant(v.id, "price", Number(e.target.value))} />
                      <TextField label="Price (USD)" type="number" min={0} step="0.01" disabled={!overrides} value={(v as any).usdPrice ?? 0} onChange={(e) => updateVariant(v.id, "usdPrice", Number(e.target.value))} />
                      <TextField label="Price (EUR)" type="number" min={0} step="0.01" disabled={!overrides} value={(v as any).eurPrice ?? 0} onChange={(e) => updateVariant(v.id, "eurPrice", Number(e.target.value))} />
                      <TextField label="Stock" type="number" min={0} value={v.stock} onChange={(e) => updateVariant(v.id, "stock", Number(e.target.value))} />
                    </div>
                    <div className="be-variant-img">
                      {v.photoUrl && <img src={v.photoUrl} alt="" />}
                      <SelectField label="Edition image" value={v.photoUrl || ""} onChange={(e) => updateVariant(v.id, "photoUrl", e.target.value)}>
                        <option value="">— Use the main image —</option>
                        {(formData.photos || []).map((p: any, idx: number) => <option key={p.id || idx} value={p.url}>Image {idx + 1}{p.altText ? ` (${p.altText})` : ""}</option>)}
                      </SelectField>
                    </div>
                  </fieldset>
                ))}
              </div>
            </SectionCard>
          )}

          {tab === "organize" && (
            <>
            <SectionCard title="Categories & tags" description="Categories build the shop menus — pick every one this book belongs in. New categories created here are published to the shop and added to Design › Menus automatically. Tags power search.">
              <div className="be-chips" role="group" aria-label="Categories">
                {categories.map((cat) => {
                  const on = (formData.categories || []).includes(cat);
                  const parent = categoryParents[cat];
                  return <button key={cat} type="button" aria-pressed={on} className={`be-chip ${on ? "is-on" : ""}`} onClick={() => toggleCategory(cat)}>{on ? "✓ " : ""}{parent ? `${parent} › ` : ""}{cat}</button>;
                })}
              </div>
              {categories.length === 0 && <p className="be-category-empty">No assignable categories yet. Create the first one below.</p>}
              <div className="be-category-create" aria-label="Create a shop category">
                <TextField label="New category" placeholder="e.g. Zines" value={newCategory} onChange={(event) => setNewCategory(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void createCategory(); } }} />
                <SelectField label="Sits under (optional)" value={newCategoryParent} onChange={(event) => setNewCategoryParent(event.target.value)}>
                  <option value="">Top-level category</option>
                  {categoryDefinitions.filter((category) => !parentOf(category, categoryDefinitions)).map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </SelectField>
                <button type="button" className="rp-btn rp-btn-secondary" disabled={!newCategory.trim() || savingCategory} onClick={() => void createCategory()}>
                  {savingCategory ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Plus size={14} aria-hidden />}
                  Create & assign
                </button>
              </div>
              <p className="be-category-help">Category changes appear on the public storefront immediately and stay in sync with the Studio designer.</p>
              <div className="be-tags">
                <span className="be-label-xs">Tags</span>
                <div className="be-chips">
                  {(formData.tags || []).map((tag: string) => (
                    <span key={tag} className="be-tag">{tag}
                      <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => setFormData((prev: any) => ({ ...prev, tags: (prev.tags || []).filter((t: string) => t !== tag) }))}><X size={12} aria-hidden /></button>
                    </span>
                  ))}
                </div>
                <TextField label="Add tags" hideLabel placeholder="Type a tag, press Enter or comma" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onBlur={commitTags}
                  onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) { e.preventDefault(); commitTags(); } }} />
              </div>
            </SectionCard>
            <SectionCard title="Curated recommendations" description="Choose up to four companion books in display order. Only published books appear to shoppers. Save this book to apply your selection.">
              <SelectField label="Recommendation source" value={Array.isArray(formData.relatedBookIds) ? "curated" : "automatic"} onChange={(event) => setFormData((prev: any) => {
                const next = { ...prev };
                if (event.target.value === "automatic") delete next.relatedBookIds;
                else next.relatedBookIds = [];
                return next;
              })}>
                <option value="automatic">Automatic category matches</option>
                <option value="curated">Publisher selection (empty hides recommendations)</option>
              </SelectField>
              {Array.isArray(formData.relatedBookIds) && <>
                <ol className="be-chips">
                  {formData.relatedBookIds.map((id: string, index: number) => {
                    const candidate = recommendationCatalog.find(item => item.id === id);
                    return <li key={id} className="be-tag">
                      <span>{index + 1}. {candidate?.title || "Unavailable book"}{candidate && candidate.status !== "published" ? " (not published)" : ""}</span>
                      <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" aria-label={`Move ${candidate?.title || "book"} up`} disabled={index === 0} onClick={() => setFormData((prev: any) => {
                        const ids = [...prev.relatedBookIds];
                        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                        return { ...prev, relatedBookIds: ids };
                      })}>Move up</button>
                      <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" aria-label={`Remove recommendation ${candidate?.title || "book"}`} onClick={() => setFormData((prev: any) => ({ ...prev, relatedBookIds: prev.relatedBookIds.filter((value: string) => value !== id) }))}>Remove</button>
                    </li>;
                  })}
                </ol>
                {recommendationError ? <p role="alert">The catalog could not be loaded. Your saved selection is preserved; reopen this editor to retry.</p> : <>
                  <TextField label="Find a companion book" value={recommendationSearch} onChange={(event) => setRecommendationSearch(event.target.value)} />
                  <SelectField label="Add recommendation" value="" disabled={formData.relatedBookIds.length >= 4} onChange={(event) => {
                    const id = event.target.value;
                    if (id) setFormData((prev: any) => ({ ...prev, relatedBookIds: [...prev.relatedBookIds, id] }));
                  }}>
                    <option value="">Choose a book</option>
                    {recommendationCatalog.filter(item => item.id !== book?.id && !formData.relatedBookIds.includes(item.id) && String(item.title || "").toLowerCase().includes(recommendationSearch.toLowerCase())).map(item => <option key={item.id} value={item.id}>{item.title}{item.status !== "published" ? " (not published)" : ""}</option>)}
                  </SelectField>
                </>}
              </>}
            </SectionCard>
            </>
          )}

          {tab === "seo" && (
            <BookSeoPane book={formData} onChange={set} />
          )}
        </form>

        <aside className="be-rail" aria-label="Book summary">
          <div className="be-rail-card">
            <div className="be-rail-cover">{cover ? <img src={cover} alt={formData.photos?.[0]?.altText || ""} /> : <span>No cover yet</span>}</div>
            <p className="be-rail-title">{formData.title?.trim() || "Untitled book"}</p>
            <p className="be-rail-sub">{formData.subtitle || "—"}</p>
            <div className="be-rail-price">
              {formData.isOnSale && num(formData.salePrice) > 0 && <s>${fmt(formData.retailPrice)}</s>}
              <strong>${fmt(activePrice)}</strong> <span>CAD</span>
            </div>
            <div className="be-rail-row"><span>Format</span><b>{formData.format}</b></div>
            <div className="be-rail-row"><span>Stock</span><b>{formData.trackInventory ? num(formData.stockLevel) : "Not tracked"}</b></div>
            <SelectField label="Status" name="status" value={formData.status} onChange={handleChange}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </SelectField>
          </div>
          <div className="be-rail-card">
            <p className="be-rail-head">Ready to publish · {doneCount}/{checklist.length}</p>
            <div className="be-progress" role="progressbar" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={doneCount}><span style={{ width: `${(doneCount / checklist.length) * 100}%` }} /></div>
            <ul className="be-check">
              {checklist.map((c) => (
                <li key={c.label} className={c.ok ? "is-ok" : ""}>
                  <button type="button" onClick={() => setTab(c.tab)}><span aria-hidden>{c.ok ? "✓" : "○"}</span> {c.label}{!c.ok && <em className="rp-sr-only"> (missing)</em>}</button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
