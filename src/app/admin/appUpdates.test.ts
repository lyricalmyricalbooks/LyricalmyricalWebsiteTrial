import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { APP_UPDATES, updateOrder } from "./appUpdates";
import { NAV } from "./riso/nav";
import { parseStudioLocation } from "../lib/studioLocation";

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
        if (link.studio) expect(parseStudioLocation(link.studio), link.label).not.toBeNull();
      }
    }
  });

  it("keeps one file per note, named after its date and id, newest first", () => {
    const names = readdirSync(new URL("./updates", import.meta.url)).filter(n => n.endsWith(".ts"));
    expect(names.length).toBe(APP_UPDATES.length);
    // The same pattern the app-release-notes workflow requires of a PR's new note.
    for (const n of names) expect(n).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-[a-z0-9-]+\.ts$/);
    for (const entry of APP_UPDATES) {
      const name = names.find(n => n.endsWith(`-${entry.id}.ts`));
      expect(name, entry.id).toMatch(new RegExp(`^${entry.date}-\\d{2}-`));
    }
    const dates = APP_UPDATES.map(e => e.date);
    expect(dates).toEqual([...dates].sort().reverse());
    // Within a day the higher number is the newer note.
    expect(updateOrder(["./updates/2026-10-09-01-a.ts", "./updates/2026-10-09-02-b.ts", "./updates/2026-10-08-07-c.ts"]))
      .toEqual(["./updates/2026-10-09-02-b.ts", "./updates/2026-10-09-01-a.ts", "./updates/2026-10-08-07-c.ts"]);
  });
});
