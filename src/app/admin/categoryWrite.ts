export const SHOP_CATEGORY_MERGE_FIELDS = ["design.categories", "draftDesign.categories"] as const;

/**
 * Build the single Firestore write used for category changes. Keeping both
 * category paths in one payload makes the live storefront and Studio draft
 * move together without replacing either design map.
 */
export function shopCategoryWrite(categories: unknown[]) {
  const snapshot = JSON.parse(JSON.stringify(categories));
  return {
    payload: {
      design: { categories: snapshot },
      draftDesign: { categories: snapshot },
    },
    options: { mergeFields: [...SHOP_CATEGORY_MERGE_FIELDS] },
  };
}
