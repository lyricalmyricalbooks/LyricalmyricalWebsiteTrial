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

// Rough country centres: Photon has no country filter, so results are biased toward the chosen country.
const COUNTRY_CENTRES: Record<string, [number, number]> = {
  ca: [45.5, -79], us: [39.5, -98.35], gb: [52.5, -1.5], ie: [53.3, -7.7], au: [-33, 147],
  nz: [-40.9, 174.9], fr: [46.6, 2.4], de: [51.1, 10.4], nl: [52.2, 5.3], es: [40.4, -3.7],
  it: [42.8, 12.6], mx: [19.4, -99.1], jp: [35.7, 139.7],
};

/** Turns one Photon feature into checkout fields; null when it isn't a street address. */
export function toSuggestion(props: any, fallbackCountry: string, typedNumber = ""): AddressSuggestion | null {
  if (!props) return null;
  const streetName = props.street || (props.type === "street" ? props.name : "");
  if (!streetName) return null;
  // A street-only match keeps the house number the shopper already typed.
  const street = [props.housenumber || typedNumber, streetName].filter(Boolean).join(" ");
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

async function fetchPhoton(q: string, code: string | undefined, signal?: AbortSignal): Promise<any[]> {
  const centre = code ? COUNTRY_CENTRES[code] : undefined;
  const bias = centre ? `&lat=${centre[0]}&lon=${centre[1]}&location_bias_scale=0.1&zoom=4` : "";
  const res = await fetch(`${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=25&lang=en&layer=house&layer=street${bias}`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || []).map((f: any) => f.properties);
}

/** Looks up addresses matching what the shopper typed, limited to their chosen country. */
export async function searchAddresses(query: string, country: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 4) return [];
  const code = COUNTRIES.find(c => c.name === country)?.code?.toLowerCase();
  const typedNumber = q.match(/^(\d+[a-z]?)\b/i)?.[1] || "";
  const pick = (props: any[]) => {
    const seen = new Set<string>();
    return props
      .filter((p: any) => !code || String(p?.countrycode || "").toLowerCase() === code)
      .map((p: any) => toSuggestion(p, country, typedNumber))
      .filter((s: AddressSuggestion | null): s is AddressSuggestion => {
        if (!s || seen.has(s.label)) return false;
        seen.add(s.label);
        return true;
      })
      .slice(0, 5);
  };
  let out = pick(await fetchPhoton(q, code, signal));
  // Nothing in the chosen country: try once more naming the country in the query.
  if (!out.length && code && country) out = pick(await fetchPhoton(`${q}, ${country}`, code, signal));
  return out;
}
