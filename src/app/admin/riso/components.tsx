import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from "react";
import { AlertCircle, ChevronRight, Inbox, Search, X } from "lucide-react";
import "./riso.css";

const cx = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");

/* ── Shell ───────────────────────────────────────────────────────────── */

export function AppShell({ appearance = "light", sidebar, topbar, children, mainId = "rp-main" }: {
  appearance?: "light" | "dark";
  sidebar: ReactNode; topbar: ReactNode; children: ReactNode; mainId?: string;
}) {
  return (
    <div className="rp" data-rp-appearance={appearance}>
      <a className="rp-skip-link" href={`#${mainId}`}>Skip to content</a>
      <div className="rp-app">
        {sidebar}
        <div className="rp-app-body">
          {topbar}
          <main id={mainId} tabIndex={-1} className="rp-workspace">
            <div className="rp-workspace-inner">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

export type NavEntry = {
  id: string; label: string; icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  children?: Array<{ id: string; label: string }>;
};

export function Sidebar({ brand, items, activeId, activeChildId, onSelect, onSelectChild, open, onClose, footer }: {
  brand: ReactNode; items: NavEntry[]; activeId: string | null; activeChildId?: string;
  onSelect: (id: string) => void; onSelectChild: (parentId: string, childId: string) => void;
  open: boolean; onClose: () => void; footer: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useFocusTrap(ref, open && typeof window !== "undefined" && window.matchMedia?.("(max-width: 1023px)").matches, onClose);
  return (
    <>
      {open && <div className="rp-scrim" onClick={onClose} aria-hidden="true" />}
      <aside ref={ref} className="rp-sidebar" data-open={open} aria-label="Admin sidebar">
        <div className="rp-sidebar-brand">{brand}</div>
        <nav className="rp-nav" aria-label="Primary">
          <ul className="rp-nav-list">
            {items.map((item) => {
              const active = activeId === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button" className="rp-nav-item"
                    aria-current={active ? "page" : undefined}
                    aria-expanded={item.children ? active : undefined}
                    onClick={() => onSelect(item.id)}
                  >
                    <Icon size={18} aria-hidden />
                    {item.label}
                    {item.children && <ChevronRight size={14} className="rp-nav-chevron" aria-hidden />}
                  </button>
                  {item.children && active && (
                    <ul className="rp-nav-sublist" aria-label={`${item.label} sections`}>
                      {item.children.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button" className="rp-nav-subitem"
                            aria-current={activeChildId === c.id ? "page" : undefined}
                            onClick={() => onSelectChild(item.id, c.id)}
                          >{c.label}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="rp-sidebar-foot">{footer}</div>
      </aside>
    </>
  );
}

export function Topbar({ children }: { children: ReactNode }) {
  return <header className="rp-topbar">{children}</header>;
}

export function Breadcrumbs({ trail }: { trail: Array<{ label: string; onClick?: () => void }> }) {
  return (
    <nav className="rp-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${c.label}-${i}`} style={{ display: "contents" }}>
              {last || !c.onClick
                ? <span aria-current={last ? "page" : undefined}>{c.label}</span>
                : <button type="button" onClick={c.onClick}>{c.label}</button>}
              {!last && <ChevronRight size={12} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, breadcrumbs, actions }: {
  title: string; description?: string; breadcrumbs?: ReactNode; actions?: ReactNode;
}) {
  return (
    <div className="rp-page-header">
      <div>
        {breadcrumbs}
        <h1 className="rp-page-title">{title}</h1>
        {description && <p className="rp-page-desc">{description}</p>}
      </div>
      {actions && <div className="rp-page-actions">{actions}</div>}
    </div>
  );
}

/* ── Cards ───────────────────────────────────────────────────────────── */

export function SectionCard({ title, description, actions, children, bodyClassName, flush }: {
  title?: string; description?: string; actions?: ReactNode; children: ReactNode; bodyClassName?: string; flush?: boolean;
}) {
  return (
    <section className="rp-card">
      {(title || actions) && (
        <div className="rp-card-head">
          <div>
            {title && <h2 className="rp-card-title">{title}</h2>}
            {description && <p className="rp-card-desc">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={flush ? bodyClassName : cx("rp-card-body", bodyClassName)}>{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, footer }: { label: string; value: ReactNode; footer?: ReactNode }) {
  return (
    <div className="rp-card rp-metric">
      <div className="rp-metric-label">{label}</div>
      <div className="rp-metric-value">{value}</div>
      {footer && <div className="rp-metric-foot">{footer}</div>}
    </div>
  );
}

/* ── Buttons ─────────────────────────────────────────────────────────── */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { size?: "sm" | "md"; icon?: ReactNode };
function makeButton(variant: string) {
  return function RisoButton({ size = "md", icon, className, children, type = "button", ...rest }: BtnProps) {
    return (
      <button type={type} className={cx("rp-btn", `rp-btn-${variant}`, size === "sm" && "rp-btn-sm", className)} {...rest}>
        {icon}{children}
      </button>
    );
  };
}
export const PrimaryButton = makeButton("primary");
export const SecondaryButton = makeButton("secondary");
export const GhostButton = makeButton("ghost");
export const DestructiveButton = makeButton("danger");
export const ConfirmButton = makeButton("success");

export function IconButton({ label, tone, className, children, type = "button", ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "danger" | "success" }) {
  return (
    <button type={type} aria-label={label} title={label} data-tone={tone} className={cx("rp-icon-btn", className)} {...rest}>
      {children}
    </button>
  );
}

/* ── Fields ──────────────────────────────────────────────────────────── */

type FieldWrap = { label: string; hint?: string; error?: string; hideLabel?: boolean };

function Field({ id, label, hint, error, hideLabel, children }: FieldWrap & { id: string; children: ReactNode }) {
  return (
    <div className="rp-field">
      <label htmlFor={id} className={hideLabel ? "rp-sr-only" : "rp-label"}>{label}</label>
      {children}
      {hint && !error && <span id={`${id}-hint`} className="rp-hint">{hint}</span>}
      {error && <span id={`${id}-err`} role="alert" className="rp-error-text">{error}</span>}
    </div>
  );
}
const describe = (id: string, hint?: string, error?: string) =>
  error ? `${id}-err` : hint ? `${id}-hint` : undefined;

export function TextField({ label, hint, error, hideLabel, className, ...rest }: FieldWrap & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <input id={id} className={cx("rp-input", className)} aria-invalid={!!error || undefined}
        aria-describedby={describe(id, hint, error)} {...rest} />
    </Field>
  );
}

export function TextArea({ label, hint, error, hideLabel, className, ...rest }: FieldWrap & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <textarea id={id} className={cx("rp-textarea", className)} aria-invalid={!!error || undefined}
        aria-describedby={describe(id, hint, error)} {...rest} />
    </Field>
  );
}

export function SelectField({ label, hint, error, hideLabel, className, children, ...rest }: FieldWrap & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Field id={id} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <select id={id} className={cx("rp-select", className)} aria-invalid={!!error || undefined}
        aria-describedby={describe(id, hint, error)} {...rest}>{children}</select>
    </Field>
  );
}

export function SearchField({ label, className, ...rest }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cx("rp-search", className)}>
      <label htmlFor={id} className="rp-sr-only">{label}</label>
      <Search size={16} className="rp-search-icon" aria-hidden />
      <input id={id} type="search" className="rp-input" {...rest} />
    </div>
  );
}

export function Toggle({ label, checked, onChange, disabled }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className="rp-toggle">
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
        className="rp-toggle-track" onClick={() => onChange(!checked)} />
      <span aria-hidden="true">{label}</span>
    </label>
  );
}

export function Checkbox({ label, ...rest }: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <label className="rp-check"><input type="checkbox" {...rest} />{label}</label>
  );
}

export type BadgeTone = "neutral" | "primary" | "info" | "success" | "warning" | "danger";
export function StatusBadge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className="rp-badge" data-tone={tone}>{children}</span>;
}

/* ── Data ────────────────────────────────────────────────────────────── */

export type Column<T> = { key: string; header: string; numeric?: boolean; render: (row: T) => ReactNode };

export function DataTable<T>({ columns, rows, rowKey, caption, empty }: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; caption: string; empty?: ReactNode;
}) {
  if (!rows.length && empty) return <>{empty}</>;
  return (
    <div className="rp-table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table className="rp-table">
        <caption className="rp-sr-only">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col" className={c.numeric ? "rp-num" : undefined}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>{columns.map((c) => <td key={c.key} className={c.numeric ? "rp-num" : undefined}>{c.render(r)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="rp-filter-bar" role="search">{children}</div>;
}

export function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (p: number) => void }) {
  return (
    <nav className="rp-pagination" aria-label="Pagination">
      <span aria-live="polite">Page {page} of {Math.max(pageCount, 1)}</span>
      <span style={{ display: "flex", gap: 8 }}>
        <SecondaryButton size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</SecondaryButton>
        <SecondaryButton size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next</SecondaryButton>
      </span>
    </nav>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: {
  tabs: Array<{ id: T; label: string; count?: number }>; value: T; onChange: (id: T) => void; label: string;
}) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next.id);
    requestAnimationFrame(() => document.getElementById(`rp-tab-${next.id}`)?.focus());
  };
  return (
    <div className="rp-tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button key={t.id} id={`rp-tab-${t.id}`} type="button" role="tab" className="rp-tab"
          aria-selected={value === t.id} tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)} onKeyDown={(e) => onKey(e, i)}>
          {t.label}{t.count !== undefined && <span className="rp-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Overlays ────────────────────────────────────────────────────────── */

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Traps Tab inside `ref`, closes on Escape, and restores focus to the opener on close. */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!active || !ref.current) return;
    const node = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    (node.querySelector<HTMLElement>("[data-autofocus]") || node.querySelector<HTMLElement>(FOCUSABLE) || node).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== "Tab") return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    node.addEventListener("keydown", onKey);
    return () => { node.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, [active, ref]);
}

