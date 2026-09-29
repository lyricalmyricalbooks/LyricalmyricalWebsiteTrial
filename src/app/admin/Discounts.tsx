import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { adminApi } from "./api";
import toast from "react-hot-toast";
import { CATEGORIES } from "../features/site/constants";
import { discountState as state, today } from "./discountState";
import { validateDiscountDraft } from "./discountValidation";
import {
  ActionMenu, Checkbox, ConfirmDialog, DataTable, Dialog, EmptyState, ErrorState, FilterBar, IconButton, LoadingState,
  MetricCard, PrimaryButton, SearchField, SecondaryButton, SectionCard, SelectField, StatusBadge, TextArea, TextField,
  Tabs, Toggle, type BadgeTone, type Column,
} from "./riso/components";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) => (n != null && n !== ("" as any) ? `$${Number(n).toFixed(2)}` : "—");

const TYPE_OPTIONS = [
  { id: "percentage", label: "Percentage", desc: "e.g. 20% off" },
  { id: "fixed", label: "Fixed amount", desc: "e.g. $10 off" },
  { id: "freeship", label: "Free shipping", desc: "Waive shipping cost" },
  { id: "bogo", label: "Buy X get Y", desc: "BOGO offers" },
  { id: "tiered", label: "Tiered spend", desc: "Bigger spend, bigger discount" },
];

const EMPTY: any = {
  code: "", type: "percentage", value: 10, isActive: true, expiryDate: "", minOrderAmount: "", minQuantity: "",
  usageLimit: "", onePerCustomer: false, appliesTo: "all", selectedCategories: [], selectedProducts: [],
  allowedEmailDomains: "", allowedCustomerEmails: "", description: "", buyQuantity: 1, getQuantity: 1,
  getDiscountValue: 100, tiers: [{ minSpend: 0, value: 0, type: "percentage" }],
};

function valueLabel(d: any) {
  switch (d.type) {
    case "percentage": return `${d.value}% off`;
    case "fixed": return `${fmt(d.value)} off`;
    case "freeship": return "Free shipping";
    case "bogo": return `Buy ${d.buyQuantity || 1} get ${d.getQuantity || 1} (${d.getDiscountValue ?? 100}% off)`;
    case "tiered": return `Tiered (${d.tiers?.length || 0} tiers)`;
    default: return String(d.type);
  }
}

function targetLabel(d: any) {
  if (d.appliesTo === "categories" && d.selectedCategories?.length) return d.selectedCategories.join(", ");
  if (d.appliesTo === "products" && d.selectedProducts?.length) return `${d.selectedProducts.length} book${d.selectedProducts.length === 1 ? "" : "s"}`;
  return "All products";
}

// ─── Create / edit dialog ─────────────────────────────────────────────────────

