import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, Settings, LayoutDashboard, LogOut, Plus, History, Tag, BadgePercent,
  Layers, ShoppingCart, Globe, Menu, HelpCircle, Sun, Moon, ChevronDown,
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
import {
  AppShell, Sidebar, Topbar, PageHeader, Breadcrumbs, PrimaryButton, SecondaryButton,
  IconButton, Dialog, ToastProvider, SyncChip, useOnline, type NavEntry,
} from "./riso/components";
import { GlobalSearch, ActivityLogDialog } from "./riso/shellParts";
import { NAV, PAGE_COPY } from "./riso/nav";

const openSite = () => {
  const adminIdx = window.location.pathname.toLowerCase().indexOf("/admin");
  const basePath = adminIdx !== -1 ? window.location.pathname.substring(0, adminIdx) : "";
  window.open(window.location.origin + basePath + "/", "_blank", "noopener");
};

export function Dashboard() {
  const online = useOnline();
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [adminTheme, setAdminTheme] = useState(() => {
    // Reso is the admin's primary design, not an optional storefront skin.
    // A versioned preference moves existing installs off the legacy dark UI
    // once while still letting an administrator deliberately choose dark mode.
    return localStorage.getItem("adminThemeReso") || "light";
  });

  const toggleTheme = () => {
    const newTheme = adminTheme === "dark" ? "light" : "dark";
    setAdminTheme(newTheme);
    localStorage.setItem("adminThemeReso", newTheme);
  };

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
        // Keep the "saved" baseline in step so unsaved-change state clears after a save.
        setOriginalSettings((prev: any) => ({ ...prev, ...JSON.parse(JSON.stringify(data)) }));
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
      <div className="rp" data-rp-appearance={adminTheme === "dark" ? "dark" : "light"}>
        <div className="rp-login" role="status" aria-live="polite">
          <div style={{ display: "grid", justifyItems: "center", gap: 16 }}>
            <div className="rp-brand-mark"><BookOpen size={20} aria-hidden /></div>
            <p className="rp-wordmark-sub">Opening publishing house…</p>
          </div>
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

  const appearance = adminTheme === "dark" ? "dark" : "light";
  const legacyProps = {
    className: `${adminTheme === "light" ? "admin-light" : ""} admin-reso`,
    "data-admin-theme": adminTheme === "light" ? "reso" : "dark",
  } as const;

  const goTo = (id: string) => {
    setActiveTab(id);
    setShowEditor(false);
    setSelectedOrder(null);
    if (id === "settings") setSettingsTab("general");
    setSidebarOpen(false);
  };
  const goToChild = (_parent: string, child: string) => {
    setSettingsTab(child);
    setSidebarOpen(false);
  };

  // Shipping/Payments can also be entered as top-level tabs by ShopSettings.
  const navActive = activeTab === "shipping" || activeTab === "payments" ? "settings" : activeTab === "analytics" ? "overview" : activeTab;
  const navChild = activeTab === "shipping" || activeTab === "payments" ? activeTab : settingsTab;
  const copy = PAGE_COPY[activeTab] || PAGE_COPY.overview;
  const childLabel = NAV.find((n) => n.id === "settings")?.children?.find((c) => c.id === navChild)?.label;
  const trail: Array<{ label: string; onClick?: () => void }> = [{ label: "Storefront", onClick: () => goTo("overview") }];
  if (selectedOrder) {
    trail.push({ label: "Orders", onClick: () => setSelectedOrder(null) }, { label: "Order detail" });
  } else if (navActive === "settings") {
    trail.push({ label: "Settings", onClick: () => goTo("settings") }, { label: childLabel || "General" });
  } else {
    trail.push({ label: copy.title });
  }
  const initial = (user.displayName?.[0] || user.email?.[0] || "A").toUpperCase();

  const avatar = (
    <span className="rp-avatar" aria-hidden="true">
      {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : initial}
    </span>
  );

  const destinations = [
    ...NAV.filter((n) => !n.children).map((n) => ({ id: n.id, label: n.label, run: () => goTo(n.id) })),
    ...(NAV.find((n) => n.children)?.children || []).map((c) => ({
      id: `settings-${c.id}`, label: `Settings · ${c.label}`,
      run: () => { setActiveTab("settings"); setSettingsTab(c.id); setShowEditor(false); setSelectedOrder(null); },
    })),
  ];

  // Pages fully built from Riso components render outside the legacy compatibility layer.
  const migrated = activeTab === "reviews" || activeTab === "orders" || activeTab === "overview" || activeTab === "analytics" || activeTab === "catalog" || activeTab === "discounts" || activeTab === "pages" || activeTab === "payments" || activeTab === "shipping" || (activeTab === "settings" && (settingsTab === "general" || settingsTab === "notifications" || settingsTab === "payments" || settingsTab === "shipping"));
  const content = (() => {
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
      default:
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
    }
  })();

  return (
    <ToastProvider>
      <AppShell
        appearance={appearance}
        overlay={<SyncChip state={online ? null : "offline"} />}
        sidebar={
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            items={NAV}
            activeId={showEditor ? null : navActive}
            activeChildId={navChild}
            onSelect={goTo}
            onSelectChild={goToChild}
            brand={<>
              <span className="rp-brand-mark"><BookOpen size={20} aria-hidden /></span>
              <div>
                <span className="rp-wordmark">Lyrical<em>myrical</em></span>
                <span className="rp-wordmark-sub">Publishing House</span>
              </div>
            </>}
            footer={
              <div className="rp-account-card">
                <div className="rp-account-row">
                  {avatar}
                  <div style={{ minWidth: 0 }}>
                    <div className="rp-account-name">{user.displayName || "Administrator"}</div>
                    <div className="rp-account-email">{user.email}</div>
                  </div>
                </div>
                <div className="rp-account-actions">
                  <SecondaryButton size="sm" icon={<Globe size={14} aria-hidden />} onClick={openSite}>View Site</SecondaryButton>
                  <SecondaryButton size="sm" icon={<LogOut size={14} aria-hidden />} onClick={handleLogout}>Log Out</SecondaryButton>
                </div>
              </div>
            }
          />
        }
        topbar={
          <Topbar>
            <IconButton label="Open navigation" className="rp-menu-only" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
              <Menu size={20} aria-hidden />
            </IconButton>
            <GlobalSearch destinations={destinations} onOpenBook={handleEditBook} />
            <div className="rp-topbar-actions">
              <span className="rp-status-pill rp-hide-md" role="status">
                <span className="rp-status-dot" aria-hidden />
                {settings?.maintenanceMode ? "Storefront in maintenance" : "Storefront live"}
              </span>
              <SecondaryButton className="rp-hide-sm" icon={<Globe size={16} aria-hidden />} onClick={openSite}>View Site</SecondaryButton>
              <PrimaryButton icon={<Plus size={16} aria-hidden />} aria-label="Add Book" onClick={handleAddBook}>
                <span className="rp-btn-label">Add Book</span>
              </PrimaryButton>
              <IconButton label="Help" onClick={() => setHelpOpen(true)}><HelpCircle size={20} aria-hidden /></IconButton>
              <IconButton label={`Switch to ${adminTheme === "light" ? "dark" : "light"} appearance`} onClick={toggleTheme}>
                {adminTheme === "light" ? <Moon size={20} aria-hidden /> : <Sun size={20} aria-hidden />}
              </IconButton>
              <div className="rp-menu-wrap"
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setUserMenuOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Escape") setUserMenuOpen(false); }}>
                <button type="button" className="rp-icon-btn" style={{ width: "auto", padding: "0 6px", gap: 4 }}
                  aria-label="Administrator menu" aria-haspopup="menu" aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((v) => !v)}>
                  {avatar}<ChevronDown size={14} aria-hidden />
                </button>
                {userMenuOpen && (
                  <div className="rp-menu" role="menu">
                    <div className="rp-menu-label">{user.email}</div>
                    <button role="menuitem" className="rp-menu-item" onClick={() => { setUserMenuOpen(false); setShowLogs(true); }}>
                      <History size={16} aria-hidden /> Activity logs
                    </button>
                    <button role="menuitem" className="rp-menu-item" onClick={() => { setUserMenuOpen(false); openSite(); }}>
                      <Globe size={16} aria-hidden /> View site
                    </button>
                    <button role="menuitem" data-tone="danger" className="rp-menu-item" onClick={handleLogout}>
                      <LogOut size={16} aria-hidden /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Topbar>
        }
      >
        <PageHeader
          breadcrumbs={<Breadcrumbs trail={trail} />}
          title={selectedOrder ? "Order detail" : navActive === "settings" && childLabel ? childLabel : copy.title}
          description={selectedOrder ? "Payment, fulfillment, and tracking for this order." : copy.description}
          actions={
            <SecondaryButton icon={<History size={16} aria-hidden />} onClick={() => setShowLogs(true)}>Activity Logs</SecondaryButton>
          }
        />
        {/* Feature pages still use legacy utility classes; scope the compatibility layer to them only. */}
        <div {...(migrated ? {} : legacyProps)} style={{ background: "transparent", minHeight: 480 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedOrder ? "-detail" : "") + settingsTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </div>
      </AppShell>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} title="Help & shortcuts" appearance={appearance}
        footer={<PrimaryButton onClick={() => setHelpOpen(false)}>Got it</PrimaryButton>}>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Use the search box to jump to any admin page or open a book by title, author, ISBN, or SKU.</li>
          <li>Orders stay unpaid until the Stripe webhook confirms payment — never mark paid by hand unless you are reconciling a confirmed charge.</li>
          <li>Theme changes are saved as a draft first; publish when you are ready for customers to see them.</li>
          <li>Press Escape to close any dialog; focus returns to where you were.</li>
        </ul>
      </Dialog>

      <ActivityLogDialog open={showLogs} onClose={() => setShowLogs(false)} appearance={appearance} />

      {/* Book Editor Takeover */}
      <AnimatePresence>
        {showEditor && (
          <div {...legacyProps} style={{ background: "transparent" }}>
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
          </div>
        )}
      </AnimatePresence>

      {/* Theme Editor Takeover */}
      <AnimatePresence>
        {activeTab === "settings" && settingsTab === "designer" && settings && (
          <div {...legacyProps} style={{ background: "transparent" }}>
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
                appearance={appearance}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastProvider>
  );
}
