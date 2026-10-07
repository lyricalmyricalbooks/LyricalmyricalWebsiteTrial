import { useState, useEffect, useId, useMemo, useRef } from "react";
import { 
  ArrowLeft,
  Search,
  Edit,
  ExternalLink, 
  Globe, 
  Mail,
  Percent,
  Plus,
  Trash2,
  Check,
  Lock,
  Phone,
  Building,
  Hash,
  X,
  RefreshCw,
  Database,
  CheckCircle,
  AlertCircle as AlertCircleIcon,
  Clock,
  Link,
  MapPin,
  CreditCard,
  ShieldCheck,
  Package,
  Truck,
  History,
  TrendingUp,
  Map,
  DollarSign,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Save
} from "lucide-react";
import { adminApi } from "./api";
import toast from "react-hot-toast";
import { POLICY_KEYS, POLICY_TITLES, policySlug, type PolicyKey } from "../features/site/policyPages";
import { Checkbox, ConfirmDialog, DataTable, DestructiveButton, Dialog, EmptyState, ErrorState, MetricCard, PrimaryButton, SaveBar, SearchField, SecondaryButton, SectionCard, SectionHead, SelectField, StatusBadge, Tabs, TextArea, TextField, Toggle, useConfirm, type Column } from "./riso/components";
import { motion, AnimatePresence } from "motion/react";
import { NotificationEditor } from "./NotificationEditor";
import { COUNTRIES, CONTINENTS, describeZoneGeography } from "../features/site/shippingZones";
import { summarizeShipping, describeRatePrice, describeRateConditions, RATE_TYPES, starterZones } from "./shippingHealth";
import { quoteShipping } from "../features/site/shippingEngine";
import { LocalFulfillmentSettings, useLocalFulfillmentDraft } from "./LocalFulfillmentSettings";
import { paymentHealth } from "./paymentHealth";
import { stripeSecretKeyProblem } from "./privateKeys";
import { StripeWebhookHealth } from "./StripeWebhookHealth";
import { assignedCountryNames, countryName, groupedCountries, remainingCountryNames, toCountryCodes } from "./shippingCountries";

const PURPLE = "#A855F7";

