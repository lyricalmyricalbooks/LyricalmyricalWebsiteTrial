import type { Book } from "./types";
import { isPlaceholderCatalogRecord } from "./catalogQuality.mjs";

/** Saved selections are intentional: an empty array means no recommendations. */
export function recommendedBooks(book: any, catalog: Book[], limit = 4): Book[] {
  const eligible = (candidate: Book) => candidate.id !== book?.id && candidate.status === "published"
    && !isPlaceholderCatalogRecord(candidate);
  const published = catalog.filter(eligible);
  if (Array.isArray(book?.relatedBookIds)) {
    return [...new Set<string>(book.relatedBookIds)].flatMap(id => {
      const found = published.find(b => b.id === id);
      return found ? [found] : [];
    }).slice(0, limit);
  }
  const categories = book?.categories || book?.genres || [];
  const same = published.filter(b => ((b as any).categories || (b as any).genres || []).some((c: string) => categories.includes(c)));
  return [...same, ...published.filter(b => !same.includes(b))].slice(0, limit);
}
export function editionFacts(book: any): { key: string; value: string }[] {
  return [
    { key: "specEdition", value: book?.edition },
    { key: "specPages", value: Number(book?.pageCount) > 0 ? String(book.pageCount) : undefined },
    { key: "specPublisher", value: book?.publisher },
    { key: "specPublished", value: book?.publishDate },
  ].flatMap(row => typeof row.value === "string" && row.value.trim().length > 0 ? [{ key: row.key, value: row.value }] : []);
}
