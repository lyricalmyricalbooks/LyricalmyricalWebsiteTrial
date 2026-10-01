/**
 * Build the narrow Firestore write used for shared shop categories.
 * Keeping this pure makes it explicit that category saves cannot replace an
 * unrelated live design or an unpublished Studio working copy.
 */
export function shopCategoryWrite(categories: any[]) {
  const snapshot = JSON.parse(JSON.stringify(categories));
  return {
    payload: { design: { categories: snapshot }, draftDesign: { categories: snapshot } },
    options: { mergeFields: ["design.categories", "draftDesign.categories"] },
  };
}
