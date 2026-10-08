import { parseWeightGrams } from "../features/site/shippingEngine";
import { isPlaceholderCatalogRecord } from "../features/site/catalogQuality.mjs";
export type CatalogIssue = { key: string; message: string; blocking: boolean };
export function catalogPublishIssues(book: any): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const flag = (key: string, condition: boolean, message: string, blocking = false) => { if (condition) issues.push({ key, message, blocking }); };
  const blank = (value: any) => !String(value ?? "").trim();
  const priceInvalid = (value: any) => value === "" || value == null || !Number.isFinite(Number(value)) || Number(value) < 0;
  flag("title", blank(book.title), "Add a title.", true);
  flag("photos", !(book.photos || []).some((photo: any) => /^https?:\/\//.test(String(photo.url || ""))), "Add a genuine cover photo and interior images.");
  flag("interior", (book.photos || []).filter((photo: any) => /^https?:\/\//.test(String(photo.url || ""))).length === 1, "Add genuine interior photos for shoppers to preview.");
  flag("credits", blank(book.subtitle) && blank(book.authorName), "Add confirmed author or contributor credits.");
  flag("price", priceInvalid(book.retailPrice) || (book.isOnSale && priceInvalid(book.salePrice)) || (book.variants || []).some((variant: any) => priceInvalid(variant.price)), "Fix missing, negative or invalid book/edition prices.", true);
  flag("free", !priceInvalid(book.retailPrice) && Number(book.retailPrice) === 0, "Confirm this book is intentionally free.");
  flag("edition", blank(book.format) || blank(book.edition) || !(Number(book.pageCount) > 0), "Complete format, edition/printing and page count.");
  const physical = !book.isDigital && !/digital|ebook|e-book|pdf/i.test(String(book.format || ""));
  flag("weight", physical && (!(Number(parseWeightGrams(book.weight)) > 0) || (book.variants || []).some((variant: any) => !(Number(parseWeightGrams(variant.weight || book.weight)) > 0))), "Add positive shipping weight for physical editions.");
  flag("description", blank(book.description), "Add publisher copy explaining the book.");
  flag("placeholder", isPlaceholderCatalogRecord(book) || /lorem ipsum|placeholder|coming soon|sample description/i.test(String(book.description || "")), "Review possible test, duplicate or placeholder content. Titles alone never hide a published book.");
  return issues;
}
