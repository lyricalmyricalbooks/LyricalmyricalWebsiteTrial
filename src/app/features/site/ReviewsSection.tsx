import { useEffect, useState } from "react";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { reviewsApi, type Review } from "../../lib/reviews";

function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const interactive = !!onChange;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={size}
            className={n <= value ? "text-amber-400" : "text-white/15"}
            fill={n <= value ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewsSummary({ count, average }: { count: number; average: number }) {
  if (!count) {
    return (
      <p className="text-[9px] font-black tracking-widest text-white/30 uppercase">No reviews yet</p>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Stars value={Math.round(average)} size={14} />
      <span className="text-[10px] font-black tracking-widest text-white/60 uppercase">
        {average.toFixed(1)} · {count} review{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export default function ReviewsSection({ bookId }: { bookId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [authorName, setAuthorName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function load() {
    setLoading(true);
    try {
      const list = await reviewsApi.list(bookId);
      setReviews(list);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (bookId) load();
  }, [bookId]);

  const aggregate = reviews.length
    ? { count: reviews.length, average: reviews.reduce((a, r) => a + r.rating, 0) / reviews.length }
    : { count: 0, average: 0 };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!authorName.trim() || !body.trim()) {
      setError("Name and review body are required.");
      return;
    }
    setSubmitting(true);
    try {
      await reviewsApi.create({
        bookId,
        authorName: authorName.trim(),
        email: email.trim(),
        rating,
        title: title.trim(),
        body: body.trim(),
      });
      setSubmitted(true);
      setBody("");
      setTitle("");
      setAuthorName("");
      setEmail("");
      setRating(5);
    } catch (err: any) {
      setError(err?.message || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border-t border-white/[0.06] mt-16">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <header className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[9px] font-black tracking-[0.4em] uppercase text-white/30 mb-2">Customer Reviews</p>
            <ReviewsSummary count={aggregate.count} average={aggregate.average} />
          </div>
        </header>

        {loading ? (
          <p className="text-[10px] tracking-widest text-white/30 uppercase">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="text-white/40 text-sm mb-12">Be the first to share your thoughts on this book.</p>
        ) : (
          <ul className="space-y-8 mb-16">
            {reviews.map(r => (
              <li key={r.id} className="border-t border-white/[0.06] pt-8 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between mb-3">
                  <Stars value={r.rating} size={13} />
                  <span className="text-[9px] tracking-widest text-white/30 uppercase">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {r.title && <h4 className="text-sm font-bold text-white mb-2">{r.title}</h4>}
                <p className="text-white/70 text-sm leading-relaxed mb-3">{r.body}</p>
                <p className="text-[10px] tracking-widest text-white/40 uppercase">— {r.authorName}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="border border-white/10 rounded-3xl p-8 bg-white/[0.02]">
          {submitted ? (
            <div className="flex items-center gap-3 text-emerald-400 text-sm">
              <CheckCircle2 size={18} />
              <span>Thanks — your review has been submitted for moderation.</span>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <h3 className="text-lg font-bold tracking-tight">Write a review</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] tracking-widest uppercase text-white/40">Your rating</span>
                <Stars value={rating} onChange={setRating} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder="Name"
                  className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email (optional, not published)"
                  className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
                />
              </div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Headline (optional)"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
              />
              <textarea
                required
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="What did you think?"
                rows={4}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 resize-none"
              />
              {error && <p className="text-[11px] text-rose-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="bg-white text-black px-8 py-3 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
                Submit Review
              </button>
              <p className="text-[9px] tracking-widest text-white/30 uppercase">
                Reviews are moderated before appearing.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
