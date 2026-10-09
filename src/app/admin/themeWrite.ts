/** Replace design maps atomically, preserving unrelated website settings. */
export function themeWrite(settings: Record<string, any>, publish = false, now = new Date()) {
  const payload = JSON.parse(JSON.stringify(settings));
  if (payload.design) {
    payload.draftDesign = payload.design;
    if (!publish) delete payload.design;
    // Lets a past-due scheduled design step aside for this newer Publish (scheduledDesign.mjs).
    else payload.designPublishedAt = now.toISOString();
  }
  return { payload, options: { mergeFields: Object.keys(payload) } };
}
