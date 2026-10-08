import { StudioCopyField } from "./StudioCopyField";
import { StudioRegionBrowser } from "./StudioRegionBrowser";
import { REGION_GROUPS, REGION_SUFFIXES, REGION_DEVICE_LABELS, regionFieldDevice, regionKey, regionValue, type RegionDevice } from "../../features/site/storefrontRegions";
import { canInlineFormat } from "./richText";
import { applyContextAction, applySpacing, contextCapabilities, GAP_KEYS, PADDING_KEYS, spacingKey } from "./canvasTools";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronDown, ChevronUp, Clipboard, Copy, Eye, EyeOff, ExternalLink, History, Monitor, Plus, Redo2, Search, ShieldCheck, Smartphone,
  Download, Pencil, Tablet, Trash2, Undo2, Upload, X,
} from "lucide-react";
import { adminApi } from "../api";
import {
  SECTION_REGISTRY, SectionFieldEditor, buildPageTemplates,
  getBlockFields, getBlocksKey, getSectionFields, getSectionMeta, DEFAULT_COLOR_SCHEMES,
} from "../ThemeEditorExtensions";
import { CATEGORIES } from "../../features/site/constants";
import { splitNavigation, buildNavItems, childCategories, moveNavItem, parentOf, reslotPages } from "../../features/site/navItems";
import { COPY_SCHEMA, DEFAULT_COPY } from "../../features/site/storeCopy";
import { automaticFooterItems, footerGroup } from "../../features/site/footerNavigation";
import { MENU_LINK_TYPES, newMenuItem, type MenuItem } from "../../features/site/storeMenu";
import {
  commit, duplicateSection, findBlock, getSections, initHistory, insertSection, makeSection, mapBlock, moveBlockBefore, newId, normalizeDesign,
  patchSectionSettings, redo, removeSection, sameDesign, setSections, toggleSection, undo,
  resolveSharedBlocks, type Section, type SectionTarget, type SharedBlock,
} from "./studioModel";
import { STATIC_SURFACES, STYLE_GROUPS, STYLE_TARGET_FIELDS, applyGlobalStyle, readStyle, regionStyleFields, type StyleField, type StyleGroup } from "./styleSchema";
import { StudioPages } from "./StudioPages";
import { StudioCategories } from "./StudioCategories";
import { categoryNavOrder } from "./categoryManager";
import { PREVIEW_BRIDGE_SOURCE } from "./previewBridge";
import { RISO_NOIR_ID, RISO_NOIR_TOKENS } from "../../features/site/risoNoir";
import { addSavedTheme, duplicateSavedTheme, savedThemesBytes, savedThemesFit, parseThemeFile, removeSavedTheme, renameSavedTheme, serializeThemeFile, themeFileName, type SavedTheme } from "./savedThemes";
import { PAYMENT_BADGE_OPTIONS, resolveFooterBadges } from "../../features/site/paymentBadges";
import { HOME_LAYOUT_TEMPLATES } from "./homeLayouts";
import { applyThemeKeysToSurfaces } from "../themeScope";
import { THEME_LIBRARY, PALETTES, THEME_APPLIED_KEYS } from "./themeLibrary";
import { StudioOutline } from "./StudioOutline";
import { StudioInspector } from "./StudioInspector";
import { StudioSearch } from "./StudioSearch.tsx";
import { buildStudioIndex, type SearchEntry } from "./studioSearch";
import { autoFitSections, autoFitRegions } from "./autoMobile";
import { applyCanvasAction, applyPageStyle, buildPreviewState, deliverPreviewState, findSectionOwner, PAGE_STYLE_GROUPS, PREVIEW_CHANNEL, previewRoute, withDraftPage } from "./studioWorkflow";
import { useStudioPersistence } from "./useStudioPersistence";
import { ActionMenu, Dialog, SecondaryButton } from "../riso/components";
import { applyInlineText, INLINE_STYLE_KEYS } from "./inlineText";
import { StudioSharedLayout } from "./StudioSharedLayout";
import { filterSettingGroups } from "./studioNavigation";
import { designChecks as buildDesignChecks } from "./studioChecks";
import { EXTRA_STYLE_CATEGORIES, TEXT_BLURBS, TEXT_HEADINGS, THEME_HEADINGS, blurbFor, changedCopyCount, changedCounts, changedFields, defaultFor, isChanged, subsectionsFor } from "./settingsMap";
import { CategoryHeader, SettingsHome, SettingsSubsection, StudioTips, type HomeHeading } from "./StudioSettingsHome";

import "./studio.css";

type LeftTab = "sections" | "style" | "text" | "menus" | "pages" | "shared";
type Toast = { kind: "ok" | "err"; text: string } | null;
type ThemeVersion = { id: string; kind: "draft" | "published"; label: string; createdAt: string; design: any };

function describeChanges(from: any, to: any): string[] {
  const out: string[] = [];
  const surfaces = STATIC_SURFACES;
  for (const id of surfaces) {
    const a = (from?.[id]?.sections || []).length, b = (to?.[id]?.sections || []).length;
    if (a !== b) out.push(`${id}: ${a} → ${b} sections`);
  }
  const labels: Record<string, string> = { copy: "Text & labels", menus: "Menus", colorSchemes: "Color schemes", sectionPresets: "Saved sections" };
  for (const [key, label] of Object.entries(labels)) if (JSON.stringify(from?.[key]) !== JSON.stringify(to?.[key])) out.push(label);
  const ignored = new Set([...surfaces, ...Object.keys(labels), "globalSections"]);
  if (JSON.stringify(from?.globalSections) !== JSON.stringify(to?.globalSections)) out.push("Global sections");
  if (Object.keys({ ...from, ...to }).some(k => !ignored.has(k) && JSON.stringify(from?.[k]) !== JSON.stringify(to?.[k]))) out.push("Theme style and settings");
  return out.length ? out : ["No saved design differences"];
}

function designChecks(design: any) {
  return buildDesignChecks(design, { sectionFields: getSectionFields, blockFields: getBlockFields, blocksKey: getBlocksKey });
}

const DEVICE_W = { desktop: "1200px", tablet: "820px", mobile: "390px" } as const;
/** Pseudo-category id for the "What I've changed" list (Theme settings and Text & labels). */
const CHANGED_CATEGORY = "__changed";

// ── tiny shared UI bits ────────────────────────────────────────────────────
const btn =
  "inline-flex items-center gap-1.5 px-3 h-9 text-xs font-bold border border-neutral-300 rounded-lg bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed";
const btnPrimary =
  "inline-flex items-center gap-1.5 px-4 h-9 text-xs font-bold rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed";
const iconBtn =
  "inline-flex items-center justify-center w-8 h-8 rounded-md text-neutral-600 hover:bg-neutral-200 disabled:opacity-30";

// Clicking a region in the preview (data-studio-target) focuses the matching panel here.
type StudioFocus = { id: string | null; nonce: number };
const FocusContext = createContext<StudioFocus>({ id: null, nonce: 0 });

