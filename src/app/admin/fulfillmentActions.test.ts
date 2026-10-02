import { beforeEach, describe, expect, it, vi } from "vitest";
const { tx, records } = vi.hoisted(() => {
 const records = new Map<string, any>();
 const tx = { get: vi.fn(async (ref: any) => ({ exists: () => records.has(ref.path), data: () => records.get(ref.path) })), update: vi.fn(), set: vi.fn() };
 return { tx, records };
});
const setDoc = vi.fn(); const getDoc = vi.fn();
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), getDocs: vi.fn(), addDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
  query: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), startAfter: vi.fn(), writeBatch: vi.fn(),
  setDoc: (...a: unknown[]) => (setDoc as any)(...a), getDoc: (...a: unknown[]) => (getDoc as any)(...a),
  getCountFromServer: vi.fn(), deleteField: vi.fn(), serverTimestamp: vi.fn(), Timestamp: class {},
  onSnapshot: vi.fn(), increment: vi.fn(), runTransaction: (_db: unknown, fn: any) => fn(tx),
}));
vi.mock("firebase/auth", () => ({
  signInWithPopup: vi.fn(), signOut: vi.fn(), onAuthStateChanged: vi.fn(), GoogleAuthProvider: class {}, signInWithCredential: vi.fn(), getAuth: vi.fn(),
}));
vi.mock("firebase/storage", () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));
vi.mock("firebase/database", () => ({ ref: vi.fn(), get: vi.fn() }));
vi.mock("../../lib/firebase", () => ({ db: {}, auth: { currentUser: null }, storage: {}, googleProvider: {} }));
vi.mock("../../lib/legacyFirebase", () => ({ legacyDb: {}, legacyAuth: {} }));


import { adminApi } from "./api";
import { addressKey, packingKey } from "./fulfillment";
const base = () => ({ paymentStatus: "paid", status: "open", customer: { address: { street: "1 Main", city: "Toronto", state: "ON", zip: "M6G3H1", country: "Canada" } }, items: [{ id: "b", quantity: 1 }] });
beforeEach(() => { records.clear(); tx.update.mockClear(); tx.set.mockClear(); const o = base(); records.set("orders/a", o); records.set("order-operations/a", { addressReviewed: addressKey(o), packed: packingKey(o), activity: [] }); });
describe("atomic fulfillment actions", () => {
 it("dispatches with tracking and private history, without writing payment or inventory", async () => { await adminApi.fulfillmentAction("a", "dispatch", { trackingCarrier: "Canada Post", trackingNumber: "123" }); expect(tx.update).toHaveBeenCalledWith({ path: "orders/a" }, expect.objectContaining({ fulfillmentStatus: "shipped", trackingNumber: "123" })); expect(tx.update.mock.calls[0][1]).not.toHaveProperty("paymentStatus"); expect(tx.set.mock.calls[0][0].path).toBe("order-operations/a"); });
 it("rejects a stale checklist without writing anything", async () => { records.set("order-operations/a", { addressReviewed: addressKey(base()) }); await expect(adminApi.fulfillmentAction("a", "pack", { packingKey: "stale" })).rejects.toThrow("Items changed"); expect(tx.update).not.toHaveBeenCalled(); expect(tx.set).not.toHaveBeenCalled(); });
 it("rejects unpaid dispatch and incomplete preparation", async () => { records.set("orders/a", { ...base(), paymentStatus: "unpaid" }); await expect(adminApi.fulfillmentAction("a", "dispatch", {})).rejects.toThrow(); expect(tx.update).not.toHaveBeenCalled(); });
 it("stores new internal notes only in private operations", async () => { await adminApi.addOrderNote("a", "Customer issue"); expect(tx.update).not.toHaveBeenCalled(); expect(tx.set.mock.calls[0][0].path).toBe("order-operations/a"); });
 it("prevents changing the address after buying a label", async () => { records.set("orders/a", { ...base(), labelUrl: "label" }); await expect(adminApi.correctOrderAddress("a", base().customer.address, addressKey(base()))).rejects.toThrow("after label purchase"); expect(tx.update).not.toHaveBeenCalled(); });
});
