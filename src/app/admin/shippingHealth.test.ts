import { describe, expect, it } from "vitest";
import { summarizeShipping } from "./shippingHealth";

describe("summarizeShipping", () => {
  it("counts profiles, zones, rates, unique countries, and assignments", () => {
    const summary = summarizeShipping([
      { id: "general", name: "General", zones: [{ id: "ca", name: "Canada", countries: ["CA"], rates: [{ id: "standard" }] }] },
      { id: "art", name: "Art books", zones: [{ id: "intl", name: "International", countries: ["CA", "US"], rates: [{ id: "express" }, { id: "tracked" }] }] },
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
