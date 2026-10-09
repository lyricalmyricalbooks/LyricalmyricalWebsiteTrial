// Browser checks for the Design studio, against the local fixture (studio-fixture.html):
// the real Studio UI with an in-memory adminApi — no sign-in, no Firestore writes.
//   node scripts/studio-e2e.mjs            (starts its own Vite dev server)
//   STUDIO_URL=http://localhost:5173 node scripts/studio-e2e.mjs
//   CHROMIUM_PATH=/path/to/chrome …        (use an already installed Chromium)
//   STUDIO_SHOTS=dir …                     (save a screenshot per check)
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

let server;
let base = process.env.STUDIO_URL;
if (!base) {
  server = await createServer({ server: { port: 0, strictPort: false }, logLevel: "error" });
  await server.listen();
  base = server.resolvedUrls.local[0].replace(/\/$/, "");
}
const shots = process.env.STUDIO_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

// Warm-up visit: lets the dev server finish bundling dependencies (it reloads the page once when
// it discovers a new one), so no check runs against a half-reloaded page.
{
  const warm = await browser.newPage();
  await warm.goto(`${base}/studio-fixture.html`).catch(() => {});
  await warm.waitForSelector("[data-studio-editor]", { timeout: 60000 }).catch(() => {});
  await warm.waitForTimeout(2000);
  await warm.close();
}

const results = [];
async function check(name, viewport, run, query = "", prepare = null) {
  // STUDIO_ONLY="words" runs only the checks whose name contains those words (local iteration).
  if (process.env.STUDIO_ONLY && !name.includes(process.env.STUDIO_ONLY)) return;
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
    if (prepare) await prepare(page);
    await page.goto(`${base}/studio-fixture.html${query}`);
    await page.waitForSelector("[data-studio-editor]", { timeout: 30000 });
    await run(page);
    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    results.push({ name, ok: true });
  } catch (error) {
    // Keep Playwright's "waiting for <locator>" line so a CI failure names the element it waited for.
    const lines = String(error?.message || error).split("\n");
    const waited = lines.find(l => /waiting for/.test(l));
    results.push({ name, ok: false, error: [lines[0], waited?.trim()].filter(Boolean).join(" · ") });
  } finally {
    if (shots) await page.screenshot({ path: join(shots, name.replace(/\W+/g, "-") + ".png") }).catch(() => {});
    await page.close();
  }
}
const expectText = async (page, text, timeout = 5000) => page.getByText(text).first().waitFor({ timeout });
const calls = page => page.evaluate(() => window.__studioFixture.calls);
const mod = process.platform === "darwin" ? "Meta" : "Control";
const desktop = { width: 1440, height: 900 };

await check("preview connects with the unsaved design", desktop, async page => {
  await expectText(page, "Preview connected", 30000);
  const frame = page.frameLocator("iframe").first();
  await frame.getByText("Night Pages").first().waitFor({ timeout: 15000 });
});

await check("add section, undo, redo, save draft", desktop, async page => {
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Newsletter/ }).first().click();
  await expectText(page, "Home · 1 section");
  await page.keyboard.press(`${mod}+z`);
  await expectText(page, "Home · 0 sections");
  await page.keyboard.press(`${mod}+Shift+z`);
  await expectText(page, "Home · 1 section");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForFunction(() => window.__studioFixture.calls.some(c => c.method === "saveDesign"));
  const save = (await calls(page)).find(c => c.method === "saveDesign");
  if (save.args[1]?.publish) throw new Error("Save draft published the design");
  if (!save.args[0].design.heroPage.sections.some(s => s.type === "NewsletterSection")) throw new Error("saved draft is missing the new section");
});

await check("device switch keeps the real viewport width", desktop, async page => {
  await page.getByRole("button", { name: "tablet preview" }).click();
  // The frame keeps the device's real CSS width (the preview is scaled to fit, never squeezed),
  // so the storefront inside switches to the matching breakpoint.
  const frameWidth = () => page.evaluate(() => document.querySelector(".studio-preview-frame")?.style.width);
  await page.waitForFunction(() => document.querySelector(".studio-preview-frame")?.style.width === "820px", null, { timeout: 5000 })
    .catch(async () => { throw new Error(`tablet frame is ${await frameWidth()}`); });
  await page.getByRole("button", { name: "mobile preview" }).click();
  await page.waitForFunction(() => document.querySelector(".studio-preview-frame")?.style.width === "390px", null, { timeout: 5000 })
    .catch(async () => { throw new Error(`phone frame is ${await frameWidth()}`); });
});

