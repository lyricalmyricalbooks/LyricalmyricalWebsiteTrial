import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  setDoc,
  doc,
  getDoc,
  limit,
} from "firebase/firestore";
import { auth, db, googleProvider } from "../../../lib/firebase";
import { 
  ArrowLeft, LogOut, Package, Heart, MapPin, User as UserIcon, Loader2, 
  ChevronDown, ChevronUp, Copy, Check, Mail, ExternalLink, Download 
} from "lucide-react";
import { useSEO } from "../../lib/seo";
import { useWishlist } from "../../lib/wishlist";
import { useSiteData } from "./useSiteData";
import { StorefrontThemeStyle } from "./StorefrontThemeStyle";
import { adminApi } from "../../admin/api";
import { functionUrl } from "../../lib/functionsBase";
import toast from "react-hot-toast";

type CustomerProfile = {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  defaultAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
};

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [digitalItems, setDigitalItems] = useState<Record<string, Record<string, boolean>>>({});
  
  // Auth states
  const [emailLinkInput, setEmailLinkInput] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  
  // Address edit states
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "Canada",
    phone: "",
    name: "",
  });

  const { count: wishlistCount } = useWishlist();
  const { settings } = useSiteData();

  useSEO({ title: "Your Account", description: "Manage your account, orders and saved addresses." });

  // Handle incoming Magic Link authentication on mount
  useEffect(() => {
    const handleEmailAuthRedirect = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setAuthLoading(true);
        let email = window.localStorage.getItem("emailForSignIn");
        if (!email) {
          email = window.prompt("Please enter your email to confirm sign-in:");
        }
        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem("emailForSignIn");
            toast.success("Successfully signed in with email link!");
          } catch (err: any) {
            console.error("Email link sign in error:", err);
            toast.error(err.message || "Failed to sign in. Link may be expired.");
          }
        }
        setAuthLoading(false);
      }
    };
    handleEmailAuthRedirect();
  }, []);

  // Standard preview handler
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("preview=true")) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        loadCustomerData(u);
      }
    });
    return () => unsub();
  }, []);

  async function loadCustomerData(u: User) {
    setLoadingData(true);
    try {
      const profRef = doc(db, "customers", u.uid);
      const profSnap = await getDoc(profRef);
      if (profSnap.exists()) {
        const data = profSnap.data() as CustomerProfile;
        setProfile(data);
        // Pre-fill address edit form
        setAddressForm({
          street: data.defaultAddress?.street || "",
          city: data.defaultAddress?.city || "",
          state: data.defaultAddress?.state || "",
          zip: data.defaultAddress?.zip || "",
          country: data.defaultAddress?.country || "Canada",
          phone: data.phone || "",
          name: data.name || u.displayName || "",
        });
      } else {
        const fresh: CustomerProfile = {
          uid: u.uid,
          email: u.email || "",
          name: u.displayName || "",
        };
        await setDoc(profRef, fresh);
        setProfile(fresh);
        setAddressForm(prev => ({
          ...prev,
          name: fresh.name,
        }));
      }
      
      try {
        const q = query(
          collection(db, "orders"),
          where("customer.email", "==", u.email),
          orderBy("createdAt", "desc"),
          limit(50),
        );
        const snap = await getDocs(q);
        const loadedOrders = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((order: any) => order.isTest !== true);
        setOrders(loadedOrders);
        checkDigitalAssets(loadedOrders);
      } catch {
        const fallbackQuery = query(
          collection(db, "orders"),
          where("customer.email", "==", u.email)
        );
        const snap = await getDocs(fallbackQuery);
        const loadedOrders = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter((order: any) => order.isTest !== true)
          .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
          .slice(0, 50);
        setOrders(loadedOrders);
        checkDigitalAssets(loadedOrders);
      }
    } catch (err) {
      console.error("Failed to load account data", err);
    } finally {
      setLoadingData(false);
    }
  }

  // Scan order items for secure digital eBook versions
  // ⚡ Bolt: Eliminate N+1 queries by gathering unique book IDs and fetching them concurrently.
  async function checkDigitalAssets(loadedOrders: any[]) {
    const assetMap: Record<string, Record<string, boolean>> = {};

    // 1. Gather unique item IDs
    const uniqueItemIds = new Set<string>();
    for (const order of loadedOrders) {
      if (order.paymentStatus === "paid") {
        for (const item of order.items || []) {
          uniqueItemIds.add(item.id);
        }
      }
    }

    // 2. Fetch all unique items concurrently
    const digitalStatusMap: Record<string, boolean> = {};
    await Promise.all(
      Array.from(uniqueItemIds).map(async (id) => {
        try {
          const book = await adminApi.getBook(id);
          if (book && book.digitalFileName) {
            digitalStatusMap[id] = true;
          }
        } catch (err) {
          console.warn("E-Book metadata scan error:", err);
        }
      })
    );

    // 3. Map back to orders
    for (const order of loadedOrders) {
      if (order.paymentStatus !== "paid") continue;
      const orderDigitalItems: Record<string, boolean> = {};
      for (const item of order.items || []) {
        if (digitalStatusMap[item.id]) {
          orderDigitalItems[item.id] = true;
        }
      }
      if (Object.keys(orderDigitalItems).length > 0) {
        assetMap[order.id] = orderDigitalItems;
      }
    }
    setDigitalItems(assetMap);
  }

  // Passwordless Email Link triggers
  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!emailLinkInput.trim()) return;
    setSendingLink(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, emailLinkInput.trim(), actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", emailLinkInput.trim());
      toast.success("Magic sign-in link dispatched! Check your email.");
      setEmailLinkInput("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send magic link.");
    } finally {
      setSendingLink(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      const provider = googleProvider || new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Successfully logged in!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Google Authentication failed.");
    }
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoadingData(true);
    try {
      const updatedProfile: CustomerProfile = {
        uid: user.uid,
        email: user.email || "",
        name: addressForm.name,
        phone: addressForm.phone,
        defaultAddress: {
          street: addressForm.street,
          city: addressForm.city,
          state: addressForm.state,
          zip: addressForm.zip,
          country: addressForm.country,
        }
      };
      await setDoc(doc(db, "customers", user.uid), updatedProfile);
      setProfile(updatedProfile);
      setIsEditingAddress(false);
      toast.success("Profile address updated successfully!");
    } catch (err: any) {
      toast.error("Failed to save address details.");
    } finally {
      setLoadingData(false);
    }
  }

  const handleDownloadDigitalAsset = (order: any, itemId: string) => {
    if (!order.downloadToken) {
      toast.error("Download token has expired or is invalid.");
      return;
    }
    window.open(
      `${functionUrl("downloadDigitalAsset")}?orderId=${encodeURIComponent(order.id || order.orderId)}&itemId=${encodeURIComponent(itemId)}&token=${encodeURIComponent(order.downloadToken)}`,
      "_blank"
    );
  };

  const getTrackingUrl = (carrier: string, trackingNum: string) => {
    const cleanCarrier = (carrier || "").trim().toLowerCase();
    const cleanNum = (trackingNum || "").trim();
    if (cleanCarrier.includes("canada post")) {
      return `https://www.canadapost-postescanada.ca/track-reperage/en#/resultList?searchKeys=${encodeURIComponent(cleanNum)}`;
    }
    if (cleanCarrier.includes("usps")) {
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(cleanNum)}`;
    }
    if (cleanCarrier.includes("ups")) {
      return `https://www.ups.com/track?tracknum=${encodeURIComponent(cleanNum)}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(carrier + " " + cleanNum)}`;
  };

  if (authLoading) {
    return (
      <div data-fm-store className="min-h-screen fm-page text-white flex items-center justify-center">
        <StorefrontThemeStyle design={settings?.design} />
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div data-fm-store className="min-h-screen fm-page text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <StorefrontThemeStyle design={settings?.design} />
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: "rgba(var(--accent-rgb), 0.05)" }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="glass-card max-w-md w-full border border-white/5 p-10 rounded-[2.5rem] relative z-10 space-y-8 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 mx-auto">
              <UserIcon size={28} style={{ color: "var(--accent)" }} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase italic leading-none">Customer Account</h1>
            <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase mt-3 font-bold">Lyricalmyrical Books Ledger</p>
          </div>

          <form onSubmit={handleSendMagicLink} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black fm-muted uppercase tracking-widest block ml-1">Passwordless Sign In</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={emailLinkInput}
                  onChange={(e) => setEmailLinkInput(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-xs text-white outline-none focus:border-violet-500/30 focus:bg-white/[0.05] transition-all"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 fm-muted" size={14} />
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingLink}
              className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-2xl text-[9px] font-black tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-2"
            >
              {sendingLink ? <Loader2 size={12} className="animate-spin" /> : "Send Magic Link"}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[9px] font-black tracking-widest text-white/20 uppercase">OR</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full fm-active py-4.5 rounded-2xl text-[9px] font-black tracking-[0.3em] uppercase hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5"
          >
            Continue with Google
          </button>

          <div className="text-center pt-2">
            <Link to="/" className="text-[9px] tracking-[0.3em] text-white/40 hover:text-white uppercase transition-colors">
              Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-fm-store className="min-h-screen fm-page text-white relative overflow-hidden pb-24">
      <StorefrontThemeStyle design={settings?.design} />
      {/* Background glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] blur-[120px] rounded-full pointer-events-none -mr-64 -mt-64" style={{ backgroundColor: "rgba(var(--accent-rgb), 0.05)" }} />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/5 blur-[100px] rounded-full pointer-events-none" />

      <header className="border-b border-white/5 px-8 py-6 flex items-center justify-between backdrop-blur-xl relative z-20" style={{ backgroundColor: "rgba(var(--overlay-rgb), 0.2)" }}>
        <Link to="/" className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-white/40 hover:text-white transition-colors group uppercase">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Storefront
        </Link>
        <span className="text-[9px] font-black tracking-[0.4em] text-white/30 uppercase">Vault Portal</span>
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-white/40 hover:text-rose-400 transition-colors uppercase"
        >
          <LogOut size={14} /> Sign out
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-16 relative z-10 space-y-12">
        
        {/* Customer Header Info */}
        <section className="glass-card rounded-[2.5rem] border border-white/5 p-8 flex items-center gap-6">
          {user.photoURL ? (
            <img src={user.photoURL} className="w-16 h-16 rounded-full border border-white/10" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black uppercase" style={{ color: "var(--accent)" }}>
              {(user.displayName || user.email || "?")[0]}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">{user.displayName || profile?.name || "Customer Account"}</h1>
            <p className="text-[10px] tracking-widest uppercase fm-muted font-mono mt-1">{user.email}</p>
          </div>
        </section>

        {/* Dashboard Vitals Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/wishlist" className="glass-card border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.02] transition-colors flex flex-col gap-3 group">
            <Heart size={20} className="text-rose-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-[9px] font-black tracking-widest uppercase fm-muted">Wishlist Ledger</p>
              <p className="text-3xl font-black tracking-tight mt-1">{wishlistCount} Saved</p>
            </div>
          </Link>

          <div className="glass-card border border-white/5 rounded-[2rem] p-8 flex flex-col gap-3">
            <Package size={20} style={{ color: "var(--accent)" }} />
            <div>
              <p className="text-[9px] font-black tracking-widest uppercase fm-muted">Order Logs</p>
              <p className="text-3xl font-black tracking-tight mt-1">{orders.length} Transacted</p>
            </div>
          </div>

          <div className="glass-card border border-white/5 rounded-[2rem] p-8 flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.02] to-transparent pointer-events-none" />
            <MapPin size={20} className="text-cyan-400" />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-black tracking-widest uppercase fm-muted">Shipping Vector</p>
                <p className="text-[11px] font-bold text-white/75 leading-relaxed mt-2 uppercase tracking-wide">
                  {profile?.defaultAddress?.city
                    ? `${profile.defaultAddress.city}, ${profile.defaultAddress.country}`
                    : "Unconfigured"}
                </p>
              </div>
              <button 
                onClick={() => setIsEditingAddress(!isEditingAddress)}
                className="text-[9px] font-black tracking-[0.25em] text-cyan-400 hover:text-cyan-300 uppercase shrink-0"
              >
                {isEditingAddress ? "CLOSE" : "MANAGE"}
              </button>
            </div>
          </div>
        </section>

        {/* Address configuration form (drawer-like) */}
        {isEditingAddress && (
          <section className="glass-card border border-white/5 rounded-[2.5rem] p-10 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
              <h3 className="text-xs font-black tracking-[0.4em] uppercase text-cyan-400">Configure Shipping Vector</h3>
              <button onClick={() => setIsEditingAddress(false)} className="text-[9px] font-black tracking-widest fm-muted hover:text-white uppercase">ABORT</button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black fm-muted uppercase tracking-widest ml-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-cyan-500/50 transition-all font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black fm-muted uppercase tracking-widest ml-1">Contact Phone</label>
                  <input
                    type="text"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    placeholder="e.g. 647 123 4567"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black fm-muted uppercase tracking-widest ml-1">Street Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 456 Montrose Ave"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-[9px] font-black fm-muted uppercase tracking-widest ml-1">City</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black fm-muted uppercase tracking-widest ml-1">State / Province</label>
                  <input
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black fm-muted uppercase tracking-widest ml-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={addressForm.zip}
                    onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                  />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-[9px] font-black fm-muted uppercase tracking-widest ml-1">Country</label>
                  <input
                    type="text"
                    required
                    value={addressForm.country}
                    onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 rounded-xl text-[9px] font-black tracking-[0.3em] uppercase transition-all shadow-lg shadow-cyan-600/10"
                >
                  Save Vector Details
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="px-6 py-4 text-[9px] font-black tracking-widest fm-muted hover:text-white uppercase"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Order History Details View */}
        <section className="glass-card border border-white/5 rounded-[2.5rem] p-10">
          <h2 className="text-xs font-black tracking-[0.5em] text-white/30 uppercase mb-8">Purchase History Log</h2>
          {loadingData ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin" style={{ color: "var(--accent)" }} size={24} />
              <p className="text-[9px] font-black tracking-[0.3em] fm-muted uppercase">Accessing transaction logs...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Package size={32} className="mx-auto fm-muted" strokeWidth={1.2} />
              <p className="text-white/40 text-xs font-bold tracking-widest uppercase">No transaction entries found</p>
            </div>
          ) : (
            <ul className="space-y-6">
              {orders.map(o => {
                const isExpanded = expandedOrderId === o.id;
                const orderDigitalAssets = digitalItems[o.id] || {};
                
                return (
                  <li key={o.id} className="glass-card border border-white/5 rounded-[2rem] overflow-hidden transition-all duration-300 hover:border-white/10">
                    {/* Collapsed header row */}
                    <div 
                      onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                      className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-6">
                        <div
                          className={`p-3 rounded-xl ${o.paymentStatus === 'paid' ? '' : 'bg-amber-500/5 text-amber-400'}`}
                          style={
                            o.paymentStatus === 'paid'
                              ? { backgroundColor: "rgba(var(--success-rgb), 0.05)", color: "var(--success)" }
                              : undefined
                          }
                        >
                          <Package size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black tracking-widest text-white">{o.orderId || o.id}</p>
                          <p className="text-[9px] tracking-widest fm-muted uppercase mt-1">
                            {new Date(o.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · {(o.items || []).length} book{(o.items || []).length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 self-stretch md:self-auto justify-between border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const isDelivered = o.fulfillmentStatus === "delivered" || o.status === "completed";
                            return (
                              <span
                                className={`text-[8px] font-black tracking-widest uppercase px-3.5 py-1.5 rounded-xl border ${
                                  isDelivered
                                    ? ""
                                    : o.fulfillmentStatus === "shipped"
                                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }`}
                                style={
                                  isDelivered
                                    ? {
                                        backgroundColor: "rgba(var(--success-rgb), 0.1)",
                                        color: "var(--success)",
                                        borderColor: "rgba(var(--success-rgb), 0.2)",
                                      }
                                    : undefined
                                }
                              >
                                {o.fulfillmentStatus?.toUpperCase() || (o.status === 'completed' ? 'DELIVERED' : 'UNFULFILLED')}
                              </span>
                            );
                          })()}
                          <span
                            className={`text-[8px] font-black tracking-widest uppercase px-3.5 py-1.5 rounded-xl border ${
                              o.paymentStatus === 'paid'
                                ? ''
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                            style={
                              o.paymentStatus === 'paid'
                                ? {
                                    backgroundColor: "rgba(var(--success-rgb), 0.1)",
                                    color: "var(--success)",
                                    borderColor: "rgba(var(--success-rgb), 0.2)",
                                  }
                                : undefined
                            }
                          >
                            {o.paymentStatus?.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-white font-mono">CA${(o.total ?? 0).toFixed(2)}</span>
                          {isExpanded ? <ChevronUp size={14} className="fm-muted" /> : <ChevronDown size={14} className="fm-muted" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded details container */}
                    {isExpanded && (
                      <div className="p-8 border-t border-white/5 bg-white/[0.01] space-y-8 animate-in fade-in duration-300">
                        
                        {/* E-book downloads section */}
                        {Object.keys(orderDigitalAssets).length > 0 && o.paymentStatus === 'paid' && (
                          <div
                            className="border p-6 rounded-2xl space-y-4"
                            style={{ backgroundColor: "rgba(var(--accent-rgb), 0.08)", borderColor: "rgba(var(--accent-rgb), 0.2)" }}
                          >
                            <div>
                              <h4 className="text-xs font-black tracking-[0.3em] uppercase" style={{ color: "var(--accent)" }}>Digital Archive Access</h4>
                              <p className="text-[10px] fm-muted mt-1 leading-relaxed">Download your digital secure purchases. Tokens refresh automatically.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {o.items.map((item: any) => {
                                if (!orderDigitalAssets[item.id]) return null;
                                return (
                                  <div key={item.id} className="fm-surface-2 border border-white/5 rounded-xl p-4 flex justify-between items-center">
                                    <div className="truncate pr-4">
                                      <p className="text-[10px] font-bold text-white uppercase truncate">{item.title}</p>
                                      <p className="text-[8px] fm-muted uppercase tracking-widest mt-1">E-Book File</p>
                                    </div>
                                    <button
                                      onClick={() => handleDownloadDigitalAsset(o, item.id)}
                                      className="text-white p-2.5 rounded-lg transition-all flex items-center justify-center shrink-0 active:scale-95"
                                      style={{ backgroundColor: "var(--accent)" }}
                                      title="Download E-Book"
                                    >
                                      <Download size={12} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Line items details */}
                        <div className="space-y-4">
                          <h4 className="text-[9px] font-black tracking-widest fm-muted uppercase">Items Breakdown</h4>
                          <div className="space-y-3">
                            {o.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex gap-4 items-center">
                                <div className="w-10 aspect-[3/4] fm-surface rounded-md overflow-hidden border border-white/5 shrink-0">
                                  <img src={item.photoUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-grow min-w-0">
                                  <p className="text-[11px] font-black text-white uppercase tracking-wider truncate">{item.title}</p>
                                  <p className="text-[9px] fm-muted font-mono mt-1">QTY: {item.quantity} × CA${item.price.toFixed(2)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery logistics tracking details */}
                        {o.trackingNumber && (
                          <div className="bg-cyan-950/20 border border-cyan-500/15 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                              <p className="text-[9px] font-black tracking-[0.3em] text-cyan-400 uppercase">Dispatch Logistics</p>
                              <p className="text-xs font-mono fm-muted mt-2">
                                Carrier: {o.trackingCarrier} <span className="mx-2 fm-muted">|</span> Code: {o.trackingNumber}
                              </p>
                            </div>
                            <a 
                              href={getTrackingUrl(o.trackingCarrier, o.trackingNumber)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-6 py-3 fm-active hover:bg-slate-200 text-[9px] font-black tracking-widest uppercase rounded-xl transition-all flex items-center gap-2 shadow-lg"
                            >
                              Track Package <ExternalLink size={12} />
                            </a>
                          </div>
                        )}

                        {/* Order breakdown summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5 text-[11px] fm-muted">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black tracking-widest fm-muted uppercase">Shipping Address</p>
                            <p className="text-xs text-white/60 font-bold uppercase leading-relaxed mt-1">
                              {o.customer?.name}<br/>
                              {o.customer?.address?.street}<br/>
                              {o.customer?.address?.city}, {o.customer?.address?.state} {o.customer?.address?.zip}<br/>
                              {o.customer?.address?.country}
                            </p>
                          </div>

                          <div className="space-y-3 font-semibold fm-muted">
                            <div className="flex justify-between">
                              <span className="uppercase text-[9px] tracking-widest fm-muted">Subtotal</span>
                              <span className="font-mono text-white/80">CA${o.subtotal?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="uppercase text-[9px] tracking-widest fm-muted">Logistics Fee</span>
                              <span className="font-mono text-white/80">CA${o.shipping?.toFixed(2)}</span>
                            </div>
                            {o.discount > 0 && (
                              <div className="flex justify-between fm-success-text">
                                <span className="uppercase text-[9px] tracking-widest">Discount</span>
                                <span className="font-mono">-CA${o.discount?.toFixed(2)}</span>
                              </div>
                            )}
                            {o.tax > 0 && (
                              <div className="flex justify-between">
                                <span className="uppercase text-[9px] tracking-widest fm-muted">Estimated Tax</span>
                                <span className="font-mono text-white/80">CA${o.tax?.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t border-white/5 pt-3 text-white font-black">
                              <span className="uppercase text-[9px] tracking-widest text-white/30">Total</span>
                              <span className="font-mono text-base">CA${o.total?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
