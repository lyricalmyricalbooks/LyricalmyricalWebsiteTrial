import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Heart } from "lucide-react";
import { useSiteData } from "./useSiteData";
import { placeholderImage } from "./constants";
import { CatalogControls, applyCatalogControls, appliedFilters, filterView, EMPTY_FILTERS, type CatalogFilterState, type SortKey } from "./CatalogControls";
import { useWishlist } from "../../lib/wishlist";
import { useSEO } from "../../lib/seo";
import { funnelApi } from "../../lib/commerce";
import { useCurrency } from "../../CurrencyContext";
import { StorefrontThemeStyle } from "./StorefrontThemeStyle";
import { getCopy } from "./storeCopy";
import { bookInCategory, categoryNames, catName } from "./navItems";
import { TemplateSections, GlobalSections } from "../../components/sectionRender";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { books, settings, loading } = useSiteData();
  const { has, toggle } = useWishlist();
  const { formatBookPrice, convertPrice } = useCurrency();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_FILTERS);

  const categories = settings?.design?.categories || [];
  // A collection URL keeps working after a category is renamed: match the slug
  // against the current name and any earlier name.
  const category = useMemo(
    () =>
      (categories || []).find((c: any) => categoryNames(c).some((n: string) => slugify(n) === slug)) ||
      (slug || "").toUpperCase(),
    [categories, slug],
  );
  const categoryName = catName(category);

  const base = useMemo(() => books.filter(b => b.status === "published" && bookInCategory(b, category, categories)), [books, category, categories]);
  const view = useMemo(() => filterView(base), [base]);
  const rate = convertPrice(1);
  const items = useMemo(() => {
    const applied = appliedFilters(filters, view, rate);
    return applyCatalogControls(base, query, sort, inStockOnly, applied.priceRange, applied.formats);
  }, [base, view, rate, filters, query, sort, inStockOnly]);

  useSEO({
    title: getCopy(settings?.design, "seoCollectionTitle", { category: categoryName }),
    description: getCopy(settings?.design, "seoCollectionDescription", { category: categoryName.toLowerCase() }),
    type: "website",
  });

  useEffect(() => {
    if (categoryName) {
      funnelApi.trackCategory(categoryName);
    }
  }, [categoryName]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("preview=true")) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    }
  }, [slug]);

  if (loading) {
    return (
      <div data-fm-store data-studio-target="copy:Collection & wishlist pages|style:catalog" data-studio-label="Collection page" className="min-h-screen fm-page text-white flex items-center justify-center">
        <StorefrontThemeStyle design={settings?.design} />
        <p className="text-[10px] tracking-[0.4em] text-white/40 uppercase">{getCopy(settings?.design, "pageLoading")}</p>
      </div>
    );
  }

  return (
    <div data-fm-store data-studio-target="copy:Collection & wishlist pages|style:catalog" data-studio-label="Collection page" className="min-h-screen fm-page text-white">
      <StorefrontThemeStyle design={settings?.design} />
      <header className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/50 hover:text-white uppercase">
          <ArrowLeft size={14} /> {getCopy(settings?.design, "collectionBack")}
        </Link>
        <span className="text-[10px] tracking-[0.4em] text-white/40 uppercase">{getCopy(settings?.design, "collectionEyebrow")}</span>
        <Link to="/wishlist" className="text-[10px] tracking-[0.3em] text-white/50 hover:text-white uppercase">
          {getCopy(settings?.design, "wishlistTitle")}
        </Link>
      </header>

      <TemplateSections design={settings?.design} templateId="collectionPage" books={books} />

      <main className="max-w-6xl mx-auto px-6 py-14">
        {(settings?.design as any)?.showBreadcrumbs !== false && (
        <nav aria-label={getCopy(settings?.design, "breadcrumbAria")} className="mb-8 text-[10px] tracking-[0.3em] uppercase text-white/30 flex gap-2">
          <Link to="/" className="hover:text-white">{getCopy(settings?.design, "breadcrumbHome")}</Link>
          <span>/</span>
          <span>{getCopy(settings?.design, "breadcrumbCollections")}</span>
          <span>/</span>
          <span className="text-white/70">{categoryName}</span>
        </nav>
        )}
        <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase mb-10">{categoryName}</h1>

        {(settings?.design as any)?.showCatalogControls !== false && (
        <CatalogControls
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          inStockOnly={inStockOnly}
          setInStockOnly={setInStockOnly}
          resultCount={items.length}
          design={settings?.design}
          filters={filters}
          setFilters={setFilters}
          availableFormats={view.availableFormats}
          showPrice={view.showPrice}
        />
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {items.map(book => {
            const bSlug = (book as any).slug || slugify(book.title);
            const out = ((book as any).stockLevel ?? 999) === 0;
            const wished = has(book.id);
            return (
              <article key={book.id} className="group relative">
                <button
                  onClick={() => toggle(book.id)}
                  aria-label={wished ? getCopy(settings?.design, "wishlistRemoveAria") : getCopy(settings?.design, "wishlistAddAria")}
                  className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
                    wished ? "fm-favorite-active border" : "bg-black/40 text-white/60 border border-white/10 hover:text-white"
                  }`}
                >
                  <Heart size={14} fill={wished ? "currentColor" : "none"} />
                </button>
                <Link to={`/books/${bSlug}`} className="block">
                  <div className="relative aspect-[3/4] fm-surface rounded-2xl overflow-hidden mb-3 border border-white/[0.05]">
                    <img loading="lazy" decoding="async"
                      src={(book as any).photos?.[0]?.url || placeholderImage(settings?.design)}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {out && (
                      <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                        <span className="text-white/60 text-[8px] tracking-widest uppercase border border-white/20 px-3 py-1">{getCopy(settings?.design, "soldOutLabel")}</span>
                      </div>
                    )}
                  </div>
                  <div data-studio-target="style:products" data-studio-label="Card title & price">
                    <h3 className="fm-card-title text-[11px] tracking-widest uppercase text-white/80">{book.title}</h3>
                    {book.retailPrice ? (
                      <p className="fm-card-price-wrap fm-card-price text-[10px] text-white/40 mt-1">{formatBookPrice(book)}</p>
                    ) : null}
                  </div>
                </Link>
              </article>
            );
          })}
        </div>

        {items.length === 0 && (
          <p className="py-20 text-center text-[10px] tracking-[0.4em] text-white/30 uppercase">
            {getCopy(settings?.design, "catalogEmpty")}
          </p>
        )}
      </main>

      <GlobalSections design={settings?.design} books={books} />
    </div>
  );
}
