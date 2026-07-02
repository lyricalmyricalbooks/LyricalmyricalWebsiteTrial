import { DEFAULT_BOOKS, DEFAULT_IMAGE } from "./constants";
import type { Book } from "./types";

const LOGO_DESIGN_FIELDS = [
  "logoUrl", "logoText", "logoColor", "logoTint", "logoHeight",
  // Two-part wordmark support (LogoMark renders these when wordmarkStyle is "two-part")
  "wordmarkStyle", "wordmarkPrimary", "wordmarkSecondary", "wordmarkSize", "wordmarkWeight", "wordmarkSecondaryMuted", "headingFont",
] as const;

function firstConfiguredValue(field: (typeof LOGO_DESIGN_FIELDS)[number], designs: any[]) {
  return designs.find((design) => design?.[field] != null)?.[field];
}

export function resolveLogoDesign(surfaceDesign: any, fallbackDesigns: any[] = []) {
  const resolvedDesign = { ...(surfaceDesign || {}) };

  for (const field of LOGO_DESIGN_FIELDS) {
    const value = firstConfiguredValue(field, [surfaceDesign, ...fallbackDesigns]);
    if (value != null) resolvedDesign[field] = value;
  }

  return resolvedDesign;
}

export function resolveLogoPosition(surfaceDesign: any, fallbackDesigns: any[] = []) {
  return [surfaceDesign, ...fallbackDesigns].find((design) => design?.logoPosition != null)?.logoPosition || "left";
}

export function getFeaturedBooks(books: Book[]) {
  const featuredBooks = books.filter((book) => book.status === "published" && book.isFeatured).slice(0, 4);
  return featuredBooks.length > 0 ? featuredBooks : DEFAULT_BOOKS.slice(0, 4);
}

export function getPublications(books: Book[]) {
  return books.map((book) => ({
    title: book.title.toUpperCase(),
    image: book.photos?.[0]?.url || DEFAULT_IMAGE,
  }));
}

export function getFilteredItems(books: Book[], activeCategory: any, nowISO: string) {
  const categoryName = typeof activeCategory === "string" ? activeCategory : activeCategory?.name;
  return books.filter(
    (book) =>
      book.status === "published" &&
      (!book.scheduleDate || book.scheduleDate <= nowISO) &&
      (book.categories?.includes(categoryName) || categoryName === "PUBLICATIONS"),
  );
}

export function getPublishedBooks(books: Book[]) {
  return books.filter((book) => book.status === "published");
}
