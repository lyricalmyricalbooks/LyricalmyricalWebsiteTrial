// Address suggestions while typing, from Photon (OpenStreetMap data, free, no API key).
import { COUNTRIES } from "./shippingZones";
import { regionsFor } from "./postalRegion";

export type AddressSuggestion = {
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const PHOTON_URL = "https://photon.komoot.io/api/";

/** Turns one Photon feature into checkout fields; null when it isn't a street address. */
export function toSuggestion(props: any, fallbackCountry: string): AddressSuggestion | null {
  if (!props) return null;
  const streetName = props.street || (props.type === "street" ? props.name : "");
  if (!streetName) return null;
  const street = [props.housenumber, streetName].filter(Boolean).join(" ");
  const code = String(props.countrycode || "").toUpperCase();
  const country = COUNTRIES.find(c => c.code === code)?.name || props.country || fallbackCountry;
  const regions = regionsFor(country);
  const rawState = String(props.state || "");
  const state = regions?.find(([c, name]) => name.toLowerCase() === rawState.toLowerCase() || c === rawState.toUpperCase())?.[0] || rawState;
  const city = props.city || props.town || props.village || props.district || "";
  const zip = props.postcode || "";
  return {
    label: [street, city, state, zip].filter(Boolean).join(", "),
    street, city, state, zip, country,
  };
}

/** Looks up addresses matching what the shopper typed, limited to their chosen country. */
export async function searchAddresses(query: string, country: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 4) return [];
  const code = COUNTRIES.find(c => c.name === country)?.code?.toLowerCase();
  const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=8&lang=en&layer=house&layer=street`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  const seen = new Set<string>();
  return (data.features || [])
    .map((f: any) => f.properties)
    .filter((p: any) => !code || String(p?.countrycode || "").toLowerCase() === code)
    .map((p: any) => toSuggestion(p, country))
    .filter((s: AddressSuggestion | null): s is AddressSuggestion => {
      if (!s || seen.has(s.label)) return false;
      seen.add(s.label);
      return true;
    })
    .slice(0, 5);
}