export function ShopSettings({ 
  activeTab, 
  setActiveTab, 
  settings, 
  setSettings, 
  originalSettings, 
  setOriginalSettings,
  settingsLoading,
  saveSection 
}: any) {
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [shippingProfiles, setShippingProfiles] = useState<any[]>([]);

  useEffect(() => {
    loadShippingProfiles();
  }, []);

  async function loadShippingProfiles() {
    try {
      const b = await adminApi.getShippingProfiles();
      setShippingProfiles(b);
    } catch (err) {
      console.error(err);
    }
  }

  const handleSaveSection = async (section: string, data: any, options: any = {}): Promise<boolean> => {
    setSavingSection(section);
    try {
      return (await saveSection(section, data, options)) !== false;
    } finally {
      setSavingSection(null);
    }
  };

  const hasChanges = (section: string) => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings[section]) !== JSON.stringify(originalSettings[section]);
  };

  if (settingsLoading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-2 border-violet-500/10 border-t-violet-500 rounded-full animate-spin" />
      <p className="text-[10px] tracking-[0.4em] text-slate-500 font-black uppercase">Retrieving System Config</p>
    </div>
  );

  if (!settings) return <ErrorState title="Settings unavailable" description="Store settings could not be loaded. Check your connection, then reload this page." />;

  // Designer tab — handled by Dashboard for full-screen takeover
  if (activeTab === "designer") {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto pb-32">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-12"
        >
          {activeTab === "general" && <GeneralSettings settings={settings} setSettings={setSettings} originalSettings={originalSettings} hasChanges={hasChanges} saveSection={handleSaveSection} savingSection={savingSection} />}
          {activeTab === "communications" && <CommunicationsSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={handleSaveSection} savingSection={savingSection} />}
          {activeTab === "shipping" && <ShippingSettings profiles={shippingProfiles} refreshProfiles={loadShippingProfiles} />}
          {activeTab === "payments" && <PaymentsSettings settings={settings} setSettings={setSettings} originalSettings={originalSettings} setOriginalSettings={setOriginalSettings} hasChanges={hasChanges} saveSection={handleSaveSection} savingSection={savingSection} />}
          {activeTab === "taxes" && <TaxesSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={handleSaveSection} savingSection={savingSection} />}
          {activeTab === "notifications" && <NotificationEditor />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
const POLICY_STARTERS: Record<PolicyKey, string> = {
  shipping: "We ship orders within 2–5 business days of payment. Delivery times and costs are calculated at checkout based on your destination.\n\nYou will receive an email with tracking once your order ships. Digital titles are available to download immediately after payment.",
  returns: "If your book arrives damaged or incorrect, contact us within 30 days of delivery and we will replace it or refund you.\n\nDigital downloads are non-refundable once accessed, unless the file is faulty.",
  privacy: "We collect only what we need to fulfil your order and, if you opt in, send you our newsletter: your name, email, shipping address and order details.\n\nPayments are processed by Stripe; we never see or store your card number. We do not sell your personal information. You can ask us to delete your data at any time.",
  terms: "By placing an order you agree that the details you provide are accurate and that you are authorised to use the payment method.\n\nPrices are shown in Canadian dollars unless stated otherwise. We may cancel and refund an order if a title is unavailable or a pricing error occurred.",
};

function GeneralSettings({ settings, setSettings, originalSettings, hasChanges, saveSection, savingSection }: any) {
  const SECTIONS = ["maintenance", "domain", "info", "location", "policies"] as const;
  const dirty = SECTIONS.filter((k) => hasChanges(k));
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
  const set = (section: string, patch: any) => setSettings({ ...settings, [section]: { ...settings[section], ...patch } });

  const saveAll = async () => {
    for (const k of dirty) if (!(await saveSection(k, { [k]: settings[k] }))) break;
    toast.success("Store settings saved");
  };
  const discard = () => {
    const next = { ...settings };
    dirty.forEach((k) => { next[k] = JSON.parse(JSON.stringify(originalSettings?.[k] ?? {})); });
    setSettings(next);
  };

  const maintenanceOn = !!settings.maintenance?.enabled;
  const name = settings.info?.name || "";
  const desc = settings.info?.description || "";

  return (
    <div className="rp-stack">
      <SectionCard title="Store status" description="What customers can do right now.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <span>
            <StatusBadge tone={maintenanceOn ? "warning" : "success"}>{maintenanceOn ? "Maintenance mode — checkout paused" : "Storefront live"}</StatusBadge>
            {settings.domain?.custom && <span className="rp-hint" style={{ marginLeft: 12 }}>Domain: {settings.domain.custom}</span>}
          </span>
          <Toggle label="Maintenance mode" checked={maintenanceOn}
            onChange={(v) => (v ? setConfirmMaintenance(true) : set("maintenance", { enabled: false }))} />
        </div>
        <p className="rp-hint" style={{ margin: "12px 0 0" }}>Maintenance mode disables checkout while you update the storefront. Customers see the message below.</p>
        {maintenanceOn && (
          <div style={{ marginTop: 16 }}>
            <TextField label="Maintenance message" value={settings.maintenance?.message || ""}
              placeholder="We are updating our archive. Please check back soon." onChange={(e) => set("maintenance", { message: e.target.value })} />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Store identity" description="Your publisher name, description and contact details.">
        <div className="rp-stack" style={{ gap: 20 }}>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <TextField label="Publisher name" value={name} maxLength={100} hint={`${name.length} / 100 characters`} onChange={(e) => set("info", { name: e.target.value })} />
            <TextField label="Contact email" type="email" value={settings.info?.email || ""} placeholder="hello@lyricalmyricalbooks.com" onChange={(e) => set("info", { email: e.target.value })} />
          </div>
          <TextArea label="Publisher description" rows={4} value={desc} maxLength={150} hint={`${desc.length} / 150 characters — shown in search results and social previews`} onChange={(e) => set("info", { description: e.target.value })} />
        </div>
      </SectionCard>

      <SectionCard title="Domain & visibility" description="Where customers find the store.">
        <TextField label="Custom domain" value={settings.domain?.custom || ""} placeholder="www.yourdomain.com"
          hint="Adding a domain also requires updating the allowed origins for payments and sign-in — ask your developer before changing it."
          onChange={(e) => set("domain", { custom: e.target.value })} />
      </SectionCard>

      <SectionCard title="Location" description="Main office and shipping origin.">
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <TextField label="Street address" value={settings.location?.street || ""} placeholder="456 Montrose Avenue" onChange={(e) => set("location", { street: e.target.value })} />
          </div>
          <TextField label="City" value={settings.location?.city || ""} placeholder="Toronto" onChange={(e) => set("location", { city: e.target.value })} />
          <TextField label="State / province" value={settings.location?.state || ""} placeholder="Ontario" onChange={(e) => set("location", { state: e.target.value })} />
        </div>
      </SectionCard>

      <SectionCard title="Store policies" description="Shown in the storefront footer as links to public pages. A policy with no text is hidden. Card networks expect shipping and returns terms.">
        <div className="rp-stack" style={{ gap: 20 }}>
          {POLICY_KEYS.map((k) => {
            const text: string = settings.policies?.[k] || "";
            return (
              <div key={k}>
                <TextArea label={POLICY_TITLES[k]} rows={5} maxLength={20000} value={text}
                  hint={text.trim() ? `Public at /page/${policySlug(k)} · blank line = new paragraph` : "Not published yet. Leave blank to hide the footer link."}
                  onChange={(e) => set("policies", { [k]: e.target.value })} />
                {!text.trim() && (
                  <SecondaryButton size="sm" onClick={() => set("policies", { [k]: POLICY_STARTERS[k] })}>Insert starter text</SecondaryButton>
                )}
              </div>
            );
          })}
          <p className="rp-hint" style={{ margin: 0 }}>Starter text is a plain-language outline, not legal advice — edit it to match how you actually operate.</p>
        </div>
      </SectionCard>

      <InventorySync lastSync={settings.inventory?.lastSync} />

      <SaveBar dirty={dirty.length > 0} saving={!!savingSection} onSave={saveAll} onDiscard={discard}
        message={`Unsaved changes in ${dirty.join(", ")}.`} />

      <ConfirmDialog open={confirmMaintenance} title="Turn on maintenance mode?" confirmLabel="Pause checkout"
        message="Customers won't be able to check out until you turn it off again. The change applies once you save."
        onConfirm={() => { setConfirmMaintenance(false); set("maintenance", { enabled: true }); }} onCancel={() => setConfirmMaintenance(false)} />
    </div>
  );
}

function CommunicationsSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
  const comms = settings.communications || {};

  const updateComms = (patch: any) => {
    setSettings({ ...settings, communications: { ...comms, ...patch } });
  };

  return (
    <div className="space-y-16">
      <header className="flex flex-col gap-2 mb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Email Notifications</h2>
            <p className="text-xs text-slate-400 tracking-[0.3em] uppercase mt-4 font-bold">Automated Reader Response Settings</p>
          </div>
          {hasChanges('communications') && (
            <button
              onClick={() => saveSection('communications', { communications: settings.communications })}
              disabled={savingSection === 'communications'}
              className="bg-violet-600 text-white px-12 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-violet-600/40 hover:bg-violet-500 transition-all disabled:opacity-50 border border-violet-400/20"
            >
              {savingSection === 'communications' ? 'SYNCHRONIZING...' : 'SAVE CHANGES'}
            </button>
          )}
        </div>
      </header>

      {/* Sender identity */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent pointer-events-none" />
        <SectionHeader 
          title="Sender Identity" 
          subtitle="Email details for outbound transmissions" 
          icon={Mail} 
          color="violet"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
          <InputField 
            label="TRANSMITTER ALIAS" 
            placeholder="Lyricalmyrical Books"
            value={comms.fromName || ""}
            onChange={(e: any) => updateComms({ fromName: e.target.value })}
          />
          <InputField 
            label="SENDER EMAIL" 
            icon={Mail}
            placeholder="orders@lyricalmyricalbooks.com"
            value={comms.fromEmail || ""}
            onChange={(e: any) => updateComms({ fromEmail: e.target.value })}
          />
          <InputField 
            label="REPLY-TO ADDRESS" 
            icon={Mail}
            placeholder="orders@lyricalmyricalbooks.com"
            value={comms.replyTo || ""}
            onChange={(e: any) => updateComms({ replyTo: e.target.value })}
          />
        </div>
      </section>

      {/* Resend API Credentials */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent pointer-events-none" />
        <SectionHeader 
          title="Resend API Settings" 
          subtitle="Configure Resend API keys for transactional mail" 
          icon={KeyRound} 
          color="violet"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
          <SecretField label="RESEND API KEY" placeholder="re_..." stored={!!(comms.resendApiKey || comms.resendApiKeyStored)}
            onCommit={(v) => updateComms({ resendApiKey: v })} />
          <div className="text-xs text-slate-400 leading-relaxed self-center mt-6 font-medium">
            If left blank, the system falls back to the default backend key. Enter your own API key to bypass unverified sender restrictions and use custom transmitter addresses.
          </div>
        </div>
      </section>

      {/* Customer emails */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/[0.03] to-transparent pointer-events-none" />
        <SectionHeader 
          title="Automated Emails" 
          subtitle="Transactional Message Settings" 
          icon={CheckCircle} 
          color="emerald"
        />

        <div className="space-y-12 relative z-10">
          {/* Order receipts */}
          <div className="flex justify-between items-start gap-12 p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:border-emerald-500/20 transition-all">
            <div className="flex-1">
              <h4 className="text-xl font-black text-white uppercase tracking-tight mb-2 italic">Order Confirmation</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">Automatic email sent after a successful purchase.</p>
            </div>
            <Switch
              checked={comms.orderReceipts ?? true}
              onChange={val => updateComms({ orderReceipts: val })}
            />
          </div>
          
          <AnimatePresence>
            {(comms.orderReceipts ?? true) && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: -24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="space-y-4 overflow-hidden px-8"
              >
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">CUSTOM RECEIPT MESSAGE</label>
                <textarea
                  rows={4}
                  placeholder="Thank you for your order! We'll start processing it right away."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[2.5rem] px-10 py-8 text-sm text-white outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all resize-none leading-relaxed font-medium placeholder:text-slate-800 shadow-inner"
                  value={comms.receiptMessage || ""}
                  onChange={e => updateComms({ receiptMessage: e.target.value })}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Shipping status */}
          <div className="flex justify-between items-start gap-12 p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:border-emerald-500/20 transition-all">
            <div className="flex-1">
              <h4 className="text-xl font-black text-white uppercase tracking-tight mb-2 italic">Shipping Update</h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Alerts sent when a book is dispatched with tracking.</p>
            </div>
            <Switch
              checked={comms.shippingStatus ?? true}
              onChange={val => updateComms({ shippingStatus: val })}
            />
          </div>

          {/* Abandoned cart */}
          <div className="flex justify-between items-start gap-12 p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 opacity-30 grayscale cursor-not-allowed">
            <div className="flex-1">
              <h4 className="text-xl font-black text-white uppercase tracking-tight mb-2 italic">Cart Recovery</h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Follow-up emails for readers who didn't complete their purchase.</p>
            </div>
            <div className="flex flex-col items-end gap-3">
               <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-6 py-2 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase shadow-2xl shadow-amber-500/10">PREMIUM FEATURE</span>
               <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">ENCRYPTED FEATURE</p>
            </div>
          </div>
        </div>
      </section>

      {/* Shop notifications */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-violet-500/[0.03] to-transparent pointer-events-none" />
        <SectionHeader 
          title="System Alerts" 
          subtitle="Internal Notification Settings" 
          icon={AlertCircleIcon} 
          color="violet"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="flex justify-between items-center p-10 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:border-violet-500/30 transition-all group shadow-inner">
            <div className="flex-1">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2 italic">New Book Order</h4>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Real-time sales alerts</p>
            </div>
            <Switch
              checked={comms.newOrderNotifications ?? true}
              onChange={val => updateComms({ newOrderNotifications: val })}
            />
          </div>
          <div className="flex justify-between items-center p-10 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:border-violet-500/30 transition-all group shadow-inner">
            <div className="flex-1">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2 italic">Low Stock Alert</h4>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Alert at &lt; 5 units</p>
            </div>
            <Switch
              checked={comms.lowStockAlerts ?? false}
              onChange={val => updateComms({ lowStockAlerts: val })}
            />
          </div>
          <div className="md:col-span-2 flex justify-between items-center p-10 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:border-violet-500/30 transition-all group shadow-inner">
            <div className="flex-1">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2 italic">Sales Digest</h4>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Weekly sales summary sent every Monday</p>
            </div>
            <Switch
              checked={comms.weeklySalesDigest ?? false}
              onChange={val => updateComms({ weeklySalesDigest: val })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ZoneGeographyPicker({
  countries, continents, restOfWorld, setCountries, setContinents, setRestOfWorld,
}: {
  countries: string[]; continents: string[]; restOfWorld: boolean;
  setCountries: (v: string[]) => void; setContinents: (v: string[]) => void; setRestOfWorld: (v: boolean) => void;
}) {
  const [search, setSearch] = useState("");

  const toggleContinent = (c: string) => {
    setRestOfWorld(false);
    setContinents(continents.includes(c) ? continents.filter(x => x !== c) : [...continents, c]);
  };
  const toggleCountry = (code: string) => {
    setRestOfWorld(false);
    setCountries(countries.includes(code) ? countries.filter(x => x !== code) : [...countries, code]);
  };
  const results = search.trim()
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 40)
    : [];

  const chip = "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer";

  return (
    <div className="space-y-5">
      {/* Rest of world */}
      <button
        type="button"
        onClick={() => {
          const next = !restOfWorld;
          setRestOfWorld(next);
          if (next) { setCountries([]); setContinents([]); }
        }}
        className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border text-left transition-all cursor-pointer ${
          restOfWorld
            ? "bg-violet-50 dark:bg-violet-950/30 border-violet-400 text-violet-700 dark:text-violet-300"
            : "bg-white dark:bg-zinc-850 border-[#EBEAEF] dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:border-violet-300"
        }`}
      >
        <span className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest">
          <Globe size={15} /> Rest of world — everywhere not covered by another zone
        </span>
        {restOfWorld && <Check size={16} />}
      </button>

      {!restOfWorld && (
        <>
          {/* Continents */}
          <div>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 ml-1">Whole continents</p>
            <div className="flex flex-wrap gap-2">
              {CONTINENTS.map((c) => {
                const active = continents.includes(c);
                return (
                  <button key={c} type="button" onClick={() => toggleContinent(c)}
                    className={`${chip} ${active
                      ? "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-400 text-cyan-700 dark:text-cyan-300"
                      : "bg-white dark:bg-zinc-850 border-[#EBEAEF] dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-cyan-300"}`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific countries */}
          <div>
            <div className="flex items-center justify-between mb-2 ml-1">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
                Specific countries{countries.length > 0 ? ` · ${countries.length} selected` : ""}
              </p>
              {countries.length > 0 && (
                <button type="button" onClick={() => setCountries([])}
                  className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest cursor-pointer">
                  Clear
                </button>
              )}
            </div>
            {countries.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {countries.map((code) => {
                  const c = COUNTRIES.find(x => x.code === code);
                  return (
                    <button key={code} type="button" onClick={() => toggleCountry(code)} title="Remove"
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-900 hover:border-red-300 cursor-pointer">
                      {c?.name || code} <X size={10} />
                    </button>
                  );
                })}
              </div>
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 190+ countries… (e.g. Japan, Brazil, France)"
              className="w-full bg-white dark:bg-zinc-850 border border-[#EBEAEF] dark:border-zinc-800 rounded-full px-6 py-3.5 text-xs text-slate-800 dark:text-zinc-100 outline-none shadow-inner focus:border-violet-500 placeholder:text-slate-350 dark:placeholder:text-zinc-500 font-semibold"
            />
            {results.length > 0 && (
              <div className="mt-2 max-h-52 overflow-y-auto rounded-2xl border border-[#EBEAEF] dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-slate-100 dark:divide-zinc-800">
                {results.map((c) => {
                  const active = countries.includes(c.code);
                  return (
                    <button key={c.code} type="button" onClick={() => toggleCountry(c.code)}
                      className={`w-full flex items-center justify-between px-5 py-2.5 text-left transition-colors cursor-pointer ${
                        active ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800"}`}>
                      <span className="text-xs font-bold">{c.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{c.continent}</span>
                        {active && <Check size={13} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RateTester({ profile }: { profile: any }) {
  const [country, setCountry] = useState("Canada");
  const [total, setTotal] = useState("40");
  const [count, setCount] = useState("2");
  const [grams, setGrams] = useState("");
  const qty = Math.max(1, Number(count) || 1);
  const each = (Number(total) || 0) / qty;
  const quotes = useMemo(() => quoteShipping(
    [{ price: each, quantity: qty, shippingProfileId: profile.id, weightGrams: grams === "" ? null : (Number(grams) || 0) / qty }],
    { country }, [profile]).filter((q) => q.type !== "pickup"), [profile, country, each, qty, grams]);
  return (
    <SectionCard title="Test this profile" description="See exactly what a customer would be offered — using your unsaved edits.">
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginBottom: 12 }}>
        <SelectField label="Destination" value={country} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
        </SelectField>
        <TextField label="Order total ($)" type="number" min={0} value={total} onChange={(e) => setTotal(e.target.value)} />
        <TextField label="Books in cart" type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} />
        <TextField label="Total weight (g)" type="number" min={0} placeholder="auto" value={grams} onChange={(e) => setGrams(e.target.value)} />
      </div>
      {quotes.length === 0 ? (
        <p role="status" className="rp-hint" style={{ margin: 0, padding: 12, background: "var(--rp-warning-tint)", border: "1px solid var(--rp-warning)" }}>
          ⚠ Nothing would be offered — this customer could not check out.
        </p>
      ) : (
        <ul className="rp-list" aria-label="Quotes a customer would see" style={{ margin: 0 }}>
          {quotes.map((q) => (
            <li key={q.id + q.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", gap: 12 }}>
              <span><strong>{q.name}</strong>{q.deliveryDays ? <span className="rp-hint"> · {q.type === "pickup" ? "ready in" : ""} {q.deliveryDays} days</span> : null}</span>
              <span className="rp-mono">{q.price === 0 ? "Free" : `$${q.price.toFixed(2)}`}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

const numOrNull = (v: any) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Math.max(0, Number(v)));
function normalizeRate(r: any) {
  const type = r.type || "flat";
  return {
    ...r,
    name: String(r.name || "").trim(),
    type,
    enabled: r.enabled !== false,
    base: type === "free" || type === "pickup" ? 0 : Math.max(0, Number(r.base) || 0),
    additional: type === "flat" ? Math.max(0, Number(r.additional) || 0) : 0,
    perKg: type === "weight" ? Math.max(0, Number(r.perKg) || 0) : 0,
    percent: type === "percent" ? Math.max(0, Number(r.percent) || 0) : 0,
    handlingFee: numOrNull(r.handlingFee) ?? 0,
    freeOver: numOrNull(r.freeOver),
    minPrice: numOrNull(r.minPrice),
    maxPrice: numOrNull(r.maxPrice),
    minWeight: numOrNull(r.minWeight),
    maxWeight: numOrNull(r.maxWeight),
    minItems: numOrNull(r.minItems),
    maxItems: numOrNull(r.maxItems),
    note: String(r.note || "").trim(),
  };
}

function ShippingSettings({ profiles, refreshProfiles }: any) {
  const localFulfillmentDraft = useLocalFulfillmentDraft();
  const [askConfirm, confirmNode] = useConfirm();
  const [books, setBooks] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [shippingView, setShippingView] = useState<"overview" | "profiles" | "carrier" | "local">("overview");
  
  // Modals visibility
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  
  // Creating Profile inline state
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [shippoApiKey, setShippoApiKey] = useState("");
  const [showShippoApiKey, setShowShippoApiKey] = useState(false);
  const [shippoConfig, setShippoConfig] = useState<any | null>(null);
  const [shippoLoading, setShippoLoading] = useState(true);
  const [shippoSaving, setShippoSaving] = useState(false);
  const [carrierCountrySearch, setCarrierCountrySearch] = useState("");
  // Latest live-rate country list, updated synchronously on each click.
  const liveCountriesRef = useRef<string[] | null>(null);
  // Saves run one after another so the server always ends on the latest list.
  const liveSaveChain = useRef<Promise<unknown>>(Promise.resolve());
  const [shippoMessage, setShippoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Search/Filters
  const [productSearch, setProductSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");

  // Sub-items active editing states
  const [activeZone, setActiveZone] = useState<any | null>(null);
  const [activeRate, setActiveRate] = useState<any | null>(null);
  const [parentZoneIdForRate, setParentZoneIdForRate] = useState<string | null>(null);

  // Checked products local state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    const initialize = async () => {
      await adminApi.migrateShippingProfiles();
      refreshProfiles();
      loadBooks();
      loadShippoConfig();
    };
    initialize();
  }, []);

  const loadShippoConfig = async () => {
    setShippoLoading(true);
    try {
      setShippoConfig(await adminApi.getShippoConfig());
    } catch (err: any) {
      setShippoMessage({ type: "error", text: err.message || "Could not load Shippo settings." });
    } finally {
      setShippoLoading(false);
    }
  };

  const handleSaveShippoApiKey = async () => {
    const apiKey = shippoApiKey.trim();
    if (!apiKey) {
      setShippoMessage({ type: "error", text: "Enter your Shippo API key before saving." });
      return;
    }

    setShippoSaving(true);
    setShippoMessage(null);
    try {
      const config = await adminApi.saveShippoConfig(apiKey);
      setShippoConfig(config);
      setShippoApiKey("");
      setShowShippoApiKey(false);
      setShippoMessage({ type: "success", text: "Shippo API key saved and synced to Firebase." });
    } catch (err: any) {
      setShippoMessage({ type: "error", text: err.message || "Could not save the Shippo API key." });
    } finally {
      setShippoSaving(false);
    }
  };

  const loadBooks = async () => {
    try {
      const b = await adminApi.getAllBooks();
      setBooks(b);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectProfile = (profile: any) => {
    setSelectedProfileId(profile.id);
    setEditingProfile(JSON.parse(JSON.stringify(profile)));
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    try {
      const newProf = await adminApi.createShippingProfile({ name: newProfileName, zones: [] });
      setNewProfileName("");
      setIsCreatingProfile(false);
      refreshProfiles();
      handleSelectProfile(newProf);
    } catch {
      toast.error("Error creating shipping profile");
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (id === "general-profile") {
      toast.error("Cannot delete the General Shipping Profile.");
      return;
    }
    if (!(await askConfirm({ title: "Delete this shipping profile?", message: "All assigned products will revert to the General Profile.", confirmLabel: "Delete profile" }))) return;
    try {
      await adminApi.deleteShippingProfile(id);
      refreshProfiles();
      await loadBooks(); // its books moved to General — refresh counts and health
      setSelectedProfileId(null);
      setEditingProfile(null);
    } catch {
      toast.error("Error deleting shipping profile");
    }
  };

  const handleSaveProfile = async () => {
    if (!editingProfile) return;
    try {
      await adminApi.updateShippingProfile(editingProfile.id, editingProfile);
      refreshProfiles();
      setSelectedProfileId(null);
      setEditingProfile(null);
    } catch {
      toast.error("Error saving shipping profile");
    }
  };

  // Product assignment helper
  const openProductModal = () => {
    const assigned = books
      .filter((b: any) => b.shippingProfileId === editingProfile.id)
      .map((b: any) => b.id);
    setSelectedProductIds(assigned);
    setProductSearch("");
    setIsProductModalOpen(true);
  };

  const handleSaveProducts = async () => {
    try {
      const wasAssigned = books.filter((b: any) => b.shippingProfileId === editingProfile.id).map((b: any) => b.id);
      const removed = wasAssigned.filter((id: string) => !selectedProductIds.includes(id));
      await adminApi.assignProductsToShippingProfile(editingProfile.id, selectedProductIds, removed);
      await loadBooks();
      refreshProfiles();
      setIsProductModalOpen(false);
    } catch {
      toast.error("Error updating product assignments");
    }
  };

  // Zones helper
  const openZoneModal = (zone: any = null) => {
    if (zone) {
      const copy = JSON.parse(JSON.stringify(zone));
      copy.countries = (copy.countries || []).map(countryName);
      setActiveZone(copy);
    } else {
      setActiveZone({
        id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
        name: "",
        countries: [],
        rates: []
      });
    }
    setCountrySearch("");
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = () => {
    const hasGeography = activeZone.restOfWorld === true || activeZone.countries.length > 0 || (activeZone.continents || []).length > 0;
    if (!activeZone.name.trim() || !hasGeography) {
      toast.error("Please enter a zone name and select at least one country (or make it the rest-of-world zone).");
      return;
    }
    // Checkout matches zones by ISO code: store codes, never display names.
    const saved = {
      ...activeZone,
      countries: activeZone.restOfWorld ? [] : toCountryCodes(activeZone.countries),
      continents: activeZone.restOfWorld ? [] : (activeZone.continents || []),
    };

    setEditingProfile((prev: any) => {
      const zones = [...(prev.zones || [])];
      const idx = zones.findIndex(z => z.id === saved.id);
      if (idx > -1) {
        zones[idx] = saved;
      } else {
        zones.push(saved);
      }
      return { ...prev, zones };
    });
    setIsZoneModalOpen(false);
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!(await askConfirm({ title: "Delete this zone?", message: "Its rates will be removed with it. Save the profile to apply.", confirmLabel: "Delete zone" }))) return;
    setEditingProfile((prev: any) => {
      const zones = (prev.zones || []).filter((z: any) => z.id !== zoneId);
      return { ...prev, zones };
    });
  };

  // Rates helper
  const openRateModal = (zoneId: string, rate: any = null) => {
    setParentZoneIdForRate(zoneId);
    if (rate) {
      setActiveRate(JSON.parse(JSON.stringify(rate)));
    } else {
      setActiveRate({
        id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
        name: "Standard Shipping",
        base: 15,
        additional: 5,
        deliveryDays: "3-7",
        type: "flat",
        enabled: true,
        minPrice: null,
        maxPrice: null
      });
    }
    setIsRateModalOpen(true);
  };

  const handleSaveRate = () => {
    if (!activeRate.name.trim()) {
      toast.error("Please enter a shipping rate name.");
      return;
    }

    setEditingProfile((prev: any) => {
      const zones = [...(prev.zones || [])];
      const zoneIdx = zones.findIndex(z => z.id === parentZoneIdForRate);
      if (zoneIdx === -1) return prev;

      const zone = { ...zones[zoneIdx] };
      const rates = [...(zone.rates || [])];
      const rateIdx = rates.findIndex(r => r.id === activeRate.id);

      const cleaned = normalizeRate(activeRate);
      if (rateIdx > -1) rates[rateIdx] = cleaned; else rates.push(cleaned);

      zone.rates = rates;
      zones[zoneIdx] = zone;
      return { ...prev, zones };
    });
    setIsRateModalOpen(false);
  };

  const handleDeleteRate = async (zoneId: string, rateId: string) => {
    if (!(await askConfirm({ title: "Delete this shipping rate?", message: "Save the profile to apply the change.", confirmLabel: "Delete rate" }))) return;
    setEditingProfile((prev: any) => {
      const zones = [...(prev.zones || [])];
      const zoneIdx = zones.findIndex(z => z.id === zoneId);
      if (zoneIdx === -1) return prev;

      const zone = { ...zones[zoneIdx] };
      zone.rates = (zone.rates || []).filter((r: any) => r.id !== rateId);
      zones[zoneIdx] = zone;
      return { ...prev, zones };
    });
  };

  const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
  const handleDuplicateRate = (zoneId: string, rate: any) => {
    setEditingProfile((prev: any) => {
      const zones = (prev.zones || []).map((z: any) => z.id !== zoneId ? z
        : { ...z, rates: [...(z.rates || []), { ...JSON.parse(JSON.stringify(rate)), id: newId(), name: `${rate.name} (copy)` }] });
      return { ...prev, zones };
    });
    toast.success("Rate copied — edit the copy, then save the profile.");
  };
  const handleDuplicateZone = (zone: any) => {
    setEditingProfile((prev: any) => ({
      ...prev,
      zones: [...(prev.zones || []), {
        ...JSON.parse(JSON.stringify(zone)), id: newId(), name: `${zone.name} (copy)`, countries: [], continents: [], restOfWorld: false,
        rates: (zone.rates || []).map((r: any) => ({ ...JSON.parse(JSON.stringify(r)), id: newId() })),
      }],
    }));
    toast.success("Zone copied with its rates — pick its countries, then save the profile.");
  };
  const handleAddStarterZones = () => {
    setEditingProfile((prev: any) => ({ ...prev, zones: [...(prev.zones || []), ...starterZones(newId)] }));
    toast.success("Starter zones added — adjust the prices, then save the profile.");
  };

  const getAssignedProducts = (profileId: string) => {
    return books.filter((b: any) => b.shippingProfileId === profileId);
  };

  const money = (n: any) => `$${Number(n || 0).toFixed(2)}`;
  const shippoConnected = !!shippoConfig?.configured;
  const shippingSummary = useMemo(() => summarizeShipping(profiles, books), [profiles, books]);
  const countriesAssignedElsewhere = activeZone
    ? assignedCountryNames(editingProfile?.zones || [], activeZone.id)
    : new Set<string>();
  const remainingCountries = activeZone
    ? remainingCountryNames(editingProfile?.zones || [], activeZone.id)
    : [];
  const countryGroups = groupedCountries(countrySearch);

  // Dialogs shared by the list and editor views
  const dialogs = editingProfile ? (
    <>
      <Dialog open={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} size="lg" badge="📦" title="Assign products"
        description={`Books that use the “${editingProfile.name}” shipping rates.`}
        footer={<>
          <SecondaryButton onClick={() => setIsProductModalOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSaveProducts}>Save assignments ({selectedProductIds.length})</PrimaryButton>
        </>}>
        <SearchField label="Search catalog" placeholder="Search catalog by title…" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} data-autofocus />
        <ul className="rp-list" style={{ marginTop: 12, maxHeight: 360, overflowY: "auto", border: "1px solid var(--rp-border)" }} aria-label="Books">
          {books.filter((b) => String(b.title || "").toLowerCase().includes(productSearch.toLowerCase())).map((b) => {
            const isChecked = selectedProductIds.includes(b.id);
            const other = b.shippingProfileId && b.shippingProfileId !== editingProfile.id
              ? (profiles.find((pr: any) => pr.id === b.shippingProfileId)?.name || "another profile") : "";
            return (
              <li key={b.id} style={{ padding: "6px 12px" }}>
                <Checkbox label={b.title} checked={isChecked}
                  onChange={() => setSelectedProductIds((prev) => (isChecked ? prev.filter((id) => id !== b.id) : [...prev, b.id]))} />
                {other && <p className="rp-hint" style={{ margin: "0 0 4px 28px", color: "var(--rp-warning)" }}>⚠ Currently assigned to {other}; saving moves it here.</p>}
              </li>
            );
          })}
        </ul>
      </Dialog>

      <Dialog open={isZoneModalOpen && !!activeZone} onClose={() => setIsZoneModalOpen(false)} size="lg" badge="🌍" title="Shipping zone"
        description="Group countries and regions that share the same shipping rules."
        footer={<>
          <SecondaryButton onClick={() => setIsZoneModalOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSaveZone}>Save zone</PrimaryButton>
        </>}>
        {activeZone && (
          <div className="rp-stack" style={{ gap: 16 }}>
            <TextField label="Zone name" value={activeZone.name} placeholder="e.g. North America, Europe, Domestic…" data-autofocus
              onChange={(e) => setActiveZone({ ...activeZone, name: e.target.value })} />
            <Toggle label="Rest of world — everywhere not covered by another zone" checked={activeZone.restOfWorld === true}
              onChange={(on) => setActiveZone((prev: any) => ({ ...prev, restOfWorld: on, ...(on ? { countries: [], continents: [] } : {}) }))} />
            {!activeZone.restOfWorld && (<>
            <div>
              <div className="rp-sect">Regional presets</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CONTINENTS.map((continent) => (
                  <SecondaryButton key={continent} size="sm"
                    onClick={() => setActiveZone((prev: any) => ({
                      ...prev,
                      countries: Array.from(new Set([
                        ...prev.countries,
                        ...COUNTRIES.filter((country) => country.continent === continent && !countriesAssignedElsewhere.has(country.name)).map((country) => country.name),
                      ])),
                    }))}>
                    + {continent}
                  </SecondaryButton>
                ))}
                <PrimaryButton size="sm" disabled={remainingCountries.length === 0}
                  onClick={() => setActiveZone((prev: any) => ({ ...prev, countries: remainingCountries }))}>
                  Select all remaining worldwide ({remainingCountries.length})
                </PrimaryButton>
                <DestructiveButton size="sm" onClick={() => setActiveZone((prev: any) => ({ ...prev, countries: [] }))}>Clear selection</DestructiveButton>
              </div>
            </div>
            <SearchField label="Search countries" placeholder="Search countries…" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} />
            <p className="rp-hint" role="status" style={{ margin: 0 }}>{activeZone.countries.length} countr{activeZone.countries.length === 1 ? "y" : "ies"} selected</p>
            <div style={{ maxHeight: 360, overflowY: "auto", border: "1px solid var(--rp-border)", padding: "4px 12px" }}>
              {countryGroups.map(({ continent, countries }) => (
                <section key={continent} aria-labelledby={`shipping-continent-${continent.replace(/\s/g, "-")}`} style={{ padding: "10px 0" }}>
                  <div className="rp-sect" id={`shipping-continent-${continent.replace(/\s/g, "-")}`} style={{ marginBottom: 6 }}>{continent}</div>
                  <div style={{ display: "grid", gap: 0, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                    {countries.map((country) => {
                      const unavailable = countriesAssignedElsewhere.has(country.name);
                      return (
                        <Checkbox key={country.code}
                          label={`${country.name}${unavailable ? " — in another zone" : ""}`}
                          checked={activeZone.countries.includes(country.name)} disabled={unavailable}
                          onChange={() => setActiveZone((prev: any) => ({
                            ...prev,
                            countries: prev.countries.includes(country.name)
                              ? prev.countries.filter((name: string) => name !== country.name)
                              : [...prev.countries, country.name],
                          }))} />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            </>)}
          </div>
        )}
      </Dialog>

      <Dialog open={isRateModalOpen && !!activeRate} onClose={() => setIsRateModalOpen(false)} badge="🚚" title="Shipping rate"
        description="What customers pay for this delivery option."
        footer={<>
          <SecondaryButton onClick={() => setIsRateModalOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSaveRate}>Save rate</PrimaryButton>
        </>}>
        {activeRate && (() => {
          const t = activeRate.type || "flat";
          const set = (k: string, v: any) => setActiveRate({ ...activeRate, [k]: v });
          const grid = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" } as const;
          const priced = t !== "free" && t !== "pickup";
          return (
          <div className="rp-stack" style={{ gap: 16 }}>
            <TextField label="Rate / service name" value={activeRate.name} placeholder="e.g. Standard shipping, Express delivery" data-autofocus
              onChange={(e) => set("name", e.target.value)} />
            <SelectField label="How is this rate priced?" value={t} onChange={(e) => set("type", e.target.value)}
              hint={RATE_TYPES.find((x) => x.id === t)?.help}>
              {RATE_TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </SelectField>
            {priced && (
              <div style={grid}>
                <TextField label="Base rate ($)" type="number" min={0} step="0.01" value={activeRate.base} placeholder="15.00" onChange={(e) => set("base", e.target.value)} />
                {t === "flat" && <TextField label="Each additional item ($)" type="number" min={0} step="0.01" value={activeRate.additional} placeholder="5.00" onChange={(e) => set("additional", e.target.value)} />}
                {t === "weight" && <TextField label="Per kg ($)" type="number" min={0} step="0.01" value={activeRate.perKg ?? ""} placeholder="8.00" onChange={(e) => set("perKg", e.target.value)} />}
                {t === "percent" && <TextField label="% of book subtotal" type="number" min={0} step="0.1" value={activeRate.percent ?? ""} placeholder="10" onChange={(e) => set("percent", e.target.value)} />}
                <TextField label="Handling fee ($)" type="number" min={0} step="0.01" value={activeRate.handlingFee ?? ""} placeholder="0.00" hint="Added once per order." onChange={(e) => set("handlingFee", e.target.value)} />
              </div>
            )}
            <div style={grid}>
              <TextField label={t === "pickup" ? "Ready in (days)" : "Estimated delivery (days)"} value={activeRate.deliveryDays || ""} placeholder="e.g. 3-7, 1-2, 5-10" onChange={(e) => set("deliveryDays", e.target.value)} />
              {priced && <TextField label="Free when order reaches ($)" type="number" min={0} step="0.01" value={activeRate.freeOver ?? ""} placeholder="e.g. 75.00" hint="This rate becomes free at or above this total." onChange={(e) => set("freeOver", e.target.value)} />}
            </div>
            <fieldset style={{ border: "var(--rp-hair) solid var(--rp-divider)", padding: 12, margin: 0 }}>
              <legend className="rp-label" style={{ padding: "0 6px" }}>Only offer this rate when… (leave blank for always)</legend>
              <div style={grid}>
                <TextField label="Order total at least ($)" type="number" min={0} value={activeRate.minPrice ?? ""} onChange={(e) => set("minPrice", e.target.value)} />
                <TextField label="Order total at most ($)" type="number" min={0} value={activeRate.maxPrice ?? ""} onChange={(e) => set("maxPrice", e.target.value)} />
                <TextField label="Cart weight at least (g)" type="number" min={0} value={activeRate.minWeight ?? ""} onChange={(e) => set("minWeight", e.target.value)} />
                <TextField label="Cart weight at most (g)" type="number" min={0} value={activeRate.maxWeight ?? ""} onChange={(e) => set("maxWeight", e.target.value)} />
                <TextField label="Items in cart at least" type="number" min={0} value={activeRate.minItems ?? ""} onChange={(e) => set("minItems", e.target.value)} />
                <TextField label="Items in cart at most" type="number" min={0} value={activeRate.maxItems ?? ""} onChange={(e) => set("maxItems", e.target.value)} />
              </div>
            </fieldset>
            <Toggle label="Rate is active (customers can choose it)" checked={activeRate.enabled !== false} onChange={(v: boolean) => set("enabled", v)} />
          </div>
          );
        })()}
      </Dialog>
    </>
  ) : null;

  // ─── Profiles list ──────────────────────────────────────────────────────────
  if (selectedProfileId === null || !editingProfile) {
    return (
      <div className="rp-stack">
        <Tabs label="Shipping settings" value={shippingView} onChange={setShippingView} tabs={[
          { id: "overview", label: "Overview" },
          { id: "profiles", label: "Profiles", count: shippingSummary.profileCount },
          { id: "carrier", label: "Carrier & labels" },
          { id: "local", label: "Pickup & local delivery" },
        ]} />
        {shippingView === "local" && <LocalFulfillmentSettings draft={localFulfillmentDraft} />}

        {shippingView === "overview" && (
          <>
            <div className="rp-kpi-grid">
              <MetricCard label="Shipping profiles" value={shippingSummary.profileCount} footer={`${shippingSummary.assignedProductCount} assigned products`} />
              <MetricCard label="Destination coverage" value={shippingSummary.coveredCountryCount} footer={`${shippingSummary.zoneCount} zones · ${shippingSummary.rateCount} rates`} tone="gold" />
              <MetricCard label="Configuration health" value={shippingSummary.issues.length === 0 ? "Ready" : `${shippingSummary.issues.length} issue${shippingSummary.issues.length === 1 ? "" : "s"}`} footer={shippoConnected ? "Shippo connected" : "Flat rates only"} tone={shippingSummary.issues.length === 0 ? undefined : "danger"} />
            </div>
            <SectionCard title="Checkout readiness" description="Resolve configuration gaps before they prevent a customer from choosing delivery.">
              {shippingSummary.issues.length === 0 ? (
                <div role="status" style={{ padding: 16, background: "var(--rp-success-tint)", border: "1px solid var(--rp-success)", color: "var(--rp-success)" }}>
                  <strong>✓ Shipping configuration is ready.</strong>
                  <p className="rp-hint" style={{ margin: "4px 0 0", color: "inherit" }}>Every profile has a zone and every zone has at least one rate.</p>
                </div>
              ) : (
                <ul className="rp-list" style={{ margin: -20 }} aria-label="Shipping configuration issues">
                  {shippingSummary.issues.map((issue) => (
                    <li key={issue.id} style={{ padding: "14px 20px", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
                      <span><strong>{issue.label}</strong><span className="rp-hint" style={{ display: "block", marginTop: 3 }}>{issue.detail}</span></span>
                      {issue.profileId && <SecondaryButton size="sm" onClick={() => {
                        const profile = profiles.find((item: any) => item.id === issue.profileId);
                        if (profile) handleSelectProfile(profile);
                      }}>Fix profile</SecondaryButton>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="rp-card-actions">
                <SecondaryButton onClick={() => setShippingView("carrier")}>{shippoConnected ? "Manage Shippo" : "Connect Shippo"}</SecondaryButton>
                <PrimaryButton onClick={() => setShippingView("profiles")}>Manage profiles</PrimaryButton>
              </div>
            </SectionCard>
          </>
        )}

        {shippingView === "carrier" && (
        <SectionCard title="Shippo connection" description="Address verification, live carrier rates and shipping labels."
          actions={!shippoLoading && <StatusBadge tone={shippoConnected ? "success" : "warning"}>{shippoConnected ? "Connected" : "Not connected"}</StatusBadge>}>
          {!shippoLoading && !shippoConnected && (
            <p role="alert" style={{ margin: "0 0 16px", padding: 12, background: "var(--rp-warning-tint)", border: "1px solid var(--rp-warning)", color: "var(--rp-warning)" }}>
              ⚠ Shippo isn't connected, so customer addresses aren't verified and live carrier rates are unavailable. Flat profile rates still apply.
            </p>
          )}
          {shippoConnected && (
            <div className="rp-stack" style={{ gap: 12, marginBottom: 16 }}>
              <p className="rp-hint" style={{ margin: 0 }}>Active key ending in <span className="rp-mono">••••{shippoConfig.lastFour}</span>{shippoConfig.source === "environment" && " (Firebase secret)"}</p>
              <Toggle label="Live carrier rates at checkout" checked={shippoConfig?.dynamicRatesEnabled ?? false}
                onChange={async (enabled) => {
                  try {
                    await adminApi.setShippoDynamicRates(enabled, shippoConfig?.dynamicRateCountries || []);
                    setShippoConfig((prev: any) => ({ ...prev, dynamicRatesEnabled: enabled }));
                    toast.success(enabled ? "Dynamic shipping rates enabled" : "Dynamic shipping rates disabled");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to update Shippo settings");
                  }
                }} />
              {shippoConfig?.dynamicRatesEnabled && (
                <div className="rp-stack" style={{ gap: 10, padding: 16, border: "1px solid var(--rp-border)", background: "var(--rp-canvas)" }}>
                  <div>
                    <strong>Countries using live rates</strong>
                    <p className="rp-hint" style={{ margin: "4px 0 0" }}>Only checked countries request Shippo rates. Every other country uses your regular shipping profiles and zones.</p>
                  </div>
                  <SearchField label="Search live-rate countries" value={carrierCountrySearch} onChange={(e) => setCarrierCountrySearch(e.target.value)} placeholder="Search countries…" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8, maxHeight: 260, overflowY: "auto", padding: 4 }}>
                    {COUNTRIES.filter((country) => country.name.toLowerCase().includes(carrierCountrySearch.trim().toLowerCase())).map((country) => {
                      const selected = (shippoConfig?.dynamicRateCountries || []).includes(country.code);
                      return (
                        <Checkbox key={country.code} label={country.name} checked={selected} onChange={async () => {
                          // Build from the latest list (not this render's), so quick clicks don't drop a country.
                          const current = liveCountriesRef.current ?? (shippoConfig?.dynamicRateCountries || []);
                          const countries = current.includes(country.code)
                            ? current.filter((code: string) => code !== country.code)
                            : [...current, country.code];
                          liveCountriesRef.current = countries;
                          setShippoConfig((prev: any) => ({ ...prev, dynamicRateCountries: countries }));
                          try {
                            const save = liveSaveChain.current.catch(() => {}).then(() => adminApi.setShippoDynamicRates(true, countries));
                            liveSaveChain.current = save;
                            await save;
                            toast.success(`${country.name} ${selected ? "removed from" : "added to"} live rates`);
                          } catch (err: any) {
                            liveCountriesRef.current = current;
                            setShippoConfig((prev: any) => ({ ...prev, dynamicRateCountries: current }));
                            toast.error(err.message || "Failed to update live-rate countries");
                          }
                        }} />
                      );
                    })}
                  </div>
                  {(shippoConfig?.dynamicRateCountries || []).length === 0 && <p role="status" className="rp-hint" style={{ margin: 0 }}>No countries selected — all destinations currently use regular shipping rates.</p>}
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 280px" }}>
              <TextField label="Shippo API key" type={showShippoApiKey ? "text" : "password"} value={shippoApiKey} autoComplete="new-password" spellCheck={false}
                placeholder={shippoConnected ? "Paste a new key to replace the current one" : "Paste your Shippo API key"}
                hint="Saved to the protected backend; the full key is never loaded back into this page."
                onChange={(e) => { setShippoApiKey(e.target.value); if (shippoMessage) setShippoMessage(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveShippoApiKey(); }} />
            </div>
            <SecondaryButton onClick={() => setShowShippoApiKey((v) => !v)} aria-pressed={showShippoApiKey}>{showShippoApiKey ? "Hide key" : "Show key"}</SecondaryButton>
            <PrimaryButton onClick={handleSaveShippoApiKey} disabled={shippoSaving || !shippoApiKey.trim()}>{shippoSaving ? "Saving…" : "Save & sync"}</PrimaryButton>
          </div>
          {shippoMessage && (
            <p role="status" style={{ margin: "12px 0 0", color: shippoMessage.type === "success" ? "var(--rp-success)" : "var(--rp-danger)", fontWeight: 600 }}>
              {shippoMessage.type === "success" ? "✓ " : "✕ "}{shippoMessage.text}
            </p>
          )}
        </SectionCard>
        )}

        {shippingView === "profiles" && (
        <>
        <SectionHead kicker="Shipping" title="Profiles, zones & rates" subcopy="A profile is a set of zones and rates. Books use the General profile unless you assign them to another."
          actions={!isCreatingProfile && <PrimaryButton onClick={() => setIsCreatingProfile(true)}>+ Create profile</PrimaryButton>} />

        {isCreatingProfile && (
          <SectionCard title="New shipping profile" description="Define a set of rules for special items, like heavy or fragile books.">
            <TextField label="Profile name" value={newProfileName} placeholder="e.g. Heavy items, Fragile prints…" data-autofocus onChange={(e) => setNewProfileName(e.target.value)} />
            <div className="rp-card-actions">
              <span />
              <span style={{ display: "flex", gap: 8 }}>
                <SecondaryButton onClick={() => { setIsCreatingProfile(false); setNewProfileName(""); }}>Cancel</SecondaryButton>
                <PrimaryButton onClick={handleCreateProfile} disabled={!newProfileName.trim()}>Create profile</PrimaryButton>
              </span>
            </div>
          </SectionCard>
        )}

        {profiles.length === 0 ? (
          <SectionCard><EmptyState icon="🚚" title="No shipping profiles" description="Create a profile with at least one zone and rate so customers can check out." /></SectionCard>
        ) : (
          <ul className="rp-stack" style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Shipping profiles">
            {profiles.map((p: any) => {
              const assigned = getAssignedProducts(p.id);
              const zonesCount = p.zones?.length || 0;
              const noRates = zonesCount === 0 || (p.zones || []).every((z: any) => !z.rates?.length);
              return (
                <li key={p.id}>
                  <SectionCard>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 className="rp-card-title" style={{ display: "inline", overflowWrap: "anywhere" }}>{p.name || "Untitled profile"}</h3>{" "}
                        {p.id === "general-profile" && <StatusBadge tone="primary">Default</StatusBadge>}{" "}
                        {noRates && <StatusBadge tone="warning">No rates yet</StatusBadge>}
                        <p className="rp-hint" style={{ margin: "6px 0 0" }}>{zonesCount} zone{zonesCount === 1 ? "" : "s"} · {assigned.length} product{assigned.length === 1 ? "" : "s"} assigned</p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <SecondaryButton onClick={() => handleSelectProfile(p)}>Manage rates</SecondaryButton>
                        {p.id !== "general-profile" && <DestructiveButton onClick={() => handleDeleteProfile(p.id)} aria-label={`Delete ${p.name} shipping profile`}>Delete</DestructiveButton>}
                      </div>
                    </div>
                  </SectionCard>
                </li>
              );
            })}
          </ul>
        )}
        </>
        )}
        {confirmNode}
      </div>
    );
  }

  // ─── Profile editor ─────────────────────────────────────────────────────────
  const assignedBooks = getAssignedProducts(editingProfile.id);
  const zones = editingProfile.zones || [];

  return (
    <div className="rp-stack">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
        <SecondaryButton onClick={async () => {
          const saved = profiles.find((p: any) => p.id === editingProfile?.id);
          const dirty = saved && JSON.stringify(saved) !== JSON.stringify(editingProfile);
          if (dirty && !(await askConfirm({ title: "Leave without saving?", message: "Your zone and rate changes to this profile haven't been saved.", confirmLabel: "Discard changes" }))) return;
          setSelectedProfileId(null); setEditingProfile(null);
        }}>← Back to profiles</SecondaryButton>
        <PrimaryButton onClick={handleSaveProfile}>Save profile changes</PrimaryButton>
      </div>
      <SectionHead kicker="Profile" title={editingProfile.name || "Untitled profile"} subcopy="Zone and rate edits are applied to the profile when you save." />

      {editingProfile.id !== "general-profile" && (
        <SectionCard title="Profile name">
          <TextField label="Profile name" value={editingProfile.name} onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })} />
        </SectionCard>
      )}

      <SectionCard title="Assigned products" description="Books that use this profile's rates."
        actions={<SecondaryButton onClick={openProductModal}>Manage products ({assignedBooks.length})</SecondaryButton>}>
        {assignedBooks.length === 0 ? (
          <EmptyState icon="📦" title="No books assigned" description={editingProfile.id === "general-profile" ? "Books without another profile use these rates." : "Assign books so they use this profile's rates."} />
        ) : (
          <ul className="rp-list" style={{ margin: -20 }} aria-label="Assigned books">
            {assignedBooks.slice(0, 6).map((b: any) => <li key={b.id} style={{ padding: "10px 20px", overflowWrap: "anywhere" }}>{b.title}</li>)}
            {assignedBooks.length > 6 && <li className="rp-hint">+ {assignedBooks.length - 6} more</li>}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Profile rules" description="Apply to every rate in this profile.">
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <TextField label="Free shipping over ($)" type="number" min={0} step="0.01" placeholder="e.g. 100.00"
            hint="Every rate in this profile becomes free at or above this order total."
            value={editingProfile.freeShippingOver ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, freeShippingOver: e.target.value === "" ? null : Number(e.target.value) })} />
          <TextField label="Handling / packing fee ($)" type="number" min={0} step="0.01" placeholder="0.00"
            hint="Added once per order for items in this profile."
            value={editingProfile.handlingFee ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, handlingFee: e.target.value === "" ? null : Number(e.target.value) })} />
          <TextField label="Assumed weight per book (g)" type="number" min={0} placeholder="e.g. 350"
            hint="Used for weight-based rates when a book has no weight set."
            value={editingProfile.defaultItemWeightG ?? ""} onChange={(e) => setEditingProfile({ ...editingProfile, defaultItemWeightG: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
      </SectionCard>

      <RateTester profile={editingProfile} />

      <SectionHead kicker="Zones" title="Geographic shipping zones" subcopy="A zone groups countries that share the same rates."
        actions={<span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {zones.length === 0 && <SecondaryButton onClick={handleAddStarterZones}>Add starter zones</SecondaryButton>}
          <PrimaryButton onClick={() => openZoneModal()}>+ Add shipping zone</PrimaryButton>
        </span>} />

      {zones.length === 0 ? (
        <SectionCard><EmptyState icon="🌍" title="No shipping zones" description="Customers can't check out without a zone that covers their country. Add one, then give it a rate." /></SectionCard>
      ) : zones.map((z: any) => (
        <SectionCard key={z.id} title={z.name} description={`${z.countries.length} countr${z.countries.length === 1 ? "y" : "ies"}`}
          actions={
            <span style={{ display: "flex", gap: 8 }}>
              <SecondaryButton size="sm" onClick={() => openZoneModal(z)}>Edit zone</SecondaryButton>
              <SecondaryButton size="sm" onClick={() => handleDuplicateZone(z)} aria-label={`Duplicate zone ${z.name}`}>Copy</SecondaryButton>
              <DestructiveButton size="sm" onClick={() => handleDeleteZone(z.id)} aria-label={`Delete zone ${z.name}`}>Delete</DestructiveButton>
            </span>
          }>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }} aria-label={`Countries in ${z.name}`}>
            {z.countries.map((c: string) => <StatusBadge key={c}>{c}</StatusBadge>)}
          </div>
          <div className="rp-sect">Rates</div>
          {(!z.rates || z.rates.length === 0) ? (
            <p role="alert" className="rp-hint" style={{ margin: 0, padding: 12, background: "var(--rp-warning-tint)", color: "var(--rp-warning)", border: "1px solid var(--rp-warning)" }}>
              ⚠ No rates configured — customers in this zone won't have a way to ship.
            </p>
          ) : (
            <div className="rp-table-wrap" role="region" aria-label={`Rates for ${z.name}`} tabIndex={0} style={{ boxShadow: "none" }}>
              <table className="rp-table">
                <caption className="rp-sr-only">Shipping rates for {z.name}</caption>
                <thead><tr><th scope="col">Rate</th><th scope="col">Pricing</th><th scope="col">Offered when</th><th scope="col">Delivery</th><th scope="col">Actions</th></tr></thead>
                <tbody>
                  {z.rates.map((r: any) => (
                    <tr key={r.id} style={r.enabled === false ? { opacity: 0.55 } : undefined}>
                      <td className="rp-lead">{r.name}{r.enabled === false && <> <StatusBadge>Off</StatusBadge></>}</td>
                      <td>{describeRatePrice(r)}</td>
                      <td>{describeRateConditions(r) || "Always"}</td>
                      <td>{r.type === "pickup" ? "Pickup" : `${r.deliveryDays || "—"} days`}</td>
                      <td>
                        <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                          <SecondaryButton size="sm" onClick={() => openRateModal(z.id, r)} aria-label={`Edit rate ${r.name}`}>Edit</SecondaryButton>
                          <SecondaryButton size="sm" onClick={() => handleDuplicateRate(z.id, r)} aria-label={`Duplicate rate ${r.name}`}>Copy</SecondaryButton>
                          <DestructiveButton size="sm" onClick={() => handleDeleteRate(z.id, r.id)} aria-label={`Delete rate ${r.name}`}>Delete</DestructiveButton>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="rp-card-actions"><span /><SecondaryButton size="sm" onClick={() => openRateModal(z.id)}>+ Add rate</SecondaryButton></div>
        </SectionCard>
      ))}

      {dialogs}
      {confirmNode}
    </div>
  );
}

function PaymentsSettings({ settings, setSettings, originalSettings, setOriginalSettings, hasChanges, saveSection, savingSection }: any) {
  const [askConfirm, confirmNode] = useConfirm();
  const stripe = settings.payments?.stripe || {};
  const paypal = settings.payments?.paypal || {};
  const testMode = settings.payments?.testMode || false;
  const manualMethods = settings.payments?.manualMethods || [];
  const footerBadges = settings.payments?.footerBadges || [];

  const [shippoConfig, setShippoConfig] = useState<any>(null);
  const [newShippoToken, setNewShippoToken] = useState("");
  const [savingShippo, setSavingShippo] = useState(false);
  const [loadingShippo, setLoadingShippo] = useState(false);

  useEffect(() => {
    async function loadShippoConfig() {
      setLoadingShippo(true);
      try {
        const conf = await adminApi.getShippoConfig();
        setShippoConfig(conf);
      } catch (err) {
        console.error("Failed to load Shippo config:", err);
      } finally {
        setLoadingShippo(false);
      }
    }
    loadShippoConfig();
  }, []);

  const handleSaveShippo = async () => {
    if (!newShippoToken.trim()) return;
    setSavingShippo(true);
    try {
      const res = await adminApi.saveShippoConfig(newShippoToken);
      setShippoConfig(res);
      setNewShippoToken("");
      toast.success("Shippo API Token saved and synced successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save Shippo API Token.");
    } finally {
      setSavingShippo(false);
    }
  };

  // Manual payment modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [methodName, setMethodName] = useState("");
  const [methodInstructions, setMethodInstructions] = useState("");
  const [methodType, setMethodType] = useState<"bank" | "cod" | "custom">("bank");
  const [methodEnabled, setMethodEnabled] = useState(true);

  // Bumped on save/discard so the write-only key boxes clear with the state.
  const [secretFieldsKey, setSecretFieldsKey] = useState(0);
  const [removingKey, setRemovingKey] = useState<null | "live" | "test">(null);
  const removeStoredKey = async (mode: "live" | "test") => {
    if (!(await askConfirm({ title: `Remove the stored ${mode} secret key?`, message: mode === "live" ? "Live checkout will use the key set in Firebase Functions (if any) until you enter a new one." : "Test (sandbox) checkout won't work until you enter a new test key.", confirmLabel: "Remove key" }))) return;
    setRemovingKey(mode);
    try {
      await adminApi.removeStripeSecretKey(mode);
      const flag = mode === "live" ? "secretKeyStored" : "testSecretKeyStored";
      const field = mode === "live" ? "secretKey" : "testSecretKey";
      const patchOf = (prev: any) => ({ ...prev, payments: { ...prev?.payments, stripe: { ...prev?.payments?.stripe, [flag]: false, [field]: "" } } });
      setSettings(patchOf(settings));
      setOriginalSettings?.(patchOf);
      setSecretFieldsKey((k) => k + 1);
      toast.success(`Stored ${mode} secret key removed`);
    } catch (err: any) {
      toast.error(err.message || "Couldn't remove the key");
    } finally {
      setRemovingKey(null);
    }
  };

  const updateStripe = (patch: any) => {
    setSettings({
      ...settings,
      payments: { ...settings.payments, stripe: { ...stripe, ...patch } }
    });
  };

  const updatePaypal = (patch: any) => {
    setSettings({
      ...settings,
      payments: { ...settings.payments, paypal: { ...paypal, ...patch } }
    });
  };

  const updateTestMode = (val: boolean) => {
    setSettings({
      ...settings,
      payments: { ...settings.payments, testMode: val }
    });
  };

  const openAddMethod = (type: "bank" | "cod" | "custom") => {
    let defaultName = "";
    let defaultInstructions = "";
    if (type === "bank") {
      defaultName = "Bank Deposit / e-Transfer";
      defaultInstructions = "Please send your Interac e-Transfer to payments@lyricalmyricalbooks.com. Use your order number as the transaction message.";
    } else if (type === "cod") {
      defaultName = "Cash on Delivery (COD)";
      defaultInstructions = "Please prepare the exact amount of cash for your order. Our delivery agent will collect it upon delivery.";
    } else {
      defaultName = "Custom Payment Method";
      defaultInstructions = "Please follow these instructions to complete payment for your order.";
    }
    setEditingMethod(null);
    setMethodType(type);
    setMethodName(defaultName);
    setMethodInstructions(defaultInstructions);
    setMethodEnabled(true);
    setIsManualModalOpen(true);
  };

  const openEditMethod = (method: any) => {
    setEditingMethod(method);
    setMethodType(method.type);
    setMethodName(method.name);
    setMethodInstructions(method.instructions);
    setMethodEnabled(method.enabled);
    setIsManualModalOpen(true);
  };

  const handleSaveMethod = () => {
    if (!methodName.trim()) {
      toast.error("Please enter a payment method name.");
      return;
    }

    let updatedMethods = [];
    if (editingMethod) {
      updatedMethods = manualMethods.map((m: any) =>
        m.id === editingMethod.id
          ? { ...m, name: methodName, instructions: methodInstructions, enabled: methodEnabled }
          : m
      );
    } else {
      const newMethod = {
        id: `manual_${Date.now()}`,
        type: methodType,
        name: methodName,
        instructions: methodInstructions,
        enabled: methodEnabled
      };
      updatedMethods = [...manualMethods, newMethod];
    }

    setSettings({
      ...settings,
      payments: {
        ...settings.payments,
        manualMethods: updatedMethods
      }
    });
    setIsManualModalOpen(false);
  };

  const handleDeleteMethod = (id: string) => {
    const updatedMethods = manualMethods.filter((m: any) => m.id !== id);
    setSettings({
      ...settings,
      payments: {
        ...settings.payments,
        manualMethods: updatedMethods
      }
    });
  };

  const handleToggleMethodStatus = (id: string, enabled: boolean) => {
    const updatedMethods = manualMethods.map((m: any) =>
      m.id === id ? { ...m, enabled } : m
    );
    setSettings({
      ...settings,
      payments: {
        ...settings.payments,
        manualMethods: updatedMethods
      }
    });
  };

  const enabledManual = manualMethods.filter((m: any) => m.enabled);
  const dirty = hasChanges("payments");
  const stripeLive = !!stripe.connected;
  const paypalLive = !!paypal.connected;
  const secretStored = !!(stripe.secretKey || stripe.testSecretKey || stripe.secretKeyStored || stripe.testSecretKeyStored);
  const paymentIssues = useMemo(() => paymentHealth(settings.payments), [settings.payments]);

  const removeMethod = async (m: any) => {
    if (!(await askConfirm({ title: "Delete this payment method?", message: `“${m.name}” will no longer be offered at checkout once you save.`, confirmLabel: "Delete method" }))) return;
    handleDeleteMethod(m.id);
  };

  return (
    <div className="rp-stack">
      <SectionCard title="Payment overview" description="What customers can pay with right now.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <StatusBadge tone={testMode ? "warning" : "success"}>{testMode ? "Test mode — no real charges" : "Live mode"}</StatusBadge>
          <StatusBadge tone={stripeLive ? "success" : "neutral"}>Stripe {stripeLive ? "on" : "off"}</StatusBadge>
          <StatusBadge tone={paypalLive ? "success" : "neutral"}>PayPal {paypalLive ? "on" : "off"}</StatusBadge>
          <StatusBadge tone={enabledManual.length ? "info" : "neutral"}>{enabledManual.length} manual method{enabledManual.length === 1 ? "" : "s"}</StatusBadge>
          {!stripeLive && !paypalLive && enabledManual.length === 0 && <StatusBadge tone="danger">No way to pay is enabled</StatusBadge>}
        </div>
        <p className="rp-hint" style={{ margin: "12px 0 0" }}>
          The amount charged is always calculated by the payment server, never in the browser. Orders are created unpaid and are marked paid only when the Stripe webhook confirms the payment.
        </p>
        {paymentIssues.length === 0 ? (
          <p role="status" style={{ padding: 12, background: "var(--rp-success-tint)", color: "var(--rp-success)", border: "1px solid var(--rp-success)" }}><strong>✓ Payment configuration is launch-ready.</strong></p>
        ) : (
          <ul className="rp-list" aria-label="Payment readiness issues" style={{ marginTop: 16, border: "1px solid var(--rp-border)" }}>
            {paymentIssues.map((issue) => <li key={issue.id} style={{ padding: 12 }}><StatusBadge tone={issue.severity === "blocking" ? "danger" : "warning"}>{issue.severity}</StatusBadge> <strong style={{ marginLeft: 8 }}>{issue.label}</strong><span className="rp-hint" style={{ display: "block", marginTop: 4 }}>{issue.detail}</span></li>)}
          </ul>
        )}
        <div className="rp-card-actions">
          <Toggle label="Test (sandbox) mode" checked={!!testMode} onChange={updateTestMode} />
          <span className="rp-hint">In test mode Stripe and PayPal process test charges and orders are flagged as test orders.</span>
        </div>
      </SectionCard>

      <SectionCard title="Stripe" description="Accept credit and debit cards, Apple Pay and Google Pay."
        actions={<SecondaryButton size="sm" onClick={() => window.open("https://dashboard.stripe.com", "_blank", "noopener")}>Stripe dashboard ↗</SecondaryButton>}>
        <div className="rp-stack" style={{ gap: 20 }}>
          <Toggle label="Stripe checkout" checked={!!stripe.connected} onChange={(v) => updateStripe({ connected: v })} />
          {stripe.connected && (
            <>
              {secretStored && (
                <div style={{ padding: 16, background: "var(--rp-warning-tint)", border: "2px solid var(--rp-border-strong)" }}>
                  <strong>🔒 Secret key stored privately.</strong>{" "}
                  Secret keys are kept in an admin-only store the storefront cannot read. Rotate any key entered here before October 2026 — older saves were publicly readable.
                </div>
              )}
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                <div className="rp-card" style={{ padding: 16, boxShadow: "none", opacity: testMode ? 0.75 : 1 }}>
                  <div className="rp-sect">Live keys {!testMode && "· in use"}</div>
                  <div className="rp-stack" style={{ gap: 12 }}>
                    <InputField label="Publishable key" placeholder="pk_live_…" icon={Lock} value={stripe.publicKey || ""} onChange={(e: any) => updateStripe({ publicKey: e.target.value })} />
                    <SecretField key={`live-${secretFieldsKey}`} label="Secret key" placeholder="sk_live_…" stored={!!stripe.secretKeyStored}
                      validate={(v) => stripeSecretKeyProblem(v, "live")} onCommit={(v) => updateStripe({ secretKey: v })}
                      onRemove={stripe.secretKeyStored ? () => removeStoredKey("live") : undefined} removing={removingKey === "live"} />
                  </div>
                </div>
                <div className="rp-card" style={{ padding: 16, boxShadow: "none", opacity: testMode ? 1 : 0.75 }}>
                  <div className="rp-sect">Test keys {testMode && "· in use"}</div>
                  <div className="rp-stack" style={{ gap: 12 }}>
                    <InputField label="Test publishable key" placeholder="pk_test_…" icon={Lock} value={stripe.testPublicKey || ""} onChange={(e: any) => updateStripe({ testPublicKey: e.target.value })} />
                    <SecretField key={`test-${secretFieldsKey}`} label="Test secret key" placeholder="sk_test_…" stored={!!stripe.testSecretKeyStored}
                      validate={(v) => stripeSecretKeyProblem(v, "test")} onCommit={(v) => updateStripe({ testSecretKey: v })}
                      onRemove={stripe.testSecretKeyStored ? () => removeStoredKey("test") : undefined} removing={removingKey === "test"} />
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                <Toggle label="Apple Pay" checked={!!stripe.applePay} onChange={(v) => updateStripe({ applePay: v })} />
                <Toggle label="Google Pay" checked={!!stripe.googlePay} onChange={(v) => updateStripe({ googlePay: v })} />
              </div>
              <div className="rp-card" style={{ padding: 16, boxShadow: "none", background: "var(--rp-surface-sunken)" }}>
                <div className="rp-sect">Apple Pay &amp; Google Pay</div>
                <p className="rp-hint" style={{ marginTop: 0 }}>
                  Wallet buttons only show in the card form once this site's address is registered with Stripe. Save your Stripe keys first.
                </p>
                <SecondaryButton size="sm" onClick={async () => {
                  try {
                    const r = await adminApi.registerStripePaymentDomain(window.location.origin);
                    toast.success(`${r.domain}: Apple Pay ${r.applePay}, Google Pay ${r.googlePay}`);
                  } catch (err: any) {
                    toast.error(err.message);
                  }
                }}>Register this site with Stripe</SecondaryButton>
              </div>
              <StripeWebhookHealth unsaved={dirty} />
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard title="PayPal" description="Let customers pay with PayPal.">
        <div className="rp-stack" style={{ gap: 20 }}>
          <Toggle label="PayPal checkout" checked={!!paypal.connected} onChange={(v) => updatePaypal({ connected: v })} />
          {paypal.connected && (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <InputField label="Live client ID" placeholder="Client ID…" icon={Lock} value={paypal.clientId || ""} onChange={(e: any) => updatePaypal({ clientId: e.target.value })} />
              <InputField label="Test client ID" placeholder="Test client ID…" icon={Lock} value={paypal.testClientId || ""} onChange={(e: any) => updatePaypal({ testClientId: e.target.value })} />
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Shippo" description="Address verification, live carrier rates and shipping labels."
        actions={<SecondaryButton size="sm" onClick={() => window.open("https://goshippo.com", "_blank", "noopener")}>Shippo ↗</SecondaryButton>}>
        <div className="rp-stack" style={{ gap: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {loadingShippo ? <StatusBadge>Checking…</StatusBadge>
              : <StatusBadge tone={shippoConfig?.configured ? "success" : "warning"}>{shippoConfig?.configured ? "Connected" : "Not connected — addresses are not verified"}</StatusBadge>}
            {shippoConfig?.updatedAt && <span className="rp-hint">Last updated {new Date(shippoConfig.updatedAt).toLocaleDateString()}</span>}
          </div>
          {shippoConfig?.configured && (
            <Toggle label="Live carrier rates at checkout (based on address and parcel weight)" checked={shippoConfig?.dynamicRatesEnabled ?? false}
              onChange={async (enabled) => {
                try {
                  await adminApi.setShippoDynamicRates(enabled);
                  setShippoConfig((prev: any) => ({ ...prev, dynamicRatesEnabled: enabled }));
                  toast.success(enabled ? "Dynamic shipping rates enabled" : "Dynamic shipping rates disabled");
                } catch (err: any) {
                  toast.error(err.message || "Failed to update Shippo settings.");
                }
              }} />
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 280px" }}>
              <InputField label="New Shippo API token" placeholder="shippo_live_… or shippo_test_…" icon={ShieldCheck} type="password" value={newShippoToken}
                onChange={(e: any) => setNewShippoToken(e.target.value)} hint="Sent to the server and stored with limited access. It is never shown again or exposed to the storefront." />
            </div>
            <PrimaryButton onClick={handleSaveShippo} disabled={savingShippo || !newShippoToken.trim()}>{savingShippo ? "Saving…" : "Save key"}</PrimaryButton>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Manual payment methods" description="Bank e-Transfer, cash on delivery or your own instructions."
        actions={
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <SecondaryButton size="sm" onClick={() => openAddMethod("bank")}>+ e-Transfer</SecondaryButton>
            <SecondaryButton size="sm" onClick={() => openAddMethod("cod")}>+ Cash on delivery</SecondaryButton>
            <SecondaryButton size="sm" onClick={() => openAddMethod("custom")}>+ Custom</SecondaryButton>
          </div>
        }>
        {manualMethods.length === 0 ? (
          <EmptyState icon="💳" title="No manual methods" description="Add an e-Transfer or cash-on-delivery option for customers who don't pay by card." />
        ) : (
          <ul className="rp-list" style={{ margin: -20 }} aria-label="Manual payment methods">
            {manualMethods.map((method: any) => (
              <li key={method.id} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                  <strong>{method.name}</strong> <StatusBadge tone={method.enabled ? "success" : "neutral"}>{method.enabled ? "Enabled" : "Off"}</StatusBadge>
                  <p className="rp-hint" style={{ margin: "4px 0 0", overflowWrap: "anywhere" }}>{method.instructions}</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Toggle label={`${method.name} enabled`} checked={!!method.enabled} onChange={(v) => handleToggleMethodStatus(method.id, v)} />
                  <SecondaryButton size="sm" onClick={() => openEditMethod(method)} aria-label={`Edit ${method.name}`}>Edit</SecondaryButton>
                  <DestructiveButton size="sm" onClick={() => removeMethod(method)} aria-label={`Delete ${method.name}`}>Delete</DestructiveButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Footer payment icons" description="Monochrome icons shown in the storefront footer.">
        <div style={{ display: "grid", gap: 4, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          {[
            { id: "visa", label: "Visa" }, { id: "mastercard", label: "Mastercard" }, { id: "amex", label: "American Express" },
            { id: "paypal", label: "PayPal" }, { id: "applepay", label: "Apple Pay" }, { id: "googlepay", label: "Google Pay" },
            { id: "afterpay", label: "Afterpay" }, { id: "klarna", label: "Klarna" },
          ].map((badge) => (
            <Checkbox key={badge.id} label={badge.label} checked={footerBadges.includes(badge.id)}
              onChange={() => {
                const next = footerBadges.includes(badge.id) ? footerBadges.filter((b: string) => b !== badge.id) : [...footerBadges, badge.id];
                setSettings({ ...settings, payments: { ...settings.payments, footerBadges: next } });
              }} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Currency" description="How prices are shown and charged.">
        <p className="rp-hint" style={{ margin: 0 }}>Prices are set and charged in your store currency (CA$). Any currency selector on the storefront is a display convenience; the amount charged is always calculated by the payment server.</p>
      </SectionCard>

      <SaveBar dirty={dirty} saving={savingSection === "payments"} message="You have unsaved payment settings."
        onSave={async () => { if (await saveSection("payments", { payments: settings.payments })) { setSecretFieldsKey((k) => k + 1); toast.success("Payment settings saved"); } }}
        onDiscard={() => { setSettings({ ...settings, payments: JSON.parse(JSON.stringify(originalSettings?.payments ?? {})) }); setSecretFieldsKey((k) => k + 1); }} />

      <Dialog open={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} title={editingMethod ? "Edit payment method" : "Add payment method"} badge="💳"
        footer={<>
          <SecondaryButton onClick={() => setIsManualModalOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSaveMethod}>{editingMethod ? "Update method" : "Add method"}</PrimaryButton>
        </>}>
        <div className="rp-stack" style={{ gap: 16 }}>
          <TextField label="Payment method title" value={methodName} placeholder="e.g. Bank deposit, Interac e-Transfer" onChange={(e) => setMethodName(e.target.value)} data-autofocus />
          <TextArea label="Customer instructions" rows={5} value={methodInstructions} onChange={(e) => setMethodInstructions(e.target.value)}
            placeholder="e.g. Send your e-Transfer to payments@example.com and use your order number as the message." hint="Shown to the customer after they place the order." />
          <Toggle label="Offer this method at checkout" checked={methodEnabled} onChange={setMethodEnabled} />
        </div>
      </Dialog>
      {confirmNode}
    </div>
  );
}

function TaxesSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [rate, setRate] = useState("");

  const handleAdd = () => {
    if (!country || !rate) return;
    // region is optional: empty = country-wide rate, set = state/province
    // override (e.g. country "Canada" + region "Ontario" for HST).
    const newRates = [...(settings.taxes?.rates || []), { country, region: region.trim(), rate }];
    setSettings({ ...settings, taxes: { ...settings.taxes, rates: newRates } });
    setIsAdding(false);
    setCountry("");
    setRegion("");
    setRate("");
  };

  const handleDelete = (index: number) => {
    const newRates = settings.taxes.rates.filter((_: any, i: number) => i !== index);
    setSettings({ ...settings, taxes: { ...settings.taxes, rates: newRates } });
  };

  return (
    <div className="space-y-16">
      <header className="flex flex-col gap-2 mb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Tax Settings</h2>
            <p className="text-xs text-slate-400 tracking-[0.3em] uppercase mt-4 font-bold">Set up country-specific tax rates to calculate at checkout</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAdding(!isAdding)} 
              className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] flex items-center gap-3 hover:bg-white/10 transition-all text-white shadow-xl shadow-black/20"
            >
              {isAdding ? <X size={16} className="text-rose-400" /> : <Plus size={16} className="text-violet-400" />} 
              {isAdding ? "Cancel" : "Add Tax Rate"}
            </button>
            {hasChanges('taxes') && (
              <button
                onClick={() => saveSection('taxes', { taxes: settings.taxes })}
                disabled={savingSection === 'taxes'}
                className="bg-violet-600 text-white px-12 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-violet-600/40 hover:bg-violet-500 transition-all border border-violet-400/20"
              >
                {savingSection === 'taxes' ? 'SYNCHRONIZING...' : 'PUBLISH CHANGES'}
              </button>
            )}
          </div>
        </div>
      </header>

      {isAdding && (
        <section className="glass-card rounded-[3rem] p-12 border border-violet-500/20 bg-violet-500/[0.03] space-y-12 relative overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent pointer-events-none" />
          <SectionHeader 
            title="Add Tax Rate" 
            subtitle="Define tax requirements for a specific country or region" 
            icon={Percent} 
            color="rose"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
            <InputField
              label="COUNTRY"
              icon={Globe}
              placeholder="e.g. Canada"
              value={country}
              onChange={(e: any) => setCountry(e.target.value)}
            />
            <InputField
              label="STATE / PROVINCE (OPTIONAL)"
              icon={Globe}
              placeholder="e.g. Ontario — blank = whole country"
              value={region}
              onChange={(e: any) => setRegion(e.target.value)}
            />
            <InputField
              label="TAX RATE (%)"
              icon={Hash}
              placeholder="13"
              value={rate}
              onChange={(e: any) => setRate(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex gap-6 relative z-10">
            <button 
              onClick={handleAdd} 
              className="bg-violet-600 text-white px-12 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-violet-600/30 hover:bg-violet-500 active:scale-95 transition-all"
            >
              SAVE TAX RATE
            </button>
            <button 
              onClick={() => setIsAdding(false)} 
              className="bg-white/5 text-slate-400 px-12 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] hover:bg-white/10 transition-all"
            >
              CANCEL
            </button>
          </div>
        </section>
      )}

      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-violet-500/[0.02] to-transparent pointer-events-none" />
        <SectionHeader 
          title="Active Tax Rates" 
          subtitle="Tax rates calculated at checkout for each country" 
          icon={Database} 
          color="violet"
        />
 
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4 relative z-10">
          {(!settings.taxes?.rates || settings.taxes.rates.length === 0) && (
            <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] gap-6">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <Percent size={32} className="text-slate-700" />
              </div>
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">No tax rates configured yet</p>
            </div>
          )}
          
          {settings.taxes?.rates?.map((r: any, idx: number) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 hover:border-violet-500/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <button 
                onClick={() => handleDelete(idx)}
                aria-label="Delete tax rate"
                className="absolute top-8 right-8 p-3 bg-white/5 rounded-2xl text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all z-20"
              >
                <Trash2 size={16} />
              </button>
              <div className="space-y-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                    <Globe size={18} className="text-violet-400" />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-[0.15em] italic">
                    {r.country}{r.region ? ` · ${r.region}` : ""}
                  </h4>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">Tax Rate</p>
                  <p className="text-5xl font-black text-white font-mono tracking-tighter italic">{r.rate}<span className="text-violet-500/50 text-2xl ml-1">%</span></p>
                </div>
                <div className="flex items-center gap-3 px-5 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 w-fit">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Active</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

// DesignerSettings removed — the designer tab is a full-screen StudioEditor rendered by Dashboard

function _DesignerSettings_REMOVED({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'logo') setUploadingLogo(true);
    else setUploadingFavicon(true);

    try {
      const url = await adminApi.uploadBrandAsset(file, type);
      setSettings({
        ...settings,
        design: {
          ...settings.design,
          [type === 'logo' ? 'logoUrl' : 'faviconUrl']: url
        }
      });
    } catch (err) {
      toast.error(`Error uploading ${type}`);
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  };

  const currentFont = settings.design?.font || 'Inter';
  const currentColor = settings.design?.primaryColor || '#000000';
  const logoUrl = settings.design?.logoUrl;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
         <div>
            <h2 className="text-4xl font-black tracking-tight uppercase">SHOP DESIGNER</h2>
            <p className="text-[11px] text-neutral-400 mt-2">Configure the visual identity, typography, and layout of your public storefront.</p>
         </div>
         {hasChanges('design') && (
            <button 
              onClick={() => saveSection('design', { design: settings.design })}
              disabled={savingSection === 'design'}
              className="bg-[#A855F7] text-white px-8 py-2.5 rounded-full text-[10px] font-bold tracking-widest shadow-lg shadow-purple-200 hover:bg-purple-600 transition-all"
            >
              {savingSection === 'design' ? 'SAVING...' : 'PUBLISH DESIGN'}
            </button>
         )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-8">
            <div className="space-y-6">
               <div>
                  <h3 className="text-sm font-bold tracking-tight mb-1">Visual Identity</h3>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Primary Theme Color</label>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl shadow-inner border border-neutral-100" style={{ backgroundColor: currentColor }}></div>
                        <input 
                           type="color" 
                           value={currentColor} 
                           onChange={e => setSettings({...settings, design: {...settings.design, primaryColor: e.target.value}})}
                           className="h-10 w-24 cursor-pointer bg-transparent border-none" 
                        />
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Typography</label>
                     <select 
                       className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-neutral-200"
                       value={currentFont}
                       onChange={e => setSettings({...settings, design: {...settings.design, font: e.target.value}})}
                     >
                        <option value="Inter">Inter (Sans-serif Modern)</option>
                        <option value="Outfit">Outfit (Geometric Soft)</option>
                        <option value="Roboto">Roboto (Clean Standard)</option>
                        <option value="Playfair Display">Playfair (Classic Serif)</option>
                     </select>
                  </div>
               </div>

               <div className="pt-6 border-t border-neutral-50 space-y-6">
                  <div>
                     <h3 className="text-sm font-bold tracking-tight mb-1">Brand Assets</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-4">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Shop Logo</label>
                        <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden bg-neutral-50/50 hover:bg-neutral-50 transition-colors h-32">
                           {uploadingLogo ? (
                              <p className="text-[10px] font-bold animate-pulse text-purple-500">UPLOADING...</p>
                           ) : logoUrl ? (
                              <>
                                 <img src={logoUrl} alt="Logo" className="max-h-16 object-contain z-10" />
                                 <div className="absolute inset-0 bg-white/80 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                    <span className="text-[10px] font-bold tracking-widest">CHANGE</span>
                                 </div>
                              </>
                           ) : (
                              <>
                                 <div className="w-8 h-8 rounded-full bg-neutral-200 mb-2 flex items-center justify-center"><Plus size={14} /></div>
                                 <p className="text-[10px] font-bold text-neutral-400">UPLOAD LOGO</p>
                              </>
                           )}
                           <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" accept="image/*" onChange={e => handleAssetUpload(e, 'logo')} />
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Favicon</label>
                        <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden bg-neutral-50/50 hover:bg-neutral-50 transition-colors h-32">
                           {uploadingFavicon ? (
                              <p className="text-[10px] font-bold animate-pulse text-purple-500">UPLOADING...</p>
                           ) : settings.design?.faviconUrl ? (
                              <>
                                 <img src={settings.design.faviconUrl} alt="Favicon" className="w-8 h-8 object-contain z-10" />
                                 <div className="absolute inset-0 bg-white/80 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                    <span className="text-[10px] font-bold tracking-widest">CHANGE</span>
                                 </div>
                              </>
                           ) : (
                              <>
                                 <div className="w-8 h-8 rounded-full bg-neutral-200 mb-2 flex items-center justify-center"><Plus size={14} /></div>
                                 <p className="text-[10px] font-bold text-neutral-400">UPLOAD ICON</p>
                              </>
                           )}
                           <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" accept="image/*" onChange={e => handleAssetUpload(e, 'favicon')} />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         <section className="bg-neutral-100 rounded-[2rem] p-4 flex flex-col relative overflow-hidden">
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4 ml-4 mt-2">Live Preview</h3>
            
            {/* The Mock Window */}
            <div className="flex-1 bg-white rounded-3xl shadow-lg border border-neutral-200/50 overflow-hidden flex flex-col" style={{ fontFamily: currentFont }}>
               {/* Browser bar */}
               <div className="bg-neutral-50 border-b border-neutral-100 px-4 py-3 flex gap-2 items-center">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div className="mx-auto bg-white px-3 py-1 rounded shadow-sm text-[8px] text-neutral-400 flex items-center gap-1">
                     <Lock size={8} /> lyricalmyricalbooks.com
                  </div>
               </div>

               {/* Mock Content */}
               <div className="flex-1 p-6 flex flex-col relative">
                  {/* Mock Nav */}
                  <div className="flex justify-between items-center mb-12">
                     <div className="text-xl font-black tracking-tighter">
                        {logoUrl ? <img src={logoUrl} className="h-6 object-contain" /> : "F✶M"}
                     </div>
                     <div className="flex gap-4 text-[10px] font-bold tracking-widest opacity-30 uppercase">
                        <span>Shop</span>
                        <span>Archive</span>
                        <span>Cart</span>
                     </div>
                  </div>

                  {/* Mock Hero */}
                  <div className="max-w-[200px] space-y-4">
                     <h1 className="text-3xl font-black leading-none tracking-tight">The Art of Storytelling.</h1>
                     <p className="text-[10px] leading-relaxed opacity-50">Discover rare editions and exclusive prints customized to your aesthetic.</p>
                     
                     <div className="pt-4 flex gap-2">
                        <div className="px-6 py-2 rounded-full text-[9px] font-bold text-white tracking-widest" style={{ backgroundColor: currentColor }}>
                           SHOP NOW
                        </div>
                        <div className="px-4 py-2 rounded-full text-[9px] font-bold border border-neutral-200 tracking-widest">
                           LEARN MORE
                        </div>
                     </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute -right-12 bottom-12 w-48 h-64 bg-neutral-50 rounded-xl border border-neutral-100 shadow-xl overflow-hidden -rotate-6">
                     <div className="w-full h-32 bg-neutral-200/50 animate-pulse"></div>
                     <div className="p-4 space-y-2">
                        <div className="w-3/4 h-3 rounded bg-neutral-200"></div>
                        <div className="w-1/2 h-3 rounded bg-neutral-200"></div>
                     </div>
                  </div>
               </div>
            </div>
         </section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inventory Sync component
// ─────────────────────────────────────────────────────────────
function InventorySync({ lastSync }: { lastSync?: string }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(lastSync);
  const [confirming, setConfirming] = useState(false);

  const handleSync = async () => {
    setConfirming(false);
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await adminApi.syncInventoryFromLegacy();
      setResult(res);
      setLastSyncTime(new Date().toISOString());
      toast.success("Inventory synced");
    } catch (err: any) {
      setError(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const fmtTime = (iso?: string) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const columns: Column<any>[] = [
    { key: "title", header: "Book", lead: true, render: (r) => (<div><div style={{ overflowWrap: "anywhere" }}>{r.title || "(untitled)"}</div><div className="rp-hint rp-mono">{r.slug || "no slug"}</div></div>) },
    { key: "key", header: "Legacy key", render: (r) => <span className="rp-mono">{r.matched ? r.legacyKey : "—"}</span> },
    { key: "stock", header: "Units", numeric: true, render: (r) => r.stock },
    { key: "status", header: "Status", render: (r) => <StatusBadge tone={r.matched ? "success" : "warning"}>{r.matched ? "Synced" : "No match"}</StatusBadge> },
  ];

  return (
    <SectionCard title="Inventory sync" description="Reconcile stock levels with the legacy inventory system."
      actions={
        <PrimaryButton onClick={() => setConfirming(true)} disabled={syncing}>{syncing ? "Syncing…" : "Sync inventory"}</PrimaryButton>
      }>
      <p className="rp-hint" style={{ margin: "0 0 16px" }}>
        Last sync: <span className="rp-mono">{fmtTime(lastSyncTime)}</span>. Books are matched by slug and normalized title, so a book's slug must equal its legacy inventory key.
      </p>
      <div className="rp-card" style={{ padding: 16, boxShadow: "none", background: "var(--rp-surface-sunken)", display: "flex", flexWrap: "wrap", gap: 24 }}>
        <div><div className="rp-label">Source</div><div className="rp-mono">lyricalmyrical-default-rtdb</div></div>
        <div><div className="rp-label">Destination</div><div className="rp-mono">firestore / public_books</div></div>
      </div>

      {error && (
        <div role="alert" style={{ marginTop: 16, padding: 16, background: "var(--rp-danger-tint)", color: "var(--rp-danger)", border: "2px solid var(--rp-danger)" }}>
          <strong>✕ Sync failed.</strong> {error}
        </div>
      )}

      {result && (
        <div className="rp-stack" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <StatusBadge tone="success">{result.synced} records synced</StatusBadge>
            {result.unmatched > 0 && <StatusBadge tone="warning">{result.unmatched} unmatched</StatusBadge>}
            <StatusBadge>{result.legacyTotal} legacy entries</StatusBadge>
          </div>
          <DataTable caption="Inventory sync results" columns={columns} rows={result.results} rowKey={(r: any) => r.id} />
          {result.unmatched > 0 && (
            <p className="rp-hint" style={{ margin: 0 }}>
              Unmatched books need their slug aligned with a legacy inventory key. Edit the slug in Books, then sync again.
            </p>
          )}
        </div>
      )}

      {!result && !error && !syncing && (
        <div style={{ marginTop: 16 }}>
          <div className="rp-label" style={{ marginBottom: 8 }}>Known legacy keys</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["altrove", "hound", "archaeology", "sistema", "nobody", "collective", "Subverso meme"].map((k) => <StatusBadge key={k}>{k}</StatusBadge>)}
          </div>
        </div>
      )}

      <ConfirmDialog open={confirming} title="Sync inventory now?" confirmLabel="Sync inventory"
        message="This overwrites the stock level of every matched book with the legacy system's value. Unmatched books are left unchanged."
        onConfirm={handleSync} onCancel={() => setConfirming(false)} />
    </SectionCard>
  );
}

export function SectionHeader({ title, subtitle, icon: Icon, color = "violet" }: any) {
  const tone: any = { violet: "var(--rp-primary)", cyan: "var(--rp-info)", emerald: "var(--rp-success)", amber: "var(--rp-warning)", rose: "var(--rp-danger)" };
  return (
    <div className="flex items-center gap-4">
      <div aria-hidden="true" style={{ width: 44, height: 44, display: "grid", placeItems: "center", flexShrink: 0, background: "#fff", border: "2px solid #100f0d", color: tone[color] || tone.violet, boxShadow: "2px 2px 0 rgba(16,15,13,.18)" }}>
        {Icon && <Icon size={20} />}
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.05, textTransform: "uppercase" }}>{title}</h3>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#5f5950", fontWeight: 600 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

export function InputField({ label, icon: Icon, value, onChange, placeholder, type = "text", className = "", hint, error }: any) {
  const id = useId();
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label htmlFor={id} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#5f5950" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {Icon && <Icon size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#5f5950", pointerEvents: "none" }} />}
        <input id={id} type={type} value={value} placeholder={placeholder} onChange={onChange}
          aria-invalid={error ? true : undefined} aria-describedby={hint || error ? `${id}-d` : undefined}
          style={{ width: "100%", minHeight: 44, padding: Icon ? "10px 12px 10px 38px" : "10px 12px", fontSize: 13 }} />
      </div>
      {(hint || error) && <span id={`${id}-d`} role={error ? "alert" : undefined} style={{ fontSize: 11, color: error ? "#b4271a" : "#5f5950" }}>{error || hint}</span>}
    </div>
  );
}

export function Switch({ checked, onChange, label = "Toggle setting" }: { checked: boolean; onChange: (val: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} onClick={() => onChange(!checked)}
      className="rp-toggle-track" style={{ borderRadius: 0, background: checked ? "#e8402a" : "#e4dac5" }} />
  );
}

/** Write-only field for secrets: never echoes the stored value back into the page. */
// Write-only key box. Every edit is passed up (clearing the box cancels the change),
// a key that fails `validate` is never passed up, and a stored key can be removed.
export function SecretField({ label, placeholder, stored, onCommit, validate, onRemove, removing }: {
  label: string; placeholder: string; stored: boolean; onCommit: (v: string) => void;
  validate?: (v: string) => string; onRemove?: () => void; removing?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const problem = validate ? validate(draft) : "";
  return (
    <div>
      <InputField label={label} icon={Lock} type="password" value={draft} placeholder={stored ? "Stored — enter a new key to replace it" : placeholder}
        error={problem || undefined}
        hint={!problem && stored ? "✓ A key is stored. It is never shown here." : undefined}
        onChange={(e: any) => {
          const value = e.target.value;
          setDraft(value);
          const trimmed = value.trim();
          onCommit(validate && validate(trimmed) ? "" : trimmed);
        }} />
      {stored && onRemove && (
        <button type="button" className="rp-btn rp-btn-ghost rp-btn-sm" style={{ marginTop: 6 }} disabled={removing} onClick={onRemove}>
          {removing ? "Removing…" : "Remove stored key"}
        </button>
      )}
    </div>
  );
}

const AlertCircle = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
