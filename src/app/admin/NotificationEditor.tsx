import { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { functionFetch } from "../lib/functionsBase";
import toast from "react-hot-toast";
import { risoButton, risoLayout } from "./emailTheme";
import { GmailSendingCard } from "./GmailSendingCard";
import { emailLogBadge, emailLogDetail } from "./emailLogDisplay";
import { adminApi } from "./api";
import {
  DataTable, GhostButton, LoadingState, PrimaryButton, SaveBar, SectionCard, SectionHead, SecondaryButton, SelectField, StatusBadge, Tabs, TextArea, TextField, Toggle,
} from "./riso/components";

type TemplateFields = {
  subject: string;
  body: string;
  buttonText: string;
  signoff: string;
  enabled?: boolean;
};

type EmailLogEntry = {
  id: string;
  at?: string;
  to?: string;
  subject?: string;
  /** "fallback" = Gmail missed and the backup sender (Resend) was tried; the next row has the outcome. */
  status?: "sent" | "failed" | "fallback" | "bounced" | "complained";
  error?: string;
  note?: string;
  keySource?: string;
};

type NotificationSettings = {
  brand: {
    logoUrl: string;
    brandColor: string;
    emailTheme?: "light" | "dark";
    resendApiKey?: string;
    resendApiKeyStored?: boolean;
  };
  order_confirmation: TemplateFields;
  order_pending_payment: TemplateFields;
  shipping_confirmation: TemplateFields;
  abandoned_cart: TemplateFields;
  order_cancelled: TemplateFields;
  order_refunded: TemplateFields;
  customer_welcome: TemplateFields;
  delivery_update: TemplateFields;
  contact_reply: TemplateFields;
  gift_card: TemplateFields;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  brand: {
    logoUrl: "",
    brandColor: "#e8402a",
    emailTheme: "light",
    resendApiKey: ""
  },
  order_confirmation: {
    subject: "Order confirmed: {{order_id}}",
    body: "Hi {{customer_name}},\n\nThank you for your purchase! We've received your order and are preparing it for shipment. We will send you another email when it has shipped.",
    buttonText: "View your order",
    signoff: "Thanks,\nThe Lyricalmyrical Team",
    enabled: true
  },
  order_pending_payment: {
    subject: "Order received — payment needed: {{order_id}}",
    body: "Hi {{customer_name}},\n\nThank you for your order! It is reserved for you, but it is not paid yet. Please pay {{total_price}} by {{payment_method}} using the instructions below. We'll confirm by email as soon as your payment arrives and then prepare your order.",
    buttonText: "View your order",
    signoff: "Thanks,\nThe Lyricalmyrical Team",
    enabled: true
  },
  shipping_confirmation: {
    subject: "Your order is on the way!",
    body: "Hi {{customer_name}},\n\nGood news! Your order {{order_id}} has shipped with {{tracking_carrier}} and is on its way.\n\nTracking number: {{tracking_number}}\n\nUse the button below to follow your parcel on the carrier's website.",
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
    body: "Hi {{customer_name}},\n\nWe have successfully refunded {{total_price}} for your order. The funds should return to your original payment method in 5-10 business days.",
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
    body: "Hi {{customer_name}},\n\nThanks for getting in touch with Lyricalmyrical Books! We've received your message and will reply as soon as we can.",
    buttonText: "",
    signoff: "Warmly,\nThe Lyricalmyrical Team",
    enabled: true
  },
  gift_card: {
    subject: "You've received a {{amount}} gift card",
    body: "Hi {{recipient_name}},\n\n{{sender_name}} sent you a {{amount}} gift card for Lyricalmyrical Books.\n\n{{message}}\n\nYour gift card code: {{code}}\n\nEnter this code at checkout to use it. Any balance left over stays on the card for next time. {{expires}}",
    buttonText: "Shop now",
    signoff: "Happy reading,\nThe Lyricalmyrical Team",
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
  { id: "order_pending_payment", label: "Awaiting Payment" },
  { id: "shipping_confirmation", label: "Order Shipped" },
  { id: "abandoned_cart", label: "Abandoned Cart" },
  { id: "order_cancelled", label: "Order Cancelled" },
  { id: "order_refunded", label: "Order Refunded" },
  { id: "customer_welcome", label: "Welcome" },
  { id: "delivery_update", label: "Delivery" },
  { id: "contact_reply", label: "Message received" },
  { id: "gift_card", label: "Gift card" }
] as const;

function compilePreviewHtml(templateId: keyof Omit<NotificationSettings, "brand">, data: NotificationSettings) {
  const brand = data.brand || {};
  const brandColor = brand.brandColor || "#e8402a";
  
  const template = data[templateId] || DEFAULT_SETTINGS[templateId];
  const body = template.body || "";
  const buttonText = template.buttonText || "";
  const signoff = template.signoff || "";
  
  let finalBody = body
    .replace(/\{\{customer_name\}\}/g, "Julianne Smith")
    .replace(/\{\{order_id\}\}/g, "LM-98241")
    .replace(/\{\{tracking_carrier\}\}/g, "Canada Post")
    .replace(/\{\{tracking_number\}\}/g, "123456789012")
    .replace(/\{\{total_price\}\}/g, "CA$45.00")
    .replace(/\{\{payment_method\}\}/g, "Interac e-Transfer")
    .replace(/\{\{email\}\}/g, "julianne.smith@gmail.com")
    .replace(/\{\{status\}\}/g, "out for delivery")
    .replace(/\{\{subject\}\}/g, "Stocking your books")
    .replace(/\{\{message\}\}/g, templateId === "gift_card" ? "Happy birthday! Enjoy something new to read." : "Hello! Do you sell wholesale to independent bookshops?")
    .replace(/\{\{tracking_url\}\}/g, "#")
    .replace(/\{\{cart_url\}\}/g, "#")
    .replace(/\{\{order_url\}\}/g, "#")
    .replace(/\{\{shipping_method\}\}/g, "Canada Post Expedited Parcel")
    .replace(/\{\{delivery_estimate\}\}/g, "2-4 business days after dispatch")
    .replace(/\{\{recipient_name\}\}/g, "Sam")
    .replace(/\{\{sender_name\}\}/g, "Julianne")
    .replace(/\{\{amount\}\}/g, "CA$50.00")
    .replace(/\{\{code\}\}/g, "ABCD-EFGH-JKMN-PQRS")
    .replace(/\{\{expires\}\}/g, "It never expires.")
    .replace(/\{\{shop_url\}\}/g, "#")
    .replace(/\n/g, "<br/>");

  const ctaButtonHtml = buttonText ? risoButton("#", buttonText, brandColor, brand.emailTheme) : "";

  let itemsTableHtml = "";
  if (templateId === "order_confirmation" || templateId === "order_pending_payment" || templateId === "abandoned_cart") {
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

  return risoLayout(`
    <p style="margin-top:0;">${finalBody}</p>
    ${ctaButtonHtml}
    ${itemsTableHtml}
    <p style="margin-top:30px;font-weight:600;">${signoffHtml}</p>
  `, { logoUrl: brand.logoUrl || "", accent: brandColor, theme: brand.emailTheme });
}

export function NotificationEditor() {
  const [data, setData] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<keyof Omit<NotificationSettings, "brand">>("order_confirmation");
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState("");
  const [resendDraft, setResendDraft] = useState("");
  const [group, setGroup] = useState<"orders" | "cart" | "account" | "contact" | "giftCards">("orders");
  
  // Test Email states
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [deliveries, setDeliveries] = useState<EmailLogEntry[] | null>(null);
  const [deliveriesError, setDeliveriesError] = useState("");

  useEffect(() => {
    loadSettings();
    loadDeliveries();
    // Default the test recipient to the signed-in admin so Send test works straight away.
    if (auth.currentUser?.email) setTestEmail((prev) => prev || auth.currentUser?.email || "");
  }, []);

  async function loadDeliveries() {
    try {
      const snap = await getDocs(query(collection(db, "emailLog"), orderBy("at", "desc"), limit(15)));
      setDeliveries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setDeliveriesError("");
    } catch (err: any) {
      console.warn("Could not load email delivery log:", err);
      setDeliveries([]);
      setDeliveriesError(err?.code === "permission-denied"
        ? "The delivery log needs the latest Firestore rules deployed."
        : "Could not load recent deliveries.");
    }
  }

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
          order_pending_payment: { ...DEFAULT_SETTINGS.order_pending_payment, ...(dbData.order_pending_payment || {}) },
          shipping_confirmation: { ...DEFAULT_SETTINGS.shipping_confirmation, ...(dbData.shipping_confirmation || {}) },
          abandoned_cart: { ...DEFAULT_SETTINGS.abandoned_cart, ...(dbData.abandoned_cart || {}) },
          order_cancelled: { ...DEFAULT_SETTINGS.order_cancelled, ...(dbData.order_cancelled || {}) },
          order_refunded: { ...DEFAULT_SETTINGS.order_refunded, ...(dbData.order_refunded || {}) },
          customer_welcome: { ...DEFAULT_SETTINGS.customer_welcome, ...(dbData.customer_welcome || {}) },
          delivery_update: { ...DEFAULT_SETTINGS.delivery_update, ...(dbData.delivery_update || {}) },
          contact_reply: { ...DEFAULT_SETTINGS.contact_reply, ...(dbData.contact_reply || {}) },
          gift_card: { ...DEFAULT_SETTINGS.gift_card, ...(dbData.gift_card || {}) }
        };
        if (dbData.brand?.resendApiKey || dbData.resendApiKey) {
          // Older saves left the key in the public doc: move it to adminSecrets now.
          await adminApi.saveNotificationSettings({ ...dbData, brand: { ...(dbData.brand || {}), resendApiKey: dbData.brand?.resendApiKey || dbData.resendApiKey } }).catch(err => console.warn("Could not move Resend key:", err));
          loaded.brand.resendApiKey = "";
        }
        loaded.brand.resendApiKeyStored = (await adminApi.getPrivateKeyFlags()).resend;
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
      await adminApi.saveNotificationSettings(data);
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

  const handleBrandChange = (field: "logoUrl" | "brandColor" | "emailTheme" | "resendApiKey", val: string) => {
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
      setTestResult({ ok: false, message: "Enter the email address the test should go to." });
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Unauthorized: You must be logged in as administrator.");

      const response = await functionFetch("sendTestEmail", {
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
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `The email service answered ${response.status}. Check that Cloud Functions are deployed.`);
      }

      setTestResult({ ok: true, message: `Sent to ${testEmail.trim()}. Check that inbox (and its spam folder).` });
      toast.success(`Test email sent to ${testEmail}!`);
    } catch (err: any) {
      console.error("Test Email error:", err);
      const message = err?.name === "TypeError"
        ? "Could not reach the email service. Check your connection, or that the sendTestEmail function is deployed."
        : (err.message || "Failed to dispatch test notification.");
      setTestResult({ ok: false, message });
      toast.error("Test email was not sent.");
    } finally {
      setSendingTest(false);
      loadDeliveries();
    }
  };

  const placeholders = {
    order_confirmation: ["{{customer_name}}", "{{order_id}}", "{{order_url}}", "{{items_table}}", "{{total_price}}", "{{shipping_method}}", "{{delivery_estimate}}"],
    order_pending_payment: ["{{customer_name}}", "{{order_id}}", "{{total_price}}", "{{payment_method}}", "{{items_table}}"],
    shipping_confirmation: ["{{customer_name}}", "{{order_id}}", "{{tracking_carrier}}", "{{tracking_number}}", "{{tracking_url}}"],
    abandoned_cart: ["{{customer_name}}", "{{cart_url}}", "{{items_table}}"],
    order_cancelled: ["{{customer_name}}", "{{order_id}}"],
    order_refunded: ["{{customer_name}}", "{{order_id}}", "{{total_price}}"],
    customer_welcome: ["{{customer_name}}", "{{email}}"],
    delivery_update: ["{{customer_name}}", "{{order_id}}", "{{status}}", "{{tracking_carrier}}", "{{tracking_number}}", "{{tracking_url}}"],
    contact_reply: ["{{customer_name}}", "{{email}}"],
    gift_card: ["{{recipient_name}}", "{{sender_name}}", "{{amount}}", "{{code}}", "{{message}}", "{{expires}}", "{{shop_url}}"]
  };

  if (loading) return <LoadingState label="Loading notification templates…" />;

  const currentTemplate = data[activeTab] || DEFAULT_SETTINGS[activeTab];
  const dirty = JSON.stringify(data) !== original;
  const GROUPS = {
    orders: { label: "Orders", ids: ["order_confirmation", "shipping_confirmation", "delivery_update", "order_cancelled", "order_refunded"] },
    cart: { label: "Cart", ids: ["abandoned_cart"] },
    account: { label: "Account", ids: ["customer_welcome"] },
    contact: { label: "Contact form", ids: ["contact_reply"] },
    giftCards: { label: "Gift cards", ids: ["gift_card"] },
  } as const;
  const groupTabs = TABS.filter((t) => (GROUPS[group].ids as readonly string[]).includes(t.id));
  const pickGroup = (g: "orders" | "cart" | "account" | "contact" | "giftCards") => {
    setGroup(g);
    setActiveTab(GROUPS[g].ids[0] as any);
    if (!testEmail && auth.currentUser?.email) setTestEmail(auth.currentUser.email);
  };
  const enabled = currentTemplate.enabled !== false;
  const subjectPreview = currentTemplate.subject.replace(/\{\{order_id\}\}/g, "LM-98241").replace(/\{\{status\}\}/g, "out for delivery").replace(/\{\{amount\}\}/g, "CA$50.00");

  return (
    <div className="rp-stack">
      <SectionCard title="Email branding" description="Shared by every customer and administrator email.">
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <TextField label="Brand logo URL" value={data.brand?.logoUrl || ""} placeholder="https://domain.com/logo.png" onChange={(e) => handleBrandChange("logoUrl", e.target.value)} />
          <div className="rp-field">
            <label className="rp-label" htmlFor="brand-color">Brand accent color</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="brand-color" type="color" aria-label="Pick brand accent color" value={data.brand?.brandColor || "#e8402a"} onChange={(e) => handleBrandChange("brandColor", e.target.value)}
                style={{ width: 48, height: 44, padding: 2, border: "1px solid var(--rp-border)", background: "var(--rp-input-bg)" }} />
              <input className="rp-input rp-mono" aria-label="Brand accent color hex" value={data.brand?.brandColor || ""} placeholder="#e8402a" onChange={(e) => handleBrandChange("brandColor", e.target.value)} />
            </div>
          </div>
          <SelectField label="Email theme" value={data.brand?.emailTheme === "dark" ? "dark" : "light"} onChange={(e) => handleBrandChange("emailTheme", e.target.value)}
            hint="Riso Press look: Light = cream paper, ink text · Dark = black paper, white text.">
            <option value="light">Light (newsprint)</option>
            <option value="dark">Dark (Riso Noir)</option>
          </SelectField>
          <TextField label="Resend API key" type="password" value={resendDraft}
            placeholder={(data.brand?.resendApiKey || data.brand?.resendApiKeyStored) ? "Stored — enter a new key to replace it" : "re_…"}
            hint={(data.brand?.resendApiKey || data.brand?.resendApiKeyStored) ? "✓ A key is stored. It is never shown here." : "Optional if the RESEND_API_KEY Functions secret is set."}
            onChange={(e) => { setResendDraft(e.target.value); if (e.target.value.trim()) handleBrandChange("resendApiKey", e.target.value.trim()); }} />
        </div>
        {(data.brand?.resendApiKey || data.brand?.resendApiKeyStored) && (
          <p className="rp-hint" style={{ margin: "12px 0 0" }}>
            🔒 Kept in an admin-only store the storefront cannot read. If this key was ever saved before October 2026, rotate it in Resend.
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
                <SecondaryButton onClick={handleSendTestEmail} disabled={sendingTest}>{sendingTest ? "Sending…" : "Send test"}</SecondaryButton>
              </div>
              {testResult && (
                <p role="status" className="rp-hint" style={{ margin: "12px 0 0", padding: 12, border: `1px solid var(${testResult.ok ? "--rp-success" : "--rp-danger"})`, color: `var(${testResult.ok ? "--rp-success" : "--rp-danger"})`, background: `var(${testResult.ok ? "--rp-success-tint" : "--rp-danger-tint"})` }}>
                  {testResult.ok ? "✓ " : "✕ "}{testResult.message}
                </p>
              )}
              <p className="rp-hint" style={{ margin: "8px 0 0" }}>Sends the last saved version of this template with sample order details. Save first to test your edits.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Live preview" description={subjectPreview}>
          <iframe srcDoc={compilePreviewHtml(activeTab, data)} sandbox="" title={`Preview of the ${TABS.find((t) => t.id === activeTab)?.label} email`}
            style={{ width: "100%", height: 560, border: "2px solid var(--rp-border-strong)", background: "#fff" }} />
        </SectionCard>
      </div>

      <GmailSendingCard />

      <SectionCard title="Recent deliveries" description="Every email the shop tried to send, newest first. A failed row says what to fix."
        actions={<GhostButton onClick={loadDeliveries}>Refresh</GhostButton>} flush>
        <DataTable<EmailLogEntry> caption="Recent email deliveries" rows={deliveries || []} rowKey={(r) => r.id}
          rowState={(r) => (r.status === "failed" ? "failed" : undefined)}
          empty={<p className="rp-hint" style={{ margin: 0, padding: 16 }}>{deliveriesError || (deliveries === null ? "Loading…" : "No emails recorded yet. Send a test to check the setup.")}</p>}
          columns={[
            { key: "status", header: "Status", render: (r) => { const badge = emailLogBadge(r); return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>; } },
            { key: "when", header: "When", render: (r) => (r.at ? new Date(r.at).toLocaleString() : "—") },
            { key: "to", header: "To", lead: true, render: (r) => r.to || "—" },
            { key: "subject", header: "Subject", render: (r) => r.subject || "—" },
            { key: "detail", header: "Detail", render: (r) => <span style={{ whiteSpace: "normal" }}>{emailLogDetail(r)}</span> },
          ]} />
      </SectionCard>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave}
        onDiscard={() => { setData(JSON.parse(original)); setResendDraft(""); }} message="You have unsaved template changes." />
    </div>
  );
}
