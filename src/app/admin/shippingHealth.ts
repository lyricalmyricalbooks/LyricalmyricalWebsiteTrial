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
        if (!String(rate?.deliveryDays || "").trim()) {
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
