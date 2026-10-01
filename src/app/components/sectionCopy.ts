import { createContext, useContext } from "react";
import { getCopy } from "../features/site/storeCopy";

// Section renderers are pure (no data hooks), so the page's design travels down by context:
// SectionList provides it, renderers read the shopper-facing helper words (image placeholders,
// screen-reader labels) through getCopy → Studio › Text & labels › Sections.
export const SectionDesignContext = createContext<any>(null);

export function useSectionCopy() {
  const design = useContext(SectionDesignContext);
  return (key: string, vars?: Record<string, string | number>) => getCopy(design, key, vars);
}
