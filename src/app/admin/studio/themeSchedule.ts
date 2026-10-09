// Scheduled publishing & campaigns (Studio 3.5), the Studio side. Entries live in admin-only `themeSchedule/{id}`;
// functions/themeSchedule.js publishes them from the 15-minute sweep. Times are entered as Toronto wall-clock time
// (the shop's time zone) and stored as UTC ISO strings. Pure: no React, no Firestore.

export type ScheduleKind = "publish" | "campaign";
export type ScheduleStatus = "scheduled" | "live" | "done" | "cancelled" | "skipped";
export type ScheduleEntry = {
  id: string; kind: ScheduleKind; name: string; status: ScheduleStatus;
  startAt: string; endAt?: string | null; createdAt?: string; startedAt?: string; endedAt?: string; note?: string;
  design?: any;
};

export const SHOP_TZ = "America/Toronto";

/** Toronto's offset from UTC (minutes) at a given instant. */
function offsetMinutes(utcMs: number): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs)).map(p => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return Math.round((asUtc - utcMs) / 60000);
}

/** "2026-10-10T09:00" in Toronto → UTC ISO. Null for an invalid value. */
export function torontoLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(local || ""));
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes settle the offset across daylight-saving changes.
  let utc = wall - offsetMinutes(wall) * 60000;
  utc = wall - offsetMinutes(utc) * 60000;
  return Number.isFinite(utc) ? new Date(utc).toISOString() : null;
}

/** UTC ISO → "2026-10-10T09:00" Toronto wall-clock time (for datetime-local inputs). */
export function isoToTorontoLocal(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const local = new Date(t + offsetMinutes(t) * 60000);
  return local.toISOString().slice(0, 16);
}

/** "Sat, Oct 10, 9:00 a.m." in Toronto time. */
export function formatToronto(iso?: string | null): string {
  const t = Date.parse(String(iso || ""));
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(t));
}

const MAX_CAMPAIGN_DAYS = 120;

/** Problems with a new entry, in the owner's words (empty = fine). */
export function scheduleProblems(entry: { kind: ScheduleKind; startAt: string | null; endAt?: string | null }, existing: ScheduleEntry[], now = Date.now()): string[] {
  const out: string[] = [];
  const start = Date.parse(String(entry.startAt || ""));
  if (!Number.isFinite(start)) return ["Choose when it should start."];
  if (start < now - 60_000) out.push("The start time has already passed. Choose a time in the future.");
  if (entry.kind === "campaign") {
    const end = Date.parse(String(entry.endAt || ""));
    if (!Number.isFinite(end)) out.push("Choose when the campaign should end.");
    else if (end <= start) out.push("The end must be after the start.");
    else if (end - start > MAX_CAMPAIGN_DAYS * 86_400_000) out.push(`A campaign can run for up to ${MAX_CAMPAIGN_DAYS} days.`);
    else {
      // Overlapping campaigns would switch back to each other's look; one at a time keeps the ending predictable.
      const clash = existing.find(e => e.kind === "campaign" && (e.status === "scheduled" || e.status === "live")
        && Date.parse(e.startAt) < end && Date.parse(String(e.endAt)) > start);
      if (clash) out.push(`It overlaps “${clash.name}”. Campaigns run one at a time.`);
    }
  }
  return out;
}

export type SchedulerHealth = { state: "ok" | "stale" | "never"; text: string };
/** Whether the server scheduler (Cloud Functions) is running: it stamps lastRunAt every 15 minutes. */
export function schedulerHealth(lastRunAt: string | null | undefined, now = Date.now()): SchedulerHealth {
  const t = Date.parse(String(lastRunAt || ""));
  if (!Number.isFinite(t)) return { state: "never", text: "The scheduler hasn't run yet. Scheduled changes go live only once the updated Cloud Functions are deployed." };
  if (now - t > 45 * 60_000) return { state: "stale", text: `The scheduler last checked ${formatToronto(lastRunAt)}. It normally checks every 15 minutes — check the Cloud Functions are deployed and running.` };
  return { state: "ok", text: `The scheduler checks every 15 minutes (last check ${formatToronto(lastRunAt)}). Changes go live within 15 minutes of their time.` };
}

export const STATUS_WORDS: Record<ScheduleStatus, string> = {
  scheduled: "Scheduled", live: "Running now", done: "Done", cancelled: "Cancelled", skipped: "Skipped",
};
export const NOTE_WORDS: Record<string, string> = {
  "kept-later-publish": "You published something else while it ran, so that was kept instead of switching back.",
  "ended-before-start": "Its end time passed before it could start.",
  "no-design": "It had no design to publish.",
};
