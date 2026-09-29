// Review summary + filtering for the moderation page. Pure.
export interface ReviewStats { total: number; average: number; approvedAverage: number; lowPending: number; unanswered: number; distribution: number[] }

export function reviewStats(reviews: any[]): ReviewStats {
  const rated = reviews.filter((r) => Number(r.rating) >= 1);
  const approved = rated.filter((r) => r.status === "approved");
  const avg = (l: any[]) => (l.length ? l.reduce((s, r) => s + Number(r.rating), 0) / l.length : 0);
  const distribution = [1, 2, 3, 4, 5].map((n) => rated.filter((r) => Math.round(Number(r.rating)) === n).length);
  return {
    total: reviews.length,
    average: avg(rated),
    approvedAverage: avg(approved),
    lowPending: reviews.filter((r) => r.status === "pending" && Number(r.rating) <= 2).length,
    unanswered: reviews.filter((r) => r.status === "approved" && !r.reply?.body).length,
    distribution,
  };
}

export function filterReviews(reviews: any[], opts: { status: string; rating: string; q: string; titles: Record<string, string> }) {
  const q = opts.q.trim().toLowerCase();
  return reviews.filter((r) => {
    if (opts.status !== "all" && r.status !== opts.status) return false;
    if (opts.rating !== "all" && Math.round(Number(r.rating)) !== Number(opts.rating)) return false;
    if (!q) return true;
    return `${r.authorName || ""} ${r.email || ""} ${r.title || ""} ${r.body || ""} ${opts.titles[r.bookId] || ""}`.toLowerCase().includes(q);
  });
}
