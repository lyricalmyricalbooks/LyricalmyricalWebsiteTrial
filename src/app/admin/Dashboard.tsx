import { useState, useEffect } from "react";
import { motion } from "motion/react";
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
  History
} from "lucide-react";

import { Login } from "./Login";
import { BookCatalog } from "./BookCatalog";
import { BookEditor } from "./BookEditor";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [token, setToken] = useState(localStorage.getItem("adminToken"));
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  if (!token) {
    return <Login onLogin={setToken} />;
  }

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
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
          <h1 className="text-xl tracking-[0.2em] font-light italic">F✶M ADMIN</h1>
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

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm tracking-wider text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          >
            <LogOut size={18} />
            LOGOUT
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
                  onSave={() => { setShowEditor(false); setActiveTab("catalog"); }} 
                />
              </motion.div>
            </div>
          ) : (
            <>
              <header className="mb-12 flex justify-between items-end">
                <div>
                  <p className="text-[10px] tracking-[.3em] text-neutral-400 mb-2 uppercase">Management System</p>
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
                      { label: "Total Titles", value: "48", trend: "+3 this month", icon: BookOpen },
                      { label: "Stock Value", value: "$12,450", trend: "+12%", icon: TrendingUp },
                      { label: "In Print", value: "32", trend: "75% of catalog", icon: Package },
                      { label: "Active Authors", value: "24", trend: "Across 4 imprints", icon: Users },
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
                          <p className="text-[10px] text-green-600 mt-2 font-medium">{stat.trend}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Activity */}
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-100 shadow-sm p-8">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-light tracking-tight">Recent Catalog Activity</h3>
                        <button className="text-[10px] tracking-widest text-neutral-400 hover:text-black">VIEW ALL</button>
                      </div>
                      <div className="space-y-6">
                        {[1, 2, 3].map((_, i) => (
                          <div key={i} className="flex items-center justify-between py-4 border-b border-neutral-50 last:border-0">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-16 bg-neutral-100 rounded overflow-hidden">
                                <img src={`https://picsum.photos/seed/${i + 50}/200/300`} className="w-full h-full object-cover grayscale" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Find Still Catches Me Shifted</p>
                                <p className="text-[10px] text-neutral-400 tracking-wider">Updated 2 hours ago by Admin</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="px-3 py-1 bg-neutral-50 text-[9px] tracking-widest rounded-full text-neutral-500">PUBLISHED</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Alerts/Status */}
                    <div className="space-y-6">
                      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8">
                        <h4 className="text-sm tracking-widest text-neutral-400 uppercase mb-6 flex items-center gap-2">
                          <AlertCircle size={14} className="text-amber-500" />
                          Inventory Alerts
                        </h4>
                        <div className="space-y-4">
                          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <p className="text-xs font-medium text-amber-900">Low Stock: "Roadkill"</p>
                            <p className="text-[10px] text-amber-700 mt-1">2 copies remaining. Consider restock.</p>
                          </div>
                          <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <p className="text-xs font-medium text-red-900">Out of Stock: "Manpaw"</p>
                            <p className="text-[10px] text-red-700 mt-1">Sold out 4 days ago.</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-neutral-900 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <h4 className="text-sm font-light tracking-[.2em] mb-4">CATALOG STATUS</h4>
                            <div className="text-4xl font-light mb-6">92% <span className="text-xs text-white/40 tracking-normal">Healthy</span></div>
                            <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: "92%" }}
                                className="h-full bg-white"
                              />
                            </div>
                            <button className="flex items-center justify-between w-full text-[9px] tracking-[.3em] opacity-40 group-hover:opacity-100 transition-opacity">
                              RUN FULL AUDIT <ChevronRight size={12} />
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <BarChart3 size={120} />
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
                <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-neutral-200 rounded-3xl">
                  <p className="text-neutral-400 text-sm tracking-wider uppercase">Initialising <span className="font-bold text-black">{activeTab}</span> Module...</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
