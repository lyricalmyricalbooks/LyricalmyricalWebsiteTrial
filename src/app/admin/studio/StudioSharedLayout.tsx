import { SectionCard, SecondaryButton } from "../riso/components";

/** A task-oriented entry point into existing shared controls; all edits retain the draft workflow. */
export function StudioSharedLayout({ globalCount, onStyle, onText, onNavigation, onSections }: {
  globalCount: number; onStyle: (id: string, label?: string) => void;
  onText: (group: string) => void; onNavigation: () => void; onSections: () => void;
}) {
  return <div className="studio-shared-layout">
    <p className="studio-hint">These parts are shared across your shop. Double-click plain text in the preview to type directly; Done keeps the edit in your draft.</p>
    <SectionCard title="Announcement" description="The message, ticker and visibility above your header.">
      <SecondaryButton onClick={() => onStyle("header", "Announcement bar")}>Message & appearance</SecondaryButton>
    </SectionCard>
    <SectionCard title="Header" description="Logo, wordmark, header layout and shopping controls.">
      <SecondaryButton onClick={() => onStyle("header")}>Header settings</SecondaryButton>
      <SecondaryButton onClick={() => onStyle("logo")}>Logo & wordmark</SecondaryButton>
      <SecondaryButton onClick={() => onText("Header")}>Header words</SecondaryButton>
    </SectionCard>
    <SectionCard title="Navigation" description="Menu links, category hierarchy and header order.">
      <SecondaryButton onClick={onNavigation}>Manage menus & categories</SecondaryButton>
      <SecondaryButton onClick={() => onStyle("navlinks")}>Link appearance</SecondaryButton>
    </SectionCard>
    <SectionCard title="Footer" description="Footer layout, social links and the words shoppers see.">
      <SecondaryButton onClick={() => onStyle("footer")}>Footer settings</SecondaryButton>
      <SecondaryButton onClick={() => onText("Footer")}>Footer words</SecondaryButton>
    </SectionCard>
    <SectionCard title="Shared sections" description={`${globalCount} reusable section${globalCount === 1 ? "" : "s"} shown on every page.`}>
      <SecondaryButton onClick={onSections}>Edit shared section outline</SecondaryButton>
    </SectionCard>
  </div>;
}
