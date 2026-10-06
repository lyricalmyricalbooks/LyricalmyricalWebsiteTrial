import { useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "./api";
import { PrimaryButton, SecondaryButton, StatusBadge } from "./riso/components";

type Report = Awaited<ReturnType<typeof adminApi.stripeWebhookHealth>>;

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "never");

// Settings › Payments › Webhook health: asks Stripe whether the endpoint that tells
// the shop "this order is paid" exists, is on, and sends every event the shop needs —
// and repairs it in one click.
export function StripeWebhookHealth() {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState<null | "check" | "fix" | "recreate">(null);

  const run = async (kind: "check" | "fix" | "recreate") => {
    setBusy(kind);
    try {
      const r = await adminApi.stripeWebhookHealth({ fix: kind === "fix", recreate: kind === "recreate" });
      setReport(r);
      if (r.actions.length) toast.success(r.actions.join(" "));
      else if (kind !== "check") toast.success("Nothing needed fixing.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const signatureFailing = !!report?.lastFailureAt && (!report.lastReceivedAt || report.lastFailureAt > report.lastReceivedAt);
  const healthy = !!report && report.found && report.enabled && !report.wrongUrl && report.missingEvents.length === 0 && !signatureFailing;

  return (
    <div className="rp-card" style={{ padding: 16, boxShadow: "none", background: "var(--rp-surface-sunken)" }}>
      <div className="rp-sect">Webhook health</div>
      <p className="rp-hint" style={{ marginTop: 0 }}>
        Stripe tells the shop an order is paid through the webhook. If it is missing or misconfigured, paid orders stay “unpaid”.
        As a safety net the shop also asks Stripe directly every 15 minutes and whenever you open an unpaid order.
      </p>
      {report && (
        <ul className="rp-list" aria-label="Webhook checks" style={{ margin: "0 0 12px", border: "1px solid var(--rp-border)" }}>
          <li style={{ padding: 10 }}>
            <StatusBadge tone={report.found && report.enabled ? "success" : "danger"}>{report.found ? (report.enabled ? "On" : "Disabled") : "Missing"}</StatusBadge>{" "}
            Endpoint in Stripe ({report.mode === "test" ? "test/sandbox" : "live"} account)
          </li>
          <li style={{ padding: 10 }}>
            <StatusBadge tone={report.missingEvents.length ? "danger" : "success"}>{report.missingEvents.length ? `${report.missingEvents.length} missing` : "All sent"}</StatusBadge>{" "}
            Events{report.missingEvents.length ? `: ${report.missingEvents.join(", ")}` : ""}
          </li>
          <li style={{ padding: 10 }}>
            <StatusBadge tone={signatureFailing ? "danger" : report.lastReceivedAt ? "success" : "neutral"}>{signatureFailing ? "Failing" : report.lastReceivedAt ? "Working" : "No events yet"}</StatusBadge>{" "}
            Last event received: {when(report.lastReceivedAt)}{report.lastEventType ? ` (${report.lastEventType})` : ""}
            {signatureFailing && <span className="rp-hint" style={{ display: "block", marginTop: 4 }}>{report.lastFailure} — {when(report.lastFailureAt)}</span>}
          </li>
        </ul>
      )}
      {report && healthy && <p role="status" className="rp-hint" style={{ marginTop: 0 }}>✓ The webhook is set up correctly.</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <SecondaryButton size="sm" disabled={!!busy} onClick={() => run("check")}>{busy === "check" ? "Checking…" : "Check webhook"}</SecondaryButton>
        {report && !healthy && !signatureFailing && (
          <PrimaryButton size="sm" disabled={!!busy} onClick={() => run("fix")}>{busy === "fix" ? "Fixing…" : "Fix webhook"}</PrimaryButton>
        )}
        {report && signatureFailing && (
          <PrimaryButton size="sm" disabled={!!busy} onClick={() => run("recreate")}>{busy === "recreate" ? "Resetting…" : "Reset webhook signing"}</PrimaryButton>
        )}
      </div>
    </div>
  );
}
