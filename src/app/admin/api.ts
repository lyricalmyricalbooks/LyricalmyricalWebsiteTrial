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
  limit,
  getCountFromServer,
  startAfter,
  writeBatch,
} from "firebase/firestore";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { db, auth, storage, googleProvider } from "../../lib/firebase";
import { legacyDb, legacyAuth } from "../../lib/legacyFirebase";
import { ref as dbRef, get as dbGet } from "firebase/database";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { CATEGORIES } from "../features/site/constants";
import type { Book, Page, SiteSettings } from "../features/site/types";

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

      // Also sign into legacy inventory project using the same Google credential
      // so inventory sync can access the RTDB without a second login popup.
      try {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential) await signInWithCredential(legacyAuth, credential);
      } catch (legacyErr) {
        console.warn("Could not auto-sign into legacy project:", legacyErr);
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
    try {
      // Using getCountFromServer is O(1) in terms of read costs and much faster
      const booksColl = collection(db, "books");
      const authorsColl = collection(db, "authors");
      const profilesColl = collection(db, "shipping-profiles");
      const ordersColl = collection(db, "orders");

      const [booksCount, authorsCount, profilesCount, ordersCount] = await Promise.all([
        getCountFromServer(booksColl),
        getCountFromServer(authorsColl),
        getCountFromServer(profilesColl),
        getCountFromServer(ordersColl)
      ]);
      
      // For more granular stats like drafts, we still need a query count
      const draftQuery = query(booksColl, where("status", "==", "draft"));
      const publishedQuery = query(booksColl, where("status", "==", "published"));
      
      const [draftSnap, publishedSnap] = await Promise.all([
        getCountFromServer(draftQuery),
        getCountFromServer(publishedQuery)
      ]);
      
      return {
        totalBooks: booksCount.data().count,
        draftCount: draftSnap.data().count,
        publishedCount: publishedSnap.data().count,
        shippingProfiles: profilesCount.data().count,
        authors: authorsCount.data().count,
        totalOrders: ordersCount.data().count
      };
    } catch (err) {
      console.error("Stats Error:", err);
      return { totalBooks: 0, draftCount: 0, publishedCount: 0, shippingProfiles: 0, authors: 0, totalOrders: 0 };
    }
  },

  // Books
  getBooks: async (limitCount = 50, lastVisible = null) => {
    let q = query(collection(db, "books"), orderBy("createdAt", "desc"), limit(limitCount));
    if (lastVisible) {
      q = query(collection(db, "books"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(limitCount));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data(), _lastDoc: d }));
  },

  createBook: async (book: any) => {
    const dataToSave = { ...book };
    delete dataToSave.id;
    delete dataToSave._lastDoc;
    
    const docRef = await addDoc(collection(db, "books"), {
      ...dataToSave,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...dataToSave };
  },

  updateBook: async (id: string, book: any) => {
    const docRef = doc(db, "books", id);
    const dataToSave = { ...book };
    delete dataToSave.id;
    delete dataToSave._lastDoc;

    await updateDoc(docRef, {
      ...dataToSave,
      updatedAt: new Date().toISOString(),
    });
    return { id, ...dataToSave };
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
        id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
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

  // Uploads
  uploadFile: async (file: File, path: string) => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  },

  uploadBrandAsset: async (file: File, type: 'logo' | 'favicon') => {
    const ext = file.name.split('.').pop();
    const path = `assets/brand/${type}_${Date.now()}.${ext}`;
    return adminApi.uploadFile(file, path);
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

  updateShippingProfile: async (id: string, profile: any) => {
    const docRef = doc(db, "shipping-profiles", id);
    await updateDoc(docRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    });
    return { id, ...profile };
  },

  deleteShippingProfile: (id: string) => deleteDoc(doc(db, "shipping-profiles", id)),

  // Settings
  getSettings: async () => {
    const docRef = doc(db, "settings", "website");
    const snap = await getDoc(docRef);
    const defaultSettings = adminApi.getDefaultSettings();

    if (!snap.exists()) {
      await setDoc(docRef, defaultSettings);
      return defaultSettings;
    }
    
    // Merge snap data with defaults to ensure new fields are present
    return { ...defaultSettings, ...snap.data() };
  },

  updateSettings: (settings: any, options: { publish?: boolean } = {}) => {
    const docRef = doc(db, "settings", "website");
    const payload = { ...settings };
    
    // If we're updating 'design' (the theme), handle the draft/publish logic
    if (settings.design) {
      if (options.publish) {
        // Publish: update both live and draft
        payload.design = settings.design;
        payload.draftDesign = settings.design;
      } else {
        // Save Draft: only update draftDesign, don't touch the live design
        payload.draftDesign = settings.design;
        delete payload.design;
      }
    }
    
    return setDoc(docRef, payload, { merge: true });
  },

  getDefaultSettings: () => ({
    announcements: [{ message: "INDEPENDENT PUBLISHING HOUSE SPECIALIZING IN CONTEMPORARY PHOTOGRAPHY AND EPHEMERA" }],
    maintenance: { enabled: false, message: "WE ARE UPDATING OUR ARCHIVE. PLEASE CHECK BACK SOON." },
    domain: { subdomain: "lyricalmyrical", custom: "www.lyricalmyricalbooks.com" },
    info: { 
      name: "Lyricalmyrical Books", 
      description: "Lyricalmyrical Books is an independent publishing house based in Toronto with roots in Italy, specializing in publishing photography and art books.",
      website: "https://lyricalmyricalbooks.com"
    },
    inventory: { tracking: true, overselling: false },
    checkout: { requirePhone: true },
    assets: { 
      profileUrl: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop", 
      faviconUrl: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=50&h=50&fit=crop" 
    },
    location: { street: "456 Montrose Avenue", city: "Toronto", state: "Ontario", zip: "M6G3H1", country: "Canada" },
    localization: { timezone: "(GMT-05:00) Eastern Time (US & Canada)", currency: "Canadian Dollar (CAD $)" },
    aiShield: { blockTraining: false, blockShopping: false },
    policies: { shipping: "", returns: "", privacy: "", terms: "", legal: "" },
    communications: {
      orderReceipts: true,
      shippingStatus: true,
      abandonedCart: false,
      receiptMessage: "",
      newOrderNotifications: true
    },
    payments: {
      stripe: {
        connected: true,
        email: "julianiacobelli1@gmail.com",
        applePay: true,
        googlePay: true,
        afterpay: true,
        affirm: true,
        klarna: true,
        subscriptions: false
      },
      paypal: {
        connected: true,
        email: "lyricalmyricalbooks@gmail.com",
        venmo: true,
        buyNowPayLater: true
      }
    },
    taxes: {
      rates: []
    },
    design: {
      primaryColor: "#A855F7",
      font: "Inter",
      palettePreset: "dark",
      categories: CATEGORIES,
      // Navigation & Layout
      headerStyle: "minimal",
      stickyHeader: true,
      showSocialInFooter: true,
      footerColumns: true,
      logoHeight: 24,
      // Homepage
      heroLayout: "fullscreen",
      heroCTA: "ENTER ARCHIVE",
      heroSubtext: "Discover rare editions and exclusive prints.",
      showFeaturedCarousel: true,
      showBookStrip: true,
      // Products
      productCardStyle: "editorial",
      imageAspectRatio: "3:4",
      showPriceOnHover: false,
      showCollectionMeta: true,
      showSoldOutBadge: true,
      productCTA: "VIEW",
      productColumnsDesktop: 4,
      productColumnsMobile: 2,
      containerWidth: 1200,
      sectionSpacing: 64,
      cardRadius: 8,
      buttonStyle: "solid",
      buttonRadius: 999,
      buttonUppercase: true,
      buttonShadow: true,
      backgroundColor: "#030213",
      textColor: "#ffffff",
      customCss: "",
      customHeadHtml: "",
      customFooterScripts: "",
      // Announcements
      showAnnouncement: true,
      announcementText: "INDEPENDENT PUBLISHING HOUSE SPECIALIZING IN CONTEMPORARY PHOTOGRAPHY AND EPHEMERA",
      announcementBg: "#000000",
      announcementColor: "#ffffff",
      announcementScrolling: false,
      // Social
      social: {
        instagram: "https://www.instagram.com/lyricalmyricalbooks",
        twitter: "",
        facebook: "",
        tiktok: "",
      },
      // Typography
      fontSize: "md",
      headingScale: "regular",
      letterSpacing: "wide",
      // Translations
      cartLabel: "BAG",
      soldOutLabel: "SOLD OUT",
      currencyPosition: "before",
      shopButtonLabel: "SHOP NOW",
      // Additional
      enableAnimations: true,
      showZoom: true,
      showBackToTop: false,
      showPoweredBy: false,
      navHeading: "INFO",
      headerLinks: {
        showEnterArchive: true,
        showInformation: true,
        showCustomPages: true,
        showBag: true,
        showSys: true,
      },
      // Hero (Shopify Style)
      hero: {
        enabled: true,
        height: "fullscreen", // fullscreen, tall, medium
        align: "center", // left, center, right
        overlayOpacity: 0.4,
        autoRotate: true,
        slides: [
          {
            id: "default-slide-1",
            imageUrl: "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=1600&h=900&fit=crop",
            title: "F✶M",
            subtitle: "PHOTOGRAPHY & ART BOOKS",
            ctaText: "ENTER SHOP",
            ctaLink: "/shop"
          }
        ]
      }
    }
  }),

  // Audit Log
  getAuditLog: async (limitCount = 100) => {
    const q = query(collection(db, "audit-log"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ORDERS
  getOrders: async (limitCount = 50, lastVisible = null) => {
    let q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(limitCount));
    if (lastVisible) {
      q = query(collection(db, "orders"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(limitCount));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data(), _lastDoc: d }));
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
    const dataToSave = { ...data };
    delete dataToSave.id;
    delete dataToSave._lastDoc;

    await updateDoc(docRef, {
      ...dataToSave,
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
  },

  // DISCOUNTS ─────────────────────────────────────────────────────────────────
  getDiscounts: async () => {
    const snap = await getDocs(collection(db, "discounts"));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  },

  saveDiscount: async (discount: any) => {
    const now = new Date().toISOString();
    const payload = {
      code: (discount.code || "").toUpperCase(),
      type: discount.type || "percentage",
      value: discount.value ?? 0,
      isActive: discount.isActive ?? true,
      expiryDate: discount.expiryDate || null,
      minOrderAmount: discount.minOrderAmount ?? null,
      usageLimit: discount.usageLimit ?? null,
      usageCount: discount.usageCount ?? 0,
      onePerCustomer: discount.onePerCustomer ?? false,
      appliesTo: discount.appliesTo || "all",
      description: discount.description || "",
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(collection(db, "discounts"), payload);
    return { id: docRef.id, ...payload };
  },

  updateDiscount: async (id: string, data: any) => {
    const now = new Date().toISOString();
    const payload = { ...data, updatedAt: now };
    delete payload.id;
    await updateDoc(doc(db, "discounts", id), payload);
    return { id, ...payload };
  },

  deleteDiscount: async (id: string) => {
    await deleteDoc(doc(db, "discounts", id));
  },

  validateDiscount: async (code: string) => {
    // Support both isActive (new field) and active (legacy)
    const snap = await getDocs(
      query(collection(db, "discounts"), where("code", "==", code.toUpperCase()))
    );
    if (snap.empty) throw new Error("Invalid or expired discount code");

    const docSnap = snap.docs[0];
    const data = docSnap.data();
    const isActive = data.isActive ?? data.active ?? true;
    if (!isActive) throw new Error("This code is not currently active");

    const now = new Date().toISOString();
    const expiry = data.expiryDate || data.expiry;
    if (expiry && expiry < now) throw new Error("This code has expired");
    if (data.usageLimit && (data.usageCount || 0) >= data.usageLimit)
      throw new Error("This code has reached its usage limit");

    const minOrder = data.minOrderAmount;

    return {
      id: docSnap.id,
      code: data.code,
      type: data.type,
      value: data.value,
      minOrderAmount: minOrder ?? null,
      onePerCustomer: data.onePerCustomer ?? false,
    };
  },

  // ANALYTICS
  recordVisit: async () => {
    const today = new Date().toISOString().split('T')[0];
    const docRef = doc(db, "analytics", today);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, { visits: (snap.data().visits || 0) + 1 });
      } else {
        await setDoc(docRef, { visits: 1, orders: 0, revenue: 0, date: today });
      }
    } catch (e) {
      console.warn("Analytics failed", e);
    }
  },

  getAnalytics: async () => {
    const q = query(collection(db, "analytics"), orderBy("date", "desc"), limit(30));
    const snap = await getDocs(q);
    const data = snap.docs.map(d => d.data()).reverse();
    
    // Also get top sellers from orders
    const ordersSnap = await getDocs(collection(db, "orders"));
    const orders = ordersSnap.docs.map(d => d.data());
    
    const productStats: any = {};
    orders.forEach((o: any) => {
      o.items?.forEach((item: any) => {
        if (!productStats[item.id]) productStats[item.id] = { id: item.id, title: item.title, sold: 0, revenue: 0, photoUrl: item.photoUrl };
        productStats[item.id].sold += item.quantity;
        productStats[item.id].revenue += (item.quantity * item.price);
      });
    });

    return {
      daily: data,
      topSellers: Object.values(productStats).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5)
    };
  },

  seedAnalyticsData: async () => {
    const batch: any[] = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const visits = Math.floor(20 + Math.random() * 50);
      const orders = Math.random() > 0.5 ? Math.floor(Math.random() * 3) : 0;
      const revenue = orders * 85;
      
      batch.push(setDoc(doc(db, "analytics", dateStr), {
        date: dateStr,
        visits,
        orders,
        revenue,
        conversion: visits > 0 ? (orders / visits) * 100 : 0
      }));
    }
    await Promise.all(batch);
  },

  // ─────────────────────────────────────────────
  // INVENTORY SYNC  (Legacy RTDB → Firestore)
  // ─────────────────────────────────────────────
  syncInventoryFromLegacy: async () => {
    // 1.  Ensure we are authenticated against the LEGACY project.
    //     We try to re-use the credential obtained at login; if the
    //     legacyAuth session expired we trigger a silent popup.
    if (!legacyAuth.currentUser) {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        await signInWithPopup(legacyAuth, provider);
      } catch (err: any) {
        throw new Error(
          "Could not sign into legacy inventory system. Please log out and log in again."
        );
      }
    }

    // 2.  Read all books from the legacy RTDB  →  /lyrical/books/{id}
    //     Each sub-key holds:  { data: "{\"stock\": 296, ...}", ts: 1234 }
    const snapshot = await dbGet(dbRef(legacyDb, "/lyrical/books"));
    if (!snapshot.exists()) {
      throw new Error("No inventory data found in the legacy system.");
    }

    const rawBooks = snapshot.val() as Record<string, { data: string; ts: number }>;

    // Build a simple map:  legacyKey → stock
    const stockMap: Record<string, number> = {};
    for (const [bookId, payload] of Object.entries(rawBooks)) {
      try {
        const parsed = JSON.parse(payload.data || "{}");
        stockMap[bookId] = typeof parsed.stock === "number" ? parsed.stock : 0;
      } catch {
        stockMap[bookId] = 0;
      }
    }

    // 3.  Fetch all website books from Firestore
    const booksSnap = await getDocs(collection(db, "books"));

    type SyncResult = {
      id: string;
      title: string;
      slug: string;
      legacyKey: string;
      stock: number;
      matched: boolean;
    };

    const results: SyncResult[] = [];
    const batch = writeBatch(db);
    let updateCount = 0;

    for (const bookDoc of booksSnap.docs) {
      const data = bookDoc.data();
      const slug = (data.slug || "").toLowerCase().trim();
      const title = (data.title || "").toLowerCase().trim();

      // Match priority:
      //   1. Exact slug match ("hound" === "hound")
      //   2. Case-insensitive title contains or is contained in legacy key
      let legacyKey: string | undefined = Object.keys(stockMap).find(
        (k) => k.toLowerCase().trim() === slug
      );

      if (!legacyKey && title) {
        legacyKey = Object.keys(stockMap).find((k) => {
          const lk = k.toLowerCase().trim();
          return lk.includes(title) || title.includes(lk);
        });
      }

      if (legacyKey !== undefined) {
        const newStock = stockMap[legacyKey];
        batch.update(doc(db, "books", bookDoc.id), {
          stockLevel: newStock,
          updatedAt: new Date().toISOString(),
          lastInventorySync: new Date().toISOString(),
          legacyInventoryKey: legacyKey,
        });
        updateCount++;
        results.push({
          id: bookDoc.id,
          title: data.title,
          slug: data.slug,
          legacyKey,
          stock: newStock,
          matched: true,
        });
      } else {
        results.push({
          id: bookDoc.id,
          title: data.title,
          slug: data.slug,
          legacyKey: "",
          stock: data.stockLevel ?? 0,
          matched: false,
        });
      }
    }

    if (updateCount > 0) await batch.commit();

    // 4.  Persist sync metadata so the UI can show "Last synced"
    await setDoc(
      doc(db, "settings", "website"),
      {
        inventory: {
          lastSync: new Date().toISOString(),
          lastSyncCount: updateCount,
          legacyBooks: Object.keys(stockMap),
        },
      },
      { merge: true }
    );

    return {
      synced: updateCount,
      unmatched: results.filter((r) => !r.matched).length,
      legacyTotal: Object.keys(stockMap).length,
      stockMap,
      results,
    };
  },

  // ─────────────────────────────────────────────
  // PAGES  (custom website pages)
  // ─────────────────────────────────────────────
  getPages: async (): Promise<Page[]> => {
    const snap = await getDocs(collection(db, "pages"));
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    return docs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  getPageBySlug: async (slug: string): Promise<Page | null> => {
    const snap = await getDocs(
      query(collection(db, "pages"), where("slug", "==", slug), limit(1))
    );
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Page;
  },

  getPublishedPages: async (): Promise<Page[]> => {
    const snap = await getDocs(collection(db, "pages"));
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    return docs
      .filter((d) => d.status === "published")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  createPage: async (data: any) => {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, "pages"), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    return { id: docRef.id, ...data, createdAt: now, updatedAt: now };
  },

  updatePage: async (id: string, data: any) => {
    const now = new Date().toISOString();
    const payload = { ...data, updatedAt: now };
    delete payload.id;
    await updateDoc(doc(db, "pages", id), payload);
    return { id, ...payload };
  },

  deletePage: async (id: string) => {
    await deleteDoc(doc(db, "pages", id));
  },
};