await check("desktop preview fits the canvas and zoom can show it at full size", desktop, async page => {
  const scale = () => page.evaluate(() => Number(document.querySelector(".studio-preview-frame")?.getAttribute("data-scale")));
  if (!(await scale() < 1)) throw new Error("the 1200px desktop preview was not scaled to fit the canvas");
  await page.getByLabel("Preview zoom").selectOption("100");
  await page.waitForFunction(() => document.querySelector(".studio-preview-frame")?.getAttribute("data-scale") === "1.000");
});

await check("page picker searches pages, collections and books, and keeps the workspace", desktop, async page => {
  await page.getByRole("button", { name: "Theme settings" }).click();
  await page.getByRole("button", { name: "Page to edit" }).click();
  await page.getByRole("combobox", { name: "Find a page, collection or book" }).fill("paper");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("[aria-label='Page to edit']")?.textContent?.includes("Paper Weather"));
  const pressed = await page.getByRole("button", { name: "Theme settings" }).getAttribute("aria-pressed");
  if (pressed !== "true") throw new Error("switching page left Theme settings");
  await page.waitForFunction(() => document.querySelector("iframe")?.getAttribute("src")?.includes("/books/paper-weather"));
});

await check("find anything opens a setting", desktop, async page => {
  await page.keyboard.press(`${mod}+k`);
  const search = page.getByRole("dialog").getByRole("combobox");
  await search.fill("announcement");
  await page.getByRole("option").first().waitFor({ state: "attached", timeout: 5000 });
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
});

await check("find anything opens an element setting at the size being previewed", desktop, async page => {
  await page.getByRole("button", { name: "mobile preview" }).click();
  await page.waitForFunction(() => document.querySelector(".studio-preview-frame")?.style.width === "390px", null, { timeout: 5000 });
  await page.keyboard.press(`${mod}+k`);
  await page.getByRole("dialog").getByRole("combobox").fill("newsletter button padding top");
  await page.getByRole("option").first().waitFor({ state: "attached", timeout: 5000 });
  await page.keyboard.press("Enter");
  await page.locator('[data-style-key="regions.newsletterButtonMobilePaddingTop"]').first().waitFor({ state: "attached", timeout: 8000 });
  const width = await page.evaluate(() => document.querySelector(".studio-preview-frame")?.style.width);
  if (width !== "390px") throw new Error(`the preview left phone size (${width})`);
  // From desktop, a search that names "phone" opens the phone setting and the phone preview.
  await page.getByRole("button", { name: "desktop preview" }).click();
  await page.waitForFunction(() => document.querySelector(".studio-preview-frame")?.style.width === "1200px", null, { timeout: 5000 });
  await page.keyboard.press(`${mod}+k`);
  await page.getByRole("dialog").getByRole("combobox").fill("newsletter button phone padding top");
  await page.getByRole("option").first().waitFor({ state: "attached", timeout: 5000 });
  await page.keyboard.press("Enter");
  await page.locator('[data-style-key="regions.newsletterButtonMobilePaddingTop"]').first().waitFor({ state: "attached", timeout: 8000 });
  await page.waitForFunction(() => document.querySelector(".studio-preview-frame")?.style.width === "390px", null, { timeout: 5000 });
});

