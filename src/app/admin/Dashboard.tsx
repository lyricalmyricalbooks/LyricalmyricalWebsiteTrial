import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, Settings, LayoutDashboard, LogOut, Plus, History, Tag, BadgePercent,
  Layers, ShoppingCart, Globe, Menu, HelpCircle, Sun, Moon, ChevronDown,
} from "lucide-react";

import { Login } from "./Login";
import { BookCatalog } from "./BookCatalog";
import { BookEditor } from "./BookEditor";
import { Discounts } from "./Discounts";
import { Customers } from "./Customers";
import { Inventory } from "./Inventory";
import { ordersNeedingWork, refreshOrdersCache } from "./Orders";
import { OrdersDesk } from "./OrdersDesk.tsx";
import { AdminAlerts } from "./AdminAlerts.tsx";
import { buildAdminAlerts, type AdminAlert } from "./adminAlerts";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { ShopSettings } from "./ShopSettings";
import ReviewsModeration from "./ReviewsModeration";
import Messages from "./Messages";
import { adminApi } from "./api";
import { scrubSavedSecrets } from "./privateKeys";
import toast from "react-hot-toast";
import {
  AppShell, Sidebar, Topbar, PageHeader, Breadcrumbs, PrimaryButton, SecondaryButton,
  IconButton, Dialog, ToastProvider, Toggle, SyncChip, useOnline, LoadingState, type NavEntry,
} from "./riso/components";
import { GlobalSearch, ActivityLogDialog } from "./riso/shellParts";
import { WhatsNew } from "./WhatsNew";
import { NAV, PAGE_COPY } from "./riso/nav";

