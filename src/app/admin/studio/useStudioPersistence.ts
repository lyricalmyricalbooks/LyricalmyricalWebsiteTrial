import { useEffect, useRef, useState } from "react";
import { auth } from "../../../lib/firebase";
import { adminApi } from "../api";
import { sameDesign } from "./studioModel";
import { createSnapshotWriter, parseRecovery } from "./studioWorkflow";

export function useStudioPersistence(props: {
  design: any; savedDraft: any; published: any;
  setSavedDraft: (design: any) => void; setPublished: (design: any) => void;
  onPersisted?: (design: any, published: boolean) => void;
  reset: (design: any) => void; restore: (design: any) => void;
  say: (kind: "ok" | "err", message: string) => void;
}) {
  const current = useRef(props); current.current = props;
  const writer = useRef(createSnapshotWriter());
  const locked = useRef(false);
  const [busy, setBusy] = useState<null | "draft" | "publish" | "discard">(null);
  const recoveryKey = `studio-recovery-v1:${import.meta.env.BASE_URL}:${auth.currentUser?.uid || "local-preview"}`;
  const [recovery, setRecovery] = useState(() => {
    try { return parseRecovery(localStorage.getItem(recoveryKey), props.savedDraft); } catch { return null; }
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
    try { localStorage.removeItem(recoveryKey); } catch { /* manual saving remains available */ }
    setRecovery(null);
  };
  const recover = () => {
    if (!recovery) return;
    props.restore(recovery.design); dismissRecovery();
  };
  const persist = async (kind: "draft" | "publish" | "discard") => {
    if (locked.current) return;
    locked.current = true; setBusy(kind);
    const p = current.current;
    try {
      const snapshot = await writer.current.run(kind === "discard" ? p.published : p.design, async captured => {
        if (kind === "discard") await adminApi.discardThemeDraft(captured);
        else await adminApi.updateSettings({ design: captured }, { publish: kind === "publish" });
      });
      if (!snapshot) return;
      p.setSavedDraft(snapshot);
      if (kind === "publish") p.setPublished(snapshot);
      if (kind === "discard") { p.reset(snapshot); dismissRecovery(); }
      p.onPersisted?.(snapshot, kind === "publish");
      p.say("ok", kind === "publish" ? "Published. Newer edits remain in your draft." : kind === "discard" ? "Draft discarded." : "Draft saved. Publish when you’re ready to go live.");
      if (kind !== "discard") {
        try { await adminApi.saveThemeVersion(kind === "publish" ? "published" : "draft", `${kind === "publish" ? "Published" : "Draft"} ${new Date().toLocaleString()}`, snapshot); }
        catch { p.say("err", "Your design was saved, but its history snapshot could not be saved."); }
      }
    } catch (error: any) {
      p.say("err", `Could not ${kind === "draft" ? "save draft" : kind}: ${error?.message || "unknown error"}. Your edits are still available; retry when connected.`);
    } finally { locked.current = false; setBusy(null); }
  };
  return { busy, recovery, recover, dismissRecovery, saveDraft: () => persist("draft"), publish: () => persist("publish"), discard: () => persist("discard") };
}
