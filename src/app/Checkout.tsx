import { regionProps } from "./features/site/storefrontRegions";
import { canadaPostRates } from "./features/site/canadaPostRates";
import { resolveSurfaceDesign } from "./features/site/surfaceDesign";
import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import { useCart } from "./CartContext";
import {
  ChevronLeft, Tag, ShieldCheck, X, AlertCircle,
  Package, Truck, CheckCircle2, Loader2, Lock, Building, Check
} from "lucide-react";
import { motion } from "motion/react";
import { adminApi } from "./admin/api";
import { abandonedCartApi, funnelApi } from "./lib/commerce";
import { functionUrl } from "./lib/functionsBase";
import { useSEO } from "./lib/seo";
import { useCurrency } from "./CurrencyContext";
import { COUNTRIES } from "./features/site/shippingZones";
import { quoteShipping, parseWeightGrams } from "./features/site/shippingEngine";
import { TemplateSections, GlobalSections } from "./components/sectionRender";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, collection } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { StorefrontThemeStyle } from "./features/site/StorefrontThemeStyle";
import { getCopy, CopyError, copyErrorText } from "./features/site/storeCopy";
import { DEFAULT_SETTINGS } from "./features/site/constants";
import { StripeCardForm, type StripeCardFormHandle } from "./features/site/StripeCardForm";
import { StripePaymentSection } from "./features/site/StripePaymentSection";
import { isStripePublishableKey, stripeCheckoutState, createCheckoutSubmission } from "./features/site/stripeLifecycle";
import { searchAddresses, type AddressSuggestion } from "./features/site/addressSuggest";
import { arrivalDateLabel, freeShippingGap } from "./features/site/checkoutNudges";
import { guessCountryName, parsePinned } from "./features/site/countryPicker";
import { CountryField } from "./features/site/CountryField";
import { designNumber } from "./features/site/designNumber";
import { provinceFromPostal, cleanRegion, regionsFor } from "./features/site/postalRegion";
import { readSiteCache } from "./features/site/siteCache";
import { loadCatalog } from "./features/site/loadCatalog";
import { quoteLocalFulfillment } from "./features/site/localFulfillment";
import { catalogFulfillmentItems, discountedPhysicalSubtotal } from "./features/site/checkoutFulfillment";
import { FulfillmentMethodPicker, bestFirst, type FulfillmentSelection } from "./features/site/FulfillmentMethodPicker";

