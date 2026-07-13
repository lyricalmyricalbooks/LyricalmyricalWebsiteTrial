import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { useCart } from "./CartContext";
import {
  ChevronLeft, Tag, ShieldCheck, X, AlertCircle,
  Package, Truck, CreditCard, CheckCircle2, Loader2, Lock, Building
} from "lucide-react";
import { motion } from "motion/react";
import { adminApi } from "./admin/api";
import { abandonedCartApi, funnelApi } from "./lib/commerce";
import { functionUrl } from "./lib/functionsBase";
import { useSEO } from "./lib/seo";
import { useCurrency } from "./CurrencyContext";
import { COUNTRIES, matchShippingZone } from "./features/site/shippingZones";
import { TemplateSections, GlobalSections } from "./components/sectionRender";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, collection } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { StorefrontThemeStyle } from "./features/site/StorefrontThemeStyle";

// ─── Country selector (matches Field styling) ─────────────────────────────────
function CountryField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Country"
        className="peer w-full rounded-lg border border-slate-300 bg-white px-3.5 pb-2 pt-6 text-sm text-slate-900 outline-none transition focus:border-[#1773b0] focus:ring-1 focus:ring-[#1773b0] appearance-none cursor-pointer"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.name} className="bg-white text-slate-900">{c.name}</option>
        ))}
      </select>
      <label className="absolute left-3.5 top-2 text-xs text-slate-500 pointer-events-none">Country</label>
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
        className="peer w-full rounded-lg border border-slate-300 bg-white px-3.5 pb-2 pt-6 text-sm text-slate-900 outline-none transition focus:border-[#1773b0] focus:ring-1 focus:ring-[#1773b0] placeholder-transparent"
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
  const { currency, formatPrice } = useCurrency();

  const [isApplying, setIsApplying]     = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSuccess, setIsSuccess]       = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [orderNumber, setOrderNumber]   = useState("");

  const [discountCode, setDiscountCode]       = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [discountError, setDiscountError]     = useState("");
  const [shippoRatesLoading, setShippoRatesLoading] = useState(false);


  const [customer, setCustomer] = useState({
    name: "", email: "", phone: "",
    address: { street: "", city: "", state: "", zip: "", country: "United States" }
  });

  const [shippingCost, setShippingCost] = useState(0);
  const [taxCost, setTaxCost] = useState(0);
  const [shippingProfiles, setShippingProfiles] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("stripe");
  const [successOrder, setSuccessOrder] = useState<any>(null);

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
              address: {
                street: data.defaultAddress?.street || prev.address.street,
                city: data.defaultAddress?.city || prev.address.city,
                state: data.defaultAddress?.state || prev.address.state,
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
          adminApi.getBooks(100)
        ]);
        setShippingProfiles(profiles);
        setTaxRates(siteSettings?.taxes?.rates || []);
        setBooks(bookList);
        setSettings(siteSettings);

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
                state: cartData.customer.address?.state || prev.address.state,
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
      throw new Error(`This code requires a minimum of ${discount.minQuantity} items in your cart.`);
    }
    // ⚡ Bolt: Replace O(N) array iteration with O(1) memoized cart total context value
    const itemsSubtotal = currentCartTotal;
    if (discount.minOrderAmount && itemsSubtotal < Number(discount.minOrderAmount)) {
      throw new Error(`This code requires a minimum order of ${Number(discount.minOrderAmount).toFixed(2)}.`);
    }

    // 2. Email domain / email list
    const hasEmailRestrictions = (discount.allowedCustomerEmails && discount.allowedCustomerEmails.trim()) || 
                                  (discount.allowedEmailDomains && discount.allowedEmailDomains.trim());
    if (hasEmailRestrictions && !email.trim()) {
      throw new Error("Please enter your email address under 'Shipping Details' first to apply this code.");
    }

    if (email.trim()) {
      const lowerEmail = email.trim().toLowerCase();
      
      // Check specific customer emails
      if (discount.allowedCustomerEmails && discount.allowedCustomerEmails.trim()) {
        const allowedEmails = discount.allowedCustomerEmails.split(",")
          .map((e: string) => e.trim().toLowerCase())
          .filter(Boolean);
        if (allowedEmails.length > 0 && !allowedEmails.includes(lowerEmail)) {
          throw new Error("This code is restricted to specific VIP customer emails.");
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
          throw new Error(`This code is restricted to specific email domains (e.g. ${discount.allowedEmailDomains}).`);
        }
      }
    }

    // 3. Product / Category targeting
    if (discount.appliesTo === "categories") {
      const selectedCats = discount.selectedCategories || [];
      const selectedCatsSet = new Set(selectedCats);
      const hasMatchingCategory = cartItems.some(item => {
        const catalogBook = catalogMap.get(item.id);
        const bookCats = catalogBook && Array.isArray(catalogBook.categories) ? catalogBook.categories : [];
        return bookCats.some(cat => selectedCatsSet.has(cat));
      });
      if (!hasMatchingCategory) {
        throw new Error(`This code only applies to categories: ${selectedCats.join(", ")}.`);
      }
    } else if (discount.appliesTo === "products") {
      const selectedProds = discount.selectedProducts || [];
      const selectedProdsSet = new Set(selectedProds);
      const hasMatchingProduct = cartItems.some(item => selectedProdsSet.has(item.id));
      if (!hasMatchingProduct) {
        throw new Error("This code only applies to specific products not currently in your cart.");
      }
    }

    // 4. BOGO & Tiered specific checks
    if (discount.type === "bogo") {
      const buyQty = Number(discount.buyQuantity) || 1;
      const getQty = Number(discount.getQuantity) || 1;
      const requiredUnits = buyQty + getQty;

      // Filter qualifying items
      const selectedCatsSet = new Set(discount.selectedCategories || []);
      const selectedProdsSet = new Set(discount.selectedProducts || []);
      const qualItems = cartItems.filter(item => {
        if (discount.appliesTo === "all" || discount.appliesTo === "catalog") return true;
        if (discount.appliesTo === "categories") {
          const catalogBook = catalogMap.get(item.id);
          const bookCats = catalogBook && Array.isArray(catalogBook.categories) ? catalogBook.categories : [];
          return bookCats.some(cat => selectedCatsSet.has(cat));
        }
        if (discount.appliesTo === "products") {
          return selectedProdsSet.has(item.id);
        }
        return false;
      });

      const totalQualUnits = qualItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQualUnits < requiredUnits) {
        throw new Error(`This BOGO code requires buying at least ${requiredUnits} qualifying items.`);
      }
    }

    if (discount.type === "tiered") {
      const tiers = discount.tiers || [];
      if (!Array.isArray(tiers) || tiers.length === 0) {
        throw new Error("This tiered code is not configured correctly.");
      }

      // Calculate qualifying subtotal
      const selectedCatsSet = new Set(discount.selectedCategories || []);
      const selectedProdsSet = new Set(discount.selectedProducts || []);
      const qualifyingSubtotal = cartItems.reduce((sum, item) => {
        if (discount.appliesTo === "all" || discount.appliesTo === "catalog") return sum + item.quantity * item.price;
        let qualifies = false;
        if (discount.appliesTo === "categories") {
          const catalogBook = catalogMap.get(item.id);
          const bookCats = catalogBook && Array.isArray(catalogBook.categories) ? catalogBook.categories : [];
          qualifies = bookCats.some(cat => selectedCatsSet.has(cat));
        } else if (discount.appliesTo === "products") {
          qualifies = selectedProdsSet.has(item.id);
        }
        return qualifies ? sum + item.quantity * item.price : sum;
      }, 0);

      const lowestMinSpend = Math.min(...tiers.map(t => Number(t.minSpend)));
      if (qualifyingSubtotal < lowestMinSpend) {
        throw new Error(`This code requires a minimum spend of $${lowestMinSpend.toFixed(2)} on qualifying items.`);
      }
    }
  };

  const [availableRates, setAvailableRates] = useState<any[]>([]);
  const [selectedRateName, setSelectedRateName] = useState<string>("");

  const calculateStaticProfileRates = () => {
    if (cart.length === 0 || shippingProfiles.length === 0) {
      setAvailableRates([]);
      setShippingCost(0);
      return;
    }
    const country = (customer.address.country || "United States").trim().toLowerCase();
    
    const profileItemsMap: Record<string, typeof cart> = {};
    cart.forEach(item => {
      const pid = item.shippingProfileId || "general-profile";
      if (!profileItemsMap[pid]) profileItemsMap[pid] = [];
      profileItemsMap[pid].push(item);
    });

    // ⚡ Bolt: Cache shipping profiles in a Map to eliminate O(N) array lookups per item
    const profilesMap = new Map<string, any>();
    shippingProfiles.forEach((p) => profilesMap.set(p.id, p));

    const generalProfile = profilesMap.get("general-profile");
    const fallbackProfile = shippingProfiles[0];

    const profileRates: Record<string, any[]> = {};
    
    Object.entries(profileItemsMap).forEach(([pid, items]) => {
      let profile = profilesMap.get(pid);
      if (!profile && pid !== "general-profile") {
        profile = generalProfile;
      }
      if (!profile) {
        profile = fallbackProfile;
      }

      if (!profile || !profile.zones || profile.zones.length === 0) {
        profileRates[pid] = [{
          name: profile?.serviceName || "Standard Shipping",
          base: Number(profile?.base || 15),
          additional: Number(profile?.additional || 5),
          deliveryDays: profile?.deliveryDays || "3-7",
          minPrice: profile?.freeThreshold ? Number(profile.freeThreshold) : null
        }];
        return;
      }

      // ⚡ Bolt: Use existing optimized matchShippingZone (O(1) Map lookups)
      // instead of repeatedly creating string allocations for every zone mapping comparison.
      let matchedZone = matchShippingZone(country, profile.zones);

      if (!matchedZone) {
        matchedZone = profile.zones[0];
      }

      if (matchedZone && matchedZone.rates) {
        const eligibleRates = matchedZone.rates.filter((r: any) => {
          const minP = r.minPrice !== null && r.minPrice !== undefined ? Number(r.minPrice) : null;
          const maxP = r.maxPrice !== null && r.maxPrice !== undefined ? Number(r.maxPrice) : null;
          if (minP !== null && cartTotal < minP) return false;
          if (maxP !== null && cartTotal > maxP) return false;
          return true;
        });
        profileRates[pid] = eligibleRates;
      } else {
        profileRates[pid] = [];
      }
    });

    const allRateNamesSet = new Set<string>();
    Object.values(profileRates).forEach(rates => {
      rates.forEach(r => allRateNamesSet.add(r.name));
    });
    const uniqueRateNames = Array.from(allRateNamesSet);

    if (uniqueRateNames.length === 0) {
      setAvailableRates([]);
      setShippingCost(0);
      return;
    }

    // ⚡ Bolt: Pre-compute rate lookups to eliminate O(N*M) nested iterations and repeated array sorting
    const profileRatesLookup = new Map<string, Map<string, any>>();
    const profileFallbackRate = new Map<string, any>();

    Object.entries(profileRates).forEach(([pid, rates]) => {
      const ratesMap = new Map<string, any>();
      rates.forEach((r: any) => ratesMap.set(r.name, r));
      profileRatesLookup.set(pid, ratesMap);

      if (rates.length > 0) {
        profileFallbackRate.set(pid, [...rates].sort((a, b) => Number(a.base) - Number(b.base))[0]);
      }
    });

    const combinedRates = uniqueRateNames.map(rateName => {
      let highestBase = 0;
      let totalAdditional = 0;
      let maxDeliveryDays = "3-7";
      let hasDelDays = false;

      cart.forEach((item, i) => {
        const pid = item.shippingProfileId || "general-profile";

        const ratesMap = profileRatesLookup.get(pid);
        let matchedRate = ratesMap?.get(rateName);

        if (!matchedRate) {
          matchedRate = profileFallbackRate.get(pid);
        }

        const base = matchedRate ? Number(matchedRate.base) : 15;
        const additional = matchedRate ? Number(matchedRate.additional) : 5;
        if (matchedRate?.deliveryDays) {
          maxDeliveryDays = matchedRate.deliveryDays;
          hasDelDays = true;
        }

        if (i === 0) {
          highestBase = base;
          totalAdditional += additional * (item.quantity - 1);
        } else {
          if (base > highestBase) {
            totalAdditional += highestBase;
            highestBase = base;
            totalAdditional += additional * (item.quantity - 1);
          } else {
            totalAdditional += additional * item.quantity;
          }
        }
      });

      return {
        name: rateName,
        price: highestBase + totalAdditional,
        deliveryDays: hasDelDays ? maxDeliveryDays : undefined
      };
    });

    setAvailableRates(combinedRates);
  };

  useEffect(() => {
    const addr = customer.address;
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
            setAvailableRates(data.rates);
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
  }, [customer.address.street, customer.address.city, customer.address.state, customer.address.zip, customer.address.country, cart, shippingProfiles, cartTotal]);


  useEffect(() => {
    if (availableRates.length === 0) {
      setShippingCost(0);
      return;
    }
    const currentValid = availableRates.find(r => r.name === selectedRateName);
    if (!currentValid) {
      const cheapest = [...availableRates].sort((a, b) => a.price - b.price)[0];
      setSelectedRateName(cheapest.name);
      setShippingCost(cheapest.price);
    } else {
      setShippingCost(currentValid.price);
    }
  }, [availableRates, selectedRateName]);

  // Re-validate discount whenever email or cart changes
  useEffect(() => {
    if (appliedDiscount && books.length > 0) {
      try {
        validateDiscountRestrictions(appliedDiscount, customer.email, cart, booksMap, cartCount, cartTotal);
      } catch (err: any) {
        setAppliedDiscount(null);
        setDiscountError(err.message || "Discount no longer valid.");
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
      // ⚡ Bolt: Use Set for O(1) lookups
      const selectedCatsSet = new Set(appliedDiscount.selectedCategories || []);
      const selectedProdsSet = new Set(appliedDiscount.selectedProducts || []);
      const itemsList = cart.filter(item => {
        let qualifies = false;
        if (appliedDiscount.appliesTo === "categories") {
          const catalogBook = booksMap.get(item.id);
          const bookCats = catalogBook && Array.isArray(catalogBook.categories) ? catalogBook.categories : [];
          qualifies = bookCats.some(cat => selectedCatsSet.has(cat));
        } else if (appliedDiscount.appliesTo === "products") {
          qualifies = selectedProdsSet.has(item.id);
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

  useEffect(() => {
    // Region-aware estimate: prefer a rate whose region matches the
    // state/province, then fall back to the country-wide rate. The backend
    // recomputes the authoritative amount at session creation.
    const country = (customer.address.country || "United States").trim().toLowerCase();
    const state = (customer.address.state || "").trim().toLowerCase();
    const countryRates = taxRates.filter(r => (r.country || "").trim().toLowerCase() === country);
    const matchedTaxRate =
      countryRates.find(r => (r.region || "").trim().toLowerCase() === state && state !== "") ||
      countryRates.find(r => !r.region);
    const taxPercent = matchedTaxRate ? Number(matchedTaxRate.rate) : 0;

    const subtotalAfterDiscount = cartTotal - discountAmount;
    setTaxCost(subtotalAfterDiscount * (taxPercent / 100));
  }, [customer.address.country, customer.address.state, cartTotal, appliedDiscount, taxRates, discountAmount]);

  const applyDiscount = async () => {
    if (!discountCode) return;
    setIsApplying(true);
    setDiscountError("");
    try {
      const discount = await adminApi.validateDiscount(discountCode);
      validateDiscountRestrictions(discount, customer.email, cart, booksMap, cartCount, cartTotal);
      setAppliedDiscount(discount);
    } catch (err: any) {
      setDiscountError(err.message || "INVALID OR EXPIRED CODE");
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
  const finalShipping   = isFreeShipping ? 0 : shippingCost;
  const finalTotal      = cartTotal - discountAmount + finalShipping + taxCost;

  const getActiveShippingDetails = () => {
    if (!selectedRateName || availableRates.length === 0) return null;
    const current = availableRates.find(r => r.name === selectedRateName);
    if (!current) return null;
    return {
      serviceName: current.name,
      deliveryDays: current.deliveryDays
    };
  };

  useSEO({ title: "Checkout", description: "Secure checkout for Lyricalmyrical Books." });

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

  const handleCompletePurchase = async () => {
    if (!customer.name || !customer.email || !customer.address.street || !customer.address.city || !customer.address.state || !customer.address.zip) {
      alert("Please fill in all required shipping details including city, state/province, and postal/zip code.");
      return;
    }
    setIsCompleting(true);
    try {
      // 1. Verify and Validate address using Shippo API Cloud Function
      const valResponse = await fetch(functionUrl("validateAddress"), {
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
      });

      if (!valResponse.ok) {
        throw new Error("Could not connect to address verification service.");
      }

      const valData = await valResponse.json();
      // `unverified` means the verification service itself was unavailable —
      // the checkout proceeds, but the order is flagged for manual review.
      const addressVerified = valData.isValid === true && valData.unverified !== true;
      const addressError = addressVerified ? "" : (valData.messages || []).map((m: any) => m.text).join(", ");

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
        shippingMethod: selectedRateName || null,
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
      
      const orderId = await adminApi.createOrder(orderData);

      if (isManual) {
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
        if (!paypalResponse.ok) throw new Error(paypalData.error || "Failed to create PayPal order.");
        if (!paypalData.approvalUrl) throw new Error("PayPal did not return an approval URL.");
        window.location.href = paypalData.approvalUrl;
        return;
      }

      // Tell the backend exactly where this checkout page lives. On GitHub
      // Pages the site sits under a sub-path, so origin alone is not enough
      // for Stripe's success/cancel redirects.
      const returnUrl = `${window.location.origin}${import.meta.env.BASE_URL}checkout`;

      const sessionResponse = await fetch(functionUrl("createStripeCheckoutSession"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, currency: currency.toLowerCase(), returnUrl }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(errorData.error || "Failed to create secure Stripe session.");
      }

      const sessionData = await sessionResponse.json();
      if (sessionData.url) {
        window.location.href = sessionData.url;
      } else {
        throw new Error("No checkout URL returned from payment server.");
      }
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
      setIsCompleting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get("order_id") || "";
    const isPayPalReturn = params.get("paypal_return") === "true";
    const isSuccessReturn = params.get("success") === "true";
    if (!oid || (!isPayPalReturn && !isSuccessReturn)) {
      if (params.get("canceled")) alert("Order payment was canceled.");
      return;
    }

    let cancelled = false;
    setOrderNumber(oid);
    setIsSuccess(true);

    (async () => {
      try {
        if (isPayPalReturn) {
          const paypalOrderId = params.get("token");
          if (!paypalOrderId) throw new Error("PayPal did not return an order token.");
          const captureResponse = await fetch(functionUrl("capturePayPalOrder"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: oid, paypalOrderId }),
          });
          const captureData = await captureResponse.json();
          if (!captureResponse.ok) throw new Error(captureData.error || "PayPal capture failed.");
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
    const isManual = successOrder?.paymentStatus === "pending";
    return (
      <div data-fm-store data-fm-checkout className="h-screen fm-surface text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <StorefrontThemeStyle design={settings?.design} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.15)_0%,transparent_70%)] pointer-events-none" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.8 }}
          className="relative z-10 flex flex-col items-center max-w-md w-full">
          <div className="w-24 h-24 rounded-[2rem] border flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(124,58,237,0.3)]" style={{ backgroundColor: "rgba(var(--accent-rgb), 0.2)", borderColor: "rgba(var(--accent-rgb), 0.3)" }}>
            <CheckCircle2 size={44} style={{ color: "var(--accent)" }} />
          </div>
          <p className="text-[9px] font-black tracking-[0.5em] uppercase mb-4" style={{ color: "var(--accent)" }}>
            {isManual
              ? "Order Placed"
              : (paymentConfirmed ? "Order Confirmed" : "Finalizing Payment")}
          </p>
          <h2 className="text-5xl font-black tracking-tighter uppercase italic text-white mb-4">Thank You</h2>
          <p className="text-white/30 text-xs font-mono mb-2 tracking-widest">ORDER #{orderNumber}</p>

          {isManual ? (
            <div className="w-full mt-4 mb-10 p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] text-left space-y-4 shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-[10px] font-black uppercase tracking-[0.25em] italic flex items-center gap-2" style={{ color: "var(--accent)" }}>
                <Building size={14} /> {successOrder?.paymentMethod || "Payment Instructions"}
              </h4>
              <p className="text-white/80 text-xs font-bold leading-relaxed whitespace-pre-wrap">
                {successOrder?.paymentInstructions || "Please check your email for payment instructions."}
              </p>
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3 items-center">
                <AlertCircle size={14} className="text-amber-400 shrink-0" />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  Your order is pending verification of payment. We will ship once received.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-white/20 text-[10px] tracking-widest mb-14">
              {paymentConfirmed
                ? "A confirmation will be sent to your email."
                : "Your payment is being confirmed — the receipt email will follow shortly."}
            </p>
          )}

          <Link to="/"
            className="flex items-center gap-3 hover:bg-violet-500 text-white px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase transition-all active:scale-95 shadow-[0_10px_40px_rgba(124,58,237,0.4)]" style={{ backgroundColor: "var(--accent)" }}>
            Continue Exploring
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div data-fm-store data-fm-checkout className="h-screen fm-surface text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <StorefrontThemeStyle design={settings?.design} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-8">
            <Package size={36} className="text-white/20" strokeWidth={1} />
          </div>
          <p className="text-[9px] font-black tracking-[0.5em] text-white/20 uppercase mb-4">Empty Archive</p>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white mb-12">Nothing Here</h2>
          <Link to="/"
            className="fm-active px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase hover:bg-white/90 transition-all active:scale-95">
            Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // ── Main checkout ───────────────────────────────────────────────────────────
  const hasStripe = Boolean(settings?.payments?.stripe?.connected);
  const hasPaypal = Boolean(settings?.payments?.paypal?.connected);
  const enabledManualMethods = (settings?.payments?.manualMethods || []).filter((method: any) => method.enabled);
  const paymentLabel = selectedPaymentMethod === "stripe"
    ? "Pay securely"
    : selectedPaymentMethod === "paypal"
      ? "Continue to PayPal"
      : "Place order";

  return (
    <div data-fm-store data-fm-checkout className="min-h-screen bg-white font-sans text-slate-900 selection:bg-sky-100">
      <StorefrontThemeStyle design={settings?.design} />
      {settings?.payments?.testMode && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm font-medium text-amber-900">
          Test mode is active. No real charges will be made.
        </div>
      )}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="group flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">
            <ChevronLeft size={17} className="transition-transform group-hover:-translate-x-0.5" />
            Return to store
          </Link>
          <Link to="/" className="text-center text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            Lyricalmyrical Books
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Lock size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Secure checkout</span>
          </div>
        </div>
      </header>

      <TemplateSections design={settings?.design} templateId="cartPage" />

      <div className="mx-auto grid min-h-[calc(100vh-77px)] max-w-6xl grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
        <main className="px-5 py-8 sm:px-8 sm:py-12 lg:border-r lg:border-slate-200 lg:pr-14">
          <div className="mx-auto max-w-2xl space-y-10">
            <div className="flex items-center gap-2 text-sm text-slate-500" aria-label="Checkout progress">
              <span className="font-medium text-[#1773b0]">Information</span>
              <span aria-hidden="true">›</span>
              <span>Shipping</span>
              <span aria-hidden="true">›</span>
              <span>Payment</span>
            </div>

            <section>
              <StepBadge n="1 of 3" label="Contact" />
              {currentUser ? (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">Signed in</p>
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
                  Sign in with Google
                </button>
              )}
              <Field label="Email address" type="email" value={customer.email} onChange={v => setCustomer({ ...customer, email: v })} autoComplete="email" inputMode="email" required />
              <p className="mt-2 text-xs leading-5 text-slate-500">We’ll send your receipt and delivery updates to this email.</p>
            </section>

            <section>
              <StepBadge n="2 of 3" label="Delivery" />
              <div className="space-y-3">
                <CountryField value={customer.address.country} onChange={v => setCustomer({ ...customer, address: { ...customer.address, country: v } })} />
                <Field label="Full name" value={customer.name} onChange={v => setCustomer({ ...customer, name: v })} autoComplete="name" required />
                <Field label="Address" value={customer.address.street} onChange={v => setCustomer({ ...customer, address: { ...customer.address, street: v } })} autoComplete="street-address" required />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="City" value={customer.address.city} onChange={v => setCustomer({ ...customer, address: { ...customer.address, city: v } })} autoComplete="address-level2" required />
                  <Field label="State / province" value={customer.address.state} onChange={v => setCustomer({ ...customer, address: { ...customer.address, state: v } })} autoComplete="address-level1" required />
                  <Field label="ZIP / postal code" value={customer.address.zip} onChange={v => setCustomer({ ...customer, address: { ...customer.address, zip: v } })} autoComplete="postal-code" required />
                </div>
                <Field label="Phone (optional)" type="tel" value={customer.phone} onChange={v => setCustomer({ ...customer, phone: v })} autoComplete="tel" inputMode="tel" />
              </div>
            </section>

            <section>
              <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Shipping method</h2>
                <p className="mt-1 text-sm text-slate-500">Choose the delivery speed that works for you.</p>
              </div>
              {shippoRatesLoading ? (
                <div className="flex items-center justify-center gap-3 py-8 rounded-lg border border-slate-200 bg-white">
                  <Loader2 className="h-5 w-5 animate-spin text-[#1773b0]" />
                  <span className="text-sm text-slate-500 font-medium">Calculating live shipping rates...</span>
                </div>
              ) : availableRates.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
                  {availableRates.map((rate, index) => (
                    <label key={rate.name} className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-4 ${index ? "border-t border-slate-200" : ""}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping-method"
                          value={rate.name}
                          checked={selectedRateName === rate.name}
                          onChange={() => setSelectedRateName(rate.name)}
                          className="h-4 w-4 accent-[#1773b0]"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{rate.name}</p>
                          {rate.deliveryDays && <p className="mt-0.5 text-xs text-slate-500">Estimated {rate.deliveryDays} business days</p>}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{rate.price === 0 ? "Free" : formatPrice(rate.price)}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <Truck size={18} className="mt-0.5 shrink-0 text-slate-400" />
                  Enter your delivery address to see available shipping methods.
                </div>
              )}
            </section>

            <section>
              <StepBadge n="3 of 3" label="Payment" />
              <p className="-mt-3 mb-4 text-sm leading-6 text-slate-500">All transactions are handled by the payment provider you select.</p>
              <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
                {hasStripe && (
                  <label className="block cursor-pointer">
                    <div className="flex items-center justify-between gap-4 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <input type="radio" name="payment-method" checked={selectedPaymentMethod === "stripe"} onChange={() => setSelectedPaymentMethod("stripe")} className="h-4 w-4 accent-[#1773b0]" />
                        <span className="text-sm font-medium">Credit or debit card</span>
                      </div>
                      <div className="flex items-center gap-1.5" aria-label="Accepted cards">
                        {['VISA', 'MC', 'AMEX'].map(card => <span key={card} className="rounded border border-slate-300 bg-white px-1.5 py-1 text-[9px] font-bold text-slate-600">{card}</span>)}
                      </div>
                    </div>
                    {selectedPaymentMethod === "stripe" && (
                      <div className="border-t border-slate-200 px-6 py-7 text-center">
                        <CreditCard size={34} strokeWidth={1.4} className="mx-auto mb-3 text-slate-400" />
                        <p className="text-sm text-slate-600">After you click “Pay securely,” you’ll complete your card payment on Stripe’s secure checkout.</p>
                      </div>
                    )}
                  </label>
                )}
                {enabledManualMethods.map((method: any, index: number) => (
                  <label key={method.id} className={`flex cursor-pointer items-center justify-between gap-4 border-t border-slate-200 px-4 py-4 ${!hasStripe && index === 0 ? "border-t-0" : ""}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment-method" checked={selectedPaymentMethod === `manual_${method.id}`} onChange={() => setSelectedPaymentMethod(`manual_${method.id}`)} className="h-4 w-4 accent-[#1773b0]" />
                      <span className="text-sm font-medium">{method.name}</span>
                    </div>
                    <Building size={18} className="text-slate-400" />
                  </label>
                ))}
                {!hasStripe && !hasPaypal && enabledManualMethods.length === 0 && (
                  <div className="flex items-start gap-3 px-4 py-5 text-sm text-slate-600">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                    No payment method is currently available. Please contact the store before placing your order.
                  </div>
                )}
              </div>
            </section>

            <div className="border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={handleCompletePurchase}
                disabled={isCompleting || (!hasStripe && !hasPaypal && enabledManualMethods.length === 0)}
                className="flex w-full items-center justify-center gap-2 rounded-lg fm-accent-bg px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCompleting ? <><Loader2 size={18} className="animate-spin" /> Processing order…</> : <><Lock size={16} /> {paymentLabel}</>}
              </button>
              <div className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                <p>Your payment details are submitted directly to the selected payment provider and are not stored by this shop.</p>
              </div>
            </div>

            <footer className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-slate-200 pt-6 text-xs text-slate-500">
              <span>Secure payment</span>
              <span>Order support</span>
              <span>Privacy protected</span>
            </footer>
          </div>
        </main>

        <aside className="order-first border-b border-slate-200 bg-slate-50 px-5 py-7 sm:px-8 lg:order-none lg:border-b-0 lg:px-10 lg:py-12">
          <div className="mx-auto max-w-2xl lg:sticky lg:top-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
              {/* ⚡ Bolt: Replace O(N) array iterations in render with O(1) memoized value */}
              <span className="text-sm text-slate-500">{cartCount} item{cartCount === 1 ? "" : "s"}</span>
            </div>

            <div className="space-y-5">
              {cart.map(item => (
                <div key={`${item.id}-${item.variantId || "default"}`} className="flex items-center gap-4">
                  <div className="relative h-16 w-14 shrink-0 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                    <img src={item.photoUrl} alt="" className="h-full w-full rounded object-cover" />
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-600 px-1 text-xs font-semibold text-white">{item.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                    {item.variantName && <p className="mt-0.5 text-xs text-slate-500">{item.variantName}</p>}
                  </div>
                  <span className="text-sm font-medium text-slate-900">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="my-7 border-t border-slate-200" />

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && applyDiscount()}
                  placeholder="Discount code"
                  disabled={Boolean(appliedDiscount)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1773b0] focus:ring-1 focus:ring-[#1773b0] disabled:bg-slate-100"
                />
              </div>
              {appliedDiscount ? (
                <button type="button" onClick={removeDiscount} className="rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" aria-label="Remove discount"><X size={17} /></button>
              ) : (
                <button type="button" onClick={applyDiscount} disabled={isApplying || !discountCode} className="rounded-lg bg-slate-700 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {isApplying ? <Loader2 size={17} className="animate-spin" /> : "Apply"}
                </button>
              )}
            </div>
            {discountError && <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle size={13} />{discountError}</p>}
            {appliedDiscount && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--success)" }}><CheckCircle2 size={13} />{appliedDiscount.code} applied</p>}

            <div className="my-7 border-t border-slate-200" />

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-medium text-slate-900">{formatPrice(cartTotal)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between" style={{ color: "var(--success)" }}><span>Discount</span><span>-{formatPrice(discountAmount)}</span></div>}
              <div className="flex justify-between text-slate-600">
                <span>Shipping{getActiveShippingDetails()?.serviceName ? ` · ${getActiveShippingDetails()?.serviceName}` : ""}</span>
                <span className="font-medium text-slate-900">{isFreeShipping || shippingCost === 0 ? "Free" : formatPrice(finalShipping)}</span>
              </div>
              <div className="flex justify-between text-slate-600"><span>Estimated tax</span><span className="font-medium text-slate-900">{taxCost > 0 ? formatPrice(taxCost) : "Calculated at checkout"}</span></div>
            </div>

            <div className="my-6 border-t border-slate-200" />

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-slate-900">Total</p>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">{currency}</p>
              </div>
              <motion.p key={finalTotal} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="text-2xl font-semibold tracking-tight text-slate-950">{formatPrice(finalTotal)}</motion.p>
            </div>

            <div className="mt-7 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <Package size={18} className="mt-0.5 shrink-0 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Carefully packed and tracked</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">You’ll receive an order confirmation and shipping updates by email.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <GlobalSections design={settings?.design} />
    </div>
  );
}
