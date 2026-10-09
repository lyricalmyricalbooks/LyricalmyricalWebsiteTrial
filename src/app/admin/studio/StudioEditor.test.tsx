// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement as h, act } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("react-quill", () => ({ default: () => null }));
vi.mock("react-quill/dist/quill.snow.css", () => ({}));
vi.mock("firebase/firestore", () => new Proxy({}, { get: (_t, name) => name === "then" ? undefined : vi.fn() }));
vi.mock("firebase/auth", () => ({ signInWithPopup: vi.fn(), signOut: vi.fn(), onAuthStateChanged: vi.fn(), GoogleAuthProvider: class {}, signInWithCredential: vi.fn() }));
vi.mock("firebase/storage", () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn(), getStorage: vi.fn() }));
vi.mock("firebase/database", () => ({ ref: vi.fn(), get: vi.fn() }));
vi.mock("../../../lib/firebase", () => ({ db: {}, auth: { currentUser: null }, storage: {}, googleProvider: {} }));
vi.mock("../../../lib/legacyFirebase", () => ({ legacyDb: {}, legacyAuth: {} }));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia ??= ((query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {},
  addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as any;

const { adminApi } = await import("../api");
const { StudioEditor } = await import("./StudioEditor");
const { createStudioFixture, installFakeStudioApi } = await import("./fixture/fakeStudioApi");

let host: HTMLDivElement, root: Root, restore: () => void, fixture: ReturnType<typeof createStudioFixture>;
beforeEach(() => {
  localStorage.clear();
  fixture = createStudioFixture();
  restore = installFakeStudioApi(adminApi as any, fixture);
  host = document.createElement("div");
  document.body.append(host);
});
afterEach(() => { act(() => root?.unmount()); host.remove(); restore(); });

async function mount() {
  root = createRoot(host);
  await act(async () => { root.render(h(StudioEditor, { settings: fixture.settings, onExit: () => {} })); });
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
}

const buttons = (label: string | RegExp) => [...document.body.querySelectorAll("button")]
  .filter(b => { const name = b.getAttribute("aria-label") || b.textContent?.trim() || ""; return typeof label === "string" ? name === label || b.textContent?.trim() === label : label.test(b.textContent || ""); });
const click = async (el: Element | undefined) => {
  if (!el) throw new Error("element not found");
  await act(async () => { (el as HTMLElement).click(); await new Promise(r => setTimeout(r, 0)); });
};
const key = async (k: string, extra: KeyboardEventInit = {}) => {
  await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: k, ctrlKey: true, bubbles: true, ...extra })); await new Promise(r => setTimeout(r, 0)); });
};
const homeSections = (design: any) => (design?.heroPage?.sections || []).map((s: any) => s.type);

describe("Studio editor (mounted with an in-memory API)", () => {
  it("opens on the page outline with every workspace and lists draft pages as templates", async () => {
    await mount();
    for (const tab of ["Page layout", "Shared layout", "Theme settings", "Text & labels", "Navigation", "Pages"]) expect(buttons(tab).length).toBeGreaterThan(0);
    await click(buttons("Page to edit")[0]);
    const pagePicker = [...document.querySelectorAll("[role=option]")].map(o => o.querySelector("span")?.textContent);
    expect(pagePicker).toEqual(expect.arrayContaining(["Home", "About", "Open call (draft)", "Night Pages", "Header & footer sections (every page)"]));
  });

  it("switching page keeps the open workspace and is remembered next time", async () => {
    await mount();
    await click(buttons("Theme settings")[0]);
    await click(buttons("Page to edit")[0]);
    await click([...document.querySelectorAll("[role=option]")].find(o => o.textContent?.includes("Night Pages")));
    expect(buttons("Theme settings")[0].getAttribute("aria-pressed")).toBe("true");
    expect(buttons("Page to edit")[0].textContent).toContain("Night Pages");
    act(() => root.unmount());
    await mount();
    expect(buttons("Page to edit")[0].textContent).toContain("Night Pages");
    expect(buttons("Theme settings")[0].getAttribute("aria-pressed")).toBe("true");
  });

  it("adds a section, undoes it, and saves the draft without publishing", async () => {
    await mount();
    await click(buttons("Add section")[0]);
    await click(buttons(/^Newsletter/)[0]);
    expect(host.textContent).toMatch(/Home · 1 section/);
    await key("z");
    expect(host.textContent).toMatch(/Home · 0 sections/);
    await key("z", { shiftKey: true });
    expect(host.textContent).toMatch(/Home · 1 section/);
    await click(buttons("Save draft")[0]);
    const save = fixture.calls.find(c => c.method === "updateSettings");
    expect(save?.args[1]).toEqual({ publish: false });
    expect(homeSections(save?.args[0].design)).toEqual(["NewsletterSection"]);
    expect(homeSections(fixture.settings.design)).toEqual([]);
  });

  it("publishes only after confirming", async () => {
    await mount();
    await click(buttons("Add section")[0]);
    await click(buttons(/^Newsletter/)[0]);
    await click(buttons("Publish")[0]);
    expect(fixture.calls.some(c => c.method === "updateSettings")).toBe(false);
    await click(buttons("Publish now")[0]);
    const publish = fixture.calls.find(c => c.method === "updateSettings");
    expect(publish?.args[1]).toEqual({ publish: true });
    expect(homeSections(fixture.settings.design)).toEqual(["NewsletterSection"]);
  });

  it("opens Theme settings on its task headings and Find anything with Ctrl/Cmd+K", async () => {
    await mount();
    await click(buttons("Theme settings")[0]);
    expect(host.textContent).toContain("Overall look");
    await key("k");
    expect(document.body.querySelector("[role='combobox'], input[aria-label*='Find' i], input[placeholder*='Find' i]")).not.toBeNull();
  });
});
