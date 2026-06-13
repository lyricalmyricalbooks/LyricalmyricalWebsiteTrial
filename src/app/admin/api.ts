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
import { functionUrl } from "../lib/functionsBase";
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

  migrateShippingProfiles: async () => {
    try {
      const snap = await getDocs(collection(db, "shipping-profiles"));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      
      const legacyDocs = docs.filter(d => !d.zones);
      if (legacyDocs.length === 0) {
        return; 
      }

      console.log("Found legacy shipping profiles, starting migration...");

      const zones = legacyDocs.map(d => {
        const rates: any[] = [
          {
            id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
            name: d.serviceName || "Standard Shipping",
            base: Number(d.base) || 0,
            additional: Number(d.additional) || 0,
            deliveryDays: d.deliveryDays || "3-7",
            minPrice: null,
            maxPrice: d.freeThreshold && Number(d.freeThreshold) > 0 ? Number(d.freeThreshold) : null
          }
        ];

        if (d.freeThreshold && Number(d.freeThreshold) > 0) {
          rates.push({
            id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
            name: "Free Shipping",
            base: 0,
            additional: 0,
            deliveryDays: d.deliveryDays || "3-7",
            minPrice: Number(d.freeThreshold),
            maxPrice: null
          });
        }

        let countries = [d.region];
        if (d.region.toLowerCase() === "everywhere else" || d.region.toLowerCase() === "international") {
          countries = ["Rest of World"];
        }

        return {
          id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
          name: d.region,
          countries,
          rates
        };
      });

      const generalProfile = {
        name: "General Shipping Profile",
        zones,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const genRef = doc(db, "shipping-profiles", "general-profile");
      await setDoc(genRef, generalProfile);

      const booksSnap = await getDocs(collection(db, "books"));
      const batch = writeBatch(db);
      booksSnap.docs.forEach(b => {
        batch.update(b.ref, {
          shippingProfileId: "general-profile",
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();

      const deleteBatch = writeBatch(db);
      legacyDocs.forEach(d => {
        if (d.id !== "general-profile") {
          deleteBatch.delete(doc(db, "shipping-profiles", d.id));
        }
      });
      await deleteBatch.commit();

      console.log("Migration completed successfully!");
      await adminApi.recordAuditLog("shipping", "Migrated database to nested shipping profiles and updated books.");
    } catch (err) {
      console.error("Migration failed:", err);
    }
  },

  createShippingProfile: async (profile: any) => {
    const docRef = await addDoc(collection(db, "shipping-profiles"), {
      name: profile.name,
      zones: profile.zones || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await adminApi.recordAuditLog("shipping", `Created shipping profile: ${profile.name}`);
    return { id: docRef.id, ...profile };
  },

  updateShippingProfile: async (id: string, profile: any) => {
    const docRef = doc(db, "shipping-profiles", id);
    const dataToSave = {
      name: profile.name,
      zones: profile.zones || [],
      updatedAt: new Date().toISOString()
    };
    await updateDoc(docRef, dataToSave);
    await adminApi.recordAuditLog("shipping", `Updated shipping profile: ${profile.name}`);
    return { id, ...profile };
  },

  deleteShippingProfile: async (id: string) => {
    if (id === "general-profile") {
      throw new Error("Cannot delete the General Shipping Profile.");
    }
    
    const booksSnap = await getDocs(collection(db, "books"));
    const batch = writeBatch(db);
    let count = 0;
    booksSnap.docs.forEach(b => {
      if (b.data().shippingProfileId === id) {
        batch.update(b.ref, { shippingProfileId: "general-profile", updatedAt: new Date().toISOString() });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }

    await deleteDoc(doc(db, "shipping-profiles", id));
    await adminApi.recordAuditLog("shipping", `Deleted shipping profile and returned ${count} books to General Profile.`);
  },

  assignProductsToShippingProfile: async (profileId: string, productIds: string[]) => {
    const batch = writeBatch(db);
    const booksSnap = await getDocs(collection(db, "books"));
    
    booksSnap.docs.forEach(b => {
      const bookData = b.data();
      const bookId = b.id;
      const currentProfileId = bookData.shippingProfileId;
      
      if (productIds.includes(bookId)) {
        if (currentProfileId !== profileId) {
          batch.update(b.ref, { shippingProfileId: profileId, updatedAt: new Date().toISOString() });
        }
      } else {
        if (currentProfileId === profileId && profileId !== "general-profile") {
          batch.update(b.ref, { shippingProfileId: "general-profile", updatedAt: new Date().toISOString() });
        }
      }
    });

    await batch.commit();
    await adminApi.recordAuditLog("shipping", `Assigned ${productIds.length} books to shipping profile: ${profileId}`);
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
    // Providers default to disconnected; flip these only once the
    // corresponding integration is actually live.
    payments: {
      testMode: false,
      stripe: {
        connected: false,
        email: "",
        publicKey: "",
        secretKey: "",
        testPublicKey: "",
        testSecretKey: "",
        applePay: false,
        googlePay: false,
        afterpay: false,
        affirm: false,
        klarna: false,
        subscriptions: false
      },
      paypal: {
        connected: false,
        email: "",
        clientId: "",
        testClientId: "",
        venmo: false,
        buyNowPayLater: false
      },
      manualMethods: [],
      footerBadges: ["visa", "mastercard", "paypal", "applepay", "googlepay"]
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
      headerBg: "",
      headerColor: "",
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
      linkColorHover: "#F61515",
      borderColor: "#B1B1AA",
      buttonColor: "#FBFBFB",
      buttonTextColor: "#020202",
      buttonHoverTextColor: "#FFFFFF",
      buttonHoverBgColor: "#C1BBBB",
      badgeTextPrimary: "#000000",
      badgeBgPrimary: "#F63737",
      badgeTextSecondary: "#000000",
      badgeBgSecondary: "#E0E0E0",
      lowInventoryColor: "#056FFA",
      customCss: "",
      customHeadHtml: "",
      customFooterScripts: "",
      // Announcements
      showAnnouncement: true,
      announcementText: "INDEPENDENT PUBLISHING HOUSE SPECIALIZING IN CONTEMPORARY PHOTOGRAPHY AND EPHEMERA",
      announcementBg: "#63BDEF",
      announcementColor: "#221717",
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
    // Random typeable ID, e.g. FRQZ-047691-K2XP. The extra segment makes IDs
    // hard to enumerate since a known ID grants read access for tracking.
    const prefix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const extra = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `${prefix}-${suffix}-${extra}`;

    // Orders default to UNPAID; only the Stripe webhook flips them to paid
    // (and records revenue analytics at that point). Firestore rules reject
    // non-admin attempts to create an order in any other state.
    await setDoc(doc(db, "orders", orderId), {
      ...order,
      orderId, // Display ID
      status: order.status || "pending_payment",
      paymentStatus: order.paymentStatus || "unpaid",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activity: [
        { type: "event", message: "Order created", createdAt: new Date().toISOString() }
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

  getShippoConfig: async () => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin to view Shippo settings.");

    const response = await fetch(functionUrl("getShippoConfig"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to load Shippo settings.");
    return result;
  },

  saveShippoConfig: async (apiToken: string) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin to save Shippo settings.");

    const response = await fetch(functionUrl("saveShippoConfig"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ apiToken }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to save Shippo settings.");
    return result;
  },

  createShippingLabel: async (orderId: string, parcel?: any) => {
    // Endpoint is admin-only on the backend; it verifies this ID token.
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin to generate labels.");

    const response = await fetch(functionUrl("createShippingLabel"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ orderId, parcel }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to generate shipping label.");
    }
    return await response.json();
  },

  // Pushes the order to the Shippo dashboard (pre-filled) and returns the
  // Shippo site URL to open so the admin can buy the label directly on Shippo.
  // Handled by the createShippingLabel endpoint via mode: "shippoOrder" so no
  // new Cloud Function deployment (and its extra IAM permission) is required.
  createShippoOrder: async (orderId: string) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin to push orders to Shippo.");

    const response = await fetch(functionUrl("createShippingLabel"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ orderId, mode: "shippoOrder" }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to push order to Shippo.");
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
    // The discounts collection is admin-only in Firestore rules, so the
    // public checkout validates codes through a Cloud Function. The server
    // re-validates again at payment time regardless.
    const response = await fetch(functionUrl("validateDiscountCode"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Invalid or expired discount code");
    }
    return data.discount;
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

    // Process referral source statistics from orders
    const referralStats: Record<string, { name: string; ordersCount: number; revenue: number }> = {};
    const dailyOrderStats: Record<string, { gross: number; net: number }> = {};

    orders.forEach((o: any) => {
      const source = (o.referralSource || "direct").trim().toLowerCase();
      if (!referralStats[source]) {
        referralStats[source] = {
          name: source.charAt(0).toUpperCase() + source.slice(1),
          ordersCount: 0,
          revenue: 0
        };
      }
      referralStats[source].ordersCount += 1;
      referralStats[source].revenue += (o.total || 0);

      // Process daily revenue curves
      if (o.createdAt) {
        const dateStr = o.createdAt.split("T")[0];
        if (!dailyOrderStats[dateStr]) {
          dailyOrderStats[dateStr] = { gross: 0, net: 0 };
        }
        dailyOrderStats[dateStr].gross += (o.subtotal || 0);
        dailyOrderStats[dateStr].net += (o.total || 0);
      }
    });

    const referralData = Object.values(referralStats).sort((a: any, b: any) => b.revenue - a.revenue);

    // Merge gross and net revenue into dailyData
    dailyData.forEach((d: any) => {
      let dateKey = d.date || "";
      if (dateKey.includes("T")) {
        dateKey = dateKey.split("T")[0];
      }
      const stats = dailyOrderStats[dateKey] || { gross: 0, net: 0 };
      d.grossRevenue = stats.gross || d.revenue || 0;
      d.netRevenue = stats.net || d.revenue || 0;
    });

    return {
      daily: dailyData,
      topSellers: Object.values(productStats).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5),
      categories: categoriesData,
      referrals: referralData
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