await check("find anything offers commands for the selected section, recent picks and > commands", desktop, async page => {
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Newsletter/ }).first().click();
  await page.getByRole("button", { name: "Close settings" }).waitFor({ timeout: 5000 });
  await page.keyboard.press(`${mod}+k`);
  const dialog = page.getByRole("dialog");
  await dialog.getByText("For what you selected").waitFor({ timeout: 5000 });
  await dialog.getByRole("combobox").fill("hide");
  await dialog.getByRole("option", { name: /Hide this section/ }).first().click();
  await dialog.waitFor({ state: "detached", timeout: 5000 });
  await page.keyboard.press(`${mod}+k`);
  await page.getByRole("dialog").getByRole("option", { name: /Show this section/ }).first().waitFor({ timeout: 5000 });
  await page.getByRole("dialog").getByRole("combobox").fill("> phone");
  const options = page.getByRole("dialog").getByRole("option");
  await options.first().waitFor({ timeout: 5000 });
  const kinds = await options.locator(".studio-find-kind").allTextContents();
  if (kinds.some(k => !/action|area/i.test(k))) throw new Error(`> showed non-commands: ${kinds.join(", ")}`);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector(".studio-preview-frame")?.style.width === "390px", null, { timeout: 5000 });
  await page.keyboard.press(`${mod}+k`);
  await page.getByRole("dialog").getByText("Recent").waitFor({ timeout: 5000 });
});

await check("clicking a section in the preview opens its settings", desktop, async page => {
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Newsletter/ }).first().click();
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByText("Nothing selected").waitFor({ timeout: 5000 });
  await expectText(page, "Preview connected", 30000);
  // Studio sends its click-to-edit maps shortly after the preview connects.
  await page.waitForTimeout(1500);
  const frame = page.frameLocator("iframe").first();
  await frame.locator("[data-fm-section]").first().click({ position: { x: 8, y: 8 }, timeout: 15000 });
  await page.getByRole("button", { name: "Close settings" }).waitFor({ timeout: 8000 });
});

await check("a slow preview never clears what the owner selected", desktop, async page => {
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Newsletter/ }).first().click();
  await page.getByRole("button", { name: "Close settings" }).waitFor({ timeout: 5000 });
  await expectText(page, "Preview connected", 30000);
  await page.waitForTimeout(1500);
  if (!(await page.getByRole("button", { name: "Close settings" }).count())) throw new Error("the section was deselected when the preview connected");
}, "", page => page.route(/preview=true/, async route => { await new Promise(r => setTimeout(r, 5000)); await route.continue(); }));

await check("page structure lists the header, follows the pointer and opens the bag", desktop, async page => {
  await expectText(page, "Preview connected", 30000);
  const panel = page.locator(".studio-structure");
  await panel.locator("summary", { hasText: "Header" }).click();
  const masthead = panel.getByRole("button", { name: /^Masthead/ }).first();
  await masthead.waitFor({ timeout: 15000 });
  await masthead.hover();
  const frame = page.frameLocator("iframe").first();
  await frame.locator("[data-studio-overlay]", { hasText: "Masthead" }).first().waitFor({ state: "visible", timeout: 5000 });
  await panel.locator("summary", { hasText: "Pop-overs" }).click();
  await panel.getByRole("button", { name: "Open in preview" }).first().click();
  await frame.locator("[role=dialog][data-studio-label='Cart drawer']").waitFor({ state: "visible", timeout: 8000 });
  await panel.getByRole("button", { name: /^Shopping bag/ }).click();
  const pressed = await page.getByRole("button", { name: "Theme settings", exact: true }).first().getAttribute("aria-pressed");
  if (pressed !== "true") throw new Error("Shopping bag did not open its settings");
});

await check("a page part opens in the inspector with its words, and an edit shows in the preview", desktop, async page => {
  await expectText(page, "Preview connected", 30000);
  const panel = page.locator(".studio-structure");
  await panel.locator("summary", { hasText: "Header" }).click();
  await panel.getByRole("button", { name: /^Header/ }).first().click();
  const inspector = page.locator("[data-studio-element-inspector]");
  await inspector.waitFor({ timeout: 5000 });
  await inspector.getByRole("tab", { name: "Words" }).waitFor({ timeout: 5000 });
  await inspector.getByRole("tab", { name: "Style" }).waitFor({ timeout: 5000 });
  await inspector.getByRole("tab", { name: "Words" }).click();
  const fields = inspector.locator(".studio-copy-field input");
  let edited = null;
  for (let i = 0; i < await fields.count(); i++) {
    const value = await fields.nth(i).inputValue();
    if (value.length >= 3 && !value.includes("{")) { edited = { i, value }; break; }
  }
  if (!edited) throw new Error("no plain word to edit in the Header words");
  await fields.nth(edited.i).fill(edited.value + " Zq");
  const frame = page.frameLocator("iframe").first();
  await frame.getByText(edited.value + " Zq").first().waitFor({ state: "attached", timeout: 8000 });
  await page.getByRole("button", { name: "Undo (Ctrl+Z)" }).click();
  if ((await fields.nth(edited.i).inputValue()) !== edited.value) throw new Error("Undo did not restore the word");
  await page.keyboard.press("Escape");
  await page.getByText("Nothing selected").waitFor({ timeout: 5000 });
});