// ─── State / province drop-down for countries with a fixed list ──────────────
function RegionField({ value, onChange, label, choose, regions }: { value: string; onChange: (v: string) => void; label: string; choose: string; regions: [string, string][] }) {
  // Saved addresses may hold the full name ("Ontario"); match it to its code.
  const match = regions.find(([code, name]) => code === value.toUpperCase() || name.toLowerCase() === value.toLowerCase());
  return (
    <div className="relative">
      <select
        value={match ? match[0] : ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        autoComplete="address-level1"
        required
        className="peer w-full rounded-lg border border-slate-300 bg-white px-3.5 pb-2 pt-6 text-sm text-slate-900 outline-none transition focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)] appearance-none cursor-pointer"
      >
        <option value="" className="bg-white text-slate-900">{choose}</option>
        {regions.map(([code, name]) => (
          <option key={code} value={code} className="bg-white text-slate-900">{name}</option>
        ))}
      </select>
      <label className="absolute left-3.5 top-2 text-xs text-slate-500 pointer-events-none">{label}</label>
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs">▾</span>
    </div>
  );
}


// ─── Reusable input ───────────────────────────────────────────────────────────
function Field({
  label, type = "text", value, onChange, placeholder, autoComplete, inputMode, required
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  autoComplete?: string; inputMode?: any; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        aria-label={label}
        className="peer w-full rounded-lg border border-slate-300 bg-white px-3.5 pb-2 pt-6 text-sm text-slate-900 outline-none transition focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)] placeholder-transparent"
      />
      <label className={`absolute left-3.5 pointer-events-none transition-all duration-150
        ${focused || filled
          ? "top-2 text-xs text-slate-500"
          : "top-1/2 -translate-y-1/2 text-sm text-slate-500"
        }`}>
        {label}
      </label>
    </div>
  );
}

// ─── Street address with suggestions while typing ────────────────────────────
function AddressField({ label, value, country, onChange, onPick, listLabel, attribution }: {
  label: string; value: string; country: string;
  onChange: (v: string) => void; onPick: (s: AddressSuggestion) => void;
  listLabel: string; attribution: string;
}) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current || value.trim().length < 4) { setItems([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchAddresses(value, country, ctrl.signal)
        .then(list => { setItems(list); setActive(-1); setOpen(list.length > 0); })
        .catch(() => {});
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value, country]);

  const pick = (s: AddressSuggestion) => { typed.current = false; setOpen(false); setItems([]); onPick(s); };

  return (
    <div className="relative"
      onKeyDown={e => {
        if (!open || items.length === 0) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => (a + 1) % items.length); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => (a <= 0 ? items.length - 1 : a - 1)); }
        else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(items[active]); }
        else if (e.key === "Escape") setOpen(false);
      }}
      onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <Field label={label} value={value} onChange={v => { typed.current = true; onChange(v); }} autoComplete="street-address" required />
      {open && (
        <ul role="listbox" aria-label={listLabel} data-studio-target="style:checkout" data-studio-label="Address suggestions"
          className="fm-address-suggest absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-lg">
          {items.map((s, i) => (
            <li key={s.label} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => pick(s)}
                className={`block w-full px-3.5 py-2.5 text-left text-sm text-slate-900 ${i === active ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                {s.label}
              </button>
            </li>
          ))}
          {attribution && <li className="px-3.5 py-1.5 text-[10px] text-slate-500">{attribution}</li>}
        </ul>
      )}
    </div>
  );
}

// ─── Step badge ───────────────────────────────────────────────────────────────
function StepBadge({ n, label }: { n: string; label: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{label}</h2>
      <span className="text-xs font-medium text-slate-400">{n}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Checkout() {
  const { cart, cartTotal, cartCount, clearCart, setCart } = useCart();
  const { currency, formatPrice, convertPrice } = useCurrency();

  const [isApplying, setIsApplying]     = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const submitPurchase = useRef(createCheckoutSubmission());
  const purchaseNavigating = useRef(false);
  const [orderNote, setOrderNote] = useState("");
  // Announced inline message (replaces alert()); tone drives colour, glyph + words carry the meaning.
  const [notice, setNotice] = useState<null | { tone: "error" | "info"; text: string }>(null);
  const [isSuccess, setIsSuccess]       = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [manualOrderReturn, setManualOrderReturn] = useState(false);
  const [orderNumber, setOrderNumber]   = useState("");

  const [discountCode, setDiscountCode]       = useState("");
  // Hidden behind a "Have a code?" link so shoppers without one don't leave to hunt for one.
  const [discountOpen, setDiscountOpen]       = useState(false);
  // Order summary on phones starts collapsed unless Studio says otherwise.
  const [summaryOpen, setSummaryOpen]         = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [discountError, setDiscountError]     = useState("");
  const [shippoRatesLoading, setShippoRatesLoading] = useState(false);


  const [customer, setCustomer] = useState({
    name: "", email: "", phone: "",
    address: { street: "", city: "", state: "", zip: "", country: guessCountryName() || "Canada" },
    billingAddress: { state: "", country: "Canada" }
  });

  const [taxCost, setTaxCost] = useState(0);
  const [shippingProfiles, setShippingProfiles] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  // Reuse the storefront's same-session snapshot immediately. Checkout still
  // refreshes in the background, but returning to/from it no longer waits for
  // duplicate settings and catalog reads before it can paint.
  const cachedSite = useMemo(() => readSiteCache(), []);
  const [books, setBooks] = useState<any[]>(() => cachedSite?.books || []);
  const [settings, setSettings] = useState<any>(() => cachedSite?.settings || null);
  // Until the saved settings arrive (or if they never do) checkout wears the Riso Noir defaults.
  const checkoutDesign = resolveSurfaceDesign(settings?.design ?? DEFAULT_SETTINGS.design, "/checkout");
  useEffect(() => { if (settings?.design?.checkoutSummaryOpenOnPhones) setSummaryOpen(true); }, [settings?.design?.checkoutSummaryOpenOnPhones]);
  const c = (key: string, vars?: Record<string, string | number>) => getCopy(checkoutDesign, key, vars);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("stripe");
  const [successOrder, setSuccessOrder] = useState<any>(null);
  // Stripe card form shown on this page; a failed attempt keeps its order +
  // PaymentIntent so retrying with the same bag doesn't create another order.
  const cardFormRef = useRef<StripeCardFormHandle>(null);
  const [cardState, setCardState] = useState<"loading" | "ready" | "error">("loading");
  const [cardFormAttempt, setCardFormAttempt] = useState(0);
  const [inlineAttemptStarted, setInlineAttemptStarted] = useState(false);
  const pendingCardOrder = useRef<{ key: string; orderId: string; clientSecret: string } | null>(null);
  const stripePublicKey: string = (settings?.payments?.testMode
    ? settings?.payments?.stripe?.testPublicKey
    : settings?.payments?.stripe?.publicKey) || "";
  // Stripe fields stay inline regardless of older saved redirect settings.
  const pinnedCountryCodes = useMemo(() => parsePinned(checkoutDesign.checkoutPinnedCountries || undefined), [checkoutDesign.checkoutPinnedCountries]);
  const stripeKeyValid = isStripePublishableKey(stripePublicKey, Boolean(settings?.payments?.testMode));
  const stripeRoute = stripeCheckoutState({
    keyValid: stripeKeyValid,
    cardState,
    paymentStarted: inlineAttemptStarted,
  });
  const useCardForm = stripeRoute.inline;

  const [currentUser, setCurrentUser] = useState<any>(null);

  // ⚡ Bolt: Cache book catalog in an O(1) Map to prevent O(N * M)
  // nested lookups during checkout cart and discount iteration.
  const booksMap = useMemo(() => {
    const map = new Map<string, any>();
    books.forEach(b => map.set(b.id, b));
    return map;
  }, [books]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (u) {
        try {
          const profRef = doc(db, "customers", u.uid);
          const profSnap = await getDoc(profRef);
          if (profSnap.exists()) {
            const data = profSnap.data();
            setCustomer(prev => ({
              name: data.name || u.displayName || prev.name,
              email: u.email || prev.email,
              phone: data.phone || prev.phone,
              billingAddress: prev.billingAddress,
              address: {
                street: data.defaultAddress?.street || prev.address.street,
                city: data.defaultAddress?.city || prev.address.city,
                state: cleanRegion(data.defaultAddress?.state) || prev.address.state,
                zip: data.defaultAddress?.zip || prev.address.zip,
                country: data.defaultAddress?.country || prev.address.country,
              }
            }));
          } else {
            setCustomer(prev => ({
              ...prev,
              name: u.displayName || prev.name,
              email: u.email || prev.email,
            }));
          }
        } catch (err) {
          console.warn("Prefill customer address failed:", err);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.warn("Checkout login failed:", err);
    }
  };

  useEffect(() => {
    async function loadFulfillmentSettings() {
      try {
        const [profiles, siteSettings, bookList] = await Promise.all([
          adminApi.getShippingProfiles(),
          adminApi.getSettings() as Promise<any>,
          loadCatalog((size, cursor) => adminApi.getBooks(size, cursor))
        ]);
        setShippingProfiles(profiles);
        setTaxRates(siteSettings?.taxes?.rates || []);
        setBooks(bookList);
        const preview = new URLSearchParams(window.location.search).get("preview") === "true";
        const design = preview ? (window as any).__studioPreviewDesign || siteSettings?.draftDesign || siteSettings?.design : siteSettings?.design;
        setSettings({ ...siteSettings, design: resolveSurfaceDesign(design, "/checkout") });

        // Auto-select first available payment gateway
        const payments = siteSettings?.payments || {};
        if (payments.stripe?.connected) {
          setSelectedPaymentMethod("stripe");
        } else if (payments.paypal?.connected) {
          setSelectedPaymentMethod("paypal");
        } else {
          const firstManual = (payments.manualMethods || []).find((m: any) => m.enabled);
          if (firstManual) {
            setSelectedPaymentMethod(`manual_${firstManual.id}`);
          }
        }
      } catch (err) {
        console.error("Failed to load checkout settings", err);
      }
    }
    loadFulfillmentSettings();
  }, []);

  // Preview only replaces appearance; fulfillment and payment settings stay server-sourced.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("preview") !== "true") return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent
        || !["THEME_UPDATE", "STUDIO_PREVIEW_STATE"].includes(event.data?.type) || !event.data.design) return;
      setSettings((current: any) => ({ ...current, design: resolveSurfaceDesign(event.data.design, "/checkout") }));
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "PREVIEW_READY" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  // Recover cart if cartId query parameter is present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCartId = params.get("cartId");
    if (!urlCartId || books.length === 0) return;

    (async () => {
      try {
        const cartRef = doc(db, "abandoned-carts", urlCartId);
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
          const cartData = cartSnap.data();
          if (cartData.recovered) {
            console.log("Cart already recovered");
            return;
          }

          // Prefill customer details
          if (cartData.customer) {
            setCustomer(prev => ({
              ...prev,
              name: cartData.customer.name || prev.name,
              email: cartData.customer.email || cartData.email || prev.email,
              phone: cartData.customer.phone || prev.phone,
              address: {
                street: cartData.customer.address?.street || prev.address.street,
                city: cartData.customer.address?.city || prev.address.city,
                state: cleanRegion(cartData.customer.address?.state) || prev.address.state,
                zip: cartData.customer.address?.zip || prev.address.zip,
                country: cartData.customer.address?.country || prev.address.country,
              }
            }));
          } else if (cartData.email) {
            setCustomer(prev => ({
              ...prev,
              email: cartData.email,
            }));
          }

          // Save cart ID in sessionStorage to keep updating it and resolve it later
          sessionStorage.setItem("fm_checkout_cart_id", urlCartId);

          // Restore cart items
          const localBooksMap = new Map(books.map(b => [b.id, b]));
          const restoredItems = (cartData.items || []).map((item: any) => {
            const matchedBook = localBooksMap.get(item.id);
            if (matchedBook) {
              const photoUrl = matchedBook.photos?.[0]?.url || "";
              const shippingProfileId = matchedBook.shippingProfileId || "";

              let variantName = item.variantName || "";
              let stripePriceId = item.stripePriceId || "";
              let price = item.price;

              if (item.variantId) {
                const matchedVariant = matchedBook.variants?.find((v: any) => v.id === item.variantId);
                if (matchedVariant) {
                  variantName = matchedVariant.name;
                  price = matchedVariant.price;
                  if (matchedVariant.stripePriceId) stripePriceId = matchedVariant.stripePriceId;
                }
              } else {
                price = matchedBook.isOnSale ? matchedBook.salePrice : matchedBook.retailPrice;
                if (matchedBook.stripePriceId) stripePriceId = matchedBook.stripePriceId;
              }

              return {
                id: item.id,
                variantId: item.variantId || undefined,
                variantName: variantName || undefined,
                title: item.title || matchedBook.title,
                price: typeof price === "number" ? price : item.price,
                quantity: item.qty || item.quantity || 1,
                photoUrl: item.photoUrl || photoUrl,
                stripePriceId: stripePriceId || undefined,
                shippingProfileId: item.shippingProfileId || shippingProfileId,
              };
            }
            return {
              id: item.id,
              variantId: item.variantId || undefined,
              variantName: item.variantName || undefined,
              title: item.title,
              price: item.price,
              quantity: item.qty || item.quantity || 1,
              photoUrl: item.photoUrl || "",
              stripePriceId: item.stripePriceId || undefined,
              shippingProfileId: item.shippingProfileId || "",
            };
          });

          if (restoredItems.length > 0) {
            clearCart();
            setCart(restoredItems);
          }
        }
      } catch (err) {
        console.error("Failed to recover cart:", err);
      }
    })();
  }, [books]);

  useEffect(() => {
    async function detectCountry() {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
          const data = await res.json();
          if (data.country_name) {
            setCustomer(prev => ({
              ...prev,
              address: {
                ...prev.address,
                country: data.country_name
              }
            }));
          }
        }
      } catch (err) {
        console.warn("Could not geolocate client IP country, defaulting to United States:", err);
      }
    }
    detectCountry();
  }, []);

  const validateDiscountRestrictions = (discount: any, email: string, cartItems: any[], catalogMap: Map<string, any>, currentCartCount: number, currentCartTotal: number) => {
    // 1. Min quantity / min order amount
    // ⚡ Bolt: Replace O(N) array iteration with O(1) memoized cart count context value
    const totalQty = currentCartCount;
    if (discount.minQuantity && totalQty < discount.minQuantity) {
      throw new CopyError(checkoutDesign, "coErrMinItems", { count: discount.minQuantity });
    }
    // ⚡ Bolt: Replace O(N) array iteration with O(1) memoized cart total context value
    const itemsSubtotal = currentCartTotal;
    if (discount.minOrderAmount && itemsSubtotal < Number(discount.minOrderAmount)) {
      throw new CopyError(checkoutDesign, "coErrMinOrder", { amount: formatPrice(Number(discount.minOrderAmount)) });
    }

    // 2. Email domain / email list
    const hasEmailRestrictions = (discount.allowedCustomerEmails && discount.allowedCustomerEmails.trim()) || 
                                  (discount.allowedEmailDomains && discount.allowedEmailDomains.trim());
    if (hasEmailRestrictions && !email.trim()) {
      throw new CopyError(checkoutDesign, "coErrNeedEmail");
    }

    if (email.trim()) {
      const lowerEmail = email.trim().toLowerCase();
      
      // Check specific customer emails
      if (discount.allowedCustomerEmails && discount.allowedCustomerEmails.trim()) {
        const allowedEmails = discount.allowedCustomerEmails.split(",")
          .map((e: string) => e.trim().toLowerCase())
          .filter(Boolean);
        if (allowedEmails.length > 0 && !allowedEmails.includes(lowerEmail)) {
          throw new CopyError(checkoutDesign, "coErrVipEmails");
        }
      }

      // Check email domains
      if (discount.allowedEmailDomains && discount.allowedEmailDomains.trim()) {
        const allowedDomains = discount.allowedEmailDomains.split(",")
          .map((d: string) => d.trim().toLowerCase())
          .filter(Boolean);
        const matchesDomain = allowedDomains.some((domain: string) => {
          if (domain.startsWith(".")) {
            return lowerEmail.endsWith(domain);
          } else {
            return lowerEmail.endsWith("@" + domain) || lowerEmail.endsWith("." + domain);
          }
        });
        if (allowedDomains.length > 0 && !matchesDomain) {
          throw new CopyError(checkoutDesign, "coErrEmailDomains", { domains: discount.allowedEmailDomains });
        }
      }
    }

    // 3. Product / Category targeting
    if (discount.appliesTo === "categories") {
      const selectedCats = new Set(discount.selectedCategories || []);
      const hasMatchingCategory = cartItems.some(item => {
        const catalogBook = catalogMap.get(item.id);
        const bookCats = catalogBook && Array.isArray(catalogBook.categories) ? catalogBook.categories : [];
        return bookCats.some(cat => selectedCats.has(cat));
      });
      if (!hasMatchingCategory) {
        throw new CopyError(checkoutDesign, "coErrCategories", { categories: (discount.selectedCategories || []).join(", ") });
      }
    } else if (discount.appliesTo === "products") {
      const selectedProds = new Set(discount.selectedProducts || []);
      const hasMatchingProduct = cartItems.some(item => selectedProds.has(item.id));
      if (!hasMatchingProduct) {
        throw new CopyError(checkoutDesign, "coErrProducts");
      }
    }

    // 4. BOGO & Tiered specific checks
    if (discount.type === "bogo") {
      const buyQty = Number(discount.buyQuantity) || 1;
      const getQty = Number(discount.getQuantity) || 1;
      const requiredUnits = buyQty + getQty;

      // ⚡ Bolt: Convert constraints to O(1) Sets outside the loop
      const bogoCats = new Set(discount.selectedCategories || []);
      const bogoProds = new Set(discount.selectedProducts || []);

      // Filter qualifying items
      const qualItems = cartItems.filter(item => {
        if (discount.appliesTo === "all" || discount.appliesTo === "catalog") return true;
        if (discount.appliesTo === "categories") {
          const catalogBook = catalogMap.get(item.id);
          const bookCats = catalogBook && Array.isArray(catalogBook.categories) ? catalogBook.categories : [];
          return bookCats.some(cat => bogoCats.has(cat));
        }
        if (discount.appliesTo === "products") {
          return bogoProds.has(item.id);
        }
        return false;
      });

      const totalQualUnits = qualItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQualUnits < requiredUnits) {
        throw new CopyError(checkoutDesign, "coErrBogo", { count: requiredUnits });
      }
    }

    if (discount.type === "tiered") {
      const tiers = discount.tiers || [];
      if (!Array.isArray(tiers) || tiers.length === 0) {
        throw new CopyError(checkoutDesign, "coErrTiered");
      }

      // ⚡ Bolt: Convert constraints to O(1) Sets outside the loop
      const tierCats = new Set(discount.selectedCategories || []);
      const tierProds = new Set(discount.selectedProducts || []);

      // Calculate qualifying subtotal
      const qualifyingSubtotal = cartItems.reduce((sum, item) => {
        if (discount.appliesTo === "all" || discount.appliesTo === "catalog") return sum + item.quantity * item.price;
        let qualifies = false;
        if (discount.appliesTo === "categories") {
          const catalogBook = catalogMap.get(item.id);
          const bookCats = catalogBook && Array.isArray(catalogBook.categories) ? catalogBook.categories : [];
          qualifies = bookCats.some(cat => tierCats.has(cat));
        } else if (discount.appliesTo === "products") {
          qualifies = tierProds.has(item.id);
        }
        return qualifies ? sum + item.quantity * item.price : sum;
      }, 0);

      const lowestMinSpend = Math.min(...tiers.map(t => Number(t.minSpend)));
      if (qualifyingSubtotal < lowestMinSpend) {
        throw new CopyError(checkoutDesign, "coErrMinSpend", { amount: formatPrice(lowestMinSpend) });
      }
    }
  };

  const [availableRates, setAvailableRates] = useState<any[]>([]);
  const [fulfillmentSelection, setFulfillmentSelection] = useState<FulfillmentSelection>({ method: "shipping", optionId: "" });

  const shippingItemsForCart = () => cart.map((item) => {
    const book: any = booksMap.get(item.id);
    const variant = item.variantId ? (book?.variants || []).find((v: any) => v.id === item.variantId) : null;
    return {
      price: item.price,
      quantity: item.quantity,
      shippingProfileId: book?.shippingProfileId || null,
      weightGrams: parseWeightGrams(variant?.weight) ?? parseWeightGrams(book?.weight),
    };
  });

  const catalogItems = useMemo(() => catalogFulfillmentItems(cart, booksMap), [cart, booksMap]);

  // "Add CA$X more for free shipping" — only when the real shipping rules would
  // actually make this delivery free at that total (checked with the same engine).
  const freeShipNudge = useMemo(() => {
    if (checkoutDesign.hideCheckoutFreeShipNudge || cart.length === 0 || shippingProfiles.length === 0) return null;
    const selected = availableRates.find(r => r.id === fulfillmentSelection.optionId || r.name === fulfillmentSelection.optionId);
    if (fulfillmentSelection.method !== "shipping" || !selected || selected.price === 0) return null;
    const candidates = new Set<number>();
    shippingProfiles.forEach((p: any) => {
      if (Number(p.freeShippingOver) > 0) candidates.add(Number(p.freeShippingOver));
      (p.zones || []).forEach((z: any) => (z.rates || []).forEach((r: any) => { if (Number(r.freeOver) > 0) candidates.add(Number(r.freeOver)); }));
    });
    const country = customer.address.country || "Canada";
    const base = shippingItemsForCart();
    for (const t of [...candidates].filter(t => t > cartTotal).sort((a, b) => a - b).slice(0, 6)) {
      const gap = freeShippingGap(cartTotal, t);
      if (!gap) continue;
      const probe = [...base, { price: gap, quantity: 1, shippingProfileId: cart[0]?.shippingProfileId || null, weightGrams: 0 }];
      const quotes = quoteShipping(probe, { country }, shippingProfiles);
      const same = quotes.find(q => q.name === selected.name);
      if ((same ? same.price : quotes[0]?.price) === 0) return { gap, threshold: t };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, cartTotal, shippingProfiles, availableRates, fulfillmentSelection, customer.address.country, checkoutDesign.hideCheckoutFreeShipNudge]);

  const calculateStaticProfileRates = () => {
    if (cart.length === 0 || shippingProfiles.length === 0) {
      setAvailableRates([]);
      return;
    }
    // Same engine the server uses to charge the order (parity-tested); weights
    // come from the catalog so weight-based rates quote identically.
    const items = shippingItemsForCart();
    const physical = catalogItems?.filter(item => item.physical) || [];
    const physicalIds = new Set(physical.map(item => `${item.id}:${item.variantId || ""}`));
    const shippableItems = items.filter((item, index) => physicalIds.has(`${cart[index].id}:${cart[index].variantId || ""}`));
    const quotes = quoteShipping(shippableItems, { country: customer.address.country || "Canada" }, shippingProfiles).filter(q => q.type !== "pickup");
    setAvailableRates(quotes.map((q) => ({ id: q.id, name: q.name, price: q.price, deliveryDays: q.deliveryDays })));
  };

  useEffect(() => {
    const addr = customer.address;
    // The backend decides whether this destination is opted into live rates.
    // Countries outside that allowlist return no live rates and follow the
    // regular profile/zone path below.
    if (!addr.street?.trim() || !addr.city?.trim() || !addr.state?.trim() || !addr.zip?.trim() || cart.length === 0) {
      calculateStaticProfileRates();
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setShippoRatesLoading(true);
      try {
        const res = await fetch(functionUrl("getShippoRates"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: {
              street: addr.street.trim(),
              city: addr.city.trim(),
              state: addr.state.trim(),
              zip: addr.zip.trim(),
              country: addr.country || "Canada",
              name: customer.name || "Customer"
            },
            items: cart.map(i => ({ id: i.id, quantity: i.quantity, variantId: i.variantId }))
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.rates) && data.rates.length > 0) {
            setAvailableRates(canadaPostRates(data.rates).map((rate: any) => ({ ...rate, id: rate.name })));
            setShippoRatesLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch Shippo rates:", err);
      } finally {
        setShippoRatesLoading(false);
      }

      // Fallback
      calculateStaticProfileRates();
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [customer.address.street, customer.address.city, customer.address.state, customer.address.zip, customer.address.country, cart, shippingProfiles, cartTotal, catalogItems]);


  useEffect(() => {
    if (fulfillmentSelection.method === "shipping" && fulfillmentSelection.optionId
      && !availableRates.some(rate => rate.id === fulfillmentSelection.optionId || rate.name === fulfillmentSelection.optionId)) {
      setFulfillmentSelection(current => ({ ...current, optionId: "" }));
    }
  }, [availableRates, fulfillmentSelection]);

  // Re-validate discount whenever email or cart changes
  useEffect(() => {
    if (appliedDiscount && books.length > 0) {
      try {
        validateDiscountRestrictions(appliedDiscount, customer.email, cart, booksMap, cartCount, cartTotal);
      } catch (err: any) {
        setAppliedDiscount(null);
        setDiscountError(copyErrorText(err, checkoutDesign, "coDiscountInvalid"));
      }
    }
  }, [customer.email, cart, books, appliedDiscount]);
 
  // ⚡ Bolt: Memoize heavy discount calculations to avoid blocking main thread on every render
  // Measured impact: prevents O(N*M) and O(N log N) calculations when typing in checkout inputs
  const discountAmount = useMemo(() => {
    if (!appliedDiscount) return 0;
    
    // Calculate qualifying subtotal and qualifying items list
    const { qualifyingSubtotal, qualifyingItems } = (() => {
      if (appliedDiscount.appliesTo === "all" || appliedDiscount.appliesTo === "catalog") {
        return { qualifyingSubtotal: cartTotal, qualifyingItems: cart };
      }

      // ⚡ Bolt: Convert constraints to O(1) Sets outside the loop
      const selectedCats = new Set(appliedDiscount.selectedCategories || []);
      const selectedProds = new Set(appliedDiscount.selectedProducts || []);

      const itemsList = cart.filter(item => {
        let qualifies = false;
        if (appliedDiscount.appliesTo === "categories") {
          const catalogBook = booksMap.get(item.id);
          const bookCats = catalogBook && Array.isArray(catalogBook.categories) ? catalogBook.categories : [];
          qualifies = bookCats.some(cat => selectedCats.has(cat));
        } else if (appliedDiscount.appliesTo === "products") {
          qualifies = selectedProds.has(item.id);
        }
        return qualifies;
      });
      const sub = itemsList.reduce((sum, item) => sum + item.quantity * item.price, 0);
      return { qualifyingSubtotal: sub, qualifyingItems: itemsList };
    })();

    if (appliedDiscount.type === "percentage") {
      return qualifyingSubtotal * (Number(appliedDiscount.value) / 100);
    }
    if (appliedDiscount.type === "fixed") {
      return Math.min(Number(appliedDiscount.value), qualifyingSubtotal);
    }
    if (appliedDiscount.type === "bogo") {
      const buyQty = Number(appliedDiscount.buyQuantity) || 1;
      const getQty = Number(appliedDiscount.getQuantity) || 1;
      const getVal = Number(appliedDiscount.getDiscountValue) ?? 100;

      const unitPrices: number[] = [];
      qualifyingItems.forEach(i => {
        for (let k = 0; k < i.quantity; k++) {
          unitPrices.push(i.price);
        }
      });

      const totalQualUnits = unitPrices.length;
      const requiredUnits = buyQty + getQty;
      if (totalQualUnits < requiredUnits) return 0;

      unitPrices.sort((a, b) => b - a);

      const sets = Math.floor(totalQualUnits / requiredUnits);
      const discountQty = sets * getQty;

      let discountAmount = 0;
      const cheapestUnits = unitPrices.slice(-discountQty);
      cheapestUnits.forEach(price => {
        discountAmount += price * (getVal / 100);
      });

      return discountAmount;
    }
    if (appliedDiscount.type === "tiered") {
      const tiers = appliedDiscount.tiers || [];
      if (!Array.isArray(tiers) || tiers.length === 0) return 0;

      const sortedTiers = [...tiers].sort((a, b) => Number(b.minSpend) - Number(a.minSpend));
      const matchingTier = sortedTiers.find(t => qualifyingSubtotal >= Number(t.minSpend));
      if (!matchingTier) return 0;

      const val = Number(matchingTier.value);
      if (matchingTier.type === "percentage") {
        return qualifyingSubtotal * (val / 100);
      } else if (matchingTier.type === "fixed") {
        return Math.min(val, qualifyingSubtotal);
      }
    }
    return 0;
  }, [appliedDiscount, cart, cartTotal, booksMap]);

  const physicalItems = useMemo(() => catalogItems?.filter(item => item.physical) || [], [catalogItems]);
  const availableFulfillmentMethods = useMemo<FulfillmentSelection["method"][]>(() => {
    if (!physicalItems.length) return [];
    const methods: FulfillmentSelection["method"][] = ["shipping"];
    if (settings?.localFulfillment?.enabled && settings.localFulfillment.pickupLocations?.some((location: any) => location.enabled)) methods.push("pickup");
    if (settings?.localFulfillment?.enabled && settings.localFulfillment.deliveryZones?.some((zone: any) => zone.enabled)) methods.push("local_delivery");
    return methods;
  }, [physicalItems.length, settings?.localFulfillment]);
  // A pickup limited to an area (e.g. Toronto, "M") needs the shopper's address to check eligibility.
  const pickupNeedsAddress = !!settings?.localFulfillment?.pickupLocations?.some((location: any) => location.enabled && Array.isArray(location.postalPrefixes) && location.postalPrefixes.length);
  const physicalSubtotalAfterDiscount = useMemo(() => catalogItems
    ? discountedPhysicalSubtotal(catalogItems, discountAmount, appliedDiscount, booksMap)
    : 0, [catalogItems, discountAmount, appliedDiscount, booksMap]);
  const localQuotes = useMemo(() => catalogItems && physicalItems.length
    ? quoteLocalFulfillment(settings?.localFulfillment, customer.address, physicalSubtotalAfterDiscount, physicalItems)
    : [], [catalogItems, physicalItems, settings?.localFulfillment, customer.address, physicalSubtotalAfterDiscount]);

  // A changed cart, address, discount, or service configuration invalidates a
  // previously chosen price. Keep the intended method so the shopper can review it.
  const quoteContext = JSON.stringify([
    cart.map(item => [item.id, item.variantId, item.quantity, item.price]),
    fulfillmentSelection.method === "pickup" ? null : [customer.address.street, customer.address.city, customer.address.state, customer.address.zip, customer.address.country],
    discountAmount,
    settings?.localFulfillment,
  ]);
  const previousQuoteContext = useRef("");
  useEffect(() => {
    if (previousQuoteContext.current && previousQuoteContext.current !== quoteContext && fulfillmentSelection.optionId) {
      setFulfillmentSelection(current => ({ ...current, optionId: "" }));
    }
    previousQuoteContext.current = quoteContext;
  }, [quoteContext]);

  // Pick the initial shipping quote once. Later address or cart changes keep
  // the selection empty until the shopper chooses a currently valid rate.
  const autoSelectedShipping = useRef(false);
  useEffect(() => {
    if (availableRates.length && fulfillmentSelection.method === "shipping" && !fulfillmentSelection.optionId && !autoSelectedShipping.current) {
      const cheapest = [...availableRates].sort(bestFirst)[0];
      setFulfillmentSelection(current => ({ ...current, optionId: cheapest.id || cheapest.name }));
      autoSelectedShipping.current = true;
    }
  }, [availableRates, fulfillmentSelection]);

  useEffect(() => {
    const rateFor = (address: any) => {
      const country = String(address?.country || "").trim().toLowerCase();
      const state = String(address?.state || "").trim().toLowerCase();
      const countryRates = taxRates.filter(r => {
        const configured = String(r.country || "").trim().toLowerCase();
        return configured === country || ((configured === "ca" || configured === "canada") && (country === "ca" || country === "canada"));
      });
      return countryRates.find(r => String(r.region || "").trim().toLowerCase() === state && state !== "") || countryRates.find(r => !r.region);
    };
    const taxable = Math.max(0, cartTotal - discountAmount);
    if (fulfillmentSelection.method === "pickup") {
      const pickup = localQuotes.find(quote => quote.id === fulfillmentSelection.optionId && quote.method === "pickup");
      const physicalTaxable = Math.min(taxable, physicalSubtotalAfterDiscount);
      const digitalTaxable = Math.max(0, taxable - physicalTaxable);
      const physicalRate = rateFor(pickup?.address);
      const digitalRate = rateFor(customer.billingAddress);
      setTaxCost(physicalTaxable * (Number(physicalRate?.rate || 0) / 100) + digitalTaxable * (Number(digitalRate?.rate || 0) / 100));
      return;
    }
    const matchedTaxRate = rateFor(customer.address);
    setTaxCost(taxable * (Number(matchedTaxRate?.rate || 0) / 100));
  }, [customer.address.country, customer.address.state, customer.billingAddress.country, customer.billingAddress.state, fulfillmentSelection, localQuotes, physicalSubtotalAfterDiscount, cartTotal, appliedDiscount, taxRates, discountAmount]);

  const applyDiscount = async () => {
    if (!discountCode) return;
    setIsApplying(true);
    setDiscountError("");
    try {
      const discount = await adminApi.validateDiscount(discountCode);
      validateDiscountRestrictions(discount, customer.email, cart, booksMap, cartCount, cartTotal);
      setAppliedDiscount(discount);
    } catch (err: any) {
      setDiscountError(copyErrorText(err, checkoutDesign, "coDiscountExpired"));
      setAppliedDiscount(null);
    } finally {
      setIsApplying(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError("");
  };



  const isFreeShipping  = appliedDiscount?.type === "freeship";
  const selectedShippingQuote = availableRates.find(rate => rate.id === fulfillmentSelection.optionId || rate.name === fulfillmentSelection.optionId);
  const selectedLocalQuote = localQuotes.find(quote => quote.id === fulfillmentSelection.optionId && quote.method === fulfillmentSelection.method);
  const shippingCost = fulfillmentSelection.method === "shipping" ? Number(selectedShippingQuote?.price || 0) : Number(selectedLocalQuote?.price || 0);
  const finalShipping   = isFreeShipping ? 0 : shippingCost;
  const finalTotal      = cartTotal - discountAmount + finalShipping + taxCost;

  const getActiveShippingDetails = () => {
    if (fulfillmentSelection.method === "pickup" && selectedLocalQuote) return { serviceName: selectedLocalQuote.name };
    if (fulfillmentSelection.method === "local_delivery" && selectedLocalQuote) return { serviceName: selectedLocalQuote.name };
    const current = selectedShippingQuote;
    if (!current) return null;
    return {
      serviceName: current.name,
      deliveryDays: current.deliveryDays
    };
  };

  useSEO({ title: c("seoCheckoutTitle"), description: c("seoCheckoutDescription") });

  // Track funnel + abandoned cart on email entry
  useEffect(() => {
    funnelApi.track("checkout_start");
    if (typeof window !== "undefined" && window.location.search.includes("preview=true")) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    }
  }, []);

  useEffect(() => {
    if (!customer.email || !customer.email.includes("@") || cart.length === 0) return;
    const t = setTimeout(() => {
      let recoveryCartId = sessionStorage.getItem("fm_checkout_cart_id");
      if (!recoveryCartId) {
        const newRef = doc(collection(db, "abandoned-carts"));
        recoveryCartId = newRef.id;
        sessionStorage.setItem("fm_checkout_cart_id", recoveryCartId);
      }

      abandonedCartApi.upsert(recoveryCartId, {
        email: customer.email,
        items: cart.map(i => ({
          id: i.id,
          variantId: i.variantId || "",
          variantName: i.variantName || "",
          title: i.title,
          price: i.price,
          quantity: i.quantity,
          photoUrl: i.photoUrl || "",
          stripePriceId: i.stripePriceId || "",
          stockLimit: i.stockLimit ?? null,
          shippingProfileId: i.shippingProfileId || ""
        })),
        subtotal: cartTotal,
        customer,
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [customer.email, cart, cartTotal]);

  // Fill an empty (or "Please select") state/province from the postal code.
  useEffect(() => {
    const current = cleanRegion(customer.address.state);
    if (current) return;
    const guess = provinceFromPostal(customer.address.country, customer.address.zip);
    if (guess || current !== customer.address.state) {
      setCustomer(prev => ({ ...prev, address: { ...prev.address, state: guess } }));
    }
  }, [customer.address.zip, customer.address.country, customer.address.state]);

  const completePurchase = async () => {
    if (selectedPaymentMethod === "stripe" && !stripeRoute.canPay) {
      setNotice({ tone: "error", text: c("coStripeLoadError") });
      return;
    }
    const needsDeliveryAddress = fulfillmentSelection.method !== "pickup" || pickupNeedsAddress;
    const validDestination = !needsDeliveryAddress || [customer.address.street, customer.address.city, customer.address.state, customer.address.zip, customer.address.country].every(value => String(value || "").trim());
    const validBilling = fulfillmentSelection.method !== "pickup" || [customer.billingAddress.country, customer.billingAddress.state].every(value => String(value || "").trim());
    const selectedOptionExists = !physicalItems.length || (fulfillmentSelection.method === "shipping"
      ? availableRates.some(rate => rate.id === fulfillmentSelection.optionId || rate.name === fulfillmentSelection.optionId)
      : localQuotes.some(quote => quote.id === fulfillmentSelection.optionId && quote.method === fulfillmentSelection.method));
    if (!customer.name || !customer.email || !validDestination) {
      setNotice({ tone: "error", text: c("coErrShippingFields") });
      return;
    }
    if (!validBilling) {
      setNotice({ tone: "error", text: c("coErrPickupBillingFields") });
      return;
    }
    if (!selectedOptionExists) {
      setNotice({ tone: "error", text: c("coFulfillmentReview") });
      return;
    }
    setNotice(null);
    const payingByCardForm = useCardForm && selectedPaymentMethod === "stripe";
    if (payingByCardForm) {
      const cardError = (await cardFormRef.current?.validate()) ?? (cardFormRef.current ? null : c("coStripeLoadError"));
      if (cardError) {
        setNotice({ tone: "error", text: cardError });
        return;
      }
    }
    try {
      // Carrier address verification applies to shipped orders. Pickup has no
      // shipping address, and local delivery uses its configured postal zone.
      let addressVerified = fulfillmentSelection.method !== "shipping";
      let addressError = "";
      const valResponse = fulfillmentSelection.method === "shipping" ? await fetch(functionUrl("validateAddress"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: {
            name: customer.name,
            street: customer.address.street,
            city: customer.address.city,
            state: customer.address.state,
            zip: customer.address.zip,
            country: customer.address.country
          }
        })
      }) : null;
      if (valResponse) {
        if (!valResponse.ok) throw new CopyError(checkoutDesign, "coErrAddressService");
        const valData = await valResponse.json();
        // If verification is temporarily unavailable, publisher review remains required.
        addressVerified = valData.isValid === true && valData.unverified !== true;
        addressError = addressVerified ? "" : (valData.messages || []).map((m: any) => m.text).join(", ");
      }

      const isManual = selectedPaymentMethod.startsWith("manual_");
      let manualMethod = null;
      if (isManual) {
        const manualId = selectedPaymentMethod.replace("manual_", "");
        manualMethod = (settings?.payments?.manualMethods || []).find((m: any) => m.id === manualId);
      }

      const referralSource = typeof window !== "undefined" ? window.sessionStorage.getItem("referral_source") : null;

      const orderData = {
        customer,
        customerId: currentUser?.uid || null,
        referralSource: referralSource || "direct",
        ...(checkoutDesign.showOrderNote && orderNote.trim() ? { orderNote: orderNote.trim().slice(0, 500) } : {}),
        addressVerified,
        addressError,
        items: cart.map(item => ({
          id: item.id,
          variantId: item.variantId || null,
          variantName: item.variantName || null,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          photoUrl: item.photoUrl,
          stripePriceId: item.stripePriceId || null,
          shippingProfileId: item.shippingProfileId || null,
        })),
        subtotal: cartTotal,
        discount: discountAmount,
        shipping: finalShipping,
        shippingMethod: fulfillmentSelection.method === "shipping" ? (selectedShippingQuote?.name || null) : null,
        ...(physicalItems.length ? { fulfillmentSelection } : {}),
        tax: taxCost,
        total: finalTotal,
        status: "pending_payment",
        paymentStatus: isManual ? "pending" : "unpaid",
        paymentMethod: isManual ? (manualMethod?.name || "Manual") : (selectedPaymentMethod === "paypal" ? "PayPal" : "Stripe"),
        paymentInstructions: isManual ? (manualMethod?.instructions || "") : "",
        testMode: settings?.payments?.testMode || false,
        appliedDiscount: appliedDiscount
          ? { id: appliedDiscount.id, code: appliedDiscount.code, type: appliedDiscount.type, value: appliedDiscount.value }
          : null,
        metadata: { userAgent: navigator.userAgent, platform: "web" }
      };
      
      // Save customer email in localStorage to recover cart on payment success landing
      localStorage.setItem("last_customer_email", customer.email);
      
      const cardKey = JSON.stringify([orderData.items, orderData.total, orderData.customer, currency, fulfillmentSelection]);
      const reuse = payingByCardForm && pendingCardOrder.current?.key === cardKey ? pendingCardOrder.current : null;
      let orderId: string;

      // Manual local orders are created by Functions from a whitelisted draft
      // and current server catalog/config. No client totals or existing order ID
      // can alter the authoritative fulfillment snapshot.
      if (isManual && physicalItems.length && ["pickup", "local_delivery"].includes(fulfillmentSelection.method)) {
        const response = await fetch(functionUrl("createStripeCheckoutSession"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createManualLocalOrder",
            manualMethodId: manualMethod?.id,
            currency: currency.toLowerCase(),
            orderDraft: {
              customer,
              items: cart.map(item => ({ id: item.id, variantId: item.variantId || null, quantity: item.quantity })),
              fulfillmentSelection,
              ...(appliedDiscount?.code ? { appliedDiscount: { code: appliedDiscount.code } } : {}),
              ...(checkoutDesign.showOrderNote && orderNote.trim() ? { orderNote: orderNote.trim().slice(0, 500) } : {}),
            },
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.orderId) throw new CopyError(checkoutDesign, "coManualOrderError");
        orderId = result.orderId;
      } else {
        orderId = reuse ? reuse.orderId : await adminApi.createOrder(orderData);
      }

      if (isManual) {
        purchaseNavigating.current = true;
        window.location.href = `${window.location.origin}${import.meta.env.BASE_URL}checkout?success=true&order_id=${orderId}&manual=true`;
        return;
      }

      if (selectedPaymentMethod === "paypal") {
        const returnUrl = `${window.location.origin}${import.meta.env.BASE_URL}checkout`;
        const paypalResponse = await fetch(functionUrl("createPayPalOrder"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, currency: currency.toLowerCase(), returnUrl }),
        });
        const paypalData = await paypalResponse.json();
        if (!paypalResponse.ok) throw new CopyError(checkoutDesign, "coPaypalError");
        if (!paypalData.approvalUrl) throw new CopyError(checkoutDesign, "coErrPaypalUrl");
        purchaseNavigating.current = true;
        window.location.href = paypalData.approvalUrl;
        return;
      }

      // Tell the backend exactly where this checkout page lives. On GitHub
      // Pages the site sits under a sub-path, so origin alone is not enough
      // for Stripe's success/cancel redirects.
      const returnUrl = `${window.location.origin}${import.meta.env.BASE_URL}checkout`;

      const successUrl = `${returnUrl}?success=true&order_id=${encodeURIComponent(orderId)}`;

      if (payingByCardForm) {
        // Lock recovery before requesting an intent: even a lost response may
        // have created a payment. Do not offer a competing hosted route.
        setInlineAttemptStarted(true);
        let clientSecret = reuse?.clientSecret || "";
        if (!clientSecret) {
          const intentResponse = await fetch(functionUrl("createStripeCheckoutSession"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, currency: currency.toLowerCase(), returnUrl, paymentElement: true }),
          });
          const intentData = await intentResponse.json();
          if (!intentResponse.ok || !intentData.clientSecret) throw new CopyError(checkoutDesign, "coStripeError");
          clientSecret = intentData.clientSecret;
          pendingCardOrder.current = { key: cardKey, orderId, clientSecret };
        }
        const result = await cardFormRef.current!.confirm(clientSecret, successUrl);
        if (result.error) {
          setNotice({ tone: "error", text: result.error });
          return;
        }
        pendingCardOrder.current = null;
        purchaseNavigating.current = true;
        window.location.href = `${successUrl}&payment_intent=${encodeURIComponent(result.paymentIntentId || "")}`;
        return;
      }

    } catch (err: any) {
      setNotice({ tone: "error", text: c("coCheckoutFailed", { error: copyErrorText(err, checkoutDesign, "coStripeError") }) });
    }
  };

  const handleCompletePurchase = () => submitPurchase.current(async () => {
    setIsCompleting(true);
    try {
      await completePurchase();
      return purchaseNavigating.current;
    } finally {
      if (!purchaseNavigating.current) setIsCompleting(false);
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get("order_id") || "";
    const isPayPalReturn = params.get("paypal_return") === "true";
    const isSuccessReturn = params.get("success") === "true";
    if (!oid || (!isPayPalReturn && !isSuccessReturn)) {
      if (params.get("canceled")) setNotice({ tone: "info", text: c("coPaymentCanceled") });
      return;
    }

    let cancelled = false;
    const stripeSessionId = params.get("session_id") || "";
    const stripeIntentId = params.get("payment_intent") || "";
    // Drop the one-time return flags so a refresh doesn't replay this landing.
    const isManualReturn = params.get("manual") === "true";
    window.history.replaceState(null, "", `${window.location.pathname}?order_id=${encodeURIComponent(oid)}&success=true${isManualReturn ? "&manual=true" : ""}`);
    setOrderNumber(oid);
    setIsSuccess(true);
    setManualOrderReturn(isManualReturn);

    (async () => {
      try {
        if (isManualReturn) {
          const order: any = await adminApi.getOrderById(oid);
          if (cancelled) return;
          if (order) setSuccessOrder(order);
          clearCart();
          const email = order?.customer?.email || localStorage.getItem("last_customer_email") || "";
          const recoveryCartId = sessionStorage.getItem("fm_checkout_cart_id") || `active_${email.toLowerCase()}`;
          abandonedCartApi.markRecovered(recoveryCartId);
          sessionStorage.removeItem("fm_checkout_cart_id");
          return;
        }
        if (stripeSessionId.startsWith("cs_") || stripeIntentId.startsWith("pi_")) {
          // Ask Stripe whether this session was actually completed. "open" means
          // the shopper came back without paying — send them back to the form.
          const statusRes = await fetch(functionUrl("createStripeCheckoutSession"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "status", orderId: oid, sessionId: stripeSessionId, paymentIntentId: stripeIntentId }),
          }).catch(() => null);
          const statusData = statusRes && statusRes.ok ? await statusRes.json() : null;
          if (cancelled) return;
          if (statusData?.status === "open" || statusData?.status === "expired") {
            window.history.replaceState(null, "", window.location.pathname);
            setIsSuccess(false);
            setOrderNumber("");
            setNotice({ tone: "info", text: c("coPaymentNotFinished") });
            return;
          }
        }
        if (isPayPalReturn) {
          const paypalOrderId = params.get("token");
          if (!paypalOrderId) throw new CopyError(checkoutDesign, "coErrPaypalToken");
          const captureResponse = await fetch(functionUrl("capturePayPalOrder"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: oid, paypalOrderId }),
          });
          const captureData = await captureResponse.json();
          if (!captureResponse.ok) throw new CopyError(checkoutDesign, "coPaypalCaptureError");
        }

        // Firestore is authoritative. URL flags and the capture HTTP response
        // never confirm payment on their own; wait for the paid order update.
        for (let attempt = 0; attempt < 12 && !cancelled; attempt++) {
          const order: any = await adminApi.getOrderById(oid);
          if (cancelled) return;
          if (order) setSuccessOrder(order);
          if (order?.paymentStatus === "paid") {
            setPaymentConfirmed(true);
            clearCart();
            funnelApi.track("purchase");
            const email = order.customer?.email || localStorage.getItem("last_customer_email") || "";
            const recoveryCartId = sessionStorage.getItem("fm_checkout_cart_id") || `active_${email.toLowerCase()}`;
            abandonedCartApi.markRecovered(recoveryCartId);
            sessionStorage.removeItem("fm_checkout_cart_id");
            return;
          }
          if (order?.paymentStatus === "pending") {
            clearCart();
            funnelApi.track("purchase");
            const email = order.customer?.email || localStorage.getItem("last_customer_email") || "";
            const recoveryCartId = sessionStorage.getItem("fm_checkout_cart_id") || `active_${email.toLowerCase()}`;
            abandonedCartApi.markRecovered(recoveryCartId);
            sessionStorage.removeItem("fm_checkout_cart_id");
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      } catch (err) {
        console.error("Failed to confirm payment on success landing", err);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Success screen ──────────────────────────────────────────────────────────
  if (isSuccess) {
    const isManual = manualOrderReturn || successOrder?.paymentStatus === "pending";
    return (
      <div data-fm-store data-studio-target="copy:Checkout|style:checkout" data-studio-label="Checkout" data-fm-checkout className="h-screen fm-surface text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <StorefrontThemeStyle design={checkoutDesign} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--accent-rgb,232,64,42),0.15)_0%,transparent_70%)] pointer-events-none" />
        <motion.div {...regionProps("checkoutSuccess")} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.8 }}
          className="relative z-10 flex flex-col items-center max-w-md w-full">
          <div className="w-24 h-24 rounded-[2rem] border flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(var(--accent-rgb),0.3)]" style={{ backgroundColor: "rgba(var(--accent-rgb), 0.2)", borderColor: "rgba(var(--accent-rgb), 0.3)" }}>
            <CheckCircle2 size={44} style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-[9px] font-black tracking-[0.5em] uppercase mb-4" style={{ color: "var(--accent)" }}>
            {isManual
              ? c("coOrderPlaced")
              : (paymentConfirmed ? c("coOrderConfirmed") : c("coFinalizing"))}
          </p>
          <h2 className="text-5xl font-black tracking-tighter uppercase italic text-white mb-4">{c("coThanks")}</h2>
          <p className="text-white/30 text-xs font-mono mb-2 tracking-widest">{c("coOrderNumber", { number: orderNumber })}</p>

          {(successOrder?.fulfillment?.method === "pickup" || successOrder?.fulfillment?.method === "local_delivery") && (
            <section {...regionProps("checkoutFulfillment")} className="w-full mt-4 mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/70">{c("coShipMethod")}</h3>
              <p className="text-base font-semibold text-white">{successOrder.fulfillment.name}</p>
              {successOrder.fulfillment.method === "pickup" && successOrder.fulfillment.address && <address className="not-italic text-xs leading-5 text-white/60">
                {[successOrder.fulfillment.address.street, successOrder.fulfillment.address.city, successOrder.fulfillment.address.state, successOrder.fulfillment.address.zip, successOrder.fulfillment.address.country].filter(Boolean).join(", ")}
              </address>}
              {successOrder.fulfillment.hours && <p className="text-xs leading-5 text-white/60">{c("coFulfillmentHours")} {successOrder.fulfillment.hours}</p>}
              {successOrder.fulfillment.estimate && <p className="text-xs leading-5 text-white/60">{c("coFulfillmentEstimate")} {successOrder.fulfillment.estimate}</p>}
              {successOrder.fulfillment.instructions && <p className="whitespace-pre-wrap text-xs leading-5 text-white/60">{c("coFulfillmentInstructions")} {successOrder.fulfillment.instructions}</p>}
            </section>
          )}

          {isManual ? (
            <div className="w-full mt-4 mb-10 p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] text-left space-y-4 shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-[10px] font-black uppercase tracking-[0.25em] italic flex items-center gap-2" style={{ color: "var(--accent)" }}>
                <Building size={14} /> {successOrder?.paymentMethod || c("coPaymentInstructions")}
              </h4>
              <p className="text-white/80 text-xs font-bold leading-relaxed whitespace-pre-wrap">
                {successOrder?.paymentInstructions || c("coCheckEmail")}
              </p>
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3 items-center">
                <AlertCircle size={14} className="text-amber-400 shrink-0" />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  {c("coPending")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-white/20 text-[10px] tracking-widest mb-14">
              {paymentConfirmed
                ? c("coConfirmationSent")
                : c("coConfirming")}
            </p>
          )}

          {!currentUser && (successOrder?.customer?.email || customer.email) && (
            <section {...regionProps("checkoutAccountOffer")} className="w-full mb-10 border border-white/10 bg-white/[0.03] p-6 text-left space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/70">{c("coAccountTitle")}</h3>
              <p className="text-sm leading-6 text-white/60">{c("coAccountText", { email: successOrder?.customer?.email || customer.email })}</p>
              <Link to={`/account?email=${encodeURIComponent(successOrder?.customer?.email || customer.email)}`}
                className="inline-block border border-white/10 bg-white/5 hover:bg-white/10 text-white px-5 py-3 text-[11px] font-black tracking-[0.2em] uppercase transition-all">
                {c("coAccountButton")}
              </Link>
            </section>
          )}

          <Link to="/"
            className="flex items-center gap-3 hover:bg-violet-500 text-white px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase transition-all active:scale-95 shadow-[0_10px_40px_rgba(var(--accent-rgb),0.4)]" style={{ backgroundColor: "var(--accent)" }}>
            {c("coContinue")}
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div data-fm-store data-studio-target="copy:Checkout|style:checkout" data-studio-label="Checkout" data-fm-checkout className="h-screen fm-surface text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <StorefrontThemeStyle design={checkoutDesign} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--accent-rgb,232,64,42),0.08)_0%,transparent_70%)] pointer-events-none" />
        <div {...regionProps("checkoutEmpty")} className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-8">
            <Package size={36} className="text-white/20" strokeWidth={1} />
          </div>
          <p className="text-[9px] font-black tracking-[0.5em] text-white/20 uppercase mb-4">{c("coEmptyEyebrow")}</p>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white mb-12">{c("coEmptyTitle")}</h2>
          <Link to="/"
            className="fm-active px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase hover:bg-white/90 transition-all active:scale-95">
            {c("coEmptyButton")}
          </Link>
        </div>
      </div>
    );
  }

  // ── Main checkout ───────────────────────────────────────────────────────────
  const hasStripe = Boolean(settings?.payments?.stripe?.connected);
  const hasPaypal = Boolean(settings?.payments?.paypal?.connected);
  const configuredManualMethods = settings?.payments?.manualMethods;
  const enabledManualMethods = (Array.isArray(configuredManualMethods) ? configuredManualMethods : []).filter((method: any) => method.enabled);
  const showTotalOnPay = !checkoutDesign.hidePayButtonTotal && cart.length > 0;
  const paymentLabel = selectedPaymentMethod === "stripe"
    ? (showTotalOnPay ? c("coPayWithTotal", { total: formatPrice(finalTotal) }) : c("coPay"))
    : selectedPaymentMethod === "paypal"
      ? c("coPayPal")
      : c("coPlaceOrder");

  return (
    <div data-fm-store data-studio-target="copy:Checkout|style:checkout" data-studio-label="Checkout" data-fm-checkout className="min-h-screen bg-white font-sans text-slate-900 selection:bg-sky-100">
      <StorefrontThemeStyle design={checkoutDesign} />
      {settings?.payments?.testMode && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm font-medium text-amber-900">
          {c("coTestMode")}
        </div>
      )}

      <header {...regionProps("checkoutHeader")} className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="group flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">
            <ChevronLeft size={17} className="transition-transform group-hover:-translate-x-0.5" />
            {c("coReturn")}
          </Link>
          <Link to="/" className="text-center text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            {c("coBrand")}
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Lock size={15} aria-hidden="true" />
            <span className="hidden sm:inline">{c("coSecure")}</span>
          </div>
        </div>
      </header>

      <TemplateSections design={checkoutDesign} templateId="cartPage" />

      <div className="mx-auto grid min-h-[calc(100vh-77px)] max-w-6xl grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
        <main {...regionProps("checkoutForm")} className="px-5 py-8 sm:px-8 sm:py-12 lg:border-r lg:border-slate-200 lg:pr-14">
          <div className="mx-auto max-w-2xl space-y-10">
            <div {...regionProps("checkoutProgress")} className="flex items-center gap-2 text-sm text-slate-500" aria-label={c("coProgressAria")}>
              <span className="font-medium text-[color:var(--accent)]">{c("coStepInfo")}</span>
              <span aria-hidden="true">›</span>
              <span>{c("coStepShipping")}</span>
              <span aria-hidden="true">›</span>
              <span>{c("coStepPayment")}</span>
            </div>

            <section>
              <StepBadge n={c("coStepOf", { n: 1 })} label={c("coContact")} />
              {currentUser ? (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{c("coSignedIn")}</p>
                    <p className="text-slate-500">{currentUser.email}</p>
                  </div>
                  <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {c("coGoogle")}
                </button>
              )}
              <Field label={c("coEmail")} type="email" value={customer.email} onChange={v => setCustomer({ ...customer, email: v })} autoComplete="email" inputMode="email" required />
              <p className="mt-2 text-xs leading-5 text-slate-500">{c("coEmailNote")}</p>
              <div className="mt-3 space-y-3">
                <Field label={c("coName")} value={customer.name} onChange={v => setCustomer({ ...customer, name: v })} autoComplete="name" required />
                <Field label={c("coPhone")} type="tel" value={customer.phone} onChange={v => setCustomer({ ...customer, phone: v })} autoComplete="tel" inputMode="tel" />
              </div>
            </section>

            <section>
              <StepBadge n={c("coStepOf", { n: 2 })} label={c("coDelivery")} />
              <div className="space-y-3">
                {(fulfillmentSelection.method !== "pickup" || pickupNeedsAddress) && <>
                <CountryField label={c("coCountry")}
                  pinnedCodes={pinnedCountryCodes} showFlags={!checkoutDesign.hideCountryFlags}
                  words={{ search: c("coCountrySearch"), popular: c("coCountryPopular"), all: c("coCountryAll"), none: (q: string) => c("coCountryNone", { query: q }) }}
                  value={customer.address.country} onChange={v => setCustomer({ ...customer, address: { ...customer.address, country: v, state: v === customer.address.country ? customer.address.state : "" } })} />
                {checkoutDesign.hideAddressSuggestions
                  ? <Field label={c("coAddress")} value={customer.address.street} onChange={v => setCustomer({ ...customer, address: { ...customer.address, street: v } })} autoComplete="street-address" required />
                  : <AddressField label={c("coAddress")} value={customer.address.street} country={customer.address.country}
                      listLabel={c("coAddressSuggestions")} attribution={c("coAddressAttribution")}
                      onChange={v => setCustomer(prev => ({ ...prev, address: { ...prev.address, street: v } }))}
                      onPick={sug => setCustomer(prev => ({ ...prev, address: { ...prev.address, street: sug.street, city: sug.city || prev.address.city, state: sug.state || prev.address.state, zip: sug.zip || prev.address.zip, country: sug.country || prev.address.country } }))} />}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label={c("coCity")} value={customer.address.city} onChange={v => setCustomer({ ...customer, address: { ...customer.address, city: v } })} autoComplete="address-level2" required />
                  {regionsFor(customer.address.country)
                    ? <RegionField label={c("coState")} choose={c("coStateChoose")} regions={regionsFor(customer.address.country)!} value={customer.address.state} onChange={v => setCustomer({ ...customer, address: { ...customer.address, state: v } })} />
                    : <Field label={c("coState")} value={customer.address.state} onChange={v => setCustomer({ ...customer, address: { ...customer.address, state: v } })} autoComplete="address-level1" required />}
                  <Field label={c("coZip")} value={customer.address.zip} onChange={v => setCustomer({ ...customer, address: { ...customer.address, zip: v } })} autoComplete="postal-code" required />
                </div>
                </>}
              </div>
            </section>

            <section>
              <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">{c("coShipMethod")}</h2>
                <p className="mt-1 text-sm text-slate-500">{c("coShipMethodNote")}</p>
              </div>
              {physicalItems.length > 0 && <FulfillmentMethodPicker
                method={fulfillmentSelection.method}
                optionId={fulfillmentSelection.optionId}
                onSelect={setFulfillmentSelection}
                shippingQuotes={availableRates}
                localQuotes={localQuotes}
                availableMethods={availableFulfillmentMethods}
                loading={shippoRatesLoading && fulfillmentSelection.method === "shipping"}
                words={{
                  group: c("coFulfillmentGroup"),
                  shipping: c("coFulfillmentShipping"),
                  pickup: c("coFulfillmentPickup"),
                  local_delivery: c("coFulfillmentDelivery"),
                  review: c("coFulfillmentReview"),
                  unavailable: c("coFulfillmentUnavailable"),
                  addressPrompt: c("coFulfillmentAddressPrompt"),
                  loading: c("coRates"),
                  instructions: c("coFulfillmentInstructions"),
                  hours: c("coFulfillmentHours"),
                  estimate: c("coFulfillmentEstimate"),
                  carrierTransit: c("coCarrierTransit"),
                  carrierUnavailable: c("coCarrierTimingUnavailable"),
                  deliveryDays: c("coEstimated"),
                  free: c("coFree"),
                }}
                formatPrice={formatPrice}
              />}
              {fulfillmentSelection.method === "pickup" && <section {...regionProps("checkoutFulfillment")} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                <div><h3 className="text-sm font-semibold text-slate-900">{c("coBillingTitle")}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{c("coBillingNote")}</p></div>
                <CountryField label={c("coBillCountry")}
                  pinnedCodes={pinnedCountryCodes} showFlags={!checkoutDesign.hideCountryFlags}
                  words={{ search: c("coCountrySearch"), popular: c("coCountryPopular"), all: c("coCountryAll"), none: (q: string) => c("coCountryNone", { query: q }) }}
                  value={customer.billingAddress.country} onChange={v => setCustomer(prev => ({ ...prev, billingAddress: { country: v, state: v === prev.billingAddress.country ? prev.billingAddress.state : "" } }))} />
                {regionsFor(customer.billingAddress.country)
                  ? <RegionField label={c("coBillState")} choose={c("coBillStateChoose")} regions={regionsFor(customer.billingAddress.country)!} value={customer.billingAddress.state} onChange={v => setCustomer(prev => ({ ...prev, billingAddress: { ...prev.billingAddress, state: v } }))} />
                  : <Field label={c("coBillState")} value={customer.billingAddress.state} onChange={v => setCustomer(prev => ({ ...prev, billingAddress: { ...prev.billingAddress, state: v } }))} autoComplete="billing address-level1" required />}
                {selectedLocalQuote?.address && <p className="text-xs text-slate-600">{c("coFulfillmentTaxLocation")} {selectedLocalQuote.address.city}, {selectedLocalQuote.address.state}</p>}
              </section>}
            </section>

            {checkoutDesign.showOrderNote && (
              <section data-studio-target="style:checkout|copy:Checkout" data-studio-label="Order note">
                <label htmlFor="checkout-order-note" className="text-sm font-medium text-slate-900">{c("coOrderNote")}</label>
                <p className="mt-1 text-xs leading-5 text-slate-500">{c("coOrderNoteHelp")}</p>
                <textarea
                  id="checkout-order-note"
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value.slice(0, 500))}
                  maxLength={500}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)]"
                />
              </section>
            )}

            <section>
              <StepBadge n={c("coStepOf", { n: 3 })} label={c("coPayment")} />
              <p className="-mt-3 mb-4 text-sm leading-6 text-slate-500">{c("coPaymentNote")}</p>
              <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
                {hasStripe && (
                  <StripePaymentSection
                    design={checkoutDesign}
                    selected={selectedPaymentMethod === "stripe"}
                    configured={useCardForm}
                    canRetry={stripeRoute.canRetry}
                    busy={isCompleting}
                    onSelect={() => setSelectedPaymentMethod("stripe")}
                    onRetry={() => {
                      if (inlineAttemptStarted || isCompleting) return;
                      setCardState("loading");
                      setCardFormAttempt(attempt => attempt + 1);
                      setNotice(null);
                    }}
                  >
                    <StripeCardForm
                      key={cardFormAttempt}
                      ref={cardFormRef}
                      publishableKey={stripePublicKey}
                      amountCents={Math.round(convertPrice(finalTotal) * 100)}
                      currency={currency}
                      loadingText={c("coStripeLoading")}
                      errorText={c("coStripeLoadError")}
                      validationText={c("coCardValidationError")}
                      paymentErrorText={c("coCardPaymentError")}
                      onStateChange={setCardState}
                      fontName={checkoutDesign.checkoutFieldFont || checkoutDesign.checkoutFont || checkoutDesign.font || checkoutDesign.bodyFont || undefined}
                      fieldBackground={checkoutDesign.checkoutFieldBg || undefined}
                      fieldText={checkoutDesign.checkoutFieldText || undefined}
                      fieldBorder={checkoutDesign.checkoutFieldBorder || undefined}
                      accentColor={checkoutDesign.checkoutAccentColor || undefined}
                      fieldRadius={checkoutDesign.checkoutInputRadius}
                      style={{
                        background: checkoutDesign.stripeFormBg || undefined,
                        padding: checkoutDesign.stripeFormPadding != null ? `${checkoutDesign.stripeFormPadding}px` : undefined,
                        borderRadius: checkoutDesign.checkoutInputRadius != null ? `${checkoutDesign.checkoutInputRadius}px` : undefined,
                      }}
                    />
                  </StripePaymentSection>
                )}
                {enabledManualMethods.map((method: any, index: number) => (
                  <label key={method.id} className={`flex cursor-pointer items-center justify-between gap-4 border-t border-slate-200 px-4 py-4 ${!hasStripe && index === 0 ? "border-t-0" : ""}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment-method" disabled={isCompleting} checked={selectedPaymentMethod === `manual_${method.id}`} onChange={() => setSelectedPaymentMethod(`manual_${method.id}`)} className="h-4 w-4 accent-[color:var(--accent)]" />
                      <span className="text-sm font-medium">{method.name}</span>
                    </div>
                    <Building size={18} className="text-slate-400" />
                  </label>
                ))}
                {!hasStripe && !hasPaypal && enabledManualMethods.length === 0 && (
                  <div className="flex items-start gap-3 px-4 py-5 text-sm text-slate-600">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                    {c("coNoPayment")}
                  </div>
                )}
              </div>
            </section>

            <div className="border-t border-slate-200 pt-6">
              {notice && (
                <div role={notice.tone === "error" ? "alert" : "status"} className="mb-4 rounded-lg border px-4 py-3 text-sm"
                  style={{ borderColor: notice.tone === "error" ? "var(--danger, #b4271a)" : "var(--muted, #94a3b8)", color: notice.tone === "error" ? "var(--danger, #b4271a)" : "inherit", background: notice.tone === "error" ? "rgba(var(--danger-rgb, 232, 64, 42), .08)" : "transparent" }}>
                  <span aria-hidden="true">{notice.tone === "error" ? "✕ " : "ℹ "}</span>{notice.text}
                </div>
              )}
              <button
                type="button"
                onClick={handleCompletePurchase}
                disabled={isCompleting || (selectedPaymentMethod === "stripe" && !stripeRoute.canPay) || (!hasStripe && !hasPaypal && enabledManualMethods.length === 0)}
                className="flex w-full items-center justify-center gap-2 rounded-lg fm-accent-bg px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCompleting ? <><Loader2 size={18} className="animate-spin" /> {c("coProcessing")}</> : <><Lock size={16} /> {paymentLabel}</>}
              </button>
              {c("coGuarantee") && (
                <p {...regionProps("checkoutPromise")} className="mt-3 text-center text-sm font-medium text-slate-700"  >{c("coGuarantee")}</p>
              )}
              <div className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                <p>{c("coPrivacyNote")}</p>
              </div>
            </div>

            <footer className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-slate-200 pt-6 text-xs text-slate-500">
              <span>{c("coTrust1")}</span>
              <span>{c("coTrust2")}</span>
              <span>{c("coTrust3")}</span>
            </footer>
          </div>
        </main>

        <aside {...regionProps("checkoutSummary")} className="order-first border-b border-slate-200 bg-slate-50 px-5 py-7 sm:px-8 lg:order-none lg:border-b-0 lg:px-10 lg:py-12">
          {/* Phones: a one-line bar (summary + total) so the form comes first; tap to open. */}
          <button type="button" onClick={() => setSummaryOpen(o => !o)} aria-expanded={summaryOpen}
            data-studio-target="style:checkout|copy:Checkout" data-studio-label="Phone order summary bar"
            className="mx-auto -my-2 flex w-full max-w-2xl items-center justify-between gap-3 py-2 text-sm font-medium text-slate-900 lg:hidden">
            <span className="flex items-center gap-2">{c(summaryOpen ? "coHideSummary" : "coShowSummary")} <span aria-hidden="true">{summaryOpen ? "▴" : "▾"}</span></span>
            <span className="text-base font-semibold">{formatPrice(finalTotal)}</span>
          </button>
          <div className={`mx-auto max-w-2xl lg:sticky lg:top-8 lg:block ${summaryOpen ? "mt-6 block" : "hidden"}`}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{c("coSummary")}</h2>
              {/* ⚡ Bolt: Replace O(N) array iterations in render with O(1) memoized value */}
              <span className="text-sm text-slate-500">{c(cartCount === 1 ? "coItemCountOne" : "coItemCountMany", { count: cartCount })}</span>
            </div>

            <div className="space-y-5">
              {cart.map(item => (
                <div key={`${item.id}-${item.variantId || "default"}`} className="flex items-center gap-4">
                  <div className="relative h-16 w-14 shrink-0 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                    <img loading="lazy" decoding="async" src={item.photoUrl} alt="" className="h-full w-full rounded object-cover" />
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-600 px-1 text-xs font-semibold text-white">{item.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                    {item.variantName && <p className="mt-0.5 text-xs text-slate-500">{item.variantName}</p>}
                    {!checkoutDesign.hideCheckoutLowStock && typeof item.stockLimit === "number" && item.stockLimit > 0 && item.stockLimit <= designNumber(checkoutDesign, "lowStockProductThreshold", 3) && (
                      <p className="mt-0.5 text-xs font-medium" style={{ color: "var(--warning, #b45309)" }}>{c("coOnlyLeft", { count: item.stockLimit })}</p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-900">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="my-7 border-t border-slate-200" />

            {!(checkoutDesign.alwaysShowDiscountBox || discountOpen || appliedDiscount || discountCode) ? (
              <button type="button" onClick={() => setDiscountOpen(true)} data-studio-target="copy:Checkout" data-studio-label="Discount code link"
                className="flex items-center gap-2 text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
                <Tag size={15} /> {c("coHaveCode")}
              </button>
            ) : (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && applyDiscount()}
                  placeholder={c("coDiscount")}
                  disabled={Boolean(appliedDiscount)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)] disabled:bg-slate-100"
                />
              </div>
              {appliedDiscount ? (
                <button type="button" onClick={removeDiscount} className="rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" aria-label={c("coDiscountRemove")}><X size={17} /></button>
              ) : (
                <button type="button" onClick={applyDiscount} disabled={isApplying || !discountCode} className="rounded-lg bg-slate-700 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {isApplying ? <Loader2 size={17} className="animate-spin" /> : c("coApply")}
                </button>
              )}
            </div>
            )}
            {discountError && <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={13} />{discountError}</p>}
            {appliedDiscount && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--success)" }}><CheckCircle2 size={13} />{c("coDiscountApplied", { code: appliedDiscount.code })}</p>}

            <div className="my-7 border-t border-slate-200" />

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600"><span>{c("summarySubtotal")}</span><span className="font-medium text-slate-900">{formatPrice(cartTotal)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between" style={{ color: "var(--success)" }}><span>{c("summaryDiscount")}</span><span>-{formatPrice(discountAmount)}</span></div>}
              <div className="flex justify-between text-slate-600">
                <span>{c("summaryShipping")}{getActiveShippingDetails()?.serviceName ? ` · ${getActiveShippingDetails()?.serviceName}` : ""}</span>
                <span className="font-medium text-slate-900">{isFreeShipping || shippingCost === 0 ? c("coFree") : formatPrice(finalShipping)}</span>
              </div>
              {freeShipNudge && (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5" data-studio-target="style:checkout|copy:Checkout" data-studio-label="Free-shipping nudge">
                  <p className="text-xs font-medium text-slate-700">{c("coFreeShipGap", { amount: formatPrice(freeShipNudge.gap) })}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                    <div className="h-full fm-accent-bg" style={{ width: `${Math.min(100, Math.max(4, (cartTotal / freeShipNudge.threshold) * 100))}%` }} />
                  </div>
                </div>
              )}
              <div className="flex justify-between text-slate-600"><span>{c("summaryTax")}</span><span className="font-medium text-slate-900">{taxCost > 0 ? formatPrice(taxCost) : c("coTaxLater")}</span></div>
            </div>

            <div className="my-6 border-t border-slate-200" />

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-slate-900">{c("summaryTotal")}</p>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">{currency}</p>
              </div>
              <motion.p key={finalTotal} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="text-2xl font-semibold tracking-tight text-slate-950">{formatPrice(finalTotal)}</motion.p>
            </div>

            <div className="mt-7 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <Package size={18} className="mt-0.5 shrink-0 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{c("coPacked")}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{c("coPackedNote")}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <GlobalSections design={checkoutDesign} />
    </div>
  );
}
