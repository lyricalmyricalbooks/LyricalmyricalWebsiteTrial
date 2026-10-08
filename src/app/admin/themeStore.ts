// Studio's private storage. The unpublished draft and My themes live in admin-only documents
// (themes/workspace, savedThemes/*) instead of the public settings/website document that every
// shopper downloads. Saves are compare-and-set on a revision number, so two tabs (or devices)
// can't silently overwrite each other's work.
//
// Rollout safety: until the new Firestore rules are deployed, reads of these paths are refused;
// Studio then keeps using the legacy settings/website.draftDesign path ("legacy" mode).
import { deleteField, doc, getDoc, collection, getDocs, runTransaction, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { adminApi } from "./api";
import { sameDesign } from "./studio/studioModel";

export type ThemeStoreMode = "store" | "legacy";
export type Workspace = { mode: ThemeStoreMode; draft: any; rev: number; savedThemes: any[] };

/** Thrown when another tab or device saved the draft since this Studio loaded it. */
export class ThemeConflictError extends Error {
  constructor(public server: { draft: any; rev: number }) {
    super("The design was saved from another tab or device.");
    this.name = "ThemeConflictError";
  }
}

const SETTINGS = () => doc(db, "settings", "website");
const WORKSPACE = () => doc(db, "themes", "workspace");
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? null));
const denied = (error: any) => error?.code === "permission-denied" || /insufficient permissions/i.test(String(error?.message || ""));
const now = () => new Date().toISOString();

let tabId = "";
export function studioTabId() {
  if (tabId) return tabId;
  try { tabId = sessionStorage.getItem("studio-tab-id") || ""; } catch { /* storage blocked */ }
  if (!tabId) {
    tabId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `tab-${Date.now().toString(36)}`;
    try { sessionStorage.setItem("studio-tab-id", tabId); } catch { /* storage blocked */ }
  }
  return tabId;
}

