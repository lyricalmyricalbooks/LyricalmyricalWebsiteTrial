import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import { adminApi } from "./api";
import type { Page } from "../features/site/types";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import toast from "react-hot-toast";
import {
  ConfirmDialog, DataTable, DestructiveButton, EmptyState, ErrorState, FilterBar, LoadingState, MetricCard,
  PrimaryButton, SaveBar, SearchField, SecondaryButton, SectionCard, StatusBadge, TextArea, TextField, Toggle,
  type Column,
} from "./riso/components";

function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Sub-path safe public URL for a custom page. */
const publicUrl = (slug?: string) =>
  `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/page/${slug || ""}`;

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "blockquote", "code-block"],
    ["clean"],
  ],
};

export function PagesManager() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Partial<Page> | null>(null);
  const [original, setOriginal] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirm, setConfirm] = useState<null | "delete" | "leave">(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = !!editing && JSON.stringify(editing) !== original;

  useEffect(() => { load(); }, []);

  // Live preview channel used by the storefront preview (unchanged behaviour).
  useEffect(() => {
    if (!editing) return;
    const update = { type: "PAGE_PREVIEW_UPDATE", page: { ...editing, id: editing.id || "new-page-preview" } };
    window.parent.postMessage(update, "*");
    try {
      const bc = new BroadcastChannel("site_preview_updates");
      bc.postMessage(update);
      bc.close();
    } catch (_) { /* BroadcastChannel unavailable */ }
  }, [editing]);

  // Unsaved-change protection for tab close / reload.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function load() {
    setLoading(true); setFailed(false);
    try { setPages(await adminApi.getPages()); } catch { setFailed(true); } finally { setLoading(false); }
  }

  function open(page: Partial<Page>, fresh: boolean) {
    setEditing(page);
    setOriginal(JSON.stringify(page));
    setIsNew(fresh);
    setSlugEdited(!fresh);
    setErrors({});
  }

  const openNew = () => open({ title: "", slug: "", body: "", status: "published", showInNav: true, order: pages.length, seoTitle: "", metaDescription: "" }, true);

  function handleTitleChange(val: string) {
    setEditing((prev) => ({ ...prev, title: val, slug: slugEdited ? prev!.slug : toSlug(val) }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!editing?.title?.trim()) e.title = "Give the page a title.";
    if (!editing?.slug?.trim()) e.slug = "A URL slug is required.";
    else if (pages.some(p => p.slug === editing.slug && p.id !== editing.id)) e.slug = "Another page already uses this slug.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!editing || !validate()) return;
    setSaving(true);
    try {
      let next: Partial<Page>;
      if (isNew) {
        const created = await adminApi.createPage(editing);
        setPages((prev) => [...prev, created]);
        next = created;
        setIsNew(false);
      } else {
        const updated = await adminApi.updatePage(editing.id!, editing);
        setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        next = updated;
      }
      setEditing(next);
      setOriginal(JSON.stringify(next));
      toast.success("Page saved");
    } catch (err: any) {
      toast.error(err?.message || "Could not save the page");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing?.id || isNew) return;
    setConfirm(null);
    try {
      await adminApi.deletePage(editing.id);
      setPages((prev) => prev.filter((p) => p.id !== editing.id));
      setEditing(null);
      toast.success("Page deleted");
    } catch {
      toast.error("Could not delete the page");
    }
  }

  const back = () => (dirty ? setConfirm("leave") : setEditing(null));

  const rows = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return pages
      .filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [pages, searchQuery]);

  const columns: Column<Page>[] = [
    { key: "title", header: "Page", lead: true, render: (p) => (
      <div style={{ minWidth: 200 }}>
        <button type="button" onClick={() => open({ ...p }, false)} aria-label={`Edit ${p.title}`}
          style={{ all: "unset", cursor: "pointer", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3, overflowWrap: "anywhere" }}>{p.title}</button>
        <div className="rp-hint rp-mono">/page/{p.slug}</div>
      </div>
    ) },
    { key: "status", header: "Status", render: (p) => <StatusBadge tone={p.status === "published" ? "success" : "neutral"}>{p.status === "published" ? "Published" : "Draft"}</StatusBadge> },
    { key: "nav", header: "In menu", render: (p) => <StatusBadge tone={p.showInNav ? "info" : "neutral"}>{p.showInNav ? "Shown" : "Hidden"}</StatusBadge> },
    { key: "seo", header: "SEO", render: (p) => (p.seoTitle || p.metaDescription) ? <StatusBadge tone="success">Set</StatusBadge> : <StatusBadge tone="warning">Missing</StatusBadge> },
    { key: "actions", header: "Actions", render: (p) => (
      <span style={{ display: "inline-flex", gap: 8 }}>
        <SecondaryButton size="sm" onClick={() => open({ ...p }, false)}>Edit</SecondaryButton>
        {p.status === "published" && <a className="rp-btn rp-btn-secondary rp-btn-sm" href={publicUrl(p.slug)} target="_blank" rel="noreferrer">View <ExternalLink size={12} aria-hidden /></a>}
      </span>
    ) },
  ];

  if (loading) return <LoadingState label="Loading pages…" />;
  if (failed) return <ErrorState description="Your pages could not be loaded." onRetry={load} />;

  // ─── Editor ───────────────────────────────────────────────────────────────
  if (editing) {
    const slug = editing.slug || "handle";
    return (
      <div className="rp-stack">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
          <SecondaryButton icon={<ArrowLeft size={16} aria-hidden />} onClick={back}>Back to pages</SecondaryButton>
          {editing.id && !isNew && (
            <a className="rp-btn rp-btn-secondary" href={publicUrl(editing.slug)} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden /> Preview live page
            </a>
          )}
        </div>

        <div className="rp-split">
          <div className="rp-stack" style={{ minWidth: 0 }}>
            <SectionCard title={isNew ? "New page" : "Content"} description="Title, address and body.">
              <div className="rp-stack" style={{ gap: 20 }}>
                <TextField label="Page title" value={editing.title || ""} placeholder="e.g. About the press" error={errors.title}
                  onChange={(e) => handleTitleChange(e.target.value)} />
                <TextField label="URL slug" value={editing.slug || ""} placeholder="page-url-slug" error={errors.slug}
                  hint={`Public address: ${publicUrl(editing.slug || "…")}`} style={{ fontFamily: "var(--rp-font-mono)" }}
                  onChange={(e) => { setSlugEdited(true); setEditing((p) => ({ ...p, slug: toSlug(e.target.value) })); }} />
                <div className="rp-field">
                  <span className="rp-label" id="page-body-label">Body</span>
                  <div className="rp-quill" aria-labelledby="page-body-label">
                    <ReactQuill theme="snow" value={editing.body || ""} onChange={(val) => setEditing((p) => ({ ...p, body: val }))}
                      placeholder="Write your page content here…" modules={QUILL_MODULES} />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Search preview" description="How this page may appear in search results.">
              <div className="rp-card" style={{ padding: 16, boxShadow: "none", background: "var(--rp-surface-sunken)" }} aria-label="Search result preview">
                <div className="rp-mono" style={{ color: "var(--rp-text-subtle)", overflowWrap: "anywhere" }}>{publicUrl(slug)}</div>
                <div style={{ color: "var(--rp-info)", fontSize: "var(--rp-text-lg)", fontWeight: 600, margin: "4px 0" }}>
                  {editing.seoTitle || editing.title || "Page title preview"}
                </div>
                <div style={{ color: "var(--rp-text-muted)" }}>
                  {editing.metaDescription || "Add a meta description to control the summary shown in search results (around 160 characters)."}
                </div>
              </div>
              <div className="rp-stack" style={{ gap: 16, marginTop: 16 }}>
                <TextField label="SEO title" value={editing.seoTitle || ""} placeholder={editing.title}
                  onChange={(e) => setEditing((p) => ({ ...p, seoTitle: e.target.value }))} />
                <TextArea label="Meta description" rows={3} value={editing.metaDescription || ""} maxLength={320}
                  hint={`${editing.metaDescription?.length || 0} / 320 characters`} placeholder="A brief summary for search engines…"
                  onChange={(e) => setEditing((p) => ({ ...p, metaDescription: e.target.value }))} />
              </div>
            </SectionCard>
          </div>

          <div className="rp-stack" style={{ minWidth: 0 }}>
            <SectionCard title="Visibility">
              <div style={{ display: "grid", gap: 4 }}>
                <Toggle label="Published" checked={editing.status === "published"} onChange={(v) => setEditing((p) => ({ ...p!, status: v ? "published" : "draft" }))} />
                <p className="rp-hint" style={{ margin: "0 0 8px" }}>Drafts are hidden from the storefront.</p>
                <Toggle label="Show in navigation menu" checked={editing.showInNav ?? true} onChange={(v) => setEditing((p) => ({ ...p!, showInNav: v }))} />
              </div>
            </SectionCard>

            <SectionCard title="Page sections" description="Each published page gets its own section stack in the theme editor.">
              <p className="rp-hint" style={{ margin: 0 }}>
                To add banners, galleries or other sections, open Settings → Design, then choose this page in the template selector.
              </p>
            </SectionCard>

            {!isNew && (
              <SectionCard title="Danger zone" description="Deleting a page cannot be undone.">
                <DestructiveButton onClick={() => setConfirm("delete")}>Delete page</DestructiveButton>
              </SectionCard>
            )}
          </div>
        </div>

        <SaveBar dirty={dirty || isNew} saving={saving} onSave={handleSave}
          message={isNew ? "This page hasn't been created yet." : "You have unsaved changes."}
          onDiscard={() => { if (isNew) setEditing(null); else { setEditing(JSON.parse(original)); setErrors({}); } }} />

        <ConfirmDialog open={confirm === "delete"} title="Delete this page?" confirmLabel="Delete page"
          message={`“${editing.title}” will be removed from the storefront and its menu. This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setConfirm(null)} />
        <ConfirmDialog open={confirm === "leave"} title="Discard unsaved changes?" confirmLabel="Discard changes"
          message="You have edits that haven't been saved. Leaving now will lose them."
          onConfirm={() => { setConfirm(null); setEditing(null); }} onCancel={() => setConfirm(null)} />
      </div>
    );
  }

  // ─── List ─────────────────────────────────────────────────────────────────
  const published = pages.filter((p) => p.status === "published").length;
  return (
    <div className="rp-stack">
      <div className="rp-kpi-grid">
        <MetricCard label="Published" value={published} footer={`of ${pages.length} pages`} />
        <MetricCard label="In menu" value={pages.filter(p => p.showInNav && p.status === "published").length} footer="Visible in navigation" />
      </div>
      {pages.length === 0 ? (
        <SectionCard>
          <EmptyState icon="📄" title="No pages yet" description="Create an About, Shipping or Journal page — it can appear in your storefront menu."
            action={<PrimaryButton icon={<Plus size={16} aria-hidden />} onClick={openNew}>New page</PrimaryButton>} />
        </SectionCard>
      ) : (
        <>
          <FilterBar>
            <div className="rp-grow"><SearchField label="Search pages" placeholder="Search by title or slug…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            <PrimaryButton icon={<Plus size={16} aria-hidden />} onClick={openNew}>New page</PrimaryButton>
          </FilterBar>
          <SectionCard flush title="Pages" description={`${rows.length} of ${pages.length}`}>
            <DataTable caption="Custom pages" columns={columns} rows={rows} rowKey={(p) => p.id}
              empty={<EmptyState title="No pages match" description="Try a different search." action={<SecondaryButton onClick={() => setSearchQuery("")}>Clear search</SecondaryButton>} />} />
          </SectionCard>
        </>
      )}
    </div>
  );
}
