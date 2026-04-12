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
import { motion, AnimatePresence } from "motion/react";

const PURPLE = "#A855F7";

export function ShopSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
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

  if (loading) return <div className="h-96 flex items-center justify-center text-[10px] tracking-[.4em] text-neutral-400 uppercase animate-pulse">Accessing Archive Config...</div>;
  if (error) return <div className="h-96 flex items-center justify-center text-[10px] tracking-[.4em] text-red-500 uppercase">{error}</div>;

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "communications", label: "Communications", icon: Mail },
    { id: "shipping", label: "Shipping", icon: Truck },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "taxes", label: "Taxes", icon: Percent },
    { id: "designer", label: "Shop designer", icon: Palette },
  ];

  return (
    <div className="flex gap-12 max-w-6xl mx-auto pb-32">
      {/* Sub Navigation Sidebar */}
      <aside className="w-64 space-y-2">
        <div className="flex items-center gap-3 px-4 py-6 mb-4">
          <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
             <SettingsIcon size={20} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-purple-600">Shop settings</h2>
        </div>
        
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-xl ${
                activeTab === tab.id 
                  ? "bg-white text-black shadow-sm" 
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? "text-purple-500" : ""} />
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
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
            {activeTab === "shipping" && <ShippingSettings profiles={shippingProfiles} />}
            {activeTab === "payments" && <PaymentsSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={saveSection} savingSection={savingSection} />}
            {activeTab === "taxes" && <TaxesSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={saveSection} savingSection={savingSection} />}
            {activeTab === "designer" && <DesignerSettings settings={settings} setSettings={setSettings} hasChanges={hasChanges} saveSection={saveSection} savingSection={savingSection} />}
          </motion.div>
        </AnimatePresence>
      </div>
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

function ShippingSettings({ profiles }: any) {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <h2 className="text-4xl font-black tracking-tight uppercase scale-x-110 origin-left">SHIPPING</h2>
        <button className="bg-neutral-100 px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 hover:bg-neutral-200 transition-all">
           <Plus size={14} /> ADD SHIPPING PROFILE
        </button>
      </div>

      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-6">
         <div>
            <h3 className="text-sm font-bold tracking-tight mb-2">Primary shipping profile</h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed mb-4">
               Buyers in these regions will see the following shipping options at checkout.
               <br />
               <span className="font-bold text-neutral-900">All products in your shop use this profile unless you assign them to another profile.</span>
            </p>
            <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-md text-[9px] font-bold tracking-widest uppercase">
               7 products use this profile
            </span>
         </div>

         <div className="space-y-4 pt-4">
            {[
              { region: "Italy", base: "$5.00", additional: "$3.00" },
              { region: "European Union", base: "$5.00", additional: "$3.00" },
              { region: "Europe (non-EU, excludes UK)", base: "$5.00", additional: "$3.00" },
              { region: "Ontario", base: "$15.00", additional: "$2.00" }
            ].map((r) => (
              <div key={r.region} className="border border-neutral-100 rounded-2xl overflow-hidden">
                 <div className="bg-[#4D4B46] text-white px-6 py-3 flex justify-between items-center">
                    <span className="text-[11px] font-bold tracking-tight">{r.region}</span>
                    <div className="flex items-center gap-4">
                       <button className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest">
                          <Plus size={12} /> ADD RATE
                       </button>
                       <Edit2 size={12} className="cursor-pointer hover:opacity-50" />
                       <Trash2 size={12} className="cursor-pointer hover:opacity-50" />
                    </div>
                 </div>
                 <div className="p-6 flex justify-between items-center">
                    <div>
                       <p className="text-[11px] font-bold">Standard (with tracking) - Approx. delivery 3-5 days</p>
                    </div>
                    <div className="flex gap-12 text-right">
                       <div>
                          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Base price</p>
                          <p className="text-sm font-bold">{r.base}</p>
                       </div>
                       <div>
                          <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Each additional item</p>
                          <p className="text-sm font-bold">{r.additional}</p>
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
      <h2 className="text-3xl font-black tracking-tight uppercase">PAYMENTS</h2>
      <p className="text-[11px] text-neutral-400 -mt-6">Accept orders through your online shop or in person using our iOS app</p>

      {/* Stripe Card */}
      <section className="bg-white border border-neutral-100 rounded-[2.5rem] p-10 shadow-sm space-y-10">
         <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
               <h3 className="text-md font-bold">Stripe</h3>
               <span className="bg-green-100 text-green-600 px-3 py-1 rounded-md text-[9px] font-bold tracking-widest uppercase flex items-center gap-1">
                  <Check size={10} /> Connected
               </span>
            </div>
            <button className="text-[10px] font-bold tracking-widest text-neutral-500 flex items-center gap-1 border border-neutral-200 px-4 py-2 rounded-xl hover:bg-neutral-50">
               VISIT YOUR STRIPE DASHBOARD <ExternalLink size={12} />
            </button>
         </div>

         <div className="space-y-2">
            <p className="text-[11px] text-neutral-400">You are accepting payments with Stripe</p>
            <p className="text-[11px] font-bold">Account: <span className="text-neutral-500">{stripe?.email}</span></p>
         </div>

         <div className="space-y-6 pt-6 border-t border-neutral-50">
            <div className="flex items-center gap-4">
               <div className="w-12 h-8 bg-neutral-100 rounded flex items-center justify-center">
                  <CreditCard size={18} className="text-neutral-400" />
               </div>
               <div>
                  <p className="text-[11px] font-bold">Credit cards</p>
                  <p className="text-[10px] text-neutral-400">Visa, Mastercard, American Express, Discover, Diners Club, and JCB</p>
               </div>
            </div>

            <div className="flex items-center gap-4 opacity-50">
               <div className="w-12 h-8 bg-neutral-100 rounded flex items-center justify-center text-[10px] font-black">CB</div>
               <p className="text-[11px] font-bold">Cartes Bancaires</p>
            </div>

            <div className="flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-[#635BFF] text-white rounded flex items-center justify-center text-[10px] font-black italic">link</div>
                  <p className="text-[11px] font-bold">Link</p>
               </div>
               <Switch checked={true} onChange={() => {}} />
            </div>

            <div className="flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-black text-white rounded flex items-center justify-center">
                     <span className="text-[10px] font-bold tracking-tighter">Pay</span>
                  </div>
                  <p className="text-[11px] font-bold">Apple Pay</p>
               </div>
               <Switch checked={stripe?.applePay} onChange={(val) => setSettings({...settings, payments: {...settings.payments, stripe: {...stripe, applePay: val}}})} />
            </div>

            <div className="flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-neutral-100 rounded flex items-center justify-center">
                     <span className="text-[10px] font-bold tracking-tighter text-blue-600">G Pay</span>
                  </div>
                  <p className="text-[11px] font-bold">Google Pay</p>
               </div>
               <Switch checked={stripe?.googlePay} onChange={(val) => setSettings({...settings, payments: {...settings.payments, stripe: {...stripe, googlePay: val}}})} />
            </div>
         </div>

         <div className="space-y-6 pt-10 border-t border-neutral-50">
            <div>
               <h4 className="text-[11px] font-bold uppercase tracking-tight mb-1">Buy now, Pay Later options</h4>
               <p className="text-[10px] text-neutral-400">Let your customers choose to pay in smaller installments while you still get paid in full up front.</p>
            </div>

            {[
               { id: 'afterpay', label: 'Afterpay/Clearpay', color: '#B2FCE4', textColor: '#000' },
               { id: 'affirm', label: 'Affirm', color: '#000', textColor: '#fff' },
               { id: 'klarna', label: 'Klarna', color: '#FFB3C7', textColor: '#000' }
            ].map(pm => (
               <div key={pm.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-8 rounded flex items-center justify-center text-[8px] font-black uppercase" style={{ backgroundColor: pm.color, color: pm.textColor }}>{pm.label}</div>
                     <p className="text-[11px] font-bold">{pm.label}</p>
                  </div>
                  <Switch checked={stripe?.[pm.id]} onChange={(val) => setSettings({...settings, payments: {...settings.payments, stripe: {...stripe, [pm.id]: val}}})} />
               </div>
            ))}
         </div>

         <div className="space-y-6 pt-10 border-t border-neutral-50">
            <div>
               <h4 className="text-[11px] font-bold uppercase tracking-tight mb-1">Subscriptions</h4>
               <p className="text-[10px] text-neutral-400">Let your fans support you with monthly contributions. Create a custom page and share the link anywhere. <span className="text-purple-500 cursor-pointer">Learn more</span></p>
            </div>
            <div className="flex justify-between items-center">
               <div>
                  <p className="text-[11px] font-bold">Allow subscriptions for monthly contributions</p>
                  <p className="text-[10px] text-neutral-400">When off, all recurring payments will be paused and not processed.</p>
               </div>
               <Switch checked={stripe?.subscriptions} onChange={(val) => setSettings({...settings, payments: {...settings.payments, stripe: {...stripe, subscriptions: val}}})} />
            </div>
         </div>

         <div className="pt-10">
            <button className="bg-red-500 text-white px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest hover:bg-red-600 transition-all">
               DISCONNECT STRIPE
            </button>
         </div>
      </section>

      {/* PayPal Card */}
      <section className="bg-white border border-neutral-100 rounded-[2.5rem] p-10 shadow-sm space-y-10 opacity-70">
         <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
               <h3 className="text-md font-bold">PayPal</h3>
               <span className="bg-green-100 text-green-600 px-3 py-1 rounded-md text-[9px] font-bold tracking-widest uppercase flex items-center gap-1">
                  <Check size={10} /> Connected
               </span>
            </div>
            <button className="text-[10px] font-bold tracking-widest text-neutral-500 flex items-center gap-1 border border-neutral-200 px-4 py-2 rounded-xl hover:bg-neutral-50">
               VISIT YOUR PAYPAL DASHBOARD <ExternalLink size={12} />
            </button>
         </div>

         <div className="space-y-2">
            <p className="text-[11px] text-neutral-400">You are accepting payments with PayPal</p>
            <p className="text-[11px] font-bold">Account: <span className="text-neutral-500">{paypal?.email}</span></p>
         </div>

         <div className="p-6 bg-neutral-50 border border-neutral-100 rounded-2xl flex gap-4">
            <AlertCircle size={18} className="text-black flex-shrink-0" />
            <div className="space-y-1">
               <p className="text-[11px] font-bold">You are accepting credit/debit card payments with Stripe</p>
               <p className="text-[10px] text-neutral-400">To accept credit/debit card payments with PayPal, you'll need to disconnect Stripe.</p>
            </div>
         </div>

         <div className="pt-10">
            <button className="bg-red-500 text-white px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest hover:bg-red-600 transition-all">
               DISCONNECT PAYPAL
            </button>
         </div>
      </section>
    </div>
  );
}

function TaxesSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-black tracking-tight uppercase">TAXES</h2>
      <p className="text-[11px] text-neutral-400 -mt-6">Tax will be added to applicable orders during checkout based on your tax settings. That tax will also display in the order info.</p>

      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-8">
         <h3 className="text-sm font-bold tracking-tight">Countries</h3>
         
         <div className="space-y-4">
            {settings.taxes?.rates?.length > 0 ? (
               settings.taxes.rates.map((task: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-neutral-50 rounded-xl">
                     <span className="text-[11px] font-bold uppercase tracking-tight">{task.country}</span>
                     <div className="flex items-center gap-4">
                        <span className="text-sm font-bold">{task.rate}%</span>
                        <Trash2 size={14} className="text-red-400 cursor-pointer" />
                     </div>
                  </div>
               ))
            ) : (
               <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-neutral-100 rounded-3xl">
                  <Percent size={32} className="text-neutral-100 mb-4" />
                  <p className="text-[10px] tracking-widest text-neutral-300 font-bold uppercase italic">No tax rates defined.</p>
               </div>
            )}
         </div>

         <button className="bg-neutral-100 px-6 py-2.5 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2 hover:bg-neutral-200 transition-all">
            <Plus size={14} /> ADD A TAX RATE
         </button>
      </section>
    </div>
  );
}

function DesignerSettings({ settings, setSettings, hasChanges, saveSection, savingSection }: any) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold tracking-tight uppercase">Shop Designer</h2>
      
      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-8">
         <div className="space-y-6">
            <div>
               <h3 className="text-sm font-bold tracking-tight mb-1">Visual Identity</h3>
               <p className="text-[11px] text-neutral-400">Configure the primary branding elements of your public storefront.</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-4">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Primary Theme Color</label>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl shadow-inner border border-neutral-100" style={{ backgroundColor: settings.design?.primaryColor }}></div>
                     <input 
                        type="color" 
                        value={settings.design?.primaryColor} 
                        onChange={e => setSettings({...settings, design: {...settings.design, primaryColor: e.target.value}})}
                        className="h-10 w-24 cursor-pointer bg-transparent border-none" 
                     />
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Typography</label>
                  <select 
                    className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-neutral-200"
                    value={settings.design?.font}
                    onChange={e => setSettings({...settings, design: {...settings.design, font: e.target.value}})}
                  >
                     <option value="Inter">Inter (Sans-serif Modern)</option>
                     <option value="Outfit">Outfit (Geometric Soft)</option>
                     <option value="Roboto">Roboto (Clean Standard)</option>
                     <option value="Times New Roman">Classic Serif</option>
                  </select>
               </div>
            </div>

            <div className="flex gap-4 pt-4">
               <button 
                 onClick={() => saveSection('design', { design: settings.design })}
                 className="bg-[#A855F7] text-white px-8 py-2.5 rounded-full text-[10px] font-bold tracking-widest shadow-lg shadow-purple-200"
               >
                  APPLY DESIGN CHANGES
               </button>
            </div>
         </div>
      </section>

      <div className="p-8 border-2 border-dashed border-neutral-200 rounded-[2rem] flex flex-col items-center justify-center space-y-4 text-center">
         <Palette size={48} className="text-neutral-200" />
         <div>
            <p className="text-sm font-bold mb-1 italic">Advanced Theme Editor</p>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest">Coming soon: Full layout control and CSS overrides</p>
         </div>
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
