import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { HashRouter, Routes, Route, Link } from "react-router";
import { 
  BookOpen, 
  Users, 
  Settings, 
  LayoutDashboard, 
  Package, 
  Truck, 
  LogOut,
  ChevronRight,
  Plus,
  AlertCircle,
  BarChart3,
  TrendingUp,
  History,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Home,
  BadgePercent,
  Rocket,
  LayoutGrid
} from "lucide-react";

import { Login } from "./Login";
import { BookCatalog } from "./BookCatalog";
import { BookEditor } from "./BookEditor";
import { Discounts } from "./Discounts";
import { Orders } from "./Orders";
import { OrderDetail } from "./OrderDetail";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { ShopSettings } from "./ShopSettings";
import { adminApi } from "./api";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [settingsTab, setSettingsTab] = useState("general");

  useEffect(() => {
    // Listen for Firebase Auth changes
    const unsubscribe = adminApi.onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
      if (u) loadStats();
    });
    return () => unsubscribe();
  }, []);

  async function loadStats() {
    try {
      const s = await adminApi.getStats();
      setStats(s);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <p className="text-white text-[10px] tracking-[0.4em] animate-pulse">VERIFYING ADMIN ACCESS...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  const handleLogout = async () => {
    await adminApi.logout();
  };

  const handleEditBook = (book: any) => {
    setEditingBook(book);
    setShowEditor(true);
  };

  const handleAddBook = () => {
    setEditingBook(null);
    setShowEditor(true);
  };

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-black text-white flex flex-col">
        <div className="p-8">
          <h1 className="text-xl tracking-[0.2em] font-light italic">F✶M</h1>
          <div className="flex items-center gap-2 mt-2 opacity-40">
            <ShieldCheck size={12} className="text-green-500" />
            <p className="text-[9px] tracking-[0.1em] uppercase">Secure Firebase Backend</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {[
            { id: "overview", label: "Dashboard", icon: Home },
            { id: "orders", label: "Orders", icon: Package },
            { id: "catalog", label: "Products", icon: Tag },
            { id: "discounts", label: "Discounts", icon: BadgePercent },
            { id: "marketing", label: "Marketing", icon: Rocket },
            { id: "apps", label: "App center", icon: LayoutGrid },
            { 
              id: "settings", 
              label: "Shop settings", 
              icon: Settings,
              children: [
                { id: "general", label: "General" },
                { id: "communications", label: "Communications" },
                { id: "shipping", label: "Shipping" },
                { id: "payments", label: "Payments" },
                { id: "taxes", label: "Taxes" },
                { id: "designer", label: "Shop designer" },
              ]
            },
          ].map((item) => (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => { setActiveTab(item.id); setShowEditor(false); setSelectedOrder(null); if (item.id === "settings") setSettingsTab("general"); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm tracking-widest transition-all rounded-lg ${
                  activeTab === item.id && !showEditor && !selectedOrder
                    ? "bg-white text-[#A855F7] font-bold" 
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                {item.label}
              </button>

              {item.id === "settings" && activeTab === "settings" && (
                <div className="pl-12 space-y-1 pb-2">
                  {item.children?.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSettingsTab(child.id)}
                      className={`w-full text-left py-2 text-[11px] tracking-widest transition-all ${
                        settingsTab === child.id 
                          ? "text-white font-bold" 
                          : "text-white/40 hover:text-white"
                      }`}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-6 px-4">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden border border-white/20">
               {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <Users size={14} />}
            </div>
            <div className="truncate">
              <p className="text-[10px] text-white/40 truncate tracking-wider uppercase font-bold">{user.displayName || "Admin"}</p>
              <p className="text-[9px] text-white/20 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm tracking-wider text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          >
            <LogOut size={18} />
            SECURE LOGOUT
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-neutral-50 p-8 relative">
        <div className="max-w-6xl mx-auto">
          {showEditor ? (
            <div className="fixed inset-0 z-50 p-8 md:p-12 bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-6xl h-full"
              >
                <BookEditor 
                  book={editingBook} 
                  onClose={() => setShowEditor(false)} 
                  onSave={() => { setShowEditor(false); setActiveTab("catalog"); loadStats(); }} 
                />
              </motion.div>
            </div>
          ) : (
            <>
              <header className="mb-12 flex justify-between items-end">
                <div>
                  <p className="text-[10px] tracking-[.3em] text-neutral-400 mb-2 uppercase">Google Verified Console</p>
                  <h2 className="text-4xl font-light tracking-tight text-neutral-900 capitalize">{activeTab}</h2>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={handleAddBook}
                    className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-full text-xs tracking-widest hover:bg-neutral-800 transition-all shadow-lg hover:shadow-xl translate-y-0 active:translate-y-px"
                  >
                    <Plus size={14} />
                    NEW RELEASE
                  </button>
                </div>
              </header>

              {(() => {
                switch (activeTab) {
                  case "overview": return <AnalyticsDashboard />;
                  case "catalog": return <BookCatalog onEdit={handleEditBook} onAdd={handleAddBook} />;
                  case "discounts": return <Discounts />;
                  case "orders": 
                    return selectedOrder ? (
                      <OrderDetail orderId={selectedOrder.id} onClose={() => setSelectedOrder(null)} />
                    ) : (
                      <Orders onSelectOrder={(order) => setSelectedOrder(order)} />
                    );
                  case "settings": return <ShopSettings activeTab={settingsTab} setActiveTab={setSettingsTab} />;
                  default:
                    return (
                      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-neutral-100">
                        <p className="text-neutral-400 text-[10px] tracking-[0.3em] uppercase mb-2">Cloud Synced</p>
                        <p className="text-black font-bold uppercase tracking-[0.1em]">{activeTab} Module Active</p>
                      </div>
                    );
                }
              })()}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
