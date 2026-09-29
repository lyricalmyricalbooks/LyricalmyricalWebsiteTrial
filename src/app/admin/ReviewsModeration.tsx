import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Check, MessageSquare, Star, Trash2, X } from "lucide-react";
import { adminApi } from "./api";
import { filterReviews, reviewStats } from "./reviewInsights";
import { db } from "../../lib/firebase";
import { reviewsApi, type Review } from "../lib/reviews";
import {
  Checkbox, ConfirmDialog, Dialog, EmptyState, ErrorState, FilterBar, IconButton, LoadingState, MetricCard, PrimaryButton,
  SearchField, SecondaryButton, SectionCard, SelectField, StatusBadge, Tabs, TextArea, ToastProvider, useRisoToast, type BadgeTone,
} from "./riso/components";

type Filter = "pending" | "approved" | "rejected" | "all";
const TONE: Record<Review["status"], BadgeTone> = { approved: "success", rejected: "danger", pending: "warning" };

function Stars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} aria-hidden style={{ color: n <= rating ? "var(--rp-warning)" : "var(--rp-border)" }}
          fill={n <= rating ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

function Queue() {
  const toast = useRisoToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [q, setQ] = useState("");
  const [rating, setRating] = useState("all");
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");

  async function load() {
    setLoading(true); setError(false);
    try {
      const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(200)));
      setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch { setError(true); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  // Book titles are a nicety: if they fail to load, fall back to the raw book ID.
  useEffect(() => {
    adminApi.getBooks(500).then((bs: any[]) => setTitles(Object.fromEntries(bs.map((b) => [b.id, b.title || b.id])))).catch(() => {});
  }, []);
  const stats = useMemo(() => reviewStats(reviews), [reviews]);

  const counts = useMemo(() => ({
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
    all: reviews.length,
  }), [reviews]);
  const list = useMemo(() => filterReviews(reviews, { status: filter, rating, q, titles }), [reviews, filter, rating, q, titles]);
  const allSelected = list.length > 0 && list.every((r) => selected.has(r.id));

  const moderate = async (ids: string[], status: Review["status"]) => {
    const previous = new Map(reviews.filter((r) => ids.includes(r.id)).map((r) => [r.id, r.status]));
    try {
      await Promise.all(ids.map((id) => reviewsApi.setStatus(id, status)));
    } catch { toast("Could not update the review. Please try again."); return; }
    setSelected(new Set());
    toast(`${ids.length} review${ids.length === 1 ? "" : "s"} ${status}`, {
      actionLabel: "Undo",
      onAction: async () => {
        await Promise.all(ids.map((id) => reviewsApi.setStatus(id, previous.get(id) || "pending")));
        load();
      },
    });
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    try { await reviewsApi.remove(id); toast("Review deleted"); } catch { toast("Could not delete the review."); }
    load();
  };

  const saveReply = async () => {
    if (!replying) return;
    const id = replying.id;
    setReplying(null);
    try { await reviewsApi.setReply(id, replyText); toast(replyText.trim() ? "Reply published" : "Reply removed"); }
    catch { toast("Could not save the reply."); }
    load();
  };

  const bulk = [...selected];

  return (
    <div className="rp-stack">
      <div className="rp-kpi-grid">
        <MetricCard label="Average rating" value={stats.average ? `${stats.average.toFixed(1)} ★` : "—"} footer={`${stats.total} review${stats.total === 1 ? "" : "s"} · ${stats.approvedAverage ? stats.approvedAverage.toFixed(1) : "—"} approved only`} />
        <MetricCard label="Low-rated pending" value={stats.lowPending} tone={stats.lowPending ? "warn" : undefined} footer="1–2 stars awaiting a decision" />
        <MetricCard label="Awaiting a reply" value={stats.unanswered} footer="Approved with no owner reply" />
      </div>
      <div className="rp-filter-bar">
        <Tabs<Filter> label="Review status" value={filter} onChange={(f) => { setFilter(f); setSelected(new Set()); }}
          tabs={(["pending", "approved", "rejected", "all"] as const).map((f) => ({ id: f, label: f[0].toUpperCase() + f.slice(1), count: counts[f] }))} />
      </div>

      <FilterBar>
        <div className="rp-grow"><SearchField label="Search reviews" placeholder="Search reviewer, book or text…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <SelectField label="Rating" hideLabel value={rating} onChange={(e) => setRating(e.target.value)}>
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>)}
        </SelectField>
      </FilterBar>

      <SectionCard flush title="Moderation queue" description={`${list.length} review${list.length === 1 ? "" : "s"} in this view`}
        actions={list.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Checkbox label="Select all" checked={allSelected}
              onChange={(e) => setSelected(e.target.checked ? new Set(list.map((r) => r.id)) : new Set())} />
            <SecondaryButton size="sm" disabled={!bulk.length} onClick={() => moderate(bulk, "approved")}>Approve selected</SecondaryButton>
            <SecondaryButton size="sm" disabled={!bulk.length} onClick={() => moderate(bulk, "rejected")}>Reject selected</SecondaryButton>
          </div>
        )}>
        {loading ? <LoadingState label="Loading reviews…" />
          : error ? <ErrorState description="Reviews could not be loaded." onRetry={load} />
          : list.length === 0 ? (
            <EmptyState title={filter === "pending" ? "Queue is clear" : "No reviews here"}
              description={filter === "pending" ? "New customer reviews will appear here for approval." : "Nothing matches this status yet."} />
          ) : (
            <ul className="rp-list" aria-label="Reviews">
              {list.map((r) => (
                <li key={r.id}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 12, minWidth: 0, flex: "1 1 320px" }}>
                      <Checkbox label="" aria-label={`Select review by ${r.authorName}`} checked={selected.has(r.id)}
                        onChange={(e) => setSelected((s) => { const n = new Set(s); e.target.checked ? n.add(r.id) : n.delete(r.id); return n; })} />
                      <div style={{ minWidth: 0 }}>
                        <div className="rp-row-meta" style={{ marginBottom: 8 }}>
                          <Stars rating={r.rating} />
                          <StatusBadge tone={TONE[r.status]}>{r.status}</StatusBadge>
                          <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString()}</time>
                        </div>
                        {r.title && <h3 style={{ margin: "0 0 4px", fontSize: "var(--rp-text-base)", fontWeight: 600 }}>{r.title}</h3>}
                        <p style={{ margin: "0 0 8px", lineHeight: 1.55, overflowWrap: "anywhere" }}>{r.body}</p>
                        <p className="rp-hint" style={{ margin: 0 }}>{r.authorName}{r.email ? ` · ${r.email}` : ""} · Book <span className="rp-mono">{titles[r.bookId] || r.bookId}</span></p>
                        {r.reply?.body && <p className="rp-hint" style={{ margin: "8px 0 0", borderLeft: "2px solid var(--rp-border-strong)", paddingLeft: 8 }}>Your reply: {r.reply.body}</p>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <IconButton label={`${r.reply?.body ? "Edit reply to" : "Reply to"} review by ${r.authorName}`} onClick={() => { setReplying(r); setReplyText(r.reply?.body || ""); }}><MessageSquare size={18} aria-hidden /></IconButton>
                      {r.status !== "approved" && <IconButton tone="success" label={`Approve review by ${r.authorName}`} onClick={() => moderate([r.id], "approved")}><Check size={18} aria-hidden /></IconButton>}
                      {r.status !== "rejected" && <IconButton tone="danger" label={`Reject review by ${r.authorName}`} onClick={() => moderate([r.id], "rejected")}><X size={18} aria-hidden /></IconButton>}
                      <IconButton tone="danger" label={`Delete review by ${r.authorName}`} onClick={() => setDeleting(r)}><Trash2 size={18} aria-hidden /></IconButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </SectionCard>

      <Dialog open={!!replying} onClose={() => setReplying(null)} title="Reply publicly" description="Shown under the review on the book page once the review is approved. Leave empty to remove your reply."
        footer={<><SecondaryButton onClick={() => setReplying(null)}>Cancel</SecondaryButton><PrimaryButton onClick={saveReply}>Save reply</PrimaryButton></>}>
        <TextArea label="Your reply" rows={4} maxLength={1000} value={replyText} onChange={(e) => setReplyText(e.target.value)} />
      </Dialog>

      <ConfirmDialog open={!!deleting} title="Delete this review?" confirmLabel="Delete review"
        message="This permanently removes the review. Reject it instead if you may want to reverse the decision."
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}

export default function ReviewsModeration() {
  // Own provider: keeps the module usable wherever it is mounted.
  return <ToastProvider><Queue /></ToastProvider>;
}
