import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronDown, ChevronUp, Clipboard, Copy, Eye, EyeOff, History, Monitor, Plus, Redo2, Search, ShieldCheck, Smartphone,
  Tablet, Trash2, Undo2, X,
} from "lucide-react";
import { adminApi } from "../api";
import {
  SECTION_REGISTRY, SectionFieldEditor, buildPageTemplates,
  getBlockFields, getBlocksKey, getSectionFields, getSectionMeta, DEFAULT_COLOR_SCHEMES,
} from "../ThemeEditorExtensions";
import { CATEGORIES } from "../../features/site/constants";
import { buildNavItems, moveNavItem, renameCategory } from "../../features/site/navItems";
import { COPY_SCHEMA, DEFAULT_COPY } from "../../features/site/storeCopy";
import { MENU_LINK_TYPES, newMenuItem, type MenuItem } from "../../features/site/storeMenu";
import {
  commit, duplicateSection, findBlock, getSections, initHistory, insertSection, makeSection, mapBlock, moveBlockBefore, newId, normalizeDesign,
  patchBlockField, patchSectionSettings, redo, removeSection, sameDesign, setSections, toggleSection, undo,
  type Section, type SectionTarget, type SharedBlock,
} from "./studioModel";
import { STATIC_SURFACES, STYLE_GROUPS, applyGlobalStyle, readStyle } from "./styleSchema";
import { StudioPages } from "./StudioPages";
import { PREVIEW_BRIDGE_SOURCE } from "./previewBridge";
import { RISO_NOIR_ID, RISO_NOIR_TOKENS } from "../../features/site/risoNoir";
import { addSavedTheme, removeSavedTheme, type SavedTheme } from "./savedThemes";
import { PAYMENT_BADGE_OPTIONS, resolveFooterBadges } from "../../features/site/paymentBadges";
import { HOME_LAYOUT_TEMPLATES } from "./homeLayouts";
import { applyThemeKeysToSurfaces } from "../themeScope";
import { THEME_LIBRARY, PALETTES, THEME_APPLIED_KEYS } from "./themeLibrary";
import { StudioOutline } from "./StudioOutline";
import { StudioInspector } from "./StudioInspector";
import { applyPageStyle, PAGE_STYLE_GROUPS, previewRoute } from "./studioWorkflow";
import { useStudioPersistence } from "./useStudioPersistence";
import { Dialog, SecondaryButton } from "../riso/components";
import "./studio.css";

type LeftTab = "sections" | "style" | "text" | "menus" | "pages";
type Toast = { kind: "ok" | "err"; text: string } | null;
type ThemeVersion = { id: string; kind: "draft" | "published"; label: string; createdAt: string; design: any };

