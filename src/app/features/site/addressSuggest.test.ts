import { afterEach, describe, expect, it, vi } from "vitest";
import { searchAddresses, toSuggestion } from "./addressSuggest";

describe("toSuggestion", () => {
  it("maps a Photon house result to checkout fields", () => {
    const s = toSuggestion({ housenumber: "456", street: "Montrose Avenue", city: "Toronto", state: "Ontario", postcode: "M6G 3H1", countrycode: "CA" }, "Canada");
    expect(s).toMatchObject({ street: "456 Montrose Avenue", city: "Toronto", state: "ON", zip: "M6G 3H1", country: "Canada" });
  });
  it("skips places that aren't street addresses", () => {
    expect(toSuggestion({ name: "Toronto", type: "city", countrycode: "CA" }, "Canada")).toBeNull();
  });
});

describe("searchAddresses", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("biases to the chosen country, filters out others and keeps the typed house number", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ features: [
      { properties: { type: "street", name: "New Street", city: "Birmingham", countrycode: "GB" } },
      { properties: { type: "street", name: "New Street", city: "Toronto", state: "Ontario", countrycode: "CA" } },
    ] }) }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await searchAddresses("57 new street", "Canada");
    const url = String((fetchMock.mock.calls[0] as any[])[0]);
    expect(url).toContain("limit=25");
    expect(url).toContain("lat=45.5");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ street: "57 New Street", city: "Toronto", state: "ON" });
  });
});
