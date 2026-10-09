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

/**
 * What page the sections are on (Studio 2.6): on a product page, the book being shown. Book spotlight uses it when no
 * book is picked; the sticky add-to-bag bar needs it. Elsewhere it is empty.
 */
export const SectionPageContext = createContext<{ book?: any }>({});
export function useSectionPage() {
  return useContext(SectionPageContext);
}