async function readSavedThemes(): Promise<any[]> {
  const snap = await getDocs(collection(db, "savedThemes"));
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

/** Where other admin tools should write the draft copy of a design field (categories, wall…). */
let knownMode: ThemeStoreMode | null = null;
export async function themeStoreMode(): Promise<ThemeStoreMode> {
  if (knownMode) return knownMode;
  try { knownMode = (await getDoc(WORKSPACE())).exists() ? "store" : "legacy"; }
  catch (error) { if (!denied(error)) throw error; knownMode = "legacy"; }
  return knownMode;
}

/**
 * Open Studio's working copy. The first open after the rules deploy moves the public
 * draftDesign / savedThemes into the private documents, verifies the copy, and only then
 * removes the public fields. Any failure keeps the legacy fields untouched.
 */
export async function openWorkspace(settings: any): Promise<Workspace> {
  const legacyDraft = settings?.draftDesign ?? settings?.design ?? {};
  const legacyThemes = Array.isArray(settings?.savedThemes) ? settings.savedThemes : [];
  const legacy = (): Workspace => ({ mode: "legacy", draft: legacyDraft, rev: 0, savedThemes: legacyThemes });
  let snap: any;
  try { snap = await getDoc(WORKSPACE()); }
  catch (error) { if (denied(error)) { knownMode = "legacy"; return legacy(); } throw error; }

  if (!snap.exists()) {
    try {
      await runTransaction(db, async tx => {
        const current = await tx.get(WORKSPACE());
        if (!current.exists()) tx.set(WORKSPACE(), { draft: clone(legacyDraft), rev: 1, updatedAt: now(), tabId: studioTabId(), migratedAt: now() });
      });
      if (legacyThemes.length) {
        const batch = writeBatch(db);
        for (const theme of legacyThemes) if (theme?.id) batch.set(doc(db, "savedThemes", String(theme.id)), clone(theme));
        await batch.commit();
      }
      snap = await getDoc(WORKSPACE());
    } catch (error) {
      if (denied(error)) { knownMode = "legacy"; return legacy(); }
      throw error;
    }
  }
  knownMode = "store";
  const data: any = snap.data() || {};
  let savedThemes = await readSavedThemes().catch(() => legacyThemes);
  // Remove the public copies only once the private ones hold the same content.
  const copiedThemes = legacyThemes.every((t: any) => savedThemes.some((s: any) => s.id === t.id));
  if ((settings?.draftDesign !== undefined || legacyThemes.length) && sameDesign(data.draft, legacyDraft) && copiedThemes) {
    await setDoc(SETTINGS(), { draftDesign: deleteField(), savedThemes: deleteField() }, { mergeFields: ["draftDesign", "savedThemes"] }).catch(() => {});
  } else if (!savedThemes.length && legacyThemes.length) savedThemes = legacyThemes;
  return { mode: "store", draft: data.draft ?? legacyDraft, rev: Number(data.rev) || 0, savedThemes };
}

async function writeWorkspace(expectedRev: number, draft: any, live?: any): Promise<number> {
  let next = expectedRev;
  await runTransaction(db, async tx => {
    const current: any = (await tx.get(WORKSPACE())).data() || {};
    const rev = Number(current.rev) || 0;
    if (rev !== expectedRev) throw new ThemeConflictError({ draft: current.draft, rev });
    next = rev + 1;
    if (live) tx.set(SETTINGS(), { design: live, designPublishedAt: now() }, { mergeFields: ["design", "designPublishedAt"] });
    tx.set(WORKSPACE(), { draft, rev: next, updatedAt: now(), tabId: studioTabId() });
  });
  return next;
}

/** Save draft. Returns the new revision. Throws ThemeConflictError when another tab saved first. */
export async function saveDraft(ws: Workspace, design: any, expectedRev: number): Promise<number> {
  const snapshot = clone(design);
  if (ws.mode === "legacy") { await adminApi.updateSettings({ design: snapshot }, { publish: false }); return expectedRev; }
  return writeWorkspace(expectedRev, snapshot);
}

/** Publish: the live design and the draft change together in one transaction. */
export async function publishDesign(ws: Workspace, design: any, expectedRev: number): Promise<number> {
  const snapshot = clone(design);
  if (ws.mode === "legacy") { await adminApi.updateSettings({ design: snapshot }, { publish: true }); return expectedRev; }
  const rev = await writeWorkspace(expectedRev, snapshot, snapshot);
  await adminApi.recordAuditLog("settings", "Published the Studio design").catch(() => {});
  return rev;
}

/** Discard draft: the working copy goes back to the published design. */
export async function discardDraft(ws: Workspace, published: any, expectedRev: number): Promise<number> {
  const snapshot = clone(published);
  if (ws.mode === "legacy") { await adminApi.discardThemeDraft(snapshot); return expectedRev; }
  const rev = await writeWorkspace(expectedRev, snapshot);
  await adminApi.recordAuditLog("settings", "Discarded unpublished theme changes").catch(() => {});
  return rev;
}

/** Store My themes. Only themes that changed are written; removed ones are deleted. */
export async function saveSavedThemes(ws: Workspace, previous: any[], next: any[]): Promise<void> {
  if (ws.mode === "legacy") { await adminApi.updateSettings({ savedThemes: next }); return; }
  const batch = writeBatch(db);
  const before = new Map(previous.map(t => [t.id, JSON.stringify(t)]));
  for (const theme of next) if (before.get(theme.id) !== JSON.stringify(theme)) batch.set(doc(db, "savedThemes", String(theme.id)), clone(theme));
  for (const theme of previous) if (!next.some(t => t.id === theme.id)) batch.delete(doc(db, "savedThemes", String(theme.id)));
  await batch.commit();
}

/**
 * Field-path write for admin tools that change one design field outside Studio (shop categories,
 * the under-construction wall). Keeps the draft in step without a revision bump, so an open
 * Studio is not forced into a conflict by an unrelated change.
 */
export async function draftFieldUpdate(fields: Record<string, any>) {
  const mode = await themeStoreMode();
  if (mode === "legacy") {
    const draft = Object.fromEntries(Object.entries(fields).map(([k, v]) => [`draftDesign.${k}`, v]));
    const nested: any = { draftDesign: {} };
    for (const [k, v] of Object.entries(fields)) nested.draftDesign[k] = v;
    await setDoc(SETTINGS(), nested, { mergeFields: Object.keys(draft) });
    return;
  }
  const nested: any = { draft: {} };
  for (const [k, v] of Object.entries(fields)) nested.draft[k] = v;
  await setDoc(WORKSPACE(), nested, { mergeFields: Object.keys(fields).map(k => `draft.${k}`) });
}

/** Read the current draft value of one field (for transactions that append to it). */
export async function readDraftField(key: string, settingsData: any): Promise<any> {
  if ((await themeStoreMode()) === "legacy") return settingsData?.draftDesign?.[key];
  const snap: any = await getDoc(WORKSPACE());
  return snap.data()?.draft?.[key];
}

/** Test hook: forget the cached mode. */
export function __resetThemeStoreMode() { knownMode = null; }
