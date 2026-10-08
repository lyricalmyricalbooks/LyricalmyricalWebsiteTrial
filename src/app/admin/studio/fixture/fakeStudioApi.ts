// In-memory stand-in for the parts of `adminApi` Studio uses, so Studio can be mounted in
// tests and in the local fixture page (studio-fixture.html) without a signed-in admin or
// Firestore. Every write is recorded in `calls` so checks can assert what would have been saved.
import { DEFAULT_SETTINGS } from "../../../features/site/constants";

export type FixtureCall = { method: string; args: any[] };
export type StudioFixture = { calls: FixtureCall[]; settings: any; pages: any[]; books: any[]; versions: any[] };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? null));

export const FIXTURE_BOOKS = [
  { id: "b1", slug: "night-pages", title: "Night Pages", author: "A. Writer", retailPrice: 32, stockLevel: 6, status: "published", categories: ["PUBLICATIONS"], photos: [] },
  { id: "b2", slug: "paper-weather", title: "Paper Weather", author: "B. Poet", retailPrice: 24, salePrice: 18, isOnSale: true, stockLevel: 2, status: "published", categories: ["EPHEMERA"], photos: [] },
  { id: "b3", slug: "unreleased", title: "Unreleased Draft", retailPrice: 20, stockLevel: 0, status: "draft", photos: [] },
];

export const FIXTURE_PAGES = [
  { id: "p1", slug: "about", title: "About", body: "<p>We publish books.</p>", status: "published", showInNav: true },
  { id: "p2", slug: "open-call", title: "Open call", body: "<p>Coming soon.</p>", status: "draft", showInNav: true },
];

export function createStudioFixture(overrides: Partial<StudioFixture> = {}): StudioFixture {
  const settings = overrides.settings ?? clone({ ...DEFAULT_SETTINGS, design: (DEFAULT_SETTINGS as any).design || {} });
  if (!settings.draftDesign) settings.draftDesign = clone(settings.design);
  return { calls: [], settings, pages: clone(overrides.pages ?? FIXTURE_PAGES), books: clone(overrides.books ?? FIXTURE_BOOKS), versions: overrides.versions ?? [] };
}

/** Replace Studio's adminApi methods with in-memory ones. Returns a function that restores them. */
export function installFakeStudioApi(api: Record<string, any>, fixture: StudioFixture): () => void {
  const record = (method: string, ...args: any[]) => fixture.calls.push({ method, args: clone(args) });
  const fake: Record<string, (...args: any[]) => any> = {
    getPages: async () => clone(fixture.pages),
    getCategoryBooks: async () => clone(fixture.books),
    listThemeVersions: async () => clone(fixture.versions),
    updateSettings: async (patch: any, options: { publish?: boolean } = {}) => {
      record("updateSettings", patch, options);
      if (patch.design) {
        fixture.settings.draftDesign = clone(patch.design);
        if (options.publish) fixture.settings.design = clone(patch.design);
      }
      for (const [k, v] of Object.entries(patch)) if (k !== "design") fixture.settings[k] = clone(v);
    },
    discardThemeDraft: async (design: any) => { record("discardThemeDraft", design); fixture.settings.draftDesign = clone(design); },
    saveThemeVersion: async (kind: string, label: string, design: any) => {
      record("saveThemeVersion", kind, label);
      const version = { id: `v${fixture.versions.length + 1}`, kind, label, createdAt: new Date().toISOString(), design: clone(design) };
      fixture.versions.unshift(version);
      return version;
    },
    createPage: async (page: any) => { record("createPage", page); const created = { ...page, id: `p${fixture.pages.length + 1}` }; fixture.pages.push(created); return created; },
    updatePage: async (id: string, page: any) => { record("updatePage", id, page); fixture.pages = fixture.pages.map(p => p.id === id ? { ...p, ...page } : p); },
    deletePage: async (id: string) => { record("deletePage", id); fixture.pages = fixture.pages.filter(p => p.id !== id); },
    updateCategoryBooks: async (...args: any[]) => { record("updateCategoryBooks", ...args); return []; },
    uploadFile: async (_file: File, path: string) => { record("uploadFile", path); return `https://example.invalid/${path}`; },
    updateShopCategories: async (categories: any[]) => { record("updateShopCategories", categories); },
  };
  const originals: Record<string, any> = {};
  for (const [name, fn] of Object.entries(fake)) { originals[name] = api[name]; api[name] = fn; }
  return () => { for (const [name, fn] of Object.entries(originals)) api[name] = fn; };
}
