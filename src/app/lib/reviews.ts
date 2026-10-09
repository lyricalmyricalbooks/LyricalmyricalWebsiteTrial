import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  updateDoc,
  writeBatch,
  getDoc,
  deleteField,
  deleteDoc,
} from "firebase/firestore/lite";
import { liteDb } from "../../lib/firestoreLite";

export type Review = {
  id: string;
  bookId: string;
  authorName: string;
  email?: string;
  rating: number; // 1..5
  title?: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  /** Public reply from the store owner (admin-written). */
  reply?: { body: string; at: string };
};

// Older reviews kept the email on the public document; moved once per admin session.
let legacyEmailsMoved = false;
// The product page (for search markup) and its reviews section read the same approved list;
// share one request per book for a short while instead of reading it twice.
const approvedCache = new Map<string, { at: number; promise: Promise<Review[]> }>();
const clearApprovedCache = () => approvedCache.clear();

export const reviewsApi = {
  listApproved: (bookId: string): Promise<Review[]> => {
    const hit = approvedCache.get(bookId);
    if (hit && Date.now() - hit.at < 30_000) return hit.promise;
    const promise = reviewsApi.list(bookId, false);
    approvedCache.set(bookId, { at: Date.now(), promise });
    promise.catch(() => approvedCache.delete(bookId));
    return promise;
  },

  list: async (bookId: string, includePending = false): Promise<Review[]> => {
    const base = collection(liteDb, "reviews");
    const q = includePending
      ? query(base, where("bookId", "==", bookId), orderBy("createdAt", "desc"), limit(50))
      : query(
          base,
          where("bookId", "==", bookId),
          where("status", "==", "approved"),
          orderBy("createdAt", "desc"),
          limit(50),
        );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  },

  create: async (input: Omit<Review, "id" | "status" | "createdAt">) => {
    const { email, ...publicFields } = input;
    const createdAt = new Date().toISOString();
    const payload = { ...publicFields, title: publicFields.title || "", status: "pending" as const, createdAt };
    // The review is public once approved; the reviewer's email goes to admin-only
    // reviewContacts under the same id, written together.
    const ref = doc(collection(liteDb, "reviews"));
    const batch = writeBatch(liteDb);
    batch.set(ref, payload);
    const cleanEmail = String(email || "").trim().slice(0, 254);
    if (cleanEmail) batch.set(doc(liteDb, "reviewContacts", ref.id), { email: cleanEmail, createdAt });
    await batch.commit();
    clearApprovedCache();
    return { id: ref.id, ...payload };
  },

  /**
   * Admin: emails for the listed reviews (admin-only reviewContacts). The first call in a
   * session also moves every older review's public email there, across the whole collection.
   */
  contactsFor: async (reviews: Review[]): Promise<Record<string, string>> => {
    const out: Record<string, string> = {};
    if (!legacyEmailsMoved) {
      const all = await getDocs(collection(liteDb, "reviews"));
      const legacy = all.docs.filter(d => d.data().email);
      for (let i = 0; i < legacy.length; i += 200) {
        const batch = writeBatch(liteDb);
        for (const d of legacy.slice(i, i + 200)) {
          batch.set(doc(liteDb, "reviewContacts", d.id), { email: String(d.data().email), createdAt: d.data().createdAt || new Date().toISOString() });
          batch.update(d.ref, { email: deleteField() });
          out[d.id] = String(d.data().email);
        }
        await batch.commit();
      }
      legacyEmailsMoved = true;
    }
    await Promise.all(reviews.filter(r => !out[r.id]).map(async r => {
      const snap = await getDoc(doc(liteDb, "reviewContacts", r.id)).catch(() => null);
      if (snap?.exists()) out[r.id] = String(snap.data().email || "");
    }));
    return out;
  },

  setStatus: async (id: string, status: Review["status"]) => {
    await updateDoc(doc(liteDb, "reviews", id), { status });
    clearApprovedCache();
  },

  setReply: async (id: string, body: string) => {
    const text = body.trim().slice(0, 1000);
    await updateDoc(doc(liteDb, "reviews", id), { reply: text ? { body: text, at: new Date().toISOString() } : null });
    clearApprovedCache();
  },

  remove: async (id: string) => {
    await deleteDoc(doc(liteDb, "reviews", id));
    clearApprovedCache();
  },

  aggregate: async (bookId: string): Promise<{ count: number; average: number }> => {
    const reviews = await reviewsApi.list(bookId, false);
    if (!reviews.length) return { count: 0, average: 0 };
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return { count: reviews.length, average: sum / reviews.length };
  },
};
