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
};

export const reviewsApi = {
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
    return { id: ref.id, ...payload };
  },

  setStatus: async (id: string, status: Review["status"]) => {
    await updateDoc(doc(db, "reviews", id), { status });
  },

  remove: async (id: string) => {
    await deleteDoc(doc(db, "reviews", id));
  },

  aggregate: async (bookId: string): Promise<{ count: number; average: number }> => {
    const reviews = await reviewsApi.list(bookId, false);
    if (!reviews.length) return { count: 0, average: 0 };
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return { count: reviews.length, average: sum / reviews.length };
  },
};
