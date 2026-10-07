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
  writeBatch,
  deleteField,
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
    const { email, ...publicFields } = input;
    const createdAt = new Date().toISOString();
    const payload = { ...publicFields, title: publicFields.title || "", status: "pending" as const, createdAt };
    // The review is public once approved; the reviewer's email goes to admin-only
    // reviewContacts under the same id, written together.
    const ref = doc(collection(db, "reviews"));
    const batch = writeBatch(db);
    batch.set(ref, payload);
    const cleanEmail = String(email || "").trim().slice(0, 254);
    if (cleanEmail) batch.set(doc(db, "reviewContacts", ref.id), { email: cleanEmail, createdAt });
    await batch.commit();
    return { id: ref.id, ...payload };
  },

  /** Admin: emails for reviews (admin-only collection), moving any older public copy there first. */
  contactsFor: async (reviews: Review[]): Promise<Record<string, string>> => {
    const out: Record<string, string> = {};
    const legacy = reviews.filter(r => r.email);
    if (legacy.length) {
      const batch = writeBatch(db);
      for (const r of legacy) {
        batch.set(doc(db, "reviewContacts", r.id), { email: r.email, createdAt: r.createdAt || new Date().toISOString() });
        batch.update(doc(db, "reviews", r.id), { email: deleteField() });
        out[r.id] = r.email!;
      }
      await batch.commit().catch(err => console.warn("Could not move reviewer emails:", err));
    }
    const snap = await getDocs(query(collection(db, "reviewContacts"), limit(500)));
    snap.docs.forEach(d => { if (!out[d.id]) out[d.id] = String(d.data().email || ""); });
    return out;
  },

  setStatus: async (id: string, status: Review["status"]) => {
    await updateDoc(doc(db, "reviews", id), { status });
  },

  setReply: async (id: string, body: string) => {
    const text = body.trim().slice(0, 1000);
    await updateDoc(doc(db, "reviews", id), { reply: text ? { body: text, at: new Date().toISOString() } : null });
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
