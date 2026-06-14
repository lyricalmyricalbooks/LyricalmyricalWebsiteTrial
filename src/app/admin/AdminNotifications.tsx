import { useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCheck, CircleAlert, ExternalLink, Info, PackageX } from "lucide-react";
import { adminApi } from "./api";

export type AdminNotification = {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  read?: boolean;
  createdAt: string;
  orderId?: string;
  orderNumber?: string;
  resourceUrl?: string;
  delivery?: Record<string, { status: string; attempts?: number }>;
};

const severityStyles = {
  info: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  critical: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export function AdminNotifications({ notifications, onOpenOrder }: { notifications: AdminNotification[]; onOpenOrder: (id: string) => void }) {
  const [severity, setSeverity] = useState("all");
  const [readState, setReadState] = useState("all");
  const filtered = useMemo(() => notifications.filter((item) =>
    (severity === "all" || item.severity === severity) &&
    (readState === "all" || (readState === "unread" ? !item.read : item.read))), [notifications, severity, readState]);
  const unread = notifications.filter((item) => !item.read);

  return <div className="space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div><p className="text-xs text-slate-500">Operational events created by Cloud Functions.</p><p className="mt-2 text-[10px] font-black uppercase tracking-[.25em] text-violet-400">{unread.length} unread · {notifications.length} total</p></div>
      <div className="flex flex-wrap gap-3">
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="bg-[#111114] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-300"><option value="all">All severities</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Info</option></select>
        <select value={readState} onChange={(e) => setReadState(e.target.value)} className="bg-[#111114] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-300"><option value="all">All messages</option><option value="unread">Unread</option><option value="read">Read</option></select>
        <button onClick={() => adminApi.markAllNotificationsRead(unread.map((item) => item.id))} disabled={!unread.length} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-600 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest"><CheckCheck size={15}/>Mark all read</button>
      </div>
    </div>
    <div className="space-y-3">
      {filtered.map((item) => {
        const Icon = item.severity === "critical" ? CircleAlert : item.severity === "warning" ? AlertTriangle : Info;
        return <article key={item.id} className={`rounded-2xl border p-5 transition-all ${item.read ? "bg-white/[.015] border-white/5" : "bg-white/[.04] border-white/10 shadow-lg"}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border ${severityStyles[item.severity]}`}><Icon size={18}/></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-sm text-white">{item.title}</h3>{!item.read && <span className="h-2 w-2 rounded-full bg-violet-400"/>}<span className={`px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-widest ${severityStyles[item.severity]}`}>{item.severity}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{item.message}</p><div className="mt-4 flex flex-wrap items-center gap-4 text-[9px] uppercase tracking-widest text-slate-600"><span>{new Date(item.createdAt).toLocaleString()}</span><span>{item.type.replace(/_/g, " ")}</span>{item.delivery && Object.entries(item.delivery).map(([channel, state]) => <span key={channel} className={state.status === "failed" ? "text-rose-400" : ""}>{channel}: {state.status}</span>)}</div></div>
            <div className="flex gap-2">{item.orderId && <button onClick={() => onOpenOrder(item.orderId!)} title="Open order" className="p-2.5 rounded-xl bg-white/5 text-violet-400 hover:bg-white/10"><ExternalLink size={16}/></button>}<button onClick={() => adminApi.markNotificationRead(item.id, !item.read)} className="px-3 py-2 rounded-xl bg-white/5 text-[9px] font-black uppercase text-slate-400 hover:text-white">{item.read ? "Unread" : "Read"}</button></div>
          </div>
        </article>;
      })}
      {!filtered.length && <div className="py-24 text-center border border-dashed border-white/10 rounded-3xl"><PackageX className="mx-auto text-slate-700" size={32}/><p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-600">No notifications match these filters</p></div>}
    </div>
  </div>;
}

export function NotificationBell({ notifications, onOpen }: { notifications: AdminNotification[]; onOpen: () => void }) {
  const unread = notifications.filter((item) => !item.read).length;
  return <button onClick={onOpen} title="Notifications" className="relative p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10"><Bell size={20}/>{unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{unread > 99 ? "99+" : unread}</span>}</button>;
}