function describeChanges(from: any, to: any): string[] {
  const out: string[] = [];
  const surfaces = ["heroPage", "storefront", "productPage", "collectionPage", "cartPage", "page", "page404"];
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

function designChecks(design: any): { tone: "ok" | "warn"; text: string }[] {
  const sections = Object.values(design || {}).flatMap((v: any) => Array.isArray(v?.sections) ? v.sections : [] as any[]);
  const results: { tone: "ok" | "warn"; text: string }[] = [];
  const empty = sections.filter((s: any) => !(s.settings?.title || s.settings?.heading || s.settings?.text || s.settings?.imageUrl || Object.values(s.settings || {}).some(Array.isArray))).length;
  results.push({ tone: empty ? "warn" : "ok", text: empty ? `${empty} section${empty === 1 ? " is" : "s are"} empty or may lack meaningful content.` : "No obviously empty sections." });
  const missingAlt = sections.filter((s: any) => Object.keys(s.settings || {}).some(k => /image.*url/i.test(k) && s.settings[k]) && !Object.keys(s.settings || {}).some(k => /alt/i.test(k) && s.settings[k])).length;
  results.push({ tone: missingAlt ? "warn" : "ok", text: missingAlt ? `${missingAlt} image section${missingAlt === 1 ? " needs" : "s need"} an image description.` : "Image descriptions look complete." });
  results.push({ tone: "ok", text: "Theme images use responsive storefront loading; verify uploaded hero images stay below 200 KB." });
  results.push({ tone: "ok", text: "Color controls retain the editor's contrast indicators; review any warning badges before publishing." });
  return results;
}

const DEVICE_W = { desktop: "100%", tablet: "820px", mobile: "390px" } as const;

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
function AddSectionDialog({ onPick, onClose }: { onPick: (type: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
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
          {!list.length && <p className="text-sm text-neutral-500">No sections match “{q}”.</p>}
        </div>
      </div>
    </Dialog>
  );
}

// ── Menu editor ────────────────────────────────────────────────────────────
function MenuRow({ item, pages, depth, onChange, onRemove, onMove }: {
  item: MenuItem; pages: any[]; depth: number; onChange: (n: MenuItem) => void; onRemove: () => void; onMove: (d: number) => void;
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

// ── Shop categories (the category bar in the storefront header) ───────────
function CategoriesPanel({ design, onChange }: { design: any; onChange: (cats: any[]) => void }) {
  const raw: any[] = Array.isArray(design.categories) ? design.categories : [...CATEGORIES];
  const cats = raw.map((c, i) => (typeof c === "string" ? { id: `cat-${i}`, name: c, description: "", showInNav: true } : c));
  const patch = (i: number, p: Record<string, any>) => onChange(cats.map((c, j) => (j === i ? { ...c, ...p } : c)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= cats.length) return;
    const c = [...cats]; [c[i], c[j]] = [c[j], c[i]]; onChange(c);
  };
  return (
    <div className="p-4 space-y-3 border-b border-neutral-200" data-studio-panel="menus:categories">
      <div>
        <p className="text-sm font-bold">Shop categories</p>
        <p className="text-xs text-neutral-500">The names in the shop's category bar (Publications, Ephemera…). Rename, hide, reorder or delete them here. Renaming keeps every book that was filed under the old name.</p>
      </div>
      {cats.map((c, i) => (
        <div key={c.id || i} className="border border-neutral-200 rounded-lg p-2 space-y-2 bg-white">
          <div className="flex items-center gap-1">
            <CategoryNameInput name={c.name} onCommit={(v) => onChange(renameCategory(cats, i, v))} />
            <button className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move category up"><ChevronUp size={14} /></button>
            <button className={iconBtn} onClick={() => move(i, 1)} disabled={i === cats.length - 1} aria-label="Move category down"><ChevronDown size={14} /></button>
            <button className={iconBtn} aria-label="Delete category"
              onClick={() => { if (window.confirm(`Delete the "${c.name || "Untitled"}" category? Books keep their data; you can re-add it later.`)) onChange(cats.filter((_, j) => j !== i)); }}><Trash2 size={14} /></button>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={c.showInNav !== false} onChange={(e) => patch(i, { showInNav: e.target.checked })} />
            Show in the shop menu
          </label>
        </div>
      ))}
      <button className={btn} onClick={() => onChange([...cats, { id: `cat-${Date.now()}`, name: "NEW CATEGORY", description: "", showInNav: true }])}><Plus size={14} /> Add category</button>
    </div>
  );
}

// Edits locally and commits on blur/Enter, so a rename is recorded once (not per keystroke).
function CategoryNameInput({ name, onCommit }: { name: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const done = () => { if (draft.trim() && draft.trim() !== name) onCommit(draft); else setDraft(name); };
  return (
    <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={done}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setDraft(name); (e.target as HTMLInputElement).blur(); } }}
      aria-label="Category name" placeholder="Category name"
      className="flex-1 min-w-0 border border-neutral-200 rounded-md px-2 h-8 text-xs" />
  );
}

// ── Header bar order (categories + in-menu pages, one sequence) ────────────
function NavOrderPanel({ design, pages, onChange }: { design: any; pages: any[]; onChange: (order: string[]) => void }) {
  const raw: any[] = Array.isArray(design.categories) ? design.categories : [...CATEGORIES];
  const cats = raw.map((c, i) => (typeof c === "string" ? { id: `cat-${i}`, name: c, description: "", showInNav: true } : c));
  const items = buildNavItems(cats, pages, design.navOrder);
  return (
    <div className="p-4 space-y-3 border-b border-neutral-200" data-studio-panel="menus:header-order">
      <div>
        <p className="text-sm font-bold">Header bar order</p>
        <p className="text-xs text-neutral-500">Categories and pages share one bar across the top of the shop. Use the arrows to put them in any order. New pages are added at the end.</p>
      </div>
      {items.length === 0 && <p className="text-xs text-neutral-400">Nothing is set to show in the header yet.</p>}
      {items.map((it, i) => (
        <div key={it.key} className="flex items-center gap-1 border border-neutral-200 rounded-lg px-2 py-1 bg-white">
          <span className="flex-1 min-w-0 truncate text-xs font-bold uppercase">{it.label}</span>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400">{it.kind === "page" ? "Page" : "Category"}</span>
          <button className={iconBtn} onClick={() => onChange(moveNavItem(items, i, -1))} disabled={i === 0} aria-label={`Move ${it.label} earlier`}><ChevronUp size={14} /></button>
          <button className={iconBtn} onClick={() => onChange(moveNavItem(items, i, 1))} disabled={i === items.length - 1} aria-label={`Move ${it.label} later`}><ChevronDown size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function MenusPanel({ design, pages, onChange }: { design: any; pages: any[]; onChange: (menus: any) => void }) {
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
      {items.map((it, i) => (
        <MenuRow key={it.id} item={it} pages={pages} depth={0}
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
  const [books, setBooks] = useState<any[]>([]);
  const [leftTab, setLeftTab] = useState<LeftTab>("sections");
  const [templateId, setTemplateId] = useState("heroPage");
  const [showGlobal, setShowGlobal] = useState(false);
  const [device, setDevice] = useState<keyof typeof DEVICE_W>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [blockId, setBlockId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "browse">("edit");
  const [mobilePanel, setMobilePanel] = useState("preview");
  const [styleSearch, setStyleSearch] = useState("");
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
  const inlineStart = useRef<any>(null);

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
  const dirtyDraft = !sameDesign(design, savedDraft);
  const unpublished = !sameDesign(design, published);

  const say = (kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    if (kind === "ok") setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 3500);
  };

  // load pages + books for the preview pickers
  useEffect(() => {
    adminApi.getPages().then((p: any[]) => setPages(p || [])).catch(() => {});
    adminApi.getBooks().then((b: any[]) => { const published = (b || []).filter(x => x.status === "published" || !x.status); setBooks(published); setProductSlug(published[0]?.slug || ""); }).catch(() => say("err", "Could not load preview products. Reopen Studio to retry."));
  }, []);
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
  const riso = design.themeStyle === "riso";

  const setScopedStyle = (group: string, path: string, value: any) => {
    if (styleScope === "page" && PAGE_STYLE_GROUPS.has(group)) change(d => applyPageStyle(d, template.id, path, value));
    else setStyle(path, value);
  };

  // ── preview wiring ──
  const previewUrl = useMemo(() => {
    const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
    const withQ = (p: string) => `${base}${p}${p.includes("?") ? "&" : "?"}preview=true`;
    switch (template.id) {
      case "storefront": return withQ("/?catalog=true");
      case "productPage": return withQ(`/books/${productSlug || ""}`);
      case "collectionPage": return withQ(`/collections/${collectionSlug}`);
      case "cartPage": return withQ("/checkout");
      case "page404": return withQ("/page/page-not-found-preview");
      case "page": return withQ(`/page/${pages.find((p) => p.status === "published")?.slug || ""}`);
      default: return withQ(template.pageSlug ? `/page/${template.pageSlug}` : "/");
    }
  }, [template.id, template.pageSlug, productSlug, collectionSlug, pages]);

  const sendDesign = useCallback(() => {
    try { iframeRef.current?.contentWindow?.postMessage({ type: "THEME_UPDATE", design: historyPreview?.design || designRef.current }, window.location.origin); } catch { /* ignore */ }
  }, [historyPreview]);
  useEffect(() => { const t = setTimeout(sendDesign, 150); return () => clearTimeout(t); }, [design, sendDesign]);
  // Tell the preview which strings are editable copy, so double-clicking one jumps to its field.
  const sendCopyMap = useCallback(() => {
    const items = COPY_SCHEMA.flatMap((g) => g.fields.map((f) => ({ key: f.key, text: (designRef.current.copy?.[f.key] || DEFAULT_COPY[f.key] || "") })));
    try { iframeRef.current?.contentWindow?.postMessage({ type: "SET_COPY_MAP", items }, window.location.origin); } catch { /* ignore */ }
    const editable: any[] = [];
    const scanBlocks = (section: Section, blocks: any[]) => (blocks || []).forEach((block: any) => {
      for (const field of getBlockFields(section.type)) if ((field.kind === "text" || field.kind === "textarea") && block[field.key]) editable.push({ sectionId: section.id, blockId: block.id, key: field.key, text: String(block[field.key]) });
      scanBlocks(section, block.children || []);
    });
    const targets: SectionTarget[] = [{ kind: "global" }, ...templates.map(t => ({ kind: "template", id: t.id }) as SectionTarget)];
    for (const target of targets) for (const section of getSections(designRef.current, target)) {
      for (const field of getSectionFields(section.type)) if ((field.kind === "text" || field.kind === "textarea") && section.settings[field.key]) editable.push({ sectionId: section.id, blockId: null, key: field.key, text: String(section.settings[field.key]) });
      scanBlocks(section, section.settings[getBlocksKey(section.type)] || section.settings.blocks || []);
    }
    try { iframeRef.current?.contentWindow?.postMessage({ type: "SET_EDIT_MAP", items: editable }, window.location.origin); } catch { /* ignore */ }
  }, [templates]);
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
  useEffect(() => highlight(selectedId), [selectedId, highlight]);
  useEffect(() => { const t = setTimeout(() => highlight(selectedId), 250); return () => clearTimeout(t); }, [design]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { iframeRef.current?.contentWindow?.postMessage({ type: "STUDIO_MODE", mode }, window.location.origin); }, [mode]);
  useEffect(() => { setPreviewStatus("loading"); const timer = setTimeout(() => setPreviewStatus(s => s === "loading" ? "error" : s), 15000); return () => clearTimeout(timer); }, [previewUrl, previewRevision]);

  // preview → editor messages
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== iframeRef.current?.contentWindow || !e.data) return;
      const d = e.data;
      if (d.type === "PREVIEW_ERROR") say("err", `The preview hit an error: ${String(d.message).slice(0, 200)}`);
      if (d.type === "PREVIEW_READY") { setPreviewStatus("ready"); sendDesign(); sendCopyMap(); highlight(selectedId); iframeRef.current?.contentWindow?.postMessage({ type: "STUDIO_MODE", mode }, window.location.origin); }
      if (d.type === "STUDIO_ROUTE" && typeof d.href === "string") {
        const route = previewRoute(d.href, import.meta.env.BASE_URL);
        if (route && templates.some(t => t.id === route.templateId)) { setTemplateId(route.templateId); setShowGlobal(false); setSelectedId(null); setBlockId(null); }
        if (route?.product) setProductSlug(route.product);
        if (route?.collection) setCollectionSlug(route.collection);
        sendDesign();
      }
      if (d.type === "COPY_SELECT" && typeof d.key === "string" && COPY_SCHEMA.some(g => g.fields.some(f => f.key === d.key))) {
        setMobilePanel("outline");
        setLeftTab("text");
        setCopyFilter(d.key);
        setTimeout(() => document.querySelector<HTMLElement>(`[data-copy-key="${CSS.escape(d.key)}"] input, [data-copy-key="${CSS.escape(d.key)}"] textarea`)?.focus(), 150);
      }
      if (d.type === "STUDIO_TARGET" && typeof d.target === "string") {
        const target = d.target as string;
        const [kind, rest = ""] = target.split(":");
        const tab: LeftTab | null = kind === "style" ? "style" : kind === "copy" ? "text" : kind === "menus" ? "menus" : kind === "pages" ? "pages" : null;
        if (!tab) return;
        setMobilePanel("outline");
        setSelectedId(null); setBlockId(null);
        if (tab === "style") setStyleSearch("");
        if (tab === "text") setCopyFilter("");
        setLeftTab(tab);
        const panel = kind === "menus" && (rest === "header" || rest === "footer") ? "menus:links" : target;
        setFocus(f => ({ id: target, nonce: f.nonce + 1 }));
        setTimeout(() => {
          const el = document.querySelector<HTMLElement>(`[data-studio-panel="${CSS.escape(panel)}"]`);
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.classList.add("studio-flash");
          setTimeout(() => el.classList.remove("studio-flash"), 1600);
        }, 120);
      }
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
        const from = sections.findIndex(s => s.id === d.sectionId), to = sections.findIndex(s => s.id === d.beforeId);
        if (from >= 0 && to >= 0 && from !== to) {
          const next = [...sections]; const [moved] = next.splice(from, 1); next.splice(from < to ? to - 1 : to, 0, moved); setList(() => next);
        }
      }
      if (d.type === "BLOCK_MOVE" && d.sectionId && d.blockId && d.beforeId) {
        const section = sections.find(s => s.id === d.sectionId); if (!section) return;
        const key = getBlocksKey(section.type), blocks = section.settings[key] || section.settings.blocks || [];
        setList(list => patchSectionSettings(list, section.id, { [key]: moveBlockBefore(blocks, d.blockId, d.beforeId) }));
      }
      if (d.type === "ADD_BLOCK" && d.sectionId) {
        const section = sections.find(s => s.id === d.sectionId); if (!section) return;
        const meta = getSectionMeta(section.type); if (!meta?.blockType) return;
        const key = getBlocksKey(section.type), block = { ...JSON.parse(JSON.stringify(meta.blockDefaults || {})), id: newId() };
        setList(list => patchSectionSettings(list, section.id, { [key]: [...(section.settings[key] || []), block] }));
        setSelectedId(section.id); setBlockId(block.id); setMobilePanel("settings");
      }
      if (d.type === "TEXT_EDIT_START") inlineStart.current = designRef.current;
      if (d.type === "TEXT_EDIT_END") {
        const before = inlineStart.current; inlineStart.current = null;
        if (before) setHist(h => sameDesign(before, h.present) ? h : { past: [...h.past, before].slice(-100), present: h.present, future: [] });
      }
      if (d.type === "TEXT_EDIT" && d.sectionId && d.settingKey && typeof d.value === "string") {
        const scan: SectionTarget[] = [{ kind: "global" }, ...templates.map((t) => ({ kind: "template", id: t.id }) as SectionTarget)];
        const tgt = scan.find((t) => getSections(designRef.current, t).some((s) => s.id === d.sectionId));
        if (!tgt) return;
        const section = getSections(designRef.current, tgt).find(s => s.id === d.sectionId)!;
        const fields = d.blockId ? getBlockFields(section.type) : getSectionFields(section.type);
        if (!fields.some(f => f.key === d.settingKey && (f.kind === "text" || f.kind === "textarea"))) return;
        const edit = (dd: any) => setSections(dd, tgt, d.blockId
          ? patchBlockField(getSections(dd, tgt), d.sectionId, d.blockId, d.settingKey, d.value)
          : patchSectionSettings(getSections(dd, tgt), d.sectionId, { [d.settingKey]: d.value }));
        if (inlineStart.current) setHist(h => ({ ...h, present: edit(h.present) })); else change(edit);
      }
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [templates, selectedId, sendDesign, sendCopyMap, highlight, change, mode]);

  const { busy, saveDraft, publish, discard, recovery, recover, dismissRecovery } = useStudioPersistence({
    design, savedDraft, published, setSavedDraft, setPublished, onPersisted,
    reset: (next) => { setHist(initHistory(next)); setSelectedId(null); setBlockId(null); },
    restore: next => change(() => normalizeDesign(next, defaults)), say,
  });
  const exit = () => {
    if (dirtyDraft && !window.confirm("You have unsaved edits. Leave without saving?")) return;
    onExit();
  };

  // warn on tab close, keyboard shortcuts
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => { if (dirtyDraft) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirtyDraft]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName || "") || (e.target as HTMLElement)?.isContentEditable;
      if (busy === "discard") { e.preventDefault(); return; }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); saveDraft(); }
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
    setStyle("sectionPresets", [...(design.sectionPresets || []), preset]); say("ok", "Section saved for reuse on any page.");
  };
  const addPreset = (preset: any) => {
    const source = preset.section;
    const clone = duplicateSection([source], source.id).list[1];
    setList(l => insertSection(l, clone, l.length)); setSelectedId(clone.id);
  };

  const sidebarTabs: [LeftTab, string][] = [["sections", "Sections"], ["style", "Style"], ["text", "Text & labels"], ["menus", "Menus"], ["pages", "Pages"]];
  const q = copyFilter.trim().toLowerCase();

  return (
    <div className="rp studio-editor" data-rp-appearance={appearance} data-studio-editor data-mobile-panel={mobilePanel}>
      {/* top bar */}
      <header className="studio-topbar">
        <button className={btn} onClick={exit}><ArrowLeft size={14} /> Exit</button>
        <strong className="studio-title">Design studio</strong>
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
        <button className={iconBtn} disabled={!hist.past.length} onClick={() => setHist(undo)} aria-label="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
        <button className={iconBtn} disabled={!hist.future.length} onClick={() => setHist(redo)} aria-label="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
        <div className="flex-1" />
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-neutral-100" role="status">
          {dirtyDraft ? "Unsaved changes" : unpublished ? "Draft saved · not live" : "Live"}
        </span>
        <button className={btn} onClick={() => { setHistoryOpen(true); loadVersions(); }}><History size={14} /> History</button>
        <button className={btn} onClick={() => setChecksOpen(true)}><ShieldCheck size={14} /> Check</button>
        <button className={btn} disabled={!unpublished || busy !== null} onClick={() => setConfirmAction("discard")}>Discard draft</button>
        <button className={btn} disabled={!dirtyDraft || busy !== null} onClick={saveDraft}>{busy === "draft" ? "Saving…" : "Save draft"}</button>
        <button className={btnPrimary} disabled={(!unpublished && !dirtyDraft) || busy !== null} onClick={() => setConfirmAction("publish")}>{busy === "publish" ? "Publishing…" : "Publish"}</button>
      </header>

      <div className="studio-mobile-tabs" role="tablist" aria-label="Studio workspace">{["outline", "preview", "settings"].map(panel => <button key={panel} role="tab" aria-selected={mobilePanel === panel} onClick={() => setMobilePanel(panel)}>{panel}</button>)}</div>
      {recovery && <div className="studio-recovery" role="status"><span>Local edits from {new Date(recovery.savedAt).toLocaleString()}.{recovery.conflict ? " The server draft has changed; recovering will load your local version as unsaved edits." : " Recover your unsaved work?"}</span><SecondaryButton onClick={recover}>Recover local changes</SecondaryButton><SecondaryButton onClick={dismissRecovery}>Discard local recovery</SecondaryButton></div>}
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
          <div className="grid grid-cols-5 border-b" role="tablist">
            {sidebarTabs.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={leftTab === id} onClick={() => setLeftTab(id)}
                className={`py-3 text-[11px] font-bold leading-tight px-1 ${leftTab === id ? "border-b-2 border-neutral-900" : "text-neutral-500 hover:bg-neutral-50"}`}>{label}</button>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
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
            {leftTab === "sections" && <div className="m-3 flex gap-2 flex-wrap">
              <button className={btn} disabled={!selected} onClick={() => selected && setCopiedSection(JSON.parse(JSON.stringify(selected)))}><Copy size={13} /> Copy</button>
              <button className={btn} disabled={!copiedSection} onClick={pasteSection}><Clipboard size={13} /> Paste</button>
              <button className={btn} disabled={!selected} onClick={() => selected && saveSection(selected)}>Save section</button>
              {(design.sectionPresets || []).map((p: any) => <button key={p.id} className={btn} onClick={() => addPreset(p)}>+ {p.name}</button>)}
            </div>}
            {leftTab === "sections" && <StudioOutline
              sections={sections} selectedId={selectedId} blockId={blockId}
              onSelect={(id, block) => { setSelectedId(id); setBlockId(block || null); setMobilePanel("settings"); highlight(id, true, block || null); }}
              onReorder={list => setList(() => list)} onPatch={(id, patch) => setList(list => patchSectionSettings(list, id, patch))}
              onAdd={setAdding} onDuplicate={dupSection} onDelete={delSection}
              onToggle={id => setList(list => toggleSection(list, id))} />}
            {leftTab === "style" && <div className="studio-settings-search">
              <input className="studio-search" aria-label="Search style settings" placeholder="Search colors, fonts, spacing…" value={styleSearch} onChange={e => setStyleSearch(e.target.value)} />
              <label>Editing scope<select aria-label="Style scope" value={styleScope} onChange={e => setStyleScope(e.target.value as any)}><option value="all">All pages</option><option value="page">This page only: {template.label}</option></select></label>
              {styleSearch && <button className={btn} onClick={() => setStyleSearch("")}>Clear search</button>}
            </div>}
            {leftTab === "style" && !styleSearch && (
              <Group title="Theme look · All pages" open
                hint={`Current look: ${design.themeLibraryPreset === RISO_NOIR_ID ? "Riso Noir" : riso ? "Riso Press" : "Standard / custom"}. One click sets every color, font and print detail below; you can still change each one afterwards.`}>
                <button type="button" className={`${btnPrimary} w-full justify-center`} onClick={applyNoirLook}>Apply Riso Noir (black &amp; white)</button>
                <button type="button" className={`${btn} w-full justify-center`} onClick={installNoirHome}>Also install the Noir homepage layout</button>
                <button type="button" className={`${btn} w-full justify-center`} disabled={!riso} onClick={() => setStyle("themeStyle", "default")}>Turn off Riso print style</button>
                <div className="pt-2 border-t border-neutral-200 space-y-2">
                  <p className="text-[10px] font-black tracking-widest uppercase text-neutral-500">My themes</p>
                  <button type="button" className={`${btn} w-full justify-center`} onClick={saveCurrentAsTheme}>Save current design as a theme…</button>
                  {savedThemes.map((t) => (
                    <div key={t.id} className="flex items-stretch gap-1">
                      <button type="button" onClick={() => applySavedTheme(t)} className="flex-1 text-left border border-neutral-200 rounded-lg px-3 py-2 hover:bg-neutral-50">
                        <span className="block text-xs font-bold">{t.name}</span>
                        <span className="block text-[11px] text-neutral-500">Saved {new Date(t.savedAt).toLocaleDateString()}</span>
                      </button>
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
              </Group>
            )}

            {leftTab === "style" && !styleSearch && (
              <Group id="style:paymentIcons" title="Payment icons · All pages" hint="Pick which payment logos the footer shows. Checkout itself always offers the methods enabled in Settings › Payments.">
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
              </Group>
            )}

            {leftTab === "style" && STYLE_GROUPS.map(g => {
              const fields = g.fields.filter(f => (g.title + " " + f.label + " " + f.key).toLowerCase().includes(styleSearch.toLowerCase()));
              if (!fields.length) return null;
              const local = styleScope === "page" && PAGE_STYLE_GROUPS.has(g.id);
              return <Group key={g.id} id={`style:${g.id}`} title={g.title} hint={local ? "This page only. Reset a field to inherit its global value." : "All pages"} open={Boolean(styleSearch)}>
                {fields.map(f => <div key={f.key} className="studio-field">
                  <SectionFieldEditor field={f as any}
                    value={(local ? readStyle(design[template.id], f.key) : undefined) ?? readStyle(design, f.key) ?? readStyle(defaults, f.key)}
                    onChange={v => setScopedStyle(g.id, f.key, v)}
                    uploadFile={file => adminApi.uploadFile(file, 'design/' + Date.now() + '_' + file.name)} />
                  {local && readStyle(design[template.id], f.key) !== undefined && <button className="studio-reset" onClick={() => setScopedStyle(g.id, f.key, undefined)}>Reset to global</button>}
                </div>)}
              </Group>;
            })}
            {leftTab === "style" && styleSearch && !STYLE_GROUPS.some(g => g.fields.some(f => (g.title + " " + f.label + " " + f.key).toLowerCase().includes(styleSearch.toLowerCase()))) && <p className="studio-empty">No matching settings.</p>}

            {leftTab === "text" && (
              <div>
                <div className="p-3 border-b">
                  <input value={copyFilter} onChange={(e) => setCopyFilter(e.target.value)} placeholder="Search any label or message…"
                    aria-label="Search text" className="w-full h-9 border border-neutral-300 rounded-lg px-3 text-xs" />
                </div>
                {COPY_SCHEMA.map((g) => {
                  const fs = g.fields.filter((f) => !q || `${f.label} ${g.group} ${f.default} ${f.key}`.toLowerCase().includes(q));
                  if (!fs.length) return null;
                  return (
                    <Group key={g.group} id={`copy:${g.group}`} title={g.group} open={Boolean(q)}>
                      {fs.map((f) => {
                        const val = design.copy?.[f.key] ?? "";
                        const Tag: any = f.multiline ? "textarea" : "input";
                        return (
                          <label key={f.key} data-copy-key={f.key} className="block">
                            <span className="text-[10px] font-black tracking-widest uppercase text-neutral-500 block mb-1">{f.label}</span>
                            <Tag value={val} placeholder={DEFAULT_COPY[f.key]} rows={f.multiline ? 3 : undefined}
                              onChange={(e: any) => setStyle(`copy.${f.key}`, e.target.value || undefined)}
                              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs" />
                            <span className="text-[10px] text-neutral-500">{val ? "Changed from default" : "Using default"}</span>
                            {f.hint && <span className="text-[11px] text-neutral-500">{f.hint}</span>}
                          </label>
                        );
                      })}
                    </Group>
                  );
                })}
              </div>
            )}

            {leftTab === "pages" && (
              <StudioPages pages={pages} setPages={setPages} say={say}
                onEditSections={(slug) => { setShowGlobal(false); setTemplateId(`page:${slug}`); setSelectedId(null); setLeftTab("sections"); }} />
            )}

            {leftTab === "menus" && (
              <>
                <CategoriesPanel design={design} onChange={(c) => setStyle("categories", c)} />
                <NavOrderPanel design={design} pages={pages} onChange={(o) => setStyle("navOrder", o)} />
                <MenusPanel design={design} pages={pages} onChange={(m) => setStyle("menus", m)} />
              </>
            )}
          </div>
        </nav>

        {/* preview */}
        <main className="studio-canvas">
          <div className="studio-canvas-status"><span>{template.label} · {device} · {mode === "edit" ? "Click anything in the preview to edit it" : "Browse your storefront"}</span><span role="status">{previewStatus === "loading" ? "Loading preview…" : previewStatus === "error" ? "Preview unavailable" : "Preview connected"}</span>{previewStatus === "error" && <button className={btn} onClick={() => setPreviewRevision(r => r + 1)}>Retry preview</button>}</div>
          {template.id === "productPage" && !books.some(b => b.slug === productSlug) ? <p className="studio-empty">Choose an available product above to preview this template.</p> :
          <div className="studio-preview-frame" style={{ width: DEVICE_W[device], maxWidth: "100%" }}>
            <iframe ref={iframeRef} key={previewUrl + previewRevision} src={previewUrl} title="Live preview" onLoad={onIframeLoad} className="w-full h-full border-0" />
          </div>}
        </main>

        {selected && (
          <StudioInspector section={selected} blockId={blockId} onSelectBlock={setBlockId} colorSchemes={colorSchemes}
            device={device} sharedBlocks={design.sharedBlocks || []} onSaveShared={saveSharedBlock} onPatchShared={patchSharedBlock} onInsertShared={insertSharedBlock}
            onPatch={patchSelected} onDuplicate={() => dupSection(selected.id)} onDelete={() => delSection(selected.id)}
            onToggle={() => setList((l) => toggleSection(l, selected.id))} onClose={() => { setSelectedId(null); setBlockId(null); setMobilePanel("outline"); }} />
        )}
      </div>
      </FocusContext.Provider>

      {adding !== null && <AddSectionDialog onPick={addSection} onClose={() => setAdding(null)} />}
      <Dialog open={historyOpen} onClose={() => { setHistoryOpen(false); setHistoryPreview(null); sendDesign(); }} title="Version history" description="Every saved draft and publish is kept here. Previewing never changes your draft." size="lg">
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {!versions.length && <p className="studio-empty">No saved versions yet.</p>}
          {versions.map(v => <div key={v.id} className="border border-neutral-200 rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1"><strong className="block text-sm">{v.label}</strong><span className="text-xs text-neutral-500">{v.kind} · {new Date(v.createdAt).toLocaleString()}</span></div>
            <button className={btn} onClick={() => { setHistoryPreview(v); setTimeout(sendDesign, 0); }}>Preview</button>
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
