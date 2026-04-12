import { DEFAULT_BOOKS, DEFAULT_IMAGE } from "./constants";
import type { Book } from "./types";

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

export function getFilteredItems(books: Book[], activeCategory: string, nowISO: string) {
  return books.filter(
    (book) =>
      book.status === "published" &&
      (!book.scheduleDate || book.scheduleDate <= nowISO) &&
      (book.genres?.includes(activeCategory) || activeCategory === "PUBLICATIONS"),
  );
}

export function getPublishedBooks(books: Book[]) {
  return books.filter((book) => book.status === "published");
}
