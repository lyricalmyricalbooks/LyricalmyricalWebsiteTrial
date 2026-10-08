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
async function check(name, viewport, run, query = "") {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
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
  await page.waitForFunction(() => window.__studioFixture.calls.some(c => c.method === "updateSettings"));
  const save = (await calls(page)).find(c => c.method === "updateSettings");
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
