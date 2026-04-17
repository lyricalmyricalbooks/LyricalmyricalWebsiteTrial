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
} from "lucide-react";
import { adminApi } from "./api";
import type { Page } from "../features/site/types";

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
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="space-y-6 max-w-3xl"
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-neutral-400 hover:text-black transition-colors"
            >
              <ArrowLeft size={14} />
              ALL PAGES
            </button>

            <div className="flex items-center gap-3">
              {editing.id && !isNew && (
                <a
                  href={`#/page/${editing.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-neutral-400 hover:text-black transition-colors border border-neutral-200 rounded-full px-4 py-2"
                >
                  <ExternalLink size={11} />
                  PREVIEW
                </a>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !editing.title?.trim()}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest transition-all ${
                  saved
                    ? "bg-green-500 text-white"
                    : saving
                    ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "bg-black text-white hover:bg-neutral-800 shadow-lg"
                }`}
              >
                {saved ? (
                  <><Check size={12} /> SAVED</>
                ) : saving ? (
                  "SAVING..."
                ) : (
                  <><Save size={12} /> {isNew ? "CREATE PAGE" : "SAVE CHANGES"}</>
                )}
              </button>
            </div>
          </div>

          {/* Editor card */}
          <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
            {/* Status bar */}
            <div className="px-8 py-4 border-b border-neutral-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    setEditing((p) => ({
                      ...p,
                      status: p!.status === "published" ? "draft" : "published",
                    }))
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest transition-all ${
                    editing.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {editing.status === "published" ? (
                    <><Eye size={10} /> PUBLISHED</>
                  ) : (
                    <><EyeOff size={10} /> DRAFT</>
                  )}
                </button>

                <button
                  onClick={() =>
                    setEditing((p) => ({ ...p, showInNav: !p!.showInNav }))
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest transition-all ${
                    editing.showInNav
                      ? "bg-purple-100 text-purple-700"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  <Globe size={10} />
                  {editing.showInNav ? "SHOW IN NAV" : "HIDDEN FROM NAV"}
                </button>
              </div>

              {!isNew && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={12} />
                  {deleting ? "DELETING..." : "DELETE"}
                </button>
              )}
            </div>

            {/* Title */}
            <div className="px-8 pt-8 pb-4">
              <input
                type="text"
                value={editing.title || ""}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Page title…"
                className="w-full text-3xl font-bold tracking-tight text-neutral-900 bg-transparent border-none outline-none placeholder:text-neutral-200"
                autoFocus
              />
            </div>

            {/* Slug */}
            <div className="px-8 pb-6 flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 font-mono">
                /page/
              </span>
              <input
                type="text"
                value={editing.slug || ""}
                onChange={(e) => {
                  setSlugEdited(true);
                  setEditing((p) => ({ ...p, slug: toSlug(e.target.value) }));
                }}
                placeholder="page-url-slug"
                className="text-[11px] font-mono text-neutral-500 bg-transparent border-none outline-none border-b border-dashed border-neutral-200 focus:border-purple-300 pb-0.5 flex-1"
              />
            </div>

            {/* Divider */}
            <div className="h-px bg-neutral-50 mx-8" />

            {/* Body */}
            <div className="px-8 py-6">
              <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-3 block">
                Page Content
              </label>
              <textarea
                value={editing.body || ""}
                onChange={(e) =>
                  setEditing((p) => ({ ...p, body: e.target.value }))
                }
                placeholder="Write your page content here…"
                rows={16}
                className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl px-6 py-5 text-sm leading-relaxed text-neutral-700 outline-none focus:ring-1 focus:ring-purple-300 resize-none transition-shadow font-sans"
              />
              <p className="text-[9px] text-neutral-300 mt-2">
                Basic markdown is supported (bold, italic, lists, headings).
              </p>
            </div>

            {/* SEO Section */}
            <div className="bg-neutral-50 border-t border-neutral-100 p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-[#A855F7] uppercase">
                    Search engine listing preview
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Add a title and description to see how this Page might appear
                    in a search engine listing.
                  </p>
                </div>
              </div>

              {/* Google Preview */}
              <div className="bg-white rounded-xl border border-neutral-100 p-6 shadow-sm max-w-xl">
                <div className="text-[#1a0dab] text-lg font-medium hover:underline cursor-pointer truncate">
                  {editing.seoTitle || editing.title || "Page Title Preview"}
                </div>
                <div className="text-[#006621] text-xs mt-1 truncate">
                  {window.location.origin}/page/{editing.slug || "url-handle"}
                </div>
                <div className="text-[#545454] text-xs mt-1 line-clamp-2 min-h-[2.5em]">
                  {editing.metaDescription ||
                    editing.body?.substring(0, 160) ||
                    "Enter a meta description to see how your page will appear in search results."}
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                    Page title (SEO)
                  </label>
                  <input
                    type="text"
                    value={editing.seoTitle || ""}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, seoTitle: e.target.value }))
                    }
                    placeholder={editing.title}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-purple-300 transition-shadow"
                  />
                  <p className="text-[9px] text-neutral-400">
                    {editing.seoTitle?.length || 0} of 70 characters used
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                    Meta description
                  </label>
                  <textarea
                    value={editing.metaDescription || ""}
                    onChange={(e) =>
                      setEditing((p) => ({
                        ...p,
                        metaDescription: e.target.value,
                      }))
                    }
                    placeholder={editing.body?.substring(0, 160)}
                    rows={3}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-purple-300 resize-none transition-shadow"
                  />
                  <p className="text-[9px] text-neutral-400">
                    {editing.metaDescription?.length || 0} of 320 characters
                    used
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        // ─── PAGES LIST ────────────────────────────────────────────
        <motion.div
          key="list"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2 }}
          className="space-y-6 max-w-2xl"
        >
          {/* Header */}
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                Pages
              </h2>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed max-w-sm">
                Create custom pages like About, FAQ, or Contact. Published pages
                will appear in your website navigation automatically.
              </p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest hover:bg-neutral-800 transition-all shadow-lg"
            >
              <Plus size={14} />
              ADD PAGE
            </button>
          </div>

          {/* List */}
          <div className="bg-white rounded-[2rem] border border-neutral-100 shadow-sm overflow-hidden">
            {/* Add new — always at top */}
            <button
              onClick={openNew}
              className="w-full flex items-center justify-between px-8 py-5 hover:bg-neutral-50 transition-colors border-b border-neutral-50 group"
            >
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-full px-5 py-2 text-[11px] outline-none focus:ring-1 focus:ring-purple-200"
                />
              </div>
              <div className="w-7 h-7 rounded-full bg-neutral-100 group-hover:bg-black group-hover:text-white flex items-center justify-center transition-all">
                <Plus size={13} />
              </div>
            </button>

            {pages.length === 0 ? (
              <div className="px-8 py-16 text-center">
                <FileText size={32} className="text-neutral-200 mx-auto mb-4" />
                <p className="text-[11px] text-neutral-400 font-medium">
                  No pages yet
                </p>
                <p className="text-[10px] text-neutral-300 mt-1">
                  Click above to create your first page.
                </p>
              </div>
            ) : (
              <ul>
                {pages
                  .filter((p) =>
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((page, i) => (
                    <li
                      key={page.id}
                      className={`border-b border-neutral-50 last:border-0 ${
                        i % 2 === 0 ? "" : ""
                      }`}
                    >
                      <button
                        onClick={() => openEdit(page)}
                        className="w-full flex items-center gap-4 px-8 py-5 hover:bg-neutral-50 transition-colors group text-left"
                      >
                        <GripVertical
                          size={14}
                          className="text-neutral-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-neutral-900 group-hover:text-[#A855F7] transition-colors">
                            {page.title}
                          </p>
                          <p className="text-[9px] font-mono text-neutral-400 mt-0.5">
                            /page/{page.slug}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-[8px] font-bold tracking-widest px-2.5 py-1 rounded-full ${
                              page.status === "published"
                                ? "bg-green-100 text-green-700"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {page.status === "published" ? "LIVE" : "DRAFT"}
                          </span>
                          {!page.showInNav && (
                            <span className="text-[8px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-400">
                              HIDDEN
                            </span>
                          )}
                          <ChevronRight
                            size={14}
                            className="text-neutral-300 group-hover:text-neutral-600 transition-colors"
                          />
                        </div>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {pages.length > 0 && (
            <p className="text-[10px] text-neutral-400 text-center">
              {pages.filter((p) => p.status === "published").length} of{" "}
              {pages.length} pages published
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