// Studio is large and only opened from Settings › Design, so it loads in its own chunk.
const StudioEditor = lazy(() => import("./studio/StudioWorkspace").then(m => ({ default: m.StudioWorkspace })));

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
  // Email links: /admin#orders opens Orders, /admin#orders/<id> opens that order.
  useEffect(() => {
    if (!user) return;
    const openFromHash = () => {
      const match = window.location.hash.match(/^#orders(?:\/([^/?#]+))?/);
      if (!match) return;
      setShowEditor(false);
      setActiveTab("orders");
      setSelectedOrder(match[1] ? { id: decodeURIComponent(match[1]) } : null);
      history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [user]);

  // Orders waiting on the publisher, shown as a badge on the Orders nav item.
  const [ordersBadge, setOrdersBadge] = useState(0);
  // Unpaid/mismatched/disputed orders etc., shown above every admin page.
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const refresh = () =>
      refreshOrdersCache()
        .then(async (data) => {
          const [webhook, emailLog] = await Promise.all([adminApi.getStripeWebhookStatus().catch(() => null), adminApi.getRecentEmailLog(50).catch(() => [])]);
          if (!alive) return;
          setOrdersBadge(ordersNeedingWork(data));
          setAlerts(buildAdminAlerts(data, webhook, Date.now(), emailLog));
        })
        .catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 5 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
    // Re-count when returning from an order, so finished work drops off the badge.
  }, [user, selectedOrder === null]);
  // The list the order was opened from, for Previous / Next order.
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

  const [ucSaving, setUcSaving] = useState(false);
  async function toggleUnderConstruction(on: boolean) {
    if (!window.confirm(on ? "Hide the shop behind the “under construction” wall now?" : "Take the wall down and open the shop?")) return;
    setUcSaving(true);
    try {
      await adminApi.setUnderConstruction(on);
      const patch = (d: any) => ({ ...(d || {}), showUnderConstruction: on });
      setSettings((p: any) => p && ({ ...p, design: patch(p.design), draftDesign: patch(p.draftDesign) }));
      setOriginalSettings((p: any) => p && ({ ...p, design: patch(p.design), draftDesign: patch(p.draftDesign) }));
    } catch (e) {
      console.error(e);
      window.alert("Couldn't change the under construction wall. Please try again.");
    } finally {
      setUcSaving(false);
    }
  }

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

  // Returns true only when the save reached Firestore, so callers never announce a
  // save that failed.
  const saveSection = async (section: string, data: any, options: any = {}): Promise<boolean> => {
    try {
      await adminApi.updateSettings(data, options);
      // Secret keys went to the admin-only store: drop them from what's on screen and
      // mark them stored, so readiness doesn't think they're sitting in public settings.
      data = scrubSavedSecrets(data);
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
      return true;
    } catch (err: any) {
      console.error("Saving settings failed:", err);
      toast.error(`Couldn't save — nothing was changed. ${err?.message || ""}`.trim());
      return false;
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
  if (selectedOrder && activeTab !== "orders") {
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
  const migrated = activeTab === "reviews" || activeTab === "messages" || activeTab === "orders" || activeTab === "customers" || activeTab === "inventory" || activeTab === "overview" || activeTab === "analytics" || activeTab === "catalog" || activeTab === "discounts" || activeTab === "payments" || activeTab === "shipping" || (activeTab === "settings" && (settingsTab === "general" || settingsTab === "notifications" || settingsTab === "payments" || settingsTab === "shipping"));
  const content = (() => {
    switch (activeTab) {
      case "overview":
      case "analytics":
        return <AnalyticsDashboard setActiveTab={(tab: string) => { if (tab === "general" || tab === "notifications" || tab === "taxes") { setSettingsTab(tab); setActiveTab("settings"); } else setActiveTab(tab); }} onEditBook={handleEditBook} />;
      case "catalog": return <BookCatalog onEdit={handleEditBook} onAdd={handleAddBook} refreshTrigger={catalogRefreshKey} />;
      case "customers": return <Customers />;
      case "inventory": return <Inventory />;
      case "discounts": return <Discounts />;
      case "reviews": return <ReviewsModeration />;
      case "messages": return <Messages />;
      case "orders":
        // Inbox-style desk: list + the full order page (all Stripe sync/refund/label actions) side by side.
        return <OrdersDesk selectedId={selectedOrder?.id || null} onSelect={(id) => setSelectedOrder(id ? { id } : null)} />;
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
            setOriginalSettings={setOriginalSettings}
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
            items={NAV.map((n) => (n.id === "orders" ? { ...n, badge: ordersBadge } : n))}
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
              <>
              <WhatsNew appearance={appearance} onHistoryOpen={() => setSidebarOpen(false)} onNavigate={(link) => { goTo(link.tab); if (link.settingsTab) setSettingsTab(link.settingsTab); }} />
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
              </>
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
              <Toggle
                label={settings?.design?.showUnderConstruction ? "Under construction: ON" : "Under construction"}
                checked={!!settings?.design?.showUnderConstruction}
                disabled={!settings || ucSaving}
                onChange={toggleUnderConstruction}
              />
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
          title={selectedOrder && activeTab !== "orders" ? "Order detail" : navActive === "settings" && childLabel ? childLabel : copy.title}
          description={selectedOrder && activeTab !== "orders" ? "Payment, fulfillment, and tracking for this order." : copy.description}
          actions={
            <SecondaryButton icon={<History size={16} aria-hidden />} onClick={() => setShowLogs(true)}>Activity Logs</SecondaryButton>
          }
        />
        <AdminAlerts
          alerts={alerts}
          onOpenNotifications={() => { setActiveTab("settings"); setSettingsTab("notifications"); setShowEditor(false); setSelectedOrder(null); }}
          onOpenOrder={(id) => { setActiveTab("orders"); setShowEditor(false); setSelectedOrder({ id }); }}
          onOpenOrders={() => { setActiveTab("orders"); setShowEditor(false); setSelectedOrder(null); }}
          onOpenWebhook={() => { setActiveTab("settings"); setSettingsTab("payments"); setShowEditor(false); setSelectedOrder(null); }}
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
          <div className="rp rp-dialog-root rp-editor-root" data-variant="drawer" data-rp-appearance={appearance} style={{ background: "transparent" }}>
            <div className="rp-dialog-scrim" aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="rp-dialog rp-editor-panel"
              role="dialog" aria-modal="true" aria-label={editingBook ? "Edit book" : "New book"}
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
          <div {...legacyProps} style={{ background: "transparent" }}>
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="fixed inset-0 z-[200] bg-black"
            >
              <Suspense fallback={<div className="rp" data-rp-appearance={appearance} style={{ height: "100%", display: "grid", placeItems: "center" }}><LoadingState label="Opening Design studio…" /></div>}>
              <StudioEditor
                appearance={appearance}
                settings={settings}
                onExit={() => setSettingsTab("general")}
                onPersisted={(design: any, published: boolean) =>
                  setSettings((prev: any) => ({ ...prev, draftDesign: design, ...(published ? { design } : {}) }))
                }
              />
              </Suspense>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastProvider>
  );
}
