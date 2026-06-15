export type ColorScheme = {
  id: string;
  name: string;
  background: string;
  text: string;
  accent: string;
};

export const DEFAULT_COLOR_SCHEMES: ColorScheme[] = [
  { id: "scheme-default", name: "Default", background: "#ffffff", text: "#111111", accent: "#A855F7" },
  { id: "scheme-inverse", name: "Inverse", background: "#0a0a0a", text: "#ffffff", accent: "#A855F7" },
  { id: "scheme-accent", name: "Accent", background: "#A855F7", text: "#ffffff", accent: "#ffffff" },
];
