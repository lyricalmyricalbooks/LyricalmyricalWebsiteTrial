// Settings › General › Backups & export: how to describe the nightly backup (pure, tested).
// The record is written by functions nightlyFirestoreBackup to admin-only systemStatus/backup.

export type BackupRecord = { ok?: boolean; lastAttemptAt?: string; lastSuccessAt?: string; lastSuccessDay?: string; error?: string } | null;
export type BackupView = { tone: "success" | "warning" | "danger" | "neutral"; label: string; detail: string };

const DAY = 24 * 60 * 60 * 1000;

export function describeBackup(record: BackupRecord, now = Date.now()): BackupView {
  if (!record || !record.lastAttemptAt) {
    return { tone: "neutral", label: "Not recorded yet", detail: "The nightly backup (3:17 am Toronto) records its result here after the next run, once the updated Cloud Functions are deployed." };
  }
  const last = record.lastSuccessAt ? new Date(record.lastSuccessAt).toLocaleString() : "never";
  if (record.ok === false) {
    return { tone: "danger", label: "Last backup failed", detail: `${record.error || "Unknown error"} — last good backup: ${last}. The Functions service account needs the Cloud Datastore Import Export Admin role and write access to the storage bucket.` };
  }
  const age = now - Date.parse(record.lastSuccessAt || record.lastAttemptAt);
  if (age > 2 * DAY) return { tone: "warning", label: "Backup is overdue", detail: `Last backup started ${last}. Check the nightlyFirestoreBackup function's logs.` };
  return { tone: "success", label: "Backed up", detail: `Last backup started ${last} (Firestore export to the storage bucket, folder backups/${record.lastSuccessDay || ""}).` };
}
