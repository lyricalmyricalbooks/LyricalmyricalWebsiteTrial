import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Monitor,
  Smartphone,
  Settings,
  FileText,
  Code2,
  LayoutTemplate,
  Check,
  Instagram,
  Twitter,
  Facebook,
  Globe,
  Plus,
  Eye,
  ShoppingBag,
  Home,
  Mail,
  Layout,
  RefreshCw,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { adminApi } from "./api";
import { CATEGORIES } from "../features/site/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Colour palette presets
// ─────────────────────────────────────────────────────────────────────────────
const PALETTES = [
  { id: "dark",    label: "Dark",    bg: "#030213", text: "#ffffff", accent: "#A855F7", swatches: ["#030213","#ffffff","#A855F7"] },
  { id: "light",   label: "Light",   bg: "#f8f7f4", text: "#111111", accent: "#000000", swatches: ["#f8f7f4","#111111","#000000"] },
  { id: "minimal", label: "Minimal", bg: "#ffffff",  text: "#000000", accent: "#666666", swatches: ["#ffffff","#000000","#888888"] },
  { id: "warm",    label: "Warm",    bg: "#fdf6f0",  text: "#2c1810", accent: "#c96b2e", swatches: ["#fdf6f0","#2c1810","#c96b2e"] },
  { id: "forest",  label: "Forest",  bg: "#0f1e14",  text: "#e8f5e9", accent: "#4caf50", swatches: ["#0f1e14","#e8f5e9","#4caf50"] },
  { id: "ink",     label: "Ink",     bg: "#1a1a1a",  text: "#f5f5f5", accent: "#e74c3c", swatches: ["#1a1a1a","#f5f5f5","#e74c3c"] },
];

const FONTS = [
  { value: "Inter",           label: "Inter",          sub: "Sans-serif Modern" },
  { value: "Outfit",          label: "Outfit",         sub: "Geometric Soft" },
  { value: "DM Sans",         label: "DM Sans",        sub: "Humanist Sans" },
  { value: "Roboto",          label: "Roboto",         sub: "Clean Standard" },
  { value: "Playfair Display",label: "Playfair",       sub: "Classic Serif" },
  { value: "EB Garamond",     label: "EB Garamond",    sub: "Elegant Serif" },
  { value: "Space Grotesk",   label: "Space Grotesk",  sub: "Techy Sans" },
  { value: "Cormorant",       label: "Cormorant",      sub: "High-contrast Serif" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Reusable primitives
// ─────────────────────────────────────────────────────────────────────────────
function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold tracking-[0.3em] text-neutral-400 uppercase mb-2">
      {children}
    </p>
  );
}

