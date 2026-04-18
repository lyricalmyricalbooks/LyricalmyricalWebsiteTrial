import { useState, useEffect, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { adminApi } from "./api";

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

function SidebarInput({ value, onChange, placeholder, type = "text" }: any) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-neutral-400 transition-colors"
    />
  );
}

function SidebarSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-neutral-400 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
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

  return (
    <div className="p-4 space-y-6 overflow-y-auto flex-1">
      {/* Live type preview */}
      <div className="rounded-xl overflow-hidden border border-neutral-200">
        <div className="bg-neutral-800 px-4 py-5">
          <p className="text-white font-bold text-base" style={{ fontFamily: design.font || "Inter" }}>
            My title
          </p>
          <p className="text-white/60 text-[11px] mt-1 leading-relaxed" style={{ fontFamily: design.font || "Inter" }}>
            The quick brown fox jumped over the lazy dog
          </p>
        </div>
        <button className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-neutral-50 transition-colors border-t border-neutral-100">
          <span className="text-[11px] text-blue-500 font-semibold">Change current style</span>
          <ChevronRight size={12} className="text-blue-400" />
        </button>
      </div>

      {/* Color palettes */}
      <div>
        <SidebarLabel>Color palette</SidebarLabel>
        <div className="grid grid-cols-3 gap-2">
          {PALETTES.map((palette) => (
            <button
              key={palette.id}
              onClick={() => {
                update("palettePreset", palette.id);
                update("primaryColor", palette.accent);
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
      </div>

      {/* Custom accent */}
      <div>
        <SidebarLabel>Accent color</SidebarLabel>
        <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5">
          <div className="w-6 h-6 rounded-md shadow-inner border border-neutral-200 flex-shrink-0" style={{ background: design.primaryColor }} />
          <input
            type="color"
            value={design.primaryColor || "#A855F7"}
            onChange={(e) => update("primaryColor", e.target.value)}
            className="w-8 h-6 bg-transparent border-none outline-none cursor-pointer"
          />
          <span className="text-[10px] text-neutral-500 font-mono">{design.primaryColor}</span>
        </div>
      </div>

      {/* Font */}
      <div>
        <SidebarLabel>Font</SidebarLabel>
        <div className="space-y-1.5">
          {FONTS.map((f) => (
            <button
              key={f.value}
              onClick={() => update("font", f.value)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                design.font === f.value ? "bg-blue-50 border-blue-400" : "bg-neutral-50 border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="text-left">
                <p className={`text-[12px] font-semibold ${design.font === f.value ? "text-blue-700" : "text-neutral-800"}`} style={{ fontFamily: f.value }}>
                  {f.label}
                </p>
                <p className="text-[9px] text-neutral-400">{f.sub}</p>
              </div>
              {design.font === f.value && <Check size={12} className="text-blue-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavigationPanel({ design, update }: any) {
  const headerLinks = design.headerLinks || {};
  const updateHeaderLink = (key: string, value: boolean) => {
    update("headerLinks", { ...headerLinks, [key]: value });
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto flex-1">
      <div>
        <SidebarLabel>Header style</SidebarLabel>
        <SidebarRadioGroup
          value={design.headerStyle || "minimal"}
          onChange={(v) => update("headerStyle", v)}
          options={[
            { value: "minimal", label: "Minimal" },
            { value: "centered", label: "Centered" },
            { value: "full", label: "Full" },
          ]}
        />
      </div>

      <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden">
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

      <div>
        <SidebarLabel>Pages Navigation Heading</SidebarLabel>
        <SidebarInput
          value={design.navHeading || "INFO"}
          onChange={(v: string) => update("navHeading", v)}
          placeholder="INFO"
        />
        <p className="text-[9px] text-neutral-400 mt-2 leading-relaxed">
          The label shown in the header before your custom pages.
        </p>
      </div>

      <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden">
        <SidebarToggle
          label="Enter Archive button"
          description="Show or hide the Enter Archive button in the homepage header"
          checked={headerLinks.showEnterArchive ?? true}
          onChange={(v: boolean) => updateHeaderLink("showEnterArchive", v)}
        />
        <SidebarToggle
          label="Information button"
          description="Show or hide the Information button in top navigation"
          checked={headerLinks.showInformation ?? true}
          onChange={(v: boolean) => updateHeaderLink("showInformation", v)}
        />
        <SidebarToggle
          label="Custom pages links"
          description="Show or hide the INFO heading and custom pages links"
          checked={headerLinks.showCustomPages ?? true}
          onChange={(v: boolean) => updateHeaderLink("showCustomPages", v)}
        />
        <SidebarToggle
          label="Bag button"
          description="Show or hide the Bag button in top navigation"
          checked={headerLinks.showBag ?? true}
          onChange={(v: boolean) => updateHeaderLink("showBag", v)}
        />
        <SidebarToggle
          label="SYS link"
          description="Show or hide the SYS admin shortcut in the homepage header"
          checked={headerLinks.showSys ?? true}
          onChange={(v: boolean) => updateHeaderLink("showSys", v)}
        />
      </div>
    </div>
  );
}

function HomepagePanel({ design, update }: any) {
  const hero = design.hero || { slides: [] };
  const updateHero = (key: string, value: any) => {
    update("hero", { ...hero, [key]: value });
  };

  const addSlide = () => {
    const newSlide = {
      id: crypto.randomUUID(),
      imageUrl: "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=1600&h=900&fit=crop",
      title: "NEW SLIDE",
      subtitle: "SUBTITLE HERE",
      ctaText: "LEARN MORE",
      ctaLink: "/"
    };
    updateHero("slides", [...(hero.slides || []), newSlide]);
  };

  const removeSlide = (id: string) => {
    updateHero("slides", hero.slides.filter((s: any) => s.id !== id));
  };

  const duplicateSlide = (slide: any) => {
    const clone = {
      ...slide,
      id: crypto.randomUUID(),
      title: `${slide.title || "SLIDE"} COPY`,
    };
    updateHero("slides", [...(hero.slides || []), clone]);
  };

  const updateSlide = (id: string, field: string, value: string) => {
    updateHero("slides", hero.slides.map((s: any) => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleImageUpload = async (id: string, file: File) => {
    try {
      const url = await adminApi.uploadFile(file, `hero/${id}_${Date.now()}`);
      updateSlide(id, "imageUrl", url);
    } catch (err) {
      alert("Error uploading image");
    }
  };

  return (
    <div className="p-4 space-y-8 overflow-y-auto flex-1">
      <div className="border border-neutral-100 rounded-xl overflow-hidden">
        <SidebarToggle
          label="Enable homepage hero"
          description="Turn the entry hero section on or off for your storefront."
          checked={hero.enabled ?? true}
          onChange={(v: boolean) => updateHero("enabled", v)}
        />
        <SidebarToggle
          label="Auto-rotate slides"
          description="Automatically cycle through hero slides on the homepage."
          checked={hero.autoRotate ?? true}
          onChange={(v: boolean) => updateHero("autoRotate", v)}
        />
      </div>

      {/* Layout & Style */}
      <div className="space-y-6">
        <div>
          <SidebarLabel>Hero Height</SidebarLabel>
          <SidebarRadioGroup
            value={hero.height || "fullscreen"}
            onChange={(v) => updateHero("height", v)}
            options={[
              { value: "fullscreen", label: "Full" },
              { value: "tall", label: "Tall" },
              { value: "medium", label: "Med" },
            ]}
          />
        </div>

        <div>
           <SidebarLabel>Content Alignment</SidebarLabel>
           <SidebarRadioGroup
            value={hero.align || "center"}
            onChange={(v) => updateHero("align", v)}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <SidebarLabel>Overlay Opacity</SidebarLabel>
            <span className="text-[10px] text-neutral-400 font-mono">{Math.round((hero.overlayOpacity || 0) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={hero.overlayOpacity ?? 0.4}
            onChange={(e) => updateHero("overlayOpacity", parseFloat(e.target.value))}
            className="w-full accent-blue-500 h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <SidebarLabel>Slide duration</SidebarLabel>
            <span className="text-[10px] text-neutral-400 font-mono">{hero.rotateMs || 5000}ms</span>
          </div>
          <input
            type="range"
            min="2000"
            max="10000"
            step="500"
            value={hero.rotateMs || 5000}
            onChange={(e) => updateHero("rotateMs", parseInt(e.target.value, 10))}
            className="w-full accent-blue-500 h-1 bg-neutral-100 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <hr className="border-neutral-100" />

      {/* Slides */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SidebarLabel>Slides</SidebarLabel>
          <button
            onClick={addSlide}
            className="p-1 hover:bg-neutral-100 rounded text-blue-500 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="space-y-4">
          {(hero.slides || []).map((slide: any, index: number) => (
            <div key={slide.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 relative group/slide">
               <button
                onClick={() => removeSlide(slide.id)}
                className="absolute -top-2 -right-2 p-1 bg-white border border-neutral-200 rounded-full text-red-500 shadow-sm opacity-0 group-hover/slide:opacity-100 transition-opacity"
               >
                <X size={10} />
               </button>
               <button
                onClick={() => duplicateSlide(slide)}
                className="absolute -top-2 right-5 p-1 bg-white border border-neutral-200 rounded-full text-neutral-500 shadow-sm opacity-0 group-hover/slide:opacity-100 transition-opacity"
               >
                <Plus size={10} />
               </button>
               
               <div className="mb-3">
                 <div className="aspect-video bg-neutral-200 rounded-lg overflow-hidden relative mb-2 group">
                   <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                   <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold">
                     CHANGE IMAGE
                     <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) handleImageUpload(slide.id, file);
                     }} />
                   </label>
                 </div>
                 <input
                   value={slide.title}
                   onChange={(e) => updateSlide(slide.id, "title", e.target.value)}
                   placeholder="Slide Title (e.g. F✶M)"
                   className="w-full bg-white border border-neutral-200 rounded px-2 py-1 text-[11px] font-bold outline-none mb-1"
                 />
                 <input
                   value={slide.subtitle}
                   onChange={(e) => updateSlide(slide.id, "subtitle", e.target.value)}
                   placeholder="Subtitle"
                   className="w-full bg-white border border-neutral-200 rounded px-2 py-1 text-[10px] outline-none"
                 />
               </div>

               <div className="grid grid-cols-2 gap-2">
                  <input
                    value={slide.ctaText}
                    onChange={(e) => updateSlide(slide.id, "ctaText", e.target.value)}
                    placeholder="Button Label"
                    className="bg-white border border-neutral-200 rounded px-2 py-1 text-[10px] outline-none"
                  />
                  <input
                    value={slide.ctaLink}
                    onChange={(e) => updateSlide(slide.id, "ctaLink", e.target.value)}
                    placeholder="Link (e.g. /shop)"
                    className="bg-white border border-neutral-200 rounded px-2 py-1 text-[10px] outline-none"
                  />
               </div>
               <input
                 value={slide.badge || ""}
                 onChange={(e) => updateSlide(slide.id, "badge", e.target.value)}
                 placeholder="Optional badge (e.g. New Drop)"
                 className="w-full mt-2 bg-white border border-neutral-200 rounded px-2 py-1 text-[10px] outline-none"
               />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PagesPanel({ pages, setPages }: any) {
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
         <h3 className="text-[11px] font-bold text-neutral-700 uppercase tracking-widest">Pages</h3>
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
    <div className="p-4 space-y-6 overflow-y-auto flex-1">
      <div>
        <SidebarLabel>Product card style</SidebarLabel>
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
        <SidebarLabel>Image aspect ratio</SidebarLabel>
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
        <SidebarLabel>Product CTA button</SidebarLabel>
        <SidebarInput
          value={design.productCTA || "VIEW"}
          onChange={(v: string) => update("productCTA", v)}
          placeholder="VIEW"
        />
      </div>

      <div className="space-y-0 border border-neutral-100 rounded-xl overflow-hidden">
        <SidebarToggle
          label="Show price on hover"
          description="Reveal price when customer hovers over a product card"
          checked={design.showPriceOnHover ?? false}
          onChange={(v: boolean) => update("showPriceOnHover", v)}
        />
      </div>
    </div>
  );
}

function AnnouncementsPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-6 overflow-y-auto flex-1">
      <div className="border border-neutral-100 rounded-xl overflow-hidden">
        <SidebarToggle
          label="Show announcement bar"
          description="Display a banner at the top of your shop"
          checked={design.showAnnouncement ?? true}
          onChange={(v: boolean) => update("showAnnouncement", v)}
        />
      </div>

      {(design.showAnnouncement ?? true) && (
        <>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <SidebarLabel>Background</SidebarLabel>
              <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                <div className="w-5 h-5 rounded border border-neutral-300 flex-shrink-0" style={{ background: design.announcementBg || "#000000" }} />
                <input type="color" value={design.announcementBg || "#000000"} onChange={(e) => update("announcementBg", e.target.value)} className="w-6 h-5 bg-transparent border-none outline-none cursor-pointer" />
              </div>
            </div>
            <div>
              <SidebarLabel>Text color</SidebarLabel>
              <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                <div className="w-5 h-5 rounded border border-neutral-300 flex-shrink-0" style={{ background: design.announcementColor || "#ffffff" }} />
                <input type="color" value={design.announcementColor || "#ffffff"} onChange={(e) => update("announcementColor", e.target.value)} className="w-6 h-5 bg-transparent border-none outline-none cursor-pointer" />
              </div>
            </div>
          </div>

          <div className="border border-neutral-100 rounded-xl overflow-hidden">
            <SidebarToggle
              label="Scrolling text"
              description="Animate the announcement text to scroll across"
              checked={design.announcementScrolling ?? false}
              onChange={(v: boolean) => update("announcementScrolling", v)}
            />
          </div>
        </>
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
    <div className="p-4 space-y-4 overflow-y-auto flex-1">
      <p className="text-[10px] text-neutral-400 leading-relaxed">
        These links will appear in your shop footer.
      </p>

      {[
        { key: "instagram", label: "Instagram", icon: <Instagram size={12} />, placeholder: "https://instagram.com/yourshop" },
        { key: "twitter",   label: "Twitter / X", icon: <Twitter size={12} />, placeholder: "https://twitter.com/yourshop" },
        { key: "facebook",  label: "Facebook",  icon: <Facebook size={12} />, placeholder: "https://facebook.com/yourshop" },
        { key: "tiktok",    label: "TikTok",    icon: <Globe size={12} />, placeholder: "https://tiktok.com/@yourshop" },
      ].map(({ key, label, icon, placeholder }) => (
        <div key={key}>
          <SidebarLabel>{label}</SidebarLabel>
          <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 focus-within:border-neutral-400 transition-colors">
            <span className="text-neutral-300">{icon}</span>
            <input
              value={social[key] || ""}
              onChange={(e) => updateSocial(key, e.target.value)}
              placeholder={placeholder}
              className="bg-transparent border-none outline-none text-[11px] flex-1"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TextSizingPanel({ design, update }: any) {
  return (
    <div className="p-4 space-y-6 overflow-y-auto flex-1">
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

      {/* Live type specimen */}
      <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
        <p className="text-[9px] text-neutral-400 mb-3 font-semibold uppercase tracking-widest">Preview</p>
        <p
          className="font-bold text-neutral-800"
          style={{
            fontFamily: design.font || "Inter",
            fontSize: design.fontSize === "sm" ? 18 : design.fontSize === "lg" ? 28 : 22,
            letterSpacing: design.letterSpacing === "ultra" ? "0.15em" : design.letterSpacing === "wide" ? "0.05em" : "0",
          }}
        >
          Aa — {design.font || "Inter"}
        </p>
        <p className="text-neutral-400 text-[11px] mt-1" style={{ fontFamily: design.font || "Inter" }}>
          The quick brown fox jumped over the lazy dog
        </p>
      </div>
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Preview — scaled render of the actual storefront
// ─────────────────────────────────────────────────────────────────────────────
function LivePreview({ design, designSurface, device, previewMode, settings, pages }: any) {
  // Derive merged settings for preview
  const previewSettings = { ...settings, design };
  const previewDesign = previewMode.value === "homepage"
    ? (design?.heroPage || design)
    : (design?.storefront || design);
  const palette = PALETTES.find(p => p.id === previewDesign.palettePreset) || PALETTES[0];
  const bg = palette.bg;
  const text = palette.text;
  const accent = previewDesign.primaryColor || palette.accent;
  const font = previewDesign.font || "Inter";

  const isDesktop = device === "desktop";
  const containerW = isDesktop ? 1280 : 390;
  const containerH = isDesktop ? 800 : 844;

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

      {/* Browser chrome */}
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-300/50 flex flex-col transition-all duration-500"
        style={{
          width: isDesktop ? "100%" : 320,
          maxWidth: isDesktop ? 1100 : 320,
          height: isDesktop ? 640 : 560,
        }}
      >
        {/* URL bar */}
        <div className="bg-[#f5f5f5] border-b border-neutral-200 px-3 py-2 flex items-center gap-2 flex-shrink-0">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-1 flex items-center gap-1.5 mx-2">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-[9px] text-neutral-400 font-mono truncate">lyricalmyricalbooks.com</span>
          </div>
          <Eye size={11} className="text-neutral-300" />
        </div>

        {/* Storefront preview */}
        <div className="flex-1 overflow-hidden relative" style={{ color: text, background: bg, fontFamily: font }}>
          {previewMode.value === "homepage" ? (
            <HomepagePreview design={previewDesign} bg={bg} text={text} accent={accent} font={font} pages={pages} />
          ) : (
            <ShopPreview design={previewDesign} bg={bg} text={text} accent={accent} font={font} pages={pages} />
          )}
        </div>
      </div>

      <p className="text-[9px] text-neutral-400 mt-3 tracking-widest uppercase">
        {isDesktop ? "Desktop" : "Mobile"} · Live Preview · Editing {designSurface === "heroPage" ? "Hero page" : "Internal app"}
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
          <div className="inline-block px-5 py-2 rounded-full text-[7px] font-bold tracking-widest transition-transform hover:scale-105" style={{ background: accent, color: "white" }}>
            {activeSlide.ctaText}
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
        <div className="grid grid-cols-3 gap-2">
          {MOCK_BOOKS.map((book, i) => (
            <div key={i} className="group relative cursor-pointer">
              <div className={`${aspectClass} rounded-md overflow-hidden mb-1.5 relative`} style={{ background: book.color }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                <div className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[6px] font-bold tracking-widest px-2 py-1 rounded" style={{ background: accent, color: "#fff" }}>
                    {design.productCTA || "VIEW"}
                  </span>
                </div>
              </div>
              <p className="text-[7px] font-medium tracking-wide leading-tight opacity-80 truncate">{book.title}</p>
              <p className="text-[7px] opacity-40">{book.price}</p>
            </div>
          ))}
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
  onSave: (design: any) => Promise<void>;
  onExit: () => void;
}

export function ThemeEditor({ settings, onSave, onExit }: ThemeEditorProps) {
  const getInitialDesign = () => {
    const baseDesign = adminApi.getDefaultSettings().design;
    const incomingDesign = settings?.design || {};
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

  useEffect(() => {
    adminApi.getPages().then(setPages);
  }, []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = JSON.stringify(design) !== JSON.stringify(savedDesign);
  const activeDesign = design?.[designSurface] || {};

  // Update a single design key
  const update = useCallback((key: string, value: any) => {
    setPastDesigns((prev) => [...prev.slice(-74), design]);
    setFutureDesigns([]);
    setDesign((prev: any) => ({
      ...prev,
      [designSurface]: {
        ...(prev?.[designSurface] || {}),
        [key]: value,
      },
    }));
    setSaved(false);
  }, [design, designSurface]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(design);
      setSavedDesign(design);
      setPastDesigns([]);
      setFutureDesigns([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Error saving design");
    } finally {
      setSaving(false);
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
      case "navigation":    return <NavigationPanel design={activeDesign} update={update} />;
      case "homepage":      return <HomepagePanel design={activeDesign} update={update} />;
      case "products":      return <ProductsPanel design={activeDesign} update={update} />;
      case "announcements": return <AnnouncementsPanel design={activeDesign} update={update} />;
      case "social":        return <SocialPanel design={activeDesign} update={update} />;
      case "textsize":      return <TextSizingPanel design={activeDesign} update={update} />;
      case "translations":  return <TranslationsPanel design={activeDesign} update={update} />;
      case "additional":    return <AdditionalPanel design={activeDesign} update={update} />;
      default:              return null;
    }
  };

  const renderPagesPanel = () => {
    return <PagesPanel pages={pages} setPages={setPages} />;
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
        </div>

        {/* Device switcher */}
        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`p-1.5 rounded-md transition-all ${device === d ? "bg-white/20 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              {d === "desktop" ? <Monitor size={13} /> : <Smartphone size={13} />}
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
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all ${
              saved
                ? "bg-green-500 text-white"
                : hasChanges
                ? "bg-white text-black hover:bg-white/90 shadow-lg"
                : "bg-white/20 text-white/40 cursor-not-allowed"
            }`}
          >
            {saved ? <><Check size={11} /> Saved!</> : saving ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ── */}
        <div className="w-[300px] bg-white flex flex-col border-r border-neutral-200 shadow-sm flex-shrink-0">
          {/* Tab nav */}
          <div className="flex border-b border-neutral-100">
            {(
              [
                { id: "settings",  icon: <Settings size={11} />,      label: "Settings" },
                { id: "pages",     icon: <FileText size={11} />,       label: "Pages" },
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
                        <h2 className="text-[13px] font-bold text-neutral-800">Options</h2>
                        <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
                          Customise your template settings and links to your shop's social media profiles.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {([
                            { id: "heroPage", label: "Hero page" },
                            { id: "storefront", label: "Internal app" },
                          ] as const).map((surface) => (
                            <button
                              key={surface.id}
                              onClick={() => setDesignSurface(surface.id)}
                              className={`px-2.5 py-2 rounded-lg text-[10px] font-semibold border transition-all ${
                                designSurface === surface.id
                                  ? "bg-blue-50 border-blue-400 text-blue-700"
                                  : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                              }`}
                            >
                              {surface.label}
                            </button>
                          ))}
                        </div>
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
          designSurface={designSurface}
          device={device}
          previewMode={{ value: previewMode, set: setPreviewMode }}
          settings={settings}
          pages={pages}
        />
      </div>
    </div>
  );
}
