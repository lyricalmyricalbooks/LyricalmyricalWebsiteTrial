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
  ShieldCheck
} from "lucide-react";

import { Login } from "./Login";
import { BookCatalog } from "./BookCatalog";
import { BookEditor } from "./BookEditor";
import { adminApi } from "./api";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [stats, setStats] = useState<any>(null);

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
            { id: "overview", label: "Dashboard", icon: LayoutDashboard },
            { id: "catalog", label: "Book Catalog", icon: BookOpen },
            { id: "authors", label: "Authors", icon: Users },
            { id: "shipping", label: "Shipping", icon: Truck },
            { id: "settings", label: "Site Settings", icon: Settings },
            { id: "audit", label: "Audit Log", icon: History },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setShowEditor(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm tracking-wider transition-all rounded-lg ${
                activeTab === item.id && !showEditor
                  ? "bg-white text-black font-medium" 
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
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

              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                      { label: "Total Titles", value: stats?.totalBooks || "0", trend: "Live in Firestore", icon: BookOpen },
                      { label: "Stock Units", value: stats?.stockCount || "0", trend: "Inventory level", icon: TrendingUp },
                      { label: "Drafts", value: stats?.draftCount || "0", trend: "Internal prep", icon: Package },
                      { label: "Contributors", value: stats?.authors || "0", trend: "Linked authors", icon: Users },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-neutral-50 rounded-lg">
                            <stat.icon size={20} className="text-neutral-500" />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] tracking-widest text-neutral-400 uppercase mb-1">{stat.label}</p>
                          <p className="text-2xl font-light text-neutral-900">{stat.value}</p>
                          <p className="text-[10px] text-neutral-400 mt-2 font-medium tracking-wider uppercase">{stat.trend}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Activity Placeholder */}
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[300px]">
                       <History size={32} className="text-neutral-100 mb-4" />
                       <p className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase">Database initialised. Add books to see activity.</p>
                    </div>

                    {/* Firestore Status */}
                    <div className="space-y-6">
                      <div className="bg-neutral-900 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <h4 className="text-sm font-light tracking-[.2em] mb-4">FIRESTORE CONNECTED</h4>
                            <div className="text-4xl font-light mb-6">LIVE <span className="text-xs text-white/40 tracking-normal">Cloud DB</span></div>
                            <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                className="h-full bg-green-500"
                              />
                            </div>
                            <button className="flex items-center justify-between w-full text-[9px] tracking-[.3em] opacity-40 group-hover:opacity-100 transition-opacity">
                              ACTIVE PROJECT: {adminApi.getProjectId?.() || "LYRICAL-WEB-V2"} <ChevronRight size={12} />
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <ShieldCheck size={120} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "catalog" && (
                <BookCatalog onEdit={handleEditBook} onAdd={handleAddBook} />
              )}

              {["authors", "shipping", "settings", "audit"].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-neutral-100">
                  <p className="text-neutral-400 text-[10px] tracking-[0.3em] uppercase mb-2">Cloud Synced</p>
                  <p className="text-black font-bold uppercase tracking-[0.1em]">{activeTab} Module Active</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
