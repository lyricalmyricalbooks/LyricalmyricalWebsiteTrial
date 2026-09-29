export type ShippingIssue = {
  id: string;
  label: string;
  detail: string;
  profileId?: string;
  severity?: "blocking" | "warning";
};

export type ShippingSummary = {
  profileCount: number;
  zoneCount: number;
  rateCount: number;
  coveredCountryCount: number;
  assignedProductCount: number;
  issues: ShippingIssue[];
};

/** Admin-only configuration summary. Checkout still resolves and validates rates server-side. */
export function summarizeShipping(profiles: any[] = [], books: any[] = []): ShippingSummary {
  const countries = new Set<string>();
  const issues: ShippingIssue[] = [];
  let zoneCount = 0;
  let rateCount = 0;

  if (profiles.length === 0) {
    issues.push({
      id: "no-profiles",
      label: "No shipping profile exists",
      detail: "Create a profile with at least one destination and rate before accepting physical orders.",
      severity: "blocking",
    });
  }

  for (const profile of profiles) {
    const zones = Array.isArray(profile?.zones) ? profile.zones : [];
    const claimedCountries = new Set<string>();
    zoneCount += zones.length;
    if (zones.length === 0) {
      issues.push({
        id: `profile:${profile.id}:zones`,
        label: `${profile.name || "Untitled profile"} has no zones`,
        detail: "Customers using this profile cannot be matched to a destination.",
        profileId: profile.id,
        severity: "blocking",
      });
      continue;
    }

    for (const zone of zones) {
      const zoneCountries = Array.isArray(zone?.countries) ? zone.countries : [];
      if (zoneCountries.length === 0) {
        issues.push({ id: `profile:${profile.id}:zone:${zone.id}:countries`, label: `${zone.name || "Untitled zone"} has no destinations`, detail: "Select at least one country so this zone can match a checkout address.", profileId: profile.id, severity: "blocking" });
      }
      const duplicates = zoneCountries.filter((country: string) => claimedCountries.has(country));
      if (duplicates.length > 0) {
        issues.push({ id: `profile:${profile.id}:zone:${zone.id}:duplicates`, label: `${zone.name || "Untitled zone"} overlaps another zone`, detail: `${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "…" : ""} can match more than one zone. Keep each destination in one zone per profile.`, profileId: profile.id, severity: "blocking" });
      }
      zoneCountries.forEach((country: string) => claimedCountries.add(country));
      zoneCountries.forEach((country: string) => countries.add(country));
      const rates = Array.isArray(zone?.rates) ? zone.rates : [];
      rateCount += rates.length;
      if (rates.length === 0) {
        issues.push({
          id: `profile:${profile.id}:zone:${zone.id}:rates`,
          label: `${zone.name || "Untitled zone"} has no rates`,
          detail: `Add a rate in ${profile.name || "this profile"} before customers can check out for this zone.`,
          profileId: profile.id,
          severity: "blocking",
        });
      }
      const rateNames = new Set<string>();
      rates.forEach((rate: any) => {
        const normalizedName = String(rate?.name || "").trim().toLowerCase();
        if (!normalizedName) {
          issues.push({ id: `profile:${profile.id}:zone:${zone.id}:rate:${rate?.id}:name`, label: `${zone.name || "Untitled zone"} has an unnamed rate`, detail: "Give every delivery option a customer-facing name.", profileId: profile.id, severity: "blocking" });
        } else if (rateNames.has(normalizedName)) {
          issues.push({ id: `profile:${profile.id}:zone:${zone.id}:rate:${rate?.id}:duplicate`, label: `${zone.name || "Untitled zone"} has duplicate rate names`, detail: `“${rate.name}” appears more than once and is ambiguous at checkout.`, profileId: profile.id, severity: "warning" });
        }
        rateNames.add(normalizedName);
        if (Number(rate?.base) < 0 || Number(rate?.additional) < 0) {
          issues.push({ id: `profile:${profile.id}:zone:${zone.id}:rate:${rate?.id}:negative`, label: `${rate?.name || "A rate"} has a negative price`, detail: "Shipping charges cannot be negative. Set the base and additional-item prices to zero or more.", profileId: profile.id, severity: "blocking" });
        }
        rateIssues(rate).forEach((msg, k) => issues.push({ id: `profile:${profile.id}:zone:${zone.id}:rate:${rate?.id}:cond${k}`, label: `${rate?.name || "A rate"}: ${msg}`, detail: "This rate could never be offered or would charge nothing by mistake. Fix it in the rate's settings.", profileId: profile.id, severity: "blocking" }));
        if (rate?.type !== "pickup" && !String(rate?.deliveryDays || "").trim()) {
          issues.push({ id: `profile:${profile.id}:zone:${zone.id}:rate:${rate?.id}:delivery`, label: `${rate?.name || "A rate"} has no delivery estimate`, detail: "Add an estimate such as 3–7 days so customers know when to expect delivery.", profileId: profile.id, severity: "warning" });
        }
      });
    }
  }

  const profileIds = new Set(profiles.map((profile) => profile.id));
  const orphaned = books.filter((book) => book.shippingProfileId && !profileIds.has(book.shippingProfileId));
  if (orphaned.length > 0) {
    issues.push({
      id: "orphaned-products",
      label: `${orphaned.length} product${orphaned.length === 1 ? "" : "s"} use a missing profile`,
      detail: "Reassign these products so checkout can resolve their shipping rules.",
      severity: "blocking",
    });
  }

  return {
    profileCount: profiles.length,
    zoneCount,
    rateCount,
    coveredCountryCount: countries.size,
    assignedProductCount: books.filter((book) => !!book.shippingProfileId).length,
    issues,
  };
}


