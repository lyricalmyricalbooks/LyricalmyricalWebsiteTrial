import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  Copy,
  Trash2,
  Image as ImageIcon,
  Palette as PaletteIcon,
  Upload,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RichTextEditor from "../components/RichTextEditor";

// ─────────────────────────────────────────────────────────────────────────────
// Section type registry — drives the Add Section library + per-type editor
// ─────────────────────────────────────────────────────────────────────────────

export type SectionTypeMeta = {
  type: string;
  label: string;
  description: string;
  category: "Layout" | "Media" | "Promo" | "Trust" | "Commerce" | "Engagement" | "Advanced";
  defaults: Record<string, any>;
  // List of block kinds (if any). e.g. Slideshow → "slide". Empty = atomic section.
  blockType?: string;
  blockDefaults?: Record<string, any>;
  blockLabel?: string;
};

export const SECTION_REGISTRY: SectionTypeMeta[] = [
  {
    type: "HeroSection",
    label: "Hero Banner",
    description: "Full-viewport hero with image, headline and CTA.",
    category: "Layout",
    defaults: {
      title: "NEW HERO",
      subtitle: "Something special",
      ctaText: "EXPLORE",
      overlayOpacity: 0.5,
      align: "center",
    },
  },
  {
    type: "FeatureGridSection",
    label: "Feature Grid",
    description: "Multi-column highlights with icons or short copy.",
    category: "Promo",
    defaults: {
      title: "FEATURE HIGHLIGHTS",
      columns: 3,
      items: [
        { title: "Free Shipping", description: "On eligible orders" },
        { title: "Curated Archive", description: "Handpicked editions" },
        { title: "Worldwide Delivery", description: "Ships internationally" },
      ],
    },
    blockType: "feature",
    blockDefaults: { title: "New feature", description: "Describe it." },
    blockLabel: "Feature",
  },
  {
    type: "TestimonialsSection",
    label: "Testimonials",
    description: "Quote cards with author + role.",
    category: "Trust",
    defaults: {
      title: "WHAT COLLECTORS SAY",
      items: [
        { quote: "Beautiful curation and packaging.", author: "A. Reader", role: "" },
        { quote: "Always find rare gems here.", author: "N. Collector", role: "" },
      ],
    },
    blockType: "testimonial",
    blockDefaults: { quote: "New testimonial", author: "Customer", role: "" },
    blockLabel: "Testimonial",
  },
  {
    type: "FAQSection",
    label: "FAQ",
    description: "Collapsible question and answer list.",
    category: "Trust",
    defaults: {
      title: "FREQUENTLY ASKED QUESTIONS",
      items: [
        { question: "Do you ship internationally?", answer: "Yes, we ship worldwide." },
        { question: "How long is delivery?", answer: "Usually 3–7 business days." },
      ],
    },
    blockType: "faq",
    blockDefaults: { question: "New question?", answer: "New answer." },
    blockLabel: "FAQ item",
  },
  {
    type: "NewsletterSection",
    label: "Newsletter",
    description: "Email capture with custom title and CTA.",
    category: "Engagement",
    defaults: {
      title: "STAY IN TOUCH",
      description: "Get our latest news.",
      placeholder: "email@example.com",
      buttonLabel: "JOIN",
    },
  },
  {
    type: "TextContentSection",
    label: "Text Content",
    description: "Headline plus paragraph copy.",
    category: "Layout",
    defaults: { title: "Our story", content: "Add your mission statement or store introduction here." },
  },
  {
    type: "ImageWithTextSection",
    label: "Image with Text",
    description: "Side-by-side image and rich copy with CTA.",
    category: "Layout",
    defaults: {
      eyebrow: "FEATURED",
      title: "About the collection",
      body: "Pair text with an image to give focus to your chosen product or collection.",
      ctaText: "Read more",
      ctaUrl: "#",
      layout: "image-left",
    },
  },
  {
    type: "RichTextSection",
    label: "Rich Text",
    description: "Free-form HTML / markdown content.",
    category: "Layout",
    defaults: {
      align: "center",
      html: "<h2>Talk to your customers</h2><p>Use this rich text section to share information about your store with your customers.</p>",
    },
  },
  {
    type: "MarqueeSection",
    label: "Scrolling Text",
    description: "Animated marquee strip of repeating text.",
    category: "Promo",
    defaults: {
      text: "Free shipping over $100 · New arrivals weekly · Independent & original",
      separator: "·",
      speed: 20,
      fontSize: 28,
      bold: true,
      uppercase: true,
      background: "",
      color: "",
    },
  },
  {
    type: "MulticolumnSection",
    label: "Multicolumn",
    description: "Reorderable columns with icon, image and link.",
    category: "Layout",
    defaults: {
      title: "Why choose us",
      columns: 3,
      items: [
        { title: "Quality", body: "Crafted with care.", imageUrl: "" },
        { title: "Service", body: "Always responsive.", imageUrl: "" },
        { title: "Story", body: "Independent and original.", imageUrl: "" },
      ],
    },
    blockType: "column",
    blockDefaults: { title: "Column heading", body: "Column body copy.", imageUrl: "", linkText: "", linkUrl: "" },
    blockLabel: "Column",
  },
  {
    type: "SlideshowSection",
    label: "Slideshow",
    description: "Image carousel with optional autoplay and CTAs per slide.",
    category: "Media",
    defaults: {
      autoplay: true,
      autoplaySpeed: 5000,
      slides: [
        { title: "Spring drop", subtitle: "Limited editions", ctaText: "Shop now", ctaUrl: "#", imageUrl: "" },
        { title: "Studio favourites", subtitle: "Hand selected", ctaText: "Explore", ctaUrl: "#", imageUrl: "" },
      ],
    },
    blockType: "slide",
    blockDefaults: {
      eyebrow: "",
      title: "New slide",
      subtitle: "",
      ctaText: "",
      ctaUrl: "#",
      imageUrl: "",
      overlayOpacity: 0.4,
      accentColor: "#ffffff",
    },
    blockLabel: "Slide",
  },
  {
    type: "VideoSection",
    label: "Video",
    description: "Embedded YouTube, Vimeo or self-hosted video.",
    category: "Media",
    defaults: { title: "Watch", videoUrl: "", posterUrl: "" },
  },
  {
    type: "LogoListSection",
    label: "Logo List",
    description: "Press, brands, or partner logos.",
    category: "Trust",
    defaults: {
      title: "AS SEEN IN",
      items: [
        { logoUrl: "", alt: "Brand A" },
        { logoUrl: "", alt: "Brand B" },
        { logoUrl: "", alt: "Brand C" },
        { logoUrl: "", alt: "Brand D" },
      ],
    },
    blockType: "logo",
    blockDefaults: { logoUrl: "", alt: "Logo" },
    blockLabel: "Logo",
  },
  {
    type: "CollapsibleSection",
    label: "Collapsible Rows",
    description: "Stacked accordion (size guide, shipping, etc.).",
    category: "Layout",
    defaults: {
      title: "Details",
      items: [
        { heading: "Materials", content: "<p>Describe materials.</p>" },
        { heading: "Shipping", content: "<p>Describe shipping.</p>" },
      ],
    },
    blockType: "row",
    blockDefaults: { heading: "New row", content: "" },
    blockLabel: "Row",
  },
  {
    type: "CollectionListSection",
    label: "Collection List",
    description: "Linked collection tiles with imagery.",
    category: "Commerce",
    defaults: {
      title: "Shop by collection",
      columns: 3,
      items: [
        { title: "Publications", subtitle: "", imageUrl: "", linkUrl: "/?catalog=true" },
        { title: "Prints", subtitle: "", imageUrl: "", linkUrl: "/?catalog=true" },
        { title: "Editions", subtitle: "", imageUrl: "", linkUrl: "/?catalog=true" },
      ],
    },
    blockType: "tile",
    blockDefaults: { title: "Collection", subtitle: "", imageUrl: "", linkUrl: "#" },
    blockLabel: "Tile",
  },
  {
    type: "FeaturedProductSection",
    label: "Featured Product",
    description: "Highlight one product with a buy CTA.",
    category: "Commerce",
    defaults: { eyebrow: "FEATURED", productSlug: "", ctaText: "View product", accentColor: "#A855F7" },
  },
  {
    type: "CountdownSection",
    label: "Countdown",
    description: "Timer to a future date with a CTA.",
    category: "Promo",
    defaults: {
      eyebrow: "LIMITED TIME",
      title: "Sale ends soon",
      subtitle: "",
      targetDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
      ctaText: "Shop the sale",
      ctaUrl: "#",
      accentColor: "#A855F7",
    },
  },
  {
    type: "ContactFormSection",
    label: "Contact Form",
    description: "Name, email, message form.",
    category: "Engagement",
    defaults: {
      title: "Get in touch",
      subtitle: "Send us a message and we'll reply soon.",
      buttonLabel: "Send message",
      showPhone: false,
    },
  },
  {
    type: "MapSection",
    label: "Map",
    description: "Embedded Google Map for an address.",
    category: "Engagement",
    defaults: { title: "Visit us", address: "Brooklyn, NY" },
  },
  {
    type: "GallerySection",
    label: "Image Gallery",
    description: "Lightboxable image grid.",
    category: "Media",
    defaults: {
      title: "Gallery",
      columns: 3,
      items: [
        { imageUrl: "", linkUrl: "" },
        { imageUrl: "", linkUrl: "" },
        { imageUrl: "", linkUrl: "" },
      ],
    },
    blockType: "image",
    blockDefaults: { imageUrl: "", linkUrl: "", alt: "" },
    blockLabel: "Image",
  },
  {
    type: "RowSection",
    label: "Row / Columns",
    description: "Pick a column split and fill each column with text, image, button or video.",
    category: "Layout",
    defaults: {
      title: "",
      layout: "50-50",
      gap: 48,
      verticalAlign: "center",
      items: [
        { kind: "text", title: "Tell your story", body: "Combine any blocks side by side — text, images, buttons or video.", buttonText: "", buttonUrl: "#" },
        { kind: "image", imageUrl: "" },
      ],
    },
    blockType: "column",
    blockDefaults: { kind: "text", title: "New column", body: "", imageUrl: "", buttonText: "", buttonUrl: "#", videoUrl: "" },
    blockLabel: "Column",
  },
  {
    type: "CustomHTMLSection",
    label: "Custom HTML / Liquid",
    description: "Drop in raw HTML, embeds or scripts.",
    category: "Advanced",
    defaults: { html: "<!-- Your custom HTML here -->", fullBleed: false },
  },
];

