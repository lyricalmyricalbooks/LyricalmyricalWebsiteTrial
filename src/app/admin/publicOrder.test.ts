import { describe, expect, it, vi } from "vitest";
const paths: string[] = [];
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), getDocs: vi.fn(), addDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(), setDoc: vi.fn(),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
  getDoc: vi.fn(async (ref: any) => { paths.push(ref.path); return { exists: () => true, id: "A", data: () => ({ orderId: "A" }) }; }),
  query: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), startAfter: vi.fn(), writeBatch: vi.fn(),
  getCountFromServer: vi.fn(), deleteField: vi.fn(), serverTimestamp: vi.fn(), Timestamp: class {},
  onSnapshot: vi.fn(), increment: vi.fn(), runTransaction: vi.fn(),
}));
vi.mock("firebase/auth", () => ({ signInWithPopup: vi.fn(), signOut: vi.fn(), onAuthStateChanged: vi.fn(), GoogleAuthProvider: class {}, signInWithCredential: vi.fn(), getAuth: vi.fn() }));
vi.mock("firebase/storage", () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));
vi.mock("firebase/database", () => ({ ref: vi.fn(), get: vi.fn() }));
vi.mock("../../lib/firebase", () => ({ db: {}, auth: { currentUser: null }, storage: {}, googleProvider: {} }));
vi.mock("../../lib/legacyFirebase", () => ({ legacyDb: {}, legacyAuth: {} }));
import { adminApi } from "./api";

describe("storefront order lookup", () => {
  it("reads only the public order, never the admin-only operations record", async () => {
    paths.length = 0;
    expect(await adminApi.getPublicOrder("A")).toMatchObject({ id: "A", orderId: "A" });
    expect(paths).toEqual(["orders/A"]);
  });
});
