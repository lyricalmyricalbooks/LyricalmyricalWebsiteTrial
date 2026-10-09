import { createContext, useContext } from "react";
import { getCopy } from "../features/site/storeCopy";

// Section renderers are pure (no data hooks), so the page's design travels down by context:
// SectionList provides it, renderers read the shopper-facing helper words (image placeholders,
// screen-reader labels) through getCopy → Studio › Text & labels › Sections.
export const SectionDesignContext = createContext<any>(null);

/** The page design (or null) — e.g. the shop's categories for a "Which books: category" source. */
export function useSectionDesign(): any {
  return useContext(SectionDesignContext);
}

export function useSectionCopy() {
  const design = useContext(SectionDesignContext);
  return (key: string, vars?: Record<string, string | number>) => getCopy(design, key, vars);
}