function DiscountDialog({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<any>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [books, setBooks] = useState<any[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  useEffect(() => {
    adminApi.getBooks(100).then(setBooks).catch(() => setBooks([]));
  }, []);

  const validate = () => {
    const e = validateDiscountDraft(form);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { toast.error("Fix the highlighted fields first"); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        code: form.code.toUpperCase().trim(),
        value: form.type === "freeship" ? 0 : Number(form.value) || 0,
        minOrderAmount: form.minOrderAmount !== "" ? Number(form.minOrderAmount) : null,
        minQuantity: form.minQuantity !== "" ? Number(form.minQuantity) : null,
        usageLimit: form.usageLimit !== "" ? Number(form.usageLimit) : null,
        selectedCategories: form.appliesTo === "categories" ? (form.selectedCategories || []) : [],
        selectedProducts: form.appliesTo === "products" ? (form.selectedProducts || []) : [],
        allowedEmailDomains: form.allowedEmailDomains || "",
        allowedCustomerEmails: form.allowedCustomerEmails || "",
        buyQuantity: form.type === "bogo" ? (Number(form.buyQuantity) || 1) : null,
        getQuantity: form.type === "bogo" ? (Number(form.getQuantity) || 1) : null,
        getDiscountValue: form.type === "bogo" ? (Number(form.getDiscountValue) ?? 100) : null,
        tiers: form.type === "tiered" ? (form.tiers || []) : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleIn = (key: "selectedCategories" | "selectedProducts", id: string) => {
    const cur: string[] = form[key] || [];
    set(key, cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };
  const setTier = (i: number, patch: any) => set("tiers", (form.tiers || []).map((t: any, idx: number) => (idx === i ? { ...t, ...patch } : t)));

  return (
    <Dialog open onClose={onClose} size="lg" badge="🏷️" title={isEdit ? "Edit discount" : "New discount code"}
      description="Codes are re-validated by the server at checkout — this form only defines the rules."
      footer={<>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save changes" : "Create code"}</PrimaryButton>
      </>}>
      <div className="rp-stack" style={{ gap: 20 }}>
        <TextField label="Code" value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="e.g. SUMMER25"
          error={errors.code} data-autofocus style={{ fontFamily: "var(--rp-font-mono)", textTransform: "uppercase" }} />
        <TextField label="Internal description" value={form.description || ""} onChange={e => set("description", e.target.value)}
          placeholder="e.g. Summer sale 2026" hint="Only administrators see this." />

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="rp-label" style={{ marginBottom: 8 }}>Discount type</legend>
          <div role="radiogroup" aria-label="Discount type" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            {TYPE_OPTIONS.map(t => (
              <button key={t.id} type="button" role="radio" aria-checked={form.type === t.id} onClick={() => set("type", t.id)}
                className={`rp-btn ${form.type === t.id ? "rp-btn-ink" : "rp-btn-secondary"}`}
                style={{ flexDirection: "column", alignItems: "flex-start", textAlign: "left", whiteSpace: "normal", height: "auto", padding: "10px 12px" }}>
                <span>{t.label}</span>
                <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", opacity: 0.8 }}>{t.desc}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {(form.type === "percentage" || form.type === "fixed") && (
          <TextField label={form.type === "percentage" ? "Percentage off" : "Amount off (CA$)"} type="number" min={0}
            max={form.type === "percentage" ? 100 : undefined} value={form.value} onChange={e => set("value", e.target.value)} error={errors.value} />
        )}

        {form.type === "bogo" && (
          <div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <TextField label="Buy quantity" type="number" min={1} value={form.buyQuantity ?? 1} onChange={e => set("buyQuantity", parseInt(e.target.value) || 1)} />
            <TextField label="Get quantity" type="number" min={1} value={form.getQuantity ?? 1} onChange={e => set("getQuantity", parseInt(e.target.value) || 1)} />
            <TextField label="Discount on the free items (%)" type="number" min={0} max={100} value={form.getDiscountValue ?? 100} onChange={e => set("getDiscountValue", parseInt(e.target.value) || 0)} />
          </div>
          {errors.bogo && <p role="alert" className="rp-error-text">{errors.bogo}</p>}
          </div>
        )}

        {form.type === "tiered" && (
          <div className="rp-card" style={{ padding: 16, boxShadow: "none" }}>
            <div className="rp-sect">Tiers</div>
            <div className="rp-stack" style={{ gap: 12 }}>
              {(form.tiers || []).map((tier: any, i: number) => (
                <div key={i} style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr)) auto", alignItems: "end" }}>
                  <TextField label={`Tier ${i + 1} · minimum spend (CA$)`} type="number" min={0} value={tier.minSpend} onChange={e => setTier(i, { minSpend: parseFloat(e.target.value) || 0 })} />
                  <TextField label="Discount value" type="number" min={0} value={tier.value} onChange={e => setTier(i, { value: parseFloat(e.target.value) || 0 })} />
                  <SelectField label="Type" value={tier.type} onChange={e => setTier(i, { type: e.target.value })}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed ($)</option>
                  </SelectField>
                  {(form.tiers || []).length > 1 && <IconButton tone="danger" label={`Remove tier ${i + 1}`} onClick={() => set("tiers", form.tiers.filter((_: any, x: number) => x !== i))}><Trash2 size={16} aria-hidden /></IconButton>}
                </div>
              ))}
              {(form.tiers || []).length < 3 && (
                <SecondaryButton size="sm" icon={<Plus size={14} aria-hidden />} onClick={() => set("tiers", [...(form.tiers || []), { minSpend: 0, value: 0, type: "percentage" }])}>Add tier</SecondaryButton>
              )}
              {errors.tiers && <p role="alert" className="rp-error-text">{errors.tiers}</p>}
            </div>
          </div>
        )}

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="rp-label" style={{ marginBottom: 8 }}>Applies to</legend>
          <div role="radiogroup" aria-label="Applies to" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[{ id: "all", label: "All products" }, { id: "categories", label: "Categories" }, { id: "products", label: "Specific books" }].map(o => (
              <button key={o.id} type="button" role="radio" aria-checked={form.appliesTo === o.id} onClick={() => set("appliesTo", o.id)}
                className={`rp-btn ${form.appliesTo === o.id ? "rp-btn-ink" : "rp-btn-secondary"}`}>{o.label}</button>
            ))}
          </div>
          {errors.applies && <p role="alert" className="rp-error-text" style={{ marginTop: 8 }}>{errors.applies}</p>}
          {form.appliesTo === "categories" && (
            <div style={{ display: "grid", gap: 4, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 12 }}>
              {CATEGORIES.map(cat => <Checkbox key={cat} label={cat} checked={(form.selectedCategories || []).includes(cat)} onChange={() => toggleIn("selectedCategories", cat)} />)}
            </div>
          )}
          {form.appliesTo === "products" && (
            <div style={{ maxHeight: 220, overflowY: "auto", marginTop: 12, border: "1px solid var(--rp-border)", padding: "4px 12px" }}>
              {books === null ? <p className="rp-hint">Loading catalog…</p>
                : books.length === 0 ? <p className="rp-hint">No books in the catalog yet.</p>
                : books.map(b => <Checkbox key={b.id} label={b.title} checked={(form.selectedProducts || []).includes(b.id)} onChange={() => toggleIn("selectedProducts", b.id)} />)}
            </div>
          )}
        </fieldset>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
          <TextField label="Expiry date (optional)" type="date" min={today()} value={form.expiryDate || ""} onChange={e => set("expiryDate", e.target.value)} hint="Last day the code works." error={errors.expiryDate} />
          <TextField label="Minimum order (CA$)" type="number" min={0} value={form.minOrderAmount} onChange={e => set("minOrderAmount", e.target.value)} placeholder="No minimum" error={errors.minOrderAmount} />
          <TextField label="Minimum quantity" type="number" min={0} step={1} value={form.minQuantity} onChange={e => set("minQuantity", e.target.value)} placeholder="No minimum" error={errors.minQuantity} />
          <TextField label="Total usage limit" type="number" min={1} step={1} value={form.usageLimit} onChange={e => set("usageLimit", e.target.value)} placeholder="Unlimited" error={errors.usageLimit} />
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          <Toggle label="One use per customer" checked={!!form.onePerCustomer} onChange={v => set("onePerCustomer", v)} />
          <Toggle label="Code is active" checked={!!form.isActive} onChange={v => set("isActive", v)} />
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <TextArea label="Allowed email domains" rows={2} value={form.allowedEmailDomains || ""} onChange={e => set("allowedEmailDomains", e.target.value)}
            placeholder="e.g. .edu, student.ca" hint="Comma separated. Leave empty for everyone." style={{ minHeight: 64 }} />
          <TextArea label="Allowed customer emails" rows={2} value={form.allowedCustomerEmails || ""} onChange={e => set("allowedCustomerEmails", e.target.value)}
            placeholder="e.g. vip@gmail.com" hint="Comma separated list of specific customers." style={{ minHeight: 64 }} />
        </div>
      </div>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Discounts() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "expired" | "exhausted">("all");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<any | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setFailed(false);
    try { setDiscounts(await adminApi.getDiscounts()); } catch { setFailed(true); toast.error("Failed to load discounts"); } finally { setLoading(false); }
  }

  const handleSave = async (data: any) => {
    try {
      if (data.id) { await adminApi.updateDiscount(data.id, data); toast.success("Discount updated"); }
      else { await adminApi.saveDiscount(data); toast.success("Discount code created"); }
      setDialogOpen(false); setEditing(null); load();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    }
  };

  const handleDelete = async (d: any) => {
    try { await adminApi.deleteDiscount(d.id); toast.success("Discount deleted"); load(); } catch { toast.error("Delete failed"); }
  };

  const handleToggle = async (d: any) => {
    try { await adminApi.updateDiscount(d.id, { isActive: !d.isActive }); toast.success(d.isActive ? "Code paused" : "Code activated"); load(); } catch { toast.error("Toggle failed"); }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return discounts.filter(d => {
      if (filter !== "all" && state(d).key !== filter) return false;
      return !q || `${d.code} ${d.description || ""}`.toLowerCase().includes(q);
    });
  }, [discounts, filter, search]);

  const totalRedemptions = discounts.reduce((a, d) => a + (d.usageCount || 0), 0);
  const activeCodes = discounts.filter(d => state(d).key === "active").length;
  const statusCounts = useMemo(() => discounts.reduce((counts, discount) => {
    counts[state(discount).key] += 1;
    return counts;
  }, { active: 0, paused: 0, expired: 0, exhausted: 0 }), [discounts]);

  const columns: Column<any>[] = [
    { key: "code", header: "Code", lead: true, render: d => (
      <div style={{ minWidth: 160 }}>
        <span className="rp-mono" style={{ fontSize: "var(--rp-text-base)", fontWeight: 600 }}>{d.code}</span>
        {d.description && <div className="rp-hint" style={{ overflowWrap: "anywhere" }}>{d.description}</div>}
      </div>
    ) },
    { key: "value", header: "Offer", render: d => valueLabel(d) },
    { key: "target", header: "Applies to", render: d => <span style={{ overflowWrap: "anywhere" }}>{targetLabel(d)}</span> },
    { key: "rules", header: "Rules", render: d => (
      <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
        {d.minOrderAmount ? <StatusBadge>Min {fmt(d.minOrderAmount)}</StatusBadge> : null}
        {d.minQuantity ? <StatusBadge>Min qty {d.minQuantity}</StatusBadge> : null}
        {d.onePerCustomer ? <StatusBadge>1× / customer</StatusBadge> : null}
        {(d.allowedEmailDomains || d.allowedCustomerEmails) ? <StatusBadge tone="warning">Restricted emails</StatusBadge> : null}
        {!(d.minOrderAmount || d.minQuantity || d.onePerCustomer || d.allowedEmailDomains || d.allowedCustomerEmails) && "—"}
      </span>
    ) },
    { key: "used", header: "Used", numeric: true, render: d => `${d.usageCount || 0} / ${d.usageLimit ?? "∞"}` },
    { key: "expiry", header: "Expires", render: d => d.expiryDate ? new Date(d.expiryDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never" },
    { key: "status", header: "Status", render: d => { const s = state(d); return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>; } },
    { key: "actions", header: "Actions", render: d => (
      <ActionMenu label={`Actions for ${d.code}`} actions={[
        { label: "Edit", onSelect: () => { setEditing(d); setDialogOpen(true); } },
        { label: d.isActive ? "Pause" : "Activate", onSelect: () => handleToggle(d) },
        { label: "Copy code", onSelect: () => { navigator.clipboard.writeText(d.code); toast.success("Code copied"); } },
        { label: "Delete", tone: "danger", onSelect: () => setDeleting(d) },
      ]} />
    ) },
  ];

  if (loading) return <LoadingState label="Loading discounts…" />;
  if (failed) return <ErrorState description="Discount codes could not be loaded." onRetry={load} />;

  return (
    <div className="rp-stack">
      <div className="rp-kpi-grid">
        <MetricCard label="Active codes" value={activeCodes} footer={`${discounts.length} total`} />
        <MetricCard label="Redemptions" value={totalRedemptions.toLocaleString()} footer="Counted by the payment webhook" tone="gold" />
      </div>

      {discounts.length === 0 ? (
        <SectionCard>
          <EmptyState icon="🏷️" title="No discount codes yet" description="Create a code to offer a percentage, fixed amount, free shipping, buy-X-get-Y or tiered discount."
            action={<PrimaryButton icon={<Plus size={16} aria-hidden />} onClick={() => { setEditing(null); setDialogOpen(true); }}>New discount</PrimaryButton>} />
        </SectionCard>
      ) : (
        <>
          <Tabs label="Discount status" value={filter} onChange={setFilter} tabs={[
            { id: "all", label: "All", count: discounts.length },
            { id: "active", label: "Active", count: statusCounts.active },
            { id: "paused", label: "Paused", count: statusCounts.paused },
            { id: "expired", label: "Expired", count: statusCounts.expired },
            { id: "exhausted", label: "Exhausted", count: statusCounts.exhausted },
          ]} />
          <FilterBar>
            <div className="rp-grow"><SearchField label="Search discount codes" placeholder="Search codes or descriptions…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <PrimaryButton icon={<Plus size={16} aria-hidden />} onClick={() => { setEditing(null); setDialogOpen(true); }}>New discount</PrimaryButton>
          </FilterBar>
          <SectionCard flush title="Discount codes" description={`${rows.length} of ${discounts.length}`}>
            <DataTable caption="Discount codes" columns={columns} rows={rows} rowKey={d => d.id}
              empty={<EmptyState title="No codes match" description="Try a different status or search."
                action={<SecondaryButton onClick={() => { setFilter("all"); setSearch(""); }}>Reset filters</SecondaryButton>} />} />
          </SectionCard>
        </>
      )}

      {dialogOpen && <DiscountDialog initial={editing} onClose={() => { setDialogOpen(false); setEditing(null); }} onSave={handleSave} />}

      <ConfirmDialog open={!!deleting} title="Delete this discount code?" confirmLabel="Delete code"
        message={deleting ? `“${deleting.code}” will stop working immediately. Pause it instead if you may reuse it.` : ""}
        onConfirm={() => { const d = deleting; setDeleting(null); handleDelete(d); }} onCancel={() => setDeleting(null)} />
    </div>
  );
}
