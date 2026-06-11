import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useCart } from "./CartContext";
import {
  ChevronLeft, Tag, ShieldCheck, X, AlertCircle,
  Package, Truck, CreditCard, CheckCircle2, Loader2, Lock, Building
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi } from "./admin/api";
import { abandonedCartApi, funnelApi } from "./lib/commerce";
import { functionUrl } from "./lib/functionsBase";
import { useSEO } from "./lib/seo";
import { useCurrency } from "./CurrencyContext";
import { COUNTRIES, matchShippingZone } from "./features/site/shippingZones";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// ─── Country selector (matches Field styling) ─────────────────────────────────
function CountryField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Country"
        className="peer w-full bg-white/[0.04] border border-white/10 rounded-2xl pt-6 pb-3 px-5 text-sm text-white outline-none transition-all duration-300 focus:border-violet-500/60 focus:bg-white/[0.07] appearance-none cursor-pointer"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.name} className="bg-[#0a0a0c] text-white">{c.name}</option>
        ))}
      </select>
      <label className="absolute left-5 top-2 text-[8px] font-black tracking-[0.15em] uppercase text-violet-400 pointer-events-none">Country</label>
      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none text-xs">▾</span>
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
        className="peer w-full bg-white/[0.04] border border-white/10 rounded-2xl pt-6 pb-3 px-5 text-sm text-white outline-none transition-all duration-300 focus:border-violet-500/60 focus:bg-white/[0.07] placeholder-transparent"
      />
      <label className={`absolute left-5 transition-all duration-200 pointer-events-none font-black tracking-[0.15em] uppercase
        ${focused || filled
          ? "top-2 text-[8px] text-violet-400"
          : "top-1/2 -translate-y-1/2 text-[10px] text-white/30"
        }`}>
        {label}
      </label>
    </div>
  );
}

