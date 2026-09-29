import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Check, Star, Trash2, X } from "lucide-react";
import { db } from "../../lib/firebase";
import { reviewsApi, type Review } from "../lib/reviews";
import {
  Checkbox, ConfirmDialog, EmptyState, ErrorState, IconButton, LoadingState, SecondaryButton,
  SectionCard, StatusBadge, Tabs, ToastProvider, useRisoToast, type BadgeTone,
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

  async function load() {
    setLoading(true); setError(false);
    try {
      const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(200)));
      setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch { setError(true); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
    all: reviews.length,
  }), [reviews]);
  const list = reviews.filter((r) => filter === "all" || r.status === filter);
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

  const bulk = [...selected];

  return (
    <div className="rp-stack">
      <div className="rp-filter-bar">
        <Tabs<Filter> label="Review status" value={filter} onChange={(f) => { setFilter(f); setSelected(new Set()); }}
          tabs={(["pending", "approved", "rejected", "all"] as const).map((f) => ({ id: f, label: f[0].toUpperCase() + f.slice(1), count: counts[f] }))} />
      </div>

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
                        <p className="rp-hint" style={{ margin: 0 }}>{r.authorName}{r.email ? ` · ${r.email}` : ""} · Book <span className="rp-mono">{r.bookId}</span></p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
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
