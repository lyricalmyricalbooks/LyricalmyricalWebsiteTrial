// Shared by the storefront (useSiteData) and build-time SEO (scripts/publicStorefrontData.mjs).
// A scheduled design goes live once its time arrives — but only if nothing was published
// after it was due. Otherwise a past-due schedule would silently override every later Publish.

/** The scheduled design shoppers should see now, or null when the published design applies. */
export function dueScheduledDesign(settings, now = new Date()) {
  const sched = settings?.scheduledPublish;
  if (!sched?.at || !sched?.design) return null;
  const at = new Date(sched.at).getTime();
  if (!Number.isFinite(at) || at > new Date(now).getTime()) return null;
  const publishedAt = settings.designPublishedAt ? new Date(settings.designPublishedAt).getTime() : NaN;
  if (Number.isFinite(publishedAt) && publishedAt >= at) return null;
  return sched.design;
}
