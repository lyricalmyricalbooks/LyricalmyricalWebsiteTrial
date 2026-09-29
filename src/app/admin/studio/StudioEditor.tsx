import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ChevronDown, ChevronUp, Copy, Eye, EyeOff, Monitor, Plus, Redo2, Search, Smartphone,
  Tablet, Trash2, Undo2, X,
} from "lucide-react";
import { adminApi } from "../api";
import {
  SECTION_REGISTRY, SectionFieldEditor, SectionSettingsPanel, BlocksEditor, buildPageTemplates,
  getBlockFields, getSectionFields, getSectionMeta, DEFAULT_COLOR_SCHEMES,
} from "../ThemeEditorExtensions";
import { COPY_SCHEMA, DEFAULT_COPY } from "../../features/site/storeCopy";
import { MENU_LINK_TYPES, newMenuItem, type MenuItem } from "../../features/site/storeMenu";
import {
  commit, duplicateSection, getSections, initHistory, insertSection, makeSection, moveSection, normalizeDesign,
  patchBlockField, patchSectionSettings, redo, removeSection, sameDesign, setSections, toggleSection, undo,
  type Section, type SectionTarget,
} from "./studioModel";
import { STATIC_SURFACES, STYLE_GROUPS, applyGlobalStyle, readStyle } from "./styleSchema";
import { PREVIEW_BRIDGE_SOURCE } from "./previewBridge";
import { RISO_NOIR_ID, RISO_NOIR_TOKENS } from "../../features/site/risoNoir";
import { addSavedTheme, removeSavedTheme, type SavedTheme } from "./savedThemes";
import { PAYMENT_BADGE_OPTIONS, resolveFooterBadges } from "../../features/site/paymentBadges";
import { HOME_LAYOUT_TEMPLATES } from "../ThemeEditorBuilder";
import { applyThemeKeysToSurfaces } from "../themeScope";
import { THEME_LIBRARY, PALETTES } from "../ThemeEditor";

type LeftTab = "sections" | "style" | "text" | "menus";
type Toast = { kind: "ok" | "err"; text: string } | null;

const DEVICE_W = { desktop: "100%", tablet: "820px", mobile: "390px" } as const;

// ── tiny shared UI bits ────────────────────────────────────────────────────
const btn =
  "inline-flex items-center gap-1.5 px-3 h-9 text-xs font-bold border border-neutral-300 rounded-lg bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed";
const btnPrimary =
  "inline-flex items-center gap-1.5 px-4 h-9 text-xs font-bold rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed";
const iconBtn =
  "inline-flex items-center justify-center w-8 h-8 rounded-md text-neutral-600 hover:bg-neutral-200 disabled:opacity-30";

