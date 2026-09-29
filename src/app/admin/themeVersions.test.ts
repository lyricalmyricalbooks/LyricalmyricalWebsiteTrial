import { beforeEach, describe, expect, it, vi } from "vitest";

const addDoc = vi.fn(async () => ({ id: "new1" }));
const deleteDoc = vi.fn(async () => undefined);
const getDocs = vi.fn();
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_d: unknown, n: string) => ({ n })),
  getDocs: (...a: unknown[]) => (getDocs as any)(...a),
  addDoc: (...a: unknown[]) => (addDoc as any)(...a),
  updateDoc: vi.fn(), deleteDoc: (...a: unknown[]) => (deleteDoc as any)(...a),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
  query: vi.fn((c: unknown) => c), where: vi.fn(), setDoc: vi.fn(), getDoc: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  getCountFromServer: vi.fn(), startAfter: vi.fn(), writeBatch: vi.fn(), deleteField: vi.fn(),
}));
vi.mock("firebase/auth", () => ({
  signInWithPopup: vi.fn(), signOut: vi.fn(), onAuthStateChanged: vi.fn(), GoogleAuthProvider: class {}, signInWithCredential: vi.fn(),
}));
vi.mock("firebase/storage", () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));
vi.mock("firebase/database", () => ({ ref: vi.fn(), get: vi.fn() }));
vi.mock("../../lib/firebase", () => ({ db: {}, auth: { currentUser: null }, storage: {}, googleProvider: {} }));
vi.mock("../../lib/legacyFirebase", () => ({ legacyDb: {}, legacyAuth: {} }));

import { adminApi } from "./api";

describe("persisted theme version history", () => {
  beforeEach(() => { addDoc.mockClear(); deleteDoc.mockClear(); getDocs.mockReset(); });

  it("stores a snapshot in theme-versions without undefined values", async () => {
    getDocs.mockResolvedValue({ docs: [] });
    const v = await adminApi.saveThemeVersion("published", "Published now", { a: 1, b: undefined });
    const payload = (addDoc.mock.calls[0] as any[])[1];
    expect(payload.kind).toBe("published");
    expect(payload.design).toEqual({ a: 1 });
    expect(v.id).toBe("new1");
  });

  it("prunes versions beyond the retention limit", async () => {
    const docs = Array.from({ length: 33 }, (_, i) => ({ id: `v${i}` }));
    getDocs.mockResolvedValue({ docs });
    await adminApi.saveThemeVersion("draft", "Draft", {});
    expect(deleteDoc).toHaveBeenCalledTimes(3);
  });

  it("lists versions with their ids", async () => {
    getDocs.mockResolvedValue({ docs: [{ id: "x", data: () => ({ label: "L" }) }] });
    expect(await adminApi.listThemeVersions()).toEqual([{ id: "x", label: "L" }]);
  });
});
