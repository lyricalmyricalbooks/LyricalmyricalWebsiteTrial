import { test, expect } from "vitest";
import { createRequire } from "node:module";
const { activeHolds, heldUnits, linesByBook, reserveStock, StockHoldError, HOLD_MS } = createRequire(import.meta.url)("./stockHolds");

test("expired holds and the order's own hold don't count", () => {
  const holds = { a: { lines: { _: 2 }, expiresAt: 100 }, b: { lines: { _: 1 }, expiresAt: 50 }, me: { lines: { _: 5 }, expiresAt: 999 } };
  const active = activeHolds(holds, 60, "me");
  expect(Object.keys(active)).toEqual(["a"]);
  expect(heldUnits(active, "_")).toBe(2);
});

test("lines are grouped per book and edition with checkout's quantity clamp", () => {
  const m = linesByBook([{ id: "b1", quantity: 2 }, { id: "b1", variantId: "hc", quantity: 500 }, { id: "b1", quantity: 1 }]);
  expect(m.get("b1")).toEqual({ _: 3, hc: 99 });
});

// Minimal in-memory Firestore for the transaction.
function fakeDb(docs) {
  const ref = (col, id) => ({ path: `${col}/${id}` });
  return {
    docs,
    collection: col => ({ doc: id => ref(col, id) }),
    runTransaction: async fn => fn({
      get: async r => ({ exists: r.path in docs, data: () => docs[r.path] }),
      set: (r, data) => { docs[r.path] = data; },
    }),
  };
}

test("a second shopper can't hold the last copy", async () => {
  const db = fakeDb({ "books/b1": { title: "Zine", trackInventory: true, stockLevel: 1 } });
  await reserveStock(db, "o1", [{ id: "b1", quantity: 1 }], 1000);
  await expect(reserveStock(db, "o2", [{ id: "b1", quantity: 1 }], 1001)).rejects.toBeInstanceOf(StockHoldError);
  // The first shopper renewing their own hold is fine.
  await reserveStock(db, "o1", [{ id: "b1", quantity: 1 }], 1002);
  // After the hold expires, the copy is free again.
  await reserveStock(db, "o2", [{ id: "b1", quantity: 1 }], 1002 + HOLD_MS + 1);
  expect(Object.keys(db.docs["stock-holds/b1"].holds)).toEqual(["o2"]);
});

test("untracked and backorder books are never held", async () => {
  const db = fakeDb({ "books/b1": { title: "Ebook", trackInventory: false, stockLevel: 0 } });
  await reserveStock(db, "o1", [{ id: "b1", quantity: 3 }], 1);
  expect(db.docs["stock-holds/b1"]).toBeUndefined();
});