function SidebarInput({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div className="space-y-1.5">
      {label && <SidebarLabel>{label}</SidebarLabel>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-neutral-400 transition-colors"
      />
    </div>
  );
}

function SidebarSelect({ label, value, onChange, options }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1.5">
      {label && <SidebarLabel>{label}</SidebarLabel>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-neutral-400 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function SidebarToggle({ label, description, checked, onChange }: any) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-neutral-100 last:border-none">
      <div>
        <p className="text-[11px] font-semibold text-neutral-800">{label}</p>
        {description && <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`flex-shrink-0 w-8 h-4 rounded-full relative transition-colors duration-200 ${checked ? "bg-blue-500" : "bg-neutral-200"}`}
      >
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-200 ${checked ? "left-4" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function SidebarRadioGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`py-2 px-2 rounded-lg text-[10px] font-semibold border transition-all ${
            value === o.value
              ? "bg-blue-50 border-blue-400 text-blue-700"
              : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SidebarRange({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1.5">
        <SidebarLabel>{label}</SidebarLabel>
        <span className="text-[10px] text-neutral-400 font-mono bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-100 group-hover:border-neutral-200 group-hover:text-neutral-600 transition-colors">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-neutral-900 h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer hover:accent-blue-500 transition-all"
      />
    </div>
  );
}

// ──────────────────────────────
// Enhanced Color Picker with Hex input
// ──────────────────────────────
function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [localValue, setLocalValue] = useState(value);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleTextChange = (val: string) => {
    setLocalValue(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="space-y-2">
      <SidebarLabel>{label}</SidebarLabel>
      <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl p-1.5 shadow-sm hover:border-neutral-300 transition-all group">
        <div 
          className="w-8 h-8 rounded-lg shadow-inner border border-neutral-100 relative cursor-pointer overflow-hidden flex-shrink-0"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer scale-150"
          />
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-[11px] font-mono font-medium text-neutral-700 uppercase"
            placeholder="#000000"
          />
        </div>
        <div className="w-px h-4 bg-neutral-100 group-hover:bg-neutral-200" />
        <span className="text-[9px] text-neutral-300 font-bold pr-2 uppercase tracking-tighter">HEX</span>
      </div>
    </div>
  );
}

// ──────────────────────────────
// Accordion Component
// ──────────────────────────────
function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-neutral-100 last:border-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="text-[11px] font-bold text-neutral-800 tracking-tight group-hover:text-blue-600 transition-colors uppercase">
          {title}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          className="text-neutral-300 group-hover:text-neutral-500 transition-colors"
        >
          <ChevronRight size={14} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-6 space-y-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────
// Font Selector with Preview
// ──────────────────────────────
function FontSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <SidebarLabel>Typography</SidebarLabel>
      <div className="grid grid-cols-1 gap-1.5">
        {FONTS.map((f) => (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
              value === f.value
                ? "bg-blue-50 border-blue-400 shadow-sm"
                : "bg-white border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <div className="text-left">
              <p className="text-[14px] leading-none mb-1" style={{ fontFamily: f.value }}>
                {f.label}
              </p>
              <p className="text-[9px] text-neutral-400 font-medium tracking-wide">
                {f.sub}
              </p>
            </div>
            {value === f.value && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <Check size={10} className="text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section list row
// ─────────────────────────────────────────────────────────────────────────────
function SectionRow({ icon, title, description, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-4 hover:bg-neutral-50 transition-colors border-b border-neutral-100 text-left group"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-neutral-400 group-hover:text-neutral-700 transition-colors">{icon}</div>
        <div>
          <p className="text-[12px] font-semibold text-neutral-800 group-hover:text-black transition-colors">{title}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed max-w-[200px]">{description}</p>
        </div>
      </div>
      <ChevronRight size={14} className="text-neutral-300 group-hover:text-neutral-500 flex-shrink-0 transition-colors" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-panel header (breadcrumb back button)
// ─────────────────────────────────────────────────────────────────────────────
function SubPanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-neutral-100">
      <button onClick={onBack} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
        <ChevronLeft size={14} className="text-neutral-500" />
      </button>
      <span className="text-[11px] font-bold text-neutral-700 tracking-wide uppercase">{title}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION PANELS
// ─────────────────────────────────────────────────────────────────────────────
function StylePanel({ design, update }: any) {
  const currentPalette = PALETTES.find(p => p.id === design.palettePreset) || PALETTES[0];
  const backgroundColor = design.backgroundColor || currentPalette.bg;
  const textColor = design.textColor || currentPalette.text;

  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Color Palette" defaultOpen={true}>
        <div className="grid grid-cols-3 gap-2">
          {PALETTES.map((palette) => (
            <button
              key={palette.id}
              onClick={() => {
                update("palettePreset", palette.id);
                update("primaryColor", palette.accent);
                update("backgroundColor", palette.bg);
                update("textColor", palette.text);
              }}
              className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                design.palettePreset === palette.id ? "border-blue-500 shadow-md" : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="flex h-8">
                {palette.swatches.map((s, i) => (
                  <div key={i} className="flex-1" style={{ background: s }} />
                ))}
              </div>
              {design.palettePreset === palette.id && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check size={8} className="text-white" />
                </div>
              )}
              <p className="text-[9px] font-semibold text-neutral-600 py-1.5 px-1 truncate">{palette.label}</p>
            </button>
          ))}
        </div>
      </Accordion>

      <Accordion title="Brand Colors">
        <div className="space-y-4">
          <ColorPicker 
            label="Primary accent" 
            value={design.primaryColor || "#A855F7"} 
            onChange={(val) => update("primaryColor", val)} 
          />
          <div className="grid grid-cols-2 gap-4">
            <ColorPicker 
              label="Background" 
              value={backgroundColor} 
              onChange={(val) => update("backgroundColor", val)} 
            />
            <ColorPicker 
              label="Text" 
              value={textColor} 
              onChange={(val) => update("textColor", val)} 
            />
          </div>
          <button
            onClick={() => {
              update("backgroundColor", currentPalette.bg);
              update("textColor", currentPalette.text);
            }}
            className="w-full border border-neutral-200 rounded-lg py-2 text-[10px] font-semibold text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 transition-colors"
          >
            Reset to palette defaults
          </button>
        </div>
      </Accordion>

      <Accordion title="Typography">
        <FontSelector 
          value={design.font || "Inter"} 
          onChange={(val) => update("font", val)} 
        />
      </Accordion>
    </div>
  );
}

function NavigationPanel({ design, update, setActiveTab, setActiveSection }: any) {
  const headerLinks = design.headerLinks || {};
  const updateHeaderLink = (key: string, value: boolean) => {
    update("headerLinks", { ...headerLinks, [key]: value });
  };

  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Header Profile" defaultOpen={true}>
        <div className="space-y-6">
          <div>
            <SidebarLabel>Layout Style</SidebarLabel>
            <SidebarRadioGroup
              value={design.headerStyle || "minimal"}
              onChange={(v: string) => update("headerStyle", v)}
              options={[
                { value: "minimal", label: "Minimal" },
                { value: "centered", label: "Centered" },
                { value: "full", label: "Full" },
              ]}
            />
          </div>
          <div>
            <SidebarLabel>Logo Alignment</SidebarLabel>
            <SidebarRadioGroup
              value={design.logoPosition || "left"}
              onChange={(v: string) => update("logoPosition", v)}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
            />
          </div>
          <SidebarRange
            label="Logo height"
            value={design.logoHeight ?? 24}
            min={20}
            max={64}
            suffix="px"
            onChange={(v: number) => update("logoHeight", v)}
          />
          <div className="pt-2">
             <SidebarToggle
               label="Transparent Header"
               description="Make header background transparent until scrolled"
               checked={design.transparentHeader ?? false}
               onChange={(v: boolean) => update("transparentHeader", v)}
             />
          </div>
        </div>
      </Accordion>

      <div className="p-8 text-center bg-blue-50/50 rounded-[2.5rem] border border-blue-100 border-dashed mb-6">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm shadow-blue-100">
           <LayoutTemplate size={20} className="text-blue-500" />
        </div>
        <h3 className="text-[12px] font-bold text-neutral-800 mb-2">Navigation has moved</h3>
        <p className="text-[10px] text-neutral-500 leading-relaxed mb-6 px-4">
          To manage your navigation categories and menu items, please use the <strong>Menu & Pages</strong> tab.
        </p>
        <button 
           onClick={() => { setActiveTab("pages"); setActiveSection(null); }}
           className="px-6 py-2 bg-blue-600 text-white rounded-full text-[10px] font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          GO TO MENU & PAGES
        </button>
      </div>

      <Accordion title="Layout & Logic">
        <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden mt-2">
          <SidebarToggle
            label="Sticky header"
            description="Keep the navigation bar visible while scrolling"
            checked={design.stickyHeader ?? true}
            onChange={(v: boolean) => update("stickyHeader", v)}
          />
          <SidebarToggle
            label="Footer columns"
            description="Show links in organised columns in the footer"
            checked={design.footerColumns ?? true}
            onChange={(v: boolean) => update("footerColumns", v)}
          />
          <SidebarToggle
            label="Social icons in footer"
            description="Display icons linking to your social accounts"
            checked={design.showSocialInFooter ?? true}
            onChange={(v: boolean) => update("showSocialInFooter", v)}
          />
        </div>
      </Accordion>
    </div>
  );
}

function HomepagePanel({ design, update }: any) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const sections = design.homepageSections || [];
  
  useEffect(() => {
    if (sections.length === 0 && !design.homepageSections) {
      const initialSections = [
        {
          id: "initial-hero",
          type: "HeroSection",
          settings: {
            title: design.hero?.slides?.[0]?.title || "F✶M",
            subtitle: design.hero?.slides?.[0]?.subtitle || "PHOTOGRAPHY & ART BOOKS",
            ctaText: design.hero?.slides?.[0]?.ctaText || "ENTER ARCHIVE",
            imageUrl: design.hero?.slides?.[0]?.imageUrl || "",
            overlayOpacity: design.hero?.overlayOpacity || 0.45,
            accentColor: design.primaryColor || "#A855F7"
          }
        }
      ];
      update("homepageSections", initialSections);
    }
  }, []);

  const updateSections = (newSections: any[]) => {
    update("homepageSections", newSections);
  };

  const addSection = (type: string) => {
    const id = crypto.randomUUID();
    const defaults: any = {
      HeroSection: { title: "NEW HERO", subtitle: "Something special", ctaText: "EXPLORE", overlayOpacity: 0.5 },
      FeaturedCollectionSection: { title: "FEATURED COLLECTION", limit: 4, showViewAll: true },
      NewsletterSection: { title: "STAY IN TOUCH", description: "Get our latest news." },
      TextContentSection: { title: "OUR STORY", content: "Write something meaningful...", align: "center" },
    };
    
    const newSection = { id, type, settings: defaults[type] || {} };
    updateSections([...sections, newSection]);
    setActiveSectionId(id);
  };

  const removeSection = (id: string, e?: any) => {
    if (e) e.stopPropagation();
    updateSections(sections.filter((s: any) => s.id !== id));
    if (activeSectionId === id) setActiveSectionId(null);
  };

  const moveSection = (index: number, direction: 'up' | 'down', e: any) => {
    e.stopPropagation();
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    updateSections(newSections);
  };

  const updateSectionSettings = (id: string, newSettings: any) => {
    updateSections(sections.map((s: any) => s.id === id ? { ...s, settings: { ...s.settings, ...newSettings } } : s));
  };

  const handleImageUpload = async (sectionId: string, file: File) => {
    try {
      const url = await adminApi.uploadFile(file, `sections/${sectionId}_${Date.now()}`);
      updateSectionSettings(sectionId, { imageUrl: url });
    } catch {
      alert("Error uploading image");
    }
  };

  if (activeSectionId) {
    const section = sections.find((s: any) => s.id === activeSectionId);
    if (!section) {
      setActiveSectionId(null);
      return null;
    }

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-neutral-100 flex items-center gap-3 bg-white sticky top-0 z-20">
          <button onClick={() => setActiveSectionId(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900">
            <ChevronLeft size={16} />
          </button>
          <div>
            <p className="text-[9px] font-bold tracking-[0.2em] text-blue-600 uppercase mb-0.5">Edit Section</p>
            <h3 className="text-[12px] font-bold text-neutral-800">{section.type.replace("Section", "")}</h3>
          </div>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {section.type === "HeroSection" && (
            <div className="space-y-6">
              <SidebarInput label="Headline" value={section.settings.title || ""} onChange={(v: string) => updateSectionSettings(section.id, { title: v })} />
              <SidebarInput label="Subtitle" value={section.settings.subtitle || ""} onChange={(v: string) => updateSectionSettings(section.id, { subtitle: v })} />
              <div>
                <SidebarLabel>Media</SidebarLabel>
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 border-dashed space-y-4">
                  {section.settings.imageUrl && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden border border-neutral-200">
                      <img src={section.settings.imageUrl} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <SidebarInput value={section.settings.imageUrl || ""} onChange={(v: string) => updateSectionSettings(section.id, { imageUrl: v })} placeholder="Paste Image URL..." />
                    <div className="flex items-center gap-2">
                       <input type="file" id={`upload-${section.id}`} className="hidden" accept="image/*" onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) handleImageUpload(section.id, file);
                       }} />
                       <label htmlFor={`upload-${section.id}`} className="flex-1 py-1.5 bg-white border border-neutral-200 rounded-lg text-center text-[10px] font-bold cursor-pointer hover:bg-neutral-50 transition-colors">UPLOAD FILE</label>
                    </div>
                  </div>
                </div>
              </div>
              <SidebarRange label="Overlay Darken" value={Math.round((section.settings.overlayOpacity ?? 0.5) * 100)} min={0} max={90} suffix="%" onChange={(v) => updateSectionSettings(section.id, { overlayOpacity: v / 100 })} />
              <ColorPicker label="Accent Color" value={section.settings.accentColor || "#A855F7"} onChange={(v) => updateSectionSettings(section.id, { accentColor: v })} />
              <SidebarInput label="CTA Label" value={section.settings.ctaText || ""} onChange={(v: string) => updateSectionSettings(section.id, { ctaText: v })} />
            </div>
          )}

          {section.type === "FeaturedCollectionSection" && (
            <div className="space-y-6">
              <SidebarInput label="Title" value={section.settings.title || ""} onChange={(v: string) => updateSectionSettings(section.id, { title: v })} />
              <SidebarRange label="Products" value={section.settings.limit || 4} min={2} max={12} onChange={(v) => updateSectionSettings(section.id, { limit: v })} />
              <SidebarToggle label="Show View All" checked={section.settings.showViewAll ?? true} onChange={(v: boolean) => updateSectionSettings(section.id, { showViewAll: v })} />
            </div>
          )}

          {section.type === "NewsletterSection" && (
            <div className="space-y-4">
              <SidebarInput label="Title" value={section.settings.title || ""} onChange={(v: string) => updateSectionSettings(section.id, { title: v })} />
              <textarea value={section.settings.description || ""} onChange={(e) => updateSectionSettings(section.id, { description: e.target.value })} rows={4} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-[11px] outline-none focus:border-blue-400 transition-all resize-none shadow-sm" placeholder="Newsletter description..." />
            </div>
          )}

          {section.type === "TextContentSection" && (
            <div className="space-y-4">
              <SidebarInput label="Title" value={section.settings.title || ""} onChange={(v: string) => updateSectionSettings(section.id, { title: v })} />
              <textarea value={section.settings.content || ""} onChange={(e) => updateSectionSettings(section.id, { content: e.target.value })} rows={8} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-[11px] outline-none focus:border-blue-400 transition-all resize-none shadow-sm" placeholder="Content text..." />
              
              <div className="pt-2 space-y-2">
                <SidebarLabel>Primary Button</SidebarLabel>
                <div className="grid grid-cols-2 gap-2">
                  <SidebarInput placeholder="Text" value={section.settings.ctaText || ""} onChange={(v: string) => updateSectionSettings(section.id, { ctaText: v })} />
                  <SidebarInput placeholder="Link" value={section.settings.ctaLink || ""} onChange={(v: string) => updateSectionSettings(section.id, { ctaLink: v })} />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <SidebarLabel>Secondary Button</SidebarLabel>
                <div className="grid grid-cols-2 gap-2">
                  <SidebarInput placeholder="Text" value={section.settings.secondaryCtaText || ""} onChange={(v: string) => updateSectionSettings(section.id, { secondaryCtaText: v })} />
                  <SidebarInput placeholder="Link" value={section.settings.secondaryCtaLink || ""} onChange={(v: string) => updateSectionSettings(section.id, { secondaryCtaLink: v })} />
                </div>
              </div>

              <div className="pt-2">
                <SidebarLabel>Alignment</SidebarLabel>
                <SidebarRadioGroup value={section.settings.align || "center"} onChange={(v) => updateSectionSettings(section.id, { align: v })} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
              </div>
            </div>
          )}

          <div className="pt-8 mt-12 border-t border-neutral-100">
            <button onClick={() => removeSection(section.id)} className="w-full py-4 text-red-500 text-[10px] font-bold tracking-widest border-2 border-red-50 rounded-2xl hover:bg-red-50 transition-colors">DELETE SECTION</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1 h-full">
      <div className="flex items-center justify-between mb-4 mt-2">
        <div>
          <h2 className="text-[14px] font-black tracking-tight text-neutral-800 uppercase">Home Layout</h2>
          <p className="text-[10px] text-neutral-400 font-medium tracking-wide">Add and arrange your shop content</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-4 border-r border-neutral-100">
             <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Active</span>
             <SidebarToggle 
                checked={design.showHero ?? true} 
                onChange={(v: boolean) => update("showHero", v, true)} 
             />
          </div>
        </div>
      </div>

      <div className="border border-neutral-100 bg-neutral-50/50 rounded-2xl overflow-hidden mb-4">
        <button 
          onClick={() => setExpandedSection(expandedSection === "hero-legacy" ? null : "hero-legacy")}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
              <Layout size={14} />
            </div>
            <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-tight">Main Hero Settings</span>
          </div>
          <ChevronRight size={14} className={`text-neutral-400 transition-transform ${expandedSection === "hero-legacy" ? "rotate-90" : ""}`} />
        </button>
        
        {expandedSection === "hero-legacy" && (
          <div className="px-4 py-5 space-y-6 border-t border-neutral-100 bg-white">
            <div className="space-y-3">
              <label className="text-[9px] tracking-widest text-neutral-400 uppercase font-black">Content Alignment</label>
              <div className="grid grid-cols-3 gap-2">
                {["left", "center", "right"].map((a) => (
                  <button
                    key={a}
                    onClick={() => update("hero", { ...design.hero, align: a })}
                    className={`py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${
                      design.hero?.align === a 
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "bg-neutral-50 border-neutral-100 text-neutral-400 hover:border-neutral-200"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
              <div className="flex items-center gap-3">
                <RefreshCw size={14} className="text-neutral-400" />
                <span className="text-[11px] font-bold text-neutral-600 uppercase">Auto-Rotate</span>
              </div>
              <button
                onClick={() => update("hero", { ...design.hero, autoRotate: !design.hero?.autoRotate })}
                className={`w-10 h-5 rounded-full transition-colors relative ${design.hero?.autoRotate ? "bg-blue-600" : "bg-neutral-200"}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${design.hero?.autoRotate ? "right-1" : "left-1"}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 pb-8">
        {sections.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-neutral-100 rounded-[2rem] bg-neutral-50/50">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><LayoutTemplate size={20} className="text-neutral-300" /></div>
             <p className="text-[11px] text-neutral-400 font-medium px-8">Your homepage is empty. Start by adding a Hero section.</p>
          </div>
        ) : (
          <div className="space-y-3">
             {sections.map((section: any, index: number) => (
               <motion.div layout key={section.id} onClick={() => setActiveSectionId(section.id)} className="group relative bg-white border border-neutral-200 rounded-3xl p-4 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer flex items-center gap-4">
                 <div className="flex flex-col gap-1.5">
                    <button onClick={(e) => moveSection(index, 'up', e)} disabled={index === 0} className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-300 hover:text-neutral-900 disabled:opacity-0 transition-all"><ChevronLeft size={14} className="rotate-90" /></button>
                    <button onClick={(e) => moveSection(index, 'down', e)} disabled={index === sections.length - 1} className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-300 hover:text-neutral-900 disabled:opacity-0 transition-all"><ChevronLeft size={14} className="-rotate-90" /></button>
                 </div>
                 <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-300">
                    {section.type === "HeroSection" ? <LayoutTemplate size={20} /> : section.type === "FeaturedCollectionSection" ? <ShoppingBag size={20} /> : section.type === "NewsletterSection" ? <Mail size={20} /> : <FileText size={20} />}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black tracking-tight text-neutral-800 truncate uppercase">{section.settings.title || section.type.replace("Section", "")}</p>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">{section.type.replace("Section", "")}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={(e) => removeSection(section.id, e)} className="p-2 text-neutral-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><X size={14} /></button>
                    <ChevronRight size={14} className="text-neutral-200 group-hover:text-neutral-400 transition-colors" />
                 </div>
               </motion.div>
             ))}
          </div>
        )}

        <div className="pt-6">
          <div className="p-1 bg-neutral-50 rounded-[2.5rem] border border-neutral-100 flex flex-col gap-1">
             <p className="text-[9px] font-bold text-neutral-400 tracking-[0.3em] uppercase text-center py-5">Add new section</p>
             <div className="grid grid-cols-2 gap-1 px-1 pb-1">
                {[
                  { type: "HeroSection", label: "Hero", icon: <LayoutTemplate size={14} /> },
                  { type: "FeaturedCollectionSection", label: "Collection", icon: <ShoppingBag size={14} /> },
                  { type: "NewsletterSection", label: "Newsletter", icon: <Mail size={14} /> },
                  { type: "TextContentSection", label: "Text Block", icon: <FileText size={14} /> },
                ].map((opt) => (
                  <button key={opt.type} onClick={() => addSection(opt.type)} className="flex flex-col items-center justify-center gap-2 py-8 bg-white border border-neutral-100 rounded-[2rem] hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group active:scale-95">
                    <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">{opt.icon}</div>
                    <span className="text-[10px] font-bold text-neutral-500 group-hover:text-neutral-900 uppercase tracking-[0.1em]">{opt.label}</span>
                  </button>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PagesPanel({ pages, setPages, design, update }: any) {
  const [editingPage, setEditingPage] = useState<any | null>(null);

  const createPage = async () => {
    const newPage = {
      title: "Untitled Page",
      slug: "new-page-" + Date.now(),
      content: "<p>Start writing...</p>",
      status: "draft",
      showInNav: true,
      order: pages.length
    };
    const saved = await adminApi.createPage(newPage);
    setPages([...pages, saved]);
    setEditingPage(saved);
  };

  const updatePage = async (id: string, data: any) => {
    const updated = await adminApi.updatePage(id, data);
    setPages(pages.map((p: any) => p.id === id ? updated : p));
    setEditingPage(updated);
  };

  const deletePage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    await adminApi.deletePage(id);
    setPages(pages.filter((p: any) => p.id !== id));
    if (editingPage?.id === id) setEditingPage(null);
  };

  if (editingPage) {
    // ... (keep editing page logic same but I'll need to include it in the replace block if I replace the whole function)
    return (
      <div className="p-4 space-y-4">
        <SubPanelHeader title="Edit Page" onBack={() => setEditingPage(null)} />
        <div className="space-y-4">
          <div>
            <SidebarLabel>Page Title</SidebarLabel>
            <SidebarInput 
              value={editingPage.title} 
              onChange={(v: string) => updatePage(editingPage.id, { ...editingPage, title: v })}
            />
          </div>
          <div>
            <SidebarLabel>URL Slug</SidebarLabel>
            <SidebarInput 
              value={editingPage.slug} 
              onChange={(v: string) => updatePage(editingPage.id, { ...editingPage, slug: v })}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <SidebarLabel>Status</SidebarLabel>
              <SidebarSelect
                value={editingPage.status}
                onChange={(v: string) => updatePage(editingPage.id, { ...editingPage, status: v })}
                options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]}
              />
            </div>
            <div className="flex-1 flex flex-col justify-end">
               <SidebarToggle 
                  label="In Nav" 
                  checked={editingPage.showInNav} 
                  onChange={(v: boolean) => updatePage(editingPage.id, { ...editingPage, showInNav: v })} 
               />
            </div>
          </div>
          <hr className="border-neutral-100" />
          <button
            onClick={() => deletePage(editingPage.id)}
            className="w-full py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
          >
            DELETE PAGE
          </button>
          <p className="text-[9px] text-neutral-400 text-center">To edit the content of this page, please use the main Pages Manager in the Dashboard.</p>
        </div>
      </div>
    );
  }

  const categories = design.categories || CATEGORIES;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Navigation Categories Section */}
      <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-widest">Navigation Menu</h3>
          <span className="text-[9px] text-neutral-400 font-medium">Shop Categories</span>
        </div>
        
        <div className="space-y-2 mb-4">
          {categories.map((cat: string, index: number) => (
            <div key={index} className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg p-2 group shadow-sm">
              <input
                value={cat}
                onChange={(e) => {
                  const newCats = [...categories];
                  newCats[index] = e.target.value;
                  update("categories", newCats, true); // true = global
                }}
                className="flex-1 bg-transparent text-[11px] outline-none font-medium"
              />
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    const newCats = [...categories];
                    if (index > 0) {
                      [newCats[index], newCats[index - 1]] = [newCats[index - 1], newCats[index]];
                      update("categories", newCats, true);
                    }
                  }}
                  disabled={index === 0}
                  className="p-1 hover:bg-neutral-100 rounded text-neutral-400 disabled:opacity-30"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={() => {
                    const newCats = [...categories];
                    if (index < newCats.length - 1) {
                      [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
                      update("categories", newCats, true);
                    }
                  }}
                  disabled={index === categories.length - 1}
                  className="p-1 hover:bg-neutral-100 rounded text-neutral-400 disabled:opacity-30"
                >
                  <ChevronDown size={12} />
                </button>
                <button
                  onClick={() => {
                    const newCats = categories.filter((_: any, i: number) => i !== index);
                    update("categories", newCats, true);
                  }}
                  className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-neutral-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => {
            const newCats = [...categories, "NEW CATEGORY"];
            update("categories", newCats, true);
          }}
          className="w-full py-2 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-400 text-[10px] font-bold tracking-widest hover:border-neutral-300 hover:text-neutral-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          ADD MENU ITEM
        </button>
      </div>

      {/* Pages Section */}
      <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
         <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-widest">Custom Pages</h3>
         <button onClick={createPage} className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-600">
           <Plus size={12} /> ADD
         </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {pages.map((page: any) => (
          <button
            key={page.id}
            onClick={() => setEditingPage(page)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <FileText size={14} className="text-neutral-300 group-hover:text-blue-500 transition-colors" />
              <div>
                <p className="text-[11px] font-semibold text-neutral-800">{page.title}</p>
                <p className="text-[9px] text-neutral-400">/{page.slug} · <span className={page.status ==='published' ? 'text-green-500' : 'text-neutral-400'}>{page.status}</span></p>
              </div>
            </div>
            <ChevronRight size={12} className="text-neutral-300" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductsPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Card Styling" defaultOpen={true}>
        <div className="space-y-6">
          <div>
            <SidebarLabel>Visual Style</SidebarLabel>
            <SidebarRadioGroup
              value={design.productCardStyle || "editorial"}
              onChange={(v) => update("productCardStyle", v)}
              options={[
                { value: "card", label: "Card" },
                { value: "minimal", label: "Minimal" },
                { value: "editorial", label: "Editorial" },
              ]}
            />
          </div>

          <div>
            <SidebarLabel>Image Aspect Ratio</SidebarLabel>
            <SidebarRadioGroup
              value={design.imageAspectRatio || "3:4"}
              onChange={(v) => update("imageAspectRatio", v)}
              options={[
                { value: "1:1", label: "Square" },
                { value: "3:4", label: "Portrait" },
                { value: "2:3", label: "Tall" },
              ]}
            />
          </div>

          <div>
            <SidebarLabel>Button Label</SidebarLabel>
            <SidebarInput
              value={design.productCTA || "VIEW"}
              onChange={(v: string) => update("productCTA", v)}
              placeholder="VIEW"
            />
          </div>

          <div>
            <SidebarLabel>Hover Effect</SidebarLabel>
            <SidebarRadioGroup
              value={design.productHoverEffect || "zoom"}
              onChange={(v) => update("productHoverEffect", v)}
              options={[
                { value: "none", label: "None" },
                { value: "zoom", label: "Zoom" },
                { value: "lift", label: "Lift" },
              ]}
            />
          </div>
        </div>
      </Accordion>

      <Accordion title="Product Page (Detail)">
        <div className="space-y-6">
          <div>
            <SidebarLabel>Image Layout</SidebarLabel>
            <SidebarRadioGroup
              value={design.productImageLayout || "slider"}
              onChange={(v) => update("productImageLayout", v)}
              options={[
                { value: "slider", label: "Slider" },
                { value: "grid", label: "Grid" },
                { value: "stacked", label: "Stacked" },
              ]}
            />
          </div>
          <div>
            <SidebarLabel>Content Position</SidebarLabel>
            <SidebarRadioGroup
              value={design.productContentPosition || "right"}
              onChange={(v) => update("productContentPosition", v)}
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
            />
          </div>
          <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden mt-2">
            <SidebarToggle
              label="Related items"
              description="Show other publications at bottom"
              checked={design.showRelatedProducts ?? true}
              onChange={(v: boolean) => update("showRelatedProducts", v)}
            />
            <SidebarToggle
              label="Social share"
              description="Show share button on detail page"
              checked={design.showSocialShare ?? true}
              onChange={(v: boolean) => update("showSocialShare", v)}
            />
          </div>
        </div>
      </Accordion>

      <Accordion title="Logic & Visibility">
        <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden mt-2">
          <SidebarToggle
            label="Show price on hover"
            description="Reveal price on interaction."
            checked={design.showPriceOnHover ?? false}
            onChange={(v: boolean) => update("showPriceOnHover", v)}
          />
          <SidebarToggle
            label="Collection metadata"
            description="Show category tags above products."
            checked={design.showCollectionMeta ?? true}
            onChange={(v: boolean) => update("showCollectionMeta", v)}
          />
          <SidebarToggle
            label="Sold-out badge"
            description="Display status when out of stock."
            checked={design.showSoldOutBadge ?? true}
            onChange={(v: boolean) => update("showSoldOutBadge", v)}
          />
        </div>
      </Accordion>
    </div>
  );
}

function LayoutPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Grid Configuration" defaultOpen={true}>
        <div className="space-y-6">
          <SidebarRange
            label="Desktop Columns"
            value={design.productColumnsDesktop ?? 4}
            min={2}
            max={6}
            onChange={(v) => update("productColumnsDesktop", v)}
          />
          <SidebarRange
            label="Mobile Columns"
            value={design.productColumnsMobile ?? 2}
            min={1}
            max={3}
            onChange={(v) => update("productColumnsMobile", v)}
          />
        </div>
      </Accordion>

      <Accordion title="Dimensions & Spacing">
        <div className="space-y-6">
          <SidebarRange
            label="Content Width"
            value={design.containerWidth ?? 1200}
            min={900}
            max={1600}
            step={20}
            suffix="px"
            onChange={(v) => update("containerWidth", v)}
          />
          <SidebarRange
            label="Section Spacing"
            value={design.sectionSpacing ?? 64}
            min={24}
            max={120}
            step={4}
            suffix="px"
            onChange={(v) => update("sectionSpacing", v)}
          />
          <SidebarRange
            label="Visual Rounding"
            value={design.cardRadius ?? 8}
            min={0}
            max={24}
            suffix="px"
            onChange={(v) => update("cardRadius", v)}
          />
        </div>
      </Accordion>
    </div>
  );
}

function ButtonsPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Visual Style" defaultOpen={true}>
        <div>
          <SidebarLabel>Button Theme</SidebarLabel>
          <SidebarRadioGroup
            value={design.buttonStyle || "solid"}
            onChange={(v) => update("buttonStyle", v)}
            options={[
              { value: "solid", label: "Solid" },
              { value: "outline", label: "Outline" },
              { value: "ghost", label: "Ghost" },
            ]}
          />
        </div>
      </Accordion>
      
      <Accordion title="Shape & Effects">
        <div className="space-y-6">
          <SidebarRange
            label="Button Radius"
            value={design.buttonRadius ?? 999}
            min={0}
            max={40}
            suffix="px"
            onChange={(v) => update("buttonRadius", v)}
          />
          <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden">
            <SidebarToggle
              label="Uppercase"
              checked={design.buttonUppercase ?? true}
              onChange={(v: boolean) => update("buttonUppercase", v)}
            />
            <SidebarToggle
              label="Shadow"
              checked={design.buttonShadow ?? true}
              onChange={(v: boolean) => update("buttonShadow", v)}
            />
          </div>
        </div>
      </Accordion>
    </div>
  );
}

function AnnouncementsPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Status & Content" defaultOpen={true}>
        <div className="space-y-4">
          <div className="border border-neutral-100 rounded-xl overflow-hidden">
            <SidebarToggle
              label="Show announcement bar"
              description="Display a banner at the top of your shop"
              checked={design.showAnnouncement ?? true}
              onChange={(v: boolean) => update("showAnnouncement", v)}
            />
          </div>

          {(design.showAnnouncement ?? true) && (
            <div className="space-y-4">
              <div>
                <SidebarLabel>Announcement message</SidebarLabel>
                <textarea
                  value={design.announcementText || ""}
                  onChange={(e) => update("announcementText", e.target.value)}
                  rows={3}
                  placeholder="Enter your announcement..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-neutral-400 transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </Accordion>

      {(design.showAnnouncement ?? true) && (
        <Accordion title="Visuals & Motion">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <ColorPicker 
                label="Background" 
                value={design.announcementBg || "#000000"} 
                onChange={(val) => update("announcementBg", val)} 
              />
              <ColorPicker 
                label="Text color" 
                value={design.announcementColor || "#ffffff"} 
                onChange={(val) => update("announcementColor", val)} 
              />
            </div>

            <div className="border border-neutral-100 rounded-xl overflow-hidden">
              <SidebarToggle
                label="Scrolling text"
                description="Animate the text to scroll horizontally"
                checked={design.announcementScrolling ?? false}
                onChange={(v: boolean) => update("announcementScrolling", v)}
              />
            </div>
          </div>
        </Accordion>
      )}
    </div>
  );
}

function SocialPanel({ design, update }: any) {
  const social = design.social || {};
  const updateSocial = (key: string, val: string) => {
    update("social", { ...social, [key]: val });
  };

  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Core Links" defaultOpen={true}>
        <div className="space-y-4">
          <p className="text-[10px] text-neutral-400 leading-relaxed">
            These links appear in your shop footer. Include the full URL.
          </p>

          {[
            { key: "instagram", label: "Instagram", icon: <Instagram size={12} />, placeholder: "https://instagram.com/yourshop" },
            { key: "twitter",   label: "Twitter / X", icon: <Twitter size={12} />, placeholder: "https://twitter.com/yourshop" },
            { key: "facebook",  label: "Facebook",  icon: <Facebook size={12} />, placeholder: "https://facebook.com/yourshop" },
            { key: "tiktok",    label: "TikTok",    icon: <Globe size={12} />, placeholder: "https://tiktok.com/@yourshop" },
          ].map(({ key, label, icon, placeholder }) => (
            <div key={key}>
              <SidebarLabel>{label}</SidebarLabel>
              <div className="mt-1 flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 focus-within:border-blue-400 transition-colors shadow-sm">
                <span className="text-neutral-400">{icon}</span>
                <input
                  value={social[key] || ""}
                  onChange={(e) => updateSocial(key, e.target.value)}
                  placeholder={placeholder}
                  className="bg-transparent border-none outline-none text-[11px] flex-1 font-medium"
                />
              </div>
            </div>
          ))}
        </div>
      </Accordion>
    </div>
  );
}

function TextSizingPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-2 overflow-y-auto flex-1">
      <Accordion title="Scalability" defaultOpen={true}>
        <div className="space-y-6">
          <div>
            <SidebarLabel>Base font size</SidebarLabel>
            <SidebarRadioGroup
              value={design.fontSize || "md"}
              onChange={(v) => update("fontSize", v)}
              options={[
                { value: "sm", label: "Small" },
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
              ]}
            />
          </div>

          <div>
            <SidebarLabel>Heading scale</SidebarLabel>
            <SidebarRadioGroup
              value={design.headingScale || "regular"}
              onChange={(v) => update("headingScale", v)}
              options={[
                { value: "compact", label: "Compact" },
                { value: "regular", label: "Regular" },
                { value: "large", label: "Large" },
              ]}
            />
          </div>

          <div>
            <SidebarLabel>Letter spacing</SidebarLabel>
            <SidebarRadioGroup
              value={design.letterSpacing || "wide"}
              onChange={(v) => update("letterSpacing", v)}
              options={[
                { value: "normal", label: "Normal" },
                { value: "wide", label: "Wide" },
                { value: "ultra", label: "Ultra" },
              ]}
            />
          </div>
        </div>
      </Accordion>

      <Accordion title="Type Specimen">
        <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
           <p className="text-[10px] text-neutral-400 mb-4 font-bold uppercase tracking-widest border-b border-neutral-200 pb-2">PREVIEW</p>
           <div className="space-y-3">
             <p
               className="font-bold text-neutral-800 leading-tight"
               style={{
                 fontFamily: design.font || "Inter",
                 fontSize: design.fontSize === "sm" ? 22 : design.fontSize === "lg" ? 34 : 28,
                 letterSpacing: design.letterSpacing === "ultra" ? "0.15em" : design.letterSpacing === "wide" ? "0.05em" : "0",
               }}
             >
               Aa — {design.font || "Inter"}
             </p>
             <p className="text-neutral-500 text-[12px] leading-relaxed" style={{ fontFamily: design.font || "Inter" }}>
               The quick brown fox jumped over the lazy dog. Pack my box with five dozen liquor jugs.
             </p>
           </div>
        </div>
      </Accordion>
    </div>
  );
}

function TranslationsPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1">
      <p className="text-[10px] text-neutral-400 leading-relaxed">
        Customise the labels and button text shown to shoppers.
      </p>

      {[
        { key: "cartLabel",      label: "Cart button label",     ph: "BAG" },
        { key: "shopButtonLabel",label: "Shop now button",        ph: "SHOP NOW" },
        { key: "soldOutLabel",   label: "Sold out label",         ph: "SOLD OUT" },
        { key: "productCTA",     label: "Product hover button",   ph: "VIEW" },
      ].map(({ key, label, ph }) => (
        <div key={key}>
          <SidebarLabel>{label}</SidebarLabel>
          <SidebarInput
            value={(design as any)[key] || ""}
            onChange={(v: string) => update(key, v)}
            placeholder={ph}
          />
        </div>
      ))}

      <div>
        <SidebarLabel>Currency symbol position</SidebarLabel>
        <SidebarRadioGroup
          value={design.currencyPosition || "before"}
          onChange={(v) => update("currencyPosition", v)}
          options={[
            { value: "before", label: "$12.00" },
            { value: "after", label: "12.00$" },
          ]}
        />
      </div>
    </div>
  );
}

function AdditionalPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-0 overflow-y-auto flex-1">
      <div className="border border-neutral-100 rounded-xl overflow-hidden">
        {[
          { key: "enableAnimations",  label: "Enable animations",        desc: "Smooth entrance and transition effects across the shop" },
          { key: "showZoom",          label: "Product image zoom",        desc: "Zoom in on product images when customer hovers" },
          { key: "showBackToTop",     label: "Back to top button",        desc: "Show a floating scroll-to-top button on long pages" },
          { key: "showPoweredBy",     label: "Show 'Powered by' badge",   desc: "Display a small badge crediting the platform" },
        ].map(({ key, label, desc }) => (
          <SidebarToggle
            key={key}
            label={label}
            description={desc}
            checked={(design as any)[key] ?? false}
            onChange={(v: boolean) => update(key, v)}
          />
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <SidebarLabel>Favicon</SidebarLabel>
          <SidebarAssetUpload
            value={design.faviconUrl}
            onChange={(url: string) => update("faviconUrl", url)}
            type="favicon"
            label="Upload Favicon"
          />
        </div>
      </div>
    </div>
  );
}

function CodePanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-5 overflow-y-auto">
      <p className="text-[10px] text-neutral-400 leading-relaxed">
        Advanced controls for brand-level customization. This is useful for pixel-perfect styling similar to enterprise storefront builders.
      </p>
      <div>
        <SidebarLabel>Custom CSS</SidebarLabel>
        <textarea
          value={design.customCss || ""}
          onChange={(e) => update("customCss", e.target.value)}
          rows={8}
          placeholder=".product-card:hover { transform: translateY(-2px); }"
          className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-mono outline-none focus:border-neutral-400 transition-colors resize-y"
        />
      </div>
      <div>
        <SidebarLabel>Custom &lt;head&gt; HTML</SidebarLabel>
        <textarea
          value={design.customHeadHtml || ""}
          onChange={(e) => update("customHeadHtml", e.target.value)}
          rows={5}
          placeholder="<meta name='theme-color' content='#000000' />"
          className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-mono outline-none focus:border-neutral-400 transition-colors resize-y"
        />
      </div>
      <div>
        <SidebarLabel>Footer scripts</SidebarLabel>
        <textarea
          value={design.customFooterScripts || ""}
          onChange={(e) => update("customFooterScripts", e.target.value)}
          rows={5}
          placeholder="<script>console.log('tracking script')</script>"
          className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[11px] font-mono outline-none focus:border-neutral-400 transition-colors resize-y"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Preview — scaled render of the actual storefront
// ─────────────────────────────────────────────────────────────────────────────
function LivePreview({ design, device, previewMode, iframeRef }: any) {
  const isDesktop = device === "desktop";
  
  // Derive the base URL from the current page — works on localhost AND GitHub Pages /RepoName/
  // e.g. https://user.github.io/Repo/admin -> https://user.github.io/Repo
  const basePath = window.location.pathname.replace(/\/admin\/?.*$/, "").replace(/\/$/, "");
  const baseUrl = window.location.origin + basePath;
  const previewUrl = baseUrl + (previewMode.value === "shop" ? "/?catalog=true&preview=true" : "/?preview=true");

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#e8e8e8] overflow-hidden p-6 pt-2">
      {/* Preview mode tabs */}
      <div className="flex gap-1 bg-white/80 border border-neutral-200 rounded-full p-0.5 mb-4 shadow-sm">
        {(["homepage", "shop"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => previewMode.set(mode)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all ${
              previewMode.value === mode
                ? "bg-neutral-900 text-white shadow"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {mode === "homepage" ? <Home size={10} /> : <ShoppingBag size={10} />}
            {mode}
          </button>
        ))}
      </div>

      {/* Browser chrome / Device Frame */}
      <div
        className={`bg-white shadow-2xl relative transition-all duration-700 ease-in-out flex flex-col ${
          isDesktop 
            ? "rounded-2xl border border-neutral-300/50 w-full max-w-[1200px] h-full" 
            : "rounded-[3rem] border-[8px] border-neutral-900 w-[375px] h-[760px] scale-[0.85] 2xl:scale-100"
        }`}
      >
        {/* Notch for Mobile */}
        {!isDesktop && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-900 rounded-b-2xl z-20 flex items-center justify-center gap-1.5">
            <div className="w-8 h-1 bg-white/10 rounded-full" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
          </div>
        )}

        {/* URL bar - Hidden on Mobile Frame for cleaner look */}
        {isDesktop && (
          <div className="bg-[#f5f5f5] border-b border-neutral-200 px-3 py-2 flex items-center gap-2 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-1 flex items-center gap-1.5 mx-2">
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-[9px] text-neutral-400 font-mono truncate">{previewUrl}</span>
            </div>
            <Eye size={11} className="text-neutral-300" />
          </div>
        )}

        {/* Iframe Viewport */}
        <div className={`flex-1 bg-white relative overflow-hidden ${!isDesktop ? "rounded-[2.2rem]" : ""}`}>
          <iframe
            key={previewMode.value}  // remount iframe when mode changes
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-none"
            title="Theme Preview"
          />
        </div>

        {/* Home Indicator for Mobile */}
        {!isDesktop && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-neutral-900/10 rounded-full" />
        )}
      </div>

      <p className="text-[10px] text-neutral-400 mt-4 font-bold tracking-[0.2em] uppercase flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        {isDesktop ? "Desktop" : "Mobile"} Viewport · Live Preview Sync
      </p>
    </div>
  );
}

function HomepagePreview({ design, bg, text, accent, font, pages }: any) {
  const hero = design.hero || { slides: [] };
  const showAnnouncement = design.showAnnouncement ?? true;
  const navPages = (pages || []).filter((p: any) => p.showInNav && p.status === "published");
  const headerLinks = design.headerLinks || {};
  const activeSlide = (hero.slides || [])[0] || {
    title: "F✶M",
    subtitle: "PHOTOGRAPHY & ART BOOKS",
    ctaText: "ENTER ARCHIVE",
    imageUrl: ""
  };

  const alignClass = hero.align === "left" ? "items-start text-left" : hero.align === "right" ? "items-end text-right" : "items-center text-center";
  const buttonStyle = design.buttonStyle || "solid";
  const buttonRadius = design.buttonRadius ?? 999;
  const buttonShadow = design.buttonShadow ?? true;
  const buttonUppercase = design.buttonUppercase ?? true;

  return (
    <div className="h-full flex flex-col" style={{ background: bg, color: text, fontFamily: font }}>
      {showAnnouncement && (
        <div
          className="px-4 py-2 text-center text-[8px] font-bold tracking-[0.3em] uppercase flex-shrink-0"
          style={{ background: design.announcementBg || "#000000", color: design.announcementColor || "#ffffff" }}
        >
          <span className={design.announcementScrolling ? "animate-marquee inline-block" : ""}>
            {design.announcementText || "INDEPENDENT PUBLISHING HOUSE"}
          </span>
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 backdrop-blur-md" style={{ borderColor: `${text}15`, background: `${bg}80` }}>
        {(headerLinks.showEnterArchive ?? true) ? (
          <span className="text-[10px] font-bold tracking-[0.2em] opacity-90">ENTER ARCHIVE</span>
        ) : (
          <span className="text-[11px] font-black tracking-tight opacity-90">F✶M</span>
        )}
        <div className="flex items-center gap-4">
          {(headerLinks.showInformation ?? true) && (
            <span className="text-[8px] tracking-widest opacity-60 uppercase">INFORMATION</span>
          )}
          {(headerLinks.showCustomPages ?? true) && (
            <>
              <span className="text-[8px] tracking-widest opacity-50 uppercase">{design.navHeading || "INFO"}</span>
              {navPages.slice(0, 1).map((p: any) => (
                <span key={p.id} className="text-[7px] tracking-widest opacity-40 uppercase truncate max-w-[50px]">{p.title}</span>
              ))}
            </>
          )}
          {(headerLinks.showBag ?? true) && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full border text-[8px] font-bold tracking-widest" style={{ borderColor: `${text}20`, background: `${text}10` }}>
              {design.cartLabel || "BAG"}
            </div>
          )}
          {(headerLinks.showSys ?? true) && (
            <span className="text-[7px] tracking-widest opacity-30">SYS</span>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className={`flex-1 relative overflow-hidden flex flex-col justify-center px-8 ${alignClass}`}>
        {/* Overlay */}
        <div className="absolute inset-0 z-0 transition-opacity duration-500" style={{ background: "black", opacity: hero.overlayOpacity ?? 0.4 }} />
        
        {/* Background Image */}
        {activeSlide.imageUrl ? (
           <img src={activeSlide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover -z-10" />
        ) : (
           <div className="absolute inset-0 bg-neutral-900 -z-10" />
        )}
        
        {/* Content */}
        <div className="relative z-10 max-w-[200px]">
          {activeSlide.badge && (
            <div className="inline-flex mb-3 px-2.5 py-1 rounded-full border border-white/30 text-[6px] uppercase tracking-[0.25em] text-white/90">
              {activeSlide.badge}
            </div>
          )}
          <h2 className="text-[16px] font-black tracking-tight leading-none mb-1 text-white uppercase">{activeSlide.title}</h2>
          <p className="text-[8px] tracking-[0.2em] font-medium text-white/60 mb-4 whitespace-pre-wrap">{activeSlide.subtitle}</p>
          <div className={`flex flex-wrap items-center gap-2 ${
            hero.align === "left" ? "justify-start" : hero.align === "right" ? "justify-end" : "justify-center"
          }`}>
            <div
              className={`inline-block px-5 py-2 text-[7px] font-bold tracking-widest transition-transform hover:scale-105 ${buttonUppercase ? "uppercase" : ""} ${buttonShadow ? "shadow-lg" : ""}`}
              style={{
                borderRadius: buttonRadius,
                background: buttonStyle === "ghost" ? "transparent" : accent,
                color: buttonStyle === "solid" ? "white" : accent,
                border: buttonStyle === "outline" || buttonStyle === "ghost" ? `1px solid ${accent}` : "none",
              }}
            >
              {activeSlide.ctaText}
            </div>
          </div>
        </div>

        {/* Slide Indicators if multi */}
        {(hero.slides || []).length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
             {(hero.slides || []).map((_: any, i: number) => (
               <div key={i} className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/20'}`} />
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopPreview({ design, bg, text, accent, font, pages }: any) {
  const aspectClass = design.imageAspectRatio === "1:1" ? "aspect-square" : design.imageAspectRatio === "2:3" ? "aspect-[2/3]" : "aspect-[3/4]";
  const showAnnouncement = design.showAnnouncement ?? true;
  const navPages = (pages || []).filter((p: any) => p.showInNav && p.status === "published");
  const headerLinks = design.headerLinks || {};
  const cardRadius = design.cardRadius ?? 8;
  const desktopColumns = Math.max(2, Math.min(6, design.productColumnsDesktop ?? 4));
  const mobileColumns = Math.max(1, Math.min(3, design.productColumnsMobile ?? 2));
  const buttonStyle = design.buttonStyle || "solid";
  const buttonRadius = design.buttonRadius ?? 999;
  const buttonShadow = design.buttonShadow ?? true;
  const buttonUppercase = design.buttonUppercase ?? true;

  const MOCK_BOOKS = [
    { title: "Volume I", price: "$42.00", color: "#2a2a2a" },
    { title: "Archive Issue", price: "$68.00", color: "#3d3030" },
    { title: "Selected Works", price: "$55.00", color: "#1a2a1a" },
    { title: "Limited Edit.", price: "$120.00", color: "#2a2040" },
    { title: "Ephemera", price: "$28.00", color: "#3a2a10" },
    { title: "Light Study", price: "$85.00", color: "#1a1a2a" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: bg, color: text, fontFamily: font }}>
      {showAnnouncement && (
        <div
          className="px-2 py-1.5 text-center text-[7px] font-bold tracking-[0.2em] uppercase flex-shrink-0"
          style={{ background: design.announcementBg || "#000000", color: design.announcementColor || "#ffffff" }}
        >
          {design.announcementText || "INDEPENDENT PUBLISHING HOUSE"}
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0 backdrop-blur-sm sticky top-0 z-10" style={{ borderColor: `${text}15`, background: `${bg}cc` }}>
        <span className="text-[9px] font-black tracking-tight">F✶M</span>
        <div className="flex items-center gap-3">
          {["PUBLICATIONS", "PRINTS"].map((c) => (
            <span key={c} className="text-[7px] tracking-widest opacity-40">{c}</span>
          ))}
          {(headerLinks.showCustomPages ?? true) && (
            <>
              <span className="text-[7px] font-bold tracking-widest opacity-60 ml-1 border-l pl-2" style={{ borderColor: `${text}20` }}>
                {design.navHeading || "INFO"}
              </span>
              {navPages.slice(0, 1).map((p: any) => (
                <span key={p.id} className="text-[6px] tracking-widest opacity-30 uppercase">{p.title}</span>
              ))}
            </>
          )}
          {(headerLinks.showInformation ?? true) && (
            <span className="text-[7px] tracking-widest opacity-40 uppercase">INFORMATION</span>
          )}
        </div>
        {(headerLinks.showBag ?? true) && (
          <div className="text-[7px] font-bold tracking-widest opacity-50 px-2 py-0.5 border rounded-full" style={{ borderColor: `${text}20` }}>
            {design.cartLabel || "BAG"}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${mobileColumns}, minmax(0, 1fr))`,
          }}
        >
          {MOCK_BOOKS.map((book, i) => (
            <div key={i} className="group relative cursor-pointer">
              <div className={`${aspectClass} overflow-hidden mb-1.5 relative`} style={{ background: book.color, borderRadius: cardRadius }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span
                    className={`text-[6px] font-bold tracking-widest px-2 py-1 ${buttonUppercase ? "uppercase" : ""} ${buttonShadow ? "shadow-lg" : ""}`}
                    style={{
                      borderRadius: buttonRadius,
                      background: buttonStyle === "ghost" ? "transparent" : accent,
                      color: buttonStyle === "solid" ? "#fff" : accent,
                      border: buttonStyle === "outline" || buttonStyle === "ghost" ? `1px solid ${accent}` : "none",
                    }}
                  >
                    {design.productCTA || "VIEW"}
                  </span>
                </div>
              </div>
              <p className="text-[7px] font-medium tracking-wide leading-tight opacity-80 truncate">{book.title}</p>
              <p className="text-[7px] opacity-40">{book.price}</p>
            </div>
          ))}
        </div>
        <div className="text-[7px] opacity-30 mt-3">
          Product grid: {desktopColumns} desktop / {mobileColumns} mobile columns
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ThemeEditor component
// ─────────────────────────────────────────────────────────────────────────────
export interface ThemeEditorProps {
  settings: any;
  onSave: (design: any, options?: any) => Promise<void>;
  onExit: () => void;
}

export function ThemeEditor({ settings, onSave, onExit }: ThemeEditorProps) {
  const getInitialDesign = () => {
    const baseDesign = adminApi.getDefaultSettings().design;
    const incomingDesign = settings?.draftDesign || settings?.design || {};
    const mergedLegacy = { ...baseDesign, ...incomingDesign };
    const { heroPage: _legacyHeroPage, storefront: _legacyStorefront, ...surfaceBase } = mergedLegacy;

    return {
      ...mergedLegacy,
      heroPage: {
        ...surfaceBase,
        ...(incomingDesign.heroPage || {}),
      },
      storefront: {
        ...surfaceBase,
        ...(incomingDesign.storefront || {}),
      },
    };
  };

  // Local copy of just the design settings — changes here won't affect Firebase until "Publish"
  const [design, setDesign] = useState<any>(getInitialDesign);
  const [savedDesign, setSavedDesign] = useState<any>(getInitialDesign);
  const [pastDesigns, setPastDesigns] = useState<any[]>([]);
  const [futureDesigns, setFutureDesigns] = useState<any[]>([]);

  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [designSurface, setDesignSurface] = useState<"heroPage" | "storefront">("heroPage");
  const [previewMode, setPreviewMode] = useState<"homepage" | "shop">("homepage");
  const [activeTab, setActiveTab] = useState<string>("settings");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settingsSearch, setSettingsSearch] = useState("");
  const [pages, setPages] = useState<any[]>([]);
  const [syncPreview, setSyncPreview] = useState(true);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync design to preview iframe — retry every 300ms until acknowledged
  const syncPending = useRef(false);
  useEffect(() => {
    if (!iframeRef.current) return;
    syncPending.current = true;

    const send = () => {
      const update = { type: "THEME_UPDATE", design };
      try {
        iframeRef.current?.contentWindow?.postMessage(update, "*");
      } catch (_) {}
      
      // Cross-tab broadcast
      try {
        const bc = new BroadcastChannel("site_preview_updates");
        bc.postMessage(update);
        bc.close();
      } catch (_) {}
    };

    send(); // immediate attempt
    const interval = setInterval(() => {
      if (!syncPending.current) { clearInterval(interval); return; }
      send();
    }, 400);

    return () => {
      clearInterval(interval);
      syncPending.current = false;
    };
  }, [design]);

  // Listen for preview ready signal — acknowledge and stop retrying
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "PREVIEW_READY") {
        setIsPreviewReady(true);
        syncPending.current = false; // stop retry loop
        // Send immediately now that the frame is ready
        try {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "THEME_UPDATE", design },
            "*"
          );
        } catch (_) {}
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [design]);

  useEffect(() => {
    adminApi.getPages().then(setPages);
  }, []);

  useEffect(() => {
    if (!syncPreview || !activeSection) return;
    // Sections that should preview the hero/homepage
    const heroSections = new Set(["homepage", "style", "navigation", "textsize"]);
    if (heroSections.has(activeSection)) {
      setDesignSurface("heroPage");
      setPreviewMode("homepage");
      return;
    }
    // Everything else previews the storefront/shop
    setDesignSurface("storefront");
    setPreviewMode("shop");
  }, [activeSection, syncPreview]);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const hasChanges = JSON.stringify(design) !== JSON.stringify(savedDesign);
  const activeDesign = design?.[designSurface] || {};

  // Update a single design key
  const update = useCallback((key: string, value: any, isGlobal = false) => {
    setDesign((prev: any) => {
      const nextDesign = isGlobal ? {
        ...prev,
        [key]: value
      } : {
        ...prev,
        [designSurface]: {
          ...(prev?.[designSurface] || {}),
          [key]: value,
        },
      };
      
      // Update history
      setPastDesigns((prevHistory) => [...prevHistory.slice(-74), prev]);
      setFutureDesigns([]);
      
      return nextDesign;
    });
    setSaved(false);
  }, [designSurface]);

  const undo = () => {
    if (pastDesigns.length === 0) return;
    const previous = pastDesigns[pastDesigns.length - 1];
    setPastDesigns((prev) => prev.slice(0, -1));
    setFutureDesigns((next) => [design, ...next].slice(0, 75));
    setDesign(previous);
    setSaved(false);
  };

  const redo = () => {
    if (futureDesigns.length === 0) return;
    const [next, ...rest] = futureDesigns;
    setFutureDesigns(rest);
    setPastDesigns((prev) => [...prev.slice(-74), design]);
    setDesign(next);
    setSaved(false);
  };

  const handleSave = async (options: { publish?: boolean } = {}) => {
    if (options.publish) setSaving(true);
    else setSavingDraft(true);
    
    try {
      await onSave(design, options);
      setSavedDesign(design);
      if (options.publish) {
        setPastDesigns([]);
        setFutureDesigns([]);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Error saving design");
    } finally {
      setSaving(false);
      setSavingDraft(false);
    }
  };

  const SECTIONS = [
    {
      id: "style",
      icon: <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />,
      title: "Style",
      description: "Fonts, color palettes and visual identity",
    },
    {
      id: "navigation",
      icon: <LayoutTemplate size={14} />,
      title: "Navigation and layout",
      description: "Manage header, footer, main menus and general layout",
    },
    {
      id: "homepage",
      icon: <Home size={14} />,
      title: "Homepage",
      description: "Manage homepage options and layout",
    },
    {
      id: "products",
      icon: <ShoppingBag size={14} />,
      title: "Products",
      description: "Manage product and product page options",
    },
    {
      id: "layout",
      icon: <LayoutTemplate size={14} />,
      title: "Layout controls",
      description: "Fine tune spacing, widths, border radius and product columns",
    },
    {
      id: "buttons",
      icon: <div className="w-4 h-2 rounded-full bg-neutral-400" />,
      title: "Buttons and CTA",
      description: "Control button style, shape and emphasis",
    },
    {
      id: "announcements",
      icon: <div className="w-4 h-1.5 rounded bg-neutral-400" />,
      title: "Shop announcements",
      description: "Customise messages on announcement banners",
    },
    {
      id: "social",
      icon: <Instagram size={14} />,
      title: "Social media links",
      description: "Manage social links that display in the shop footer",
    },
    {
      id: "textsize",
      icon: (
        <div className="flex items-end gap-0.5">
          <div className="w-1 h-2 bg-neutral-400 rounded" />
          <div className="w-1 h-3 bg-neutral-400 rounded" />
          <div className="w-1 h-4 bg-neutral-400 rounded" />
        </div>
      ),
      title: "Text sizing",
      description: "Manage text size options",
    },
    {
      id: "translations",
      icon: <Globe size={14} />,
      title: "Text and translations",
      description: "Customise system text like buttons and navigation labels",
    },
    {
      id: "additional",
      icon: <Settings size={14} />,
      title: "Additional settings",
      description: "Manage additional template settings such as animations",
    },
  ];

  const filteredSections = useMemo(() => {
    const q = settingsSearch.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter((section) =>
      section.title.toLowerCase().includes(q) ||
      section.description.toLowerCase().includes(q),
    );
  }, [SECTIONS, settingsSearch]);

  const renderSubPanel = () => {
    switch (activeSection) {
      case "style":         return <StylePanel design={activeDesign} update={update} />;
      case "navigation":    return <NavigationPanel design={activeDesign} update={update} setActiveTab={setActiveTab} setActiveSection={setActiveSection} />;
      case "homepage":      return <HomepagePanel design={activeDesign} update={update} />;
      case "products":      return <ProductsPanel design={activeDesign} update={update} />;
      case "layout":        return <LayoutPanel design={activeDesign} update={update} />;
      case "buttons":       return <ButtonsPanel design={activeDesign} update={update} />;
      case "announcements": return <AnnouncementsPanel design={activeDesign} update={update} />;
      case "social":        return <SocialPanel design={activeDesign} update={update} />;
      case "textsize":      return <TextSizingPanel design={activeDesign} update={update} />;
      case "translations":  return <TranslationsPanel design={activeDesign} update={update} />;
      case "additional":    return <AdditionalPanel design={activeDesign} update={update} />;
      default:              return null;
    }
  };

  const renderPagesPanel = () => {
    return <PagesPanel pages={pages} setPages={setPages} design={design} update={update} />;
  };

  const currentSectionTitle = SECTIONS.find(s => s.id === activeSection)?.title || "";

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#f0f0f0]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* ── Top bar ── */}
      <div className="h-12 bg-[#1a1a1a] text-white flex items-center justify-between px-4 flex-shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">Theme Editor</span>
          <span className="text-white/20">·</span>
          <span className="text-[10px] text-white/40 font-medium">Lyricalmyrical Dark</span>
          {hasChanges && (
            <span className="bg-amber-500/20 text-amber-400 text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-full border border-amber-500/30 uppercase">
              Unsaved
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={pastDesigns.length === 0}
              className="px-2 py-1 rounded-md bg-white/10 text-[9px] font-semibold tracking-wider uppercase disabled:opacity-30"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={futureDesigns.length === 0}
              className="px-2 py-1 rounded-md bg-white/10 text-[9px] font-semibold tracking-wider uppercase disabled:opacity-30"
            >
              Redo
            </button>
          </div>
          <button
            onClick={() => setSyncPreview((prev) => !prev)}
            className={`px-2 py-1 rounded-md text-[9px] font-semibold tracking-wider uppercase border ${
              syncPreview ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-white/10 text-white/50 border-white/10"
            }`}
          >
            {syncPreview ? "Sync on" : "Sync off"}
          </button>
        </div>

        {/* Device switcher */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 group/device">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`p-1.5 rounded-md transition-all relative group/btn ${device === d ? "bg-white/20 text-white" : "text-white/40 hover:text-white/60"}`}
              title={d.charAt(0).toUpperCase() + d.slice(1)}
            >
              {d === "desktop" ? <Monitor size={13} /> : <Smartphone size={13} />}
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[8px] font-bold text-white rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {d.toUpperCase()} VIEW
              </span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-[10px] font-semibold tracking-wider"
          >
            <X size={12} /> Exit
          </button>
          
          <a
            href={(() => {
              const basePath = window.location.pathname.replace(/\/admin\/?.*$/, "").replace(/\/$/, "");
              return window.location.origin + basePath + "/?preview=true";
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-[10px] font-semibold tracking-wider mr-2"
          >
            <Eye size={12} /> Preview Live
          </a>
          
          <button
            onClick={() => handleSave({ publish: false })}
            disabled={saving || savingDraft || !hasChanges}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all border border-white/10 ${
              !hasChanges ? "opacity-30 cursor-not-allowed" : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
          >
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>

          <button
            onClick={() => setShowPublishModal(true)}
            disabled={saving || savingDraft}
            className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all ${
              saved
                ? "bg-green-500 text-white"
                : "bg-white text-black hover:bg-neutral-100 shadow-lg active:scale-95"
            }`}
          >
            {saved ? <><Check size={11} /> Saved!</> : saving ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      <AnimatePresence>
        {showPublishModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                  <Globe size={32} />
                </div>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight mb-2">Publish Changes?</h3>
                <p className="text-neutral-500 text-[13px] leading-relaxed mb-8">
                  Your new theme settings will be applied to the live storefront. This action cannot be instantly reversed.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      setShowPublishModal(false);
                      await handleSave({ publish: true });
                    }}
                    className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-black transition-all active:scale-[0.98]"
                  >
                    Confirm & Publish
                  </button>
                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="w-full py-4 text-[11px] font-bold text-neutral-400 tracking-[0.2em] uppercase hover:text-neutral-900 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ── */}
        <div className="w-[300px] bg-white flex flex-col border-r border-neutral-200 shadow-sm flex-shrink-0">
          {/* Tab nav */}
          <div className="flex border-b border-neutral-100">
            {(
              [
                { id: "settings",  icon: <Settings size={11} />,      label: "Settings" },
                { id: "pages",     icon: <FileText size={11} />,       label: "Menu & Pages" },
                { id: "code",      icon: <Code2 size={11} />,          label: "Code" },
                { id: "templates", icon: <LayoutTemplate size={11} />, label: "Templates" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setActiveSection(null); }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-[8px] font-bold tracking-wider uppercase transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-neutral-400 hover:text-neutral-600"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === "settings" ? (
                <motion.div
                  key={activeSection || "__list__"}
                  initial={{ opacity: 0, x: activeSection ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: activeSection ? -20 : 20 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {activeSection ? (
                    <>
                      <SubPanelHeader title={currentSectionTitle} onBack={() => setActiveSection(null)} />
                      <div className="flex-1 overflow-y-auto">
                        {renderSubPanel()}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      {/* Options header */}
                      <div className="px-4 pt-4 pb-3">
                        <h2 className="text-[13px] font-bold text-neutral-800">Settings</h2>
                        <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
                          Customise your template, colours, layout and social profiles.
                        </p>
                        <input
                          value={settingsSearch}
                          onChange={(e) => setSettingsSearch(e.target.value)}
                          placeholder="Search settings..."
                          className="mt-3 w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-neutral-400 transition-colors"
                        />
                      </div>

                      {filteredSections.map((section) => (
                        <SectionRow
                          key={section.id}
                          icon={section.icon}
                          title={section.title}
                          description={section.description}
                          onClick={() => setActiveSection(section.id)}
                        />
                      ))}
                      {filteredSections.length === 0 && (
                        <div className="px-4 pb-4 text-[10px] text-neutral-400">
                          No section matches your search.
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : activeTab === "pages" ? (
                <motion.div
                  key="pages"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {renderPagesPanel()}
                </motion.div>
              ) : activeTab === "code" ? (
                <motion.div
                  key="code"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-widest">Custom code</h3>
                  </div>
                  <CodePanel design={activeDesign} update={update} />
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center p-6 text-center"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                      {activeTab === "code" && <Code2 size={20} />}
                      {activeTab === "templates" && <LayoutTemplate size={20} />}
                    </div>
                    <p className="text-[11px] font-semibold text-neutral-500 capitalize">{activeTab}</p>
                    <p className="text-[10px] text-neutral-300 mt-1">Coming soon</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right preview pane ── */}
        <LivePreview
          design={design}
          device={device}
          previewMode={{ value: previewMode, set: (m: "homepage" | "shop") => { setPreviewMode(m); setIsPreviewReady(false); } }}
          iframeRef={iframeRef}
        />
      </div>
    </div>
  );
}

function SidebarAssetUpload({ value, onChange, label, type }: any) {
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await adminApi.uploadBrandAsset(file, type);
      onChange(url);
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 space-y-3">
      {value && (
        <div className="aspect-square w-12 rounded-lg overflow-hidden border border-neutral-200 bg-white">
          <img src={value} className="w-full h-full object-contain" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <input 
          value={value || ""} 
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL..."
          className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-neutral-400"
        />
        <div className="relative">
          <input 
            type="file" 
            id={`asset-${type}`} 
            className="hidden" 
            accept="image/*" 
            onChange={handleUpload}
          />
          <label 
            htmlFor={`asset-${type}`}
            className="flex items-center justify-center gap-2 w-full py-1.5 bg-white border border-neutral-200 rounded-lg text-[9px] font-bold cursor-pointer hover:bg-neutral-50 transition-all uppercase tracking-widest"
          >
            {uploading ? <RefreshCw size={10} className="animate-spin" /> : <Plus size={10} />}
            {uploading ? "Uploading..." : label}
          </label>
        </div>
      </div>
    </div>
  );
}
