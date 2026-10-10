import { describe, expect, it } from "vitest";
import { describeBackup } from "./backupStatus";

const now = Date.parse("2026-10-10T12:00:00Z");

describe("describeBackup", () => {
  it("says nothing is recorded without a record (never a made-up OK)", () => {
    expect(describeBackup(null, now).label).toBe("Not recorded yet");
  });
  it("reports a failure with its error", () => {
    const v = describeBackup({ ok: false, lastAttemptAt: "2026-10-10T07:17:00Z", error: "PERMISSION_DENIED" }, now);
    expect(v.tone).toBe("danger");
    expect(v.detail).toContain("PERMISSION_DENIED");
  });
  it("flags an old success as overdue", () => {
    expect(describeBackup({ ok: true, lastAttemptAt: "2026-10-01T07:17:00Z", lastSuccessAt: "2026-10-01T07:17:00Z" }, now).tone).toBe("warning");
    expect(describeBackup({ ok: true, lastAttemptAt: "2026-10-10T07:17:00Z", lastSuccessAt: "2026-10-10T07:17:00Z" }, now).tone).toBe("success");
  });
});
