import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: any[] = [];
vi.mock("../../lib/firestoreLite", () => ({ liteDb: {} }));
vi.mock("firebase/firestore/lite", () => ({
  collection: (_db: any, name: string) => ({ name }),
  doc: (_db: any, name: string, id?: string) => ({ name, id: id || "new" }),
  documentId: () => "__id__",
  where: (...args: any[]) => ({ where: args }),
  query: (col: any, ...parts: any[]) => ({ col, parts }),
  orderBy: () => ({}), limit: () => ({}), updateDoc: async () => {}, deleteField: () => ({}), getDoc: async () => ({ exists: () => false }),
  getDocs: async (q: any) => {
    calls.push(q);
    if (q.name === "reviews") return { docs: [] };
    const ids: string[] = q.parts[0].where[2];
    return { docs: ids.filter(id => id !== "r2").map(id => ({ id, data: () => ({ email: `${id}@x.ca` }) })) };
  },
  writeBatch: () => {
    const ops: any[] = [];
    return { delete: (ref: any) => ops.push(["delete", ref.name, ref.id]), set: () => {}, update: () => {}, commit: async () => { calls.push(ops); } };
  },
}));

import { chunk, reviewsApi } from "./reviews";

beforeEach(() => { calls.length = 0; });

describe("reviews admin api", () => {
  it("chunks ids by 30", () => {
    expect(chunk(Array.from({ length: 65 }, (_, i) => i), 30).map(c => c.length)).toEqual([30, 30, 5]);
  });
  it("deletes the review and its private contact in one batch", async () => {
    await reviewsApi.remove("r1");
    expect(calls.at(-1)).toEqual([["delete", "reviews", "r1"], ["delete", "reviewContacts", "r1"]]);
  });
  it("reads contacts with one query per 30 reviews", async () => {
    const reviews: any[] = Array.from({ length: 31 }, (_, i) => ({ id: `r${i}` }));
    const out = await reviewsApi.contactsFor(reviews);
    const contactQueries = calls.filter(c => c?.col?.name === "reviewContacts");
    expect(contactQueries).toHaveLength(2);
    expect(out.r1).toBe("r1@x.ca");
    expect(out.r2).toBeUndefined();
  });
});
