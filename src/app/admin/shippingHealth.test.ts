import { describe, expect, it } from "vitest";
import { summarizeShipping } from "./shippingHealth";

describe("summarizeShipping", () => {
  it("counts profiles, zones, rates, unique countries, and assignments", () => {
    const summary = summarizeShipping([
      { id: "general", name: "General", zones: [{ id: "ca", name: "Canada", countries: ["CA"], rates: [{ id: "standard", name: "Standard", deliveryDays: "3-7" }] }] },
      { id: "art", name: "Art books", zones: [{ id: "intl", name: "International", countries: ["CA", "US"], rates: [{ id: "express", name: "Express", deliveryDays: "2-4" }, { id: "tracked", name: "Tracked", deliveryDays: "5-10" }] }] },
    ], [
      { id: "one", shippingProfileId: "general" },
      { id: "two", shippingProfileId: "art" },
      { id: "three" },
    ]);

    expect(summary).toMatchObject({ profileCount: 2, zoneCount: 2, rateCount: 3, coveredCountryCount: 2, assignedProductCount: 2 });
    expect(summary.issues).toEqual([]);
  });

  it("surfaces profiles without zones, zones without rates, and missing profile assignments", () => {
    const summary = summarizeShipping([
      { id: "general", name: "General", zones: [] },
      { id: "special", name: "Special", zones: [{ id: "us", name: "United States", countries: ["US"], rates: [] }] },
    ], [{ id: "orphan", shippingProfileId: "deleted-profile" }]);

    expect(summary.issues.map((issue) => issue.id)).toEqual([
      "profile:general:zones",
      "profile:special:zone:us:rates",
      "orphaned-products",
    ]);
  });
});

describe("shipping safety diagnostics", () => {
  it("flags missing profiles", () => expect(summarizeShipping([], []).issues.map(i => i.id)).toContain("no-profiles"));
  it("flags empty destinations, overlapping zones, malformed rates, and duplicate names", () => {
    const summary = summarizeShipping([{ id: "p", name: "General", zones: [
      { id: "a", name: "A", countries: ["CA"], rates: [{ id: "1", name: "Standard", base: -1, additional: 0, deliveryDays: "" }] },
      { id: "b", name: "B", countries: ["CA"], rates: [{ id: "2", name: "Standard", base: 1, additional: 0, deliveryDays: "3-5" }, { id: "3", name: "Standard", base: 2, additional: 0, deliveryDays: "3-5" }] },
      { id: "c", name: "C", countries: [], rates: [{ id: "4", name: "", base: 0, additional: 0, deliveryDays: "2" }] },
    ] }], []);
    const ids = summary.issues.map(i => i.id);
    expect(ids.some(id => id.endsWith(":countries"))).toBe(true);
    expect(ids.some(id => id.endsWith(":duplicates"))).toBe(true);
    expect(ids.some(id => id.endsWith(":negative"))).toBe(true);
    expect(ids.some(id => id.endsWith(":delivery"))).toBe(true);
    expect(ids.some(id => id.endsWith(":duplicate"))).toBe(true);
    expect(ids.some(id => id.endsWith(":name"))).toBe(true);
  });
});
