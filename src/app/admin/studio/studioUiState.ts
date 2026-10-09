// What Studio remembers between visits (per admin, this browser only): where you were and how
// the editor was laid out. Never design data. Every read is validated; bad values fall back.

export type Zoom = "fit" | 100 | 75 | 50;
export type StudioUiState = {
  leftTab?: string; templateId?: string; showGlobal?: boolean;
  device?: "desktop" | "tablet" | "mobile"; zoom?: Zoom; productSlug?: string; collectionSlug?: string;
};

const TABS = new Set(["sections", "style", "text", "menus", "pages"]);
const DEVICES = new Set(["desktop", "tablet", "mobile"]);
const ZOOMS = new Set<Zoom>(["fit", 100, 75, 50]);
const text = (v: any) => (typeof v === "string" && v.length < 200 ? v : undefined);

export function parseUiState(raw: string | null): StudioUiState {
  try {
    const v = JSON.parse(raw || "{}") || {};
    return {
      leftTab: TABS.has(v.leftTab) ? v.leftTab : v.leftTab === "shared" ? "sections" : undefined,
      templateId: text(v.templateId),
      showGlobal: v.showGlobal === true ? true : undefined,
      device: DEVICES.has(v.device) ? v.device : undefined,
      zoom: ZOOMS.has(v.zoom) ? v.zoom : undefined,
      productSlug: text(v.productSlug),
      collectionSlug: text(v.collectionSlug),
    };
  } catch { return {}; }
}

export function uiStateKey(base: string, uid: string) { return `studio-ui-v1:${base}:${uid}`; }

export function loadUiState(key: string): StudioUiState {
  try { return parseUiState(localStorage.getItem(key)); } catch { return {}; }
}

export function saveUiState(key: string, state: StudioUiState) {
  try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* private window: Studio still works */ }
}

/** Scale that fits a device-width preview into the space available (never above 100%). */
export function fitScale(available: number, deviceWidth: number) {
  if (!(available > 0) || !(deviceWidth > 0)) return 1;
  return Math.max(0.25, Math.min(1, available / deviceWidth));
}
