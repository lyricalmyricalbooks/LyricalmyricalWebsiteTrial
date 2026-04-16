import { useState, useEffect } from "react";
import { 
  ChevronRight, 
  ExternalLink, 
  Globe, 
  Shield, 
  MapPin, 
  Image as LucideImage,
  Clock,
  ArrowRight,
  Mail,
  Truck,
  CreditCard,
  Percent,
  Palette,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Edit2,
  Bell,
  Star,
  Check
} from "lucide-react";
import { adminApi } from "./api";
import { motion, AnimatePresence } from "framer-motion";

const PURPLE = "#A855F7";

export function ShopSettings({ activeTab, setActiveTab }: any) {
  const [settings, setSettings] = useState<any>(adminApi.getDefaultSettings());
  const [originalSettings, setOriginalSettings] = useState<any>(adminApi.getDefaultSettings());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [shippingProfiles, setShippingProfiles] = useState<any[]>([]);

  useEffect(() => {
    loadSettings();
    loadShippingProfiles();
  }, []);

  async function loadSettings() {
    try {
      const data = await adminApi.getSettings();
      setSettings(JSON.parse(JSON.stringify(data)));
      setOriginalSettings(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load settings from cloud.");
    } finally {
      setLoading(false);
    }
  }

  async function loadShippingProfiles() {
    try {
      const b = await adminApi.getShippingProfiles();
      setShippingProfiles(b);
    } catch (err) {
      console.error(err);
    }
  }

  const saveSection = async (section: string, data: any) => {
    setSavingSection(section);
    try {
      await adminApi.updateSettings(data);
      setOriginalSettings({ ...originalSettings, ...data });
    } catch (err) {
      alert("Error saving settings");
    } finally {
      setSavingSection(null);
    }
  };

  const hasChanges = (section: string) => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings[section]) !== JSON.stringify(originalSettings[section]);
  };

  if (error) return <div className="h-96 flex items-center justify-center text-[10px] tracking-[.4em] text-red-500 uppercase">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto pb-32">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-10"
        >
          {activeTab === "general" && <GeneralSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={saveSection} savingSection={savingSection} />}
          {activeTab === "communications" && <CommunicationsSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={saveSection} savingSection={savingSection} />}
          {activeTab === "shipping" && <ShippingSettings profiles={shippingProfiles} refreshProfiles={loadShippingProfiles} />}
          {activeTab === "payments" && <PaymentsSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={saveSection} savingSection={savingSection} />}
          {activeTab === "taxes" && <TaxesSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={saveSection} savingSection={savingSection} />}
          {activeTab === "designer" && <DesignerSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={saveSection} savingSection={savingSection} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function GeneralSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
  return (
    <>
      <h2 className="text-3xl font-bold tracking-tight uppercase mb-8">General</h2>
      
      {/* Maintenance Mode */}
      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm">
        <div className="flex justify-between items-start mb-4">
           <div>
              <h3 className="text-sm font-bold tracking-tight mb-1">Maintenance mode</h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed max-w-sm">
                 Stop taking orders temporarily if you're making updates, going on vacation or taking a break from selling.
              </p>
           </div>
           <Switch 
             checked={settings.maintenance?.enabled} 
             onChange={(val) => setSettings({...settings, maintenance: {...settings.maintenance, enabled: val}})} 
           />
        </div>
        <button className="text-[10px] font-bold tracking-widest text-purple-500 flex items-center gap-1 hover:opacity-50 transition-opacity">
           EDIT MAINTENANCE MODE MESSAGE <ArrowRight size={12} />
        </button>
        {hasChanges('maintenance') && (
           <div className="mt-6 pt-6 border-t border-neutral-50 flex gap-4">
              <button 
                onClick={() => saveSection('maintenance', { maintenance: settings.maintenance })}
                disabled={savingSection === 'maintenance'}
                className="bg-[#A855F7] text-white px-6 py-2 rounded-full text-[10px] font-bold tracking-widest"
              >
                {savingSection === 'maintenance' ? 'SAVING...' : 'SAVE'}
              </button>
           </div>
        )}
      </section>

      {/* Shop Domain */}
      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-6">
        <div>
           <h3 className="text-sm font-bold tracking-tight mb-1">Shop domains</h3>
           <p className="text-[11px] text-neutral-400 mb-4">You can change this anytime.</p>
           <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 group focus-within:border-neutral-200 transition-all">
              <Globe size={14} className="text-neutral-300" />
              <input 
                 className="bg-transparent border-none outline-none text-xs flex-1"
                 value={settings.domain?.subdomain}
                 onChange={e => setSettings({...settings, domain: {...settings.domain, subdomain: e.target.value}})}
              />
              <span className="text-[10px] font-bold text-neutral-300">.bigcartel.com</span>
           </div>
           <p className="text-[9px] text-neutral-300 mt-2 uppercase tracking-widest font-bold">URL Preview: https://{settings.domain?.subdomain}.bigcartel.com</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex-1 flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3">
              <Globe size={14} className="text-neutral-300" />
              <input 
                 className="bg-transparent border-none outline-none text-xs flex-1"
                 value={settings.domain?.custom}
                 onChange={e => setSettings({...settings, domain: {...settings.domain, custom: e.target.value}})}
              />
           </div>
           <button className="bg-neutral-100 text-neutral-500 px-6 py-3 rounded-xl text-[10px] font-bold tracking-widest hover:bg-neutral-200 transition-all">MANAGE</button>
        </div>
      </section>

      {/* Shop Info */}
      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-8">
         <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-tight">Shop info</h3>
            <div>
               <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Shop name</label>
               <input 
                 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-neutral-200"
                 value={settings.info?.name}
                 onChange={e => setSettings({...settings, info: {...settings.info, name: e.target.value}})}
               />
               <p className="text-[9px] text-neutral-300 mt-2 text-right">{settings.info?.name?.length || 0} / 100 characters</p>
            </div>
            <div>
               <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Shop description</label>
               <textarea 
                 rows={4}
                 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-neutral-200 resize-none"
                 value={settings.info?.description}
                 onChange={e => setSettings({...settings, info: {...settings.info, description: e.target.value}})}
               />
               <p className="text-[9px] text-neutral-300 mt-2 text-right">{settings.info?.description?.length || 0} / 150 characters</p>
            </div>
         </div>
         {hasChanges('info') && (
           <div className="flex gap-4">
              <button 
                onClick={() => saveSection('info', { info: settings.info })}
                disabled={savingSection === 'info'}
                className="bg-[#A855F7] text-white px-8 py-2.5 rounded-full text-[10px] font-bold tracking-widest shadow-lg shadow-purple-200"
              >
                 {savingSection === 'info' ? 'SAVING...' : 'SAVE'}
              </button>
           </div>
         )}
      </section>
    </>
  );
}

function CommunicationsSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight uppercase">Communication Preferences</h2>

      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-8">
        <div>
           <h3 className="text-sm font-bold tracking-tight mb-6">Customer communications</h3>
           
           <div className="space-y-8">
              <div className="flex justify-between items-start">
                 <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-tight mb-1">Order receipt emails</h4>
                    <button className="text-[10px] text-purple-500 font-bold hover:opacity-50 transition-opacity">Send a test email to myself</button>
                 </div>
                 <Switch 
                   checked={settings.communications?.orderReceipts} 
                   onChange={val => setSettings({...settings, communications: {...settings.communications, orderReceipts: val}})} 
                 />
              </div>

              <div>
                 <label className="text-[11px] font-bold uppercase tracking-tight block mb-2">Order receipt message</label>
                 <textarea 
                   rows={4}
                   placeholder="Thank you for your order! We'll start processing it right away."
                   className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-neutral-200 resize-none"
                   value={settings.communications?.receiptMessage}
                   onChange={e => setSettings({...settings, communications: {...settings.communications, receiptMessage: e.target.value}})}
                 />
              </div>

              <div className="flex gap-4">
                 <button 
                   onClick={() => saveSection('communications', { communications: settings.communications })}
                   className="bg-[#A855F7] text-white px-8 py-2.5 rounded-full text-[10px] font-bold tracking-widest shadow-lg shadow-purple-200"
                 >
                    SAVE
                 </button>
                 <button className="text-[10px] font-bold tracking-widest text-neutral-400 hover:text-black">CANCEL</button>
              </div>
           </div>
        </div>

        <div className="pt-8 border-t border-neutral-50">
           <div className="flex justify-between items-center">
              <h4 className="text-[11px] font-bold uppercase tracking-tight">Shipping status emails</h4>
              <Switch 
                checked={settings.communications?.shippingStatus} 
                onChange={val => setSettings({...settings, communications: {...settings.communications, shippingStatus: val}})} 
              />
           </div>
        </div>

        <div className="pt-8 border-t border-neutral-50 flex justify-between items-center opacity-70">
           <div>
              <h4 className="text-[11px] font-bold uppercase tracking-tight mb-1">Abandoned cart emails</h4>
              <p className="text-[10px] text-neutral-400">Boost sales with automatic reminder emails when customers start a checkout but don't complete a purchase.</p>
           </div>
           <button className="bg-[#E2FF00] text-black px-4 py-1.5 rounded-lg text-[9px] font-bold tracking-widest flex items-center gap-2">
              <Star size={10} fill="currentColor" /> UPGRADE
           </button>
        </div>
      </section>

      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm">
         <div className="flex justify-between items-center">
            <div>
               <h3 className="text-sm font-bold tracking-tight mb-1">Shop notifications</h3>
               <h4 className="text-[11px] font-bold uppercase tracking-tight text-neutral-400">New orders</h4>
            </div>
            <Switch 
              checked={settings.communications?.newOrderNotifications} 
              onChange={val => setSettings({...settings, communications: {...settings.communications, newOrderNotifications: val}})} 
            />
         </div>
      </section>
    </div>
  );
}