export function Dialog({ open, onClose, title, description, footer, children, size, variant = "dialog", appearance = "light" }: {
  open: boolean; onClose: () => void; title: string; description?: string; footer?: ReactNode;
  children: ReactNode; size?: "md" | "lg"; variant?: "dialog" | "drawer"; appearance?: "light" | "dark";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return (
    <div className="rp rp-dialog-root" data-variant={variant} data-rp-appearance={appearance} style={{ background: "transparent" }}>
      <div className="rp-dialog-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={ref} className="rp-dialog" data-size={size} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="rp-dialog-head">
          <div>
            <h2 id={titleId} className="rp-dialog-title">{title}</h2>
            {description && <p className="rp-card-desc">{description}</p>}
          </div>
          <IconButton label="Close dialog" onClick={onClose}><X size={18} aria-hidden /></IconButton>
        </div>
        <div className="rp-dialog-body">{children}</div>
        {footer && <div className="rp-dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}

export const Drawer = (p: Omit<Parameters<typeof Dialog>[0], "variant">) => <Dialog {...p} variant="drawer" />;

/** Compact confirm dialog for destructive actions. */
export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel, appearance }: {
  open: boolean; title: string; message: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void; appearance?: "light" | "dark";
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} appearance={appearance}
      footer={<>
        <SecondaryButton data-autofocus onClick={onCancel}>Cancel</SecondaryButton>
        <DestructiveButton onClick={onConfirm}>{confirmLabel}</DestructiveButton>
      </>}>
      <p className="rp-card-desc" style={{ margin: 0, fontSize: "var(--rp-text-base)" }}>{message}</p>
    </Dialog>
  );
}

/* ── Toast (uses a polite live region; auto-dismiss, optional Undo) ──── */

type ToastItem = { id: number; message: string; actionLabel?: string; onAction?: () => void };
const ToastCtx = createContext<(m: string, o?: { actionLabel?: string; onAction?: () => void }) => void>(() => {});
export const useRisoToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, o?: { actionLabel?: string; onAction?: () => void }) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, message, ...o }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), o?.onAction ? 8000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div role="status" aria-live="polite" style={{ position: "fixed", bottom: 16, right: 16, zIndex: 500, display: "grid", gap: 8 }} className="rp">
        {items.map((t) => (
          <div key={t.id} className="rp-toast">
            <span>{t.message}</span>
            {t.onAction && (
              <SecondaryButton size="sm" style={{ color: "inherit", borderColor: "currentColor" }}
                onClick={() => { t.onAction?.(); setItems((s) => s.filter((x) => x.id !== t.id)); }}>
                {t.actionLabel || "Undo"}
              </SecondaryButton>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ── States ──────────────────────────────────────────────────────────── */

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rp-state">
      <div className="rp-state-icon">{icon || <Inbox size={24} aria-hidden />}</div>
      <h3 className="rp-state-title">{title}</h3>
      {description && <p className="rp-state-desc">{description}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="rp-state" role="status" aria-live="polite">
      <div className="rp-spinner" aria-hidden />
      <p className="rp-state-desc">{label}</p>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="rp-state" data-tone="danger" role="alert">
      <div className="rp-state-icon"><AlertCircle size={24} aria-hidden /></div>
      <h3 className="rp-state-title">{title}</h3>
      {description && <p className="rp-state-desc">{description}</p>}
      {onRetry && <SecondaryButton onClick={onRetry}>Try again</SecondaryButton>}
    </div>
  );
}

export function SaveBar({ dirty, saving, onSave, onDiscard, message }: {
  dirty: boolean; saving?: boolean; onSave: () => void; onDiscard: () => void; message?: string;
}) {
  if (!dirty) return null;
  return (
    <div className="rp-savebar" role="region" aria-label="Unsaved changes">
      <span role="status">{message || "You have unsaved changes."}</span>
      <span style={{ display: "flex", gap: 8 }}>
        <SecondaryButton onClick={onDiscard} disabled={saving}>Discard</SecondaryButton>
        <PrimaryButton onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save changes"}</PrimaryButton>
      </span>
    </div>
  );
}
