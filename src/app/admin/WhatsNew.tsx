import { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { Dialog, GhostButton } from "./riso/components";
import { APP_UPDATES, type AppUpdate } from "./appUpdates";

type UpdateLink = AppUpdate["links"][number];
export function WhatsNew({ onNavigate, onHistoryOpen, appearance }: { onNavigate: (link: UpdateLink) => void; onHistoryOpen: () => void; appearance: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const latest = APP_UPDATES[0];
  const navigate = (link: UpdateLink) => { setOpen(false); onNavigate(link); };
  const entry = (update: AppUpdate) => (
    <article className="rp-update-entry" key={update.id}>
      <time dateTime={update.date}>{update.date}</time>
      <h3>{update.title}</h3>
      <p>{update.summary}</p>
      <div className="rp-update-links">
        {update.links.map((link) => <button type="button" key={link.label} onClick={() => navigate(link)}>{link.label} →</button>)}
      </div>
    </article>
  );
  return <>
    <section className="rp-whats-new" aria-label="What's new">
      <h2><Sparkles size={16} aria-hidden /> What's new</h2>
      {latest && entry(latest)}
      <GhostButton size="sm" onClick={() => { onHistoryOpen(); setOpen(true); }}>View all updates</GhostButton>
    </section>
    {createPortal(<Dialog appearance={appearance} open={open} onClose={() => setOpen(false)} title="What's new" description="App changes and shortcuts to try them.">
      {APP_UPDATES.map(entry)}
    </Dialog>, document.body)}
  </>;
}

