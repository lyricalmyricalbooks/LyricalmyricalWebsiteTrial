import { useMemo } from "react";
import { Link } from "react-router";
import { useRecentlyViewed } from "../../lib/recentlyViewed";
import { useSiteData } from "./useSiteData";
import { DEFAULT_IMAGE } from "./constants";

export default function RecentlyViewedRow({ excludeId }: { excludeId?: string }) {
  const { ids } = useRecentlyViewed();
  const { books } = useSiteData();

  // ⚡ Bolt: Cache books by ID for O(1) lookups during recently viewed iteration
  // Measured impact: Eliminates O(N*M) complexity when finding recently viewed books.
  const booksMap = useMemo(() => {
    return new Map((books || []).map(b => [b.id, b]));
  }, [books]);

  const items = ids
    .filter(id => id !== excludeId)
    .map(id => booksMap.get(id))
    .filter(Boolean)
    .slice(0, 6) as any[];

  if (items.length === 0) return null;

  return (
    <section className="border-t border-white/[0.06]">
      <div className="max-w-8xl mx-auto px-6 py-14">
        <div className="flex items-center gap-6 mb-8">
          <h2 className="text-[10px] font-black tracking-[0.5em] text-white/30 uppercase">
            Recently Viewed
          </h2>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-5">
          {items.map(book => {
            const slug = book.slug || book.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return (
              <Link key={book.id} to={`/books/${slug}`} className="group">
                <div className="relative aspect-[3/4] fm-surface rounded-xl overflow-hidden border border-white/[0.05]">
                  <img
                    src={book.photos?.[0]?.url || DEFAULT_IMAGE}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <p className="mt-2 text-[9px] font-black tracking-widest uppercase text-white/40 group-hover:text-white/80 transition-colors leading-tight">
                  {book.title}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
