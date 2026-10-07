import { describe, expect, it } from "vitest";
import { recommendedBooks, editionFacts } from "./merchandising";
const catalog = [{ id: "a", status: "published", categories: ["Poetry"] }, { id: "b", status: "published" }, { id: "c", status: "draft" }];
describe("publisher recommendations", () => {
  it("keeps curator order and excludes missing, duplicate, current and unpublished books", () => {
    expect(recommendedBooks({ id: "a", relatedBookIds: ["c", "missing", "b", "b", "a"] }, catalog).map(b => b.id)).toEqual(["b"]);
  });
  it("an explicitly empty selection hides automatic recommendations", () => {
    expect(recommendedBooks({ id: "a", relatedBookIds: [] }, catalog)).toEqual([]);
  });
  it("preserves automatic matches for older records without a selection", () => {
    expect(recommendedBooks({ id: "a", categories: ["Poetry"] }, catalog).map(b => b.id)).toEqual(["b"]);
  });
});
describe("real edition details", () => {
  it("renders supplied values only, without inventing edition facts", () => {
    expect(editionFacts({ edition: "Second printing", pageCount: 48, publisher: "LM", publishDate: "2026-10-07" })).toEqual([
      { key: "specEdition", value: "Second printing" }, { key: "specPages", value: "48" }, { key: "specPublisher", value: "LM" }, { key: "specPublished", value: "2026-10-07" },
    ]);
    expect(editionFacts({ pageCount: 0 })).toEqual([]);
  });
});
