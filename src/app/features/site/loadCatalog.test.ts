import { describe, expect, it, vi } from "vitest";
import { loadCatalog } from "./loadCatalog";
describe("public catalog pagination", () => {
  it("loads past the first page without caching document snapshots", async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({ id: String(i), _lastDoc: { id: String(i) } }));
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce([{ id: "100" }]);
    const books = await loadCatalog(fetch);
    expect(books).toHaveLength(101);
    expect(fetch).toHaveBeenNthCalledWith(2, 100, first[99]._lastDoc);
    expect(books[0]).not.toHaveProperty("_lastDoc");
  });
  it("rejects a stuck cursor instead of looping forever", async () => {
    const fetch = vi.fn().mockResolvedValue(Array.from({ length: 100 }, () => ({ id: "same", _lastDoc: { id: "same" } })));
    await expect(loadCatalog(fetch)).rejects.toThrow();
  });
});
