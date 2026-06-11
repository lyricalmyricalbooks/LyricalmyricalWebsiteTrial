import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { motion } from "framer-motion";
import { Mail, Globe, Save, Info, AlertCircle } from "lucide-react";
import { functionUrl } from "../lib/functionsBase";
import toast from "react-hot-toast";

type TemplateFields = {
  subject: string;
  body: string;
  buttonText: string;
  signoff: string;
  enabled?: boolean;
};

type NotificationSettings = {
  brand: {
    logoUrl: string;
    brandColor: string;
  };
  order_confirmation: TemplateFields;
  shipping_confirmation: TemplateFields;
  abandoned_cart: TemplateFields;
  order_cancelled: TemplateFields;
  order_refunded: TemplateFields;
  customer_welcome: TemplateFields;
  delivery_update: TemplateFields;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  brand: {
    logoUrl: "",
    brandColor: "#7C3AED"
  },
  order_confirmation: {
    subject: "Order confirmed: {{order_id}}",
    body: "Hi {{customer_name}},\n\nThank you for your purchase! We've received your order and are preparing it for shipment. We will send you another email when it has shipped.",
    buttonText: "View your order",
    signoff: "Thanks,\nThe Lyricalmyrical Team",
    enabled: true
  },
  shipping_confirmation: {
    subject: "Your order is on the way!",
    body: "Hi {{customer_name}},\n\nGood news! Your order has been shipped and is on the way. You can track its progress using the link below.",
    buttonText: "Track your shipment",
    signoff: "Best,\nThe Lyricalmyrical Team",
    enabled: true
  },
  abandoned_cart: {
    subject: "Did you forget something?",
    body: "Hi {{customer_name}},\n\nWe noticed you left some items in your cart. We've saved them for you, so you can easily complete your purchase whenever you're ready!",
    buttonText: "Resume purchase",
    signoff: "Thanks,\nThe Lyricalmyrical Team",
    enabled: true
  },
  order_cancelled: {
    subject: "Order cancelled: {{order_id}}",
    body: "Hi {{customer_name}},\n\nYour order has been cancelled and you will not be charged. If you have any questions, please contact us.",
    buttonText: "",
    signoff: "Best,\nThe Lyricalmyrical Team",
    enabled: true
  },
  order_refunded: {
    subject: "Order refunded: {{order_id}}",
    body: "Hi {{customer_name}},\n\nWe have successfully refunded CA${{total_price}} for your order. The funds should return to your original payment method in 5-10 business days.",
    buttonText: "",
    signoff: "Best,\nThe Lyricalmyrical Team",
    enabled: true
  },
  customer_welcome: {
    subject: "Welcome to Lyricalmyrical Books!",
    body: "Hi {{customer_name}},\n\nThank you for creating an account with Lyricalmyrical Books! You can now log in to view your orders, save shipping addresses, and download digital library books.",
    buttonText: "Go to your account",
    signoff: "Warmly,\nThe Lyricalmyrical Team",
    enabled: true
  },
  delivery_update: {
    subject: "Delivery Update: Your order is {{status}}",
    body: "Hi {{customer_name}},\n\nYour package tracking status has been updated: {{status}}.\n\nCarrier: {{tracking_carrier}}\nTracking: {{tracking_number}}",
    buttonText: "Track shipment",
    signoff: "Best,\nThe Lyricalmyrical Team",
    enabled: true
  }
};

const TABS = [
  { id: "order_confirmation", label: "Order Paid" },
  { id: "shipping_confirmation", label: "Order Shipped" },
  { id: "abandoned_cart", label: "Abandoned Cart" },
  { id: "order_cancelled", label: "Order Cancelled" },
  { id: "order_refunded", label: "Order Refunded" },
  { id: "customer_welcome", label: "Welcome" },
  { id: "delivery_update", label: "Delivery" }
] as const;

