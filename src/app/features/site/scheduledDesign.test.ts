import { describe, expect, it } from "vitest";
import { dueScheduledDesign } from "./scheduledDesign.mjs";
import { effectivePublishedSettings } from "../../../../scripts/publicStorefrontData.mjs";

const scheduled = { primaryColor: "red" };
const base = { design: { primaryColor: "blue" }, scheduledPublish: { at: "2026-10-10T09:00:00Z", design: scheduled } };

describe("scheduled designs", () => {
  it("waits until the scheduled time", () => {
    expect(dueScheduledDesign(base, "2026-10-09T09:00:00Z")).toBeNull();
    expect(dueScheduledDesign(base, "2026-10-10T09:00:00Z")).toBe(scheduled);
  });
  it("steps aside once something newer was published", () => {
    const later = { ...base, designPublishedAt: "2026-10-11T08:00:00Z" };
    expect(dueScheduledDesign(later, "2026-10-12T00:00:00Z")).toBeNull();
  });
  it("still goes live when the last Publish happened before it was due", () => {
    const earlier = { ...base, designPublishedAt: "2026-10-05T08:00:00Z" };
    expect(dueScheduledDesign(earlier, "2026-10-12T00:00:00Z")).toBe(scheduled);
  });
  it("ignores missing or malformed schedules", () => {
    expect(dueScheduledDesign({ design: {} })).toBeNull();
    expect(dueScheduledDesign({ scheduledPublish: { at: "not a date", design: scheduled } })).toBeNull();
  });
  it("build-time SEO uses the same rule and drops admin-only fields", () => {
    const later = { ...base, draftDesign: {}, savedThemes: [], designPublishedAt: "2026-10-11T08:00:00Z" };
    expect(effectivePublishedSettings(later, "2026-10-12T00:00:00Z")).toEqual({ design: base.design });
  });
});
