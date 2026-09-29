export type ShippingIssue = {
  id: string;
  label: string;
  detail: string;
  profileId?: string;
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

  for (const profile of profiles) {
    const zones = Array.isArray(profile?.zones) ? profile.zones : [];
    zoneCount += zones.length;
    if (zones.length === 0) {
      issues.push({
        id: `profile:${profile.id}:zones`,
        label: `${profile.name || "Untitled profile"} has no zones`,
        detail: "Customers using this profile cannot be matched to a destination.",
        profileId: profile.id,
      });
      continue;
    }

    for (const zone of zones) {
      const zoneCountries = Array.isArray(zone?.countries) ? zone.countries : [];
      zoneCountries.forEach((country: string) => countries.add(country));
      const rates = Array.isArray(zone?.rates) ? zone.rates : [];
      rateCount += rates.length;
      if (rates.length === 0) {
        issues.push({
          id: `profile:${profile.id}:zone:${zone.id}:rates`,
          label: `${zone.name || "Untitled zone"} has no rates`,
          detail: `Add a rate in ${profile.name || "this profile"} before customers can check out for this zone.`,
          profileId: profile.id,
        });
      }
    }
  }

  const profileIds = new Set(profiles.map((profile) => profile.id));
  const orphaned = books.filter((book) => book.shippingProfileId && !profileIds.has(book.shippingProfileId));
  if (orphaned.length > 0) {
    issues.push({
      id: "orphaned-products",
      label: `${orphaned.length} product${orphaned.length === 1 ? "" : "s"} use a missing profile`,
      detail: "Reassign these products so checkout can resolve their shipping rules.",
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
