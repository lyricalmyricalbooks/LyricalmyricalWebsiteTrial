import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  setDoc,
  getDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { db, auth, googleProvider } from "../../lib/firebase";

export const adminApi = {
  // Authentication
  login: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Restrict to authorized email
      if (user.email !== "lyricalmyricalbooks@gmail.com") {
        await signOut(auth);
        throw new Error("Unauthorized: Access restricted to lyricalmyricalbooks@gmail.com");
      }
      
      return { token: await user.getIdToken(), user };
    } catch (err: any) {
      console.error("Login Error:", err);
      throw err;
    }
  },

  logout: () => signOut(auth),

  onAuthStateChange: (callback: (user: any) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // Stats
  getStats: async () => {
    const booksSnap = await getDocs(collection(db, "books"));
    const authorsSnap = await getDocs(collection(db, "authors"));
    const profilesSnap = await getDocs(collection(db, "shipping-profiles"));
    
    const books = booksSnap.docs.map(d => d.data());
    
    return {
      totalBooks: books.length,
      draftCount: books.filter(b => b.status === "draft").length,
      publishedCount: books.filter(b => b.status === "published").length,
      shippingProfiles: profilesSnap.size,
      authors: authorsSnap.size,
    };
  },

  // Books
  getBooks: async () => {
    const q = query(collection(db, "books"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  createBook: async (book: any) => {
    const docRef = await addDoc(collection(db, "books"), {
      ...book,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...book };
  },

  updateBook: async (id: string, book: any) => {
    const docRef = doc(db, "books", id);
    await updateDoc(docRef, {
      ...book,
      updatedAt: new Date().toISOString(),
    });
    return { id, ...book };
  },

  deleteBook: (id: string) => deleteDoc(doc(db, "books", id)),

  duplicateBook: async (id: string) => {
    const docRef = doc(db, "books", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Original book not found");
    const data = snap.data();
    return await addDoc(collection(db, "books"), {
      ...data,
      title: `${data.title} (Copy)`,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  addPhotos: async (bookId: string, photos: any[]) => {
    const docRef = doc(db, "books", bookId);
    const bookSnap = await getDoc(docRef);
    if (!bookSnap.exists()) throw new Error("Book not found");
    
    const currentPhotos = bookSnap.data().photos || [];
    const newPhotos = [
      ...currentPhotos,
      ...photos.map(p => ({
        id: crypto.randomUUID(),
        url: p.url ?? p,
        altText: p.altText ?? "",
        createdAt: new Date().toISOString(),
      }))
    ].slice(0, 10);

    await updateDoc(docRef, {
      photos: newPhotos,
      updatedAt: new Date().toISOString(),
    });
    return newPhotos;
  },

  // Authors
  getAuthors: async () => {
    const snap = await getDocs(collection(db, "authors"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  createAuthor: async (author: any) => {
    const docRef = await addDoc(collection(db, "authors"), {
      ...author,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...author };
  },

  // Shipping Profiles
  getShippingProfiles: async () => {
    const snap = await getDocs(collection(db, "shipping-profiles"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  createShippingProfile: async (profile: any) => {
    const docRef = await addDoc(collection(db, "shipping-profiles"), {
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...profile };
  },

  // Settings
  getSettings: async () => {
    const docRef = doc(db, "settings", "website");
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const defaultSettings = { 
        announcements: [{ message: "INDEPENDENT PUBLISHING HOUSE SPECIALIZING IN CONTEMPORARY PHOTOGRAPHY AND EPHEMERA" }] 
      };
      await setDoc(docRef, defaultSettings);
      return defaultSettings;
    }
    return snap.data();
  },

  updateSettings: (settings: any) => setDoc(doc(db, "settings", "website"), settings, { merge: true }),

  // Audit Log
  getAuditLog: async (limitCount = 100) => {
    const q = query(collection(db, "audit-log"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ORDERS
  getOrders: async () => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  getOrderById: async (id: string) => {
    const docRef = doc(db, "orders", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  createOrder: async (order: any) => {
    // Generate a random-ish ID similar to the screenshot FRQZ-047691
    const prefix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const orderId = `${prefix}-${suffix}`;
    
    await setDoc(doc(db, "orders", orderId), {
      ...order,
      orderId, // Display ID
      status: "open",
      paymentStatus: "paid",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activity: [
        { type: "event", message: "Order created", createdAt: new Date().toISOString() },
        { type: "event", message: "Payment completed (Stripe)", createdAt: new Date().toISOString() }
      ]
    });
    return orderId;
  },

  updateOrder: async (id: string, data: any) => {
    const docRef = doc(db, "orders", id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  addOrderNote: async (id: string, message: string) => {
    const docRef = doc(db, "orders", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const activity = snap.data().activity || [];
    await updateDoc(docRef, {
      activity: [...activity, { type: "note", message, createdAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString()
    });
  }
};
