type Field = { key: string; kind: string };

/** Data-only theme checks kept independent of editor components for reliable tests. */
export function designChecks(
  design: any,
  schema: {
    sectionFields: (type: string) => Field[];
    blockFields: (type: string) => Field[];
    blocksKey: (type: string) => string;
  },
): { tone: "ok" | "warn"; text: string }[] {
  const sections = [
    ...(Array.isArray(design?.globalSections) ? design.globalSections : []),
    ...Object.values(design || {}).flatMap((value: any) => Array.isArray(value?.sections) ? value.sections : []),
  ];
  const images: { url: string; alt: string }[] = [];
  const collectImages = (content: any, fields: Field[]) => {
    for (const field of fields.filter(field => field.kind === "image")) {
      const url = content?.[field.key];
      if (!url || typeof url !== "string") continue;
      const altKey = [`${field.key}Alt`, `${field.key}AltText`, "alt", "imageAlt", "imageAltText"].find(key => content[key] != null);
      images.push({ url, alt: altKey ? content[altKey] : "" });
    }
  };
  const collectBlocks = (sectionType: string, blocks: any[]) => (blocks || []).forEach(block => {
    collectImages(block, schema.blockFields(sectionType));
    collectBlocks(sectionType, block?.children || []);
  });
  sections.forEach((section: any) => {
    collectImages(section.settings, schema.sectionFields(section.type));
    const key = schema.blocksKey(section.type);
    const blocks = section.settings?.[key]?.length ? section.settings[key] : section.settings?.blocks || [];
    collectBlocks(section.type, blocks);
  });

  const results: { tone: "ok" | "warn"; text: string }[] = [];
  const empty = sections.filter((section: any) => {
    const fields = schema.sectionFields(section.type).filter(field => ["text", "textarea", "richtext", "html", "image", "list"].includes(field.kind));
    const hasText = (text: string) => Boolean(text.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").trim());
    const hasContent = fields.some(field => {
      const value = section.settings?.[field.key];
      return typeof value === "string" ? hasText(value) : Array.isArray(value)
        ? value.some(item => typeof item === "string" ? hasText(item) : item && Object.values(item).some(v => typeof v === "string" && hasText(v)))
        : false;
    });
    const blockFields = schema.blockFields(section.type).filter(field => ["text", "textarea", "richtext", "html", "image"].includes(field.kind));
    const hasBlockContent = (blocks: any[]): boolean => (blocks || []).some(block =>
      blockFields.some(field => typeof block[field.key] === "string" && hasText(block[field.key])) || hasBlockContent(block.children || []));
    const key = schema.blocksKey(section.type);
    const blocks = section.settings?.[key]?.length ? section.settings[key] : section.settings?.blocks || [];
    return !hasContent && !hasBlockContent(blocks);
  }).length;
  results.push({ tone: empty ? "warn" : "ok", text: empty ? `${empty} section${empty === 1 ? " is" : "s are"} empty or may lack meaningful content.` : "No obviously empty sections." });
  const missingAlt = images.filter(image => !image.alt.trim()).length;
  results.push({ tone: missingAlt ? "warn" : "ok", text: missingAlt ? `${missingAlt} image${missingAlt === 1 ? " needs" : "s need"} a description.` : "All configured section and block images have descriptions." });
  results.push({ tone: "warn", text: "Image file sizes are not measured here. Check large hero images before publishing." });
  results.push({ tone: "warn", text: "Contrast is not automatically measured here. Review the contrast indicators in Style before publishing." });
  return results;
}
