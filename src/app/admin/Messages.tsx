import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { Archive, ArchiveRestore, Mail, Trash2 } from "lucide-react";
import { db } from "../../lib/firebase";
import {
  ConfirmDialog, EmptyState, ErrorState, FilterBar, IconButton, LoadingState, MetricCard, SearchField, SectionCard,
  StatusBadge, Tabs, ToastProvider, useRisoToast,
} from "./riso/components";

// Messages sent from the storefront Contact Form section (collection `contactMessages`).
export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  page?: string;
  status?: "new" | "emailed" | "read" | "archived";
  createdAt?: any;
};
type Filter = "inbox" | "unread" | "archived";

const isUnread = (m: ContactMessage) => m.status === "new" || m.status === "emailed" || !m.status;
const toDate = (v: any): Date | null => (v?.toDate ? v.toDate() : v ? new Date(v) : null);

export function filterMessages(list: ContactMessage[], filter: Filter, q: string) {
  const needle = q.trim().toLowerCase();
  return list.filter((m) => {
    if (filter === "archived" ? m.status !== "archived" : m.status === "archived") return false;
    if (filter === "unread" && !isUnread(m)) return false;
    if (!needle) return true;
    return [m.name, m.email, m.subject, m.message].some((s) => (s || "").toLowerCase().includes(needle));
  });
}

function Inbox() {
  const toast = useRisoToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("inbox");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);

  async function load() {
    setLoading(true); setError(false);
    try {
      const snap = await getDocs(query(collection(db, "contactMessages"), orderBy("createdAt", "desc"), limit(300)));
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch { setError(true); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const setStatus = async (m: ContactMessage, status: ContactMessage["status"]) => {
    setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, status } : x)));
    try { await updateDoc(doc(db, "contactMessages", m.id), { status }); }
    catch { toast("Could not update the message."); load(); }
  };

  const toggleOpen = (m: ContactMessage) => {
    setOpen((cur) => (cur === m.id ? null : m.id));
    if (isUnread(m)) setStatus(m, "read");
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    try { await deleteDoc(doc(db, "contactMessages", id)); toast("Message deleted"); } catch { toast("Could not delete the message."); }
    load();
  };

  const counts = useMemo(() => ({
    inbox: messages.filter((m) => m.status !== "archived").length,
    unread: messages.filter(isUnread).length,
    archived: messages.filter((m) => m.status === "archived").length,
  }), [messages]);
  const list = useMemo(() => filterMessages(messages, filter, q), [messages, filter, q]);
  const last7 = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    return messages.filter((m) => (toDate(m.createdAt)?.getTime() || 0) >= since).length;
  }, [messages]);

  return (
    <div className="rp-stack">
      <div className="rp-kpi-grid">
        <MetricCard label="Unread" value={counts.unread} tone={counts.unread ? "warn" : undefined} footer="Not opened here yet" />
        <MetricCard label="Last 7 days" value={last7} footer="Messages received" />
        <MetricCard label="All time" value={messages.length} footer={`${counts.archived} archived`} />
      </div>
      <div className="rp-filter-bar">
        <Tabs<Filter> label="Message folder" value={filter} onChange={setFilter}
          tabs={([["inbox", "Inbox"], ["unread", "Unread"], ["archived", "Archived"]] as const).map(([id, label]) => ({ id, label, count: counts[id] }))} />
      </div>
      <FilterBar>
        <div className="rp-grow"><SearchField label="Search messages" placeholder="Search name, email or text…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </FilterBar>

      <SectionCard flush title="Messages" description={`${list.length} message${list.length === 1 ? "" : "s"} in this view`}>
        {loading ? <LoadingState label="Loading messages…" />
          : error ? <ErrorState description="Messages could not be loaded." onRetry={load} />
          : list.length === 0 ? (
            <EmptyState title={filter === "archived" ? "Nothing archived" : "No messages yet"}
              description="Messages sent from the Contact Form section on your website appear here (and in your email)." />
          ) : (
            <ul className="rp-list" aria-label="Messages">
              {list.map((m) => {
                const when = toDate(m.createdAt);
                const expanded = open === m.id;
                return (
                  <li key={m.id}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
                      <button type="button" onClick={() => toggleOpen(m)} aria-expanded={expanded}
                        style={{ all: "unset", cursor: "pointer", minWidth: 0, flex: "1 1 320px" }}>
                        <div className="rp-row-meta" style={{ marginBottom: 6 }}>
                          {isUnread(m) && <StatusBadge tone="warning">new</StatusBadge>}
                          {m.status === "archived" && <StatusBadge tone="neutral">archived</StatusBadge>}
                          {when && <time dateTime={when.toISOString()}>{when.toLocaleString()}</time>}
                        </div>
                        <h3 style={{ margin: "0 0 4px", fontSize: "var(--rp-text-base)", fontWeight: isUnread(m) ? 700 : 600 }}>
                          {m.subject || m.name}
                        </h3>
                        <p style={{ margin: "0 0 6px", lineHeight: 1.55, overflowWrap: "anywhere", whiteSpace: expanded ? "pre-wrap" : "normal" }}>
                          {expanded || m.message.length <= 180 ? m.message : `${m.message.slice(0, 180)}…`}
                        </p>
                        <p className="rp-hint" style={{ margin: 0 }}>
                          {m.name} · {m.email}{m.phone ? ` · ${m.phone}` : ""}{expanded && m.page ? ` · sent from ${m.page}` : ""}
                        </p>
                      </button>
                      <div style={{ display: "flex", gap: 4 }}>
                        <a className="rp-btn rp-btn-secondary rp-btn-sm" aria-label={`Reply to ${m.name} by email`}
                          href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject || "your message"}`)}`}
                          onClick={() => { if (isUnread(m)) setStatus(m, "read"); }}>
                          <Mail size={16} aria-hidden /> Reply
                        </a>
                        {m.status === "archived"
                          ? <IconButton label={`Move message from ${m.name} back to inbox`} onClick={() => setStatus(m, "read")}><ArchiveRestore size={18} aria-hidden /></IconButton>
                          : <IconButton label={`Archive message from ${m.name}`} onClick={() => setStatus(m, "archived")}><Archive size={18} aria-hidden /></IconButton>}
                        <IconButton tone="danger" label={`Delete message from ${m.name}`} onClick={() => setDeleting(m)}><Trash2 size={18} aria-hidden /></IconButton>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </SectionCard>

      <ConfirmDialog open={!!deleting} title="Delete this message?" confirmLabel="Delete message"
        message="This permanently removes the message. Archive it instead if you may need it later."
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}

export default function Messages() {
  return <ToastProvider><Inbox /></ToastProvider>;
}
