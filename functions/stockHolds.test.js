import { test, expect } from "vitest";
import { createRequire } from "node:module";
const { activeHolds, heldUnits, linesByBook, reserveStock, StockHoldError, HOLD_MS, holdOwner } = createRequire(import.meta.url)("./stockHolds");

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
    _transactionTail: Promise.resolve(),
    runTransaction: async function (fn) {
      const next = this._transactionTail.then(() => fn({
        get: async r => ({ exists: r.path in docs, data: () => docs[r.path] }),
        set: (r, data) => { docs[r.path] = data; },
      }));
      this._transactionTail = next.catch(() => {});
      return next;
    },
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

test("simultaneous last-copy checkouts serialize so only one gets the hold", async () => {
  const db = fakeDb({ "books/b1": { title: "Zine", trackInventory: true, stockLevel: 1 } });
  const results = await Promise.allSettled([
    reserveStock(db, "o1", [{ id: "b1", quantity: 1 }], 1000),
    reserveStock(db, "o2", [{ id: "b1", quantity: 1 }], 1000),
  ]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
});

test("a failed reservation transaction fails closed", async () => {
  const db = { runTransaction: async () => { throw new Error("Firestore unavailable"); } };
  await expect(reserveStock(db, "o1", [{ id: "b1", quantity: 1 }], 1000)).rejects.toThrow("Firestore unavailable");
});

test("untracked and backorder books are never held", async () => {
  const db = fakeDb({ "books/b1": { title: "Ebook", trackInventory: false, stockLevel: 0 } });
  await reserveStock(db, "o1", [{ id: "b1", quantity: 3 }], 1);
  expect(db.docs["stock-holds/b1"]).toBeUndefined();
});

test("a shopper's own earlier order doesn't lock them out of the last copy, but still blocks others", async () => {
  const db = fakeDb({ "books/b1": { title: "Zine", trackInventory: true, stockLevel: 1 } });
  const ada = holdOwner({ customer: { email: " Ada@Example.com " } });
  expect(ada).toBe(holdOwner({ customer: { email: "ada@example.com" } }));
  expect(ada).not.toContain("@");
  expect(holdOwner({})).toBe("");
  await reserveStock(db, "first", [{ id: "b1", quantity: 1 }], 1000, ada);
  // Card declined, Ada fixes a typo: a new order for the same copy.
  await expect(reserveStock(db, "retry", [{ id: "b1", quantity: 1 }], 2000, ada)).resolves.toBeUndefined();
  // Someone else still can't take it, and an anonymous order is never treated as Ada's.
  const bob = holdOwner({ customer: { email: "bob@example.com" } });
  await expect(reserveStock(db, "bob", [{ id: "b1", quantity: 1 }], 3000, bob)).rejects.toBeInstanceOf(StockHoldError);
  await expect(reserveStock(db, "anon", [{ id: "b1", quantity: 1 }], 3000, "")).rejects.toBeInstanceOf(StockHoldError);
});

test("a shopper's retry replaces their earlier hold, so another paid shopper still settles", async () => {
  const now = Date.now();
  const db = fakeDb({ "books/b1": { title: "Zine", trackInventory: true, stockLevel: 2 } });
  const ada = holdOwner({ customer: { email: "ada@example.com" } }), bob = holdOwner({ customer: { email: "bob@example.com" } });
  await reserveStock(db, "ada1", [{ id: "b1", quantity: 1 }], now, ada);
  await reserveStock(db, "bob1", [{ id: "b1", quantity: 1 }], now, bob);
  await reserveStock(db, "ada2", [{ id: "b1", quantity: 1 }], now, ada);
  expect(Object.keys(db.docs["stock-holds/b1"].holds).sort()).toEqual(["ada2", "bob1"]);
  db.docs["books/b1"].stockLevel = 1; // Ada paid ada2
  delete db.docs["stock-holds/b1"].holds.ada2;
  await expect(reserveStock(db, "bob1", [{ id: "b1", quantity: 1 }], now + 1, bob)).resolves.toBeUndefined();
});
