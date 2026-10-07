import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

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
    const base = collection(db, "reviews");
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
    const payload: Omit<Review, "id"> = {
      ...input,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, "reviews"), payload as any);
    clearApprovedCache();
    return { id: ref.id, ...payload };
  },

  setStatus: async (id: string, status: Review["status"]) => {
    await updateDoc(doc(db, "reviews", id), { status });
    clearApprovedCache();
  },

  setReply: async (id: string, body: string) => {
    const text = body.trim().slice(0, 1000);
    await updateDoc(doc(db, "reviews", id), { reply: text ? { body: text, at: new Date().toISOString() } : null });
    clearApprovedCache();
  },

  remove: async (id: string) => {
    await deleteDoc(doc(db, "reviews", id));
    clearApprovedCache();
  },

  aggregate: async (bookId: string): Promise<{ count: number; average: number }> => {
    const reviews = await reviewsApi.list(bookId, false);
    if (!reviews.length) return { count: 0, average: 0 };
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return { count: reviews.length, average: sum / reviews.length };
  },
};