function Group({ title, hint, children, open: initial = false }: { title: string; hint?: string; children: any; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <section className="border-b border-neutral-200">
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
    <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add section"
      onKeyDown={(e) => e.key === "Escape" && onClose()}>
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
    </div>
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

function MenusPanel({ design, pages, onChange }: { design: any; pages: any[]; onChange: (menus: any) => void }) {
  const [which, setWhich] = useState<"header" | "footer">("header");
  const menus = design.menus || {};
  const items: MenuItem[] = menus[which] || [];
  const set = (next: MenuItem[]) => onChange({ ...menus, [which]: next });
  return (
    <div className="p-4 space-y-3">
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

// ── Inspector (right column) ───────────────────────────────────────────────
function Inspector({ section, colorSchemes, onPatch, onDuplicate, onDelete, onToggle, onClose }: {
  section: Section; colorSchemes: any[]; onPatch: (p: Record<string, any>) => void;
  onDuplicate: () => void; onDelete: () => void; onToggle: () => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"content" | "blocks" | "design">("content");
  const meta = getSectionMeta(section.type);
  const fields = getSectionFields(section.type);
  const hasBlocks = Boolean(meta?.blockType && getBlockFields(section.type).length);
  const uploadFile = useCallback((f: File) => adminApi.uploadFile(f, `sections/${section.id}_${Date.now()}`), [section.id]);
  useEffect(() => setTab("content"), [section.id]);
  const tabs: [typeof tab, string][] = [["content", "Content"], ...(hasBlocks ? [["blocks", meta?.blockLabel ? `${meta.blockLabel}s` : "Items"] as [typeof tab, string]] : []), ["design", "Design"]];
  return (
    <aside className="w-[340px] shrink-0 border-l border-neutral-200 bg-white flex flex-col min-h-0" aria-label="Section settings">
      <div className="p-3 border-b flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{meta?.label || section.type}</p>
          <p className="text-[11px] text-neutral-500 truncate">{meta?.description}</p>
        </div>
        <button className={iconBtn} onClick={onToggle} aria-label={section.visible === false ? "Show section" : "Hide section"}>
          {section.visible === false ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button className={iconBtn} onClick={onDuplicate} aria-label="Duplicate section"><Copy size={15} /></button>
        <button className={iconBtn} onClick={onDelete} aria-label="Delete section"><Trash2 size={15} /></button>
        <button className={iconBtn} onClick={onClose} aria-label="Close settings"><X size={15} /></button>
      </div>
      <div className="flex gap-1 p-2 border-b" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`px-3 h-8 text-xs font-bold rounded-lg ${tab === id ? "bg-neutral-900 text-white" : "bg-neutral-100 hover:bg-neutral-200"}`}>{label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {tab === "content" && (
          fields.length ? fields.map((f) => (
            <SectionFieldEditor key={f.key} field={f} value={section.settings?.[f.key]} settings={section.settings}
              onChange={(v) => onPatch({ [f.key]: v })} onPatch={onPatch} uploadFile={uploadFile} />
          )) : <p className="text-sm text-neutral-500">This section has no text settings. Use the Design tab for layout and colors.</p>
        )}
        {tab === "blocks" && <BlocksEditor sectionType={section.type} settings={section.settings || {}} onUpdate={onPatch} uploadFile={uploadFile} />}
        {tab === "design" && <SectionSettingsPanel settings={section.settings || {}} onUpdate={onPatch} colorSchemes={colorSchemes} />}
      </div>
    </aside>
  );
}

// ── Main editor ────────────────────────────────────────────────────────────
export function StudioEditor({ settings, onExit, onPersisted }: {
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
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<null | "draft" | "publish">(null);
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
    adminApi.getBooks().then((b: any[]) => setBooks((b || []).filter((x) => x.status === "published" || !x.status))).catch(() => {});
  }, []);

  const change = useCallback((fn: (d: any) => any) => setHist((h) => commit(h, fn(h.present))), []);
  const setList = (fn: (l: Section[]) => Section[]) => change((d) => setSections(d, target, fn(getSections(d, target))));
  const patchSelected = (patch: Record<string, any>) => selectedId && setList((l) => patchSectionSettings(l, selectedId, patch));
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
    for (const k of ["font", "fontSize", "cornerStyle", "buttonStyle", "animationLevel", "productCardStyle", "productHoverEffect",
      "imageAspectRatio", "productImageLayout", "productContentPosition", "productColumnsDesktop", "productColumnsMobile",
      "cardRadius", "productCTA", "catalogLayoutStyle", "showCatalogControls"]) if (theme[k] !== undefined) base[k] = theme[k];
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

  // ── preview wiring ──
  const previewUrl = useMemo(() => {
    const base = window.location.origin + window.location.pathname.replace(/\/admin\/?.*$/, "").replace(/\/$/, "");
    const withQ = (p: string) => `${base}${p}${p.includes("?") ? "&" : "?"}preview=true`;
    switch (template.id) {
      case "storefront": return withQ("/?catalog=true");
      case "productPage": return withQ(`/books/${books[0]?.slug || ""}`);
      case "collectionPage": return withQ("/collections/publications");
      case "cartPage": return withQ("/checkout");
      case "page404": return withQ("/page/page-not-found-preview");
      case "page": return withQ(`/page/${pages.find((p) => p.status === "published")?.slug || ""}`);
      default: return withQ(template.pageSlug ? `/page/${template.pageSlug}` : "/");
    }
  }, [template.id, template.pageSlug, books, pages]);

  const sendDesign = useCallback(() => {
    try { iframeRef.current?.contentWindow?.postMessage({ type: "THEME_UPDATE", design: designRef.current }, window.location.origin); } catch { /* ignore */ }
  }, []);
  useEffect(() => { const t = setTimeout(sendDesign, 100); return () => clearTimeout(t); }, [design, sendDesign]);
  // Tell the preview which strings are editable copy, so double-clicking one jumps to its field.
  const sendCopyMap = useCallback(() => {
    const items = COPY_SCHEMA.flatMap((g) => g.fields.map((f) => ({ key: f.key, text: (designRef.current.copy?.[f.key] || DEFAULT_COPY[f.key] || "") })));
    try { iframeRef.current?.contentWindow?.postMessage({ type: "SET_COPY_MAP", items }, window.location.origin); } catch { /* ignore */ }
  }, []);
  useEffect(() => { const t = setTimeout(sendCopyMap, 200); return () => clearTimeout(t); }, [design, sendCopyMap]);

  const onIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const s = doc.createElement("script");
      s.textContent = PREVIEW_BRIDGE_SOURCE;
      doc.head.appendChild(s);
    } catch { /* cross-origin: preview is view-only */ }
  };

  const highlight = useCallback((id: string | null, scroll = false) => {
    try { iframeRef.current?.contentWindow?.postMessage({ type: "HIGHLIGHT_SECTION", instanceId: id, scroll }, window.location.origin); } catch { /* ignore */ }
  }, []);
  useEffect(() => highlight(selectedId), [selectedId, highlight, design]);

  // preview → editor messages
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || !e.data) return;
      const d = e.data;
      if (d.type === "PREVIEW_ERROR") say("err", `The preview hit an error: ${String(d.message).slice(0, 200)}`);
      if (d.type === "PREVIEW_READY") { sendDesign(); sendCopyMap(); highlight(selectedId); }
      if (d.type === "COPY_SELECT" && typeof d.key === "string") {
        setLeftTab("text");
        setCopyFilter(d.key);
        setTimeout(() => document.querySelector<HTMLElement>(`[data-copy-key="${d.key}"] input, [data-copy-key="${d.key}"] textarea`)?.focus(), 150);
      }
      if (d.type === "SECTION_SELECT" && d.instanceId) {
        const cur = designRef.current;
        if (getSections(cur, { kind: "global" }).some((s) => s.id === d.instanceId)) {
          setShowGlobal(true);
        } else {
          const owner = templates.find((t) => getSections(cur, { kind: "template", id: t.id }).some((s) => s.id === d.instanceId));
          if (owner) { setShowGlobal(false); setTemplateId(owner.id); }
        }
        setLeftTab("sections");
        setSelectedId(d.instanceId);
      }
      if (d.type === "TEXT_EDIT" && d.sectionId && d.settingKey) {
        const scan: SectionTarget[] = [{ kind: "global" }, ...templates.map((t) => ({ kind: "template", id: t.id }) as SectionTarget)];
        const tgt = scan.find((t) => getSections(designRef.current, t).some((s) => s.id === d.sectionId));
        if (!tgt) return;
        change((dd) => setSections(dd, tgt, d.blockId
          ? patchBlockField(getSections(dd, tgt), d.sectionId, d.blockId, d.settingKey, d.value)
          : patchSectionSettings(getSections(dd, tgt), d.sectionId, { [d.settingKey]: d.value })));
      }
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [templates, selectedId, sendDesign, sendCopyMap, highlight, change]);

  // ── persistence ──
  const saveDraft = async () => {
    setBusy("draft");
    try {
      await adminApi.updateSettings({ design: designRef.current }, { publish: false });
      setSavedDraft(designRef.current);
      onPersisted?.(designRef.current, false);
      say("ok", "Draft saved. The live site is unchanged.");
    } catch (err: any) {
      say("err", `Could not save: ${err?.message || "unknown error"}. Your edits are still here — try again.`);
    } finally { setBusy(null); }
  };
  const publish = async () => {
    if (!window.confirm("Publish these changes to the live storefront?")) return;
    setBusy("publish");
    try {
      const snapshot = designRef.current;
      await adminApi.updateSettings({ design: snapshot }, { publish: true });
      setSavedDraft(snapshot); setPublished(snapshot);
      onPersisted?.(snapshot, true);
      adminApi.saveThemeVersion("published", `Published ${new Date().toLocaleString()}`, snapshot).catch(() => {});
      say("ok", "Published. The live storefront now shows these changes.");
    } catch (err: any) {
      say("err", `Publish failed: ${err?.message || "unknown error"}. Nothing went live.`);
    } finally { setBusy(null); }
  };
  const discard = async () => {
    if (!window.confirm("Discard all unpublished changes and go back to the live design?")) return;
    try {
      await adminApi.discardThemeDraft(published);
      setHist(initHistory(published)); setSavedDraft(published); setSelectedId(null);
      onPersisted?.(published, false);
      say("ok", "Draft discarded.");
    } catch (err: any) { say("err", `Could not discard: ${err?.message || "unknown error"}`); }
  };
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
    const at = selected ? sections.findIndex((x) => x.id === selected.id) + 1 : sections.length;
    setList((l) => insertSection(l, s, at));
    setSelectedId(s.id);
    setAdding(false);
    setTimeout(() => highlight(s.id, true), 400);
  };
  const dupSection = (id: string) => {
    const r = duplicateSection(sections, id);
    setList(() => r.list);
    if (r.newId) setSelectedId(r.newId);
  };
  const delSection = (id: string) => {
    if (!window.confirm("Delete this section?")) return;
    setList((l) => removeSection(l, id));
    if (selectedId === id) setSelectedId(null);
  };

  const sidebarTabs: [LeftTab, string][] = [["sections", "Sections"], ["style", "Style"], ["text", "Text & labels"], ["menus", "Menus"]];
  const q = copyFilter.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-[300] bg-neutral-100 text-neutral-900 flex flex-col font-sans" data-studio-editor>
      {/* top bar */}
      <header className="h-14 shrink-0 bg-white border-b border-neutral-200 flex items-center gap-2 px-3">
        <button className={btn} onClick={exit}><ArrowLeft size={14} /> Exit</button>
        <select value={showGlobal ? "__global" : template.id}
          onChange={(e) => { const v = e.target.value; setSelectedId(null); if (v === "__global") setShowGlobal(true); else { setShowGlobal(false); setTemplateId(v); } setLeftTab("sections"); }}
          aria-label="Page to edit" className="h-9 border border-neutral-300 rounded-lg px-2 text-xs font-bold max-w-[220px]">
          <optgroup label="Pages">
            {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </optgroup>
          <optgroup label="Every page">
            <option value="__global">Header / footer sections (global)</option>
          </optgroup>
        </select>
        <div className="hidden md:flex items-center gap-0.5 ml-2" role="group" aria-label="Preview size">
          {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
            <button key={d} className={`${iconBtn} ${device === d ? "bg-neutral-900 text-white hover:bg-neutral-900" : ""}`}
              onClick={() => setDevice(d)} aria-label={`${d} preview`} aria-pressed={device === d}><Icon size={15} /></button>
          ))}
        </div>
        <button className={iconBtn} disabled={!hist.past.length} onClick={() => setHist(undo)} aria-label="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
        <button className={iconBtn} disabled={!hist.future.length} onClick={() => setHist(redo)} aria-label="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
        <div className="flex-1" />
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-neutral-100" role="status">
          {dirtyDraft ? "Unsaved changes" : unpublished ? "Draft saved · not live" : "Live"}
        </span>
        <button className={btn} disabled={!unpublished || busy !== null} onClick={discard}>Discard draft</button>
        <button className={btn} disabled={!dirtyDraft || busy !== null} onClick={saveDraft}>{busy === "draft" ? "Saving…" : "Save draft"}</button>
        <button className={btnPrimary} disabled={(!unpublished && !dirtyDraft) || busy !== null} onClick={publish}>{busy === "publish" ? "Publishing…" : "Publish"}</button>
      </header>

      {toast && (
        <div role={toast.kind === "err" ? "alert" : "status"}
          className={`absolute top-16 left-1/2 -translate-x-1/2 z-[350] px-4 py-2 rounded-lg text-sm font-bold shadow-lg ${toast.kind === "err" ? "bg-red-600 text-white" : "bg-neutral-900 text-white"}`}>
          {toast.text}
          {toast.kind === "err" && <button className="ml-3 underline" onClick={() => setToast(null)}>Dismiss</button>}
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* left column */}
        <nav className="w-[320px] shrink-0 bg-white border-r border-neutral-200 flex flex-col min-h-0" aria-label="Editor panels">
          <div className="grid grid-cols-4 border-b" role="tablist">
            {sidebarTabs.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={leftTab === id} onClick={() => setLeftTab(id)}
                className={`py-3 text-[11px] font-bold leading-tight px-1 ${leftTab === id ? "border-b-2 border-neutral-900" : "text-neutral-500 hover:bg-neutral-50"}`}>{label}</button>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            {leftTab === "sections" && (
              <div className="p-3 space-y-2">
                <p className="text-xs text-neutral-500 px-1">
                  {showGlobal ? "These sections appear on every page." : `Sections on the “${template.label}” page. Click one here or in the preview to edit it.`}
                </p>
                {sections.map((s, i) => {
                  const t = sectionTitle(s);
                  const on = s.id === selectedId;
                  return (
                    <div key={s.id} className={`flex items-center gap-1 border rounded-lg pl-3 pr-1 py-1 ${on ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"} ${s.visible === false ? "opacity-50" : ""}`}>
                      <button className="flex-1 min-w-0 text-left py-1.5" onClick={() => { setSelectedId(s.id); highlight(s.id, true); }} aria-current={on}>
                        <p className="text-xs font-bold truncate">{t.label}</p>
                        {t.snippet && <p className="text-[11px] text-neutral-500 truncate">{t.snippet}</p>}
                      </button>
                      <button className={iconBtn} disabled={i === 0} onClick={() => setList((l) => moveSection(l, i, i - 1))} aria-label={`Move ${t.label} up`}><ChevronUp size={14} /></button>
                      <button className={iconBtn} disabled={i === sections.length - 1} onClick={() => setList((l) => moveSection(l, i, i + 1))} aria-label={`Move ${t.label} down`}><ChevronDown size={14} /></button>
                      <button className={iconBtn} onClick={() => setList((l) => toggleSection(l, s.id))} aria-label={s.visible === false ? `Show ${t.label}` : `Hide ${t.label}`}>
                        {s.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  );
                })}
                {!sections.length && (
                  <div className="text-sm text-neutral-500 border border-dashed border-neutral-300 rounded-lg p-4">
                    No sections on this page yet{template.id === "productPage" || template.id === "collectionPage" ? " — the built-in layout is shown until you add some" : ""}.
                  </div>
                )}
                <button className={`${btnPrimary} w-full justify-center`} onClick={() => setAdding(true)}><Plus size={14} /> Add section</button>
              </div>
            )}

            {leftTab === "style" && (
              <Group title="Theme look" open
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

            {leftTab === "style" && (
              <Group title="Payment icons (footer)" hint="Pick which payment logos the footer shows. Checkout itself always offers the methods enabled in Settings › Payments.">
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

            {leftTab === "style" && STYLE_GROUPS.map((g, gi) => (
              <Group key={g.id} title={g.title} hint={g.hint} open={false}>
                {g.fields.map((f) => (
                  <SectionFieldEditor key={f.key} field={f as any}
                    value={readStyle(design, f.key) ?? readStyle(defaults, f.key)}
                    onChange={(v) => setStyle(f.key, v)}
                    uploadFile={(file) => adminApi.uploadFile(file, `design/${Date.now()}_${file.name}`)} />
                ))}
              </Group>
            ))}

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
                    <Group key={g.group} title={g.group} open={Boolean(q)}>
                      {fs.map((f) => {
                        const val = design.copy?.[f.key] ?? "";
                        const Tag: any = f.multiline ? "textarea" : "input";
                        return (
                          <label key={f.key} data-copy-key={f.key} className="block">
                            <span className="text-[10px] font-black tracking-widest uppercase text-neutral-500 block mb-1">{f.label}</span>
                            <Tag value={val} placeholder={DEFAULT_COPY[f.key]} rows={f.multiline ? 3 : undefined}
                              onChange={(e: any) => setStyle(`copy.${f.key}`, e.target.value || undefined)}
                              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-xs" />
                            {f.hint && <span className="text-[11px] text-neutral-500">{f.hint}</span>}
                          </label>
                        );
                      })}
                    </Group>
                  );
                })}
              </div>
            )}

            {leftTab === "menus" && <MenusPanel design={design} pages={pages} onChange={(m) => setStyle("menus", m)} />}
          </div>
        </nav>

        {/* preview */}
        <main className="flex-1 min-w-0 p-3 flex justify-center bg-neutral-200 overflow-auto">
          <div className="h-full bg-white shadow-lg rounded-lg overflow-hidden transition-all" style={{ width: DEVICE_W[device], maxWidth: "100%" }}>
            <iframe ref={iframeRef} key={previewUrl} src={previewUrl} title="Live preview" onLoad={onIframeLoad} className="w-full h-full border-0" />
          </div>
        </main>

        {selected && (
          <Inspector section={selected} colorSchemes={colorSchemes}
            onPatch={patchSelected} onDuplicate={() => dupSection(selected.id)} onDelete={() => delSection(selected.id)}
            onToggle={() => setList((l) => toggleSection(l, selected.id))} onClose={() => setSelectedId(null)} />
        )}
      </div>

      {adding && <AddSectionDialog onPick={addSection} onClose={() => setAdding(false)} />}
    </div>
  );
}
