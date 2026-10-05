import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../../lib/firebase";
import { GhostButton, PrimaryButton, SectionCard, TextField } from "./riso/components";

// Gmail app password for sending shop email. Stored in the admin-only adminSecrets/gmail doc
// (firestore.rules), never in the publicly readable settings/* docs, and never shown again here.
export function GmailSendingCard() {
  const [stored, setStored] = useState<boolean | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "adminSecrets", "gmail"))
      .then((snap) => setStored(Boolean(snap.exists() && snap.data()?.appPassword)))
      .catch(() => setStored(false));
  }, []);

  const cleaned = draft.replace(/\s+/g, "");
  const valid = /^[a-zA-Z]{16}$/.test(cleaned);

  const save = async (value: string) => {
    setSaving(true);
    try {
      await setDoc(doc(db, "adminSecrets", "gmail"), { appPassword: value, updatedAt: serverTimestamp() });
      setStored(Boolean(value));
      setDraft("");
      toast.success(value ? "Gmail app password saved" : "Gmail app password removed");
    } catch (err: any) {
      toast.error(`Could not save: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Gmail sending"
      description="Shop emails are sent from lyricalmyricalbooks@gmail.com using a Google app password. Without one, emails fall back to Resend's test sender and only reach you.">
      <TextField label="Gmail app password" type="password" value={draft} autoComplete="new-password"
        placeholder={stored ? "Stored — enter a new password to replace it" : "16 letters, e.g. abcd efgh ijkl mnop"}
        hint={stored === null ? "Checking…" : stored ? "✓ A password is stored. It is never shown here." : "Create one at myaccount.google.com › Security › App passwords (2-Step Verification must be on)."}
        onChange={(e) => setDraft(e.target.value)} />
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <PrimaryButton disabled={!valid || saving} onClick={() => save(cleaned)}>
          {saving ? "Saving…" : "Save password"}
        </PrimaryButton>
        {stored && (
          <GhostButton disabled={saving} onClick={() => save("")}>Remove</GhostButton>
        )}
      </div>
      {draft && !valid && <p style={{ marginTop: 8 }}>An app password is 16 letters (spaces are fine).</p>}
    </SectionCard>
  );
}