export const RATE_TYPES: { id: string; label: string; help: string }[] = [
  { id: "flat", label: "Base + per extra book", help: "Base covers the first book; each additional book adds the extra amount." },
  { id: "order", label: "Flat rate per order", help: "One price for the whole order, however many books." },
  { id: "weight", label: "By weight", help: "Base plus a price per kg of the cart. Set book weights (or an assumed weight) so this is accurate." },
  { id: "percent", label: "Percentage of order", help: "Base plus a percentage of the book subtotal — good for high-value or signed editions." },
  { id: "free", label: "Free shipping", help: "Always free. Combine with an order-total condition for a 'free over $X' option." },
  { id: "pickup", label: "Local pickup", help: "Free, collect in person — e.g. at a launch event or the press." },
];

const usd = (n: any) => `$${Number(n || 0).toFixed(2)}`;

/** Short plain-English price summary for the rates table. */
export function describeRatePrice(rate: any): string {
  const type = rate?.type || "flat";
  let text: string;
  if (type === "free") text = "Free";
  else if (type === "pickup") text = "Free pickup";
  else if (type === "order") text = `${usd(rate.base)} per order`;
  else if (type === "weight") text = `${usd(rate.base)} + ${usd(rate.perKg)}/kg`;
  else if (type === "percent") text = `${usd(rate.base)} + ${Number(rate.percent || 0)}% of books`;
  else text = `${usd(rate.base)} + ${usd(rate.additional)} per extra`;
  if (Number(rate?.handlingFee) > 0) text += ` + ${usd(rate.handlingFee)} handling`;
  if (Number(rate?.freeOver) > 0) text += ` · free over ${usd(rate.freeOver)}`;
  return text;
}

const has = (v: any) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));

/** Plain-English conditions under which a rate is offered ("" = always). */
export function describeRateConditions(rate: any): string {
  const parts: string[] = [];
  const range = (lo: any, hi: any, fmt: (n: any) => string, label: string) => {
    if (has(lo) && has(hi)) parts.push(`${label} ${fmt(lo)}–${fmt(hi)}`);
    else if (has(lo)) parts.push(`${label} ≥ ${fmt(lo)}`);
    else if (has(hi)) parts.push(`${label} ≤ ${fmt(hi)}`);
  };
  range(rate?.minPrice, rate?.maxPrice, usd, "order");
  range(rate?.minWeight, rate?.maxWeight, (n) => `${Number(n)}g`, "weight");
  range(rate?.minItems, rate?.maxItems, (n) => `${Number(n)}`, "items");
  return parts.join(" · ");
}

/** Ready-made zones for a new profile: Canada, USA and everywhere else. */
export function starterZones(newId: () => string) {
  const rate = (name: string, base: number, additional: number, deliveryDays: string, extra: any = {}) =>
    ({ id: newId(), name, type: "flat", enabled: true, base, additional, deliveryDays, minPrice: null, maxPrice: null, ...extra });
  return [
    { id: newId(), name: "Canada", countries: ["CA"], continents: [], restOfWorld: false, rates: [
      rate("Standard Shipping", 8, 3, "3-7"), rate("Free shipping over $75", 0, 0, "3-7", { type: "free", minPrice: 75 }) ] },
    { id: newId(), name: "United States", countries: ["US"], continents: [], restOfWorld: false, rates: [ rate("Standard Shipping", 12, 4, "5-10") ] },
    { id: newId(), name: "Rest of world", countries: [], continents: [], restOfWorld: true, rates: [ rate("International Shipping", 20, 6, "10-21") ] },
  ];
}

/** Extra rate-level configuration issues surfaced by summarizeShipping. */
export function rateIssues(rate: any): string[] {
  const out: string[] = [];
  const pair = (lo: any, hi: any, what: string) => { if (has(lo) && has(hi) && Number(lo) > Number(hi)) out.push(`${what} minimum is higher than its maximum`); };
  pair(rate?.minPrice, rate?.maxPrice, "order total");
  pair(rate?.minWeight, rate?.maxWeight, "weight");
  pair(rate?.minItems, rate?.maxItems, "item count");
  if ((rate?.type === "weight") && !(Number(rate?.perKg) > 0) && !(Number(rate?.base) > 0)) out.push("weight rate has no base or per-kg price");
  if ((rate?.type === "percent") && !(Number(rate?.percent) > 0) && !(Number(rate?.base) > 0)) out.push("percentage rate has no percent or base price");
  return out;
}
