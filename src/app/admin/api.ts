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
  deleteField,
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

  getBook: async (id: string) => {
    const snap = await getDoc(doc(db, "books", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
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
    await adminApi.recordAuditLog("catalog", `Created book: ${dataToSave.title}`);
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
    await adminApi.recordAuditLog("catalog", `Updated book: ${dataToSave.title}`);
    return { id, ...dataToSave };
  },

  deleteBook: async (id: string) => {
    try {
      const snap = await getDoc(doc(db, "books", id));
      const title = snap.exists() ? snap.data().title : id;
      await deleteDoc(doc(db, "books", id));
      await adminApi.recordAuditLog("catalog", `Deleted book: ${title}`);
    } catch (err) {
      await deleteDoc(doc(db, "books", id));
    }
  },

  duplicateBook: async (id: string) => {
    const docRef = doc(db, "books", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Original book not found");
    const data = snap.data();
    const newDoc = await addDoc(collection(db, "books"), {
      ...data,
      title: `${data.title} (Copy)`,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await adminApi.recordAuditLog("catalog", `Duplicated book: ${data.title}`);
    return newDoc;
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
    await adminApi.recordAuditLog("shipping", `Created shipping zone for ${profile.region}`);
    return { id: docRef.id, ...profile };
  },

  updateShippingProfile: async (id: string, profile: any) => {
    const docRef = doc(db, "shipping-profiles", id);
    await updateDoc(docRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    });
    await adminApi.recordAuditLog("shipping", `Updated shipping zone for ${profile.region}`);
    return { id, ...profile };
  },

  deleteShippingProfile: async (id: string) => {
    try {
      const snap = await getDoc(doc(db, "shipping-profiles", id));
      const region = snap.exists() ? snap.data().region : id;
      await deleteDoc(doc(db, "shipping-profiles", id));
      await adminApi.recordAuditLog("shipping", `Deleted shipping zone: ${region}`);
    } catch (err) {
      await deleteDoc(doc(db, "shipping-profiles", id));
    }
  },

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

  updateSettings: async (settings: any, options: { publish?: boolean } = {}) => {
    const docRef = doc(db, "settings", "website");
    // Deep-strip undefined values — Firestore rejects them, and editor controls
    // use `undefined` to mean "inherit / unset".
    const payload = JSON.parse(JSON.stringify({ ...settings }));
    
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
    
    await setDoc(docRef, payload, { merge: true });
    const sections = Object.keys(settings);
    await adminApi.recordAuditLog("settings", `Updated settings: ${sections.join(", ")}`);
  },

  // Schedule a design to go live at a future time. The storefront applies it
  // client-side once the time passes (see useSiteData).
  schedulePublish: (design: any, at: string) => {
    const docRef = doc(db, "settings", "website");
    const payload = { scheduledPublish: JSON.parse(JSON.stringify({ at, design })) };
    return setDoc(docRef, payload, { merge: true });
  },

  cancelScheduledPublish: () => {
    const docRef = doc(db, "settings", "website");
    return setDoc(docRef, { scheduledPublish: deleteField() }, { merge: true });
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

    // Also update daily analytics counters
    try {
      const today = new Date().toISOString().split('T')[0];
      const analyticsRef = doc(db, "analytics", today);
      const snap = await getDoc(analyticsRef);
      const data = snap.exists() ? snap.data() : { date: today, visits: 1, orders: 0, revenue: 0 };
      
      const newOrders = (data.orders || 0) + 1;
      const newRevenue = (data.revenue || 0) + (order.total || 0);
      
      await setDoc(analyticsRef, {
        ...data,
        orders: newOrders,
        revenue: newRevenue,
        conversion: (data.visits && data.visits > 0) ? (newOrders / data.visits) * 100 : 0
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to update daily analytics for order:", e);
    }

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

  createShippingLabel: async (orderId: string) => {
    const functionsUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://127.0.0.1:5001/lyricalmyrical-web-v2/us-central1/createShippingLabel"
      : "https://us-central1-lyricalmyrical-web-v2.cloudfunctions.net/createShippingLabel";

    const response = await fetch(functionsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to generate shipping label.");
    }
    return await response.json();
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
      minQuantity: discount.minQuantity ?? null,
      usageLimit: discount.usageLimit ?? null,
      usageCount: discount.usageCount ?? 0,
      onePerCustomer: discount.onePerCustomer ?? false,
      appliesTo: discount.appliesTo || "all",
      selectedCategories: discount.selectedCategories ?? [],
      selectedProducts: discount.selectedProducts ?? [],
      allowedEmailDomains: discount.allowedEmailDomains ?? "",
      allowedCustomerEmails: discount.allowedCustomerEmails ?? "",
      description: discount.description || "",
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(collection(db, "discounts"), payload);
    await adminApi.recordAuditLog("campaigns", `Created campaign: ${payload.code}`);
    return { id: docRef.id, ...payload };
  },

  updateDiscount: async (id: string, data: any) => {
    const now = new Date().toISOString();
    const payload = { ...data, updatedAt: now };
    delete payload.id;
    await updateDoc(doc(db, "discounts", id), payload);
    await adminApi.recordAuditLog("campaigns", `Updated campaign: ${payload.code || id}`);
    return { id, ...payload };
  },

  deleteDiscount: async (id: string) => {
    try {
      const snap = await getDoc(doc(db, "discounts", id));
      const code = snap.exists() ? snap.data().code : id;
      await deleteDoc(doc(db, "discounts", id));
      await adminApi.recordAuditLog("campaigns", `Deleted campaign: ${code}`);
    } catch (err) {
      await deleteDoc(doc(db, "discounts", id));
    }
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
      minQuantity: data.minQuantity ?? null,
      onePerCustomer: data.onePerCustomer ?? false,
      appliesTo: data.appliesTo ?? "all",
      selectedCategories: data.selectedCategories ?? [],
      selectedProducts: data.selectedProducts ?? [],
      allowedEmailDomains: data.allowedEmailDomains ?? "",
      allowedCustomerEmails: data.allowedCustomerEmails ?? "",
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
    const q = query(collection(db, "analytics"), orderBy("date", "desc"), limit(60));
    const snap = await getDocs(q);
    const dailyData = snap.docs.map(d => d.data()).reverse();
    
    // Also get top sellers from orders
    const ordersSnap = await getDocs(collection(db, "orders"));
    const orders = ordersSnap.docs.map(d => d.data());

    // Get all books to map IDs to categories and photos
    const booksSnap = await getDocs(collection(db, "books"));
    const books = booksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Get website settings for categories configuration
    const settingsRef = doc(db, "settings", "website");
    const settingsSnap = await getDoc(settingsRef);
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    
    // Get configured categories
    const categoriesList = settings.design?.categories || ["PUBLICATIONS", "EPHEMERA", "IMPRINT", "OUT OF PRINT"];
    
    // Build book lookup map
    const bookMap = new Map();
    books.forEach((b: any) => {
      bookMap.set(b.id, b);
    });

    // Time ranges for product trend calculation (e.g. 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const productStats: any = {};
    orders.forEach((o: any) => {
      const orderDate = new Date(o.createdAt);
      const isCurrentPeriod = orderDate >= thirtyDaysAgo;
      const isPreviousPeriod = orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;

      o.items?.forEach((item: any) => {
        const book = bookMap.get(item.id);
        const photoUrl = item.photoUrl || book?.photos?.[0]?.url || "";
        if (!productStats[item.id]) {
          productStats[item.id] = { 
            id: item.id, 
            title: item.title || book?.title || "Unknown Book", 
            sold: 0, 
            revenue: 0, 
            photoUrl,
            currentPeriodSold: 0,
            previousPeriodSold: 0
          };
        }
        productStats[item.id].sold += item.quantity;
        productStats[item.id].revenue += (item.quantity * item.price);

        if (isCurrentPeriod) {
          productStats[item.id].currentPeriodSold += item.quantity;
        } else if (isPreviousPeriod) {
          productStats[item.id].previousPeriodSold += item.quantity;
        }
      });
    });

    // Compute sales trend for each product
    Object.values(productStats).forEach((p: any) => {
      const current = p.currentPeriodSold;
      const previous = p.previousPeriodSold;
      if (previous === 0) {
        p.trend = current > 0 ? "+100%" : "0%";
      } else {
        const pct = ((current - previous) / previous) * 100;
        p.trend = `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
      }
    });

    // Process category stats
    // Accumulate total views by category from daily analytics categoryViews
    const categoryViewsAccum: Record<string, number> = {};
    dailyData.forEach((d: any) => {
      if (d.categoryViews) {
        Object.entries(d.categoryViews).forEach(([cat, count]) => {
          const formattedCat = cat.toUpperCase().trim();
          categoryViewsAccum[formattedCat] = (categoryViewsAccum[formattedCat] || 0) + (count as number);
        });
      }
    });

    // Accumulate sales & revenue by category
    const categorySalesAccum: Record<string, { sold: number; revenue: number }> = {};
    orders.forEach((o: any) => {
      o.items?.forEach((item: any) => {
        const book = bookMap.get(item.id);
        const itemCategories: string[] = book?.categories || book?.genres || [];
        const cats = itemCategories.length > 0 ? itemCategories : ["PUBLICATIONS"];
        
        cats.forEach((cat: string) => {
          const formattedCat = cat.toUpperCase().trim();
          if (!categorySalesAccum[formattedCat]) {
            categorySalesAccum[formattedCat] = { sold: 0, revenue: 0 };
          }
          categorySalesAccum[formattedCat].sold += item.quantity;
          categorySalesAccum[formattedCat].revenue += (item.quantity * item.price);
        });
      });
    });

    // Compile dynamic categories list
    const categoriesData = categoriesList.map((catItem: any) => {
      const catName = typeof catItem === "string" ? catItem : catItem.name;
      const key = (catName || "").toUpperCase().trim();
      const views = categoryViewsAccum[key] || 0;
      const sold = categorySalesAccum[key]?.sold || 0;
      const revenue = categorySalesAccum[key]?.revenue || 0;
      return {
        name: catName,
        views,
        sold,
        revenue
      };
    });

    return {
      daily: dailyData,
      topSellers: Object.values(productStats).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5),
      categories: categoriesData
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

    await adminApi.recordAuditLog("inventory", `Synchronized inventory with legacy core. ${updateCount} records updated.`);

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
    const q = query(collection(db, "pages"), where("status", "==", "published"));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    return docs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  createPage: async (data: any) => {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, "pages"), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    await adminApi.recordAuditLog("settings", `Created page: ${data.title}`);
    return { id: docRef.id, ...data, createdAt: now, updatedAt: now };
  },

  updatePage: async (id: string, data: any) => {
    const now = new Date().toISOString();
    const payload = { ...data, updatedAt: now };
    delete payload.id;
    await updateDoc(doc(db, "pages", id), payload);
    await adminApi.recordAuditLog("settings", `Updated page: ${data.title || id}`);
    return { id, ...payload };
  },

  deletePage: async (id: string) => {
    try {
      const snap = await getDoc(doc(db, "pages", id));
      const title = snap.exists() ? snap.data().title : id;
      await deleteDoc(doc(db, "pages", id));
      await adminApi.recordAuditLog("settings", `Deleted page: ${title}`);
    } catch (err) {
      await deleteDoc(doc(db, "pages", id));
    }
  },

  recordAuditLog: async (type: string, message: string) => {
    try {
      await addDoc(collection(db, "audit-log"), {
        type,
        message,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Could not save audit log:", err);
    }
  },
};
