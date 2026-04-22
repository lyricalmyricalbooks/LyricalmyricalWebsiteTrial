import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  FileText,
  Save,
  Check,
  GripVertical,
  ExternalLink,
  Search,
  Layout,
  Settings,
  Search as SearchIcon,
} from "lucide-react";
import { adminApi } from "./api";
import type { Page } from "../features/site/types";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { SectionHeader, InputField, Switch } from "./ShopSettings";

// The local Page type is now removed in favor of the shared type.

// ─────────────────────────────────────
// Slug helper
// ─────────────────────────────────────
function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function PagesManager() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Page> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editing) {
      const update = {
        type: "PAGE_PREVIEW_UPDATE",
        page: {
          ...editing,
          id: editing.id || 'new-page-preview'
        }
      };
      
      // Iframe communication
      window.parent.postMessage(update, "*");
      
      // Cross-tab broadcast
      try {
        const bc = new BroadcastChannel("site_preview_updates");
        bc.postMessage(update);
        bc.close();
      } catch (_) {}
    }
  }, [editing]);

  async function load() {
    setLoading(true);
    try {
      const p = await adminApi.getPages();
      setPages(p);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing({
      title: "",
      slug: "",
      body: "",
      status: "published",
      showInNav: true,
      order: pages.length,
      seoTitle: "",
      metaDescription: "",
    });
    setIsNew(true);
    setSlugEdited(false);
    setSaved(false);
  }

  function openEdit(page: Page) {
    setEditing({ ...page });
    setIsNew(false);
    setSlugEdited(true);
    setSaved(false);
  }

  function handleTitleChange(val: string) {
    setEditing((prev) => ({
      ...prev,
      title: val,
      slug: slugEdited ? prev!.slug : toSlug(val),
    }));
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await adminApi.createPage(editing);
        setPages((prev) => [...prev, created]);
        setEditing(created);
        setIsNew(false);
      } else {
        const updated = await adminApi.updatePage(editing.id!, editing);
        setPages((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        setEditing(updated);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing?.id || isNew) return;
    const confirmed = window.confirm(
      `Delete "${editing.title}"? This cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await adminApi.deletePage(editing.id);
      setPages((prev) => prev.filter((p) => p.id !== editing.id));
      setEditing(null);
    } finally {
      setDeleting(false);
    }
  }

  function handleBack() {
    setEditing(null);
    setSaved(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[10px] tracking-[0.3em] text-neutral-400 uppercase animate-pulse">
          Loading pages...
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {editing ? (
        // ─── PAGE EDITOR ───────────────────────────────────────────
        <motion.div
          key="editor"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-12 max-w-5xl"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-6 mb-8">
            <button
              onClick={handleBack}
              className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-slate-500 hover:text-white transition-all uppercase italic group"
            >
              <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-violet-500/30 group-hover:bg-violet-500/10 transition-all">
                <ArrowLeft size={14} />
              </div>
              Back to Registry
            </button>

            <div className="flex items-center gap-4">
              {editing.id && !isNew && (
                <a
                  href={`#/page/${editing.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-[10px] font-black tracking-[0.3em] text-slate-400 hover:text-white transition-all border border-white/5 bg-white/5 rounded-2xl px-6 py-4 uppercase italic"
                >
                  <ExternalLink size={14} />
                  Live View
                </a>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !editing.title?.trim()}
                className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] transition-all uppercase italic border shadow-2xl ${
                  saved
                    ? "bg-emerald-500 text-white border-emerald-400/20 shadow-emerald-500/20"
                    : saving
                    ? "bg-white/5 text-slate-600 border-white/5 cursor-not-allowed"
                    : "bg-violet-600 text-white border-violet-400/20 shadow-violet-600/40 hover:bg-violet-500 active:scale-95"
                }`}
              >
                {saved ? (
                  <><Check size={14} /> SYNCED</>
                ) : saving ? (
                  "COMMITTING..."
                ) : (
                  <><Save size={14} /> {isNew ? "CREATE ENTITY" : "COMMIT CHANGES"}</>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
              {/* Content Engine */}
              <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent pointer-events-none" />
                <SectionHeader 
                  title="Content Engine" 
                  subtitle="Entity Body & Structure" 
                  icon={FileText} 
                />

                <div className="space-y-12 relative z-10">
                  <InputField 
                    label="ENTITY DESIGNATION (TITLE)"
                    value={editing.title || ""}
                    placeholder="Enter page title..."
                    onChange={(e: any) => handleTitleChange(e.target.value)}
                  />

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">SYSTEM SLUG (URL)</label>
                    <div className="flex items-center gap-6 bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-5 focus-within:border-violet-500/50 focus-within:bg-white/[0.06] transition-all group shadow-inner">
                      <Globe size={20} className="text-slate-600 group-focus-within:text-violet-400 transition-colors" />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-slate-600 font-mono">/page/</span>
                        <input
                          type="text"
                          value={editing.slug || ""}
                          onChange={(e) => {
                            setSlugEdited(true);
                            setEditing((p) => ({ ...p, slug: toSlug(e.target.value) }));
                          }}
                          placeholder="page-url-slug"
                          className="bg-transparent border-none outline-none text-sm text-white flex-1 font-mono font-bold placeholder:text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 editor-container pt-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">ENTITY MARKUP (BODY)</label>
                    <div className="rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-inner focus-within:border-violet-500/30 transition-all">
                      <ReactQuill
                        theme="snow"
                        value={editing.body || ""}
                        onChange={(val) =>
                          setEditing((p) => ({ ...p, body: val }))
                        }
                        placeholder="Write your page content here…"
                        modules={{
                          toolbar: [
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            ['link', 'blockquote', 'code-block'],
                            ['clean']
                          ],
                        }}
                        className="bg-transparent text-white"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* SEO Optimization */}
              <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.03] to-transparent pointer-events-none" />
                <SectionHeader 
                  title="Search Optimization" 
                  subtitle="Index Visibility & Metadata" 
                  icon={SearchIcon} 
                  color="cyan"
                />

                <div className="space-y-12 relative z-10">
                  {/* Google Preview simulation */}
                  <div className="bg-slate-900/50 rounded-3xl border border-white/5 p-8 shadow-inner space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                          <Globe size={10} className="text-slate-500" />
                       </div>
                       <span className="text-[9px] text-slate-500 font-mono tracking-wider">https://lyricalmyrical.com/page/{editing.slug || "handle"}</span>
                    </div>
                    <div className="text-cyan-400 text-xl font-bold hover:underline cursor-default">
                      {editing.seoTitle || editing.title || "Meta Title Preview"}
                    </div>
                    <div className="text-slate-400 text-xs leading-relaxed line-clamp-2">
                      {editing.metaDescription ||
                        "Enter a meta description to see how your page will appear in search results. Target density: 160 characters."}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-12">
                    <InputField 
                      label="SEO PAGE TITLE"
                      value={editing.seoTitle || ""}
                      onChange={(e: any) => setEditing((p) => ({ ...p, seoTitle: e.target.value }))}
                      placeholder={editing.title}
                    />
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">META DESCRIPTION</label>
                       <textarea
                         value={editing.metaDescription || ""}
                         onChange={(e) =>
                           setEditing((p) => ({
                             ...p,
                             metaDescription: e.target.value,
                           }))
                         }
                         placeholder="A brief summary for search engines..."
                         rows={4}
                         className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-6 text-sm text-white outline-none focus:border-cyan-500/50 focus:bg-white/[0.06] transition-all resize-none leading-relaxed font-medium shadow-inner"
                       />
                       <div className="flex justify-between items-center px-4">
                          <p className="text-[9px] text-slate-600 font-black tracking-[0.3em] uppercase">{editing.metaDescription?.length || 0} / 320 BYTES</p>
                       </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-12">
              <section className="glass-card rounded-[3rem] p-10 border border-white/5 space-y-10 sticky top-12">
                <div className="space-y-10">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 ml-1 italic">Status Protocol</h4>
                    <div className="space-y-8">
                       <div className="flex items-center justify-between group">
                          <div>
                             <p className="text-xs font-black text-white uppercase italic tracking-wider mb-1">Public Visibility</p>
                             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Toggle production status</p>
                          </div>
                          <Switch 
                            checked={editing.status === "published"}
                            onChange={(val) => setEditing(p => ({...p!, status: val ? "published" : "draft"}))}
                          />
                       </div>

                       <div className="flex items-center justify-between group">
                          <div>
                             <p className="text-xs font-black text-white uppercase italic tracking-wider mb-1">Navigation Link</p>
                             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Inject into main menu</p>
                          </div>
                          <Switch 
                            checked={editing.showInNav ?? true}
                            onChange={(val) => setEditing(p => ({...p!, showInNav: val}))}
                          />
                       </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-white/5">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 ml-1 italic">Danger Zone</h4>
                    {!isNew ? (
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black tracking-[0.3em] uppercase italic hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5 active:scale-95"
                      >
                        <Trash2 size={14} />
                        {deleting ? "PURGING..." : "DELETE ENTITY"}
                      </button>
                    ) : (
                       <p className="text-[9px] text-slate-600 font-medium italic text-center px-4">Entity must be committed to registry before deletion protocols become active.</p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <style>{`
            .editor-container .ql-toolbar.ql-snow {
              border: none;
              border-bottom: 1px solid rgba(255,255,255,0.05);
              background: rgba(255,255,255,0.02);
              padding: 16px 24px;
            }
            .editor-container .ql-container.ql-snow {
              border: none;
              font-family: inherit;
              font-size: 14px;
            }
            .editor-container .ql-editor {
              min-height: 500px;
              padding: 40px;
              line-height: 1.8;
              color: white;
            }
            .editor-container .ql-editor.ql-blank::before {
              left: 40px;
              font-style: italic;
              color: #334155;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.2em;
            }
            .editor-container .ql-snow.ql-toolbar button {
              color: #94a3b8;
            }
            .editor-container .ql-snow.ql-toolbar button:hover,
            .editor-container .ql-snow.ql-toolbar button.ql-active {
              color: #A855F7;
            }
            .editor-container .ql-snow.ql-toolbar .ql-stroke {
              stroke: #64748b;
            }
            .editor-container .ql-snow.ql-toolbar button:hover .ql-stroke,
            .editor-container .ql-snow.ql-toolbar button.ql-active .ql-stroke {
              stroke: #A855F7;
            }
            .editor-container .ql-snow.ql-toolbar .ql-fill {
              fill: #64748b;
            }
            .editor-container .ql-snow.ql-toolbar button:hover .ql-fill,
            .editor-container .ql-snow.ql-toolbar button.ql-active .ql-fill {
              fill: #A855F7;
            }
          `}</style>
        </motion.div>
      ) : (
        // ─── PAGES LIST ────────────────────────────────────────────
        <motion.div
          key="list"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-12 max-w-5xl"
        >
          {/* Header */}
          <header className="flex flex-col gap-2 mb-4">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Entity Registry</h2>
                <p className="text-xs text-slate-400 tracking-[0.3em] uppercase mt-4 font-bold">Custom Page Infrastructure & Routing</p>
              </div>
              <button
                onClick={openNew}
                className="bg-violet-600 text-white px-12 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-violet-600/40 hover:bg-violet-500 transition-all border border-violet-400/20 active:scale-95 flex items-center gap-3 uppercase italic"
              >
                <Plus size={16} />
                NEW ENTITY
              </button>
            </div>
          </header>

          {/* Registry Control Center */}
          <div className="glass-card rounded-[3rem] border border-white/5 overflow-hidden relative shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            {/* Search / Filter Bar */}
            <div className="px-12 py-8 border-b border-white/5 flex items-center justify-between relative z-10 bg-white/[0.01]">
              <div className="flex-1 max-w-md relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-violet-400 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="FILTER BY DESIGNATION OR KEY..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-16 py-4 text-[10px] font-black tracking-widest text-white outline-none focus:border-violet-500/30 focus:bg-white/5 transition-all placeholder:text-slate-700"
                />
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                   <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Active Entities</span>
                   <span className="text-xl font-black text-white font-mono italic">{pages.filter(p => p.status === "published").length} / {pages.length}</span>
                </div>
                <div className="w-px h-8 bg-white/5" />
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                   <Settings size={18} />
                </div>
              </div>
            </div>

            {pages.length === 0 ? (
              <div className="px-12 py-32 text-center relative z-10">
                <div className="w-20 h-20 bg-white/[0.03] border border-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <FileText size={32} className="text-slate-700" />
                </div>
                <p className="text-lg font-black text-white uppercase italic tracking-tight mb-2">Registry Void</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
                  No entities have been established in the core database. Initialize your first page to begin infrastructure mapping.
                </p>
              </div>
            ) : (
              <div className="relative z-10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className="px-12 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Entity / Slug</th>
                      <th className="px-12 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Status Protocol</th>
                      <th className="px-12 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Navigation</th>
                      <th className="px-12 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pages
                      .filter((p) =>
                        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.slug.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .map((page, i) => (
                        <tr 
                          key={page.id}
                          className="hover:bg-white/[0.03] transition-all group cursor-pointer"
                          onClick={() => openEdit(page)}
                        >
                          <td className="px-12 py-8">
                            <div className="flex items-center gap-6">
                               <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 group-hover:border-violet-500/30 group-hover:text-violet-400 transition-all shadow-inner">
                                  <FileText size={16} />
                               </div>
                               <div>
                                 <p className="text-sm font-black text-white uppercase tracking-tight italic group-hover:text-violet-400 transition-colors">
                                   {page.title}
                                 </p>
                                 <p className="text-[9px] font-mono text-slate-600 mt-1 uppercase tracking-widest">
                                   /page/{page.slug}
                                 </p>
                               </div>
                            </div>
                          </td>
                          <td className="px-12 py-8">
                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black tracking-widest uppercase italic ${
                              page.status === "published"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                            }`}>
                              {page.status === "published" ? (
                                <><Check size={10} /> PRODUCTION</>
                              ) : (
                                <><EyeOff size={10} /> DRAFT MODE</>
                              )}
                            </div>
                          </td>
                          <td className="px-12 py-8">
                             {page.showInNav ? (
                               <div className="flex items-center gap-3 text-violet-400/70">
                                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                                  <span className="text-[9px] font-black uppercase tracking-widest italic">Live in Menu</span>
                               </div>
                             ) : (
                               <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic">Exempted</span>
                             )}
                          </td>
                          <td className="px-12 py-8 text-right">
                             <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/5 text-slate-600 group-hover:border-violet-500/50 group-hover:text-white transition-all">
                                <ChevronRight size={18} />
                             </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {pages.length > 0 && (
            <div className="flex justify-between items-center px-12 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 italic">
               <span>Registry Statistics</span>
               <span>{pages.filter((p) => p.status === "published").length} Nodes Active — Capacity Nominal</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
