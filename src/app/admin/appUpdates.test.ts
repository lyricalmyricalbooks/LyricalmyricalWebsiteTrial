import { describe, expect, it } from "vitest";
import { APP_UPDATES } from "./appUpdates";
import { NAV } from "./riso/nav";

describe("app release notes", () => {
  it("keeps unique dated entries with working admin destinations", () => {
    expect(APP_UPDATES.length).toBeGreaterThan(0);
    expect(new Set(APP_UPDATES.map((entry) => entry.id)).size).toBe(APP_UPDATES.length);
    for (const entry of APP_UPDATES) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.title.trim()).not.toBe("");
      expect(entry.summary.trim()).not.toBe("");
      expect(entry.links.length).toBeGreaterThan(0);
      for (const link of entry.links) {
        const destination = NAV.find((item) => item.id === link.tab);
        expect(destination, link.label).toBeDefined();
        if (link.settingsTab) expect(destination?.children?.some((child) => child.id === link.settingsTab), link.label).toBe(true);
      }
    }
  });
});
