import { useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "./api";
import { PrimaryButton, SecondaryButton, StatusBadge, useConfirm } from "./riso/components";
import { describeKeyReport, webhookState, type Check } from "./stripeChecks";

type Report = Awaited<ReturnType<typeof adminApi.stripeWebhookHealth>>;

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : "never");

// Settings › Payments › Stripe: "Test connection" (do the keys work, right mode,
// right account) and "Webhook health" (does Stripe tell the shop about payments,
// refunds and disputes) — each with one-click repair where Stripe allows it.
export function StripeWebhookHealth({ unsaved = false }: { unsaved?: boolean }) {
  const [askConfirm, confirmNode] = useConfirm();
  const [report, setReport] = useState<Report | null>(null);
  const [keys, setKeys] = useState<Check[] | null>(null);
  const [busy, setBusy] = useState<null | "keys" | "check" | "fix" | "recreate">(null);

  const testKeys = async () => {
    setBusy("keys");
    try {
      setKeys(describeKeyReport(await adminApi.verifyStripeKeys()));
    } catch (err: any) {
      setKeys([{ tone: "danger", text: err.message || "Couldn't reach Stripe." }]);
    } finally {
      setBusy(null);
    }
  };

  const run = async (kind: "check" | "fix" | "recreate") => {
    if (kind === "recreate" && !(await askConfirm({
      title: "Replace the Stripe webhook?",
      message: "This deletes the current endpoint in Stripe and creates a new one with a signing secret the shop knows. Stripe stops retrying deliveries queued for the old endpoint — afterwards, open recent unpaid orders (or use Sync with Stripe) to catch up.",
      confirmLabel: "Replace webhook",
    }))) return;
    setBusy(kind);
    try {
      const r = await adminApi.stripeWebhookHealth({ fix: kind === "fix", recreate: kind === "recreate" });
      setReport(r);
      if (r.actions.length) toast.success(r.actions.join(" "));
      else if (kind !== "check") toast.success("Nothing needed fixing.");
    } catch (err: any) {
      setReport(null); // never leave an old "OK" on screen after a failed check
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const state = report ? webhookState(report) : null;

  return (
    <div className="rp-card" style={{ padding: 16, boxShadow: "none", background: "var(--rp-surface-sunken)" }}>
      {confirmNode}
      <div className="rp-sect">Connection &amp; webhook health</div>
      <p className="rp-hint" style={{ marginTop: 0 }}>
        Checks the <strong>saved</strong> settings{unsaved ? " — save your changes first so the check uses them" : ""}.
        Stripe tells the shop about payments, refunds and disputes through the webhook; as a safety net the shop also asks Stripe directly
        every 15 minutes and whenever you open an order.
      </p>

      {keys && (
        <ul className="rp-list" aria-label="Stripe key checks" style={{ margin: "0 0 12px", border: "1px solid var(--rp-border)" }}>
          {keys.map((c, i) => (
            <li key={i} style={{ padding: 10 }}>
              <StatusBadge tone={c.tone}>{c.tone === "success" ? "OK" : c.tone === "danger" ? "Problem" : c.tone === "warning" ? "Check" : "Info"}</StatusBadge> {c.text}
            </li>
          ))}
        </ul>
      )}

      {report && state && (
        <ul className="rp-list" aria-label="Webhook checks" style={{ margin: "0 0 12px", border: "1px solid var(--rp-border)" }}>
          <li style={{ padding: 10 }}>
            <StatusBadge tone={report.found && report.enabled && !report.wrongUrl ? "success" : "danger"}>{report.found ? (report.enabled ? (report.wrongUrl ? "Wrong address" : "On") : "Disabled") : "Missing"}</StatusBadge>{" "}
            Endpoint in Stripe ({report.mode === "test" ? "test/sandbox" : "live"} account)
          </li>
          <li style={{ padding: 10 }}>
            <StatusBadge tone={report.missingEvents.length ? "danger" : "success"}>{report.missingEvents.length ? `${report.missingEvents.length} missing` : "All sent"}</StatusBadge>{" "}
            Events{report.missingEvents.length ? `: ${report.missingEvents.join(", ")}` : ""}
          </li>
          <li style={{ padding: 10 }}>
            <StatusBadge tone={state.noSecret ? "danger" : "success"}>{state.noSecret ? "Missing" : "Set"}</StatusBadge>{" "}
            Signing secret{state.noSecret ? " — the shop can't verify Stripe's messages. Use Fix webhook." : report.savedSecret ? " (saved by the shop)" : " (from Firebase Functions)"}
          </li>
          <li style={{ padding: 10 }}>
            <StatusBadge tone={state.signatureFailing ? "danger" : report.lastReceivedAt ? "success" : "neutral"}>{state.signatureFailing ? "Failing" : report.lastReceivedAt ? "Working" : "Waiting for first event"}</StatusBadge>{" "}
            Last event from this account: {when(report.lastReceivedAt)}{report.lastEventType ? ` (${report.lastEventType})` : ""}
            {state.signatureFailing && <span className="rp-hint" style={{ display: "block", marginTop: 4 }}>{report.lastFailure} — {when(report.lastFailureAt)}</span>}
            {!report.lastReceivedAt && !state.signatureFailing && <span className="rp-hint" style={{ display: "block", marginTop: 4 }}>Set up correctly, but no payment has been made since — place a test order to confirm.</span>}
          </li>
          {state.processingFailing && (
            <li style={{ padding: 10 }}>
              <StatusBadge tone="danger">Error</StatusBadge> The last delivery reached the shop but failed while updating the order — Stripe will retry. {report.lastProcessingFailure} ({when(report.lastProcessingFailureAt)})
            </li>
          )}
        </ul>
      )}
      {state?.state === "healthy" && !state.processingFailing && <p role="status" className="rp-hint" style={{ marginTop: 0 }}>✓ The webhook is set up and delivering.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <SecondaryButton size="sm" disabled={!!busy} onClick={testKeys}>{busy === "keys" ? "Testing…" : "Test connection"}</SecondaryButton>
        <SecondaryButton size="sm" disabled={!!busy} onClick={() => run("check")}>{busy === "check" ? "Checking…" : "Check webhook"}</SecondaryButton>
        {state && state.state !== "healthy" && state.state !== "waiting" && (
          <PrimaryButton size="sm" disabled={!!busy} onClick={() => run("fix")}>{busy === "fix" ? "Fixing…" : "Fix webhook"}</PrimaryButton>
        )}
        {state && (state.signatureFailing || state.noSecret) && (
          <SecondaryButton size="sm" disabled={!!busy} onClick={() => run("recreate")}>{busy === "recreate" ? "Replacing…" : "Reset webhook signing"}</SecondaryButton>
        )}
      </div>
    </div>
  );
}
