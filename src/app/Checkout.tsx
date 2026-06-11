import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useCart } from "./CartContext";
import {
  ChevronLeft, Tag, ShieldCheck, X, AlertCircle,
  Package, Truck, CreditCard, CheckCircle2, Loader2, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi } from "./admin/api";
import { abandonedCartApi, funnelApi } from "./lib/commerce";
import { functionUrl } from "./lib/functionsBase";
import { useSEO } from "./lib/seo";
import { useCurrency } from "./CurrencyContext";
import { COUNTRIES, matchShippingZone } from "./features/site/shippingZones";

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

  useEffect(() => {
    async function loadFulfillmentSettings() {
      try {
        const [profiles, settings, bookList] = await Promise.all([
          adminApi.getShippingProfiles(),
          adminApi.getSettings() as Promise<any>,
          adminApi.getBooks(100)
        ]);
        setShippingProfiles(profiles);
        setTaxRates(settings?.taxes?.rates || []);
        setBooks(bookList);
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

  useEffect(() => {
    if (cart.length === 0 || shippingProfiles.length === 0) {
      setShippingCost(0);
      return;
    }
    // Geography-aware zone: explicit country > continent > legacy region name >
    // rest-of-world. Per-item shippingProfileId still wins when set.
    const zoneForCountry = matchShippingZone(customer.address.country, shippingProfiles) || shippingProfiles[0];

    let highestBase = 0;
    let totalAdditional = 0;

    cart.forEach((item, i) => {
      const profile = shippingProfiles.find(p => p.id === item.shippingProfileId) || zoneForCountry;

      const freeThreshold = profile?.freeThreshold ? Number(profile.freeThreshold) : 0;
      let base = Number(profile?.base || 15);
      let additional = Number(profile?.additional || 5);

      if (freeThreshold > 0 && cartTotal >= freeThreshold) {
        base = 0;
        additional = 0;
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
 
    setShippingCost(highestBase + totalAdditional);
  }, [customer.address.country, cart, shippingProfiles, cartTotal]);

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
    if (cart.length === 0 || shippingProfiles.length === 0) return null;
    const firstItem = cart[0];
    return (
      shippingProfiles.find(p => p.id === firstItem.shippingProfileId) ||
      matchShippingZone(customer.address.country, shippingProfiles) ||
      shippingProfiles[0]
    );
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

      const orderData = {
        customer,
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
        tax: taxCost,
        total: finalTotal,
        status: "pending_payment",
        paymentStatus: "unpaid",
        appliedDiscount: appliedDiscount
          ? { id: appliedDiscount.id, code: appliedDiscount.code, type: appliedDiscount.type, value: appliedDiscount.value }
          : null,
        metadata: { userAgent: navigator.userAgent, platform: "web" }
      };
      
      // Save customer email in localStorage to recover cart on payment success landing
      localStorage.setItem("last_customer_email", customer.email);
      
      const orderId = await adminApi.createOrder(orderData);

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
            if (!order) return; // forged/unknown order id — leave unconfirmed
          } catch {
            // transient read failure — retry
          }
          await new Promise(r => setTimeout(r, 2500));
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
    return (
      <div className="h-screen bg-[#050506] text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.15)_0%,transparent_70%)] pointer-events-none" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.8 }}
          className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-[2rem] bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(124,58,237,0.3)]">
            <CheckCircle2 size={44} className="text-violet-400" />
          </div>
          <p className="text-[9px] font-black tracking-[0.5em] text-violet-400 uppercase mb-4">
            {paymentConfirmed ? "Order Confirmed" : "Finalizing Payment"}
          </p>
          <h2 className="text-5xl font-black tracking-tighter uppercase italic text-white mb-4">Thank You</h2>
          <p className="text-white/30 text-xs font-mono mb-2 tracking-widest">ORDER #{orderNumber}</p>
          <p className="text-white/20 text-[10px] tracking-widest mb-14">
            {paymentConfirmed
              ? "A confirmation will be sent to your email."
              : "Your payment is being confirmed — the receipt email will follow shortly."}
          </p>
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
                    <CreditCard size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black tracking-[0.25em] text-white uppercase">Secure Payment</p>
                    <p className="text-[9px] text-white/30 tracking-widest">Powered by Stripe</p>
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
                    {isCompleting
                      ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
                      : <><Lock size={14} /> Pay with Stripe</>
                    }
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
