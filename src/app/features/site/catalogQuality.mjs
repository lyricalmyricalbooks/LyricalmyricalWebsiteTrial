/** Keep obvious unpublished/test inventory out of shopper-facing lists while preserving its stored record. */
export function isPlaceholderCatalogRecord(book) {
  const title = String(book?.title || "").trim();
  return /\b(test|sample|demo|placeholder|sss|copy)\b/i.test(title);
}
