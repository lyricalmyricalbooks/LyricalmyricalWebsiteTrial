import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { reviewsApi, type Review } from "../lib/reviews";
import { Star, Check, X, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ReviewsModeration() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(200)));
      setReviews(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const list = reviews.filter(r => filter === "all" || r.status === filter);

  const setStatus = async (id: string, status: Review["status"]) => {
    await reviewsApi.setStatus(id, status);
    toast.success(status);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await reviewsApi.remove(id);
    load();
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-center gap-3">
        {(["pending", "approved", "rejected", "all"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-[10px] tracking-widest uppercase font-black transition-colors ${
              filter === f ? "bg-violet-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-[10px] tracking-widest uppercase text-slate-500">{list.length} reviews</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : list.length === 0 ? (
        <p className="text-slate-500 text-sm">No reviews in this bucket.</p>
      ) : (
        <ul className="space-y-4">
          {list.map(r => (
            <li key={r.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={12} className={n <= r.rating ? "text-amber-400" : "text-white/15"} fill={n <= r.rating ? "currentColor" : "none"} />
                    ))}
                  </div>
                  <span className="text-[10px] tracking-widest uppercase text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                  <span className={`text-[9px] tracking-widest uppercase font-black px-3 py-1 rounded-full border ${
                    r.status === "approved" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                    r.status === "rejected" ? "border-rose-500/30 text-rose-400 bg-rose-500/10" :
                    "border-amber-500/30 text-amber-400 bg-amber-500/10"
                  }`}>{r.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  {r.status !== "approved" && (
                    <button onClick={() => setStatus(r.id, "approved")} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"><Check size={14} /></button>
                  )}
                  {r.status !== "rejected" && (
                    <button onClick={() => setStatus(r.id, "rejected")} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><X size={14} /></button>
                  )}
                  <button onClick={() => remove(r.id)} className="p-2 rounded-lg bg-white/5 text-slate-500 hover:text-white"><Trash2 size={14} /></button>
                </div>
              </div>
              {r.title && <h4 className="text-sm font-bold text-white mb-1">{r.title}</h4>}
              <p className="text-white/70 text-sm leading-relaxed mb-2">{r.body}</p>
              <p className="text-[10px] tracking-widest text-white/40 uppercase">— {r.authorName} · book {r.bookId}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