function compilePreviewHtml(templateId: keyof Omit<NotificationSettings, "brand">, data: NotificationSettings) {
  const brand = data.brand || {};
  const logoUrl = brand.logoUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&fit=crop";
  const brandColor = brand.brandColor || "#7C3AED";
  
  const template = data[templateId] || DEFAULT_SETTINGS[templateId];
  const body = template.body || "";
  const buttonText = template.buttonText || "";
  const signoff = template.signoff || "";
  
  let finalBody = body
    .replace(/\{\{customer_name\}\}/g, "Julianne Smith")
    .replace(/\{\{order_id\}\}/g, "LM-98241")
    .replace(/\{\{tracking_carrier\}\}/g, "Canada Post")
    .replace(/\{\{tracking_number\}\}/g, "123456789012")
    .replace(/\{\{total_price\}\}/g, "45.00")
    .replace(/\{\{email\}\}/g, "julianne.smith@gmail.com")
    .replace(/\{\{status\}\}/g, "out for delivery")
    .replace(/\{\{tracking_url\}\}/g, "#")
    .replace(/\{\{cart_url\}\}/g, "#")
    .replace(/\{\{order_url\}\}/g, "#")
    .replace(/\n/g, "<br/>");

  let ctaButtonHtml = "";
  if (buttonText) {
    ctaButtonHtml = `
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="background-color: ${brandColor}; color: #ffffff; padding: 12px 30px; text-decoration: none; font-size: 13px; font-weight: bold; border-radius: 8px; letter-spacing: 0.1em; text-transform: uppercase; display: inline-block;">
          ${buttonText}
        </a>
      </div>
    `;
  }

  let itemsTableHtml = "";
  if (templateId === "order_confirmation" || templateId === "abandoned_cart") {
    itemsTableHtml = `
      <div style="margin: 30px 0; border-top: 1px solid #eeeeee; padding-top: 20px;">
        <h4 style="margin-top: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #888888;">Order Details</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="border-bottom: 1px solid #eeeeee;">
            <td style="padding: 10px 0; font-weight: bold;">Visions of Toronto - Limited Edition (x1)</td>
            <td style="padding: 10px 0; text-align: right; font-family: monospace;">CA$35.00</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666666;">Subtotal</td>
            <td style="padding: 10px 0; text-align: right; font-family: monospace;">CA$35.00</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666666;">Shipping</td>
            <td style="padding: 5px 0; text-align: right; font-family: monospace;">CA$10.00</td>
          </tr>
          <tr style="font-size: 15px; font-weight: bold; border-top: 1px solid #dddddd;">
            <td style="padding: 15px 0;">Total</td>
            <td style="padding: 15px 0; text-align: right; font-family: monospace;">CA$45.00</td>
          </tr>
        </table>
      </div>
    `;
  }

  let signoffHtml = signoff.replace(/\n/g, "<br/>");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f6f6f9;
          color: #333333;
          margin: 0;
          padding: 20px;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          max-height: 40px;
          width: auto;
        }
        .content {
          font-size: 14px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 11px;
          color: #999999;
          border-top: 1px solid #eeeeee;
          padding-top: 20px;
          letter-spacing: 0.05em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" />` : `<h2 style="margin: 0; font-weight: 800; letter-spacing: -0.03em; color: #111;">Lyricalmyrical</h2>`}
        </div>
        <div class="content">
          <p>${finalBody}</p>
          ${ctaButtonHtml}
          ${itemsTableHtml}
          <p style="margin-top: 30px; font-weight: 500; color: #555555;">${signoffHtml}</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Lyricalmyrical Books. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}

