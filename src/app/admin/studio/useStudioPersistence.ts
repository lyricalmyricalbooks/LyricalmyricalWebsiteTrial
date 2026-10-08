import { useEffect, useRef, useState } from "react";
import { auth } from "../../../lib/firebase";
import { discardDraft, publishDesign, saveDraft, studioTabId, ThemeConflictError, type Workspace } from "../themeStore";
import { sameDesign } from "./studioModel";
import { designSize } from "./studioChecks";
import { createSnapshotWriter, mergeDesigns, newestRecovery, parseRecovery, RECOVERY_PREFIX } from "./studioWorkflow";

type Kind = "draft" | "publish" | "discard";
/** Another tab or device saved first, and both changed the same settings: the owner chooses. */
export type SaveConflict = { kind: Kind; server: { draft: any; rev: number }; paths: string[] };

export function useStudioPersistence(props: {
  design: any; savedDraft: any; published: any; workspace: Workspace;
  setSavedDraft: (design: any) => void; setPublished: (design: any) => void;
  onPersisted?: (design: any, published: boolean) => void;
  reset: (design: any) => void; restore: (design: any) => void;
  say: (kind: "ok" | "err", message: string) => void;
}) {
  const current = useRef(props); current.current = props;
  const writer = useRef(createSnapshotWriter());
  const locked = useRef(false);
  const rev = useRef(props.workspace.rev);
  const [busy, setBusy] = useState<null | Kind>(null);
  const [conflict, setConflict] = useState<SaveConflict | null>(null);
  // One recovery record per browser tab, so two open Studio tabs never overwrite each other's.
  const prefix = `${RECOVERY_PREFIX}${import.meta.env.BASE_URL}:${auth.currentUser?.uid || "local-preview"}:`;
  const recoveryKey = prefix + studioTabId();
  const [recovery, setRecovery] = useState(() => {
    try { return newestRecovery(localStorage, prefix, props.savedDraft) ?? parseRecovery(localStorage.getItem(`studio-recovery-v1:${import.meta.env.BASE_URL}:${auth.currentUser?.uid || "local-preview"}`), props.savedDraft); }
    catch { return null; }
  });
  const warned = useRef(false);
  useEffect(() => {
    if (recovery) return;
    const store = () => {
      const p = current.current;
      try {
        if (sameDesign(p.design, p.savedDraft)) localStorage.removeItem(recoveryKey);
        else localStorage.setItem(recoveryKey, JSON.stringify({ version: 1, design: p.design, base: JSON.stringify(p.savedDraft), savedAt: Date.now() }));
      } catch {
        if (!warned.current) { warned.current = true; p.say("err", "Local recovery is unavailable. Use Save draft to keep your work."); }
      }
    };
    const timer = setTimeout(store, 400);
    window.addEventListener("pagehide", store);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", store); };
  }, [props.design, props.savedDraft, recoveryKey, recovery]);

  const dismissRecovery = () => {
    try {
      if (recovery?.key) localStorage.removeItem(recovery.key);
      localStorage.removeItem(recoveryKey);
      localStorage.removeItem(`studio-recovery-v1:${import.meta.env.BASE_URL}:${auth.currentUser?.uid || "local-preview"}`);
    } catch { /* manual saving remains available */ }
    setRecovery(null);
  };
  const recover = () => {
    if (!recovery) return;
    props.restore(recovery.design); dismissRecovery();
  };

  const persist = async (kind: Kind, override?: any): Promise<void> => {
    if (locked.current) return;
    const size = designSize(override ?? (kind === "discard" ? current.current.published : current.current.design));
    if (size.tooBig) { current.current.say("err", size.text); return; }
    locked.current = true; setBusy(kind);
    const p = current.current;
    let lost: ThemeConflictError | null = null;
    try {
      const snapshot = await writer.current.run(override ?? (kind === "discard" ? p.published : p.design), async captured => {
        const ws = p.workspace;
        rev.current = kind === "discard" ? await discardDraft(ws, captured, rev.current)
          : kind === "publish" ? await publishDesign(ws, captured, rev.current)
          : await saveDraft(ws, captured, rev.current);
      });
      if (!snapshot) return;
      p.setSavedDraft(snapshot);
      if (kind === "publish") p.setPublished(snapshot);
      if (kind === "discard") { p.reset(snapshot); dismissRecovery(); }
      p.onPersisted?.(snapshot, kind === "publish");
      p.say("ok", kind === "publish" ? "Published. Newer edits remain in your draft." : kind === "discard" ? "Draft discarded." : "Draft saved. Publish when you’re ready to go live.");
      if (kind !== "discard") {
        try { await adminApiVersion(kind, snapshot); }
        catch { p.say("err", "Your design was saved, but its history snapshot could not be saved."); }
      }
    } catch (error: any) {
      if (error instanceof ThemeConflictError) lost = error;
      else p.say("err", `Could not ${kind === "draft" ? "save draft" : kind}: ${error?.message || "unknown error"}. Your edits are still available; retry when connected.`);
    } finally { locked.current = false; setBusy(null); }
    if (lost) await handleConflict(kind, lost.server);
  };

  // Another tab saved first. Changes to different settings are combined automatically;
  // the owner only decides when both sides changed the same setting.
  const handleConflict = async (kind: Kind, server: { draft: any; rev: number }) => {
    const p = current.current;
    if (kind === "discard") { rev.current = server.rev; return persist("discard"); }
    const { merged, conflicts } = mergeDesigns(p.savedDraft, p.design, server.draft);
    if (conflicts.length) { setConflict({ kind, server, paths: conflicts }); return; }
    rev.current = server.rev;
    p.setSavedDraft(server.draft);
    p.restore(merged);
    p.say("ok", "This design was also saved in another tab or device. Both sets of changes were combined.");
    return persist(kind, merged);
  };

  const resolveConflict = (choice: "mine" | "theirs" | "cancel") => {
    const c = conflict; setConflict(null);
    if (!c || choice === "cancel") return;
    const p = current.current;
    rev.current = c.server.rev;
    if (choice === "theirs") {
      p.setSavedDraft(c.server.draft); p.reset(c.server.draft);
      p.say("ok", "Loaded the version saved in the other tab or device.");
      return;
    }
    return persist(c.kind);
  };

  return {
    busy, recovery, recover, dismissRecovery, conflict, resolveConflict,
    saveDraft: () => persist("draft"), publish: () => persist("publish"), discard: () => persist("discard"),
  };
}

// Version history is best-effort and separate from the save itself.
async function adminApiVersion(kind: "draft" | "publish", snapshot: any) {
  const { adminApi } = await import("../api");
  await adminApi.saveThemeVersion(kind === "publish" ? "published" : "draft", `${kind === "publish" ? "Published" : "Draft"} ${new Date().toLocaleString()}`, snapshot);
}