await check("a section's Style, Layout and Visibility tabs save its look", desktop, async page => {
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Newsletter/ }).first().click();
  const tabs = page.getByRole("tablist", { name: "Section settings" });
  for (const name of ["Content", "Style", "Layout", "Visibility"]) await tabs.getByRole("tab", { name }).waitFor({ timeout: 5000 });
  await tabs.getByRole("tab", { name: "Visibility" }).click();
  await page.getByRole("switch", { name: "Hide on tablets", exact: true }).waitFor({ timeout: 5000 });
  await tabs.getByRole("tab", { name: "Style" }).click();
  await page.locator("[data-section-style-key=bgColor] input:not([type=color])").fill("#112233");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForFunction(() => window.__studioFixture.calls.some(c => c.method === "saveDesign"));
  const saved = (await calls(page)).filter(c => c.method === "saveDesign").pop();
  const section = saved.args[0].design.heroPage.sections.find(s => s.type === "NewsletterSection");
  if (section?.settings?.bgColor !== "#112233") throw new Error(`saved bgColor is ${section?.settings?.bgColor}`);
  await page.getByRole("button", { name: "Reset Solid colour" }).click();
  if (await page.getByRole("button", { name: "Reset Solid colour" }).count()) throw new Error("Reset did not clear the colour");
});

await check("link and book pickers save the same strings as typed links", desktop, async page => {
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Image with Text/ }).first().click();
  await page.getByRole("button", { name: "Choose link: CTA link" }).click();
  await page.getByRole("combobox", { name: "Find a page, category or book" }).fill("about");
  await page.keyboard.press("Enter");
  await page.getByLabel("CTA link (address)").waitFor({ timeout: 5000 });
  if ((await page.getByLabel("CTA link (address)").inputValue()) !== "/page/about") throw new Error("the picked page did not fill the link");
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Showcase Product Grid/ }).first().click();
  await page.getByLabel("Which books").selectOption("manual");
  await page.getByRole("button", { name: /^Add a book: / }).click();
  await page.getByRole("combobox", { name: "Find a book to add" }).fill("paper");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForFunction(() => window.__studioFixture.calls.some(c => c.method === "saveDesign"));
  const saved = (await calls(page)).filter(c => c.method === "saveDesign").pop();
  const sections = saved.args[0].design.heroPage.sections;
  const banner = sections.find(s => s.type === "ImageWithTextSection");
  if (banner?.settings?.ctaUrl !== "/page/about") throw new Error(`saved ctaUrl is ${banner?.settings?.ctaUrl}`);
  const grid = sections.find(s => s.type === "ProductShowcaseGridSection");
  if (grid?.settings?.productSource !== "manual" || grid?.settings?.manualSlugs !== "paper-weather") throw new Error(`saved grid source ${grid?.settings?.productSource} / ${grid?.settings?.manualSlugs}`);
  // The preview shows only the picked book.
  const frame = page.frameLocator("iframe").first();
  await frame.locator("[data-fm-section] .fm-card-title", { hasText: "Paper Weather" }).first().waitFor({ timeout: 15000 });
  if (await frame.locator("[data-fm-section] .fm-card-title", { hasText: "Night Pages" }).count()) throw new Error("the grid still shows a book that was not picked");
});

