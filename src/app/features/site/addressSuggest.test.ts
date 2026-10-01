import { describe, expect, it } from "vitest";
import { toSuggestion } from "./addressSuggest";

describe("toSuggestion", () => {
  it("maps a Photon house result to checkout fields", () => {
    const s = toSuggestion({ housenumber: "456", street: "Montrose Avenue", city: "Toronto", state: "Ontario", postcode: "M6G 3H1", countrycode: "CA" }, "Canada");
    expect(s).toMatchObject({ street: "456 Montrose Avenue", city: "Toronto", state: "ON", zip: "M6G 3H1", country: "Canada" });
  });
  it("skips places that aren't street addresses", () => {
    expect(toSuggestion({ name: "Toronto", type: "city", countrycode: "CA" }, "Canada")).toBeNull();
  });
});
