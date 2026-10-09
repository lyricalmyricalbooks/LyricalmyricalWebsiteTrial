import { beforeEach, describe, expect, it, vi } from "vitest";

// Theme drafts and published designs must stay separate. Firestore is mocked so
// we can assert exactly what each admin call writes.
const setDoc = vi.fn(async () => undefined);
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), getDocs: vi.fn(), addDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
  query: vi.fn(), where: vi.fn(), setDoc: (...a: unknown[]) => (setDoc as any)(...a), getDoc: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  getCountFromServer: vi.fn(), startAfter: vi.fn(), writeBatch: vi.fn(), deleteField: vi.fn(() => "__delete__"),
  addDoc2: vi.fn(),
}));
vi.mock("firebase/auth", () => ({
  signInWithPopup: vi.fn(), signOut: vi.fn(), onAuthStateChanged: vi.fn(), GoogleAuthProvider: class {}, signInWithCredential: vi.fn(),
}));
vi.mock("firebase/storage", () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));
vi.mock("firebase/database", () => ({ ref: vi.fn(), get: vi.fn() }));
vi.mock("../../lib/firebase", () => ({ db: {}, auth: { currentUser: null }, storage: {}, googleProvider: {} }));
vi.mock("../../lib/firebaseApp", () => ({ app: {}, db: {}, appCheck: null, authState: { loaded: true } }));
vi.mock("../../lib/firestoreLite", () => ({ liteDb: {} }));
vi.mock("firebase/firestore/lite", () => import("firebase/firestore"));
vi.mock("../../lib/legacyFirebase", () => ({ legacyDb: {}, legacyAuth: {} }));

import { adminApi } from "./api";

const lastWrite = () => (setDoc.mock.calls.at(-1) as any[])[1];

describe("theme draft / publish separation", () => {
  beforeEach(() => {
    setDoc.mockClear();
    vi.spyOn(adminApi, "recordAuditLog").mockResolvedValue(undefined as any);
  });

  it("saving a draft writes draftDesign only and never touches the live design", async () => {
    await adminApi.updateSettings({ design: { primaryColor: "#e8402a" } }, { publish: false });
    const payload = lastWrite();
    expect(payload.draftDesign).toEqual({ primaryColor: "#e8402a" });
    expect("design" in payload).toBe(false);
  });

  it("publishing writes both the live design and the draft", async () => {
    await adminApi.updateSettings({ design: { primaryColor: "#1b3fe0" } }, { publish: true });
    const payload = lastWrite();
    expect(payload.design).toEqual({ primaryColor: "#1b3fe0" });
    expect(payload.draftDesign).toEqual({ primaryColor: "#1b3fe0" });
  });

  it("discarding a draft resets draftDesign to the published design and never writes design", async () => {
    const published = { primaryColor: "#100f0d", sections: [{ type: "HeroSection" }] };
    await adminApi.discardThemeDraft(published);
    const payload = lastWrite();
    expect(payload).toEqual({ draftDesign: published });
    expect("design" in payload).toBe(false);
    // The draft is a copy, not the same object reference.
    expect(payload.draftDesign).not.toBe(published);
  });

  it("non-theme settings saves do not create a design or draft", async () => {
    await adminApi.updateSettings({ info: { name: "Lyricalmyrical" } });
    const payload = lastWrite();
    expect("design" in payload).toBe(false);
    expect("draftDesign" in payload).toBe(false);
  });
});
