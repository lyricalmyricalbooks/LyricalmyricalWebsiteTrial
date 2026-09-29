import { useEffect, useState } from "react";
import { ChevronDown, Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { SortableList, SortableRow } from "../dndSortable";
import { getBlocksKey, getBlockFields, getSectionMeta } from "../ThemeEditorExtensions";
import { IconButton, SecondaryButton } from "../riso/components";
import { newId, type Section } from "./studioModel";
import { updateBlocks } from "./studioWorkflow";

export function blockLabel(block: any, index: number, fallback = "Block") {
  return String(block.title || block.question || block.heading || block.author || block.alt || block.text || `${fallback} ${index + 1}`);
}

export function StudioOutline({ sections, selectedId, blockId, onSelect, onReorder, onPatch, onAdd, onDuplicate, onDelete, onToggle }: {
  sections: Section[]; selectedId: string | null; blockId: string | null;
  onSelect: (sectionId: string, blockId?: string) => void;
  onReorder: (sections: Section[]) => void; onPatch: (id: string, patch: any) => void;
  onAdd: (index: number) => void; onDuplicate: (id: string) => void;
  onDelete: (id: string) => void; onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => { if (selectedId && blockId) setExpanded(prev => new Set([...prev, selectedId])); }, [selectedId, blockId]);
  const insert = (index: number) => <button className="studio-insert" onClick={() => onAdd(index)} aria-label={`Add section at position ${index + 1}`}><Plus size={12} /> Add section here</button>;
  return <div className="studio-outline">
    <p className="studio-hint">Drag a handle to reorder. Select a section or expand it to edit individual blocks.</p>
    {sections.length >= 25 && <p role="status" className="studio-hint">{sections.length} sections — consider fewer sections for a faster page.</p>}
    {insert(0)}
    <SortableList items={sections} getId={s => s.id} onReorder={onReorder}>
      {sections.map((section, index) => {
        const meta = getSectionMeta(section.type);
        const key = getBlocksKey(section.type);
        const blocks = section.settings[key] || section.settings.blocks || [];
        const supportsBlocks = Boolean(meta?.blockType && getBlockFields(section.type).length);
        const open = expanded.has(section.id);
        const patchBlocks = (fn: (blocks: any[]) => any[]) => onPatch(section.id, updateBlocks(section, key, fn));
        return <div key={section.id}>
          <SortableRow id={section.id} className="studio-tree-section">
            {({ handleProps }) => <>
              <div className="studio-tree-row" data-selected={selectedId === section.id && !blockId} data-hidden={section.visible === false}>
                <button {...handleProps} className="studio-grip" aria-label={`Reorder ${meta?.label || section.type}`}><GripVertical size={15} /></button>
                {supportsBlocks && <button className="studio-expand" aria-label={`Expand ${meta?.label}`} aria-expanded={open} onClick={() => setExpanded(prev => {
                  const next = new Set(prev); next.has(section.id) ? next.delete(section.id) : next.add(section.id); return next;
                })}><ChevronDown size={14} style={{ transform: open ? undefined : "rotate(-90deg)" }} /></button>}
                <button className="studio-tree-label" aria-current={selectedId === section.id && !blockId} onClick={() => onSelect(section.id)}>
                  <strong>{meta?.label || section.type}</strong>
                  <small>{section.settings.title || section.settings.heading || (supportsBlocks ? `${blocks.length} blocks` : "Section")}</small>
                </button>
                <IconButton label={section.visible === false ? "Show section" : "Hide section"} onClick={() => onToggle(section.id)}>{section.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}</IconButton>
                <details className="studio-row-menu"><summary aria-label={`Actions for ${meta?.label}`}>···</summary><div>
                  <button onClick={() => onDuplicate(section.id)}><Copy size={13} /> Duplicate</button>
                  <button onClick={() => onDelete(section.id)}><Trash2 size={13} /> Remove</button>
                </div></details>
              </div>
              {supportsBlocks && open && <div className="studio-blocks">
                <SortableList items={blocks} getId={(b: any) => b.id} onReorder={next => patchBlocks(() => next)}>
                  {blocks.map((block: any, i: number) => <SortableRow key={block.id} id={block.id}>
                    {({ handleProps: blockHandle }) => <div className="studio-tree-row" data-selected={selectedId === section.id && blockId === block.id} data-hidden={block.hidden}>
                      <button {...blockHandle} className="studio-grip" aria-label={`Reorder ${blockLabel(block, i)}`}><GripVertical size={13} /></button>
                      <button className="studio-tree-label" aria-current={selectedId === section.id && blockId === block.id} onClick={() => onSelect(section.id, block.id)}>{blockLabel(block, i, meta?.blockLabel)}</button>
                      <IconButton label={block.hidden ? "Show block" : "Hide block"} onClick={() => patchBlocks(list => list.map(b => b.id === block.id ? { ...b, hidden: !b.hidden } : b))}>{block.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</IconButton>
                    </div>}
                  </SortableRow>)}
                </SortableList>
                <SecondaryButton onClick={() => {
                  const block = { ...JSON.parse(JSON.stringify(meta?.blockDefaults || {})), id: newId() };
                  patchBlocks(list => [...list, block]); onSelect(section.id, block.id);
                }}><Plus size={13} /> Add {meta?.blockLabel || "block"}</SecondaryButton>
              </div>}
            </>}
          </SortableRow>
          {insert(index + 1)}
        </div>;
      })}
    </SortableList>
    {!sections.length && <p className="studio-empty">Start with a section. Your page’s built-in content remains available.</p>}
  </div>;
}
