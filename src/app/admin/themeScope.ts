/**
 * Copy visual theme keys into every page surface while preserving page-local
 * content such as section stacks. Storefront pages resolve their surface object
 * before root defaults, so writing only to the root does not produce a truly
 * site-wide change once a surface has been customized.
 */
export function applyThemeKeysToSurfaces(
  design: Record<string, any>,
  keys: Record<string, any>,
  surfaceIds: string[],
) {
  const next = { ...design, ...keys };
  surfaceIds.forEach((id) => {
    next[id] = { ...(design[id] || {}), ...keys };
  });
  return next;
}
