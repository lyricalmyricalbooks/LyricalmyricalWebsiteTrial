import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, Eye, EyeOff, Trash2, X } from "lucide-react";
import { adminApi } from "../api";
import { BlockFieldEditor, BlockListFieldEditor, getBlockFields, getBlocksKey, getSectionFields, getSectionMeta, SectionFieldEditor, SectionSettingsPanel } from "../ThemeEditorExtensions";
import { IconButton, useFocusTrap } from "../riso/components";
import { findBlock, freshBlockIds, mapBlock, removeBlock, type Section, type SharedBlock } from "./studioModel";
import { updateBlocks } from "./studioWorkflow";
import { blockLabel } from "./StudioOutline";

export function StudioInspector({ section, blockId, colorSchemes, device, sharedBlocks, onSaveShared, onPatchShared, onInsertShared, onPatch, onSelectBlock, onDuplicate, onDelete, onToggle, onClose }: {
  section: Section; blockId: string | null; colorSchemes: any[];
  device: "desktop" | "tablet" | "mobile"; sharedBlocks: SharedBlock[];
  onSaveShared: (blockId: string, name: string) => void; onInsertShared: (shared: SharedBlock) => void;
  onPatchShared: (sharedId: string, patch: Record<string, any>) => void;
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
  const placement = blockId ? findBlock(blocks, blockId) : undefined;
  const sharedSource = placement?.sharedBlockId ? sharedBlocks.find(s => s.id === placement.sharedBlockId)?.block : undefined;
  const block = placement && sharedSource ? { ...sharedSource, ...placement, id: placement.id } : placement;
  const fields = (block ? getBlockFields(section.type) : getSectionFields(section.type)).filter(f => `${f.label} ${f.key}`.toLowerCase().includes(search.toLowerCase()));
  const uploadFile = useCallback((file: File) => adminApi.uploadFile(file, `sections/${section.id}_${Date.now()}`), [section.id]);
  const patchBlock = (patch: any) => {
    if (placement?.sharedBlockId && !Object.keys(patch).some(k => k === "grid" || k === "responsive" || k === "hidden")) onPatchShared(placement.sharedBlockId, patch);
    else onPatch(updateBlocks(section, key, list => mapBlock(list, block.id, b => ({ ...b, ...patch }))));
  };
  const patchResponsive = (group: "responsive" | "grid", field: string, value: any) => patchBlock({
    [group]: { ...(block?.[group] || {}), [device]: { ...(block?.[group]?.[device] || {}), [field]: value } },
  });
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
        const copy = freshBlockIds(block);
        onPatch(updateBlocks(section, key, list => [...list, copy]));
        onSelectBlock(copy.id);
      } : onDuplicate}><Copy size={15} /></IconButton>
      <IconButton label={block ? "Remove block" : "Delete section"} tone="danger" onClick={block ? () => {
        if (!window.confirm("Remove this block? You can undo this change.")) return;
        onPatch(updateBlocks(section, key, list => removeBlock(list, block.id))); onSelectBlock(null);
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
        {block && <div className="studio-control-card">
          <strong>Responsive layout · {device}</strong>
          <p className="studio-hint">These overrides follow the preview size. Blank values inherit desktop.</p>
          <label>Alignment<select value={block.responsive?.[device]?.align || ""} onChange={e => patchResponsive("responsive", "align", e.target.value || undefined)}><option value="">Inherit</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
          <label><input type="checkbox" checked={Boolean(block.responsive?.[device]?.hidden)} onChange={e => patchResponsive("responsive", "hidden", e.target.checked || undefined)} /> Hide at this size</label>
          {section.type === "CompositionSection" && <div className="studio-grid-fields">
            {[["column", "Column", 1, 24], ["span", "Width", 1, 24], ["row", "Row", 1, 30], ["rowSpan", "Height", 1, 12], ["z", "Layer", 0, 20]].map(([field, label, min, max]) => <label key={String(field)}>{label}<input type="number" min={Number(min)} max={Number(max)} value={block.grid?.[device]?.[String(field)] || ""} onChange={e => patchResponsive("grid", String(field), e.target.value ? Number(e.target.value) : undefined)} /></label>)}
          </div>}
          <button className="studio-link-button" onClick={() => { const name = window.prompt("Name this shared block:", title); if (name?.trim()) onSaveShared(block.id, name.trim()); }}>Save as linked shared block</button>
          {block.sharedBlockId && <small>Linked to {sharedBlocks.find(s => s.id === block.sharedBlockId)?.name || "a missing shared block"}. Content updates from its library source; layout stays local.</small>}
        </div>}
      </>}
      {!block && sharedBlocks.some(shared => !shared.sectionType || shared.sectionType === section.type) && <div className="studio-control-card"><strong>Shared blocks</strong><p className="studio-hint">Insert a compatible linked instance. Editing its source updates every placement.</p>{sharedBlocks.filter(shared => !shared.sectionType || shared.sectionType === section.type).map(shared => <button key={shared.id} className="studio-link-button" onClick={() => onInsertShared(shared)}>+ {shared.name}</button>)}</div>}
      {tab === "design" && <SectionSettingsPanel settings={section.settings} onUpdate={onPatch} colorSchemes={colorSchemes} />}
    </div>
  </aside>;
}
