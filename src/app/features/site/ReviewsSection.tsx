import { regionProps } from "./storefrontRegions";
import { useEffect, useState } from "react";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { reviewsApi, type Review } from "../../lib/reviews";
import { useSiteData } from "./useSiteData";
import { getCopy } from "./storeCopy";

function Stars({ value, onChange, size = 16, design }: { value: number; onChange?: (v: number) => void; size?: number; design?: any }) {
  const interactive = !!onChange;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          aria-label={getCopy(design, n > 1 ? "reviewsStarMany" : "reviewsStarOne", { n })}
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
  const { settings } = useSiteData();
  const c = (k: string, v?: Record<string, string | number>) => getCopy(settings?.design, k, v);
  if (!count) {
    return (
      <p className="text-[9px] font-black tracking-widest text-white/30 uppercase">{c("reviewsNone")}</p>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Stars value={Math.round(average)} size={14} design={settings?.design} />
      <span className="text-[10px] font-black tracking-widest text-white/60 uppercase">
        {average.toFixed(1)} · {c(count === 1 ? "reviewsCountOne" : "reviewsCountMany", { count })}
      </span>
    </div>
  );
}

export default function ReviewsSection({ bookId, hideHeader = false }: { bookId: string; hideHeader?: boolean }) {
  const { settings } = useSiteData();
  const c = (k: string, v?: Record<string, string | number>) => getCopy(settings?.design, k, v);
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
      setError(c("reviewsErrRequired"));
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
      setError(c("reviewsError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={hideHeader ? "w-full" : "border-t border-white/[0.06] mt-16"}>
      <div className={hideHeader ? "w-full" : "max-w-4xl mx-auto px-6 py-16"}>
        {!hideHeader && (
          <header {...regionProps("reviewsHeading")} className="flex items-center justify-between mb-10">
            <div>
              <p className="text-[9px] font-black tracking-[0.4em] uppercase text-white/30 mb-2">{c("reviewsHeading")}</p>
              <ReviewsSummary count={aggregate.count} average={aggregate.average} />
            </div>
          </header>
        )}

        {loading ? (
          <p {...regionProps("reviewsEmpty")} className="text-[10px] tracking-widest text-white/30 uppercase">{c("reviewsLoading")}</p>
        ) : reviews.length === 0 ? (
          <p {...regionProps("reviewsEmpty")} className="text-white/40 text-sm mb-12">{c("reviewsEmpty")}</p>
        ) : (
          <ul {...regionProps("reviewsList")} className="space-y-8 mb-16">
            {reviews.map(r => (
              <li key={r.id} className="border-t border-white/[0.06] pt-8 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between mb-3">
                  <Stars value={r.rating} size={13} design={settings?.design} />
                  <span {...regionProps("reviewsDate")} className="text-[9px] tracking-widest text-white/30 uppercase">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {r.title && <h4 {...regionProps("reviewsTitle")} className="text-sm font-bold text-white mb-2">{r.title}</h4>}
                <p {...regionProps("reviewsBody")} className="text-white/70 text-sm leading-relaxed mb-3">{r.body}</p>
                <p {...regionProps("reviewsAuthor")} className="text-[10px] tracking-widest text-white/40 uppercase">{c("reviewsAuthor", { author: r.authorName })}</p>
                {r.reply?.body && (
                  <div {...regionProps("reviewsReply")} className="mt-4 border-l-2 border-white/20 pl-3">
                    <p className="text-[10px] tracking-widest text-white/50 uppercase mb-1">{c("reviewsReply")}</p>
                    <p className="text-white/70 text-sm leading-relaxed">{r.reply.body}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div {...regionProps("reviewsForm")} className="border border-white/10 rounded-3xl p-8 bg-white/[0.02]">
          {submitted ? (
            <div className="flex items-center gap-3 text-sm" style={{ color: "var(--success)" }}>
              <CheckCircle2 size={18} />
              <span>{c("reviewsThanks")}</span>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <h3 className="text-lg font-bold tracking-tight">{c("reviewsWrite")}</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] tracking-widest uppercase text-white/40">{c("reviewsRating")}</span>
                <Stars value={rating} onChange={setRating} design={settings?.design} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder={c("reviewsName")}
                  className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--muted)] outline-none focus:border-white/30"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={c("reviewsEmail")}
                  className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--muted)] outline-none focus:border-white/30"
                />
              </div>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={c("reviewsHeadline")}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--muted)] outline-none focus:border-white/30"
              />
              <textarea
                required
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={c("reviewsBody")}
                rows={4}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--muted)] outline-none focus:border-white/30 resize-none"
              />
              {error && <p className="text-[11px] text-rose-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="fm-active px-8 py-3 rounded-full text-[10px] tracking-[0.3em] font-bold uppercase hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
                {c("reviewsSubmit")}
              </button>
              <p {...regionProps("reviewsGuidance")} className="text-[9px] tracking-widest text-white/30 uppercase">
                {c("reviewsModerated")}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