export function getSectionMeta(type: string): SectionTypeMeta | undefined {
  return SECTION_REGISTRY.find((s) => s.type === type);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Library Modal — categorized
// ─────────────────────────────────────────────────────────────────────────────

export type SectionPreset = {
  id: string;
  name: string;
  type: string;
  settings: Record<string, any>;
};

export function NewSectionLibraryModal({
  onAdd,
  onClose,
  presets = [],
  onAddPreset,
  onDeletePreset,
}: {
  onAdd: (type: string) => void;
  onClose: () => void;
  presets?: SectionPreset[];
  onAddPreset?: (preset: SectionPreset) => void;
  onDeletePreset?: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const categories = Array.from(new Set(SECTION_REGISTRY.map((s) => s.category)));
  const filtered = SECTION_REGISTRY.filter(
    (s) =>
      !search ||
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredPresets = presets.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-[#0c0c0e] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pt-8 pb-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-[0.4em] font-black text-violet-400 uppercase italic mb-1">Section Library</p>
              <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">Add a section</h3>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sections…"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-violet-500/50 w-64"
            />
          </div>
          <div className="overflow-y-auto p-8 space-y-8">
            {filteredPresets.length > 0 && onAddPreset && (
              <div>
                <p className="text-[10px] font-black tracking-[0.3em] text-amber-400 uppercase italic mb-3">My Presets</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="relative text-left p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 hover:border-amber-400/50 transition-all group"
                    >
                      <button
                        onClick={() => {
                          onAddPreset(preset);
                          onClose();
                        }}
                        className="text-left w-full"
                      >
                        <p className="text-white text-sm font-black uppercase tracking-tight italic mb-1 pr-6">{preset.name}</p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          Saved {getSectionMeta(preset.type)?.label || preset.type.replace("Section", "")} with your content and styling.
                        </p>
                      </button>
                      {onDeletePreset && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePreset(preset.id);
                          }}
                          title="Delete preset"
                          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {categories.map((cat) => {
              const items = filtered.filter((s) => s.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase italic mb-3">{cat}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((meta) => (
                      <button
                        key={meta.type}
                        onClick={() => {
                          onAdd(meta.type);
                          onClose();
                        }}
                        className="text-left p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
                      >
                        <p className="text-white text-sm font-black uppercase tracking-tight italic mb-1">{meta.label}</p>
                        <p className="text-slate-400 text-xs leading-relaxed">{meta.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Blocks Editor — for sections with `items` / `slides` arrays
// ─────────────────────────────────────────────────────────────────────────────

type BlockField =
  | { key: string; label: string; kind: "text" }
  | { key: string; label: string; kind: "textarea"; rows?: number }
  | { key: string; label: string; kind: "image" }
  | { key: string; label: string; kind: "html" }
  | { key: string; label: string; kind: "color" }
  | { key: string; label: string; kind: "number"; min?: number; max?: number; step?: number }
  | { key: string; label: string; kind: "select"; options: { value: string; label: string }[] };

const BLOCK_FIELDS: Record<string, BlockField[]> = {
  HeroSection: [],
  FeatureGridSection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "description", label: "Description", kind: "textarea", rows: 2 },
    { key: "icon", label: "Icon (emoji or symbol)", kind: "text" },
  ],
  TestimonialsSection: [
    { key: "quote", label: "Quote", kind: "textarea", rows: 3 },
    { key: "author", label: "Author", kind: "text" },
    { key: "role", label: "Role / company", kind: "text" },
  ],
  FAQSection: [
    { key: "question", label: "Question", kind: "text" },
    { key: "answer", label: "Answer", kind: "textarea", rows: 3 },
  ],
  MulticolumnSection: [
    { key: "imageUrl", label: "Image", kind: "image" },
    { key: "title", label: "Title", kind: "text" },
    { key: "body", label: "Body", kind: "textarea", rows: 3 },
    { key: "linkText", label: "Link label", kind: "text" },
    { key: "linkUrl", label: "Link URL", kind: "text" },
  ],
  SlideshowSection: [
    { key: "eyebrow", label: "Eyebrow", kind: "text" },
    { key: "title", label: "Headline", kind: "text" },
    { key: "subtitle", label: "Subtitle", kind: "text" },
    { key: "ctaText", label: "CTA label", kind: "text" },
    { key: "ctaUrl", label: "CTA URL", kind: "text" },
    { key: "imageUrl", label: "Background image", kind: "image" },
    { key: "overlayOpacity", label: "Overlay (0–1)", kind: "number", min: 0, max: 1, step: 0.05 },
    { key: "accentColor", label: "Accent", kind: "color" },
  ],
  LogoListSection: [
    { key: "logoUrl", label: "Logo image", kind: "image" },
    { key: "alt", label: "Alt text / fallback", kind: "text" },
  ],
  CollapsibleSection: [
    { key: "heading", label: "Heading", kind: "text" },
    { key: "content", label: "Content (HTML)", kind: "html" },
  ],
  CollectionListSection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "subtitle", label: "Subtitle", kind: "text" },
    { key: "imageUrl", label: "Image", kind: "image" },
    { key: "linkUrl", label: "Link URL", kind: "text" },
  ],
  GallerySection: [
    { key: "imageUrl", label: "Image", kind: "image" },
    { key: "linkUrl", label: "Link URL", kind: "text" },
    { key: "alt", label: "Alt text", kind: "text" },
  ],
  RowSection: [
    {
      key: "kind",
      label: "Block type",
      kind: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "image", label: "Image" },
        { value: "button", label: "Button" },
        { value: "video", label: "Video" },
      ],
    },
    { key: "title", label: "Title (text blocks)", kind: "text" },
    { key: "body", label: "Body (text blocks)", kind: "textarea", rows: 3 },
    { key: "imageUrl", label: "Image (image blocks)", kind: "image" },
    { key: "buttonText", label: "Button label", kind: "text" },
    { key: "buttonUrl", label: "Button URL", kind: "text" },
    { key: "videoUrl", label: "Video URL (video blocks)", kind: "text" },
    { key: "accentColor", label: "Accent", kind: "color" },
  ],
};

export function getBlockFields(sectionType: string): BlockField[] {
  return BLOCK_FIELDS[sectionType] || [];
}

// Keys on settings where blocks live, per section type
const BLOCKS_KEY: Record<string, string> = {
  SlideshowSection: "slides",
  // everything else uses "items"
};

export function getBlocksKey(sectionType: string): string {
  return BLOCKS_KEY[sectionType] || "items";
}

export function BlocksEditor({
  sectionType,
  settings,
  onUpdate,
  uploadFile,
}: {
  sectionType: string;
  settings: any;
  onUpdate: (newSettings: any) => void;
  uploadFile?: (file: File) => Promise<string>;
}) {
  const meta = getSectionMeta(sectionType);
  const fields = getBlockFields(sectionType);
  const blocksKey = getBlocksKey(sectionType);
  const blocks: any[] = settings[blocksKey] || [];
  const [open, setOpen] = useState<number | null>(0);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  if (!meta?.blockType || fields.length === 0) return null;

  const setBlocks = (next: any[]) => onUpdate({ [blocksKey]: next });

  const addBlock = () => {
    const next = [...blocks, { ...(meta.blockDefaults || {}) }];
    setBlocks(next);
    setOpen(next.length - 1);
  };

  const removeBlock = (idx: number) => {
    setBlocks(blocks.filter((_, i) => i !== idx));
    setOpen(null);
  };

  const duplicateBlock = (idx: number) => {
    const next = [...blocks];
    next.splice(idx + 1, 0, JSON.parse(JSON.stringify(blocks[idx])));
    setBlocks(next);
    setOpen(idx + 1);
  };

  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setBlocks(next);
    setOpen(to);
  };

  const updateBlock = (idx: number, key: string, value: any) => {
    const next = blocks.map((b, i) => (i === idx ? { ...b, [key]: value } : b));
    setBlocks(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black tracking-[0.3em] text-slate-500 uppercase">
          {meta.blockLabel}s · {blocks.length}
        </p>
      </div>

      <div className="space-y-2">
        {blocks.map((block, idx) => {
          const expanded = open === idx;
          return (
            <div
              key={idx}
              draggable
              onDragStart={() => setDraggingIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingIdx == null || draggingIdx === idx) return;
                moveBlock(draggingIdx, idx);
                setDraggingIdx(null);
              }}
              onDragEnd={() => setDraggingIdx(null)}
              className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                expanded ? "border-blue-400 shadow-lg shadow-blue-500/5" : "border-neutral-200"
              } ${draggingIdx === idx ? "opacity-50" : ""}`}
            >
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : idx)}
                className="w-full flex items-center gap-2 px-3 py-3 hover:bg-neutral-50 transition-colors"
              >
                <GripVertical size={14} className="text-neutral-300 flex-shrink-0 cursor-grab" />
                <span className={`text-[11px] font-bold truncate flex-1 text-left ${block.hidden ? "text-neutral-300 line-through" : "text-neutral-700"}`}>
                  {block.title || block.question || block.heading || block.author || block.alt || `${meta.blockLabel} ${idx + 1}`}
                </span>
                <span
                  role="button"
                  title={block.hidden ? "Show block" : "Hide block"}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateBlock(idx, "hidden", !block.hidden);
                  }}
                  className={`p-1 rounded-lg transition-colors ${block.hidden ? "text-neutral-300 hover:text-emerald-500" : "text-neutral-400 hover:text-neutral-700"}`}
                >
                  {block.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                </span>
                <ChevronDown size={13} className={`text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>

              {expanded && (
                <div className="px-3 pb-4 border-t border-neutral-100 space-y-3 bg-neutral-50/50">
                  <div className="flex items-center gap-1 pt-3">
                    <button
                      onClick={() => moveBlock(idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg hover:bg-white text-neutral-500 disabled:opacity-20"
                      title="Move up"
                    >
                      <ChevronDown size={12} className="rotate-180" />
                    </button>
                    <button
                      onClick={() => moveBlock(idx, idx + 1)}
                      disabled={idx === blocks.length - 1}
                      className="p-1.5 rounded-lg hover:bg-white text-neutral-500 disabled:opacity-20"
                      title="Move down"
                    >
                      <ChevronDown size={12} />
                    </button>
                    <button
                      onClick={() => duplicateBlock(idx)}
                      className="p-1.5 rounded-lg hover:bg-white text-neutral-500"
                      title="Duplicate"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => removeBlock(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 ml-auto"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {fields.map((field) => (
                    <BlockFieldEditor
                      key={field.key}
                      field={field}
                      value={block[field.key]}
                      onChange={(v) => updateBlock(idx, field.key, v)}
                      uploadFile={uploadFile}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addBlock}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-400 text-[10px] font-black tracking-[0.2em] uppercase text-blue-600"
      >
        <Plus size={12} strokeWidth={3} />
        Add {meta.blockLabel?.toLowerCase()}
      </button>
    </div>
  );
}

function BlockFieldEditor({
  field,
  value,
  onChange,
  uploadFile,
}: {
  field: BlockField;
  value: any;
  onChange: (v: any) => void;
  uploadFile?: (file: File) => Promise<string>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const labelEl = (
    <label className="text-[9px] font-black tracking-[0.25em] text-neutral-400 uppercase block mb-1.5">
      {field.label}
    </label>
  );

  if (field.kind === "text") {
    return (
      <div>
        {labelEl}
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
        />
      </div>
    );
  }

  if (field.kind === "textarea") {
    return (
      <div>
        {labelEl}
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={field.rows || 3}
          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400 resize-none"
        />
      </div>
    );
  }

  if (field.kind === "html") {
    return (
      <div>
        {labelEl}
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400 resize-none font-mono"
          placeholder="<p>Your HTML here</p>"
        />
      </div>
    );
  }

  if (field.kind === "color") {
    return (
      <div>
        {labelEl}
        <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-2 py-1.5">
          <div className="w-7 h-7 rounded-lg border border-neutral-200 relative overflow-hidden" style={{ background: value || "#000" }}>
            <input
              type="color"
              value={value || "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer scale-150"
            />
          </div>
          <input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[11px] font-bold uppercase"
          />
        </div>
      </div>
    );
  }

  if (field.kind === "number") {
    return (
      <div>
        {labelEl}
        <input
          type="number"
          value={value ?? ""}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
        />
      </div>
    );
  }

  if (field.kind === "select") {
    return (
      <div>
        {labelEl}
        <select
          value={value || field.options[0]?.value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // image
  return (
    <div>
      {labelEl}
      {value && (
        <div className="aspect-video w-full mb-2 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
          <img src={value} className="w-full h-full object-cover" alt="" />
        </div>
      )}
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… or upload"
        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400 mb-1.5"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f || !uploadFile) return;
          setUploading(true);
          try {
            const url = await uploadFile(f);
            onChange(url);
          } catch {
            alert("Upload failed");
          } finally {
            setUploading(false);
          }
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full text-[10px] font-bold uppercase tracking-widest py-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 flex items-center justify-center gap-2"
      >
        <ImageIcon size={11} />
        {uploading ? "Uploading…" : "Upload image"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-section settings: padding, color scheme, full-width, custom class, hide
// ─────────────────────────────────────────────────────────────────────────────

// Font choices offered for per-section overrides (matches the editor's core set).
const SECTION_FONT_OPTIONS = [
  "Inter", "Outfit", "DM Sans", "Montserrat", "Syne", "Fraunces",
  "Cormorant", "Playfair Display", "Lora", "EB Garamond", "Space Mono", "Bebas Neue",
];

export const SECTION_ANIMATIONS = [
  { value: "", label: "Inherit (default)" },
  { value: "none", label: "None" },
  { value: "fade-up", label: "Fade up" },
  { value: "fade", label: "Fade in" },
  { value: "slide-left", label: "Slide from right" },
  { value: "slide-right", label: "Slide from left" },
  { value: "zoom", label: "Zoom in" },
];

export function SectionSettingsPanel({
  settings,
  onUpdate,
  colorSchemes,
}: {
  settings: any;
  onUpdate: (next: any) => void;
  colorSchemes: any[];
}) {
  return (
    <div className="space-y-4 p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50">
      <p className="text-[10px] font-black tracking-[0.3em] text-neutral-500 uppercase mb-1">Section settings</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-black tracking-widest text-neutral-400 uppercase block mb-1">Top padding</label>
          <input
            type="number"
            min={0}
            max={400}
            value={settings.paddingTop ?? ""}
            onChange={(e) => onUpdate({ paddingTop: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder="auto"
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-[9px] font-black tracking-widest text-neutral-400 uppercase block mb-1">Bottom padding</label>
          <input
            type="number"
            min={0}
            max={400}
            value={settings.paddingBottom ?? ""}
            onChange={(e) => onUpdate({ paddingBottom: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder="auto"
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div>
        <label className="text-[9px] font-black tracking-widest text-neutral-400 uppercase block mb-1">Color scheme</label>
        <select
          value={settings.colorSchemeId || ""}
          onChange={(e) => onUpdate({ colorSchemeId: e.target.value || undefined })}
          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
        >
          <option value="">— Inherit —</option>
          {colorSchemes.map((cs) => (
            <option key={cs.id} value={cs.id}>
              {cs.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-black tracking-widest text-neutral-400 uppercase block mb-1">Heading font</label>
          <select
            value={settings.headingFontOverride || ""}
            onChange={(e) => onUpdate({ headingFontOverride: e.target.value || undefined })}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
          >
            <option value="">— Inherit —</option>
            {SECTION_FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black tracking-widest text-neutral-400 uppercase block mb-1">Body font</label>
          <select
            value={settings.bodyFontOverride || ""}
            onChange={(e) => onUpdate({ bodyFontOverride: e.target.value || undefined })}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
          >
            <option value="">— Inherit —</option>
            {SECTION_FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[9px] font-black tracking-widest text-neutral-400 uppercase block mb-1">Entrance animation</label>
        <select
          value={settings.animation || ""}
          onChange={(e) => onUpdate({ animation: e.target.value || undefined })}
          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
        >
          {SECTION_ANIMATIONS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-black tracking-widest text-neutral-400 uppercase block mb-1">Show from</label>
          <input
            type="datetime-local"
            value={settings.showFrom || ""}
            onChange={(e) => onUpdate({ showFrom: e.target.value || undefined })}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-[9px] font-black tracking-widest text-neutral-400 uppercase block mb-1">Show until</label>
          <input
            type="datetime-local"
            value={settings.showUntil || ""}
            onChange={(e) => onUpdate({ showUntil: e.target.value || undefined })}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[10px] outline-none focus:border-blue-400"
          />
        </div>
        <p className="col-span-2 text-[8px] text-neutral-400 font-medium -mt-1">
          Optional publish window — the section only renders between these times (e.g. a sale banner).
        </p>
      </div>

      <div>
        <label className="text-[9px] font-black tracking-widest text-neutral-400 uppercase block mb-1">Custom CSS class</label>
        <input
          value={settings.customClass || ""}
          onChange={(e) => onUpdate({ customClass: e.target.value })}
          placeholder="e.g. my-promo-band"
          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400 font-mono"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { key: "fullWidth", label: "Full width" },
          { key: "hideOnMobile", label: "Hide mobile" },
          { key: "hideOnDesktop", label: "Hide desktop" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onUpdate({ [t.key]: !settings[t.key] })}
            className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
              settings[t.key]
                ? "bg-blue-600 text-white border-blue-600 shadow"
                : "bg-white text-neutral-500 border-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Color Schemes panel
// ─────────────────────────────────────────────────────────────────────────────

export type ColorScheme = { id: string; name: string; background: string; text: string; accent: string };

export const DEFAULT_COLOR_SCHEMES: ColorScheme[] = [
  { id: "scheme-default", name: "Default", background: "#ffffff", text: "#111111", accent: "#A855F7" },
  { id: "scheme-inverse", name: "Inverse", background: "#0a0a0a", text: "#ffffff", accent: "#A855F7" },
  { id: "scheme-accent", name: "Accent", background: "#A855F7", text: "#ffffff", accent: "#ffffff" },
];

export function ColorSchemesPanel({
  schemes,
  onChange,
}: {
  schemes: ColorScheme[];
  onChange: (next: ColorScheme[]) => void;
}) {
  const list = schemes && schemes.length > 0 ? schemes : DEFAULT_COLOR_SCHEMES;

  const updateScheme = (id: string, patch: Partial<ColorScheme>) => {
    onChange(list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addScheme = () => {
    const id = `scheme-${Date.now().toString(36)}`;
    onChange([...list, { id, name: `Scheme ${list.length + 1}`, background: "#ffffff", text: "#111111", accent: "#A855F7" }]);
  };

  const removeScheme = (id: string) => {
    if (list.length <= 1) return;
    onChange(list.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-3">
      {list.map((scheme) => (
        <div key={scheme.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <input
              value={scheme.name}
              onChange={(e) => updateScheme(scheme.id, { name: e.target.value })}
              className="bg-transparent outline-none text-[12px] font-black text-white uppercase tracking-widest italic"
            />
            <button
              onClick={() => removeScheme(scheme.id)}
              className="text-slate-600 hover:text-red-400 p-1"
              title="Remove"
              disabled={list.length <= 1}
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["background", "text", "accent"] as const).map((k) => (
              <div key={k}>
                <label className="text-[8px] font-black tracking-[0.25em] text-slate-500 uppercase block mb-1">{k}</label>
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-2 py-1.5">
                  <div
                    className="w-7 h-7 rounded-lg border border-white/10 relative overflow-hidden flex-shrink-0"
                    style={{ background: scheme[k] }}
                  >
                    <input
                      type="color"
                      value={scheme[k]}
                      onChange={(e) => updateScheme(scheme.id, { [k]: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer scale-150"
                    />
                  </div>
                  <input
                    value={scheme[k]}
                    onChange={(e) => updateScheme(scheme.id, { [k]: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent text-[10px] font-bold text-white uppercase tracking-widest outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={addScheme}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 text-[10px] font-black tracking-[0.2em] text-violet-400 uppercase italic flex items-center justify-center gap-2"
      >
        <Plus size={12} strokeWidth={3} />
        Add color scheme
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme Import / Export buttons
// ─────────────────────────────────────────────────────────────────────────────

export function ThemeIOButtons({
  design,
  onImport,
}: {
  design: any;
  onImport: (next: any) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportTheme = () => {
    try {
      const blob = new Blob([JSON.stringify(design, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `theme-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
  };

  const importTheme = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") throw new Error("invalid");
      onImport(parsed);
    } catch {
      alert("Theme file is invalid JSON");
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={exportTheme}
        title="Export theme JSON"
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all"
      >
        <Download size={14} strokeWidth={2.5} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importTheme(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Import theme JSON"
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all"
      >
        <Upload size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal section editor — drives editing for every type via field schema
// ─────────────────────────────────────────────────────────────────────────────

type SectionFieldSchema =
  | { key: string; label: string; kind: "text" }
  | { key: string; label: string; kind: "textarea"; rows?: number }
  | { key: string; label: string; kind: "image" }
  | { key: string; label: string; kind: "html" }
  | { key: string; label: string; kind: "richtext" }
  | { key: string; label: string; kind: "color" }
  | { key: string; label: string; kind: "number"; min?: number; max?: number; step?: number; suffix?: string }
  | { key: string; label: string; kind: "range"; min: number; max: number; step?: number; suffix?: string }
  | { key: string; label: string; kind: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; kind: "toggle" }
  | { key: string; label: string; kind: "date" };

const SECTION_FIELDS: Record<string, SectionFieldSchema[]> = {
  HeroSection: [
    { key: "title", label: "Headline", kind: "text" },
    { key: "subtitle", label: "Subtitle", kind: "text" },
    { key: "imageUrl", label: "Background image", kind: "image" },
    { key: "overlayOpacity", label: "Overlay darkness", kind: "range", min: 0, max: 1, step: 0.05 },
    { key: "accentColor", label: "Accent color", kind: "color" },
    { key: "ctaText", label: "CTA label", kind: "text" },
    { key: "secondaryCtaText", label: "Secondary CTA", kind: "text" },
    {
      key: "align",
      label: "Alignment",
      kind: "select",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
    },
  ],
  FeatureGridSection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "columns", label: "Columns", kind: "range", min: 2, max: 4 },
  ],
  TestimonialsSection: [{ key: "title", label: "Title", kind: "text" }],
  FAQSection: [{ key: "title", label: "Title", kind: "text" }],
  NewsletterSection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "description", label: "Description", kind: "textarea", rows: 3 },
    { key: "placeholder", label: "Placeholder", kind: "text" },
    { key: "buttonLabel", label: "Button label", kind: "text" },
  ],
  TextContentSection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "content", label: "Content", kind: "textarea", rows: 5 },
  ],
  ImageWithTextSection: [
    { key: "eyebrow", label: "Eyebrow", kind: "text" },
    { key: "title", label: "Title", kind: "text" },
    { key: "body", label: "Body", kind: "textarea", rows: 4 },
    { key: "imageUrl", label: "Image", kind: "image" },
    {
      key: "layout",
      label: "Layout",
      kind: "select",
      options: [
        { value: "image-left", label: "Image left" },
        { value: "text-left", label: "Text left" },
      ],
    },
    { key: "ctaText", label: "CTA label", kind: "text" },
    { key: "ctaUrl", label: "CTA URL", kind: "text" },
    { key: "accentColor", label: "Accent", kind: "color" },
  ],
  RichTextSection: [
    {
      key: "align",
      label: "Alignment",
      kind: "select",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
    },
    { key: "html", label: "Content", kind: "richtext" },
  ],
  MarqueeSection: [
    { key: "text", label: "Text", kind: "text" },
    { key: "separator", label: "Separator", kind: "text" },
    { key: "speed", label: "Scroll duration", kind: "range", min: 5, max: 120, step: 1, suffix: "s" },
    { key: "fontSize", label: "Font size", kind: "range", min: 10, max: 120, step: 1, suffix: "px" },
    { key: "bold", label: "Bold", kind: "toggle" },
    { key: "uppercase", label: "Uppercase", kind: "toggle" },
    { key: "background", label: "Background color", kind: "color" },
    { key: "color", label: "Text color", kind: "color" },
  ],
  MulticolumnSection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "columns", label: "Columns", kind: "range", min: 2, max: 6 },
  ],
  SlideshowSection: [
    { key: "autoplay", label: "Autoplay", kind: "toggle" },
    { key: "autoplaySpeed", label: "Autoplay speed (ms)", kind: "number", min: 1500, max: 15000, step: 250 },
  ],
  VideoSection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "videoUrl", label: "Video URL (YouTube, Vimeo, MP4)", kind: "text" },
    { key: "posterUrl", label: "Poster image", kind: "image" },
  ],
  LogoListSection: [{ key: "title", label: "Title", kind: "text" }],
  CollapsibleSection: [{ key: "title", label: "Title", kind: "text" }],
  CollectionListSection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "columns", label: "Columns", kind: "range", min: 2, max: 5 },
  ],
  FeaturedProductSection: [
    { key: "eyebrow", label: "Eyebrow", kind: "text" },
    { key: "productSlug", label: "Product slug", kind: "text" },
    { key: "ctaText", label: "CTA label", kind: "text" },
    { key: "accentColor", label: "Accent", kind: "color" },
  ],
  CountdownSection: [
    { key: "eyebrow", label: "Eyebrow", kind: "text" },
    { key: "title", label: "Title", kind: "text" },
    { key: "subtitle", label: "Subtitle", kind: "text" },
    { key: "targetDate", label: "Target date", kind: "date" },
    { key: "ctaText", label: "CTA label", kind: "text" },
    { key: "ctaUrl", label: "CTA URL", kind: "text" },
    { key: "accentColor", label: "Accent", kind: "color" },
  ],
  ContactFormSection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "subtitle", label: "Subtitle", kind: "text" },
    { key: "buttonLabel", label: "Button label", kind: "text" },
    { key: "showPhone", label: "Show phone field", kind: "toggle" },
    { key: "accentColor", label: "Accent", kind: "color" },
  ],
  MapSection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "address", label: "Address", kind: "text" },
  ],
  GallerySection: [
    { key: "title", label: "Title", kind: "text" },
    { key: "columns", label: "Columns", kind: "range", min: 2, max: 6 },
  ],
  CustomHTMLSection: [
    { key: "html", label: "HTML", kind: "html" },
    { key: "fullBleed", label: "Full bleed (no padding)", kind: "toggle" },
  ],
  RowSection: [
    { key: "title", label: "Title (optional)", kind: "text" },
    {
      key: "layout",
      label: "Column layout",
      kind: "select",
      options: [
        { value: "50-50", label: "50 / 50" },
        { value: "33-67", label: "33 / 67" },
        { value: "67-33", label: "67 / 33" },
        { value: "thirds", label: "3 columns" },
        { value: "quarters", label: "4 columns" },
      ],
    },
    { key: "gap", label: "Column gap", kind: "range", min: 8, max: 120, step: 4, suffix: "px" },
    {
      key: "verticalAlign",
      label: "Vertical alignment",
      kind: "select",
      options: [
        { value: "top", label: "Top" },
        { value: "center", label: "Center" },
        { value: "bottom", label: "Bottom" },
      ],
    },
  ],
};

export function getSectionFields(type: string): SectionFieldSchema[] {
  return SECTION_FIELDS[type] || [];
}

export function SectionFieldEditor({
  field,
  value,
  onChange,
  uploadFile,
}: {
  field: SectionFieldSchema;
  value: any;
  onChange: (v: any) => void;
  uploadFile?: (file: File) => Promise<string>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const labelEl = (
    <label className="text-[9px] font-black tracking-[0.25em] text-neutral-400 uppercase block mb-1.5">
      {field.label}
    </label>
  );

  switch (field.kind) {
    case "text":
      return (
        <div>
          {labelEl}
          <input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
          />
        </div>
      );
    case "textarea":
    case "html":
      return (
        <div>
          {labelEl}
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            rows={field.kind === "html" ? 6 : (field as any).rows || 3}
            className={`w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400 resize-none ${
              field.kind === "html" ? "font-mono" : ""
            }`}
          />
        </div>
      );
    case "richtext":
      return (
        <div>
          {labelEl}
          <RichTextEditor
            value={value || ""}
            onChange={onChange}
            uploadFile={uploadFile}
            placeholder="Write content here..."
          />
        </div>
      );
    case "color":
      return (
        <div>
          {labelEl}
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-2 py-1.5">
            <div
              className="w-7 h-7 rounded-lg border border-neutral-200 relative overflow-hidden"
              style={{ background: value || "#000" }}
            >
              <input
                type="color"
                value={value || "#000000"}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer scale-150"
              />
            </div>
            <input
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[11px] font-bold uppercase"
            />
          </div>
        </div>
      );
    case "number":
      return (
        <div>
          {labelEl}
          <input
            type="number"
            value={value ?? ""}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
          />
        </div>
      );
    case "range": {
      const current = value ?? field.min;
      return (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            {labelEl}
            <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-lg mb-1.5">
              {current}
              {field.suffix || ""}
            </span>
          </div>
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={current}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-blue-600 h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer"
          />
        </div>
      );
    }
    case "select":
      return (
        <div>
          {labelEl}
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
          >
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "toggle":
      return (
        <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-3 py-2">
          <span className="text-[11px] font-bold text-neutral-700">{field.label}</span>
          <button
            type="button"
            onClick={() => onChange(!value)}
            className={`w-10 h-5 rounded-full relative transition-all ${value ? "bg-blue-600" : "bg-neutral-200"}`}
          >
            <span
              className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${value ? "left-6" : "left-1"}`}
            />
          </button>
        </div>
      );
    case "date":
      return (
        <div>
          {labelEl}
          <input
            type="datetime-local"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400"
          />
        </div>
      );
    case "image":
      return (
        <div>
          {labelEl}
          {value && (
            <div className="aspect-video w-full mb-2 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
              <img src={value} className="w-full h-full object-cover" alt="" />
            </div>
          )}
          <input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… or upload"
            className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-blue-400 mb-1.5"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f || !uploadFile) return;
              setUploading(true);
              try {
                const url = await uploadFile(f);
                onChange(url);
              } catch {
                alert("Upload failed");
              } finally {
                setUploading(false);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-[10px] font-bold uppercase tracking-widest py-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 flex items-center justify-center gap-2"
          >
            <ImageIcon size={11} />
            {uploading ? "Uploading…" : "Upload image"}
          </button>
        </div>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Templates registry
// ─────────────────────────────────────────────────────────────────────────────

export type PreviewModeId =
  | "homepage"
  | "shop"
  | "product"
  | "collection"
  | "page"
  | "cart"
  | "wishlist"
  | "account";

export type PageTemplateMeta = { id: string; label: string; description: string; previewMode: PreviewModeId };

export const PAGE_TEMPLATES: PageTemplateMeta[] = [
  { id: "heroPage", label: "Home", description: "Sections shown on the storefront homepage.", previewMode: "homepage" },
  { id: "storefront", label: "Catalog / Shop", description: "Sections for the product catalog page.", previewMode: "shop" },
  { id: "productPage", label: "Product", description: "Sections shown on individual product pages.", previewMode: "product" },
  { id: "collectionPage", label: "Collection", description: "Sections for category/collection pages.", previewMode: "collection" },
  { id: "cartPage", label: "Cart", description: "Sections shown on the cart drawer/page.", previewMode: "cart" },
  { id: "page", label: "Custom Pages", description: "Default sections for editorial/custom pages.", previewMode: "page" },
  { id: "page404", label: "404", description: "Sections shown when a URL is not found.", previewMode: "homepage" },
];