function ShippingSettings({ profiles, refreshProfiles }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [newRegion, setNewRegion] = useState("");
  const [newBase, setNewBase] = useState("");
  const [newAdd, setNewAdd] = useState("");

  const handleCreate = async () => {
    if (!newRegion) return;
    try {
      await adminApi.createShippingProfile({ region: newRegion, base: newBase, additional: newAdd });
      setIsAdding(false);
      setNewRegion("");
      setNewBase("");
      setNewAdd("");
      refreshProfiles();
    } catch {
      alert("Error adding shipping profile");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this shipping zone?")) return;
    try {
      await adminApi.deleteShippingProfile(id);
      refreshProfiles();
    } catch {
      alert("Error deleting shipping profile");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <h2 className="text-4xl font-black tracking-tight uppercase scale-x-110 origin-left">SHIPPING</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-neutral-100 px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 hover:bg-neutral-200 transition-all">
           {isAdding ? <X size={14} /> : <Plus size={14} />} 
           {isAdding ? "CANCEL" : "ADD SHIPPING PROFILE"}
        </button>
      </div>

      {isAdding && (
         <section className="bg-purple-50/50 border border-purple-100 rounded-[2rem] p-8 space-y-6">
            <h3 className="text-sm font-bold tracking-tight">New Shipping Zone</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Region / Country</label>
                  <input placeholder="e.g. Europe" className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-purple-300" value={newRegion} onChange={e => setNewRegion(e.target.value)} />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Base Price ($)</label>
                  <input placeholder="5.00" className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-purple-300" value={newBase} onChange={e => setNewBase(e.target.value)} />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Each additional item ($)</label>
                  <input placeholder="2.00" className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-purple-300" value={newAdd} onChange={e => setNewAdd(e.target.value)} />
               </div>
            </div>
            <button onClick={handleCreate} className="bg-[#A855F7] text-white px-8 py-2.5 rounded-full text-[10px] font-bold tracking-widest shadow-lg shadow-purple-200">
               SAVE SHIPPING ZONE
            </button>
         </section>
      )}

      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-6">
         <div>
            <h3 className="text-sm font-bold tracking-tight mb-2">Primary shipping profile</h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed mb-4">
               Buyers in these regions will see the following shipping options at checkout.
               <br />
               <span className="font-bold text-neutral-900">All products in your shop use this profile unless you assign them to another profile.</span>
            </p>
         </div>

         <div className="space-y-4 pt-4">
            {profiles.length === 0 && (
               <p className="text-xs text-neutral-400 italic">No shipping profiles configured yet.</p>
            )}
            
            {profiles.map((r: any) => (
              <div key={r.id} className="border border-neutral-100 rounded-2xl overflow-hidden group">
                 <div className="bg-[#4D4B46] text-white px-6 py-3 flex justify-between items-center">
                    <span className="text-[11px] font-bold tracking-tight">{r.region}</span>
                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Trash2 size={12} className="cursor-pointer hover:opacity-50" onClick={() => handleDelete(r.id)} />
                    </div>
                 </div>
                 <div className="p-6 flex justify-between items-center">
                    <div>
                       <p className="text-[11px] font-bold">Standard (with tracking) - Approx. delivery 3-5 days</p>
                    </div>
                    <div className="flex gap-12 text-right">
                       <div>
                          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Base price</p>
                          <p className="text-sm font-bold">${r.base}</p>
                       </div>
                       <div>
                          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Each additional item</p>
                          <p className="text-sm font-bold">${r.additional}</p>
                       </div>
                    </div>
                 </div>
              </div>
            ))}
         </div>
      </section>
    </div>
  );
}

function PaymentsSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
  const stripe = settings.payments?.stripe;
  const paypal = settings.payments?.paypal;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
         <div>
            <h2 className="text-3xl font-black tracking-tight uppercase">PAYMENTS</h2>
            <p className="text-[11px] text-neutral-400 mt-2">Configure your payment gateways to accept online orders securely.</p>
         </div>
         {hasChanges('payments') && (
            <button 
              onClick={() => saveSection('payments', { payments: settings.payments })}
              disabled={savingSection === 'payments'}
              className="bg-[#A855F7] text-white px-8 py-2.5 rounded-full text-[10px] font-bold tracking-widest shadow-lg shadow-purple-200"
            >
              {savingSection === 'payments' ? 'SAVING...' : 'SAVE CONFIGURATION'}
            </button>
         )}
      </div>

      {/* Stripe Card */}
      <section className="bg-white border border-neutral-100 rounded-[2.5rem] p-10 shadow-sm space-y-10">
         <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
               <h3 className="text-md font-bold">Stripe Connect</h3>
               <Switch checked={stripe?.connected} onChange={(val) => setSettings({...settings, payments: {...settings.payments, stripe: {...stripe, connected: val}}})} />
            </div>
            <button className="text-[10px] font-bold tracking-widest text-neutral-500 flex items-center gap-1 border border-neutral-200 px-4 py-2 rounded-xl hover:bg-neutral-50">
               VISIT STRIPE DASHBOARD <ExternalLink size={12} />
            </button>
         </div>

         {stripe?.connected && (
            <div className="space-y-6 pt-6 border-t border-neutral-50">
               <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  <div>
                     <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Publishable Key</label>
                     <input type="password" placeholder="pk_live_..." className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-purple-300" 
                        value={stripe?.publicKey || ''} onChange={e => setSettings({...settings, payments: {...settings.payments, stripe: {...stripe, publicKey: e.target.value}}})} />
                  </div>
               </div>

               {/* Wallets */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-7 bg-black text-white rounded flex items-center justify-center"><span className="text-[9px] font-bold tracking-tighter">Pay</span></div>
                        <p className="text-[11px] font-bold">Apple Pay</p>
                     </div>
                     <Switch checked={stripe?.applePay} onChange={(val) => setSettings({...settings, payments: {...settings.payments, stripe: {...stripe, applePay: val}}})} />
                  </div>
                  <div className="flex justify-between items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-7 bg-white border border-neutral-200 rounded flex items-center justify-center"><span className="text-[9px] font-bold tracking-tighter text-blue-600">G Pay</span></div>
                        <p className="text-[11px] font-bold">Google Pay</p>
                     </div>
                     <Switch checked={stripe?.googlePay} onChange={(val) => setSettings({...settings, payments: {...settings.payments, stripe: {...stripe, googlePay: val}}})} />
                  </div>
               </div>
            </div>
         )}
      </section>

      {/* PayPal Card */}
      <section className="bg-white border border-neutral-100 rounded-[2.5rem] p-10 shadow-sm space-y-10 opacity-70">
         <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
               <h3 className="text-md font-bold">PayPal</h3>
               <Switch checked={paypal?.connected} onChange={(val) => setSettings({...settings, payments: {...settings.payments, paypal: {...paypal, connected: val}}})} />
            </div>
         </div>
         {paypal?.connected && (
           <div className="space-y-6 pt-6 border-t border-neutral-50">
              <div>
                 <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">PayPal Client ID</label>
                 <input type="password" placeholder="Access token..." className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-purple-300" 
                    value={paypal?.clientId || ''} onChange={e => setSettings({...settings, payments: {...settings.payments, paypal: {...paypal, clientId: e.target.value}}})} />
              </div>
           </div>
         )}
      </section>
    </div>
  );
}

function TaxesSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [country, setCountry] = useState("");
  const [rate, setRate] = useState("");

  const handleAdd = () => {
    if (!country || !rate) return;
    const newRates = [...(settings.taxes?.rates || []), { country, rate }];
    setSettings({ ...settings, taxes: { ...settings.taxes, rates: newRates } });
    setIsAdding(false);
    setCountry("");
    setRate("");
  };

  const handleDelete = (index: number) => {
    const newRates = settings.taxes.rates.filter((_: any, i: number) => i !== index);
    setSettings({ ...settings, taxes: { ...settings.taxes, rates: newRates } });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
         <div>
            <h2 className="text-4xl font-black tracking-tight uppercase">TAXES</h2>
            <p className="text-[11px] text-neutral-400 mt-2">Tax will be added to applicable orders during checkout based on your settings.</p>
         </div>
         {hasChanges('taxes') && (
            <button 
              onClick={() => saveSection('taxes', { taxes: settings.taxes })}
              disabled={savingSection === 'taxes'}
              className="bg-[#A855F7] text-white px-8 py-2.5 rounded-full text-[10px] font-bold tracking-widest shadow-lg shadow-purple-200"
            >
              {savingSection === 'taxes' ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
         )}
      </div>

      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-8">
         <h3 className="text-sm font-bold tracking-tight">Countries</h3>
         
         <div className="space-y-4">
            {settings.taxes?.rates?.length > 0 ? (
               settings.taxes.rates.map((task: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-neutral-50 rounded-xl">
                     <span className="text-[11px] font-bold uppercase tracking-tight">{task.country}</span>
                     <div className="flex items-center gap-4">
                        <span className="text-sm font-bold">{task.rate}%</span>
                        <Trash2 size={14} className="text-red-400 cursor-pointer hover:opacity-50" onClick={() => handleDelete(idx)} />
                     </div>
                  </div>
               ))
            ) : (
               <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-neutral-200 rounded-3xl bg-neutral-50/50">
                  <Percent size={32} className="text-neutral-200 mb-4" />
                  <p className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase italic">No tax rates defined.</p>
               </div>
            )}
         </div>

         {isAdding ? (
            <div className="flex gap-4 items-end bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
               <div className="flex-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Country / Region</label>
                  <input placeholder="e.g. Canada" className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none" value={country} onChange={e => setCountry(e.target.value)} />
               </div>
               <div className="w-32">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Tax Rate (%)</label>
                  <input placeholder="13" type="number" className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none" value={rate} onChange={e => setRate(e.target.value)} />
               </div>
               <button onClick={handleAdd} className="bg-black text-white px-6 py-2.5 rounded-xl text-[10px] font-bold tracking-widest h-[38px] hover:bg-neutral-800">
                  ADD
               </button>
               <button onClick={() => setIsAdding(false)} className="text-[10px] font-bold tracking-widest text-neutral-400 hover:text-black mb-3">
                  CANCEL
               </button>
            </div>
         ) : (
            <button onClick={() => setIsAdding(true)} className="bg-neutral-100 px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 hover:bg-neutral-200 transition-all">
               <Plus size={14} /> ADD A TAX RATE
            </button>
         )}
      </section>
    </div>
  );
}

function DesignerSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
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

function Switch({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${checked ? 'bg-[#A855F7]' : 'bg-neutral-200'}`}
    >
       <motion.div 
         initial={false}
         animate={{ x: checked ? 22 : 4 }}
         className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
       />
       <span className={`absolute -right-8 top-1/2 -translate-y-1/2 text-[9px] font-bold tracking-widest uppercase transition-opacity ${checked ? 'text-[#A855F7]' : 'text-neutral-400'}`}>
         {checked ? 'ON' : 'OFF'}
       </span>
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