// ─── Step badge ───────────────────────────────────────────────────────────────
function StepBadge({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-[10px] font-black text-violet-400 tracking-widest shrink-0">
        {n}
      </div>
      <span className="text-[10px] font-black tracking-[0.35em] text-white/30 uppercase">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const { currency, formatPrice } = useCurrency();

  const [isApplying, setIsApplying]     = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSuccess, setIsSuccess]       = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [orderNumber, setOrderNumber]   = useState("");

  const [discountCode, setDiscountCode]       = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [discountError, setDiscountError]     = useState("");

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

  const validateDiscountRestrictions = (discount: any, email: string, cartItems: any[], booksCatalog: any[]) => {
    // 1. Min quantity / min order amount
    const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    if (discount.minQuantity && totalQty < discount.minQuantity) {
      throw new Error(`This code requires a minimum of ${discount.minQuantity} items in your cart.`);
    }
    const itemsSubtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
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
      const hasMatchingCategory = cartItems.some(item => {
        const catalogBook = booksCatalog.find(b => b.id === item.id);
        const bookCats = catalogBook && Array.isArray(catalogBook.categories) ? catalogBook.categories : [];
        return bookCats.some(cat => selectedCats.includes(cat));
      });
      if (!hasMatchingCategory) {
        throw new Error(`This code only applies to categories: ${selectedCats.join(", ")}.`);
      }
    } else if (discount.appliesTo === "products") {
      const selectedProds = discount.selectedProducts || [];
      const hasMatchingProduct = cartItems.some(item => selectedProds.includes(item.id));
      if (!hasMatchingProduct) {
        throw new Error("This code only applies to specific products not currently in your cart.");
      }
    }
  };

  const [availableRates, setAvailableRates] = useState<any[]>([]);
  const [selectedRateName, setSelectedRateName] = useState<string>("");

  useEffect(() => {
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

    const profileRates: Record<string, any[]> = {};
    
    Object.entries(profileItemsMap).forEach(([pid, items]) => {
      let profile = shippingProfiles.find(p => p.id === pid);
      if (!profile && pid !== "general-profile") {
        profile = shippingProfiles.find(p => p.id === "general-profile");
      }
      if (!profile) {
        profile = shippingProfiles[0];
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

      let matchedZone = profile.zones.find((z: any) => 
        z.countries?.some((c: string) => c.toLowerCase() === country)
      );

      if (!matchedZone) {
        matchedZone = profile.zones.find((z: any) => 
          z.countries?.some((c: string) => 
            c.toLowerCase() === "rest of world" || 
            c.toLowerCase() === "everywhere else" || 
            c.toLowerCase() === "international"
          )
        );
      }

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

    const combinedRates = uniqueRateNames.map(rateName => {
      let highestBase = 0;
      let totalAdditional = 0;
      let maxDeliveryDays = "3-7";
      let hasDelDays = false;

      cart.forEach((item, i) => {
        const pid = item.shippingProfileId || "general-profile";
        const ratesForProfile = profileRates[pid] || [];
        let matchedRate = ratesForProfile.find(r => r.name === rateName);
        if (!matchedRate && ratesForProfile.length > 0) {
          matchedRate = [...ratesForProfile].sort((a, b) => Number(a.base) - Number(b.base))[0];
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
  }, [customer.address.country, cart, shippingProfiles, cartTotal]);

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
        validateDiscountRestrictions(appliedDiscount, customer.email, cart, books);
      } catch (err: any) {
        setAppliedDiscount(null);
        setDiscountError(err.message || "Discount no longer valid.");
      }
    }
  }, [customer.email, cart, books, appliedDiscount]);
 
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

    const discountAmount = calculateDiscountAmount();
    const subtotalAfterDiscount = cartTotal - discountAmount;
    setTaxCost(subtotalAfterDiscount * (taxPercent / 100));
  }, [customer.address.country, customer.address.state, cartTotal, appliedDiscount, taxRates]);
 
  const applyDiscount = async () => {
    if (!discountCode) return;
    setIsApplying(true);
    setDiscountError("");
    try {
      const discount = await adminApi.validateDiscount(discountCode);
      validateDiscountRestrictions(discount, customer.email, cart, books);
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
 
  const calculateDiscountAmount = () => {
    if (!appliedDiscount) return 0;
    
    // Calculate qualifying subtotal
    const qualifyingSubtotal = (() => {
      if (appliedDiscount.appliesTo === "all" || appliedDiscount.appliesTo === "catalog") {
        return cartTotal;
      }
      return cart.reduce((sum, item) => {
        let qualifies = false;
        if (appliedDiscount.appliesTo === "categories") {
          const catalogBook = books.find(b => b.id === item.id);
          const bookCats = catalogBook && Array.isArray(catalogBook.categories) ? catalogBook.categories : [];
          qualifies = bookCats.some(cat => appliedDiscount.selectedCategories?.includes(cat));
        } else if (appliedDiscount.appliesTo === "products") {
          qualifies = appliedDiscount.selectedProducts?.includes(item.id);
        }
        return qualifies ? sum + item.quantity * item.price : sum;
      }, 0);
    })();

    if (appliedDiscount.type === "percentage") {
      return qualifyingSubtotal * (appliedDiscount.value / 100);
    }
    if (appliedDiscount.type === "fixed") {
      return Math.min(appliedDiscount.value, qualifyingSubtotal);
    }
    return 0;
  };

  const isFreeShipping  = appliedDiscount?.type === "freeship";
  const discountAmount  = calculateDiscountAmount();
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
      abandonedCartApi.upsert(`active_${customer.email.toLowerCase()}`, {
        email: customer.email,
        items: cart.map(i => ({ id: i.id, title: i.title, qty: i.quantity, price: i.price })),
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
        window.location.href = `${window.location.origin}${import.meta.env.BASE_URL}checkout?success=true&order_id=${orderId}&paypal=true`;
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
    if (params.get("success")) {
      const oid = params.get("order_id") || "";
      if (!oid) return;
      setOrderNumber(oid);

      // Don't trust the URL parameter alone: confirm the webhook actually
      // marked the order paid (poll briefly to absorb webhook latency).
      let cancelled = false;
      (async () => {
        try {
          const order: any = await adminApi.getOrderById(oid);
          if (order) {
            setSuccessOrder(order);
            if (params.get("paypal")) {
              setPaymentConfirmed(true);
            } else if (order.paymentStatus === "paid") {
              setPaymentConfirmed(true);
            } else if (order.paymentStatus === "pending") {
              setPaymentConfirmed(false);
            }
          }
        } catch (err) {
          console.error("Failed to load order on success landing", err);
        }

        // If it's not a manual or paypal order, poll to confirm payment
        if (!params.get("manual") && !params.get("paypal")) {
          for (let attempt = 0; attempt < 4 && !cancelled; attempt++) {
            try {
              const order: any = await adminApi.getOrderById(oid);
              if (order && order.paymentStatus === "paid") {
                if (cancelled) return;
                setPaymentConfirmed(true);
                funnelApi.track("purchase");
                const email = customer.email || localStorage.getItem("last_customer_email") || "";
                if (email) {
                  abandonedCartApi.markRecovered(`active_${email.toLowerCase()}`);
                }
                return;
              }
            } catch {
              // retry
            }
            await new Promise(r => setTimeout(r, 2500));
          }
        } else {
          // Manual/PayPal tracking
          funnelApi.track("purchase");
          const email = customer.email || localStorage.getItem("last_customer_email") || "";
          if (email) {
            abandonedCartApi.markRecovered(`active_${email.toLowerCase()}`);
          }
        }
      })();

      setIsSuccess(true);
      clearCart();
      return () => { cancelled = true; };
    }
    if (params.get("canceled")) alert("Order payment was canceled.");
  }, [customer.email]);

  // ── Success screen ──────────────────────────────────────────────────────────
  if (isSuccess) {
    const isManual = successOrder?.paymentStatus === "pending";
    return (
      <div className="h-screen bg-[#050506] text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.15)_0%,transparent_70%)] pointer-events-none" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.8 }}
          className="relative z-10 flex flex-col items-center max-w-md w-full">
          <div className="w-24 h-24 rounded-[2rem] bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(124,58,237,0.3)]">
            <CheckCircle2 size={44} className="text-violet-400" />
          </div>
          <p className="text-[9px] font-black tracking-[0.5em] text-violet-400 uppercase mb-4">
            {isManual 
              ? "Order Placed" 
              : (paymentConfirmed ? "Order Confirmed" : "Finalizing Payment")}
          </p>
          <h2 className="text-5xl font-black tracking-tighter uppercase italic text-white mb-4">Thank You</h2>
          <p className="text-white/30 text-xs font-mono mb-2 tracking-widest">ORDER #{orderNumber}</p>
          
          {isManual ? (
            <div className="w-full mt-4 mb-10 p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] text-left space-y-4 shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-[0.25em] italic flex items-center gap-2">
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
            className="flex items-center gap-3 bg-violet-600 hover:bg-violet-500 text-white px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase transition-all active:scale-95 shadow-[0_10px_40px_rgba(124,58,237,0.4)]">
            Continue Exploring
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <div className="h-screen bg-[#050506] text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-8">
            <Package size={36} className="text-white/20" strokeWidth={1} />
          </div>
          <p className="text-[9px] font-black tracking-[0.5em] text-white/20 uppercase mb-4">Empty Archive</p>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white mb-12">Nothing Here</h2>
          <Link to="/"
            className="bg-white text-black px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase hover:bg-white/90 transition-all active:scale-95">
            Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // ── Main checkout ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050506] text-white font-sans selection:bg-violet-500/30">

      {/* Test Mode Warning Banner */}
      {settings?.payments?.testMode && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-3.5 px-6 flex items-center justify-center gap-3 relative z-20 shadow-md">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-[10px] text-amber-400 font-black tracking-[0.2em] uppercase text-center">
            Test Mode Active &bull; Checkout is running in sandbox mode &bull; Real charges will not occur
          </p>
        </div>
      )}

      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-violet-600/8 blur-[140px] rounded-full pointer-events-none -mr-72 -mt-72" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <nav className="relative z-10 px-8 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-black/20">
        <Link to="/" className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-white/40 hover:text-white transition-colors uppercase group">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Site
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase">Secure Checkout</span>
        </div>
        <div className="flex items-center gap-2 text-white/20">
          <Lock size={12} />
          <span className="text-[9px] font-black tracking-widest uppercase">SSL Encrypted</span>
        </div>
      </nav>

      {/* Body */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 xl:gap-20">

        {/* ── LEFT: Form ──────────────────────────────────────────────────────── */}
        <div className="space-y-12">

          {/* 01 Order Summary */}
          <section>
            <StepBadge n="01" label="Order Summary" />
            <div className="space-y-4">
              {cart.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex gap-6 bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-violet-500/20 transition-all group"
                >
                  <div className="w-16 aspect-[3/4] bg-black rounded-xl overflow-hidden shrink-0 shadow-lg border border-white/5">
                    <img src={item.photoUrl} alt={item.title || ""} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-2">
                    <h3 className="text-xs font-black tracking-[0.2em] uppercase text-white">{item.title}</h3>
                    <p className="text-[10px] text-white/30 font-mono">QTY: {item.quantity} × {formatPrice(item.price)}</p>
                    <p className="text-sm font-black text-white/80 tracking-tight">{formatPrice(item.quantity * item.price)}</p>
                  </div>
                  <div className="self-center">
                    <span className="text-[8px] font-black tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg uppercase">
                      {item.quantity > 1 ? `×${item.quantity}` : "1 COPY"}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* 02 Promotion */}
          <section>
            <StepBadge n="02" label="Promotion Code" />
            <div>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Tag size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type="text"
                    value={discountCode}
                    onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && applyDiscount()}
                    placeholder="PROMO CODE"
                    disabled={!!appliedDiscount}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-sm text-white tracking-[0.2em] placeholder:text-white/20 outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all disabled:opacity-50 font-mono"
                  />
                  {appliedDiscount && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">Applied</span>
                      <button onClick={removeDiscount} className="text-white/20 hover:text-white transition-colors p-1">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
                {!appliedDiscount && (
                  <button
                    onClick={applyDiscount}
                    disabled={isApplying || !discountCode}
                    className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl text-[10px] font-black tracking-[0.25em] uppercase hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30 active:scale-95"
                  >
                    {isApplying ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Apply"}
                  </button>
                )}
              </div>
              <AnimatePresence>
                {discountError && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-3 text-[9px] font-black tracking-widest text-red-400 flex items-center gap-2 uppercase"
                  >
                    <AlertCircle size={10} /> {discountError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* 03 Shipping Details */}
          <section>
            <StepBadge n="03" label="Shipping Details" />
            {!currentUser && (
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center mb-6">
                <div>
                  <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Save Time</p>
                  <p className="text-[10px] font-bold text-white mt-1">Log in to prefill shipping details.</p>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="bg-white text-black text-[9px] font-black tracking-widest uppercase px-6 py-3 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Login with Google
                </button>
              </div>
            )}
            <div className="space-y-4">
              <Field label="Full Name" value={customer.name} onChange={v => setCustomer({ ...customer, name: v })} autoComplete="name" required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email Address" type="email" value={customer.email} onChange={v => setCustomer({ ...customer, email: v })} autoComplete="email" inputMode="email" required />
                <Field label="Phone (optional)" type="tel" value={customer.phone} onChange={v => setCustomer({ ...customer, phone: v })} />
              </div>
              <Field label="Street Address" value={customer.address.street} onChange={v => setCustomer({ ...customer, address: { ...customer.address, street: v } })} autoComplete="street-address" required />
              <div className="grid grid-cols-3 gap-4">
                <Field label="City" value={customer.address.city} onChange={v => setCustomer({ ...customer, address: { ...customer.address, city: v } })} autoComplete="address-level2" />
                <Field label="State" value={customer.address.state} onChange={v => setCustomer({ ...customer, address: { ...customer.address, state: v } })} autoComplete="address-level1" />
                <Field label="Postal Code" value={customer.address.zip} onChange={v => setCustomer({ ...customer, address: { ...customer.address, zip: v } })} autoComplete="postal-code" />
              </div>
              <CountryField
                value={customer.address.country}
                onChange={v => setCustomer({ ...customer, address: { ...customer.address, country: v } })}
              />
              {(() => {
                const z = getActiveShippingDetails();
                return z ? (
                  <p className="text-[9px] font-black tracking-[0.2em] text-white/30 uppercase px-1">
                    Ships via <span className="text-violet-400">{z.region}</span> zone
                    {Number(z.freeThreshold) > 0 && (
                      <span className="text-emerald-400"> · free over {formatPrice(Number(z.freeThreshold))}</span>
                    )}
                  </p>
                ) : null;
              })()}
            </div>
          </section>

          {/* 3.5 Shipping Method */}
          {availableRates.length > 0 && (
            <section className="animate-in fade-in slide-in-from-top-4 duration-300">
              <StepBadge n="3.5" label="Shipping Method" />
              <div className="space-y-4">
                {availableRates.map((rate) => (
                  <label
                    key={rate.name}
                    className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all cursor-pointer ${
                      selectedRateName === rate.name
                        ? "bg-violet-600/10 border-violet-500/50 text-white"
                        : "bg-white/[0.03] border-white/5 text-white hover:border-white/10"
                    }`}
                    onClick={() => setSelectedRateName(rate.name)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedRateName === rate.name ? "border-violet-500" : "border-white/20"
                      }`}>
                        {selectedRateName === rate.name && (
                          <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black tracking-widest uppercase">{rate.name}</p>
                        {rate.deliveryDays && (
                          <p className="text-[9px] text-white/30 tracking-widest mt-1 uppercase font-semibold">
                            Estimated Delivery: {rate.deliveryDays} Business Days
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono">
                      {rate.price === 0 ? "FREE" : formatPrice(rate.price)}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}
          {/* 3.8 Payment Method */}
          {settings?.payments && (
            <section className="animate-in fade-in slide-in-from-top-4 duration-300 mt-12">
              <StepBadge n="3.8" label="Payment Method" />
              <div className="space-y-4">
                {/* Stripe Card Option */}
                {settings.payments.stripe?.connected && (
                  <div
                    onClick={() => setSelectedPaymentMethod("stripe")}
                    className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all cursor-pointer ${
                      selectedPaymentMethod === "stripe"
                        ? "bg-violet-600/10 border-violet-500/50 text-white"
                        : "bg-white/[0.03] border-white/5 text-white hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedPaymentMethod === "stripe" ? "border-violet-500" : "border-white/20"
                      }`}>
                        {selectedPaymentMethod === "stripe" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black tracking-widest uppercase">Credit / Debit Card</p>
                        <p className="text-[9px] text-white/30 tracking-widest mt-1 uppercase font-semibold">
                          Pay securely with Stripe
                        </p>
                      </div>
                    </div>
                    <CreditCard size={18} className="text-white/40" />
                  </div>
                )}

                {/* PayPal Option */}
                {settings.payments.paypal?.connected && (
                  <div
                    onClick={() => setSelectedPaymentMethod("paypal")}
                    className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all cursor-pointer ${
                      selectedPaymentMethod === "paypal"
                        ? "bg-violet-600/10 border-violet-500/50 text-white"
                        : "bg-white/[0.03] border-white/5 text-white hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedPaymentMethod === "paypal" ? "border-violet-500" : "border-white/20"
                      }`}>
                        {selectedPaymentMethod === "paypal" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black tracking-widest uppercase">PayPal</p>
                        <p className="text-[9px] text-white/30 tracking-widest mt-1 uppercase font-semibold">
                          Pay with your PayPal account
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black italic text-white/40">PayPal</span>
                  </div>
                )}

                {/* Manual Methods Options */}
                {(settings.payments.manualMethods || [])
                  .filter((m: any) => m.enabled)
                  .map((method: any) => (
                    <div
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(`manual_${method.id}`)}
                      className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all cursor-pointer ${
                        selectedPaymentMethod === `manual_${method.id}`
                          ? "bg-violet-600/10 border-violet-500/50 text-white"
                          : "bg-white/[0.03] border-white/5 text-white hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          selectedPaymentMethod === `manual_${method.id}` ? "border-violet-500" : "border-white/20"
                        }`}>
                          {selectedPaymentMethod === `manual_${method.id}` && (
                            <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black tracking-widest uppercase">{method.name}</p>
                          <p className="text-[9px] text-white/30 tracking-widest mt-1 uppercase font-semibold">
                            Manual Payment Instructions provided on success
                          </p>
                        </div>
                      </div>
                      <Building size={16} className="text-white/40" />
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>

        {/* ── RIGHT: Order total + payment ─────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="sticky top-8 space-y-4">

            {/* Totals card */}
            <div className="bg-white/[0.03] border border-white/8 rounded-[2rem] p-8 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.06] to-transparent pointer-events-none" />
              <div className="relative z-10">
                <StepBadge n="04" label="Final Settlement" />

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Subtotal</span>
                    <span className="text-sm font-black text-white/70 font-mono">{formatPrice(cartTotal)}</span>
                  </div>

                  <AnimatePresence>
                    {appliedDiscount && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="flex justify-between items-center">
                        <span className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase">Discount ({appliedDiscount.code})</span>
                        <span className="text-sm font-black text-emerald-400 font-mono">−{formatPrice(discountAmount)}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">
                        <Truck size={12} className="text-white/20" /> Shipping
                      </span>
                      {getActiveShippingDetails() && (
                        <p className="text-[8px] text-white/30 uppercase tracking-widest pl-5 font-semibold">
                          {getActiveShippingDetails()?.serviceName || "Standard Shipping"}
                          {getActiveShippingDetails()?.deliveryDays && ` (${getActiveShippingDetails()?.deliveryDays} Days)`}
                        </p>
                      )}
                    </div>
                    <span className={`text-sm font-black font-mono ${isFreeShipping || shippingCost === 0 ? "text-emerald-400 font-bold" : "text-white/70"}`}>
                      {isFreeShipping || shippingCost === 0 ? "FREE" : formatPrice(shippingCost)}
                    </span>
                  </div>

                  {taxCost > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Estimated Tax</span>
                      <span className="text-sm font-black text-white/70 font-mono">{formatPrice(taxCost)}</span>
                    </div>
                  )}

                  <AnimatePresence>
                    {isFreeShipping && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="flex justify-between items-center">
                        <span className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase">Promo Shipping</span>
                        <span className="text-sm font-black text-emerald-400">FREE</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-6 border-t border-white/8">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black tracking-[0.35em] text-white/30 uppercase mb-1">Total Payable</p>
                      <p className="text-[9px] font-black tracking-widest text-white/20 uppercase">{currency}</p>
                    </div>
                    <motion.span
                      key={finalTotal}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-5xl font-black tracking-tighter text-white animate-fade-in"
                    >
                      {formatPrice(finalTotal)}
                    </motion.span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment card */}
            <div className="bg-white/[0.03] border border-white/8 rounded-[2rem] p-8 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-violet-600/[0.05] to-transparent pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                    {selectedPaymentMethod.startsWith("manual_") ? (
                      <Building size={18} className="text-violet-400" />
                    ) : (
                      <CreditCard size={18} className="text-violet-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black tracking-[0.25em] text-white uppercase">
                      {selectedPaymentMethod.startsWith("manual_") ? "Manual Order" : "Secure Payment"}
                    </p>
                    <p className="text-[9px] text-white/30 tracking-widest">
                      {selectedPaymentMethod === "stripe"
                        ? "Powered by Stripe"
                        : selectedPaymentMethod === "paypal"
                        ? "Powered by PayPal"
                        : "Direct Settlement"}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <ShieldCheck size={20} className="text-white/10" />
                  </div>
                </div>

                <button
                  onClick={handleCompletePurchase}
                  disabled={isCompleting}
                  className="w-full relative overflow-hidden bg-violet-600 hover:bg-violet-500 text-white py-5 rounded-2xl text-[11px] font-black tracking-[0.4em] uppercase transition-all active:scale-[0.98] disabled:opacity-60 shadow-[0_20px_50px_rgba(124,58,237,0.35)] group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {isCompleting ? (
                      <><Loader2 size={16} className="animate-spin" /> Processing...</>
                    ) : selectedPaymentMethod === "stripe" ? (
                      <><Lock size={14} /> Pay with Stripe</>
                    ) : selectedPaymentMethod === "paypal" ? (
                      <><Lock size={14} /> Pay with PayPal</>
                    ) : (
                      <><Lock size={14} /> Place Order</>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <div className="flex items-center justify-center gap-3 opacity-30">
                  <div className="w-1 h-1 rounded-full bg-white" />
                  <p className="text-[8px] font-black tracking-[0.2em] text-white uppercase">256-bit SSL · PCI DSS Compliant</p>
                  <div className="w-1 h-1 rounded-full bg-white" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
