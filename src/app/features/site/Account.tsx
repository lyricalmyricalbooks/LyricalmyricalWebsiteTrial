import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
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
import { ArrowLeft, LogOut, Package, Heart, MapPin, User as UserIcon, Loader2 } from "lucide-react";
import { useSEO } from "../../lib/seo";
import { useWishlist } from "../../lib/wishlist";

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

  const { count: wishlistCount } = useWishlist();

  useSEO({ title: "Your Account", description: "Manage your account, orders and saved addresses." });

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("preview=true")) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      setAuthLoading(false);
      if (u) loadCustomerData(u);
    });
    return () => unsub();
  }, []);

  async function loadCustomerData(u: User) {
    setLoadingData(true);
    try {
      const profRef = doc(db, "customers", u.uid);
      const profSnap = await getDoc(profRef);
      if (profSnap.exists()) {
        setProfile(profSnap.data() as CustomerProfile);
      } else {
        const fresh: CustomerProfile = {
          uid: u.uid,
          email: u.email || "",
          name: u.displayName || "",
        };
        await setDoc(profRef, fresh);
        setProfile(fresh);
      }
      try {
        const q = query(
          collection(db, "orders"),
          where("customer.email", "==", u.email),
          orderBy("createdAt", "desc"),
          limit(50),
        );
        const snap = await getDocs(q);
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {
        // index may not exist; fallback to client filter on small dataset
        const snap = await getDocs(collection(db, "orders"));
        setOrders(
          snap.docs
            .map(d => ({ id: d.id, ...(d.data() as any) }))
            .filter(o => o.customer?.email === u.email)
            .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)),
        );
      }
    } catch (err) {
      console.error("Failed to load account data", err);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSignIn() {
    try {
      const provider = googleProvider || new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-white/40" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center px-6 text-center">
        <UserIcon size={32} className="text-white/30 mb-6" strokeWidth={1.4} />
        <h1 className="text-3xl font-light tracking-tight mb-3">Account</h1>
        <p className="text-white/50 text-sm max-w-xs mb-10 leading-relaxed">
          Sign in to view your order history, save addresses and manage your wishlist.
        </p>
        <button
          onClick={handleSignIn}
          className="bg-white text-black px-10 py-4 rounded-full text-[10px] tracking-[0.4em] font-bold uppercase hover:bg-white/90 transition-colors"
        >
          Continue with Google
        </button>
        <Link to="/" className="mt-8 text-[10px] tracking-[0.3em] text-white/40 hover:text-white uppercase">
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <header className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/50 hover:text-white uppercase">
          <ArrowLeft size={14} /> Shop
        </Link>
        <span className="text-[10px] tracking-[0.4em] text-white/40 uppercase">Account</span>
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/50 hover:text-rose-400 uppercase"
        >
          <LogOut size={12} /> Sign out
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <section className="flex items-center gap-5">
          {user.photoURL ? (
            <img src={user.photoURL} className="w-16 h-16 rounded-full border border-white/10" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold">
              {(user.displayName || user.email || "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-light tracking-tight">{user.displayName || profile?.name || "Customer"}</h1>
            <p className="text-[11px] tracking-widest uppercase text-white/40">{user.email}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/wishlist" className="border border-white/10 rounded-2xl p-6 hover:bg-white/[0.03] transition-colors flex flex-col gap-2">
            <Heart size={16} className="text-rose-400" />
            <p className="text-[10px] tracking-widest uppercase text-white/40">Wishlist</p>
            <p className="text-2xl font-light tracking-tight">{wishlistCount}</p>
          </Link>
          <div className="border border-white/10 rounded-2xl p-6 flex flex-col gap-2">
            <Package size={16} className="text-violet-400" />
            <p className="text-[10px] tracking-widest uppercase text-white/40">Orders</p>
            <p className="text-2xl font-light tracking-tight">{orders.length}</p>
          </div>
          <div className="border border-white/10 rounded-2xl p-6 flex flex-col gap-2">
            <MapPin size={16} className="text-cyan-400" />
            <p className="text-[10px] tracking-widest uppercase text-white/40">Default address</p>
            <p className="text-xs text-white/60 leading-relaxed">
              {profile?.defaultAddress?.city
                ? `${profile.defaultAddress.city}, ${profile.defaultAddress.country}`
                : "Not set yet"}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-black tracking-[0.5em] text-white/30 uppercase mb-6">Order History</h2>
          {loadingData ? (
            <p className="text-[10px] tracking-widest text-white/30 uppercase">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="text-white/40 text-sm">No orders yet — when you place one, it will appear here.</p>
          ) : (
            <ul className="divide-y divide-white/5 border-y border-white/5">
              {orders.map(o => (
                <li key={o.id} className="py-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-widest text-white">{o.orderId || o.id}</p>
                    <p className="text-[10px] tracking-widest text-white/30 uppercase">
                      {new Date(o.createdAt).toLocaleDateString()} · {(o.items || []).length} item{(o.items || []).length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full border ${
                        o.fulfillmentStatus === "delivered" || o.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : o.fulfillmentStatus === "shipped"
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {o.fulfillmentStatus || o.status || "open"}
                    </span>
                    <span className="text-sm font-bold text-white tabular-nums">${(o.total ?? 0).toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
