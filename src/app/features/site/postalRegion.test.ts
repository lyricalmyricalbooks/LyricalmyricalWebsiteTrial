import { describe, expect, it } from "vitest";
import { cleanRegion, provinceFromPostal } from "./postalRegion";

describe("provinceFromPostal", () => {
  it("reads Canadian provinces", () => {
    expect(provinceFromPostal("Canada", "M6G3H1")).toBe("ON");
    expect(provinceFromPostal("Canada", "v6b 1a1")).toBe("BC");
    expect(provinceFromPostal("Canada", "H2X 1Y4")).toBe("QC");
    expect(provinceFromPostal("Canada", "X0A 0H0")).toBe("NU");
  });
  it("reads US states", () => {
    expect(provinceFromPostal("United States", "10001")).toBe("NY");
    expect(provinceFromPostal("United States", "94105")).toBe("CA");
    expect(provinceFromPostal("United States", "abc")).toBe("");
  });
  it("ignores other countries", () => expect(provinceFromPostal("France", "75001")).toBe(""));
  it("clears placeholders", () => {
    expect(cleanRegion("Please select")).toBe("");
    expect(cleanRegion(" ON ")).toBe("ON");
  });
});
