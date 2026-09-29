import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, Eye, EyeOff, Trash2, X } from "lucide-react";
import { adminApi } from "../api";
import { BlockFieldEditor, BlockListFieldEditor, getBlockFields, getBlocksKey, getSectionFields, getSectionMeta, SectionFieldEditor, SectionSettingsPanel } from "../ThemeEditorExtensions";
import { IconButton, useFocusTrap } from "../riso/components";
import { newId, type Section } from "./studioModel";
import { updateBlocks } from "./studioWorkflow";
import { blockLabel } from "./StudioOutline";

export function StudioInspector({ section, blockId, colorSchemes, onPatch, onSelectBlock, onDuplicate, onDelete, onToggle, onClose }: {
  section: Section; blockId: string | null; colorSchemes: any[];
  onPatch: (patch: Record<string, any>) => void; onSelectBlock: (id: string | null) => void;
  onDuplicate: () => void; onDelete: () => void; onToggle: () => void; onClose: () => void;
}) {
  const [tab, setTab] = useState("content");
  const [search, setSearch] = useState("");
  const [overlay, setOverlay] = useState(() => window.matchMedia("(max-width: 1099px)").matches);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1099px)");
    const update = () => setOverlay(media.matches); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useFocusTrap(ref, overlay, onClose);
  useEffect(() => { setTab("content"); setSearch(""); }, [section.id, blockId]);
  const meta = getSectionMeta(section.type);
  const key = getBlocksKey(section.type);
  const blocks = section.settings[key] || section.settings.blocks || [];
  const block = blocks.find((b: any) => b.id === blockId);
  const fields = (block ? getBlockFields(section.type) : getSectionFields(section.type)).filter(f => `${f.label} ${f.key}`.toLowerCase().includes(search.toLowerCase()));
  const uploadFile = useCallback((file: File) => adminApi.uploadFile(file, `sections/${section.id}_${Date.now()}`), [section.id]);
  const patchBlock = (patch: any) => onPatch(updateBlocks(section, key, list => list.map(b => b.id === block.id ? { ...b, ...patch } : b)));
  const title = block ? blockLabel(block, blocks.indexOf(block), meta?.blockLabel) : meta?.label || section.type;
  return <aside ref={ref} className="studio-inspector" role={overlay ? "dialog" : undefined} aria-modal={overlay || undefined} aria-label="Content settings" tabIndex={-1}>
    <header className="studio-inspector-head">
      <div><small>{block ? `${meta?.label} / Block` : "SECTION"}</small><h2>{title}</h2></div>
      <IconButton label="Close settings" onClick={onClose}><X size={17} /></IconButton>
    </header>
    <div className="studio-inspector-actions">
      {block && <IconButton label="Back to section" onClick={() => onSelectBlock(null)}><ArrowLeft size={15} /></IconButton>}
      <IconButton label={block ? (block.hidden ? "Show block" : "Hide block") : section.visible === false ? "Show section" : "Hide section"} onClick={block ? () => patchBlock({ hidden: !block.hidden }) : onToggle}>{(block ? block.hidden : section.visible === false) ? <EyeOff size={15} /> : <Eye size={15} />}</IconButton>
      <IconButton label={block ? "Duplicate block" : "Duplicate section"} onClick={block ? () => {
        const copy = { ...JSON.parse(JSON.stringify(block)), id: newId() };
        onPatch(updateBlocks(section, key, list => { const next = [...list]; next.splice(list.findIndex(b => b.id === block.id) + 1, 0, copy); return next; }));
        onSelectBlock(copy.id);
      } : onDuplicate}><Copy size={15} /></IconButton>
      <IconButton label={block ? "Remove block" : "Delete section"} tone="danger" onClick={block ? () => {
        if (!window.confirm("Remove this block? You can undo this change.")) return;
        onPatch(updateBlocks(section, key, list => list.filter(b => b.id !== block.id))); onSelectBlock(null);
      } : onDelete}><Trash2 size={15} /></IconButton>
      <small>{(block ? block.hidden : section.visible === false) ? "Hidden on storefront" : "Visible on storefront"}</small>
    </div>
    {!block && <div className="studio-tabs" role="tablist" aria-label="Section settings">
      {["content", "design"].map(id => <button role="tab" aria-selected={tab === id} key={id} onClick={() => setTab(id)}>{id === "content" ? "Content" : "Layout & style"}</button>)}
    </div>}
    <div className="studio-inspector-body">
      {tab === "content" && <>
        <input className="studio-search" aria-label="Search content settings" placeholder="Find a setting…" value={search} onChange={e => setSearch(e.target.value)} />
        {!fields.length && <p className="studio-hint">{search ? "No matching settings." : "Select a block in the outline or use Layout & style."}</p>}
        {fields.map(f => <div key={f.key} className="studio-field">
          {block ? f.kind === "list" ? <BlockListFieldEditor field={f as any} value={block[f.key]} onChange={v => patchBlock({ [f.key]: v })} /> :
            <BlockFieldEditor field={f as any} value={block[f.key]} onChange={v => patchBlock({ [f.key]: v })} uploadFile={uploadFile} block={block} onPatchBlock={patchBlock} /> :
            <SectionFieldEditor field={f as any} value={section.settings[f.key]} settings={section.settings} onChange={v => onPatch({ [f.key]: v })} onPatch={onPatch} uploadFile={uploadFile} />}
        </div>)}
      </>}
      {tab === "design" && <SectionSettingsPanel settings={section.settings} onUpdate={onPatch} colorSchemes={colorSchemes} />}
    </div>
  </aside>;
}