await check("right-click a section to move it to another page, and Undo brings it back", desktop, async page => {
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Newsletter/ }).first().click();
  await expectText(page, "Home · 1 section");
  await page.locator(".studio-outline .studio-tree-row").first().click({ button: "right" });
  await page.getByRole("button", { name: "Move to another page…" }).click();
  const dialog = page.getByRole("dialog", { name: /Move section to another page/ });
  await dialog.getByLabel("Page").selectOption({ label: "About" });
  await dialog.getByRole("button", { name: "Move", exact: true }).click();
  await expectText(page, "Home · 0 sections");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expectText(page, "Home · 1 section");
});

await check("pick several sections and hide them together", desktop, async page => {
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Add section" }).first().click();
    await page.getByRole("button", { name: /^Newsletter/ }).first().click();
  }
  await expectText(page, "Home · 2 sections");
  const labels = page.locator(".studio-outline .studio-tree-row > .studio-tree-label");
  await labels.nth(0).click({ modifiers: [mod] });
  await labels.nth(1).click({ modifiers: [mod] });
  const bar = page.getByRole("toolbar", { name: "Selected sections" });
  await bar.getByText("2 selected").waitFor({ timeout: 5000 });
  await bar.getByRole("button", { name: "Hide" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".studio-outline .studio-tree-row[data-hidden=true]").length === 2);
});

await check("Theme settings › Show on page selects that part, opening the bag when needed", desktop, async page => {
  await expectText(page, "Preview connected", 30000);
  await page.getByRole("button", { name: "Theme settings", exact: true }).first().click();
  await page.getByText("Site-wide design").first().waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Show Header & announcement bar on the page" }).click();
  await page.locator("[data-studio-element-inspector]").waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Theme settings", exact: true }).first().click();
  await page.getByRole("button", { name: "Show Cart drawer (shopping bag) on the page" }).click();
  const frame = page.frameLocator("iframe").first();
  await frame.locator("[role=dialog][data-studio-label='Cart drawer']").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("[data-studio-element-inspector][aria-label='Cart drawer settings']").waitFor({ timeout: 10000 });
});

await check("every Show on page button selects its part or opens its settings, never a dead end", desktop, async page => {
  await expectText(page, "Preview connected", 30000);
  const openHome = async () => {
    await page.getByRole("button", { name: "Theme settings", exact: true }).first().click();
    const back = page.getByRole("button", { name: /All theme settings|Back to theme settings/ }).first();
    if (await back.isVisible().catch(() => false)) await back.click();
    await page.getByText("Site-wide design").first().waitFor({ timeout: 5000 });
  };
  await openHome();
  const names = await page.getByRole("button", { name: /^Show .+ on the page$/ }).evaluateAll(els => els.map(e => e.getAttribute("aria-label")));
  // These parts always render on their page in the fixture, so they must open in the inspector.
  const mustSelect = ["Header & announcement bar", "Customer accounts", "Badges & shop labels", "Custom pages", "Checkout"];
  const outcomes = [];
  for (const name of names) {
    await openHome();
    await page.getByRole("button", { name, exact: true }).click();
    const title = name.replace(/^Show /, "").replace(/ on the page$/, "");
    const outcome = await Promise.race([
      page.locator("[data-studio-element-inspector]").waitFor({ timeout: 12000 }).then(() => "selected"),
      page.getByText(`${title} isn't showing on this page right now`).waitFor({ timeout: 12000 }).then(() => "settings"),
    ]).catch(() => "nothing");
    outcomes.push(`${title}: ${outcome}`);
    if (outcome === "nothing") throw new Error(`Show on page did nothing for ${title}`);
    if (mustSelect.some(m => title.startsWith(m)) && outcome !== "selected") throw new Error(`${title} opened its settings instead of the part`);
    if (outcome === "selected") await page.getByRole("button", { name: "Close settings" }).click().catch(() => {});
  }
  console.log("    " + outcomes.join(" · "));
});

