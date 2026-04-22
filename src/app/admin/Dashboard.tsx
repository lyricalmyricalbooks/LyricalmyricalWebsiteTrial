import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  LayoutGrid,
  Menu,
  X as CloseIcon,
  Search,
  Bell,
  HelpCircle,
  Database,
  Layers
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
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
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-violet-500/10 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-white text-[10px] tracking-[0.6em] font-black animate-pulse">AUTHORIZING SECURE ACCESS</p>
        </div>
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

  const navItems = [
    { id: "overview", label: "Intelligence", icon: BarChart3, color: "text-cyan-400" },
    { id: "orders", label: "Operations", icon: ShoppingBag, color: "text-violet-400" },
    { id: "catalog", label: "Archives", icon: Database, color: "text-emerald-400" },
    { id: "discounts", label: "Campaigns", icon: BadgePercent, color: "text-amber-400" },
    { id: "marketing", label: "Growth", icon: Rocket, color: "text-rose-400" },
    { id: "apps", label: "App Center", icon: Layers, color: "text-blue-400" },
    { 
      id: "settings", 
      label: "System Config", 
      icon: Settings,
      color: "text-slate-400",
      children: [
        { id: "general", label: "General" },
        { id: "communications", label: "Communications" },
        { id: "shipping", label: "Logistics" },
        { id: "payments", label: "Financials" },
        { id: "taxes", label: "Fiscal" },
        { id: "pages", label: "Content" },
        { id: "designer", label: "Interface" },
      ]
    },
  ];

  return (
    <div className="flex h-screen bg-[#050506] text-white overflow-hidden font-manrope antialiased selection:bg-violet-500/30">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] lg:hidden" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col z-[70] transform transition-all duration-500 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex items-center gap-4 mb-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative h-12 w-12 rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-2xl">
              <ShieldCheck className="text-violet-500" size={28} />
            </div>
          </div>
          <div>
            <p className="text-sm font-black tracking-tighter text-white">ARCHON<span className="text-violet-500">.</span>OS</p>
            <p className="text-slate-500 text-[9px] uppercase tracking-[0.3em] font-black">Admin Protocol</p>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => { 
                  setActiveTab(item.id); 
                  setShowEditor(false); 
                  setSelectedOrder(null); 
                  if (item.id === "settings") setSettingsTab("general");
                  if (item.id !== "settings") setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-5 py-3.5 text-[11px] uppercase tracking-widest font-black transition-all rounded-2xl group relative ${
                  activeTab === item.id && !showEditor && !selectedOrder
                    ? "bg-white/5 text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]" 
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.02]"
                }`}
              >
                {activeTab === item.id && !showEditor && !selectedOrder && (
                  <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-violet-500 rounded-r-full" />
                )}
                <item.icon size={18} className={`${activeTab === item.id ? item.color : "text-slate-600 group-hover:text-slate-400"} transition-colors`} />
                {item.label}
              </button>

              <AnimatePresence>
                {item.id === "settings" && activeTab === "settings" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-12 space-y-1 pb-4 overflow-hidden"
                  >
                    {item.children?.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => {
                          setSettingsTab(child.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full text-left py-2 text-[10px] uppercase tracking-[0.2em] font-black transition-all ${
                          settingsTab === child.id 
                            ? "text-violet-400" 
                            : "text-slate-600 hover:text-slate-400"
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <div className="glass-card rounded-[2rem] border border-white/5 p-6 space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0 shadow-2xl">
                 {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-violet-400 font-black text-xs">{user.displayName?.[0] || user.email?.[0]}</div>}
              </div>
              <div className="truncate">
                <p className="text-[10px] font-black text-white truncate uppercase tracking-widest">{user.displayName || "Administrator"}</p>
                <p className="text-[8px] text-slate-500 truncate font-mono">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 py-3 text-[9px] font-black text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl border border-transparent hover:border-rose-500/20 transition-all uppercase tracking-[0.2em]"
            >
              <LogOut size={14} />
              Terminate Session
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/5 blur-[120px] rounded-full -ml-64 -mb-64 pointer-events-none" />

        {/* TopNavBar */}
        <header className="h-20 flex items-center justify-between px-10 bg-black/20 backdrop-blur-2xl border-b border-white/5 shrink-0 z-50">
          <div className="flex items-center gap-10">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white border border-white/10"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center bg-white/[0.03] rounded-2xl px-5 py-2.5 border border-white/5 group focus-within:border-violet-500/30 transition-all w-96 shadow-inner">
              <Search className="text-slate-600 group-focus-within:text-violet-400 transition-colors" size={18} />
              <input 
                className="bg-transparent border-none focus:ring-0 text-xs tracking-widest text-slate-200 placeholder-slate-700 w-full px-3 uppercase font-black" 
                placeholder="Search global archives..." 
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button className="p-3 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 active:scale-95 relative">
                <Bell size={20} />
                <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-black" />
              </button>
              <button className="p-3 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 active:scale-95">
                <HelpCircle size={20} />
              </button>
            </div>
            <div className="h-10 w-px bg-white/5 mx-2" />
            <div className="flex items-center gap-4 pl-2">
               <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-black text-white uppercase tracking-tighter leading-none">System Active</p>
                 <p className="text-[8px] text-emerald-500 font-mono mt-1">Uptime: 99.9%</p>
               </div>
               <div className="h-10 w-10 rounded-xl border border-white/10 overflow-hidden ring-4 ring-white/5 shadow-2xl shrink-0">
                  {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-violet-400 font-black text-xs">{user.displayName?.[0] || user.email?.[0]}</div>}
               </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-10 relative scroll-smooth custom-scrollbar">
          <div className="max-w-[1400px] mx-auto pb-20">
            {showEditor ? (
              <div className="fixed inset-0 z-[100] p-6 md:p-12 bg-black/80 backdrop-blur-xl flex items-center justify-center">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="w-full max-w-7xl h-[92vh] glass-card rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col"
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
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div>
                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-4 font-black">
                      <span className="opacity-50">System</span>
                      <ChevronRight size={10} className="text-slate-800" />
                      <span className="text-violet-400">{activeTab}</span>
                      {activeTab === "settings" && (
                        <>
                          <ChevronRight size={10} className="text-slate-800" />
                          <span className="text-violet-400/60">{settingsTab}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">{activeTab}</h2>
                    <p className="text-slate-500 text-xs font-medium mt-4 max-w-xl leading-relaxed">
                      Interface Protocol for {activeTab} management. Accessing secure backend layers for real-time synchronization.
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                    <button className="flex items-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95">
                      <History size={16} className="text-slate-500" />
                      View Logs
                    </button>
                    <button 
                      onClick={handleAddBook}
                      className="flex items-center gap-3 bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_10px_30px_rgba(124,58,237,0.3)] border border-violet-400/20"
                    >
                      <Plus size={18} />
                      Deploy Entry
                    </button>
                  </div>
                </header>

                <div className="min-h-[600px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab + (selectedOrder ? "-detail" : "") + settingsTab}
                      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
                      transition={{ duration: 0.4, ease: "circOut" }}
                    >
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
                              <div className="glass-card rounded-[3rem] border border-white/5 p-20 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-cyan-600/5" />
                                <div className="relative z-10">
                                  <div className="w-24 h-24 rounded-[2rem] bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-8 mx-auto rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                    <LayoutGrid size={40} />
                                  </div>
                                  <p className="text-slate-500 text-[10px] tracking-[0.6em] uppercase mb-4 font-black">Secure Transmission</p>
                                  <p className="text-4xl font-black uppercase tracking-tighter text-white italic">{activeTab} Protocol</p>
                                  <p className="text-slate-400 text-sm mt-6 max-w-sm mx-auto leading-relaxed">
                                    The {activeTab} architecture is fully integrated. All operational data is encrypted and mirrored across edge nodes.
                                  </p>
                                  <button className="mt-10 text-violet-400 font-black text-[10px] uppercase tracking-[0.3em] hover:text-white transition-colors">
                                    Refresh Module Data
                                  </button>
                                </div>
                              </div>
                            );
                        }
                      })()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
