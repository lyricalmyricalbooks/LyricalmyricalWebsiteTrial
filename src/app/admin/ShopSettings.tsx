import { useState, useEffect } from "react";
import { 
  ChevronRight, 
  ExternalLink, 
  Globe, 
  Shield, 
  MapPin, 
  Image as LucideImage,
  Clock,
  ArrowRight
} from "lucide-react";
import { adminApi } from "./api";
import { motion } from "motion/react";

const PURPLE = "#A855F7";

export function ShopSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
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

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-32">
      <h2 className="text-3xl font-bold tracking-tight uppercase">Shop Settings</h2>

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
            <div>
               <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Website</label>
               <input 
                 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-neutral-200"
                 placeholder="https://..."
                 value={settings.info?.website}
                 onChange={e => setSettings({...settings, info: {...settings.info, website: e.target.value}})}
               />
            </div>
         </div>
         <div className="flex gap-4">
            <button 
              onClick={() => saveSection('info', { info: settings.info })}
              disabled={savingSection === 'info'}
              className="bg-[#A855F7] text-white px-8 py-2.5 rounded-full text-[10px] font-bold tracking-widest shadow-lg shadow-purple-200"
            >
               {savingSection === 'info' ? 'SAVING...' : 'SAVE'}
            </button>
            <button className="text-[10px] font-bold tracking-widest text-neutral-400 hover:text-black">CANCEL</button>
         </div>
      </section>

      {/* Inventory Management */}
      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-8">
         <h3 className="text-sm font-bold tracking-tight">Inventory management</h3>
         <div className="space-y-6">
            <div className="flex justify-between items-center">
               <span className="text-[11px] font-bold uppercase tracking-tight">Inventory tracking</span>
               <Switch 
                 checked={settings.inventory?.tracking} 
                 onChange={val => setSettings({...settings, inventory: {...settings.inventory, tracking: val}})} 
               />
            </div>
            <div className="flex justify-between items-start">
               <div>
                  <span className="text-[11px] font-bold uppercase tracking-tight block mb-1">Allow overselling</span>
                  <p className="text-[10px] text-neutral-400 leading-relaxed max-w-sm">
                    Keep selling products even after they've reached 0 in stock. With overselling disabled, we'll automatically mark products as Sold Out.
                  </p>
               </div>
               <Switch 
                 checked={settings.inventory?.overselling} 
                 onChange={val => setSettings({...settings, inventory: {...settings.inventory, overselling: val}})} 
               />
            </div>
         </div>
      </section>

      {/* Require Phone */}
      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm flex justify-between items-center">
         <div>
            <h3 className="text-sm font-bold tracking-tight block mb-1">Require phone number at checkout</h3>
            <p className="text-[10px] text-neutral-400">You'll need to provide a recipient phone number for international shipments.</p>
         </div>
         <Switch 
           checked={settings.checkout?.requirePhone} 
           onChange={val => setSettings({...settings, checkout: {...settings.checkout, requirePhone: val}})} 
         />
      </section>

      {/* Image Assets */}
      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-8">
         <h3 className="text-sm font-bold tracking-tight">Image assets</h3>
         <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
               <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Profile image</p>
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-neutral-100 rounded-2xl overflow-hidden shadow-inner border border-neutral-50 flex items-center justify-center p-2">
                     <img src={settings.assets?.profileUrl} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-2">
                     <button className="bg-neutral-100 px-4 py-2 rounded-lg text-[9px] font-bold tracking-widest hover:bg-neutral-200 transition-all">CHANGE</button>
                     <button className="bg-neutral-100 px-4 py-2 rounded-lg text-[9px] font-bold tracking-widest hover:bg-neutral-200 transition-all">REMOVE</button>
                  </div>
               </div>
            </div>
            <div className="space-y-4">
               <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Favicon</p>
               <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-neutral-100 rounded-xl overflow-hidden shadow-inner border border-neutral-50 flex items-center justify-center p-2">
                     <img src={settings.assets?.faviconUrl} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-2">
                     <button className="bg-neutral-100 px-4 py-2 rounded-lg text-[9px] font-bold tracking-widest hover:bg-neutral-200 transition-all">CHANGE</button>
                     <button className="bg-neutral-100 px-4 py-2 rounded-lg text-[9px] font-bold tracking-widest hover:bg-neutral-200 transition-all">REMOVE</button>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Location */}
      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-6">
         <h3 className="text-sm font-bold tracking-tight">Location</h3>
         <div className="grid grid-cols-1 gap-4">
            <div>
               <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Street address</label>
               <input className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs" value={settings.location?.street} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">City</label>
                  <input className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs" value={settings.location?.city} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">State</label>
                    <input className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs" value={settings.location?.state} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Zip</label>
                    <input className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs" value={settings.location?.zip} />
                  </div>
               </div>
            </div>
            <div>
               <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Country</label>
               <select className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none">
                  <option>Canada</option>
                  <option>United States</option>
                  <option>Italy</option>
               </select>
            </div>
         </div>
         <div className="flex gap-4 pt-4">
            <button className="bg-[#A855F7] text-white px-8 py-2.5 rounded-full text-[10px] font-bold tracking-widest hover:shadow-lg transition-all">SAVE</button>
            <button className="text-[10px] font-bold tracking-widest text-neutral-400 hover:text-black">CANCEL</button>
         </div>
      </section>

      {/* Localization */}
      <section className="bg-white border border-neutral-100 rounded-[2rem] p-8 shadow-sm space-y-6">
         <h3 className="text-sm font-bold tracking-tight">Time zone and currency</h3>
         <div className="space-y-4">
            <div>
               <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Time zone</label>
               <select className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none">
                  <option>{settings.localization?.timezone}</option>
               </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Currency</label>
               <select className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-xs outline-none">
                  <option>{settings.localization?.currency}</option>
               </select>
            </div>
         </div>
         <div className="flex gap-4 pt-4">
            <button className="bg-[#A855F7] text-white px-8 py-2.5 rounded-full text-[10px] font-bold tracking-widest hover:shadow-lg transition-all">SAVE</button>
            <button className="text-[10px] font-bold tracking-widest text-neutral-400 hover:text-black">CANCEL</button>
         </div>
      </section>

      {/* AI Shield */}
      <section className="bg-[#FDFCF8] border border-[#F5F2E8] rounded-[2rem] p-8 shadow-sm space-y-8">
         <div>
            <div className="flex items-center gap-2 mb-1">
               <Shield size={16} className="text-neutral-900" />
               <h3 className="text-sm font-bold tracking-tight">AI shield</h3>
            </div>
         </div>
         <div className="space-y-6">
            <div className="flex justify-between items-start">
               <div>
                  <span className="text-[11px] font-bold uppercase tracking-tight block mb-1">Block AI training bots</span>
                  <p className="text-[10px] text-neutral-400 leading-relaxed max-w-sm">Block AI training bots from companies like OpenAI, Google, Meta, and Anthropic.</p>
               </div>
               <Switch checked={settings.aiShield?.blockTraining} onChange={() => {}} />
            </div>
            <div className="flex justify-between items-start">
               <div>
                  <span className="text-[11px] font-bold uppercase tracking-tight block mb-1">Block AI shopping assistants</span>
                  <p className="text-[10px] text-neutral-400 leading-relaxed max-w-sm">Block AI shopping assistants like Amazon Buy For Me from autonomously purchasing.</p>
               </div>
               <Switch checked={settings.aiShield?.blockShopping} onChange={() => {}} />
            </div>
         </div>
         <button className="text-[10px] font-bold tracking-widest text-purple-500 flex items-center gap-1 hover:opacity-50 transition-opacity">
            LEARN MORE ABOUT AI SHIELD <ArrowRight size={12} />
         </button>
      </section>

      {/* Shop Policies */}
      <section className="bg-white border border-neutral-100 rounded-[2.5rem] p-8 shadow-sm overflow-hidden">
         <h3 className="text-sm font-bold tracking-tight mb-8">Shop policies</h3>
         <div className="divide-y divide-neutral-50">
            {[
              { label: "Shipping and delivery", key: "shipping" },
              { label: "Returns and refunds", key: "returns" },
              { label: "Privacy policy", key: "privacy" },
              { label: "Terms and conditions", key: "terms" },
              { label: "Legal notice", key: "legal" }
            ].map((p) => (
              <button key={p.key} className="w-full flex items-center justify-between py-6 group hover:px-2 transition-all">
                 <div className="text-left">
                    <p className="text-[11px] font-bold uppercase tracking-tight mb-1">{p.label}</p>
                    <p className="text-[10px] text-neutral-300 tracking-widest font-bold">SET EXPECTATIONS • <span className="text-purple-400">LEARN MORE</span></p>
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="bg-neutral-100 text-neutral-400 px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest">NO POLICY SET</span>
                    <ChevronRight size={16} className="text-purple-400 group-hover:translate-x-1 transition-transform" />
                 </div>
              </button>
            ))}
         </div>
      </section>
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
