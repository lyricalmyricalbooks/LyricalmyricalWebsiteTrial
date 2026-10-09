import type { BadgeTone } from "./riso/components";

/**
 * How one emailLog row reads in Settings › Notifications › Recent deliveries (pure).
 * "fallback" = Gmail missed and the shop switched to the backup sender (Resend); the row
 * after it says whether that worked, so it is a warning, never a failure.
 */
export function emailLogBadge(entry: { status?: string; note?: string }): { tone: BadgeTone; label: string } {
  if (entry.status === "failed") return { tone: "danger", label: "Failed" };
  if (entry.status === "bounced") return { tone: "danger", label: "Bounced" };
  if (entry.status === "complained") return { tone: "danger", label: "Marked as spam" };
  if (entry.status === "fallback") return { tone: "warning", label: "Gmail missed · used backup" };
  if (entry.note) return { tone: "warning", label: "Sent (sandbox)" };
  return { tone: "success", label: "Sent" };
}

export function emailLogDetail(entry: { error?: string; note?: string; keySource?: string }): string {
  return entry.error || entry.note || (entry.keySource === "gmail" ? "Accepted by Gmail" : "Accepted by Resend");
}
