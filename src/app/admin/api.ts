import { addressKey, addressIssues, packingKey, dispatchProblem, queueOf, fulfillmentMethod, trackingFields } from "./fulfillment";
import { themeWrite } from "./themeWrite";
import { splitWebsiteSecrets, splitNotificationSecrets, type SecretPatch } from "./privateKeys";
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
  documentId,
  limit,
  getCountFromServer,
  startAfter,
  writeBatch,
  runTransaction,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { db, auth, googleProvider } from "../../lib/firebase";
import { functionUrl } from "../lib/functionsBase";
// Storage + the legacy Realtime Database are admin-only and heavy; they are
// imported on demand so the public storefront bundle never downloads them.
const loadLegacy = () => import("../../lib/legacyFirebase");
import { CATEGORIES } from "../features/site/constants";
import { categoryBookPatch, directlyAssigned, type CategoryAction } from "./studio/categoryManager";
import { normalizeCategories } from "../features/site/navItems";
import { RISO_NOIR_ID, RISO_NOIR_TOKENS, withRisoNoirDefault } from "../features/site/risoNoir";
import type { Book, Page, SiteSettings } from "../features/site/types";
import { validateLocalFulfillment } from "../features/site/localFulfillment";
import type { LocalFulfillmentConfig } from "../features/site/types";

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
        if (credential) {
          const { legacyAuth } = await loadLegacy();
          await signInWithCredential(legacyAuth, credential);
        }
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

      const [booksCount, authorsCount, profilesCount, ordersSnapshot] = await Promise.all([
        getCountFromServer(booksColl),
        getCountFromServer(authorsColl),
        getCountFromServer(profilesColl),
        getDocs(ordersColl)
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
        totalOrders: ordersSnapshot.docs.filter(order => order.data().isTest !== true).length
      };
    } catch (err) {
      console.error("Stats Error:", err);
      return { totalBooks: 0, draftCount: 0, publishedCount: 0, shippingProfiles: 0, authors: 0, totalOrders: 0 };
    }
  },

  // Books
  // Full catalog, including drafts and records without createdAt, for category management.
  getCategoryBooks: async () => {
    const snap = await getDocs(collection(db, "books"));
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  },

  updateCategoryBooks: async (ids: string[], source: any, action: CategoryAction, target?: any) => {
    if (auth.currentUser?.email !== "lyricalmyricalbooks@gmail.com") throw new Error("Admin sign-in is required.");
    const unique = [...new Set(ids)];
    if (unique.length > 400) throw new Error("More than 400 books are assigned here. Use Edit → Assigned here to move or remove up to 400 at a time, then retry deletion. No books were changed.");
    if (!source?.name || (action === "move" && (!target?.name || target.id === source.id))) throw new Error("Choose a different destination category.");
    if (!["add", "remove", "move"].includes(action)) throw new Error("Choose a valid category action.");
    // Read fresh tag fields and commit atomically. Concurrent catalog edits are
    // retried, and inventory/prices/other book fields are never included in the patch.
    return runTransaction(db, async transaction => {
      const settings = await transaction.get(doc(db, "settings", "website"));
      const live = normalizeCategories(settings.data()?.design?.categories ?? [...CATEGORIES]);
      const liveSource = live.find(c => c.id === source.id);
      const liveTarget = action === "move" ? live.find(c => c.id === target.id) : liveSource;
      if (!liveSource || ((action === "add" || action === "move") && !liveTarget))
        throw new Error("Publish newly added categories before saving their book assignments.");
      const effectiveSource = { ...source, aliases: [...new Set([...(source.aliases || []), liveSource.name, ...(liveSource.aliases || [])])] };
      const snapshots = await Promise.all(unique.map(id => transaction.get(doc(db, "books", id))));
      if (snapshots.some(s => !s.exists())) throw new Error("A selected book was deleted. Reload the catalog and try again.");
      return snapshots.map(snapshot => {
        const book = snapshot.data();
        if (action !== "add" && !directlyAssigned(book, effectiveSource)) return { ...book, id: snapshot.id };
        // Add uses the published name, so Discard Draft cannot orphan the tags.
        const patch = categoryBookPatch(book, action === "add" ? liveSource : effectiveSource, action, liveTarget);
        transaction.update(snapshot.ref, { ...patch, updatedAt: new Date().toISOString() });
        return { ...book, ...patch, id: snapshot.id };
      });
    });
  },

  // Document-ID ordering includes legacy books without createdAt and gives
  // public pagination the same membership as the sitemap, without writes.
  getStorefrontBooks: async (limitCount = 100, lastVisible = null) => {
    const constraints = [orderBy(documentId()), ...(lastVisible ? [startAfter(lastVisible)] : []), limit(limitCount)];
    const snap = await getDocs(query(collection(db, "books"), ...constraints));
    return snap.docs.map(d => ({ ...d.data(), id: d.id, _lastDoc: d }));
  },

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
      // A copied slug would collide with the original and push its public URL to /books/<id>.
      slug: "",
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
    const [{ getStorage, ref, uploadBytes, getDownloadURL }, { getApp }] = await Promise.all([
      import("firebase/storage"),
      import("firebase/app"),
    ]);
    const storageRef = ref(getStorage(getApp()), path);
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
    const merged: any = { ...defaultSettings, ...snap.data() };
    // Move any secret keys still sitting in the public doc into adminSecrets, then
    // expose only "stored" flags to the admin UI.
    const raw: any = snap.data() || {};
    if (raw.payments?.stripe?.secretKey || raw.payments?.stripe?.testSecretKey || raw.communications?.resendApiKey) {
      const legacy: any = {};
      if (raw.payments) legacy.payments = raw.payments;
      if (raw.communications) legacy.communications = raw.communications;
      const { publicSettings, secrets } = splitWebsiteSecrets(legacy);
      try {
        await adminApi.writePrivateKeys(secrets);
        await setDoc(docRef, publicSettings, { mergeFields: Object.keys(publicSettings) });
        Object.assign(merged, publicSettings);
      } catch (err) { console.warn("Could not move secret keys out of public settings:", err); }
    }
    const flags = await adminApi.getPrivateKeyFlags();
    merged.payments = { ...merged.payments, stripe: { ...(merged.payments?.stripe || {}), secretKeyStored: flags.stripeLive, testSecretKeyStored: flags.stripeTest } };
    merged.communications = { ...merged.communications, resendApiKeyStored: flags.resend };
    // Older designs never chose a themeStyle: render them in Riso Noir (content untouched).
    if (merged.design) merged.design = withRisoNoirDefault(merged.design);
    if (merged.draftDesign) merged.draftDesign = withRisoNoirDefault(merged.draftDesign);
    return merged;
  },

  updateLocalFulfillment: async (config: LocalFulfillmentConfig) => {
    if (auth.currentUser?.email !== "lyricalmyricalbooks@gmail.com" || !auth.currentUser.emailVerified) throw new Error("Unauthorized local fulfillment update.");
    const errors = validateLocalFulfillment(config);
    if (errors.length) throw new Error(errors.join(" "));
    await setDoc(doc(db, "settings", "website"), { localFulfillment: JSON.parse(JSON.stringify(config)) }, { mergeFields: ["localFulfillment"] });
  },

  updateSettings: async (settings: any, options: { publish?: boolean } = {}) => {
    const docRef = doc(db, "settings", "website");
    const { publicSettings, secrets } = splitWebsiteSecrets(settings);
    await adminApi.writePrivateKeys(secrets);
    const { payload, options: writeOptions } = themeWrite(publicSettings, options.publish);
    await setDoc(docRef, payload, writeOptions);
    // The primary write already succeeded. An audit failure must not report a
    // failed publish and encourage a duplicate operation.
    await adminApi.recordAuditLog("settings", `Updated settings: ${Object.keys(settings).join(", ")}`).catch(error => console.warn("Settings saved; audit log unavailable", error));
  },

  // Categories are catalog structure, not a theme draft. Keep the published
  // storefront and Studio working copy in lockstep without replacing either
  // design map (which could otherwise discard unrelated unsaved design work).
  updateShopCategories: async (categories: any[]) => {
    const docRef = doc(db, "settings", "website");
    const snapshot = JSON.parse(JSON.stringify(categories));
    await setDoc(docRef, { design: { categories: snapshot }, draftDesign: { categories: snapshot } },
      { mergeFields: ["design.categories", "draftDesign.categories"] });
    await adminApi.recordAuditLog("settings", `Updated shop categories (${snapshot.length})`).catch(error => console.warn("Categories saved; audit log unavailable", error));
  },

  // Flip the storefront "under construction" wall live, keeping the Studio
  // draft in step so the next Publish doesn't silently undo it.
  setUnderConstruction: async (on: boolean) => {
    const docRef = doc(db, "settings", "website");
    await setDoc(docRef, { design: { showUnderConstruction: on }, draftDesign: { showUnderConstruction: on } },
      { mergeFields: ["design.showUnderConstruction", "draftDesign.showUnderConstruction"] });
    await adminApi.recordAuditLog("settings", `Under construction wall ${on ? "on" : "off"}`).catch(error => console.warn("Saved; audit log unavailable", error));
  },

  // Replace the work-in-progress theme with the currently published theme.
  // Keeping draftDesign populated (rather than deleting it) makes subsequent
  // editor loads deterministic and prevents an old draft from resurfacing.
  discardThemeDraft: async (publishedDesign: any) => {
    const docRef = doc(db, "settings", "website");
    const draftDesign = JSON.parse(JSON.stringify(publishedDesign));
    await setDoc(docRef, { draftDesign }, { mergeFields: ["draftDesign"] });
    await adminApi.recordAuditLog("settings", "Discarded unpublished theme changes").catch(error => console.warn("Draft discarded; audit log unavailable", error));
  },

  // ── Theme version history (persisted so it survives reloads) ──
  THEME_VERSION_LIMIT: 30,

  saveThemeVersion: async (kind: "draft" | "published", label: string, design: any) => {
    const createdAt = new Date().toISOString();
    const snapshot = JSON.parse(JSON.stringify(design));
    const ref = await addDoc(collection(db, "theme-versions"), { kind, label, createdAt, design: snapshot });
    // Best-effort pruning of anything past the retention limit.
    try {
      const snap = await getDocs(query(collection(db, "theme-versions"), orderBy("createdAt", "desc")));
      const stale = snap.docs.slice(adminApi.THEME_VERSION_LIMIT);
      await Promise.all(stale.map((d: any) => deleteDoc(doc(db, "theme-versions", d.id))));
    } catch (err) {
      console.warn("Could not prune theme versions:", err);
    }
    return { id: ref.id, kind, label, createdAt, design: snapshot };
  },

  listThemeVersions: async () => {
    const snap = await getDocs(
      query(collection(db, "theme-versions"), orderBy("createdAt", "desc"), limit(adminApi.THEME_VERSION_LIMIT)),
    );
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
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
    localFulfillment: { enabled: false, pickupLocations: [], deliveryZones: [] },
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
      // On by default on the product page (Style › Product page layout / Storefront elements).
      showRelatedProducts: true,
      showRecentlyViewed: true,
      // Custom pages (Studio › Style › Custom pages): on by default, so the toggles show as on.
      pageShowEyebrow: true, pageTitleUppercase: true,
      primaryColor: "#e8402a",
      font: "Archivo",
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
      headerLinks: {
        showEnterArchive: true,
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
      },
      // Riso Noir last so its tokens win over the legacy literals above.
      ...RISO_NOIR_TOKENS,
      themeLibraryPreset: RISO_NOIR_ID,
    }
  }),

  // Audit Log
  getAuditLog: async (limitCount = 100) => {
    const q = query(collection(db, "audit-log"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ORDERS
  getFulfillmentOrders: async () => {
    const orders: any[] = [];
    let cursor: any = null;
    while (true) {
      const page = await adminApi.getOrders(200, cursor);
      orders.push(...page);
      if (page.length < 200) break;
      cursor = page[page.length - 1]._lastDoc;
    }
    const operations = await getDocs(collection(db, "order-operations"));
    const byId = new Map(operations.docs.map(d => [d.id, d.data()]));
    return orders.map(o => ({ ...o, operations: byId.get(o.id) || {} }));
  },

  correctOrderAddress: async (id: string, address: any, originalKey: string) => {
    await runTransaction(db, async tx => {
      const ref = doc(db, "orders", id);
      const privateRef = doc(db, "order-operations", id);
      const snap = await tx.get(ref);
      const privateSnap = await tx.get(privateRef);
      if (!snap.exists()) throw new Error("Order no longer exists.");
      const o: any = snap.data();
      const method = o.fulfillmentSelection?.method;
      if (method === "pickup") throw new Error("Pickup orders use the selected store address and do not have a customer shipping address to change.");
      if (o.status === "completed" || o.status === "cancelled" || o.paymentStatus !== "paid" || o.isTest || o.labelUrl || ["shipped", "out_for_delivery", "delivered"].includes(o.fulfillmentStatus)) throw new Error("Address changes are unavailable after label purchase or dispatch.");
      if (addressKey(o) !== originalKey) throw new Error("The address changed. Reload the order first.");
      const cleaned = Object.fromEntries(["street", "city", "state", "zip", "country"].map(k => [k, String(address[k] || "").trim().slice(0, 200)]));
      const oldAddress = o.customer?.address || {};
      if (method === "local_delivery" && ["state", "zip", "country"].some(key => String(cleaned[key] || "").trim().toLowerCase() !== String(oldAddress[key] || "").trim().toLowerCase())) throw new Error("For a paid local delivery, province, postal code and country cannot change. Cancel and refund this order, then place a new order for the new area.");
      const problems = addressIssues({ customer: { address: cleaned } });
      if (problems.length) throw new Error(problems.join(" "));
      const now = new Date().toISOString();
      tx.update(ref, { "customer.address": cleaned, addressVerified: deleteField(), addressError: deleteField(), updatedAt: now });
      const data = privateSnap.data() || {};
      if (data.labelPurchasePending) throw new Error("Wait for label purchase reconciliation before correcting the address.");
      // The publisher just typed and checked this address, so it counts as reviewed.
      tx.set(privateRef, { ...data, addressReviewed: addressKey({ customer: { address: cleaned } }), updatedAt: now, activity: [...(data.activity || []), { type: "event", message: "Shipping address corrected and confirmed by publisher.", createdAt: now }] });
    });
  },

  fulfillmentAction: async (id: string, action: "review" | "pack" | "hold" | "release" | "dispatch" | "local_transition" | "edit_tracking" | "delivery_status" | "resend_shipping_email", payload: any = {}) => {
    await runTransaction(db, async tx => {
      const ref = doc(db, "orders", id);
      const privateRef = doc(db, "order-operations", id);
      const snap = await tx.get(ref);
      const privateSnap = await tx.get(privateRef);
      if (!snap.exists()) throw new Error("Order no longer exists.");
      const operations: any = privateSnap.data() || {};
      const o: any = { ...snap.data(), operations };
      const now = new Date().toISOString();
      if (o.paymentStatus !== "paid" || o.status === "cancelled" || o.isTest === true || ["cancelled", "refunded"].includes(o.fulfillmentStatus)) throw new Error("Only active paid production orders can be prepared.");
      let message = "";
      if (action === "review") {
        if (queueOf(o) === "In transit" || queueOf(o) === "Completed") throw new Error("This order has already been dispatched.");
        if (addressIssues(o).length) throw new Error(addressIssues(o).join(" "));
        if (payload.addressKey !== addressKey(o)) throw new Error("The address changed. Reload and review it again.");
        operations.addressReviewed = addressKey(o); message = "Shipping address reviewed by publisher.";
      } else if (action === "pack") {
        if (queueOf(o) !== "Ready to pack") throw new Error("Review the address and release any hold before packing.");
        if (payload.packingKey !== packingKey(o)) throw new Error("Items changed. Reload the checklist.");
        operations.packed = packingKey(o); operations.packedAt = now; message = "All items packed and checked.";
        tx.update(ref, { fulfillmentStatus: "processing", updatedAt: now });
      } else if (action === "hold") {
        if (!["Needs attention", "Ready to pack", "Ready to ship"].includes(queueOf(o))) throw new Error("Only undispatched orders can be held.");
        if (!String(payload.reason || "").trim()) throw new Error("Enter a hold reason.");
        operations.hold = String(payload.reason).trim().slice(0, 500); message = `Order held: ${operations.hold}`;
      } else if (action === "release") { operations.hold = ""; message = "Fulfillment hold released.";
      } else if (action === "dispatch") {
        const problem = dispatchProblem(o); if (problem) throw new Error(problem);
        const tracking = trackingFields(payload);
        tx.update(ref, { status: "completed", fulfillmentStatus: "shipped", ...tracking, shippedAt: now, updatedAt: now });
        message = `Dispatched via ${tracking.trackingCarrier}. Tracking: ${tracking.trackingNumber}`;
      } else if (action === "edit_tracking") {
        if (fulfillmentMethod(o) !== "shipping" || queueOf(o) !== "In transit") throw new Error("Tracking can only be corrected while the parcel is in transit.");
        if (o.labelUrl) throw new Error("This order has a Shippo label. Its tracking comes from Shippo.");
        const tracking = trackingFields(payload);
        tx.update(ref, { ...tracking, updatedAt: now });
        message = `Tracking corrected: ${tracking.trackingCarrier} · ${tracking.trackingNumber}`;
      } else if (action === "resend_shipping_email") {
        if (fulfillmentMethod(o) !== "shipping" || queueOf(o) !== "In transit" || o.fulfillmentStatus === "delivered") throw new Error("The shipping email can only be resent while the parcel is in transit.");
        if (!String(o.trackingNumber || "").trim()) throw new Error("Add tracking before resending the shipping email.");
        tx.update(ref, { shippingEmailRequestedAt: now, updatedAt: now });
        message = `Shipping email resent to ${o.customer?.email || "the customer"}.`;
      } else if (action === "delivery_status") {
        if (fulfillmentMethod(o) !== "shipping" || queueOf(o) !== "In transit") throw new Error("Only shipped parcels in transit can be updated.");
        const next = String(payload.status || "");
        if (!["out_for_delivery", "delivered"].includes(next) || next === o.fulfillmentStatus) throw new Error("Choose a new delivery status.");
        tx.update(ref, { fulfillmentStatus: next, ...(next === "delivered" ? { deliveredAt: now } : { outForDeliveryAt: now }), updatedAt: now });
        message = next === "delivered" ? "Marked delivered by publisher." : "Marked out for delivery by publisher.";
      } else if (action === "local_transition") {
        const method = o.fulfillmentSelection?.method;
        if (!['pickup', 'local_delivery'].includes(method)) throw new Error("Only local orders can use this workflow.");
        const current = String(o.fulfillmentStatus || "");
        if (current !== String(payload.expectedStatus || "")) throw new Error("This order changed. Reload before continuing.");
        if (operations.hold) throw new Error("Release the fulfillment hold before continuing.");
        if (operations.packed !== packingKey(o)) throw new Error("Complete the packing checklist first.");
        if (method === "local_delivery" && (addressIssues(o).length || operations.addressReviewed !== addressKey(o))) throw new Error("Review and confirm the delivery address first.");
        const next = method === "pickup"
          ? ({ "": "ready_for_pickup", processing: "ready_for_pickup", ready_for_pickup: "collected" } as Record<string, string>)[current]
          : ({ "": "ready_for_delivery", processing: "ready_for_delivery", ready_for_delivery: "out_for_delivery", out_for_delivery: "delivered" } as Record<string, string>)[current];
        if (!next) throw new Error("This local order has already reached its final handoff state.");
        const final = ["collected", "delivered"].includes(next);
        const timestamps = next === "ready_for_pickup" ? { readyForPickupAt: now }
          : next === "collected" ? { collectedAt: now }
          : next === "ready_for_delivery" ? { readyForDeliveryAt: now }
          : next === "out_for_delivery" ? { outForDeliveryAt: now }
          : { deliveredAt: now };
        tx.update(ref, { fulfillmentStatus: next, ...(final ? { status: "completed" } : {}), ...timestamps, updatedAt: now });
        message = `Local fulfillment advanced to ${next}.`;
      }
      tx.set(privateRef, { ...operations, updatedAt: now, activity: [...(operations.activity || []), { type: "event", message, createdAt: now }] });
    });
  },

  getOrders: async (limitCount = 50, lastVisible = null) => {
    let q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(limitCount));
    if (lastVisible) {
      q = query(collection(db, "orders"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(limitCount));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data(), _lastDoc: d }));
  },

  deleteTestOrders: async (orderIds: string[]) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin to delete test orders.");
    const response = await fetch(functionUrl("deleteTestOrders"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ orderIds }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to delete test orders.");
    return result;
  },

  // Owner-initiated removal of orders (any state). Firestore rules allow admin
  // deletes. This only removes records: it does not refund, restock or touch Stripe.
  deleteOrders: async (orderIds: string[]) => {
    let deleted = 0;
    const failed: string[] = [];
    for (const id of orderIds) {
      try {
        const snap = await getDoc(doc(db, "orders", id));
        const label = snap.exists() ? (snap.data().orderId || id) : id;
        await deleteDoc(doc(db, "orders", id));
        try { await deleteDoc(doc(db, "order-operations", id)); } catch { /* none to remove */ }
        deleted += 1;
        try { await adminApi.recordAuditLog("orders", `Deleted order: ${label}`); } catch { /* best effort */ }
      } catch {
        failed.push(id);
      }
    }
    return { deleted, failed };
  },

  registerStripePaymentDomain: async (origin: string) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin.");
    const response = await fetch(functionUrl("createStripeCheckoutSession"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ action: "registerPaymentDomain", origin }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Couldn't register the domain with Stripe.");
    return result as { domain: string; applePay: string; googlePay: string };
  },

  // Storefront (thank-you page, /track): the order record only. Guests may read an
  // order by ID, but order-operations is admin-only and would deny the whole read.
  getPublicOrder: async (id: string) => {
    const snap = await getDoc(doc(db, "orders", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  // Admin only: the order plus its private fulfillment record.
  getOrderById: async (id: string) => {
    const docRef = doc(db, "orders", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const operations = await getDoc(doc(db, "order-operations", id));
    return { id: snap.id, ...snap.data(), operations: operations.data() || {} };
  },

  createOrder: async (order: any) => {
    // Random typeable ID, e.g. FRQZ-047691-K2XP. The extra segment makes IDs
    // hard to enumerate since a known ID grants read access for tracking.
    const prefix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const extra = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `${prefix}-${suffix}-${extra}`;

    // Orders default to UNPAID; only a verified payment-provider capture
    // handled by Cloud Functions flips them to paid and records revenue.
    // Firestore rules reject non-admin attempts to create any other state.
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
    await runTransaction(db, async tx => {
      const ref = doc(db, "order-operations", id);
      const snap = await tx.get(ref);
      const data = snap.data() || {};
      tx.set(ref, { ...data, activity: [...(data.activity || []), { type: "note", message: message.trim().slice(0, 2000), createdAt: new Date().toISOString() }] });
    });
  },

  addOrderEvent: async (id: string, message: string) => {
    await runTransaction(db, async tx => {
      const ref = doc(db, "order-operations", id);
      const snap = await tx.get(ref);
      const data = snap.data() || {};
      tx.set(ref, { ...data, activity: [...(data.activity || []), { type: "event", message, createdAt: new Date().toISOString() }] });
    });
  },

  refundOrder: async (orderId: string, options?: { reason?: string; restock?: boolean }) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin to refund an order.");

    const response = await fetch(functionUrl("refundOrder"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId,
        reason: options?.reason || "Admin refund",
        restock: options?.restock !== false,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Stripe refund failed.");
    return result;
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

  setShippoDynamicRates: async (enabled: boolean, countries?: string[]) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin to save Shippo settings.");

    const response = await fetch(functionUrl("setShippoDynamicRates"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ enabled, ...(countries ? { countries } : {}) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to update Shippo dynamic rates setting.");
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

  // Secret API keys live only in the admin-only adminSecrets collection.
  writePrivateKeys: async (secrets: SecretPatch) => {
    if (secrets.stripe) await setDoc(doc(db, "adminSecrets", "stripe"), { ...secrets.stripe, updatedAt: serverTimestamp() }, { merge: true });
    if (secrets.resend) await setDoc(doc(db, "adminSecrets", "resend"), { ...secrets.resend, updatedAt: serverTimestamp() }, { merge: true });
  },

  getRecentEmailLog: async (count = 5) => {
    const snap = await getDocs(query(collection(db, "emailLog"), orderBy("at", "desc"), limit(count)));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  },

  getPrivateKeyFlags: async () => {
    const read = async (id: string) => { try { const s = await getDoc(doc(db, "adminSecrets", id)); return s.exists() ? s.data() as any : {}; } catch { return {}; } };
    const [stripe, resend] = await Promise.all([read("stripe"), read("resend")]);
    return { stripeLive: !!stripe.secretKey, stripeTest: !!stripe.testSecretKey, resend: !!resend.apiKey };
  },

  /** Save settings/notifications with the Resend key moved to adminSecrets. */
  saveNotificationSettings: async (data: Record<string, any>) => {
    const { publicData, secrets } = splitNotificationSecrets(data);
    await adminApi.writePrivateKeys(secrets);
    await setDoc(doc(db, "settings", "notifications"), publicData);
    return publicData;
  },

  // Which customer emails are switched on (Settings › Notifications); used for dispatch previews.
  getNotificationSettings: async () => {
    const snap = await getDoc(doc(db, "settings", "notifications"));
    return (snap.exists() ? snap.data() : {}) as Record<string, any>;
  },

  getCanadaPostLabelRates: async (orderId: string, parcel?: any) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin to view label rates.");
    const response = await fetch(functionUrl("createShippingLabel"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ orderId, mode: "rates", parcel }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to load Canada Post rates.");
    return result;
  },

  buyCanadaPostLabel: async (orderId: string, shipmentId: string, rateId: string) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin to buy labels.");
    const response = await fetch(functionUrl("createShippingLabel"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ orderId, mode: "purchase", shipmentId, rateId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to buy the Canada Post label.");
    return result;
  },

  markOrderPaid: async (orderId: string) => {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("You must be signed in as admin.");
    const response = await fetch(functionUrl("markOrderPaid"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ orderId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to mark order as paid.");
    return result;
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
      startDate: discount.startDate || null,
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
      buyQuantity: discount.buyQuantity ?? null,
      getQuantity: discount.getQuantity ?? null,
      getDiscountValue: discount.getDiscountValue ?? null,
      tiers: discount.tiers ?? null,
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
    const settingsRef = doc(db, "settings", "website");

    // ⚡ Bolt Performance Optimization: Fetch all independent data concurrently
    // Expected impact: Eliminates waterfall queries, loading analytics ~3-4x faster
    const [snap, ordersSnap, booksSnap, settingsSnap] = await Promise.all([
      getDocs(q),
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "books")),
      getDoc(settingsRef)
    ]);

    const dailyData = snap.docs.map(d => d.data()).reverse();
    
    // Also get top sellers from orders
    // Paid, real orders only: unpaid checkouts and test orders must not inflate sales figures.
    const orders = ordersSnap.docs.map(d => d.data()).filter((order: any) => order.isTest !== true && order.paymentStatus === "paid");

    // Get all books to map IDs to categories and photos
    const books = booksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Get website settings for categories configuration
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

  // Audience signals for the Overview (admin-only reads per firestore.rules).
  getAudienceSnapshot: async () => {
    const [reviewsSnap, subsSnap] = await Promise.all([
      getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(200))),
      getDocs(query(collection(db, "newsletter"), limit(2000))),
    ]);
    return {
      reviews: reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      subscribers: subsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
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
    const [{ legacyDb, legacyAuth }, { ref: dbRef, get: dbGet }] = await Promise.all([
      loadLegacy(),
      import("firebase/database"),
    ]);
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
