import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Dialog } from "../riso/components";
import { KIND_LABEL, searchStudio, type SearchEntry } from "./studioSearch";

/** "Find anything" — one search box over every Style control, text label, page, section and action. */
export function StudioSearch({ open, onClose, index, onPick }: {
  open: boolean; onClose: () => void; index: SearchEntry[]; onPick: (entry: SearchEntry) => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = useMemo(() => searchStudio(index, q), [index, q]);
  useEffect(() => { if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, listId]);

  const pick = (entry?: SearchEntry) => { if (!entry) return; onClose(); onPick(entry); };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(results.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(results[active]); }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Find anything" description="Type what you want to change — “price colour”, “footer words”, “phone”, “publish”.">
      <div className="studio-find">
        <div className="studio-find-box">
          <Search size={16} aria-hidden />
          <input ref={inputRef} role="combobox" aria-expanded aria-controls={listId} aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
            aria-label="Find a setting, text, page, section or action" autoComplete="off" spellCheck={false}
            placeholder="Search settings, words, pages, sections…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown} />
        </div>
        {!q && <p className="studio-hint">Shortcuts. Start typing to search everything in Studio.</p>}
        <ul id={listId} role="listbox" aria-label="Results" className="studio-find-list">
          {results.map((r, i) => (
            <li key={r.id} id={`${listId}-${i}`} role="option" aria-selected={i === active} className="studio-find-row"
              data-active={i === active || undefined} onMouseEnter={() => setActive(i)} onClick={() => pick(r)}>
              <span className="studio-find-kind" data-kind={r.kind}>{KIND_LABEL[r.kind]}</span>
              <span className="studio-find-main"><strong>{r.title}</strong><small>{r.where}</small></span>
            </li>
          ))}
        </ul>
        {q && !results.length && <p className="studio-empty">Nothing matches “{q}”. Try a simpler word, like “color”, “font”, “button” or “footer”.</p>}
        <p className="studio-hint" aria-hidden="true">↑ ↓ to move · Enter to open · Esc to close</p>
      </div>
    </Dialog>
  );
}