await check("Show on page works when that custom page is already open", desktop, async page => {
  await expectText(page, "Preview connected", 30000);
  await page.getByRole("button", { name: "Page to edit" }).click();
  await page.getByRole("option", { name: /^About/ }).first().click();
  await expectText(page, "Preview connected", 30000);
  await page.getByRole("button", { name: "Theme settings", exact: true }).first().click();
  await page.getByRole("button", { name: /^Show Custom pages/ }).click();
  await page.locator("[data-studio-element-inspector]").waitFor({ timeout: 12000 });
  const picked = await page.getByRole("button", { name: "Page to edit" }).textContent();
  if (!/About/.test(picked || "")) throw new Error(`Page to edit changed to ${picked}`);
});

await check("long text groups open as short sub-sections", desktop, async page => {
  await page.getByRole("button", { name: "Text & labels", exact: true }).first().click();
  await page.getByRole("button", { name: /^Checkout/ }).first().click();
  await page.getByRole("button", { name: /Payment & the Pay button/ }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /Error messages/ }).waitFor({ timeout: 5000 });
});

await check("page-only overrides are listed and can follow all pages", desktop, async page => {
  await page.getByRole("button", { name: "Theme settings" }).click();
  await page.getByRole("button", { name: "Page to edit" }).click();
  await page.getByRole("combobox", { name: "Find a page, collection or book" }).fill("catalog");
  await page.keyboard.press("Enter");
  const card = page.locator("[data-studio-page-overrides]");
  await card.locator("summary").click();
  const count = async () => Number(await card.locator(".studio-overrides-count").textContent());
  const before = await count();
  if (!(before > 0)) throw new Error("no page overrides listed for the live catalog page");
  await card.getByRole("button", { name: "Use all-pages value" }).first().click();
  await page.waitForFunction(n => Number(document.querySelector("[data-studio-page-overrides] .studio-overrides-count")?.textContent) === n - 1, before);
}, "?live=1");

await check("deleting a section is instant and Undo brings it back", desktop, async page => {
  await page.getByRole("button", { name: "Add section" }).first().click();
  await page.getByRole("button", { name: /^Newsletter/ }).first().click();
  await expectText(page, "Home · 1 section");
  await page.getByRole("button", { name: "Delete section" }).click();
  await expectText(page, "Home · 0 sections");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expectText(page, "Home · 1 section");
  const title = await page.getByRole("button", { name: "Undo (Ctrl+Z)" }).getAttribute("title");
  if (!/Undo: Add Newsletter/.test(title || "")) throw new Error(`undo button says "${title}"`);
});

await check("? opens the keyboard shortcuts", desktop, async page => {
  await page.locator("body").press("?");
  await page.getByRole("dialog", { name: "Keyboard shortcuts" }).waitFor({ timeout: 5000 });
});

await check("a Studio link opens the right page and tool", desktop, async page => {
  await page.waitForFunction(() => document.querySelector("[aria-label='Page to edit']")?.textContent?.includes("Paper Weather"));
  const pressed = await page.getByRole("button", { name: "Theme settings" }).getAttribute("aria-pressed");
  if (pressed !== "true") throw new Error("the link did not open Theme settings");
}, "#designer?b=paper-weather&tab=style");

await check("the wishlist page shows the one shop header and footer, listed in Page layout", desktop, async page => {
  await expectText(page, "Preview connected", 30000);
  const frame = page.frameLocator("iframe").first();
  await frame.locator("header[data-section=navigation] [data-studio-label='Category bar']").first().waitFor({ state: "attached", timeout: 15000 });
  await frame.locator("footer[data-studio-label='Footer']").waitFor({ state: "attached", timeout: 5000 });
  // The wishlist's own title bar sits under the shop header as a plain row, not a second <header>.
  if (await frame.locator("header [data-store-region=wishlistHeader], header[data-store-region=wishlistHeader]").count()) throw new Error("the wishlist bar is still a header");
  const panel = page.locator(".studio-structure");
  await panel.locator("summary", { hasText: "Header" }).click();
  await panel.getByRole("button", { name: /^Logo/ }).first().waitFor({ timeout: 15000 });
}, "#designer?t=wishlistPage");

await check("phone-sized editor loads without errors", { width: 390, height: 844 }, async page => {
  await page.waitForTimeout(1500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`editor scrolls sideways by ${overflow}px`);
});

await browser.close();
await server?.close();
for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}${r.ok ? "" : ` — ${r.error}`}`);
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