export function NotificationEditor() {
  const [data, setData] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<keyof Omit<NotificationSettings, "brand">>("order_confirmation");
  const [saving, setSaving] = useState(false);
  
  // Test Email states
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const docRef = doc(db, "settings", "notifications");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const dbData = snap.data() as any;
        // Merge dbData with default settings to prevent issues with missing fields
        setData({
          brand: { ...DEFAULT_SETTINGS.brand, ...(dbData.brand || {}) },
          order_confirmation: { ...DEFAULT_SETTINGS.order_confirmation, ...(dbData.order_confirmation || {}) },
          shipping_confirmation: { ...DEFAULT_SETTINGS.shipping_confirmation, ...(dbData.shipping_confirmation || {}) },
          abandoned_cart: { ...DEFAULT_SETTINGS.abandoned_cart, ...(dbData.abandoned_cart || {}) },
          order_cancelled: { ...DEFAULT_SETTINGS.order_cancelled, ...(dbData.order_cancelled || {}) },
          order_refunded: { ...DEFAULT_SETTINGS.order_refunded, ...(dbData.order_refunded || {}) },
          customer_welcome: { ...DEFAULT_SETTINGS.customer_welcome, ...(dbData.customer_welcome || {}) },
          delivery_update: { ...DEFAULT_SETTINGS.delivery_update, ...(dbData.delivery_update || {}) }
        });
      } else {
        // Pre-fill general site settings logo if available
        try {
          const generalSnap = await getDoc(doc(db, "settings", "website"));
          if (generalSnap.exists()) {
            const generalData = generalSnap.data();
            const siteLogo = generalData.general?.logoUrl || "";
            setData(prev => ({
              ...prev,
              brand: {
                ...prev.brand,
                logoUrl: siteLogo
              }
            }));
          }
        } catch (err) {
          console.warn("Could not load logo default:", err);
        }
      }
    } catch (err) {
      console.error("Failed to load notifications settings:", err);
      toast.error("Failed to load email notification settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const docRef = doc(db, "settings", "notifications");
      await setDoc(docRef, data);
      toast.success("Notification templates synchronized!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save templates.");
    } finally {
      setSaving(false);
    }
  }

  const handleFieldChange = (field: keyof TemplateFields, val: any) => {
    setData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: val
      }
    }));
  };

  const handleToggleActive = () => {
    const isCurrentlyEnabled = currentTemplate.enabled !== false;
    handleFieldChange("enabled", !isCurrentlyEnabled);
  };

  const handleBrandChange = (field: "logoUrl" | "brandColor", val: string) => {
    setData(prev => ({
      ...prev,
      brand: {
        ...prev.brand,
        [field]: val
      }
    }));
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSendingTest(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Unauthorized: You must be logged in as administrator.");

      const response = await fetch(functionUrl("sendTestEmail"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          templateId: activeTab,
          email: testEmail.trim()
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to send test email.");
      }

      toast.success(`Test email sent to ${testEmail}!`);
    } catch (err: any) {
      console.error("Test Email error:", err);
      toast.error(err.message || "Failed to dispatch test notification.");
    } finally {
      setSendingTest(false);
    }
  };

  const placeholders = {
    order_confirmation: ["{{customer_name}}", "{{order_id}}", "{{order_url}}", "{{items_table}}", "{{total_price}}"],
    shipping_confirmation: ["{{customer_name}}", "{{order_id}}", "{{tracking_carrier}}", "{{tracking_number}}", "{{tracking_url}}"],
    abandoned_cart: ["{{customer_name}}", "{{cart_url}}", "{{items_table}}"],
    order_cancelled: ["{{customer_name}}", "{{order_id}}"],
    order_refunded: ["{{customer_name}}", "{{order_id}}", "{{total_price}}"],
    customer_welcome: ["{{customer_name}}", "{{email}}"],
    delivery_update: ["{{customer_name}}", "{{order_id}}", "{{status}}", "{{tracking_carrier}}", "{{tracking_number}}", "{{tracking_url}}"]
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-2 border-violet-500/10 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-[10px] tracking-[0.4em] text-slate-500 font-black uppercase">Retrieving Notification Schema</p>
      </div>
    );
  }

  const currentTemplate = data[activeTab] || DEFAULT_SETTINGS[activeTab];

  return (
    <div className="space-y-16">
      <header className="flex flex-col gap-2 mb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic leading-none">Notifications</h2>
            <p className="text-xs text-slate-400 tracking-[0.3em] uppercase mt-4 font-bold">Visual Email & CRM Templates</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 text-white px-12 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] shadow-2xl shadow-violet-600/40 hover:bg-violet-500 transition-all disabled:opacity-50 active:scale-95 border border-violet-400/20"
          >
            {saving ? 'SYNCHRONIZING...' : 'PUBLISH NOTIFICATIONS'}
          </button>
        </div>
      </header>

      {/* Brand Identity settings */}
      <section className="glass-card rounded-[3rem] p-12 border border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-8">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="text-cyan-400" size={18} />
            <h4 className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-400">Global Notifications Brand Settings</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Brand Logo URL</label>
              <input
                type="text"
                value={data.brand?.logoUrl || ""}
                onChange={(e) => handleBrandChange("logoUrl", e.target.value)}
                placeholder="e.g. https://domain.com/logo.png"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Brand Accent Color</label>
              <div className="flex gap-4">
                <input
                  type="color"
                  value={data.brand?.brandColor || "#7C3AED"}
                  onChange={(e) => handleBrandChange("brandColor", e.target.value)}
                  className="w-14 h-12 bg-white/5 border border-white/10 rounded-xl p-1 outline-none cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={data.brand?.brandColor || ""}
                  onChange={(e) => handleBrandChange("brandColor", e.target.value)}
                  placeholder="#7C3AED"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-cyan-500/50 uppercase font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Split-screen layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left Form */}
        <section className="glass-card rounded-[3.5rem] p-12 border border-white/5 space-y-10">
          {/* Tab buttons */}
          <div className="flex border-b border-white/5 pb-2 gap-4 overflow-x-auto shrink-0 scrollbar-thin">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Auto fill test email with current user email if empty
                  if (!testEmail && auth.currentUser?.email) {
                    setTestEmail(auth.currentUser.email);
                  }
                }}
                className={`pb-4 text-[10px] uppercase tracking-[0.2em] font-black transition-all shrink-0 ${
                  activeTab === tab.id 
                    ? "text-violet-400 border-b-2 border-violet-500" 
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            {/* Active Switcher */}
            <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-355">Automated Dispatch</h4>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">Trigger this email automatically on state change</p>
              </div>
              <button
                type="button"
                onClick={handleToggleActive}
                className={`w-14 h-8 rounded-full transition-all duration-300 relative border ${
                  currentTemplate.enabled !== false 
                    ? "bg-violet-600 border-violet-500" 
                    : "bg-white/5 border-white/10"
                }`}
              >
                <motion.div
                  animate={{ x: currentTemplate.enabled !== false ? 26 : 4 }}
                  className="w-5 h-5 bg-white rounded-full absolute top-1"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Email Subject Line</label>
              <input
                type="text"
                value={currentTemplate.subject}
                onChange={(e) => handleFieldChange("subject", e.target.value)}
                placeholder="Subject line"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-violet-500/50"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Email Body Copy</label>
              <textarea
                rows={6}
                value={currentTemplate.body}
                onChange={(e) => handleFieldChange("body", e.target.value)}
                placeholder="Write your email body here..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-violet-500/50 resize-y min-h-[120px]"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">CTA Button Text (Leave blank to hide button)</label>
              <input
                type="text"
                value={currentTemplate.buttonText}
                onChange={(e) => handleFieldChange("buttonText", e.target.value)}
                placeholder="View details"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-violet-500/50"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-600 ml-1">Sign-off text</label>
              <textarea
                rows={2}
                value={currentTemplate.signoff}
                onChange={(e) => handleFieldChange("signoff", e.target.value)}
                placeholder="Thanks,"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-violet-500/50 resize-y min-h-[60px]"
              />
            </div>

            {/* Placeholders helper */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-4">
              <div className="flex items-center gap-3">
                <Info size={14} className="text-violet-400" />
                <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Available Placeholders</h5>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(placeholders[activeTab] || []).map(placeholder => (
                  <span
                    key={placeholder}
                    onClick={() => {
                      handleFieldChange("body", currentTemplate.body + " " + placeholder);
                      toast.success(`Appended ${placeholder}`);
                    }}
                    className="cursor-pointer bg-white/5 hover:bg-violet-500/20 hover:text-violet-400 border border-white/5 hover:border-violet-500/30 px-3 py-1.5 rounded-lg text-[9px] font-mono text-slate-400 transition-all"
                  >
                    {placeholder}
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-slate-500 italic mt-2 leading-relaxed">
                Click any bubble to append the placeholder code directly to your email body copy.
              </p>
            </div>

            {/* Send Test Email Card */}
            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] space-y-6">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-violet-400" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Send Test Notification</h4>
              </div>
              <div className="flex gap-4">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="e.g. admin@example.com"
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white outline-none focus:border-violet-500/50"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || !testEmail}
                  className="px-8 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-2xl text-[9px] font-black tracking-widest uppercase transition-all shrink-0 active:scale-95 border border-violet-400/20"
                >
                  {sendingTest ? "SENDING..." : "SEND TEST"}
                </button>
              </div>
              <p className="text-[9px] text-slate-500 leading-relaxed uppercase tracking-wider">
                Send a mock email of this template to verify style rendering and variable interpolation.
              </p>
            </div>
          </div>
        </section>

        {/* Right Iframe Live Preview */}
        <section className="glass-card rounded-[3.5rem] p-12 border border-white/5 space-y-8 lg:sticky lg:top-28">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Mail className="text-violet-400" size={18} />
              <h4 className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-400">Live Mock Viewport</h4>
            </div>
            <span className="text-[8px] font-black tracking-widest text-slate-500 uppercase bg-white/5 border border-white/5 px-3 py-1 rounded-full">
              Compiled HTML
            </span>
          </div>

          <div className="w-full bg-[#17171A] border border-white/10 rounded-[2rem] overflow-hidden aspect-[4/5] shadow-2xl flex flex-col">
            {/* Window title bar mockup */}
            <div className="bg-[#212124] px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 max-w-[200px] truncate">
                {currentTemplate.subject.replace(/\{\{order_id\}\}/g, "LM-98241").replace(/\{\{status\}\}/g, "out for delivery")}
              </p>
              <div className="w-12 h-1 bg-white/5 rounded-full" />
            </div>

            <iframe
              srcDoc={compilePreviewHtml(activeTab, data)}
              className="w-full flex-1 border-none bg-white rounded-b-[2rem]"
              title="Visual template live preview"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
