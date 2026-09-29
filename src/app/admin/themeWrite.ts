/** Replace design maps atomically, preserving unrelated website settings. */
export function themeWrite(settings: Record<string, any>, publish = false) {
  const payload = JSON.parse(JSON.stringify(settings));
  if (payload.design) {
    payload.draftDesign = payload.design;
    if (!publish) delete payload.design;
  }
  return { payload, options: { mergeFields: Object.keys(payload) } };
}
