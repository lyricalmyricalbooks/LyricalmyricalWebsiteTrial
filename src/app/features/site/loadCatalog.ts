import { getCopy } from "./storeCopy";
/** Read every catalog page; keep the Firestore cursor out of public cached data. */
export async function loadCatalog(fetchPage: (size: number, cursor?: any) => Promise<any[]>): Promise<any[]> {
  const books: any[] = [];
  let cursor: any;
  while (true) {
    const page = await fetchPage(100, cursor);
    if (!Array.isArray(page)) throw new Error(getCopy({}, "catalogLoadError"));
    books.push(...page.map(({ _lastDoc, ...book }) => book));
    const next = page.at(-1)?._lastDoc;
    if (page.length < 100 || !next) return books;
    if (cursor?.id === next.id) throw new Error(getCopy({}, "catalogLoadError"));
    cursor = next;
  }
}

/** Keep automatic product selections newest-first after document-ID pagination. */
export function newestFirst<T extends { createdAt?: string }>(books: T[]): T[] {
  const time = (book: T) => Date.parse(book.createdAt || "") || 0;
  return [...books].sort((a, b) => time(b) - time(a));
}