function Group({ id, title, hint, children, open: initial = false }: { id?: string; title: string; hint?: string; children: any; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  const focus = useContext(FocusContext);
  useEffect(() => { setOpen(initial); }, [initial]);
  useEffect(() => { if (id && focus.id === id) setOpen(true); }, [id, focus]);
  return (
    <section className="border-b border-neutral-200" data-studio-panel={id}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-bold hover:bg-neutral-50">
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {hint && <p className="text-xs text-neutral-500">{hint}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

function sectionTitle(s: Section) {
  const meta = getSectionMeta(s.type);
  const st = s.settings || {};
  const snippet = [st.title, st.heading, st.headline, st.text].find((v) => typeof v === "string" && v.trim());
  return { label: meta?.label || s.type, snippet: snippet ? String(snippet).slice(0, 40) : "" };
}

// ── Add-section picker ─────────────────────────────────────────────────────
function AddSectionDialog({ onPick, onClose, presets = [], onPickPreset }: {
  onPick: (type: string) => void; onClose: () => void; presets?: any[]; onPickPreset?: (preset: any) => void;
}) {
  const [q, setQ] = useState("");
  const savedList = presets.filter((p: any) => !q || String(p.name || "").toLowerCase().includes(q.toLowerCase()));
  const list = SECTION_REGISTRY.filter(
    (s) => !q || `${s.label} ${s.description} ${s.category}`.toLowerCase().includes(q.toLowerCase()),
  );
  const cats = Array.from(new Set(list.map((s) => s.category)));
  return (
    <Dialog open onClose={onClose} title="Add section" size="lg">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 p-4 border-b">
          <Search size={16} className="text-neutral-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sections…"
            className="flex-1 outline-none text-sm" aria-label="Search sections" />
          <button className={iconBtn} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="overflow-auto p-4 space-y-5">
          {savedList.length > 0 && onPickPreset && (
            <div>
              <h3 className="text-[11px] font-black tracking-widest uppercase text-neutral-500 mb-2">Your saved sections</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {savedList.map((p: any) => (
                  <button key={p.id} onClick={() => onPickPreset(p)}
                    className="text-left p-3 border border-neutral-200 rounded-xl hover:border-neutral-900 hover:bg-neutral-50">
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Saved with Section tools › Save selected section for reuse</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {cats.map((c) => (
            <div key={c}>
              <h3 className="text-[11px] font-black tracking-widest uppercase text-neutral-500 mb-2">{c}</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {list.filter((s) => s.category === c).map((s) => (
                  <button key={s.type} onClick={() => onPick(s.type)}
                    className="text-left p-3 border border-neutral-200 rounded-xl hover:border-neutral-900 hover:bg-neutral-50">
                    <p className="text-sm font-bold">{s.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!list.length && !savedList.length && <p className="text-sm text-neutral-500">No sections match “{q}”.</p>}
        </div>
      </div>
    </Dialog>
  );
}

// ── Menu editor ────────────────────────────────────────────────────────────
function MenuRow({ item, pages, footer = false, depth, onChange, onRemove, onMove }: {
  item: MenuItem; pages: any[]; footer?: boolean; depth: number; onChange: (n: MenuItem) => void; onRemove: () => void; onMove: (d: number) => void;
}) {
  const kids = item.children || [];
  const setKids = (c: MenuItem[]) => onChange({ ...item, children: c });
  return (
    <div className={`border border-neutral-200 rounded-lg p-2 space-y-2 bg-white ${depth ? "ml-4" : ""}`}>
      <div className="flex items-center gap-1">
        <input value={item.label} onChange={(e) => onChange({ ...item, label: e.target.value })} placeholder="Link text" aria-label="Link text"
          className="flex-1 min-w-0 border border-neutral-200 rounded-md px-2 h-8 text-xs" />
        <button className={iconBtn} onClick={() => onMove(-1)} aria-label="Move up"><ChevronUp size={14} /></button>
        <button className={iconBtn} onClick={() => onMove(1)} aria-label="Move down"><ChevronDown size={14} /></button>
        <button className={iconBtn} onClick={onRemove} aria-label="Remove link"><Trash2 size={14} /></button>
      </div>
      <div className="flex gap-1">
        <select value={item.type} onChange={(e) => onChange({ ...item, type: e.target.value as any, value: "" })}
          aria-label="Link type" className="border border-neutral-200 rounded-md h-8 text-xs px-1">
          {MENU_LINK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {item.type === "page" ? (
          <select value={item.value || ""} onChange={(e) => onChange({ ...item, value: e.target.value })}
            aria-label="Page" className="flex-1 min-w-0 border border-neutral-200 rounded-md h-8 text-xs px-1">
            <option value="">Choose page…</option>
            {pages.map((p) => <option key={p.slug} value={p.slug}>{p.title || p.slug}</option>)}
          </select>
        ) : item.type !== "home" ? (
          <input value={item.value || ""} onChange={(e) => onChange({ ...item, value: e.target.value })}
            placeholder={item.type === "url" ? "https://… or /path" : "collection name"} aria-label="Link target"
            className="flex-1 min-w-0 border border-neutral-200 rounded-md px-2 h-8 text-xs" />
        ) : null}
      </div>
      {footer && depth === 0 && <div className="flex items-center gap-2">
        <select aria-label="Footer link group" value={footerGroup(item)} onChange={e => onChange({ ...item, footerGroup: e.target.value as any })} className="flex-1 border border-neutral-200 rounded-md h-8 text-xs px-1">
          <option value="explore">Explore</option><option value="connect">Participate & connect</option>
        </select>
        <label className="text-xs flex gap-1"><input type="checkbox" checked={!item.hidden} onChange={e => onChange({ ...item, hidden: !e.target.checked })} />Show link</label>
      </div>}
      {depth === 0 && (
        <>
          {kids.map((k, i) => (
            <MenuRow key={k.id} item={k} pages={pages} depth={1}
              onChange={(n) => setKids(kids.map((x, j) => (j === i ? n : x)))}
              onRemove={() => setKids(kids.filter((_, j) => j !== i))}
              onMove={(d) => {
                const j = i + d;
                if (j < 0 || j >= kids.length) return;
                const c = [...kids]; [c[i], c[j]] = [c[j], c[i]]; setKids(c);
              }} />
          ))}
          <button className="text-xs font-bold text-blue-700 hover:underline" onClick={() => setKids([...kids, newMenuItem()])}>+ Add sub-link</button>
        </>
      )}
    </div>
  );
}

// ── Header bar order (categories + in-menu pages, one sequence) ────────────
function NavOrderPanel({ design, pages, onChange, onSecondaryChange }: { design: any; pages: any[]; onChange: (order: string[]) => void; onSecondaryChange: (keys: string[]) => void }) {
  const raw: any[] = Array.isArray(design.categories) ? design.categories : [...CATEGORIES];
  const cats = raw.map((c, i) => (typeof c === "string" ? { id: `cat-${i}`, name: c, description: "", showInNav: true } : c));
  const items = buildNavItems(cats, pages, design.navOrder);
  return (
    <div className="p-4 space-y-3 border-b border-neutral-200" data-studio-panel="menus:header-order">
      <div>
        <p className="text-sm font-bold">Header bar order</p>
        <p className="text-xs text-neutral-500">Keep shopping in the main bar and place submissions, history and open calls in publisher navigation. Use the arrows to order links; select the row for each page.</p>
      </div>
      {items.length === 0 && <p className="text-xs text-neutral-400">Nothing is set to show in the header yet.</p>}
      {items.map((it, i) => (
        <div key={it.key} className="flex items-center gap-1 border border-neutral-200 rounded-lg px-2 py-1 bg-white">
          <span className="flex-1 min-w-0 truncate text-xs font-bold uppercase">{it.label}</span>
          {it.kind === "page" ? <select aria-label={`Navigation row for ${it.label}`} className="text-xs rounded border px-1 py-1" value={splitNavigation(items, design).secondary.some(item => item.key === it.key) ? "secondary" : "primary"} onChange={(event) => {
            const keys = splitNavigation(items, design).secondary.map(item => item.key).filter(key => key !== it.key);
            onSecondaryChange(event.target.value === "secondary" ? [...keys, it.key] : keys);
          }}><option value="primary">Main shopping bar</option><option value="secondary">Publisher navigation</option></select> : <span className="text-[10px] uppercase tracking-wider text-neutral-400">Category</span>}
          <button className={iconBtn} onClick={() => onChange(moveNavItem(items, i, -1))} disabled={i === 0} aria-label={`Move ${it.label} earlier`}><ChevronUp size={14} /></button>
          <button className={iconBtn} onClick={() => onChange(moveNavItem(items, i, 1))} disabled={i === items.length - 1} aria-label={`Move ${it.label} later`}><ChevronDown size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function MenusPanel({ design, settings, pages, onChange }: { design: any; settings: any; pages: any[]; onChange: (menus: any) => void }) {
  const [which, setWhich] = useState<"header" | "footer">("header");
  const focus = useContext(FocusContext);
  useEffect(() => { if (focus.id === "menus:header" || focus.id === "menus:footer") setWhich(focus.id === "menus:footer" ? "footer" : "header"); }, [focus]);
  const menus = design.menus || {};
  const items: MenuItem[] = menus[which] || [];
  const set = (next: MenuItem[]) => onChange({ ...menus, [which]: next });
  return (
    <div className="p-4 space-y-3" data-studio-panel="menus:links">
      <div className="flex gap-1" role="tablist">
        {(["header", "footer"] as const).map((w) => (
          <button key={w} role="tab" aria-selected={which === w} onClick={() => setWhich(w)}
            className={`px-3 h-8 text-xs font-bold rounded-lg ${which === w ? "bg-neutral-900 text-white" : "bg-neutral-100"}`}>
            {w === "header" ? "Header menu" : "Footer menu"}
          </button>
        ))}
      </div>
      <p className="text-xs text-neutral-500">Leave empty to use the automatic menu built from your pages.</p>
      {which === "footer" && !items.length && <button className={btn} onClick={() => set(automaticFooterItems({ ...settings, design }, pages))}>Customize automatic footer links</button>}
      {items.map((it, i) => (
        <MenuRow key={it.id} item={it} pages={pages} footer={which === "footer"} depth={0}
          onChange={(n) => set(items.map((x, j) => (j === i ? n : x)))}
          onRemove={() => set(items.filter((_, j) => j !== i))}
          onMove={(d) => {
            const j = i + d;
            if (j < 0 || j >= items.length) return;
            const c = [...items]; [c[i], c[j]] = [c[j], c[i]]; set(c);
          }} />
      ))}
      <button className={btn} onClick={() => set([...items, newMenuItem()])}><Plus size={14} /> Add link</button>
    </div>
  );
}

// ── Main editor ────────────────────────────────────────────────────────────
export function StudioEditor({ settings, onExit, onPersisted, appearance = "light" }: {
  appearance?: "light" | "dark";
  settings: any;
  onExit: () => void;
  /** Called after a successful save so the dashboard's copy of settings stays fresh. */
  onPersisted?: (design: any, published: boolean) => void;
}) {
  const defaults = useMemo(() => adminApi.getDefaultSettings().design, []);
  const [hist, setHist] = useState(() => initHistory(normalizeDesign(settings?.draftDesign ?? settings?.design, defaults)));
  const design = hist.present;
  const [savedDraft, setSavedDraft] = useState<any>(design);
  const [published, setPublished] = useState<any>(() => normalizeDesign(settings?.design, defaults));
  const [pages, setPages] = useState<any[]>([]);
  const [pageLoadError, setPageLoadError] = useState(false);
  const [pageBusy, setPageBusy] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  // The page open in Studio › Pages with unsaved edits — shown in the preview only, never saved from here.
  const [draftPage, setDraftPage] = useState<any | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("sections");
  const [templateId, setTemplateId] = useState("heroPage");
  const [showGlobal, setShowGlobal] = useState(false);
  const [device, setDevice] = useState<keyof typeof DEVICE_W>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [blockId, setBlockId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "browse">("edit");
  const [mobilePanel, setMobilePanel] = useState("preview");
  const [styleCategory, setStyleCategory] = useState<string | null>(null);
  const [textCategory, setTextCategory] = useState<string | null>(null);
  // Field Find anything is jumping to, so its collapsed sub-section opens first.
  const [fieldFocus, setFieldFocus] = useState<{ key: string; nonce: number } | null>(null);
  const [tipsNonce, setTipsNonce] = useState(0);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  // Opening (or leaving) a category starts at its top; Find anything then scrolls to its field.
  useEffect(() => { sidebarScrollRef.current?.scrollTo?.({ top: 0 }); }, [styleCategory, textCategory, leftTab]);
  const [styleSearch, setStyleSearch] = useState("");
  // Region clicked in the preview → a pinned "Editing: <label>" card with only that region's controls.
  const [styleFocus, setStyleFocus] = useState<{ id: string; label: string } | null>(null);
  const [focus, setFocus] = useState<StudioFocus>({ id: null, nonce: 0 });
  const [styleScope, setStyleScope] = useState<"all" | "page">("all");
  const [productSlug, setProductSlug] = useState("");
  const [collectionSlug, setCollectionSlug] = useState("publications");
  const [previewStatus, setPreviewStatus] = useState<"loading" | "ready" | "error">("loading");
  const [previewRevision, setPreviewRevision] = useState(0);
  const [versions, setVersions] = useState<ThemeVersion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPreview, setHistoryPreview] = useState<ThemeVersion | null>(null);
  const [confirmAction, setConfirmAction] = useState<"publish" | "discard" | null>(null);
  const [checksOpen, setChecksOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState<Section | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [openPage, setOpenPage] = useState<{ slug: string; nonce: number } | null>(null);
  const canvasSelectionRef = useRef<{sectionId: string; blockId: string | null} | null>(null);
  const inlineEditingRef = useRef(false);
  const [inlineEditing, setInlineEditing] = useState<string | null>(null);

  const [toast, setToast] = useState<Toast>(null);
  const [copyFilter, setCopyFilter] = useState("");
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>(() => (Array.isArray(settings?.savedThemes) ? settings.savedThemes : []));
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const designRef = useRef(design);
  designRef.current = design;

  const templates = useMemo(() => buildPageTemplates(pages), [pages]);
  const template = templates.find((t) => t.id === templateId) || templates[0];
  const target: SectionTarget = showGlobal ? { kind: "global" } : { kind: "template", id: template.id };
  const sections = getSections(design, target);
  const selected = sections.find((s) => s.id === selectedId) || null;
  useEffect(() => {
    if (!selected) { setBlockId(null); return; }
    const blocks = selected.settings[getBlocksKey(selected.type)] || selected.settings.blocks || [];
    if (blockId && !findBlock(blocks, blockId)) setBlockId(null);
  }, [selected, blockId]);
  const colorSchemes = design.colorSchemes?.length ? design.colorSchemes : DEFAULT_COLOR_SCHEMES;
  const surfaceIds = useMemo(
    () => [...STATIC_SURFACES, ...templates.filter((t) => t.pageSlug).map((t) => t.id)],
    [templates],
  );
  const dirtyDraft = useMemo(() => !sameDesign(design, savedDraft), [design, savedDraft]);
  const unpublished = useMemo(() => !sameDesign(design, published), [design, published]);

  const say = (kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    if (kind === "ok") setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 3500);
  };

  // load pages + books for the preview pickers
  const loadPages = useCallback(async () => {
    setPageLoadError(false);
    try { setPages(await adminApi.getPages() || []); }
    catch { setPageLoadError(true); say("err", "Could not load pages for Studio preview. Check your connection and retry."); }
  }, []);
  useEffect(() => {
    loadPages();
    adminApi.getCategoryBooks().then((b: any[]) => { const published = (b || []).filter(x => x.status === "published" || !x.status); setBooks(published); setProductSlug(published[0]?.slug || ""); }).catch(() => say("err", "Could not load preview products. Reopen Studio to retry."));
  }, [loadPages]);
  const loadVersions = useCallback(async () => {
    try { setVersions(await adminApi.listThemeVersions() as ThemeVersion[]); }
    catch { say("err", "Could not load version history. Check your connection and try again."); }
  }, []);

  const change = useCallback((fn: (d: any) => any) => setHist((h) => { const next = normalizeDesign(fn(h.present), defaults); return sameDesign(next, h.present) ? h : commit(h, next); }), [defaults]);
  const setList = (fn: (l: Section[]) => Section[]) => change((d) => setSections(d, target, fn(getSections(d, target))));
  const patchSelected = (patch: Record<string, any>) => selectedId && setList((l) => patchSectionSettings(l, selectedId, patch));
  const saveSharedBlock = (id: string, name: string) => {
    if (!selected) return;
    const key = getBlocksKey(selected.type), blocks = selected.settings[key] || selected.settings.blocks || [];
    const source = findBlock(blocks, id); if (!source) return;
    const shared: SharedBlock = { id: newId(), name, sectionType: selected.type, block: { ...JSON.parse(JSON.stringify(source)), sharedBlockId: undefined }, updatedAt: new Date().toISOString() };
    change(d => {
      const nextSections = patchSectionSettings(getSections(d, target), selected.id, { [key]: mapBlock(blocks, id, b => ({ id: b.id, sharedBlockId: shared.id, grid: b.grid, responsive: b.responsive })) });
      return setSections({ ...d, sharedBlocks: [...(d.sharedBlocks || []), shared] }, target, nextSections);
    });
    say("ok", `“${name}” is now linked and reusable.`);
  };
  const insertSharedBlock = (shared: SharedBlock) => {
    if (!selected) return;
    const key = getBlocksKey(selected.type);
    patchSelected({ [key]: [...(selected.settings[key] || selected.settings.blocks || []), { id: newId(), sharedBlockId: shared.id }] });
    say("ok", `Linked “${shared.name}” to this section.`);
  };
  const patchSharedBlock = (sharedId: string, patch: Record<string, any>) => change(d => ({
    ...d,
    sharedBlocks: (d.sharedBlocks || []).map((shared: SharedBlock) => shared.id === sharedId
      ? { ...shared, block: { ...shared.block, ...patch }, updatedAt: new Date().toISOString() } : shared),
  }));
  const setStyle = (path: string, value: any) => change((d) => applyGlobalStyle(d, path, value, surfaceIds));
  const applyNoirLook = () => {
    if (!window.confirm("Apply the Riso Noir look (black background, white text, flare accent) to every page? Your sections and text are kept.")) return;
    change((d) => applyThemeKeysToSurfaces(d, { ...RISO_NOIR_TOKENS, themeLibraryPreset: RISO_NOIR_ID }, surfaceIds));
    say("ok", "Riso Noir applied to the draft — Publish to make it live.");
  };
  const installNoirHome = () => {
    const tpl = HOME_LAYOUT_TEMPLATES.find((t) => t.id === RISO_NOIR_ID);
    if (!tpl) return;
    if (!window.confirm("Replace the Homepage sections with the Riso Noir layout? You can Undo (Ctrl+Z) until you save.")) return;
    change((d) => setSections(d, { kind: "template", id: "heroPage" }, tpl.sections.map((s) =>
      makeSection(s.type, { ...(getSectionMeta(s.type)?.defaults || {}), ...(s.settings || {}) }))));
    setTemplateId("heroPage");
    setShowGlobal(false);
    say("ok", "Noir homepage layout installed on the draft.");
  };
  const applyLibraryTheme = (theme: any) => {
    if (!window.confirm(`Apply the "${theme.name}" look to every page? Your sections and text are kept.`)) return;
    const palette = PALETTES.find((p: any) => p.id === theme.palettePreset);
    const base: Record<string, any> = {
      ...(palette ? { palettePreset: palette.id, primaryColor: palette.accent, backgroundColor: palette.bg, textColor: palette.text } : {}),
      themeStyle: "default",
    };
    for (const k of THEME_APPLIED_KEYS) if (theme[k] !== undefined) base[k] = theme[k];
    change((d) => applyThemeKeysToSurfaces(d, { ...base, ...(theme.global || {}), themeLibraryPreset: theme.id }, surfaceIds));
    say("ok", `“${theme.name}” applied to the draft — Publish to make it live.`);
  };
  const persistThemes = async (next: SavedTheme[], okText: string) => {
    // Every saved theme is a full design and settings/website is one 1 MiB Firestore doc: refuse to grow
    // past the budget (shrinking, e.g. delete, is always allowed).
    if (savedThemesBytes(next) > savedThemesBytes(savedThemes) && !savedThemesFit(next)) {
      say("err", "Not enough room for another saved theme. Delete one under My themes, then try again.");
      return;
    }
    try { await adminApi.updateSettings({ savedThemes: next }); setSavedThemes(next); say("ok", okText); }
    catch (err: any) { say("err", `Could not save themes: ${err?.message || err}`); }
  };
  const saveCurrentAsTheme = () => {
    const name = window.prompt("Name this theme (it saves the whole design: style, text, menus and sections):", "");
    if (name === null) return;
    persistThemes(addSavedTheme(savedThemes, name, designRef.current), `Saved “${name.trim() || "Untitled theme"}” to My themes.`);
  };
  const applySavedTheme = (t: SavedTheme) => {
    if (!window.confirm(`Replace the current draft with “${t.name}”? This changes sections, text and style. You can Undo (Ctrl+Z) until you save.`)) return;
    change(() => normalizeDesign(JSON.parse(JSON.stringify(t.design)), defaults));
    say("ok", `“${t.name}” loaded into the draft — Publish to make it live.`);
  };
  const renameTheme = (t: SavedTheme) => {
    const name = window.prompt("Rename this theme:", t.name);
    if (name === null || !name.trim()) return;
    persistThemes(renameSavedTheme(savedThemes, t.id, name), "Theme renamed.");
  };
  const exportTheme = (t: SavedTheme) => {
    const url = URL.createObjectURL(new Blob([serializeThemeFile(t)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = themeFileName(t); a.click();
    URL.revokeObjectURL(url);
  };
  const importTheme = async (file?: File | null) => {
    if (!file) return;
    const parsed = parseThemeFile(await file.text());
    if ("error" in parsed) { say("err", parsed.error); return; }
    persistThemes(addSavedTheme(savedThemes, parsed.name, parsed.design), `Imported “${parsed.name}” into My themes.`);
  };
  const riso = design.themeStyle === "riso";

  const setScopedStyle = (group: string, path: string, value: any) => {
    if (styleScope === "page" && PAGE_STYLE_GROUPS.has(group)) change(d => applyPageStyle(d, template.id, path, value));
    else setStyle(path, value);
  };

  const renderStyleField = (g: StyleGroup, f: StyleField) => {
    const local = styleScope === "page" && PAGE_STYLE_GROUPS.has(g.id);
    const region = REGION_GROUPS.find(group => group.id === g.id)?.regions.find(r => f.key.startsWith('regions.' + r.id));
    const values = { ...design.regions, ...(local ? design[template.id]?.regions : {}) };
    const own = readStyle(local ? design[template.id] : design, f.key);
    const suffix = region ? f.key.slice(('regions.' + regionKey(region.id, "", regionFieldDevice(f.key))).length) : "";
    const effective = region ? regionValue(values, region.id, suffix, regionFieldDevice(f.key))
      : (local ? readStyle(design[template.id], f.key) : undefined) ?? readStyle(design, f.key) ?? readStyle(defaults, f.key);
    const differs = !region && !local && isChanged(f, design, defaults);
    return (
      <div key={f.key} className="studio-field" data-style-key={f.key}>
        <SectionFieldEditor field={f as any} value={effective ?? f.defaultValue}
          onChange={v => setScopedStyle(g.id, f.key, v)}
          uploadFile={file => adminApi.uploadFile(file, 'design/' + Date.now() + '_' + file.name)} />
        {(region || local) && <div className="studio-field-status">
          <small>{own != null && own !== "" ? "Custom value" : region ? "Inherited from larger size / shared layout" : "Inherited from all pages"}</small>
          {own !== undefined && <button type="button" className="studio-reset" aria-label={'Reset ' + f.label}
            onClick={() => setScopedStyle(g.id, f.key, undefined)}>{local ? "Reset to global" : "Reset to inherited"}</button>}
        </div>}
        {differs && <div className="studio-field-status">
          <small>Changed from default</small>
          <button type="button" className="studio-reset" aria-label={'Reset ' + f.label + ' to default'}
            onClick={() => setScopedStyle(g.id, f.key, defaultFor(f, defaults))}>Reset to default</button>
        </div>}
      </div>
    );
  };

  const openRegion = (id: string, label: string, previewDevice?: RegionDevice) => {
    if (previewDevice) setDevice(previewDevice);
    setStyleSearch(""); setStyleCategory(id); setStyleFocus({ id, label });
    setLeftTab("style"); setSelectedId(null); setBlockId(null);
  };
  const resetRegion = (group: string, id: string) => change(d => REGION_SUFFIXES.reduce((next, suffix) => {
    const path = 'regions.' + regionKey(id, suffix, device);
    return styleScope === "page" && PAGE_STYLE_GROUPS.has(group)
      ? applyPageStyle(next, template.id, path, undefined) : applyGlobalStyle(next, path, undefined, surfaceIds);
  }, d));

  // ── preview wiring ──
  const previewUrl = useMemo(() => {
    const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
    const withQ = (p: string) => `${base}${p}${p.includes("?") ? "&" : "?"}preview=true`;
    switch (template.id) {
      case "storefront": return withQ("/?catalog=true");
      case "productPage": return withQ(`/books/${productSlug || ""}`);
      case "collectionPage": return withQ(`/collections/${collectionSlug}`);
      case "cartPage": return withQ("/checkout");
      case "page404": return withQ("/studio-missing-page");
      case "wishlistPage": return withQ("/wishlist");
      case "accountPage": return withQ("/account");
      case "trackingPage": return withQ("/track");
      case "page": return withQ(`/page/${pages.find((p) => p.status === "published")?.slug || ""}`);
      default: return withQ(template.pageSlug ? `/page/${template.pageSlug}` : "/");
    }
  }, [template.id, template.pageSlug, productSlug, collectionSlug, pages]);

  // Full-screen "Preview in new tab" windows listen on this channel (features/site/previewTab.ts).
  const channelRef = useRef<BroadcastChannel | null>(null);
  const sendPreviewState = useCallback(() => {
    if (inlineEditingRef.current) return;
    const previewDesign = historyPreview?.design || designRef.current;
    const state = buildPreviewState(settings, previewDesign, withDraftPage(pages, draftPage), books);
    try {
      deliverPreviewState(iframeRef.current?.contentWindow, state, window.location.origin);
    } catch (err) { console.warn("[Studio] preview delivery failed", err); }
    try { channelRef.current?.postMessage(state); } catch (err) { console.warn("[Studio] preview tab delivery failed", err); }
  }, [historyPreview, settings, pages, books, draftPage]);
  const sendPreviewRef = useRef(sendPreviewState);
  sendPreviewRef.current = sendPreviewState;
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(PREVIEW_CHANNEL);
    channelRef.current = bc;
    bc.onmessage = (e) => { if (e.data?.type === "PREVIEW_READY") sendPreviewRef.current(); };
    return () => { bc.close(); channelRef.current = null; };
  }, []);
  const openPreviewTab = () => { window.open(previewUrl, "_blank"); };
  useEffect(() => { const t = setTimeout(sendPreviewState, 100); return () => clearTimeout(t); }, [design, sendPreviewState]);
  // Tell the preview which strings are editable copy, so double-clicking one jumps to its field.
  const sendCopyMap = useCallback(() => {
    const items = COPY_SCHEMA.flatMap((g) => g.fields.map((f) => ({ key: f.key, group: g.group, label: f.label, multiline: Boolean(f.multiline), editable: !/[{}]/.test(designRef.current.copy?.[f.key] ?? DEFAULT_COPY[f.key] ?? ""), text: (designRef.current.copy?.[f.key] ?? DEFAULT_COPY[f.key] ?? "") })));
    try { iframeRef.current?.contentWindow?.postMessage({ type: "SET_COPY_MAP", items }, window.location.origin); } catch { /* ignore */ }
    const editable: any[] = [];
    const canvas: any[] = [];
    const scanBlocks = (section: Section, blocks: any[], linked = false) => (blocks || []).forEach((block: any) => {
      for (const field of getBlockFields(section.type)) if (["text", "textarea", "html", "richtext"].includes(field.kind)) editable.push({ sectionId: section.id, blockId: block.id, shared: linked || Boolean(block.sharedBlockId), key: field.key, label: field.label, multiline: field.kind !== "text", format: ["html", "richtext"].includes(field.kind) ? "html" : undefined, editable: field.kind === "text" || field.kind === "textarea" || canInlineFormat(String(block[field.key] ?? "")) && ["html", "richtext"].includes(field.kind), text: String(block[field.key] ?? "") });
      canvas.push({sectionId:section.id,blockId:block.id,actions:contextCapabilities(designRef.current, section.id, block.id, getBlocksKey),gaps:[],bounds:{}});
      scanBlocks(section, block.children || [], linked || Boolean(block.sharedBlockId));
    });
    const targets: SectionTarget[] = [{ kind: "global" }, ...templates.map(t => ({ kind: "template", id: t.id }) as SectionTarget)];
    for (const target of targets) for (const section of getSections(designRef.current, target)) {
      const gaps = getSectionFields(section.type).filter(f => GAP_KEYS.includes(f.key));
      canvas.push({sectionId:section.id,blockId:null,actions:contextCapabilities(designRef.current,section.id,undefined,getBlocksKey),addBlock:Boolean(getSectionMeta(section.type)?.blockType),gaps:gaps.map(f=>f.key),bounds:Object.fromEntries(gaps.map(f=>[f.key,{min:f.min ?? 0,max:f.max ?? 240}]))});
      for (const field of getSectionFields(section.type)) if (["text", "textarea", "html", "richtext"].includes(field.kind)) editable.push({ sectionId: section.id, blockId: null, key: field.key, label: field.label, multiline: field.kind !== "text", format: ["html", "richtext"].includes(field.kind) ? "html" : undefined, editable: field.kind === "text" || field.kind === "textarea" || canInlineFormat(String(section.settings[field.key] ?? "")) && ["html", "richtext"].includes(field.kind), text: String(section.settings[field.key] ?? "") });
      scanBlocks(section, resolveSharedBlocks(section.settings[getBlocksKey(section.type)] || section.settings.blocks || [], designRef.current.sharedBlocks || []));
    }
    try { iframeRef.current?.contentWindow?.postMessage({ type: "SET_EDIT_MAP", items: editable }, window.location.origin); } catch { /* ignore */ }
    try { iframeRef.current?.contentWindow?.postMessage({ type: "SET_STYLE_TEXT_MAP", items: INLINE_STYLE_KEYS.map(key => ({ key, label: STYLE_GROUPS.flatMap(g => g.fields).find(f => f.key === key)?.label || key, multiline: key === "announcementText", editable: true })) }, window.location.origin); } catch { /* ignore */ }
    try { iframeRef.current?.contentWindow?.postMessage({type:"SET_CANVAS_MAP",items:canvas,device},window.location.origin); } catch { /* ignore */ }
  }, [templates, device]);
  // The edit map is a full scan of every section; run it only once typing/dragging settles, and when idle.
  useEffect(() => {
    let idle: number | undefined;
    const t = setTimeout(() => {
      const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: { timeout: number }) => number);
      if (ric) idle = ric(sendCopyMap, { timeout: 1000 }); else sendCopyMap();
    }, 600);
    return () => { clearTimeout(t); if (idle !== undefined) (window as any).cancelIdleCallback?.(idle); };
  }, [design, sendCopyMap]);

  const onIframeLoad = () => {
    inlineEditingRef.current = false; setInlineEditing(null);
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) { setPreviewStatus("error"); return; }
      const s = doc.createElement("script");
      s.textContent = PREVIEW_BRIDGE_SOURCE;
      doc.head.appendChild(s);
    } catch { setPreviewStatus("error"); }
  };

  const highlight = useCallback((id: string | null, scroll = false, selectedBlock: string | null = blockId) => {
    try { iframeRef.current?.contentWindow?.postMessage({ type: "HIGHLIGHT_SECTION", instanceId: id, blockId: selectedBlock, scroll }, window.location.origin); } catch { /* ignore */ }
  }, [blockId]);
  // Re-highlight right away when the selection changes, but only after edits settle when the design changes.
  useEffect(() => { canvasSelectionRef.current = null; highlight(selectedId); }, [selectedId, highlight]);
  useEffect(() => { const t = setTimeout(() => { const canvas = canvasSelectionRef.current; highlight(canvas?.sectionId || selectedId, false, canvas ? canvas.blockId : blockId); }, 250); return () => clearTimeout(t); }, [design]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { iframeRef.current?.contentWindow?.postMessage({ type: "STUDIO_MODE", mode }, window.location.origin); }, [mode]);
  useEffect(() => { setPreviewStatus("loading"); const timer = setTimeout(() => setPreviewStatus(s => s === "loading" ? "error" : s), 15000); return () => clearTimeout(timer); }, [previewUrl, previewRevision]);

  // preview → editor messages
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== iframeRef.current?.contentWindow || !e.data) return;
      const d = e.data;
      if (d.type === "PREVIEW_ERROR") say("err", `The preview hit an error: ${String(d.message).slice(0, 200)}`);
      if (d.type === "PREVIEW_READY") { setPreviewStatus("ready"); sendPreviewState(); sendCopyMap(); highlight(selectedId); iframeRef.current?.contentWindow?.postMessage({ type: "STUDIO_MODE", mode }, window.location.origin); }
      if (d.type === "STUDIO_ROUTE" && typeof d.href === "string") {
        const route = previewRoute(d.href, import.meta.env.BASE_URL);
        if (route && templates.some(t => t.id === route.templateId)) { setTemplateId(route.templateId); setShowGlobal(false); setSelectedId(null); setBlockId(null); }
        if (route?.product) setProductSlug(route.product);
        if (route?.collection) setCollectionSlug(route.collection);
        sendPreviewState();
      }
      if (d.type === "STUDIO_TARGET" && typeof d.target === "string") {
        const target = d.target as string;
        const [kind, rest = ""] = target.split(":");
        const tab: LeftTab | null = kind === "style" ? "style" : kind === "copy" ? "text" : kind === "menus" ? "menus" : kind === "pages" ? "pages" : null;
        if (!tab) return;
        setMobilePanel("outline");
        setSelectedId(null); setBlockId(null);
        if (tab === "style") { setStyleSearch(""); setStyleCategory(EXTRA_STYLE_CATEGORIES[rest] ? rest : null); }
        setStyleFocus(tab === "style" && STYLE_GROUPS.some(g => g.id === rest) ? { id: rest, label: typeof d.label === "string" && d.label ? d.label : (STYLE_GROUPS.find(g => g.id === rest)?.title || rest) } : null);
        if (tab === "text") { setCopyFilter(""); setTextCategory(rest); }
        setLeftTab(tab);
        const panel = kind === "menus" && (rest === "header" || rest === "footer") ? "menus:links" : tab === "style" && STYLE_GROUPS.some(g => g.id === rest) ? "style-focus" : target;
        setFocus(f => ({ id: target, nonce: f.nonce + 1 }));
        setTimeout(() => {
          const el = document.querySelector<HTMLElement>(`[data-studio-panel="${CSS.escape(panel)}"]`);
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.classList.add("studio-flash");
          setTimeout(() => el.classList.remove("studio-flash"), 1600);
        }, 120);
      }
      if (d.type === "CANVAS_SELECT" && d.sectionId) canvasSelectionRef.current = {sectionId:d.sectionId,blockId:d.blockId || null};
      if (d.type === "SECTION_SELECT" && d.instanceId) {
        const cur = designRef.current;
        if (getSections(cur, { kind: "global" }).some((s) => s.id === d.instanceId)) {
          setShowGlobal(true);
        } else {
          const owner = templates.find((t) => getSections(cur, { kind: "template", id: t.id }).some((s) => s.id === d.instanceId));
          if (!owner) return;
          setShowGlobal(false); setTemplateId(owner.id);
        }
        setLeftTab("sections");
        setSelectedId(d.instanceId);
        setBlockId(typeof d.blockId === "string" ? d.blockId : null);
        setMobilePanel("settings");
      }
      if (d.type === "SECTION_MOVE" && d.sectionId && d.beforeId) {
        change(current => applyCanvasAction(current, d, getBlocksKey));
      }
      if (d.type === "BLOCK_MOVE" && d.sectionId && d.blockId && d.beforeId) {
        change(current => applyCanvasAction(current, d, getBlocksKey));
      }
      if (d.type === "ADD_BLOCK" && d.sectionId) {
        const owner = findSectionOwner(designRef.current, d.sectionId);
        const meta = owner && getSectionMeta(owner.section.type); if (!owner || !meta?.blockType) return;
        const block = { ...JSON.parse(JSON.stringify(meta.blockDefaults || {})), id: newId() };
        change(current => applyCanvasAction(current, d, getBlocksKey, block));
        setSelectedId(d.sectionId); setBlockId(block.id); setMobilePanel("settings");
      }
      if (d.type === "CONTEXT_ACTION" && typeof d.sectionId === "string") {
        change(current => applyContextAction(current, d, getBlocksKey));
        if (d.action === "delete" || d.action === "hide") { canvasSelectionRef.current = null; highlight(null,false,null); setSelectedId(null); setBlockId(null); }
      }
      if ((d.type === "SPACING_COMMIT" || d.type === "SPACING_RESET") && typeof d.sectionId === "string") {
        change(current => {
          const owner = findSectionOwner(current,d.sectionId); if (!owner) return current;
          const gapFields = getSectionFields(owner.section.type).filter(f => GAP_KEYS.includes(f.key));
          const allowed = [...PADDING_KEYS,...gapFields.map(f => f.key)];
          if(d.type === "SPACING_RESET") return allowed.reduce((dd,key)=>applySpacing(dd,{...d,key,value:null},allowed),current);
          const field = gapFields.find(f => f.key === d.key);
          if(field && (d.value < (field.min ?? 0) || d.value > (field.max ?? 240))) return current;
          return applySpacing(current,d,allowed);
        });
      }
      if (d.type === "TEXT_EDIT_START") { inlineEditingRef.current = true; setInlineEditing(typeof d.label === "string" ? d.label : "Text"); }
      if (d.type === "TEXT_EDIT_END") {
        inlineEditingRef.current = false; setInlineEditing(null);
        setTimeout(() => sendPreviewRef.current(), 0);
      }
      if (d.type === "INLINE_TEXT_COMMIT") change(current => applyInlineText(current, d, {
        sectionFields: getSectionFields, blockFields: getBlockFields, blocksKey: getBlocksKey,
        copyKeys: COPY_SCHEMA.flatMap(g => g.fields.map(f => f.key)), styleKeys: INLINE_STYLE_KEYS,
        applyStyle: (dd, key, value) => applyGlobalStyle(dd, key, value, surfaceIds),
      }));
      if (d.type === "INLINE_TEXT_UNAVAILABLE") {
        if (d.sectionId) {
          const owner = findSectionOwner(designRef.current, d.sectionId);
          if (owner) { setShowGlobal(owner.surface === "globalSections"); if (owner.surface !== "globalSections") setTemplateId(owner.surface); }
          setLeftTab("sections"); setSelectedId(d.sectionId); setBlockId(d.blockId || null); setMobilePanel("settings");
        } else if (d.kind === "copy") { setCopyFilter(d.key || ""); setLeftTab("text"); setMobilePanel("outline"); }
        say("ok", "Formatted or templated text opens in the inspector so its structure is preserved.");
      }

    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [templates, selectedId, sendPreviewState, sendCopyMap, highlight, change, mode]);

  const { busy, saveDraft, publish, discard, recovery, recover, dismissRecovery } = useStudioPersistence({
    design, savedDraft, published, setSavedDraft, setPublished, onPersisted,
    reset: (next) => { setHist(initHistory(next)); setSelectedId(null); setBlockId(null); },
    restore: next => change(() => normalizeDesign(next, defaults)), say,
  });
  const exit = () => {
    if (inlineEditingRef.current) { say("err", "Finish or cancel the preview text edit before leaving Studio."); return; }
    if (pageBusy) { say("err", "Wait for the page save to finish before leaving Studio."); return; }
    if ((dirtyDraft || draftPage) && !window.confirm("You have unsaved edits. Leave without saving?")) return;
    onExit();
  };

  // warn on tab close, keyboard shortcuts
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => { if (dirtyDraft || draftPage || pageBusy || inlineEditingRef.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirtyDraft, draftPage, pageBusy]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName || "") || (e.target as HTMLElement)?.isContentEditable;
      if (busy === "discard") { e.preventDefault(); return; }
      if (inlineEditingRef.current && mod && ["s", "z", "y"].includes(e.key.toLowerCase())) { e.preventDefault(); return; }
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setFindOpen(true); return; }
      if (mod && e.key.toLowerCase() === "s" && leftTab !== "pages") { e.preventDefault(); saveDraft(); }
      else if (mod && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); setHist((h) => (e.shiftKey ? redo(h) : undo(h))); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  // ── section actions ──
  const addSection = (type: string) => {
    const meta = getSectionMeta(type);
    const s = makeSection(type, meta?.defaults || {});
    const at = adding ?? sections.length;
    setList((l) => insertSection(l, s, at));
    setSelectedId(s.id);
    setAdding(null);
    setBlockId(null);
    setMobilePanel("settings");
    setTimeout(() => highlight(s.id, true), 400);
  };
  const dupSection = (id: string) => {
    const r = duplicateSection(sections, id);
    setList(() => r.list);
    if (r.newId) { setSelectedId(r.newId); setBlockId(null); }
  };
  const delSection = (id: string) => {
    if (!window.confirm("Delete this section?")) return;
    setList((l) => removeSection(l, id));
    if (selectedId === id) setSelectedId(null);
  };
  const pasteSection = () => {
    if (!copiedSection) return;
    const clone = duplicateSection([copiedSection], copiedSection.id).list[1];
    setList(l => insertSection(l, clone, l.length)); setSelectedId(clone.id); say("ok", "Section pasted onto this page.");
  };
  const saveSection = (section: Section) => {
    const name = window.prompt("Name this saved section:", sectionTitle(section).label);
    if (name === null) return;
    const preset = { id: `preset-${Date.now()}`, name: name.trim() || sectionTitle(section).label, section: JSON.parse(JSON.stringify(section)) };
    setStyle("sectionPresets", [...(design.sectionPresets || []), preset]); say("ok", "Section saved. Add it to any page from Add section › Your saved sections.");
  };
  const addPreset = (preset: any) => {
    const source = preset.section;
    const clone = duplicateSection([source], source.id).list[1];
    const at = adding;
    setList(l => insertSection(l, clone, at ?? l.length)); setSelectedId(clone.id); setAdding(null); setBlockId(null);
  };

  // ── Find anything (Ctrl/Cmd+K): one search over every control, word, page, section and action ──
  const searchIndex = useMemo(() => buildStudioIndex({
    styleGroups: [...STYLE_GROUPS, ...Object.entries(EXTRA_STYLE_CATEGORIES).map(([id, c]) => ({ id, title: c.title, hint: c.blurb, fields: [] }))],
    copySchema: COPY_SCHEMA, templates, pages,
    sectionsByTemplate: {
      __global: getSections(design, { kind: "global" }),
      ...Object.fromEntries(templates.map(t => [t.id, getSections(design, { kind: "template", id: t.id })])),
    },
    sectionLabel: (type: string) => getSectionMeta(type)?.label || type,
  }), [design, templates, pages]);
  useEffect(() => { if (leftTab !== "pages") setOpenPage(null); }, [leftTab]);

  const flashPanel = (selector: string, focusInside = false) => setTimeout(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("studio-flash");
    setTimeout(() => el.classList.remove("studio-flash"), 1600);
    if (focusInside) el.querySelector<HTMLElement>("input, textarea, select, button")?.focus({ preventScroll: true });
  }, 160);
  const autoFitPage = (overwrite = false) => {
    const r = autoFitSections(sections, overwrite);
    const regions = autoFitRegions({ ...design.regions, ...(target.kind === "template" ? design[target.id]?.regions : {}) }, overwrite);
    if (!r.touched && !regions.changes.length) { say("ok", "No new phone overrides to apply. Check the phone preview for this page."); return; }
    change(d => {
      let next = setSections(d, target, r.value);
      for (const [key, value] of Object.entries(regions.value)) {
        next = target.kind === "template" ? applyPageStyle(next, target.id, `regions.${key}`, value)
          : applyGlobalStyle(next, `regions.${key}`, value, surfaceIds);
      }
      return next;
    });
    setDevice("mobile");
    say("ok", `Auto-fitted ${r.touched} sections and ${regions.changes.length} region settings for phones. Check the preview; Undo (Ctrl+Z) reverts.`);
  };
  const runAction = (id: string) => {
    switch (id) {
      case "save": if (dirtyDraft && busy === null) saveDraft(); else say("ok", "No unsaved changes to save."); break;
      case "publish": if ((unpublished || dirtyDraft) && busy === null) setConfirmAction("publish"); else say("ok", "Nothing to publish — the live shop already matches this draft."); break;
      case "discard": if (unpublished && busy === null) setConfirmAction("discard"); else say("ok", "No draft changes to discard."); break;
      case "history": setHistoryOpen(true); loadVersions(); break;
      case "check": setChecksOpen(true); break;
      case "preview-tab": openPreviewTab(); break;
      case "undo": setHist(undo); break;
      case "redo": setHist(redo); break;
      case "device-desktop": setDevice("desktop"); setMobilePanel("preview"); break;
      case "device-tablet": setDevice("tablet"); setMobilePanel("preview"); break;
      case "device-mobile": setDevice("mobile"); setMobilePanel("preview"); break;
      case "mode-toggle": setMode(m => m === "edit" ? "browse" : "edit"); break;
      case "autofit-page": setLeftTab("sections"); autoFitPage(false); break;
      case "add-section": setLeftTab("sections"); setAdding(sections.length); break;
    }
  };
  const goToResult = (entry: SearchEntry) => {
    const t = entry.target;
    setMobilePanel("outline");
    if (t.type === "action") { runAction(t.id); return; }
    if (t.type === "tab") { setLeftTab(t.tab); setStyleFocus(null); setSelectedId(null); setBlockId(null); return; }
    if (t.type === "style") {
      setSelectedId(null); setBlockId(null); setStyleSearch(""); setStyleCategory(t.groupId); setStyleFocus(null); setLeftTab("style");
      if (t.key) setFieldFocus({ key: t.key, nonce: Date.now() });
      const region = REGION_GROUPS.find(g => g.id === t.groupId)?.regions.find(r => t.key?.startsWith('regions.' + r.id));
      if (region && t.key) { openRegion(t.groupId, region.label); setDevice(regionFieldDevice(t.key)); }
      const panel = `style:${t.groupId}`;
      setFocus(f => ({ id: panel, nonce: f.nonce + 1 }));
      flashPanel(t.key ? `[data-style-key="${CSS.escape(t.key)}"]` : `[data-studio-panel="${CSS.escape(panel)}"]`, Boolean(t.key));
      return;
    }
    if (t.type === "copy") {
      setTextCategory(t.group); setLeftTab("text"); setSelectedId(null); setBlockId(null);
      setCopyFilter(t.key || "");
      setFocus(f => ({ id: `copy:${t.group}`, nonce: f.nonce + 1 }));
      flashPanel(t.key ? `[data-copy-key="${CSS.escape(t.key)}"]` : `[data-studio-panel="${CSS.escape(`copy:${t.group}`)}"]`, Boolean(t.key));
      return;
    }
    if (t.type === "menus") { setLeftTab("menus"); setSelectedId(null); flashPanel(`[data-studio-panel="${CSS.escape(t.panel)}"]`); return; }
    if (t.type === "template") { setSelectedId(null); setBlockId(null); setShowGlobal(false); setTemplateId(t.id); setLeftTab("sections"); return; }
    if (t.type === "section") {
      if (t.templateId === "__global") setShowGlobal(true); else { setShowGlobal(false); setTemplateId(t.templateId); }
      setLeftTab("sections"); setSelectedId(t.sectionId); setBlockId(null); setMobilePanel("settings");
      setTimeout(() => highlight(t.sectionId, true, null), 500);
      return;
    }
    if (t.type === "page") { setLeftTab("pages"); setOpenPage({ slug: t.slug, nonce: Date.now() }); }
  };

  const sidebarTabs: [LeftTab, string][] = [["sections", "Page layout"], ["shared", "Shared layout"], ["style", "Theme settings"], ["text", "Text & labels"], ["menus", "Navigation"], ["pages", "Pages"]];
  const q = copyFilter.trim().toLowerCase();
  const visibleStyleGroups = filterSettingGroups(STYLE_GROUPS, styleSearch, styleCategory);
  // Theme settings home: task headings over the same categories, with "changed" counts.
  const changed = useMemo(() => changedCounts(STYLE_GROUPS, design, defaults), [design, defaults]);
  const themeHome: HomeHeading[] = THEME_HEADINGS.map(h => ({ ...h, categories: h.groups.map(id => {
    const group = STYLE_GROUPS.find(g => g.id === id);
    return { id, title: EXTRA_STYLE_CATEGORIES[id]?.title || group?.title || id, blurb: blurbFor(group, id), changed: changed.byGroup[id] };
  }) }));
  const textHome: HomeHeading[] = TEXT_HEADINGS.map(h => ({ ...h, categories: h.groups.map(name => {
    const group = COPY_SCHEMA.find(g => g.group === name);
    return { id: name, title: name, blurb: TEXT_BLURBS[name] || "", changed: group ? changedCopyCount(group.fields, design) : 0 };
  }) }));
  const textChangedTotal = COPY_SCHEMA.reduce((n, g) => n + changedCopyCount(g.fields, design), 0);
  const panelTitle = sidebarTabs.find(([id]) => id === leftTab)?.[1];

  return (
    <div className="rp studio-editor" data-rp-appearance={appearance} data-studio-editor data-mobile-panel={mobilePanel}>
      {/* top bar */}
      <header className="studio-topbar">
        <button className={btn} disabled={Boolean(inlineEditing)} onClick={exit}><ArrowLeft size={14} /> Exit</button>
        <strong className="studio-title">Design studio</strong>
        <button className={btn} onClick={() => setFindOpen(true)} aria-label="Find anything (Ctrl+K)" title="Find any setting, word, page, section or action"><Search size={14} /> Find <kbd aria-hidden="true">Ctrl K</kbd></button>
        <select value={showGlobal ? "__global" : template.id}
          onChange={(e) => { const v = e.target.value; setSelectedId(null); setBlockId(null); if (v === "__global") setShowGlobal(true); else { setShowGlobal(false); setTemplateId(v); } setLeftTab("sections"); }}
          aria-label="Page to edit" className="h-9 border border-neutral-300 rounded-lg px-2 text-xs font-bold max-w-[220px]">
          <optgroup label="Pages">
            {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </optgroup>
          <optgroup label="Every page">
            <option value="__global">Header / footer sections (global)</option>
          </optgroup>
        </select>
        {template.id === "productPage" && <select aria-label="Preview product" value={productSlug} onChange={e => setProductSlug(e.target.value)}><option value="">Choose a product</option>{books.map(b => <option key={b.id} value={b.slug}>{b.title}</option>)}</select>}
        {template.id === "collectionPage" && <select aria-label="Preview collection" value={collectionSlug} onChange={e => setCollectionSlug(e.target.value)}>{CATEGORIES.map(c => <option key={c} value={c.toLowerCase().replace(/ /g, "-")}>{c}</option>)}</select>}
        <div className="flex items-center gap-0.5" role="group" aria-label="Preview size">
          {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
            <button key={d} className={`${iconBtn} ${device === d ? "bg-neutral-900 text-white hover:bg-neutral-900" : ""}`}
              onClick={() => setDevice(d)} aria-label={`${d} preview`} aria-pressed={device === d}><Icon size={15} /></button>
          ))}
        </div>
        <button className={btn} aria-pressed={mode === "browse"} onClick={() => setMode(m => m === "edit" ? "browse" : "edit")}>{mode === "edit" ? "Edit mode" : "Browse mode"}</button>

        <button className={iconBtn} disabled={Boolean(inlineEditing) || !hist.past.length} onClick={() => setHist(undo)} aria-label="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
        <button className={iconBtn} disabled={Boolean(inlineEditing) || !hist.future.length} onClick={() => setHist(redo)} aria-label="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
        <div className="flex-1" />
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-neutral-100" role="status">
          {dirtyDraft ? "Unsaved changes" : unpublished ? "Draft saved · not live" : "Live"}
        </span>
        <div className="studio-tools-menu"><span>Theme actions</span><ActionMenu label="Theme actions" actions={[
          { label: "Preview in new tab", icon: <ExternalLink size={14} />, onSelect: openPreviewTab },
          { label: "Version history", icon: <History size={14} />, onSelect: () => { setHistoryOpen(true); loadVersions(); } },
          { label: "Check before publishing", icon: <ShieldCheck size={14} />, onSelect: () => setChecksOpen(true) },
          { label: "Show Studio tips", onSelect: () => setTipsNonce(n => n + 1) },
          ...(unpublished && busy === null && !inlineEditing ? [{ label: "Discard saved draft…", tone: "danger" as const, onSelect: () => setConfirmAction("discard") }] : []),
        ]} /></div>
        <button className={btn} disabled={Boolean(inlineEditing) || !dirtyDraft || busy !== null} onClick={saveDraft}>{busy === "draft" ? "Saving…" : "Save draft"}</button>
        <button className={btnPrimary} disabled={Boolean(inlineEditing) || (!unpublished && !dirtyDraft) || busy !== null} onClick={() => setConfirmAction("publish")}>{busy === "publish" ? "Publishing…" : "Publish"}</button>
      </header>

      <div className="studio-mobile-tabs" role="tablist" aria-label="Studio workspace">{["outline", "preview", "settings"].map(panel => <button key={panel} role="tab" aria-selected={mobilePanel === panel} onClick={() => setMobilePanel(panel)}>{panel}</button>)}</div>
      {inlineEditing && <div className="studio-inline-status" role="status">Editing {inlineEditing} in the preview. Finish the text edit or release the spacing handle to keep it; Escape cancels.</div>}
      {recovery && <div className="studio-recovery" role="status"><span>Local edits from {new Date(recovery.savedAt).toLocaleString()}.{recovery.conflict ? " The server draft has changed; recovering will load your local version as unsaved edits." : " Recover your unsaved work?"}</span><SecondaryButton onClick={recover}>Recover local changes</SecondaryButton><SecondaryButton onClick={dismissRecovery}>Discard local recovery</SecondaryButton></div>}
      {draftPage && leftTab !== "pages" && <div className="studio-recovery" role="status"><span>{pageBusy ? "Saving" : "Unsaved edits to"} page “{draftPage.title || draftPage.slug || "Untitled"}”. {pageBusy ? "Wait for the save to finish." : "Return to Pages to review and save it."}</span>{!pageBusy && <SecondaryButton onClick={() => setLeftTab("pages")}>Return to Pages</SecondaryButton>}</div>}
      {toast && (
        <div role={toast.kind === "err" ? "alert" : "status"}
          className={`absolute top-16 left-1/2 -translate-x-1/2 z-[350] px-4 py-2 rounded-lg text-sm font-bold shadow-lg ${toast.kind === "err" ? "bg-red-600 text-white" : "bg-neutral-900 text-white"}`}>
          {toast.text}
          {toast.kind === "err" && <button className="ml-3 underline" onClick={() => setToast(null)}>Dismiss</button>}
        </div>
      )}

      <FocusContext.Provider value={focus}>
      <div className="studio-workspace" {...(busy === "discard" ? { inert: "" } : {})}>
        {/* left column */}
        <nav className="studio-sidebar" aria-label="Editor panels">
          <div className="studio-panel-navigation" aria-label="Design tools">
            {sidebarTabs.map(([id, label]) => (
              <button key={id} aria-pressed={leftTab === id} onClick={() => { setLeftTab(id); setStyleFocus(null); setSelectedId(null); setBlockId(null); }}>
                {label}
              </button>
            ))}
          </div>
          <div className="studio-panel-context">
            <strong>{panelTitle}</strong>
            <span>{leftTab === "sections" ? (showGlobal ? "Shared sections · every page" : template.label) + ` · ${sections.length} sections` : `Previewing: ${showGlobal ? "shared sections" : template.label}`}</span>
            <small>{leftTab === "sections" ? "Select content here or click it in the preview." : leftTab === "style" ? "Choose a category or search every setting." : leftTab === "shared" ? "Announcement, header, navigation and footer controls in one place." : leftTab === "text" ? "Edit the words your shoppers see." : leftTab === "menus" ? "Manage links, categories and their order." : "Create pages and edit their content or layout."}</small>
          </div>
          <div className="flex-1 overflow-auto" ref={sidebarScrollRef}>
            <StudioTips forceOpen={tipsNonce} />
            {leftTab === "shared" && <StudioSharedLayout globalCount={(design.globalSections || []).length}
              onStyle={(id, label) => { setStyleScope("all"); setStyleSearch(""); setStyleCategory(id); setStyleFocus(label ? {id, label} : null); setLeftTab("style"); }}
              onText={group => { setCopyFilter(""); setTextCategory(group); setLeftTab("text"); }}
              onNavigation={() => setLeftTab("menus")}
              onSections={() => { setShowGlobal(true); setSelectedId(null); setBlockId(null); setLeftTab("sections"); }} />}
            {leftTab === "sections" && template.id === "heroPage" && (
              <div className="m-3 p-3 rounded-lg border border-neutral-200 bg-white text-xs space-y-2">
                <label className="flex items-center justify-between gap-3 font-bold text-sm">
                  Show a Home page
                  <input type="checkbox" role="switch" checked={design.showHero !== false}
                    onChange={(e) => setStyle("showHero", e.target.checked ? undefined : false)} aria-describedby="studio-home-toggle-help" />
                </label>
                <p id="studio-home-toggle-help" className="text-neutral-500">
                  {design.showHero === false
                    ? "Off: your shop opens straight on the catalog. The sections below are kept but not shown."
                    : "On: your shop opens on these sections, with the catalog one click away. Turn off to open straight on the catalog."}
                </p>
              </div>
            )}
            {leftTab === "sections" && (template.id === "page" || template.id.startsWith("page:")) && !sections.some((s) => s.type === "PageContentSection") && (
              <div className="m-3 p-3 rounded-lg border border-neutral-200 bg-white text-xs space-y-2" data-studio-panel="page-content">
                <p className="font-bold text-sm">Make this page fully editable</p>
                <p className="text-neutral-500">The page title and text are currently a fixed block. Turn them into a <b>Page content</b> section you can move, restyle and surround with images, galleries or any other section.</p>
                <button className={btn} onClick={() => {
                  const s = makeSection("PageContentSection", getSectionMeta("PageContentSection")?.defaults || {});
                  setList((l) => insertSection(l, s, 0)); setSelectedId(s.id); setBlockId(null);
                }}>Design this page</button>
              </div>
            )}
            {leftTab === "sections" && <div className="studio-section-tools">
              <button className={btn} onClick={() => setAdding(sections.length)}><Plus size={13} /> Add section</button>
              <button className={btn} onClick={() => autoFitPage(false)} title="Works out phone spacing, text sizes, columns and stacked blocks for this page's sections and built-in regions. Anything you set yourself is kept."><Smartphone size={13} /> Auto-fit page for phones</button>
              <div className="studio-tools-menu"><span>Section tools</span><ActionMenu label="Section tools" actions={[
                { label: selected ? "Copy selected section" : "Copy a section (select one first)", icon: <Copy size={14} />,
                  onSelect: () => { if (!selected) { say("ok", "Select a section in the list or the preview first, then copy it."); return; } setCopiedSection(JSON.parse(JSON.stringify(selected))); say("ok", "Section copied. Open any page, then Section tools › Paste copied section."); } },
                { label: copiedSection ? "Paste copied section" : "Paste (nothing copied yet)", icon: <Clipboard size={14} />,
                  onSelect: () => { if (!copiedSection) { say("ok", "Copy a section first with Section tools › Copy selected section."); return; } pasteSection(); } },
                { label: selected ? "Save selected section for reuse" : "Save a section for reuse (select one first)", icon: <Download size={14} />,
                  onSelect: () => { if (!selected) { say("ok", "Select a section first, then save it. Saved sections appear in Add section."); return; } saveSection(selected); } },
              ]} /></div>
            </div>}
            {leftTab === "sections" && <StudioOutline key={showGlobal ? "__global" : template.id}
              sections={sections} selectedId={selectedId} blockId={blockId}
              onSelect={(id, block) => { setSelectedId(id); setBlockId(block || null); setMobilePanel("settings"); highlight(id, true, block || null); }}
              onReorder={list => setList(() => list)} onPatch={(id, patch) => setList(list => patchSectionSettings(list, id, patch))}
              onAdd={setAdding} onDuplicate={dupSection} onDelete={delSection}
              onToggle={id => setList(list => toggleSection(list, id))} />}
            {leftTab === "style" && <div className="studio-settings-search">
              <input className="studio-search" aria-label="Search style settings" placeholder="Search colors, fonts, spacing…" value={styleSearch} onChange={e => { setStyleSearch(e.target.value); if (e.target.value) setStyleFocus(null); }} />
              <label>Editing scope<select aria-label="Style scope" value={styleScope} onChange={e => setStyleScope(e.target.value as any)}><option value="all">All pages</option><option value="page">This page only: {template.label}</option></select></label>
              {styleSearch && <button className={btn} onClick={() => setStyleSearch("")}>Clear search</button>}
            </div>}
            {leftTab === "style" && !styleSearch.trim() && !styleCategory && !styleFocus && (
              <SettingsHome headings={themeHome} onOpen={(id) => setStyleCategory(id)}
                changedTotal={changed.total} onOpenChanged={() => setStyleCategory(CHANGED_CATEGORY)} />
            )}
            {leftTab === "style" && !styleSearch.trim() && styleCategory && !styleFocus && (() => {
              const group = STYLE_GROUPS.find(g => g.id === styleCategory);
              const extra = EXTRA_STYLE_CATEGORIES[styleCategory];
              const isChangedView = styleCategory === CHANGED_CATEGORY;
              const local = styleScope === "page" && PAGE_STYLE_GROUPS.has(styleCategory);
              const scopeNote = isChangedView ? "Every setting that differs from the default, grouped by category. Reset one to go back to the default."
                : local ? `Changes here apply to this page only (${template.label}). Reset a field to use the all-pages value.`
                : PAGE_STYLE_GROUPS.has(styleCategory) ? "Applies to every page. To change just this page, set Editing scope to “This page only”."
                : "Applies to every page.";
              const subs = group ? subsectionsFor(group) : [];
              return (
                <div data-studio-panel={`style:${styleCategory}`}>
                  <CategoryHeader title={isChangedView ? "What I've changed" : extra?.title || group?.title || styleCategory}
                    blurb={isChangedView ? undefined : blurbFor(group, styleCategory)} backLabel="All theme settings"
                    onBack={() => setStyleCategory(null)} extra={<p className="studio-scope-note">{scopeNote}</p>} />
                  {styleCategory === "themeLook" && <div className="px-4 pb-4 space-y-4">
                    <p className="studio-hint">Current look: {design.themeLibraryPreset === RISO_NOIR_ID ? "Riso Noir" : riso ? "Riso Press" : "Standard / custom"}. One click sets every colour, font and print detail; you can still change each one afterwards.</p>

                <button type="button" className={`${btnPrimary} w-full justify-center`} onClick={applyNoirLook}>Apply Riso Noir (black &amp; white)</button>
                <button type="button" className={`${btn} w-full justify-center`} onClick={installNoirHome}>Also install the Noir homepage layout</button>
                <button type="button" className={`${btn} w-full justify-center`} disabled={!riso} onClick={() => setStyle("themeStyle", "default")}>Turn off Riso print style</button>
                <div className="pt-2 border-t border-neutral-200 space-y-2">
                  <p className="text-[10px] font-black tracking-widest uppercase text-neutral-500">My themes</p>
                  <button type="button" className={`${btn} w-full justify-center`} onClick={saveCurrentAsTheme}>Save current design as a theme…</button>
                  <label className={`${btn} w-full justify-center cursor-pointer`}>
                    <Upload size={14} /> Import a theme file…
                    <input type="file" accept="application/json,.json" className="sr-only" aria-label="Import a theme file"
                      onChange={(e) => { importTheme(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {savedThemes.map((t) => (
                    <div key={t.id} className="flex items-stretch gap-1">
                      <button type="button" onClick={() => applySavedTheme(t)} className="flex-1 text-left border border-neutral-200 rounded-lg px-3 py-2 hover:bg-neutral-50">
                        <span className="block text-xs font-bold">{t.name}</span>
                        <span className="block text-[11px] text-neutral-500">Saved {new Date(t.savedAt).toLocaleDateString()}</span>
                      </button>
                      <button type="button" aria-label={`Rename ${t.name}`} title="Rename" className={iconBtn} onClick={() => renameTheme(t)}><Pencil size={14} /></button>
                      <button type="button" aria-label={`Duplicate ${t.name}`} title="Duplicate" className={iconBtn}
                        onClick={() => persistThemes(duplicateSavedTheme(savedThemes, t.id), "Theme duplicated.")}><Copy size={14} /></button>
                      <button type="button" aria-label={`Download ${t.name} as a file`} title="Download file" className={iconBtn} onClick={() => exportTheme(t)}><Download size={14} /></button>
                      <button type="button" aria-label={`Delete ${t.name}`} className={iconBtn}
                        onClick={() => { if (window.confirm(`Delete saved theme “${t.name}”?`)) persistThemes(removeSavedTheme(savedThemes, t.id), "Theme deleted."); }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-neutral-200 space-y-2">
                  <p className="text-[10px] font-black tracking-widest uppercase text-neutral-500">Theme library</p>
                  {THEME_LIBRARY.map((t: any) => (
                    <button key={t.id} type="button" onClick={() => applyLibraryTheme(t)}
                      className="w-full text-left border border-neutral-200 rounded-lg px-3 py-2 hover:bg-neutral-50">
                      <span className="block text-xs font-bold">{t.name}{design.themeLibraryPreset === t.id ? "  ✓ current" : ""}</span>
                      <span className="block text-[11px] text-neutral-500">{t.mood}</span>
                    </button>
                  ))}
                </div>
                  </div>}
                  {styleCategory === "paymentIcons" && <div className="px-4 pb-4 space-y-4">
                    <p className="studio-hint">Checkout itself always offers the methods enabled in Settings › Payments.</p>

                {PAYMENT_BADGE_OPTIONS.map((o) => {
                  const cur = resolveFooterBadges(design, settings);
                  const on = cur.includes(o.id);
                  return (
                    <label key={o.id} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={on}
                        onChange={() => setStyle("footerBadges", on ? cur.filter((x: string) => x !== o.id) : [...cur, o.id])} />
                      {o.label}
                    </label>
                  );
                })}
                <button type="button" className={btn} onClick={() => setStyle("footerBadges", undefined)}>Reset to Settings › Payments</button>
                  </div>}
                  {isChangedView && <div className="studio-changed-list">
                    {!changed.total && <p className="studio-empty">Nothing changed yet. Every theme setting uses its default.</p>}
                    {STYLE_GROUPS.filter(g => changed.byGroup[g.id]).map(g => (
                      <section key={g.id} className="studio-subsection">
                        <div className="studio-changed-group"><strong>{g.title}</strong>
                          <button type="button" className="studio-reset" onClick={() => setStyleCategory(g.id)}>Open category</button></div>
                        <div className="studio-subsection-body">{changedFields(g, design, defaults).map(f => renderStyleField(g, f))}</div>
                      </section>
                    ))}
                  </div>}
                  {group && (REGION_GROUPS.some(r => r.id === group.id)
                    ? <div className="px-4 pb-4"><StudioRegionBrowser groupId={group.id} fields={group.fields} device={device}
                        values={{ ...design.regions, ...(local ? design[template.id]?.regions : {}) }} onPick={openRegion} /></div>
                    : subs.map((sub, i) => (
                      <SettingsSubsection key={sub.title || i} title={sub.title} count={sub.fields.length}
                        changed={sub.fields.filter(f => isChanged(f, design, defaults)).length}
                        defaultOpen={i === 0 || subs.length <= 2} keys={sub.fields.map(f => f.key)} focusKey={fieldFocus}>
                        {sub.fields.map(f => renderStyleField(group, f))}
                      </SettingsSubsection>
                    )))}
                </div>
              );
            })()}
            {leftTab === "style" && styleFocus && !styleSearch && (() => {
              const focusGroup = STYLE_GROUPS.find(g => g.id === styleFocus.id)!;
              const pattern = STYLE_TARGET_FIELDS[styleFocus.label];
              const regionGroup = REGION_GROUPS.find(g => g.id === styleFocus.id);
              const region = regionGroup?.regions.find(r => r.label === styleFocus.label);
              if (regionGroup && !region) return <Group title={regionGroup.title} open>
                <StudioRegionBrowser groupId={regionGroup.id} fields={focusGroup.fields} device={device}
                  values={{ ...design.regions, ...(styleScope === "page" ? design[template.id]?.regions : {}) }} onPick={openRegion} />
              </Group>;
              const pickedAll = region ? regionStyleFields(focusGroup, region.id).map(f => ({ g: focusGroup, f })) : pattern
                ? STYLE_GROUPS.flatMap(g => g.fields.filter(f => pattern.test(f.key)).map(f => ({ g, f })))
                : focusGroup.fields.map(f => ({ g: focusGroup, f }));
              const picked = region ? pickedAll.filter(({ f }) => regionFieldDevice(f.key) === device) : pickedAll;
              return (
                <div className="border-b border-neutral-200 bg-neutral-50" data-studio-panel="style-focus">
                  <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black tracking-widest uppercase text-neutral-500">Editing element</p>
                      <p className="text-sm font-bold">{styleFocus.label}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{picked.length} settings for this element{styleScope === "page" ? "" : " · all pages"}</p>
                    </div>
                    <button type="button" className={btn} onClick={() => { setStyleFocus(null); setStyleCategory(null); }}>Back to theme settings</button>
                  </div>
                  <div className="px-4 pb-4 space-y-4">
                    {region && <div className="studio-region-context">
                      <p>{REGION_DEVICE_LABELS[device]} · {styleScope === "page" ? template.label : "All pages"}</p>
                      <p className="studio-hint">{device === "desktop" ? "Base styling for all sizes. Tablet and phone overrides take precedence." : "Blank values inherit from larger sizes. Changes apply at this size and smaller unless overridden."}</p>
                      <div className="studio-region-actions">
                        <button type="button" className="studio-reset" onClick={() => resetRegion(styleFocus.id, region.id)}>Reset {REGION_DEVICE_LABELS[device].toLowerCase()} styling</button>
                        <button type="button" className="studio-reset" onClick={() => {
                          setTextCategory(region.copy || regionGroup!.copy); setCopyFilter(""); setStyleFocus(null); setLeftTab("text");
                        }}>Edit words in Text &amp; labels</button>
                      </div>
                    </div>}
                    {picked.map(({ g, f }) => renderStyleField(g, f))}
                  </div>
                </div>
              );
            })()}
            {leftTab === "style" && !styleFocus && styleSearch.trim() && visibleStyleGroups.map(g => {
              const fields = g.fields;
              if (!fields.length) return null;
              const local = styleScope === "page" && PAGE_STYLE_GROUPS.has(g.id);
              return <Group key={g.id} id={`style:${g.id}`} title={g.title} hint={local ? "This page only. Reset a field to inherit its global value." : "All pages"} open={Boolean(styleSearch || styleCategory)}>
                {REGION_GROUPS.some(group => group.id === g.id)
                  ? <StudioRegionBrowser groupId={g.id} fields={fields} device={device}
                    values={{ ...design.regions, ...(local ? design[template.id]?.regions : {}) }} onPick={openRegion} />
                  : fields.map(f => renderStyleField(g, f))}
              </Group>;
            })}
            {leftTab === "style" && styleSearch && !STYLE_GROUPS.some(g => g.fields.some(f => (g.title + " " + f.label + " " + f.key).toLowerCase().includes(styleSearch.toLowerCase()))) && <p className="studio-empty">No matching settings.</p>}

            {leftTab === "text" && (
              <div>
                <div className="p-3 border-b">
                  <input value={copyFilter} onChange={(e) => setCopyFilter(e.target.value)} placeholder="Search any label or message…"
                    aria-label="Search text" className="w-full h-9 border border-neutral-300 rounded-lg px-3 text-xs" />
                </div>
                {!q && !textCategory && <SettingsHome headings={textHome} onOpen={(id) => setTextCategory(id)}
                  changedTotal={textChangedTotal} changedNoun="label" onOpenChanged={() => setTextCategory(CHANGED_CATEGORY)} />}
                {!q && textCategory && <CategoryHeader title={textCategory === CHANGED_CATEGORY ? "Text I've changed" : textCategory}
                  blurb={textCategory === CHANGED_CATEGORY ? "Every label you rewrote. Reset one to go back to the default wording." : TEXT_BLURBS[textCategory]}
                  backLabel="All text categories" onBack={() => setTextCategory(null)} />}
                {!q && textCategory === CHANGED_CATEGORY && <div className="studio-changed-list">
                  {!textChangedTotal && <p className="studio-empty">No labels changed yet. Every word uses its default.</p>}
                  {COPY_SCHEMA.filter(g => changedCopyCount(g.fields, design)).map(g => (
                    <section key={g.group} className="studio-subsection">
                      <div className="studio-changed-group"><strong>{g.group}</strong>
                        <button type="button" className="studio-reset" onClick={() => setTextCategory(g.group)}>Open category</button></div>
                      <div className="studio-subsection-body">{g.fields.filter(f => typeof design.copy?.[f.key] === "string").map(f => <StudioCopyField key={f.key} field={f} design={design}
                        onChange={value => setStyle('copy.' + f.key, value)} />)}</div>
                    </section>
                  ))}
                </div>}
                {q && !COPY_SCHEMA.some(g => g.fields.some(f => `${f.label} ${g.group} ${f.default} ${f.key}`.toLowerCase().includes(q))) && <p className="studio-empty">No matching text. Try a shorter word or clear search.</p>}
                {COPY_SCHEMA.map((g) => {
                  if (!q && g.group !== textCategory) return null;
                  const fs = g.fields.filter((f) => !q || `${f.label} ${g.group} ${f.default} ${f.key}`.toLowerCase().includes(q));
                  if (!fs.length) return null;
                  const fieldsList = fs.map(f => <StudioCopyField key={f.key} field={f} design={design}
                    onChange={value => setStyle('copy.' + f.key, value)} />);
                  if (!q) return <div key={g.group} data-studio-panel={`copy:${g.group}`} className="px-4 pb-4 space-y-4">{fieldsList}</div>;
                  return (
                    <Group key={g.group} id={`copy:${g.group}`} title={g.group} open>
                      {fieldsList}
                    </Group>
                  );
                })}
              </div>
            )}

            <div hidden={leftTab !== "pages"}>
              <StudioPages pages={pages} setPages={setPages} say={say} onDraft={setDraftPage} openSlug={openPage} onBusy={setPageBusy}
                loadError={pageLoadError} onRetryLoad={loadPages}
                active={leftTab === "pages"}
                onReorder={(ordered) => {
                  const raw: any[] = Array.isArray(design.categories) ? design.categories : [...CATEGORIES];
                  const cats = raw.map((c, i) => (typeof c === "string" ? { id: `cat-${i}`, name: c, description: "", showInNav: true } : c));
                  setStyle("navOrder", reslotPages(buildNavItems(cats, ordered, design.navOrder), ordered));
                }}
                onEditSections={(slug) => { setShowGlobal(false); setTemplateId(`page:${slug}`); setSelectedId(null); setLeftTab("sections"); }} />
            </div>

            {leftTab === "menus" && (
              <>
                <StudioCategories design={design} published={published} onChange={(c) => setStyle("categories", c)}
                  onReorder={(c) => change(d => ({ ...d, categories: c, navOrder: categoryNavOrder(d.categories ?? [...CATEGORIES], c, pages, d.navOrder) }))}
                  onBooksChanged={(all) => setBooks(all.filter(b => b.status === "published" || !b.status))} />
                <NavOrderPanel design={design} pages={pages} onChange={(o) => setStyle("navOrder", o)} onSecondaryChange={(keys) => setStyle("secondaryNavKeys", keys)} />
                <MenusPanel design={design} settings={settings} pages={pages} onChange={(m) => setStyle("menus", m)} />
              </>
            )}
          </div>
        </nav>

        {/* preview */}
        <main className="studio-canvas">
          <div className="studio-canvas-status"><span>{template.label} · {device} ({DEVICE_W[device]}) · {mode === "edit" ? "Double-click text to type · click other elements for settings" : "Browse your storefront"}</span><span role="status">{previewStatus === "loading" ? "Loading preview…" : previewStatus === "error" ? "Preview unavailable" : "Preview connected"}</span>{previewStatus === "error" && <button className={btn} onClick={() => setPreviewRevision(r => r + 1)}>Retry preview</button>}</div>
          {template.id === "productPage" && !books.some(b => b.slug === productSlug) ? <p className="studio-empty">Choose an available product above to preview this template.</p> :
          <div className="studio-preview-viewport"><div className="studio-preview-frame" style={{ width: DEVICE_W[device], minWidth: DEVICE_W[device] }}>
            <iframe ref={iframeRef} key={previewUrl + previewRevision} src={previewUrl} title="Live preview" onLoad={onIframeLoad} className="w-full h-full border-0" />
          </div></div>}
        </main>

        {selected && (
          <StudioInspector section={selected} blockId={blockId} onSelectBlock={setBlockId} colorSchemes={colorSchemes}
            device={device} sharedBlocks={design.sharedBlocks || []} onSaveShared={saveSharedBlock} onPatchShared={patchSharedBlock} onInsertShared={insertSharedBlock}
            onPatch={patchSelected} onDuplicate={() => dupSection(selected.id)} onDelete={() => delSection(selected.id)}
            onToggle={() => setList((l) => toggleSection(l, selected.id))} onNotice={(text) => say("ok", text)} onClose={() => { setSelectedId(null); setBlockId(null); setMobilePanel("outline"); }} />
        )}
      </div>
      </FocusContext.Provider>

      <StudioSearch open={findOpen} onClose={() => setFindOpen(false)} index={searchIndex} onPick={goToResult} />
      {adding !== null && <AddSectionDialog onPick={addSection} onClose={() => setAdding(null)} presets={design.sectionPresets || []} onPickPreset={addPreset} />}
      <Dialog open={historyOpen} onClose={() => { setHistoryOpen(false); setHistoryPreview(null); }} title="Version history" description="Every saved draft and publish is kept here. Previewing never changes your draft." size="lg">
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {!versions.length && <p className="studio-empty">No saved versions yet.</p>}
          {versions.map(v => <div key={v.id} className="border border-neutral-200 rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1"><strong className="block text-sm">{v.label}</strong><span className="text-xs text-neutral-500">{v.kind} · {new Date(v.createdAt).toLocaleString()}</span></div>
            <button className={btn} onClick={() => { setHistoryPreview(v); }}>Preview</button>
            <button className={btnPrimary} onClick={() => { change(() => normalizeDesign(v.design, defaults)); setHistoryPreview(null); setHistoryOpen(false); say("ok", "Version restored to the draft. Save or Publish when ready."); }}>Restore to draft</button>
          </div>)}
          {historyPreview && <p className="text-xs font-bold">Previewing: {historyPreview.label}. Close History to return to your current draft.</p>}
        </div>
      </Dialog>
      <Dialog open={confirmAction !== null} onClose={() => setConfirmAction(null)} title={confirmAction === "publish" ? "Publish this design?" : "Discard this draft?"}>
        <div className="space-y-4">
          <p className="text-sm">{confirmAction === "publish" ? "These changes will become visible to shoppers immediately:" : "These draft changes will be permanently replaced by the current live design:"}</p>
          <ul className="list-disc pl-5 text-sm space-y-1">{describeChanges(confirmAction === "publish" ? published : design, confirmAction === "publish" ? design : published).map(x => <li key={x}>{x}</li>)}</ul>
          <div className="flex justify-end gap-2"><button className={btn} onClick={() => setConfirmAction(null)}>Cancel</button><button className={confirmAction === "publish" ? btnPrimary : `${btn} border-red-300 text-red-700`} onClick={() => { const action = confirmAction; setConfirmAction(null); action === "publish" ? publish() : discard(); }}>{confirmAction === "publish" ? "Publish now" : "Discard draft"}</button></div>
        </div>
      </Dialog>
      <Dialog open={checksOpen} onClose={() => setChecksOpen(false)} title="Pre-publish check" description="A quick accessibility, content and performance review of this draft.">
        <div className="space-y-2">{designChecks(design).map((r, i) => <p key={i} className={`p-3 rounded-lg text-sm ${r.tone === "warn" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>{r.tone === "warn" ? "⚠" : "✓"} {r.text}</p>)}</div>
      </Dialog>
    </div>
  );
}
