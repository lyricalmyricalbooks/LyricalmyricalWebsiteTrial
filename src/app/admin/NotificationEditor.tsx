import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { functionUrl } from "../lib/functionsBase";
import toast from "react-hot-toast";
import {
  LoadingState, PrimaryButton, SaveBar, SectionCard, SectionHead, SecondaryButton, StatusBadge, Tabs, TextArea, TextField, Toggle,
} from "./riso/components";

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
    resendApiKey?: string;
  };
  order_confirmation: TemplateFields;
  shipping_confirmation: TemplateFields;
  abandoned_cart: TemplateFields;
  order_cancelled: TemplateFields;
  order_refunded: TemplateFields;
  customer_welcome: TemplateFields;
  delivery_update: TemplateFields;
  contact_reply: TemplateFields;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  brand: {
    logoUrl: "",
    brandColor: "#7C3AED",
    resendApiKey: ""
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
  contact_reply: {
    subject: "We got your message",
    body: "Hi {{customer_name}},\n\nThanks for getting in touch with Lyricalmyrical Books! We've received your message and will reply as soon as we can.\n\nYour message:\n{{message}}",
    buttonText: "",
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
  { id: "delivery_update", label: "Delivery" },
  { id: "contact_reply", label: "Message received" }
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
    .replace(/\{\{subject\}\}/g, "Stocking your books")
    .replace(/\{\{message\}\}/g, "Hello! Do you sell wholesale to independent bookshops?")
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
  const [original, setOriginal] = useState("");
  const [resendDraft, setResendDraft] = useState("");
  const [group, setGroup] = useState<"orders" | "cart" | "account" | "contact">("orders");
  
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
        const loaded = {
          brand: { ...DEFAULT_SETTINGS.brand, ...(dbData.brand || {}) },
          order_confirmation: { ...DEFAULT_SETTINGS.order_confirmation, ...(dbData.order_confirmation || {}) },
          shipping_confirmation: { ...DEFAULT_SETTINGS.shipping_confirmation, ...(dbData.shipping_confirmation || {}) },
          abandoned_cart: { ...DEFAULT_SETTINGS.abandoned_cart, ...(dbData.abandoned_cart || {}) },
          order_cancelled: { ...DEFAULT_SETTINGS.order_cancelled, ...(dbData.order_cancelled || {}) },
          order_refunded: { ...DEFAULT_SETTINGS.order_refunded, ...(dbData.order_refunded || {}) },
          customer_welcome: { ...DEFAULT_SETTINGS.customer_welcome, ...(dbData.customer_welcome || {}) },
          delivery_update: { ...DEFAULT_SETTINGS.delivery_update, ...(dbData.delivery_update || {}) },
          contact_reply: { ...DEFAULT_SETTINGS.contact_reply, ...(dbData.contact_reply || {}) }
        };
        setData(loaded);
        setOriginal(JSON.stringify(loaded));
      } else {
        setOriginal(JSON.stringify(DEFAULT_SETTINGS));
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
      setOriginal(JSON.stringify(DEFAULT_SETTINGS));
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
      setOriginal(JSON.stringify(data));
      setResendDraft("");
      toast.success("Notification templates saved");
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

  const handleBrandChange = (field: "logoUrl" | "brandColor" | "resendApiKey", val: string) => {
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
    delivery_update: ["{{customer_name}}", "{{order_id}}", "{{status}}", "{{tracking_carrier}}", "{{tracking_number}}", "{{tracking_url}}"],
    contact_reply: ["{{customer_name}}", "{{email}}", "{{subject}}", "{{message}}"]
  };

  if (loading) return <LoadingState label="Loading notification templates…" />;

  const currentTemplate = data[activeTab] || DEFAULT_SETTINGS[activeTab];
  const dirty = JSON.stringify(data) !== original;
  const GROUPS = {
    orders: { label: "Orders", ids: ["order_confirmation", "shipping_confirmation", "delivery_update", "order_cancelled", "order_refunded"] },
    cart: { label: "Cart", ids: ["abandoned_cart"] },
    account: { label: "Account", ids: ["customer_welcome"] },
    contact: { label: "Contact form", ids: ["contact_reply"] },
  } as const;
  const groupTabs = TABS.filter((t) => (GROUPS[group].ids as readonly string[]).includes(t.id));
  const pickGroup = (g: "orders" | "cart" | "account" | "contact") => {
    setGroup(g);
    setActiveTab(GROUPS[g].ids[0] as any);
    if (!testEmail && auth.currentUser?.email) setTestEmail(auth.currentUser.email);
  };
  const enabled = currentTemplate.enabled !== false;
  const subjectPreview = currentTemplate.subject.replace(/\{\{order_id\}\}/g, "LM-98241").replace(/\{\{status\}\}/g, "out for delivery");

  return (
    <div className="rp-stack">
      <SectionCard title="Email branding" description="Shared by every customer and administrator email.">
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <TextField label="Brand logo URL" value={data.brand?.logoUrl || ""} placeholder="https://domain.com/logo.png" onChange={(e) => handleBrandChange("logoUrl", e.target.value)} />
          <div className="rp-field">
            <label className="rp-label" htmlFor="brand-color">Brand accent color</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="brand-color" type="color" aria-label="Pick brand accent color" value={data.brand?.brandColor || "#7C3AED"} onChange={(e) => handleBrandChange("brandColor", e.target.value)}
                style={{ width: 48, height: 44, padding: 2, border: "1px solid var(--rp-border)", background: "var(--rp-input-bg)" }} />
              <input className="rp-input rp-mono" aria-label="Brand accent color hex" value={data.brand?.brandColor || ""} placeholder="#7C3AED" onChange={(e) => handleBrandChange("brandColor", e.target.value)} />
            </div>
          </div>
          <TextField label="Resend API key" type="password" value={resendDraft}
            placeholder={data.brand?.resendApiKey ? "Stored — enter a new key to replace it" : "re_…"}
            hint={data.brand?.resendApiKey ? "✓ A key is stored. It is never shown here." : "Optional if the RESEND_API_KEY Functions secret is set."}
            onChange={(e) => { setResendDraft(e.target.value); if (e.target.value.trim()) handleBrandChange("resendApiKey", e.target.value.trim()); }} />
        </div>
        {data.brand?.resendApiKey && (
          <p role="alert" className="rp-hint" style={{ margin: "12px 0 0", padding: 12, background: "var(--rp-warning-tint)", color: "var(--rp-warning)", border: "1px solid var(--rp-warning)" }}>
            ⚠ This key is saved in a settings document the storefront can read. Prefer the RESEND_API_KEY Firebase Functions secret, then rotate this key.
          </p>
        )}
      </SectionCard>

      <div>
        <SectionHead kicker="Templates" title="Customer & admin emails" subcopy="Pick an event, edit its copy, and check the live preview." />
        <Tabs label="Event group" value={group} onChange={pickGroup} tabs={(Object.keys(GROUPS) as Array<keyof typeof GROUPS>).map((g) => ({ id: g, label: GROUPS[g].label }))} />
        {groupTabs.length > 1 && (
          <div style={{ marginTop: 12 }}>
            <Tabs label="Email template" value={activeTab as any} onChange={(id) => setActiveTab(id as any)} tabs={groupTabs.map((t) => ({ id: t.id, label: t.label })) as any} />
          </div>
        )}
      </div>

      <div className="rp-split" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))" }}>
        <SectionCard title={TABS.find((t) => t.id === activeTab)?.label || "Template"}
          actions={<StatusBadge tone={enabled ? "success" : "neutral"}>{enabled ? "Sending" : "Paused"}</StatusBadge>}>
          <div className="rp-stack" style={{ gap: 20 }}>
            <Toggle label="Send this email automatically" checked={enabled} onChange={() => handleToggleActive()} />
            <TextField label="Subject line" value={currentTemplate.subject} placeholder="Subject line" onChange={(e) => handleFieldChange("subject", e.target.value)} />
            <TextArea label="Body copy" rows={7} value={currentTemplate.body} placeholder="Write your email body here…" onChange={(e) => handleFieldChange("body", e.target.value)} />
            <TextField label="Button text" value={currentTemplate.buttonText} placeholder="View details" hint="Leave blank to hide the button." onChange={(e) => handleFieldChange("buttonText", e.target.value)} />
            <TextArea label="Sign-off" rows={2} value={currentTemplate.signoff} placeholder="Thanks," style={{ minHeight: 64 }} onChange={(e) => handleFieldChange("signoff", e.target.value)} />

            <div>
              <div className="rp-sect">Placeholders</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(placeholders[activeTab] || []).map((ph) => (
                  <button key={ph} type="button" className="rp-btn rp-btn-secondary rp-btn-sm rp-mono" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}
                    onClick={() => { handleFieldChange("body", currentTemplate.body + " " + ph); toast.success(`Added ${ph}`); }}>{ph}</button>
                ))}
              </div>
              <p className="rp-hint" style={{ margin: "8px 0 0" }}>Select a placeholder to add it to the end of the body copy.</p>
            </div>

            <div className="rp-card" style={{ padding: 16, boxShadow: "none", background: "var(--rp-surface-sunken)" }}>
              <div className="rp-sect">Send a test</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 220px" }}>
                  <TextField label="Send test to" type="email" value={testEmail} placeholder="admin@example.com" onChange={(e) => setTestEmail(e.target.value)} />
                </div>
                <SecondaryButton onClick={handleSendTestEmail} disabled={sendingTest || !testEmail}>{sendingTest ? "Sending…" : "Send test"}</SecondaryButton>
              </div>
              <p className="rp-hint" style={{ margin: "8px 0 0" }}>Sends the last saved version of this template with sample order details. Save first to test your edits.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Live preview" description={subjectPreview}>
          <iframe srcDoc={compilePreviewHtml(activeTab, data)} sandbox="" title={`Preview of the ${TABS.find((t) => t.id === activeTab)?.label} email`}
            style={{ width: "100%", height: 560, border: "2px solid var(--rp-border-strong)", background: "#fff" }} />
        </SectionCard>
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave}
        onDiscard={() => { setData(JSON.parse(original)); setResendDraft(""); }} message="You have unsaved template changes." />
    </div>
  );
}
