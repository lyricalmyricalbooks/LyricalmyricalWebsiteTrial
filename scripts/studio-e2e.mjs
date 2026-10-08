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

const results = [];
async function check(name, viewport, run) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
    await page.goto(`${base}/studio-fixture.html`);
    await page.waitForSelector("[data-studio-editor]", { timeout: 30000 });
    await run(page);
    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: String(error?.message || error).split("\n")[0] });
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
  // The frame keeps the device's real CSS width (it scrolls rather than squeezing), so the
  // storefront inside switches to the matching breakpoint.
  const frameWidth = () => page.evaluate(() => document.querySelector("iframe")?.parentElement?.getBoundingClientRect().width);
  await page.waitForFunction(() => document.querySelector("iframe")?.parentElement?.getBoundingClientRect().width === 820, null, { timeout: 5000 })
    .catch(async () => { throw new Error(`tablet frame is ${await frameWidth()}px`); });
  await page.getByRole("button", { name: "mobile preview" }).click();
  await page.waitForFunction(() => document.querySelector("iframe")?.parentElement?.getBoundingClientRect().width === 390, null, { timeout: 5000 })
    .catch(async () => { throw new Error(`phone frame is ${await frameWidth()}px`); });
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
  await page.keyboard.press("Escape");
  await page.locator(".studio-inspector, [aria-label='Close settings']").first().waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Close settings" }).click();
  await expectText(page, "Preview connected", 30000);
  // Studio sends its click-to-edit maps shortly after the preview connects.
  await page.waitForTimeout(1500);
  const frame = page.frameLocator("iframe").first();
  await frame.locator("[data-fm-section]").first().click({ position: { x: 8, y: 8 }, timeout: 15000 });
  await page.getByRole("button", { name: "Close settings" }).waitFor({ timeout: 8000 });
});

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
