import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router";
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
  Sun,
  Moon,
  Layers,
  ShoppingCart,
  CreditCard,
  Globe,
  Mail
} from "lucide-react";

import { Login } from "./Login";
import { BookCatalog } from "./BookCatalog";
import { BookEditor } from "./BookEditor";
import { Discounts } from "./Discounts";
import { Orders } from "./Orders";
import { OrderDetail } from "./OrderDetail";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { ShopSettings } from "./ShopSettings";
import { ThemeEditor } from "./ThemeEditor";
import ReviewsModeration from "./ReviewsModeration";
import { adminApi } from "./api";

export function Dashboard() {
  console.log("Dashboard rendering...");
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [settingsTab, setSettingsTab] = useState("general");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [adminTheme, setAdminTheme] = useState(() => {
    return localStorage.getItem("adminTheme") || "dark";
  });

  const toggleTheme = () => {
    const newTheme = adminTheme === "dark" ? "light" : "dark";
    setAdminTheme(newTheme);
    localStorage.setItem("adminTheme", newTheme);
  };

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const data = await adminApi.getAuditLog(50);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    if (showLogs) {
      loadLogs();
    }
  }, [showLogs]);

  useEffect(() => {
    // Debug bypass
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true') {
      console.log("DEBUG MODE: Bypassing auth");
      setUser({
        displayName: "Debug Admin",
        email: "lyricalmyricalbooks@gmail.com",
        photoURL: null
      });
      setLoading(false);
      loadStats();
      loadSettings();
      return;
    }

    const unsubscribe = adminApi.onAuthStateChange((u) => {
      console.log("Auth state change:", u?.email);
      setUser(u);
      setLoading(false);
      if (u) {
        loadStats();
        loadSettings();
      }
    });
    return () => unsubscribe();
  }, []);

  async function loadSettings() {
    console.log("Loading settings...");
    try {
      const data = await adminApi.getSettings();
      console.log("Settings loaded:", data);
      setSettings(JSON.parse(JSON.stringify(data)));
      setOriginalSettings(data);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  }

  const saveSection = async (section: string, data: any, options: any = {}) => {
    try {
      await adminApi.updateSettings(data, options);
      if (data.design) {
        if (options.publish) {
          setSettings((prev: any) => ({ ...prev, design: data.design, draftDesign: data.design }));
        } else {
          setSettings((prev: any) => ({ ...prev, draftDesign: data.design }));
        }
      } else {
        setSettings((prev: any) => ({ ...prev, ...data }));
      }
    } catch (err) {
      alert("Error saving settings");
    }
  };

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
          <p className="text-white text-[10px] tracking-[0.6em] font-black animate-pulse">LOADING ADMIN DASHBOARD</p>
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
    { id: "overview", label: "Overview", icon: LayoutDashboard, color: "text-cyan-400" },
    { id: "orders", label: "Orders", icon: ShoppingCart, color: "text-violet-400" },
    { id: "catalog", label: "Books", icon: BookOpen, color: "text-emerald-400" },
    { id: "discounts", label: "Discounts", icon: Tag, color: "text-amber-400" },
    { id: "reviews", label: "Reviews", icon: BadgePercent, color: "text-pink-400" },
    { id: "pages", label: "Pages", icon: Layers, color: "text-indigo-400" },
    { id: "settings", label: "Settings", icon: Settings, color: "text-rose-400", children: [
        { id: "general", label: "General Settings", icon: ShieldCheck },
        { id: "shipping", label: "Shipping", icon: Truck },
        { id: "payments", label: "Payments", icon: CreditCard },
        { id: "designer", label: "Design", icon: LayoutGrid },
        { id: "notifications", label: "Notifications", icon: Mail },
      ]
    },
  ];

  return (
    <div className={adminTheme === "light" ? "admin-light" : ""}>
    <div className={`flex h-screen overflow-hidden font-manrope antialiased selection:bg-violet-500/30 ${adminTheme === "light" ? "bg-[#f8fafc] text-slate-900" : "bg-[#050506] text-white"}`}>
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
        <div className="p-8 flex items-center gap-3.5 mb-8 border-b border-white/5">
          <div className="relative group shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative h-11 w-11 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <BookOpen className="text-white" size={20} />
            </div>
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1">
              <span className="font-extrabold tracking-[0.12em] text-sm text-white select-none">LYRICAL</span>
              <span className="font-black tracking-[0.12em] text-sm text-violet-500 select-none">MYRICAL</span>
            </div>
            <span className="text-[8px] font-black tracking-[0.3em] text-slate-500 block mt-1 uppercase">PUBLISHING HOUSE</span>
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
              onClick={() => {
                const adminIdx = window.location.pathname.toLowerCase().indexOf("/admin");
                const basePath = adminIdx !== -1 ? window.location.pathname.substring(0, adminIdx) : "";
                window.open(window.location.origin + basePath + "/", "_blank");
              }}
              className="w-full flex items-center justify-center gap-3 py-3 text-[9px] font-black text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-xl border border-transparent hover:border-cyan-500/20 transition-all uppercase tracking-[0.2em] mb-2"
            >
              <Globe size={14} />
              View Site
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 py-3 text-[9px] font-black text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl border border-transparent hover:border-rose-500/20 transition-all uppercase tracking-[0.2em]"
            >
              <LogOut size={14} />
              Log Out
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
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-violet-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search books, orders, discounts..." 
                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-xs text-white placeholder:text-slate-600 outline-none focus:border-violet-500/30 focus:bg-slate-900/80 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const adminIdx = window.location.pathname.toLowerCase().indexOf("/admin");
                  const basePath = adminIdx !== -1 ? window.location.pathname.substring(0, adminIdx) : "";
                  window.open(window.location.origin + basePath + "/", "_blank");
                }}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 group relative"
                title="View Live Website"
              >
                <Globe size={16} className="text-cyan-400 group-hover:text-cyan-300" />
                <span className="font-black tracking-[0.2em] uppercase text-[10px]">View Site</span>
              </button>
              <button 
                onClick={handleAddBook}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 group relative"
              >
                <Plus size={16} className="text-violet-400 group-hover:text-violet-300" />
                <span className="font-black tracking-[0.2em] uppercase text-[10px]">Add Book</span>
              </button>
              <button className="p-3 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 active:scale-95">
                <HelpCircle size={20} />
              </button>
              <button 
                onClick={toggleTheme}
                className="p-3 text-slate-500 hover:text-white transition-all hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 active:scale-95"
                title={`Toggle ${adminTheme === "light" ? "Dark" : "Light"} Mode`}
              >
                {adminTheme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
            <div className="h-10 w-px bg-white/5 mx-2" />
            <div className="flex items-center gap-4 pl-2">
               <div className="text-right hidden sm:block">
                 <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-500/80 tracking-widest uppercase">Storefront Live</span>
                 </div>
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
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div>
                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-4 font-black">
                      <span className="opacity-50">Storefront</span>
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
                      Manage your {activeTab}. All changes are synced in real-time with the live website.
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowLogs(true)}
                      className="flex items-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95"
                    >
                      <History size={16} className="text-slate-500" />
                      Activity Logs
                    </button>
                    <button 
                      onClick={handleAddBook}
                      className="flex items-center gap-3 bg-violet-600 hover:bg-violet-50 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_10px_30px_rgba(124,58,237,0.3)] border border-violet-400/20"
                    >
                      <Plus size={18} />
                      Add Book
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
                          case "overview": 
                          case "analytics":
                            return <AnalyticsDashboard setActiveTab={setActiveTab} onEditBook={handleEditBook} />;
                          case "catalog": return <BookCatalog onEdit={handleEditBook} onAdd={handleAddBook} refreshTrigger={catalogRefreshKey} />;
                          case "discounts": return <Discounts />;
                          case "reviews": return <ReviewsModeration />;
                          case "orders": 
                            return selectedOrder ? (
                              <OrderDetail orderId={selectedOrder.id} onClose={() => setSelectedOrder(null)} />
                            ) : (
                              <Orders onSelectOrder={(order) => setSelectedOrder(order)} />
                            );
                          case "pages":
                          case "shipping":
                          case "payments":
                          case "settings": 
                            return (
                              <ShopSettings 
                                activeTab={activeTab === "settings" ? settingsTab : activeTab} 
                                setActiveTab={activeTab === "settings" ? setSettingsTab : (tab: string) => {
                                  if (tab === "shipping" || tab === "payments") {
                                    setActiveTab(tab);
                                  } else {
                                    setActiveTab("settings");
                                    setSettingsTab(tab);
                                  }
                                }} 
                                settings={settings}
                                setSettings={setSettings}
                                originalSettings={originalSettings}
                                settingsLoading={settingsLoading}
                                saveSection={saveSection}
                              />
                            );
                          default:
                            return (
                              <div className="glass-card rounded-[3rem] border border-white/5 p-20 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-cyan-600/5" />
                                <div className="relative z-10">
                                  <div className="w-24 h-24 rounded-[2rem] bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-8 mx-auto rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                    <LayoutGrid size={40} />
                                  </div>
                                  <span className="text-xs font-black text-slate-500 tracking-[0.3em] uppercase">Publisher Management</span>
                                  <p className="text-4xl font-black uppercase tracking-tighter text-white italic mt-4">{activeTab} Publisher</p>
                                  <p className="text-slate-400 text-sm mt-6 max-w-sm mx-auto leading-relaxed">
                                    The {activeTab} system is fully synchronized. All library data is mirrored and secured.
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
          </div>
        </main>
      </div>
    </div>
      {/* Book Editor Takeover */}
      <AnimatePresence>
        {showEditor && (
          <div className="fixed inset-0 z-[300] bg-[#F9F8FA] w-screen h-screen flex flex-col">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full flex flex-col"
            >
              <BookEditor 
                book={editingBook} 
                onClose={() => setShowEditor(false)} 
                onSave={() => { 
                  setShowEditor(false); 
                  if (activeTab === "catalog") {
                    setCatalogRefreshKey(prev => prev + 1);
                  }
                  loadStats(); 
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Theme Editor Takeover */}
      <AnimatePresence>
        {activeTab === "settings" && settingsTab === "designer" && settings && (
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="fixed inset-0 z-[200] bg-black"
          >
            <ThemeEditor
              settings={settings}
              onSave={async (design: any, options: any) => {
                await saveSection("design", { design }, options);
              }}
              onExit={() => setSettingsTab("general")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audit Logs Takeover */}
      <AnimatePresence>
        {showLogs && (
          <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 md:p-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="w-full max-w-4xl h-full max-h-[85vh] bg-[#050506] border border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-white italic">Activity Logs</h3>
                    <p className="text-[10px] text-slate-500 font-medium tracking-wide mt-1">REAL-TIME LOG OF ACTIONS AND CHANGES</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogs(false)}
                  className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white border border-white/10 transition-all hover:bg-white/10 active:scale-95"
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {logsLoading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-6">
                    <div className="w-12 h-12 border-2 border-violet-500/10 border-t-violet-500 rounded-full animate-spin" />
                    <p className="text-[10px] tracking-[0.4em] font-black uppercase text-slate-500">Retrieving logs...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-700 mb-6">
                      <Database size={28} />
                    </div>
                    <p className="text-slate-500 text-[10px] tracking-[0.3em] uppercase font-black italic">No records in audit path.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs.map((log: any) => {
                      const date = new Date(log.createdAt);
                      const formattedTime = isNaN(date.getTime()) 
                        ? log.createdAt 
                        : date.toLocaleString(undefined, { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit' 
                          });

                      let categoryClass = "text-slate-400 bg-slate-500/5 border-slate-500/10";
                      switch (log.type) {
                        case "catalog":
                          categoryClass = "text-emerald-400 bg-emerald-500/5 border-emerald-500/10";
                          break;
                        case "shipping":
                          categoryClass = "text-rose-400 bg-rose-500/5 border-rose-500/10";
                          break;
                        case "campaigns":
                          categoryClass = "text-amber-400 bg-amber-500/5 border-amber-500/10";
                          break;
                        case "settings":
                          categoryClass = "text-indigo-400 bg-indigo-500/5 border-indigo-500/10";
                          break;
                        case "inventory":
                          categoryClass = "text-cyan-400 bg-cyan-500/5 border-cyan-500/10";
                          break;
                      }

                      return (
                        <div 
                          key={log.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.02] hover:border-white/10 transition-all group"
                        >
                          <div className="flex items-start gap-4">
                            <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md border shrink-0 mt-0.5 ${categoryClass}`}>
                              {log.type}
                            </span>
                            <p className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors mt-0.5">
                              {log.message}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono tracking-tight text-left sm:text-right shrink-0">
                            {formattedTime}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between shrink-0">
                <span className="text-[9px] font-black text-slate-600 tracking-widest uppercase">
                  Activity logs are encrypted and restricted to administrators
                </span>
                <button
                  onClick={loadLogs}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all active:scale-95"
                >
                  Refresh Logs
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
