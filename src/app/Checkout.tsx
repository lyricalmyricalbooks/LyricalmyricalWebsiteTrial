import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useCart } from "./CartContext";
import {
  ChevronLeft, Tag, ShieldCheck, X, AlertCircle,
  Package, Truck, CreditCard, CheckCircle2, Loader2, Lock, Building
} from "lucide-react";
import { motion } from "framer-motion";
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
        status: "open",
        fulfillmentStatus: "unfulfilled",
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
  const hasStripe = Boolean(settings?.payments?.stripe?.connected);
  const hasPaypal = Boolean(settings?.payments?.paypal?.connected);
  const enabledManualMethods = (settings?.payments?.manualMethods || []).filter((method: any) => method.enabled);
  const paymentLabel = selectedPaymentMethod === "stripe"
    ? "Pay securely"
    : selectedPaymentMethod === "paypal"
      ? "Continue to PayPal"
      : "Place order";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-sky-100">
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
                  <CheckCircle2 size={20} className="text-emerald-600" />
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
              {availableRates.length > 0 ? (
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
                {hasPaypal && (
                  <label className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-4 ${hasStripe ? "border-t border-slate-200" : ""}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment-method" checked={selectedPaymentMethod === "paypal"} onChange={() => setSelectedPaymentMethod("paypal")} className="h-4 w-4 accent-[#1773b0]" />
                      <span className="text-sm font-medium">PayPal</span>
                    </div>
                    <span className="text-sm font-bold italic text-[#003087]">PayPal</span>
                  </label>
                )}
                {enabledManualMethods.map((method: any, index: number) => (
                  <label key={method.id} className={`flex cursor-pointer items-center justify-between gap-4 border-t border-slate-200 px-4 py-4 ${!hasStripe && !hasPaypal && index === 0 ? "border-t-0" : ""}`}>
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
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1773b0] px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#12649b] focus:outline-none focus:ring-2 focus:ring-[#1773b0] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCompleting ? <><Loader2 size={18} className="animate-spin" /> Processing order…</> : <><Lock size={16} /> {paymentLabel}</>}
              </button>
              <div className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
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
              <span className="text-sm text-slate-500">{cart.reduce((sum, item) => sum + item.quantity, 0)} item{cart.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"}</span>
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
            {appliedDiscount && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={13} />{appliedDiscount.code} applied</p>}

            <div className="my-7 border-t border-slate-200" />

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-medium text-slate-900">{formatPrice(cartTotal)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{formatPrice(discountAmount)}</span></div>}
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
    </div>
  );
}
