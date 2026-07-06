// ─────────────────────────────────────────────────────────────────────────────
// Staff Notes table — pure row resolution for StaffNotesTableSection.
//
// Blocks reference books by slug ({ slug, note }); when no blocks are
// configured the table falls back to the first N books (note = subtitle).
// Kept free of React/DOM imports so it is unit-testable.
// ─────────────────────────────────────────────────────────────────────────────

export const bookSlug = (book: any): string | undefined =>
  book?.slug || book?.title?.toLowerCase?.().replace(/[^a-z0-9]+/g, "-");

export type StaffNoteRow = { book: any; note: string };

export function resolveStaffNoteRows(blocks: any[], books: any[], fallbackLimit = 8): StaffNoteRow[] {
  const visible = (blocks || []).filter((b: any) => !b?.hidden);
  if (visible.length === 0) {
    return (books || [])
      .slice(0, Math.max(1, fallbackLimit))
      .map((book: any) => ({ book, note: book.subtitle || "" }));
  }

  // ⚡ Bolt: Pre-compute map of slugs to books for O(1) lookups
  // Measured impact: Eliminates O(N*M) complexity finding books for staff notes blocks
  const booksBySlug = new Map<string, any>();
  (books || []).forEach((bk: any) => {
    const slug = bookSlug(bk);
    if (slug) {
      booksBySlug.set(slug, bk);
    }
  });

  return visible
    .map((b: any) => {
      const slug = String(b.slug || "").trim();
      const book = booksBySlug.get(slug);
      return book ? { book, note: b.note || "" } : null;
    })
    .filter(Boolean) as StaffNoteRow[];
}
