import { useState, useEffect } from "react";
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
import { motion, AnimatePresence } from "motion/react";
import { ThemeEditor } from "./ThemeEditor";
import { PagesManager } from "./PagesManager";
import { NotificationEditor } from "./NotificationEditor";
import { COUNTRIES, CONTINENTS, describeZoneGeography } from "../features/site/shippingZones";

const PURPLE = "#A855F7";

export function ShopSettings({ 
  activeTab, 
  setActiveTab, 
  settings, 
  setSettings, 
  originalSettings, 
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

  const handleSaveSection = async (section: string, data: any, options: any = {}) => {
    setSavingSection(section);
    await saveSection(section, data, options);
    setSavingSection(null);
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

  // Pages tab — renders inline (same width as other settings)
  if (activeTab === "pages") {
    return (
      <div className="max-w-5xl mx-auto pb-32">
        <PagesManager />
      </div>
    );
  }

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
          {activeTab === "general" && <GeneralSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={handleSaveSection} savingSection={savingSection} />}
          {activeTab === "communications" && <CommunicationsSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={handleSaveSection} savingSection={savingSection} />}
          {activeTab === "shipping" && <ShippingSettings profiles={shippingProfiles} refreshProfiles={loadShippingProfiles} />}
          {activeTab === "payments" && <PaymentsSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={handleSaveSection} savingSection={savingSection} />}
          {activeTab === "taxes" && <TaxesSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={handleSaveSection} savingSection={savingSection} />}
          {activeTab === "notifications" && <NotificationEditor />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
function GeneralSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
  return (
    <div className="space-y-16">
      <header className="flex flex-col gap-2 mb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">General Settings</h2>
            <p className="text-xs text-slate-400 tracking-[0.3em] uppercase mt-4 font-bold">Store Profile & Identity</p>
          </div>
          {hasChanges('general') && (
            <button
              onClick={() => saveSection('general', { general: settings.general })}
              disabled={savingSection === 'general'}
              className="bg-violet-600 text-white px-12 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-violet-600/40 hover:bg-violet-500 transition-all disabled:opacity-50 active:scale-95 border border-violet-400/20"
            >
              {savingSection === 'general' ? 'SYNCHRONIZING...' : 'PUBLISH CHANGES'}
            </button>
          )}
        </div>
      </header>
      
      {/* Maintenance Mode */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.05] to-transparent pointer-events-none" />
        <div className="flex justify-between items-start gap-12 relative z-10">
           <div className="flex-1 space-y-6">
              <SectionHeader 
                title="Maintenance Mode" 
                subtitle="Offline Mode" 
                icon={Lock} 
                color="amber" 
              />
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl font-medium">
                 Temporarily disable the checkout while making updates to the storefront.
                 <span className="text-amber-400/80 ml-2 font-black uppercase tracking-widest text-[9px]">Customers will see a maintenance message.</span>
              </p>
              
              <AnimatePresence>
                {settings.maintenance?.enabled && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-4 overflow-hidden"
                  >
                    <InputField 
                      label="TRANSMISSION OVERRIDE MESSAGE"
                      value={settings.maintenance?.message || ""}
                      placeholder="We are updating our archive. Please check back soon."
                      onChange={(e: any) => setSettings({...settings, maintenance: {...settings.maintenance, message: e.target.value}})}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
           <Switch 
             checked={settings.maintenance?.enabled} 
             onChange={(val) => setSettings({...settings, maintenance: {...settings.maintenance, enabled: val}})} 
           />
        </div>
        
        {hasChanges('maintenance') && (
           <div className="mt-12 pt-10 border-t border-white/5 flex gap-4 relative z-10">
              <button 
                onClick={() => saveSection('maintenance', { maintenance: settings.maintenance })}
                disabled={savingSection === 'maintenance'}
                className="bg-amber-500 text-black px-12 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-amber-500/20"
              >
                {savingSection === 'maintenance' ? 'SYNCHRONIZING...' : 'UPDATE PROTOCOL'}
              </button>
           </div>
        )}
      </section>

      {/* Shop Domain */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.03] to-transparent pointer-events-none" />
        <div className="flex justify-between items-center relative z-10">
           <SectionHeader 
             title="Digital Presence" 
             subtitle="Domain & Visibility" 
             icon={Globe} 
             color="cyan" 
           />
           {hasChanges('domain') && (
             <button 
               onClick={() => saveSection('domain', { domain: settings.domain })}
               disabled={savingSection === 'domain'}
               className="bg-violet-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-violet-600/30 hover:bg-violet-500 transition-all border border-violet-400/20"
             >
               {savingSection === 'domain' ? 'DEPLOYING...' : 'SAVE DOMAINS'}
             </button>
           )}
        </div>

        <div className="relative z-10">
           <InputField 
             label="CUSTOM DOMAIN (URL)" 
             icon={Globe}
             value={settings.domain?.custom || ""}
             placeholder="www.yourdomain.com"
             onChange={(e: any) => setSettings({...settings, domain: {...settings.domain, custom: e.target.value}})}
           />
           <AnimatePresence>
             {settings.domain?.custom && (
               <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[10px] text-cyan-400/70 font-black mt-6 flex items-center gap-3 uppercase tracking-[0.2em] ml-2"
               >
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                 Live Link Established: {settings.domain.custom}
               </motion.p>
             )}
           </AnimatePresence>
        </div>
      </section>

      {/* Shop Info */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/[0.03] to-transparent pointer-events-none" />
         <div className="flex justify-between items-center relative z-10">
            <SectionHeader 
              title="Publisher Identity" 
              subtitle="Brand Essence & Story" 
              icon={Building} 
            />
            {hasChanges('info') && (
              <button 
                onClick={() => saveSection('info', { info: settings.info })}
                disabled={savingSection === 'info'}
                className="bg-violet-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-violet-600/30 hover:bg-violet-500 transition-all border border-violet-400/20"
              >
                 {savingSection === 'info' ? 'COMMITTING...' : 'SAVE DATA'}
              </button>
            )}
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-2">
               <InputField 
                 label="PUBLISHER NAME"
                 value={settings.info?.name || ""}
                 onChange={(e: any) => setSettings({...settings, info: {...settings.info, name: e.target.value}})}
               />
               <p className="text-[9px] text-slate-600 font-black tracking-[0.3em] text-right uppercase px-2">{settings.info?.name?.length || 0} / 100 BYTES</p>
            </div>
            <div className="space-y-2">
               <InputField 
                 label="CONTACT EMAIL"
                 icon={Mail}
                 value={settings.info?.email || ""}
                 placeholder="hello@lyricalmyricalbooks.com"
                 onChange={(e: any) => setSettings({...settings, info: {...settings.info, email: e.target.value}})}
               />
            </div>
            <div className="md:col-span-2 space-y-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">PUBLISHER DESCRIPTION</label>
               <textarea 
                 rows={5}
                 className="w-full bg-white/[0.03] border border-white/10 rounded-[2.5rem] px-10 py-8 text-sm text-white outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all resize-none leading-relaxed font-medium shadow-inner"
                 value={settings.info?.description || ""}
                 onChange={e => setSettings({...settings, info: {...settings.info, description: e.target.value}})}
               />
               <p className="text-[9px] text-slate-600 font-black tracking-[0.3em] text-right uppercase px-2">{settings.info?.description?.length || 0} / 150 BYTES</p>
            </div>
         </div>
      </section>

      {/* Location */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-bl from-cyan-500/[0.03] to-transparent pointer-events-none" />
         <div className="flex justify-between items-center relative z-10">
            <SectionHeader 
              title="Headquarters" 
              subtitle="Main Office & Shipping Origin" 
              icon={Building} 
              color="cyan"
            />
            {hasChanges('location') && (
              <button 
                onClick={() => saveSection('location', { location: settings.location })}
                disabled={savingSection === 'location'}
                className="bg-violet-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-violet-600/30 hover:bg-violet-500 transition-all border border-violet-400/20"
              >
                 {savingSection === 'location' ? 'MAPPING...' : 'SAVE LOCATION'}
              </button>
            )}
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
            <div className="md:col-span-2">
               <InputField 
                 label="STREET ADDRESS"
                 icon={Building}
                 value={settings.location?.street || ""}
                 placeholder="456 Montrose Avenue"
                 onChange={(e: any) => setSettings({...settings, location: {...settings.location, street: e.target.value}})}
               />
            </div>
            <div>
               <InputField 
                 label="CITY"
                 value={settings.location?.city || ""} 
                 placeholder="Toronto"
                 onChange={(e: any) => setSettings({...settings, location: {...settings.location, city: e.target.value}})}
               />
            </div>
            <div>
               <InputField 
                 label="STATE / PROVINCE"
                 value={settings.location?.state || ""} 
                 placeholder="Ontario"
                 onChange={(e: any) => setSettings({...settings, location: {...settings.location, state: e.target.value}})}
               />
            </div>
         </div>
      </section>

      {/* Inventory Sync */}
      <InventorySync lastSync={settings.inventory?.lastSync} />
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
          <InputField 
            label="RESEND API KEY" 
            placeholder="re_..."
            type="password"
            value={comms.resendApiKey || ""}
            onChange={(e: any) => updateComms({ resendApiKey: e.target.value })}
          />
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
}const COUNTRIES_LIST = [
  "Canada", "United States", "United Kingdom", "Rest of World",
  "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belgium", "Bermuda", "Bolivia", "Bosnia", "Brazil", "Bulgaria",
  "Cambodia", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Dominican Republic", "Ecuador", "Egypt", "Estonia", "Finland", "France", "Georgia", "Germany", "Greece",
  "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan",
  "Kenya", "Kuwait", "Latvia", "Lebanon", "Liechtenstein", "Lithuania", "Luxembourg", "Malaysia", "Malta", "Mexico", "Monaco", "Montenegro", "Morocco",
  "Netherlands", "New Zealand", "Norway", "Oman", "Pakistan", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Saudi Arabia", "Serbia", "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland",
  "Taiwan", "Thailand", "Trinidad and Tobago", "Tunisia", "Turkey", "Ukraine", "United Arab Emirates", "Uruguay", "Venezuela", "Vietnam"
];

const REGIONAL_PRESETS: Record<string, string[]> = {
  "North America": ["Canada", "United States", "Mexico"],
  "Europe": ["United Kingdom", "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Monaco", "Netherlands", "Norway", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Turkey", "Ukraine"],
  "Asia/Pacific": ["Australia", "New Zealand", "China", "Hong Kong", "India", "Indonesia", "Japan", "Malaysia", "Philippines", "Singapore", "South Korea", "Taiwan", "Thailand", "Vietnam"]
};

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

function ShippingSettings({ profiles, refreshProfiles }: any) {
  const [books, setBooks] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  
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
      const b = await adminApi.getBooks(200);
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
      alert("Error creating shipping profile");
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (id === "general-profile") {
      alert("Cannot delete the General Shipping Profile.");
      return;
    }
    if (!confirm("Are you sure you want to delete this profile? All assigned products will revert to the General Profile.")) return;
    try {
      await adminApi.deleteShippingProfile(id);
      refreshProfiles();
      setSelectedProfileId(null);
      setEditingProfile(null);
    } catch {
      alert("Error deleting shipping profile");
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
      alert("Error saving shipping profile");
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
      await adminApi.assignProductsToShippingProfile(editingProfile.id, selectedProductIds);
      await loadBooks();
      refreshProfiles();
      setIsProductModalOpen(false);
    } catch {
      alert("Error updating product assignments");
    }
  };

  // Zones helper
  const openZoneModal = (zone: any = null) => {
    if (zone) {
      setActiveZone(JSON.parse(JSON.stringify(zone)));
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
    if (!activeZone.name.trim() || activeZone.countries.length === 0) {
      alert("Please enter a zone name and select at least one country.");
      return;
    }

    setEditingProfile((prev: any) => {
      const zones = [...(prev.zones || [])];
      const idx = zones.findIndex(z => z.id === activeZone.id);
      if (idx > -1) {
        zones[idx] = activeZone;
      } else {
        zones.push(activeZone);
      }
      return { ...prev, zones };
    });
    setIsZoneModalOpen(false);
  };

  const handleDeleteZone = (zoneId: string) => {
    if (!confirm("Are you sure you want to delete this zone?")) return;
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
        minPrice: null,
        maxPrice: null
      });
    }
    setIsRateModalOpen(true);
  };

  const handleSaveRate = () => {
    if (!activeRate.name.trim()) {
      alert("Please enter a shipping rate name.");
      return;
    }

    setEditingProfile((prev: any) => {
      const zones = [...(prev.zones || [])];
      const zoneIdx = zones.findIndex(z => z.id === parentZoneIdForRate);
      if (zoneIdx === -1) return prev;

      const zone = { ...zones[zoneIdx] };
      const rates = [...(zone.rates || [])];
      const rateIdx = rates.findIndex(r => r.id === activeRate.id);

      if (rateIdx > -1) {
        rates[rateIdx] = {
          ...activeRate,
          base: Number(activeRate.base) || 0,
          additional: Number(activeRate.additional) || 0,
          minPrice: activeRate.minPrice !== "" && activeRate.minPrice !== null ? Number(activeRate.minPrice) : null
        };
      } else {
        rates.push({
          ...activeRate,
          base: Number(activeRate.base) || 0,
          additional: Number(activeRate.additional) || 0,
          minPrice: activeRate.minPrice !== "" && activeRate.minPrice !== null ? Number(activeRate.minPrice) : null
        });
      }

      zone.rates = rates;
      zones[zoneIdx] = zone;
      return { ...prev, zones };
    });
    setIsRateModalOpen(false);
  };

  const handleDeleteRate = (zoneId: string, rateId: string) => {
    if (!confirm("Are you sure you want to delete this shipping rate?")) return;
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

  const getAssignedProducts = (profileId: string) => {
    return books.filter((b: any) => b.shippingProfileId === profileId);
  };

  // Render Dashboard Profiles List
  if (selectedProfileId === null || !editingProfile) {
    return (
      <div className="space-y-12">
        <header className="flex flex-col gap-2 mb-12">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Shipping Matrix</h2>
              <p className="text-xs text-slate-400 tracking-[0.3em] uppercase mt-4 font-bold">Manage shipping profiles, zones & rates</p>
            </div>
            {!isCreatingProfile && (
              <button 
                onClick={() => setIsCreatingProfile(true)}
                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-8 py-3.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shadow-violet-500/10"
              >
                <Plus size={14} /> CREATE PROFILE
              </button>
            )}
          </div>
        </header>

        <section className="glass-card rounded-[3rem] p-8 md:p-10 border border-white/5 bg-white/[0.01] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.05] to-transparent pointer-events-none" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                <KeyRound size={20} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-black uppercase italic text-white">Shippo Connection</h3>
                  {!shippoLoading && (
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border ${shippoConfig?.configured ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                      {shippoConfig?.configured ? "Connected" : "Not configured"}
                    </span>
                  )}
                </div>
                <p className="text-[10px] leading-5 text-slate-500 uppercase tracking-widest mt-2 max-w-md">
                  Save your key to the protected Firebase backend. The full key is never loaded back into this dashboard.
                </p>
              </div>
              {shippoConfig?.configured && (
                <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    Active key ending in ••••{shippoConfig.lastFour}
                    {shippoConfig.source === "environment" && " (Firebase secret)"}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Enable Dynamic Shippo Rates</p>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest">Fetch live carrier rates during checkout</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={shippoConfig?.dynamicRatesEnabled ?? false}
                      onChange={async (e) => {
                        const enabled = e.target.checked;
                        try {
                          await adminApi.setShippoDynamicRates(enabled);
                          setShippoConfig((prev: any) => ({ ...prev, dynamicRatesEnabled: enabled }));
                          toast.success(enabled ? "Dynamic shipping rates enabled" : "Dynamic shipping rates disabled");
                        } catch (err: any) {
                          toast.error(err.message || "Failed to update Shippo settings");
                        }
                      }}
                      className="w-6 h-6 rounded-lg bg-white border-slate-300 dark:border-zinc-800 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label htmlFor="shippo-api-key" className="text-[9px] font-black tracking-[0.25em] text-slate-500 uppercase px-2">
                Shippo API Key
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    id="shippo-api-key"
                    type={showShippoApiKey ? "text" : "password"}
                    value={shippoApiKey}
                    onChange={(event) => {
                      setShippoApiKey(event.target.value);
                      if (shippoMessage) setShippoMessage(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSaveShippoApiKey();
                    }}
                    autoComplete="new-password"
                    spellCheck={false}
                    placeholder={shippoConfig?.configured ? "Paste a new key to replace the current one" : "Paste your Shippo API key"}
                    className="w-full h-12 rounded-full border border-white/10 bg-black/20 pl-5 pr-12 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowShippoApiKey(value => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    aria-label={showShippoApiKey ? "Hide API key" : "Show API key"}
                  >
                    {showShippoApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveShippoApiKey}
                  disabled={shippoSaving || !shippoApiKey.trim()}
                  className="h-12 px-7 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  {shippoSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  {shippoSaving ? "SYNCING" : "SAVE & SYNC"}
                </button>
              </div>
              {shippoMessage && (
                <p className={`flex items-center gap-2 px-2 text-[10px] font-bold ${shippoMessage.type === "success" ? "text-emerald-400" : "text-red-400"}`} role="status">
                  {shippoMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircleIcon size={14} />}
                  {shippoMessage.text}
                </p>
              )}
            </div>
          </div>
        </section>

        {isCreatingProfile && (
          <section className="bg-white dark:bg-zinc-900 border border-[#EBEAEF] dark:border-zinc-800 rounded-[2.5rem] p-10 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/20 text-[#7C3AED] flex items-center justify-center">
                <Package size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase italic leading-none text-white">New Shipping Profile</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1.5">Define a set of rules for custom items</p>
              </div>
            </div>
            <div className="space-y-4">
              <InputField 
                label="PROFILE NAME"
                value={newProfileName}
                placeholder="e.g. Heavy Items, Fragile Prints..."
                onChange={(e: any) => setNewProfileName(e.target.value)}
              />
            </div>
            <div className="flex gap-4 pt-2">
              <button 
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim()}
                className="bg-violet-600 text-white px-10 py-3.5 rounded-full text-[10px] font-black tracking-widest hover:bg-violet-500 transition-all disabled:opacity-50"
              >
                CREATE PROFILE
              </button>
              <button 
                onClick={() => { setIsCreatingProfile(false); setNewProfileName(""); }}
                className="bg-slate-100 text-slate-700 px-10 py-3.5 rounded-full text-[10px] font-black tracking-widest hover:bg-slate-200 transition-all"
              >
                CANCEL
              </button>
            </div>
          </section>
        )}

        <div className="space-y-6">
          {profiles.map((p: any) => {
            const assignedBooks = getAssignedProducts(p.id);
            const zonesCount = p.zones?.length || 0;
            return (
              <div 
                key={p.id} 
                className="glass-card rounded-[3rem] p-10 border border-white/5 relative overflow-hidden group hover:border-violet-500/20 transition-all flex justify-between items-center bg-white/[0.01]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.02] to-transparent pointer-events-none" />
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-black tracking-tight text-white uppercase italic">{p.name || "Untitled Profile"}</h3>
                    {p.id === "general-profile" && (
                      <span className="bg-violet-500/10 border border-violet-500/20 text-violet-400 px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase">DEFAULT</span>
                    )}
                  </div>
                  <div className="flex items-center gap-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                      <Globe size={12} className="text-slate-600" /> {zonesCount} Zones
                    </span>
                    <span className="flex items-center gap-2">
                      <Package size={12} className="text-slate-600" /> {assignedBooks.length} Products Assigned
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <button 
                    onClick={() => handleSelectProfile(p)}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 px-8 py-3.5 rounded-full text-[10px] font-black tracking-widest transition-all"
                  >
                    MANAGE RATES
                  </button>
                  {p.id !== "general-profile" && (
                    <button 
                      onClick={() => handleDeleteProfile(p.id)}
                      aria-label="Delete shipping profile"
                      className="p-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all border border-red-500/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render Profile Details Editor
  const assignedBooks = getAssignedProducts(editingProfile.id);
  
  return (
    <div className="space-y-12">
      {/* Editor Header */}
      <header className="flex flex-col gap-2 mb-12">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => { setSelectedProfileId(null); setEditingProfile(null); }}
            className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-white/40 hover:text-white transition-colors uppercase cursor-pointer"
          >
            <ArrowLeft size={16} /> BACK TO MATRIX
          </button>
          
          <div className="flex gap-4">
            <button 
              onClick={handleSaveProfile}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-10 py-3.5 rounded-full text-[10px] font-black tracking-widest transition-all active:scale-95 shadow-md shadow-violet-500/10"
            >
              SAVE PROFILE Changes
            </button>
          </div>
        </div>
        <div className="flex justify-between items-end mt-4">
          <div>
            <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">{editingProfile.name}</h2>
            <p className="text-xs text-slate-400 tracking-[0.3em] uppercase mt-4 font-bold">Fulfillment Profile Config</p>
          </div>
        </div>
      </header>

      {/* Profile Name (Custom Profiles only) */}
      {editingProfile.id !== "general-profile" && (
        <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-6 bg-white/[0.01]">
          <InputField 
            label="PROFILE NAME"
            value={editingProfile.name}
            onChange={(e: any) => setEditingProfile({ ...editingProfile, name: e.target.value })}
          />
        </section>
      )}

      {/* Product Assignments */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-8 bg-white/[0.01]">
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
          <SectionHeader 
            title="Assigned Catalog Products" 
            subtitle="Books associated with these rates" 
            icon={Package} 
            color="violet"
          />
          <button 
            onClick={openProductModal}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-3.5 rounded-full text-[10px] font-black tracking-widest transition-all"
          >
            MANAGE PRODUCTS ({assignedBooks.length})
          </button>
        </div>

        {assignedBooks.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem] gap-3 bg-white/[0.01]">
            <Package size={18} className="text-slate-650" />
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">No books assigned to this profile</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {assignedBooks.slice(0, 6).map((b: any) => (
              <div key={b.id} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="w-10 aspect-[3/4] bg-black rounded-lg overflow-hidden border border-white/10 shrink-0">
                  {b.photos?.[0]?.url && <img src={b.photos[0].url} className="w-full h-full object-cover" />}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black text-white truncate uppercase tracking-wider">{b.title}</p>
                  <p className="text-[8px] text-slate-500 mt-1 truncate font-mono">{b.subtitle || "Single edition"}</p>
                </div>
              </div>
            ))}
            {assignedBooks.length > 6 && (
              <div className="flex items-center justify-center p-4 bg-white/[0.02] border border-dashed border-white/5 rounded-2xl text-[9px] font-black text-slate-500 tracking-widest uppercase">
                + {assignedBooks.length - 6} More Books
              </div>
            )}
          </div>
        )}
      </section>

      {/* Shipping Zones */}
      <section className="space-y-8">
        <div className="flex justify-between items-center">
          <SectionHeader 
            title="Geographic Shipping Zones" 
            subtitle="Regional rates & targets" 
            icon={Globe} 
            color="cyan"
          />
          <button 
            onClick={() => openZoneModal()}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-cyan-600/10"
          >
            <Plus size={14} /> ADD SHIPPING ZONE
          </button>
        </div>

        {(!editingProfile.zones || editingProfile.zones.length === 0) ? (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] gap-4 bg-white/[0.01]">
            <Globe size={32} className="text-slate-650" />
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Zero active shipping zones configured</p>
          </div>
        ) : (
          <div className="space-y-8">
            {editingProfile.zones.map((z: any) => (
              <div key={z.id} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/[0.01] to-transparent pointer-events-none" />
                
                {/* Zone Header */}
                <div className="flex justify-between items-start border-b border-white/5 pb-6">
                  <div>
                    <h4 className="text-xl font-black text-white uppercase italic tracking-tight">{z.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-3 max-w-2xl">
                      {z.countries.map((c: string) => (
                        <span key={c} className="bg-white/5 border border-white/10 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black tracking-wider uppercase">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => openZoneModal(z)}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full text-[9px] font-black tracking-widest uppercase transition-all"
                    >
                      EDIT ZONE
                    </button>
                    <button 
                      onClick={() => handleDeleteZone(z.id)}
                      aria-label="Delete shipping zone"
                      className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-full transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Zone Rates */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Shipping rates for this zone</h5>
                    <button 
                      onClick={() => openRateModal(z.id)}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-2 rounded-full text-[9px] font-black tracking-widest transition-all"
                    >
                      + ADD RATE
                    </button>
                  </div>

                  {(!z.rates || z.rates.length === 0) ? (
                    <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl text-[9px] font-black text-slate-600 uppercase tracking-widest">
                      No rates configured. This zone will not have active shipping.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {z.rates.map((r: any) => (
                        <div key={r.id} className="bg-white/[0.01] border border-white/5 hover:border-violet-500/20 rounded-[2rem] p-6 flex justify-between items-start transition-all">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-black text-white uppercase tracking-wider">{r.name}</p>
                              <p className="text-[9px] text-slate-500 font-black tracking-widest uppercase mt-1">Delivery: {r.deliveryDays || "3-7"} Days</p>
                            </div>
                            <div className="flex gap-6 pt-3 border-t border-white/5">
                              <div>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Base Rate</p>
                                <p className="text-xl font-black text-white font-mono mt-1">${Number(r.base).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Add. Item</p>
                                <p className="text-xl font-black text-white font-mono mt-1">+${Number(r.additional).toFixed(2)}</p>
                              </div>
                              {r.minPrice !== null && r.minPrice !== undefined && (
                                <div>
                                  <p className="text-[8px] text-emerald-400/70 font-bold uppercase tracking-widest">Min Spend</p>
                                  <p className="text-xl font-black text-emerald-400 font-mono mt-1">${Number(r.minPrice).toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={() => openRateModal(z.id, r)}
                              aria-label="Edit shipping rate"
                              className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all"
                            >
                              <Edit size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeleteRate(z.id, r.id)}
                              aria-label="Delete shipping rate"
                              className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- MODAL 1: PRODUCT SELECTION --- */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-2xl rounded-[3rem] p-10 border border-white/10 relative overflow-hidden bg-[#07060E] max-h-[85vh] flex flex-col"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent pointer-events-none" />
              <div className="flex justify-between items-start pb-6 border-b border-white/5 relative z-10 shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic leading-none">Manage Products</h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-2 font-bold">Select books to assign to: {editingProfile.name}</p>
                </div>
                <button 
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-full border border-white/10 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search */}
              <div className="py-6 relative z-10 shrink-0">
                <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 shadow-inner">
                  <Search size={16} className="text-slate-650" />
                  <input 
                    type="text"
                    placeholder="Search catalog by title..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-600 flex-1 font-semibold"
                  />
                </div>
              </div>

              {/* Books List (scrollable) */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar relative z-10 py-2">
                {books
                  .filter(b => b.title.toLowerCase().includes(productSearch.toLowerCase()))
                  .map(b => {
                    const isChecked = selectedProductIds.includes(b.id);
                    const isOtherProfile = b.shippingProfileId && b.shippingProfileId !== editingProfile.id;
                    const otherProfileName = isOtherProfile 
                      ? (profiles.find((p: any) => p.id === b.shippingProfileId)?.name || "Other Profile")
                      : "";
                    
                    return (
                      <div 
                        key={b.id} 
                        onClick={() => {
                          setSelectedProductIds(prev => 
                            isChecked ? prev.filter(id => id !== b.id) : [...prev, b.id]
                          );
                        }}
                        className={`flex items-center justify-between p-4 bg-white/[0.02] border rounded-2xl cursor-pointer hover:border-violet-500/20 transition-all ${
                          isChecked ? "border-violet-500 bg-violet-500/[0.02]" : "border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isChecked ? "border-violet-500 bg-violet-600 text-white" : "border-white/20"
                          }`}>
                            {isChecked && <Check size={12} />}
                          </div>
                          <div className="w-10 aspect-[3/4] bg-black rounded-lg overflow-hidden border border-white/10 shrink-0">
                            {b.photos?.[0]?.url && <img src={b.photos[0].url} className="w-full h-full object-cover" />}
                          </div>
                          <div className="text-left overflow-hidden">
                            <p className="text-xs font-black text-white truncate uppercase tracking-wider">{b.title}</p>
                            {isOtherProfile ? (
                              <p className="text-[8px] text-amber-500 font-bold uppercase tracking-widest mt-1">
                                Currently assigned to: {otherProfileName}
                              </p>
                            ) : (
                              <p className="text-[8px] text-slate-500 mt-1 truncate font-mono">{b.subtitle || "Single edition"}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Actions */}
              <div className="pt-6 border-t border-white/5 flex gap-4 mt-6 relative z-10 shrink-0">
                <button 
                  onClick={handleSaveProducts}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-10 py-3.5 rounded-full text-[10px] font-black tracking-widest flex-1 transition-all"
                >
                  SAVE PRODUCT ASSIGNMENTS
                </button>
                <button 
                  onClick={() => setIsProductModalOpen(false)}
                  className="bg-slate-100 text-slate-700 px-8 py-3.5 rounded-full text-[10px] font-black tracking-widest transition-all"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: ZONE CONFIGURATION --- */}
      <AnimatePresence>
        {isZoneModalOpen && activeZone && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-2xl rounded-[3rem] p-10 border border-white/10 relative overflow-hidden bg-[#07060E] max-h-[85vh] flex flex-col"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none" />
              <div className="flex justify-between items-start pb-6 border-b border-white/5 relative z-10 shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic leading-none">Shipping Zone Config</h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-2 font-bold">Group countries/regions for unified shipping rules</p>
                </div>
                <button 
                  onClick={() => setIsZoneModalOpen(false)}
                  className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-full border border-white/10 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Zone Name input */}
              <div className="py-6 space-y-4 relative z-10 shrink-0">
                <InputField 
                  label="ZONE NAME"
                  value={activeZone.name}
                  placeholder="e.g. North America, Europe, Domestic..."
                  onChange={(e: any) => setActiveZone({ ...activeZone, name: e.target.value })}
                />
              </div>

              {/* Region Presets */}
              <div className="pb-4 relative z-10 shrink-0 flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block ml-1 mb-2">Regional Presets</label>
                <div className="flex flex-wrap gap-3">
                  {Object.keys(REGIONAL_PRESETS).map(regionName => (
                    <button 
                      key={regionName}
                      type="button"
                      onClick={() => {
                        const countries = REGIONAL_PRESETS[regionName];
                        setActiveZone((prev: any) => {
                          const union = Array.from(new Set([...prev.countries, ...countries]));
                          return { ...prev, countries: union };
                        });
                      }}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/15 px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all"
                    >
                      + SELECT {regionName}
                    </button>
                  ))}
                  <button 
                    type="button"
                    onClick={() => setActiveZone((prev: any) => ({ ...prev, countries: [] }))}
                    className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/15 px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all"
                  >
                    CLEAR SELECTION
                  </button>
                </div>
              </div>

              {/* Search Countries */}
              <div className="pb-4 relative z-10 shrink-0">
                <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 shadow-inner">
                  <Search size={16} className="text-slate-650" />
                  <input 
                    type="text"
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-600 flex-1 font-semibold"
                  />
                </div>
              </div>

              {/* Countries Checkbox List */}
              <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pr-2 custom-scrollbar relative z-10 py-2">
                {COUNTRIES_LIST
                  .filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
                  .map(c => {
                    const isChecked = activeZone.countries.includes(c);
                    return (
                      <div 
                        key={c}
                        onClick={() => {
                          setActiveZone((prev: any) => {
                            const countries = isChecked 
                              ? prev.countries.filter((x: string) => x !== c)
                              : [...prev.countries, c];
                            return { ...prev, countries };
                          });
                        }}
                        className={`flex items-center gap-3 p-3 bg-white/[0.01] border rounded-xl cursor-pointer hover:border-cyan-500/20 transition-all ${
                          isChecked ? "border-cyan-500 bg-cyan-500/[0.02]" : "border-white/5"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isChecked ? "border-cyan-500 bg-cyan-600 text-white" : "border-white/20"
                        }`}>
                          {isChecked && <Check size={10} />}
                        </div>
                        <span className="text-xs font-semibold text-white/85 uppercase tracking-wide">{c}</span>
                      </div>
                    );
                  })}
              </div>

              {/* Actions */}
              <div className="pt-6 border-t border-white/5 flex gap-4 mt-6 relative z-10 shrink-0">
                <button 
                  onClick={handleSaveZone}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-10 py-3.5 rounded-full text-[10px] font-black tracking-widest flex-1 transition-all"
                >
                  SAVE ZONE CONFIG
                </button>
                <button 
                  onClick={() => setIsZoneModalOpen(false)}
                  className="bg-slate-100 text-slate-700 px-8 py-3.5 rounded-full text-[10px] font-black tracking-widest transition-all"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: RATE CONFIGURATION --- */}
      <AnimatePresence>
        {isRateModalOpen && activeRate && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-2xl rounded-[3rem] p-10 border border-white/10 relative overflow-hidden bg-[#07060E] max-h-[85vh] flex flex-col"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
              
              <div className="flex justify-between items-start pb-6 border-b border-white/5 relative z-10 shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic leading-none">Rate Setting Protocol</h3>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-2 font-bold">Configure shipping speed and hybrid item prices</p>
                </div>
                <button 
                  onClick={() => setIsRateModalOpen(false)}
                  className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-full border border-white/10 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Rate Editor Form (scrollable) */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar relative z-10 py-6">
                
                <InputField 
                  label="RATE / SERVICE NAME"
                  value={activeRate.name}
                  placeholder="e.g. Standard Shipping, Express Delivery, Special Warp..."
                  onChange={(e: any) => setActiveRate({ ...activeRate, name: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">BASE SHIPPING RATE (CAD)</label>
                    <div className="flex items-center gap-6 bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-5 focus-within:border-emerald-500/50 focus-within:bg-white/[0.06] transition-all group shadow-inner">
                      <span className="text-slate-500 font-mono text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="bg-transparent border-none outline-none text-sm text-white flex-1 font-bold font-mono"
                        value={activeRate.base}
                        placeholder="15.00"
                        onChange={(e: any) => setActiveRate({ ...activeRate, base: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">ADDITIONAL ITEM RATE (CAD)</label>
                    <div className="flex items-center gap-6 bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-5 focus-within:border-emerald-500/50 focus-within:bg-white/[0.06] transition-all group shadow-inner">
                      <span className="text-slate-500 font-mono text-sm">+$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="bg-transparent border-none outline-none text-sm text-white flex-1 font-bold font-mono"
                        value={activeRate.additional}
                        placeholder="5.00"
                        onChange={(e: any) => setActiveRate({ ...activeRate, additional: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <InputField 
                  label="ESTIMATED DELIVERY (DAYS)"
                  value={activeRate.deliveryDays}
                  placeholder="e.g. 3-7, 1-2, 5-10"
                  onChange={(e: any) => setActiveRate({ ...activeRate, deliveryDays: e.target.value })}
                />

                {/* Price condition */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider italic">Order Price Condition</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Make rate available only within cart price range (optional)</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">MINIMUM ORDER PRICE threshold (CAD)</label>
                    <div className="flex items-center gap-6 bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-5 focus-within:border-emerald-500/50 focus-within:bg-white/[0.06] transition-all group shadow-inner">
                      <span className="text-slate-500 font-mono text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="bg-transparent border-none outline-none text-sm text-white flex-1 font-bold font-mono"
                        value={activeRate.minPrice !== null && activeRate.minPrice !== undefined ? activeRate.minPrice : ""}
                        placeholder="e.g. 50.00 for free shipping above $50"
                        onChange={(e: any) => {
                          const val = e.target.value;
                          setActiveRate({ ...activeRate, minPrice: val === "" ? null : val });
                        }}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Actions */}
              <div className="pt-6 border-t border-white/5 flex gap-4 mt-6 relative z-10 shrink-0">
                <button 
                  onClick={handleSaveRate}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3.5 rounded-full text-[10px] font-black tracking-widest flex-1 transition-all"
                >
                  SAVE RATE PROTOCOL
                </button>
                <button 
                  onClick={() => setIsRateModalOpen(false)}
                  className="bg-slate-100 text-slate-700 px-8 py-3.5 rounded-full text-[10px] font-black tracking-widest transition-all"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentsSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
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
      alert("Shippo API Token saved and synced successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to save Shippo API Token.");
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
      alert("Please enter a payment method name.");
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

  return (
    <div className="space-y-16">
      <header className="flex flex-col gap-2 mb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Payment Gateways</h2>
            <p className="text-xs text-slate-400 tracking-[0.3em] uppercase mt-4 font-bold">Transaction processing & payment settings</p>
          </div>
          {hasChanges('payments') && (
            <button
              onClick={() => saveSection('payments', { payments: settings.payments })}
              disabled={savingSection === 'payments'}
              className="bg-violet-600 text-white px-12 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-violet-600/40 hover:bg-violet-500 transition-all disabled:opacity-50 border border-violet-400/20"
            >
              {savingSection === 'payments' ? 'SYNCHRONIZING...' : 'SAVE CHANGES'}
            </button>
          )}
        </div>
      </header>

      {/* Global Test Mode Switcher */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 relative overflow-hidden group">
        <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-700 ${
          testMode 
            ? "from-amber-500/[0.05] via-transparent to-transparent" 
            : "from-emerald-500/[0.03] via-transparent to-transparent"
        } pointer-events-none`} />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="flex-1 space-y-4">
            <SectionHeader 
              title="Store Test Mode" 
              subtitle="Environment Settings" 
              icon={ShieldCheck} 
              color={testMode ? "amber" : "emerald"} 
            />
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl font-medium">
              Run transactions in live mode or sandbox (test) mode. In Sandbox mode, Stripe and PayPal will process test charges and orders will be flagged as <span className="text-amber-400 font-bold uppercase tracking-wider">test mode orders</span>.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${testMode ? "text-amber-400" : "text-emerald-400"}`}>
              {testMode ? "Sandbox Active" : "Live Processing Active"}
            </span>
            <Switch 
              checked={testMode} 
              onChange={updateTestMode} 
            />
          </div>
        </div>
      </section>

      {/* Stripe Card */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
            <CreditCard size={200} className="text-violet-500" />
         </div>
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-12">
               <SectionHeader 
                  title="Stripe Integration" 
                  subtitle="Accept credit and debit card payments" 
                  icon={ShieldCheck} 
                  color="violet"
               />
               <button 
                  onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                  className="bg-white/5 border border-white/10 px-8 py-3 rounded-2xl text-[9px] font-black tracking-[0.2em] text-slate-300 hover:bg-white/10 transition-all flex items-center gap-3 uppercase shadow-lg cursor-pointer"
                >
                   STRIPE DASHBOARD <ExternalLink size={14} className="text-violet-400" />
                </button>
            </div>
            
            <div className="flex items-center gap-8 p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 shadow-inner">
               <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Stripe Checkout Status</span>
                  <Switch 
                    checked={stripe.connected} 
                    onChange={(val) => updateStripe({ connected: val })} 
                  />
               </div>
               <div className="flex-1 h-1 bg-white/5 rounded-full relative overflow-hidden">
                  <motion.div 
                    initial={false}
                    animate={{ width: stripe.connected ? '100%' : '0%' }}
                    className="absolute inset-0 bg-gradient-to-r from-violet-500 to-cyan-500"
                  />
               </div>
               <span className={`text-[10px] font-black uppercase tracking-[0.4em] w-24 text-right ${stripe.connected ? 'text-emerald-400' : 'text-slate-600'}`}>
                 {stripe.connected ? 'Active' : 'Inactive'}
               </span>
            </div>

            <AnimatePresence>
               {stripe.connected && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="space-y-12 mt-12"
                  >
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Live Keys */}
                        <div className={`space-y-8 p-8 bg-white/[0.01] border rounded-[2rem] transition-all ${
                          !testMode ? "border-violet-500/20 shadow-lg shadow-violet-500/[0.02]" : "border-white/5 opacity-50"
                        }`}>
                           <h4 className="text-[10px] font-black tracking-[0.25em] text-white uppercase italic">Live Environment Keys</h4>
                           <InputField 
                              label="STRIPE PUBLISHABLE KEY" 
                              placeholder="pk_live_..."
                              icon={Lock}
                              value={stripe.publicKey || ""}
                              onChange={(e: any) => updateStripe({ publicKey: e.target.value })}
                           />
                           <InputField 
                              label="STRIPE SECRET KEY" 
                              placeholder="sk_live_..."
                              icon={ShieldCheck}
                              type="password"
                              value={stripe.secretKey || ""}
                              onChange={(e: any) => updateStripe({ secretKey: e.target.value })}
                           />
                        </div>
                        
                        {/* Test Keys */}
                        <div className={`space-y-8 p-8 bg-white/[0.01] border rounded-[2rem] transition-all ${
                          testMode ? "border-amber-500/20 shadow-lg shadow-amber-500/[0.02]" : "border-white/5 opacity-50"
                        }`}>
                           <h4 className="text-[10px] font-black tracking-[0.25em] text-white uppercase italic">Test (Sandbox) Keys</h4>
                           <InputField 
                              label="STRIPE TEST PUBLISHABLE KEY" 
                              placeholder="pk_test_..."
                              icon={Lock}
                              value={stripe.testPublicKey || ""}
                              onChange={(e: any) => updateStripe({ testPublicKey: e.target.value })}
                           />
                           <InputField 
                              label="STRIPE TEST SECRET KEY" 
                              placeholder="sk_test_..."
                              icon={ShieldCheck}
                              type="password"
                              value={stripe.testSecretKey || ""}
                              onChange={(e: any) => updateStripe({ testSecretKey: e.target.value })}
                           />
                        </div>
                     </div>

                     {/* Wallets */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex justify-between items-center p-10 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:border-violet-500/30 transition-all shadow-inner">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-10 bg-black text-white rounded-xl flex items-center justify-center border border-white/10 shadow-xl overflow-hidden">
                                 <span className="text-xs font-black tracking-tighter">Pay</span>
                              </div>
                              <div>
                                 <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Apple Pay</h4>
                                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">NFC enabled checkout</p>
                              </div>
                           </div>
                           <Switch 
                             checked={stripe.applePay} 
                             onChange={(val) => updateStripe({ applePay: val })} 
                           />
                        </div>
                        <div className="flex justify-between items-center p-10 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:border-violet-500/30 transition-all shadow-inner">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-10 bg-white rounded-xl flex items-center justify-center border border-white/10 shadow-xl overflow-hidden">
                                 <span className="text-xs font-black tracking-tighter text-blue-600 italic">GPay</span>
                              </div>
                              <div>
                                 <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Google Pay</h4>
                                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">Smart wallet integration</p>
                              </div>
                           </div>
                           <Switch 
                             checked={stripe.googlePay} 
                             onChange={(val) => updateStripe({ googlePay: val })} 
                           />
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </section>

      {/* PayPal Card */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent pointer-events-none" />
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-12">
               <SectionHeader 
                  title="PayPal Integration" 
                  subtitle="Allow customers to pay via PayPal" 
                  icon={DollarSign} 
                  color="blue"
               />
            </div>

            <div className="flex items-center gap-8 p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 shadow-inner">
               <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">PayPal Integration Status</span>
                  <Switch 
                    checked={paypal.connected} 
                    onChange={(val) => updatePaypal({ connected: val })} 
                  />
               </div>
               <div className="flex-1 h-1 bg-white/5 rounded-full relative overflow-hidden">
                  <motion.div 
                    initial={false}
                    animate={{ width: paypal.connected ? '100%' : '0%' }}
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500"
                  />
               </div>
               <span className={`text-[10px] font-black uppercase tracking-[0.4em] w-24 text-right ${paypal.connected ? 'text-emerald-400' : 'text-slate-600'}`}>
                 {paypal.connected ? 'Active' : 'Inactive'}
               </span>
            </div>

            <AnimatePresence>
               {paypal.connected && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="mt-12 space-y-12"
                  >
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Live Client ID */}
                        <div className={`space-y-6 p-8 bg-white/[0.01] border rounded-[2rem] transition-all ${
                          !testMode ? "border-blue-500/20 shadow-lg shadow-blue-500/[0.02]" : "border-white/5 opacity-50"
                        }`}>
                           <h4 className="text-[10px] font-black tracking-[0.25em] text-white uppercase italic">Live Client ID</h4>
                           <InputField 
                              label="PAYPAL CLIENT ID" 
                              placeholder="Client ID..."
                              icon={Lock}
                              value={paypal.clientId || ""}
                              onChange={(e: any) => updatePaypal({ clientId: e.target.value })}
                           />
                        </div>
                        
                        {/* Test Client ID */}
                        <div className={`space-y-6 p-8 bg-white/[0.01] border rounded-[2rem] transition-all ${
                          testMode ? "border-amber-500/20 shadow-lg shadow-amber-500/[0.02]" : "border-white/5 opacity-50"
                        }`}>
                           <h4 className="text-[10px] font-black tracking-[0.25em] text-white uppercase italic">Test Client ID</h4>
                           <InputField 
                              label="PAYPAL TEST CLIENT ID" 
                              placeholder="Test Client ID..."
                              icon={Lock}
                              value={paypal.testClientId || ""}
                              onChange={(e: any) => updatePaypal({ testClientId: e.target.value })}
                           />
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </section>

      {/* Shippo Card */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
            <Truck size={200} className="text-violet-500" />
         </div>
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-12">
               <SectionHeader 
                  title="Shippo Integration" 
                  subtitle="Configure API Token for Address Verification and Shipping Labels" 
                  icon={Truck} 
                  color="violet"
               />
               <button 
                  onClick={() => window.open("https://goshippo.com", "_blank")}
                  className="bg-white/5 border border-white/10 px-8 py-3 rounded-2xl text-[9px] font-black tracking-[0.2em] text-slate-300 hover:bg-white/10 transition-all flex items-center gap-3 uppercase shadow-lg cursor-pointer"
                >
                   SHIPPO DASHBOARD <ExternalLink size={14} className="text-violet-400" />
                </button>
            </div>
            
            <div className="space-y-8">
               <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
                  <div>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Status</span>
                     <p className="text-xs font-bold text-white mt-1">
                        {loadingShippo ? (
                           <span className="text-slate-500 uppercase tracking-widest text-[10px]">Loading status...</span>
                        ) : shippoConfig?.configured ? (
                           <span>
                              Configured via <span className="text-violet-400 uppercase">{shippoConfig.source || "Secret"}</span> (Ends in <span className="font-mono text-cyan-400">****{shippoConfig.lastFour}</span>)
                           </span>
                        ) : (
                           <span className="text-red-400 uppercase">Not Configured (Fallback Active)</span>
                        )}
                     </p>
                  </div>
                  {shippoConfig?.updatedAt && (
                     <div className="text-right">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Last Updated</span>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">{new Date(shippoConfig.updatedAt).toLocaleDateString()}</p>
                     </div>
                  )}
               </div>

               {shippoConfig?.configured && (
                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
                     <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Dynamic Rates via Shippo</span>
                        <p className="text-xs text-slate-450 mt-1">Fetch live carrier shipping rates dynamically at checkout based on address & parcel weight</p>
                     </div>
                     <input
                        type="checkbox"
                        checked={shippoConfig?.dynamicRatesEnabled ?? false}
                        onChange={async (e) => {
                           const enabled = e.target.checked;
                           try {
                              await adminApi.setShippoDynamicRates(enabled);
                              setShippoConfig((prev: any) => ({ ...prev, dynamicRatesEnabled: enabled }));
                              alert(enabled ? "Dynamic shipping rates enabled!" : "Dynamic shipping rates disabled!");
                           } catch (err: any) {
                              alert(err.message || "Failed to update Shippo settings.");
                           }
                        }}
                        className="w-6 h-6 rounded-lg bg-[#1E1E1F] border-white/10 text-violet-600 focus:ring-violet-500 cursor-pointer"
                     />
                  </div>
               )}


               <div className="flex gap-4 items-end">
                  <div className="flex-1">
                     <InputField 
                        label="NEW SHIPPO API TOKEN" 
                        placeholder="shippo_live_... or shippo_test_..."
                        icon={ShieldCheck}
                        type="password"
                        value={newShippoToken}
                        onChange={(e: any) => setNewShippoToken(e.target.value)}
                     />
                  </div>
                  <button
                     type="button"
                     onClick={handleSaveShippo}
                     disabled={savingShippo || !newShippoToken.trim()}
                     className="bg-violet-600 hover:bg-violet-500 text-white px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.25em] uppercase transition-all disabled:opacity-30 active:scale-95 border border-violet-400/20 shadow-lg shrink-0 cursor-pointer"
                  >
                     {savingShippo ? "SYNCING..." : "SAVE KEY"}
                  </button>
               </div>
               
               <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] leading-relaxed">
                  Keys are synced securely to Firestore with limited access permissions. The storefront never exposes your API token.
               </p>
            </div>
         </div>
      </section>

      {/* Manual Payment Methods Card */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <SectionHeader 
            title="Manual Payment Methods" 
            subtitle="Alternative payment gateways" 
            icon={Building} 
            color="emerald"
          />
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => openAddMethod("bank")}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center gap-2"
            >
              <Plus size={12} /> + e-Transfer
            </button>
            <button 
              onClick={() => openAddMethod("cod")}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center gap-2"
            >
              <Plus size={12} /> + COD
            </button>
            <button 
              onClick={() => openAddMethod("custom")}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center gap-2"
            >
              <Plus size={12} /> + Custom
            </button>
          </div>
        </div>

        {manualMethods.length === 0 ? (
          <div className="p-12 border border-dashed border-white/10 rounded-[2.5rem] text-center bg-white/[0.01]">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-black italic">No manual payment methods configured.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {manualMethods.map((method: any) => (
              <div 
                key={method.id}
                className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] hover:border-violet-500/20 transition-all flex flex-col justify-between gap-6"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="text-sm font-black text-white uppercase tracking-widest italic truncate">{method.name}</h4>
                      <span className="px-2 py-0.5 rounded bg-violet-600/20 border border-violet-500/30 text-[8px] font-black text-violet-400 tracking-wider uppercase shrink-0">
                        {method.type === "bank" ? "e-Transfer" : method.type === "cod" ? "COD" : "Custom"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.15em] mt-4 line-clamp-3">
                      {method.instructions || "No custom instructions configured."}
                    </p>
                  </div>
                  
                  <Switch 
                    checked={method.enabled}
                    onChange={(val) => handleToggleMethodStatus(method.id, val)}
                  />
                </div>
                
                <div className="flex gap-4 pt-4 border-t border-white/5 justify-end">
                  <button 
                    onClick={() => openEditMethod(method)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                    aria-label="Edit payment method"
                    title="Edit Method"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteMethod(method.id)}
                    className="p-3 bg-red-500/5 hover:bg-red-500/10 rounded-xl text-red-400/60 hover:text-red-400 transition-colors"
                    aria-label="Delete payment method"
                    title="Delete Method"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer Badges Selector */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden">
        <SectionHeader 
          title="Footer Payment Icons" 
          subtitle="Display trust badges in footer" 
          icon={CreditCard} 
          color="violet"
        />
        
        <p className="text-xs text-slate-400 leading-relaxed max-w-xl font-medium">
          Select which payment methods will appear as monochrome icons in the footer of your storefront.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { id: "visa", label: "Visa" },
            { id: "mastercard", label: "Mastercard" },
            { id: "amex", label: "American Express" },
            { id: "paypal", label: "PayPal" },
            { id: "applepay", label: "Apple Pay" },
            { id: "googlepay", label: "Google Pay" },
            { id: "afterpay", label: "Afterpay" },
            { id: "klarna", label: "Klarna" }
          ].map((badge) => {
            const isChecked = footerBadges.includes(badge.id);
            return (
              <label 
                key={badge.id}
                onClick={() => {
                  const newBadges = isChecked
                    ? footerBadges.filter((b: string) => b !== badge.id)
                    : [...footerBadges, badge.id];
                  setSettings({
                    ...settings,
                    payments: { ...settings.payments, footerBadges: newBadges }
                  });
                }}
                className={`p-6 bg-white/[0.02] border rounded-[2rem] hover:border-violet-500/20 cursor-pointer flex items-center justify-between transition-all ${
                  isChecked ? "border-violet-500/30 bg-violet-600/[0.02]" : "border-white/5"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    isChecked ? "border-violet-500 bg-violet-600" : "border-white/10 bg-white/5"
                  }`}>
                    {isChecked && <Check size={12} className="text-white font-bold" />}
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">{badge.label}</span>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      {/* Security note */}
      <div className="p-10 bg-amber-500/5 border border-amber-500/20 rounded-[3rem] flex gap-8 items-center shadow-2xl">
         <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner">
            <Lock size={24} className="text-amber-400" />
         </div>
         <div className="flex-1">
            <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] mb-1 italic">Secure Encryption Active</h4>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">All payment credentials and API keys are stored securely. Client IDs and secret keys are masked for security.</p>
         </div>
      </div>

      {/* Manual Payment Edit Modal */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 md:p-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: "circOut" }}
              className="w-full max-w-2xl bg-[#050506] border border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400">
                    <Building size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-white italic">
                      {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium tracking-wide mt-1 uppercase">
                      {editingMethod ? "Update configured instructions" : "Setup alternative manual transaction option"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsManualModalOpen(false)}
                  className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white border border-white/10 transition-all hover:bg-white/10 active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <InputField 
                  label="PAYMENT METHOD TITLE" 
                  placeholder="e.g. Bank Deposit, Interac e-Transfer"
                  icon={CreditCard}
                  value={methodName}
                  onChange={(e: any) => setMethodName(e.target.value)}
                />
                
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">Payment Instructions</label>
                  <textarea
                    className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-5 outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all text-sm text-white font-bold placeholder:text-slate-800"
                    rows={6}
                    placeholder="Enter instructions for customers. e.g., send e-transfer to payment@example.com."
                    value={methodInstructions}
                    onChange={(e: any) => setMethodInstructions(e.target.value)}
                  />
                  <p className="text-[8px] text-slate-600 uppercase tracking-wider block ml-1 leading-relaxed">
                    These instructions will be displayed to customers on the checkout confirmation page after placing their order.
                  </p>
                </div>

                <div className="flex justify-between items-center p-8 bg-white/[0.01] border border-white/5 rounded-[2rem]">
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest italic">Status</h4>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Enable or disable this payment option immediately</p>
                  </div>
                  <Switch 
                    checked={methodEnabled}
                    onChange={setMethodEnabled}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-end gap-4 shrink-0">
                <button
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMethod}
                  className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-violet-600/20 border border-violet-400/20"
                >
                  Save Method
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

// DesignerSettings removed — replaced by full-screen ThemeEditor
// The ShopSettings component now renders <ThemeEditor /> when activeTab === "designer"

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
      alert(`Error uploading ${type}`);
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

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await adminApi.syncInventoryFromLegacy();
      setResult(res);
      setLastSyncTime(new Date().toISOString());
    } catch (err: any) {
      setError(err.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const fmtTime = (iso?: string) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    return d.toLocaleString("en-CA", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <section className="glass-card rounded-[3rem] p-12 border border-white/5 space-y-12 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-8 relative z-10">
        <SectionHeader 
          title="Inventory Sync" 
          subtitle="Real-time stock reconciliation with legacy core" 
          icon={Database} 
          color="violet"
        />

        <div className="flex flex-col items-end gap-4">
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-4 px-10 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] transition-all border
              ${syncing
                ? "bg-white/5 border-white/10 text-slate-500 cursor-not-allowed"
                : "bg-violet-600 border-violet-400/20 text-white shadow-2xl shadow-violet-600/40 hover:bg-violet-500 active:scale-95"
              }`}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "SYNCHRONIZING..." : "INITIATE SYNC"}
          </button>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
            <Clock size={12} className="text-slate-600" />
            Last Pulse: <span className="text-slate-300 ml-1">{fmtTime(lastSyncTime)}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed max-w-2xl font-medium relative z-10">
        Automated bidirectional data transfer between the legacy inventory system and the modern storefront. 
        Matching protocol utilizes unique product slugs and normalized title strings.
      </p>

      {/* Connection info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-white/[0.02] rounded-[2.5rem] px-10 py-8 border border-white/5 relative z-10 shadow-inner">
        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">Core Source</p>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <p className="text-[11px] font-black text-slate-300 truncate tracking-widest uppercase">lyricalmyrical-default-rtdb</p>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <RefreshCw size={20} className="text-slate-700" />
          </div>
        </div>
        <div className="space-y-3 text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">Cloud Destination</p>
          <p className="text-[11px] font-black text-slate-300 truncate tracking-widest uppercase">firestore / public_books</p>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] px-8 py-6 relative z-10"
          >
            <AlertCircleIcon size={20} className="text-rose-400 shrink-0 mt-1" />
            <div>
              <p className="text-sm font-black text-rose-400 uppercase tracking-widest mb-1 italic">Protocol Failure</p>
              <p className="text-xs text-rose-300/70 font-medium leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10 relative z-10"
          >
            {/* Summary chips */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/5">
                <CheckCircle size={14} />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase">
                  {result.synced} RECORDS SYNCHRONIZED
                </span>
              </div>
              {result.unmatched > 0 && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-6 py-3 rounded-2xl">
                  <AlertCircleIcon size={14} />
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase">
                    {result.unmatched} ORPHANED INSTANCES
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 text-slate-400 px-6 py-3 rounded-2xl">
                <Database size={14} />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase">
                  {result.legacyTotal} CORE ENTRIES
                </span>
              </div>
            </div>

            {/* Per-book table */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-inner">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5">
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Entity Designation</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Legacy Key</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic text-right">Units</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {result.results.map((r: any, i: number) => (
                    <tr key={r.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-10 py-6">
                        <p className="text-sm font-black text-white uppercase tracking-tight italic mb-1">{r.title || "(NULL ENTITY)"}</p>
                        <p className="text-[9px] text-slate-600 font-black tracking-[0.2em] uppercase">{r.slug || "NO_SLUG"}</p>
                      </td>
                      <td className="px-10 py-6">
                        <code className="text-[10px] font-black text-violet-400/70 bg-violet-500/5 px-3 py-1.5 rounded-lg border border-violet-500/10 tracking-widest uppercase">
                          {r.matched ? r.legacyKey : "ORPHAN"}
                        </code>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <span className="text-lg font-black text-white font-mono">{r.stock}</span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        {r.matched ? (
                          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/20 text-[9px] font-black tracking-widest uppercase italic">
                            <CheckCircle size={10} /> SYNCED
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-4 py-1.5 rounded-full border border-amber-500/20 text-[9px] font-black tracking-widest uppercase italic">
                            <AlertCircleIcon size={10} /> MISMATCH
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.unmatched > 0 && (
              <div className="p-8 bg-amber-500/[0.03] border border-amber-500/10 rounded-[2rem] flex gap-6 items-start">
                 <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <AlertCircleIcon size={18} className="text-amber-400" />
                 </div>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    <strong className="text-amber-400 uppercase tracking-widest text-[10px] font-black block mb-2">Matching Strategy Optimization:</strong>
                    Unmatched entities require manual slug alignment with legacy inventory keys. 
                    Target keys identified: <code className="text-white bg-white/10 px-2 py-0.5 rounded mx-1">hound</code>, <code className="text-white bg-white/10 px-2 py-0.5 rounded mx-1">altrove</code>. 
                    Update slugs within the <span className="text-violet-400 font-bold">Catalog Engine</span>.
                 </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legacy book list (shown before any sync) */}
      {!result && !error && !syncing && (
        <div className="space-y-6 relative z-10 pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 ml-1">Legacy Core Registry Keys</p>
          <div className="flex flex-wrap gap-4">
            {["altrove", "hound", "archaeology", "sistema", "nobody", "collective", "Subverso meme"].map(k => (
              <span key={k} className="bg-white/5 text-slate-400 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase border border-white/5 hover:border-violet-500/30 transition-all cursor-default">
                {k}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-medium ml-1">
            Ensure storefront entity <span className="text-violet-400 font-black italic uppercase tracking-widest">Slugs</span> correspond exactly to registry keys for successful reconciliation.
          </p>
        </div>
      )}
    </section>
  );
}

export function SectionHeader({ title, subtitle, icon: Icon, color = "violet" }: any) {
  const colorMap: any = {
    violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", icon: "text-violet-400" },
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", icon: "text-cyan-400" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-400" },
    rose: { bg: "bg-rose-500/10", border: "border-rose-500/20", icon: "text-rose-400" },
  };
  const theme = colorMap[color] || colorMap.violet;

  return (
    <div className="flex items-center gap-6">
      <div className={`w-14 h-14 rounded-2xl ${theme.bg} ${theme.border} border flex items-center justify-center shadow-inner`}>
        <Icon size={24} className={theme.icon} />
      </div>
      <div>
        <h3 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none">{title}</h3>
        <p className="text-[10px] text-slate-500 tracking-[0.3em] uppercase mt-2 font-bold">{subtitle}</p>
      </div>
    </div>
  );
}

export function InputField({ label, icon: Icon, value, onChange, placeholder, type = "text", className = "" }: any) {
  return (
    <div className={`space-y-4 ${className}`}>
      {label && <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">{label}</label>}
      <div className="flex items-center gap-6 bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-5 focus-within:border-violet-500/50 focus-within:bg-white/[0.06] transition-all group shadow-inner">
        {Icon && <Icon size={20} className="text-slate-600 group-focus-within:text-violet-400 transition-colors" />}
        <input
          type={type}
          className="bg-transparent border-none outline-none text-sm text-white flex-1 font-bold placeholder:text-slate-800"
          value={value}
          placeholder={placeholder}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative flex items-center group outline-none"
    >
      <div
        className={`w-16 h-8 rounded-full transition-all duration-500 p-1 flex items-center ${
          checked 
            ? "bg-violet-600 shadow-[0_0_20px_rgba(139,92,246,0.3)]" 
            : "bg-white/5 border border-white/10"
        }`}
      >
        <motion.div
          animate={{
            x: checked ? 32 : 0,
            scale: checked ? 1.1 : 1,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`w-6 h-6 rounded-full shadow-lg relative flex items-center justify-center ${
            checked ? "bg-white" : "bg-slate-600"
          }`}
        >
          {checked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-1 h-1 rounded-full bg-violet-600"
            />
          )}
        </motion.div>
      </div>
      <div className="ml-4 flex flex-col items-start text-left">
        <span className={`text-[9px] font-black tracking-[0.2em] uppercase transition-colors duration-300 ${
          checked ? "text-violet-400" : "text-slate-600"
        }`}>
          {checked ? "ACTIVE" : "OFFLINE"}
        </span>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full transition-all duration-500 ${
                checked 
                  ? "bg-violet-400 animate-pulse" 
                  : "bg-white/5"
              }`}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </button>
  );
}

const AlertCircle = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
