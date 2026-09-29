import { describe, expect, it } from "vitest";
import { filterReviews, reviewStats } from "./reviewInsights";

const rs = [
  { id: "1", status: "approved", rating: 5, bookId: "b1", body: "Loved it", authorName: "Ann" },
  { id: "2", status: "approved", rating: 3, bookId: "b2", body: "ok", reply: { body: "Thanks" } },
  { id: "3", status: "pending", rating: 1, bookId: "b1", body: "bad" },
];
describe("reviewInsights", () => {
  it("computes stats", () => {
    const s = reviewStats(rs);
    expect(s).toMatchObject({ total: 3, average: 3, approvedAverage: 4, lowPending: 1, unanswered: 1 });
    expect(s.distribution).toEqual([1, 0, 1, 0, 1]);
  });
  it("filters by status, rating and text incl. book title", () => {
    const titles = { b1: "Night Sky", b2: "Other" };
    expect(filterReviews(rs, { status: "approved", rating: "all", q: "", titles })).toHaveLength(2);
    expect(filterReviews(rs, { status: "all", rating: "1", q: "", titles }).map((r) => r.id)).toEqual(["3"]);
    expect(filterReviews(rs, { status: "all", rating: "all", q: "night", titles }).map((r) => r.id)).toEqual(["1", "3"]);
  });
});
