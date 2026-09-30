import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import { getCopy } from "./storeCopy";

export type NavDropdownEntry = { key: string; label: string; active?: boolean; to?: string; onSelect?: () => void };

/**
 * A header category that has sub-categories (Studio › Menus › Shop categories › "Sits under").
 * Opens on hover or click and lists "All" (the parent itself) then each sub-category.
 * Colours are Studio › Style › Navigation links controls (drop-down background / border).
 * The panel is `position: fixed` so the scrollable category bar can't clip it.
 */
export function NavDropdown({ design, copyDesign, label, linkStyle, className, all, entries, studioTarget = true }: {
  design: any;
  /** Design holding Text & labels (defaults to `design`). */
  copyDesign?: any;
  label: ReactNode;
  linkStyle: CSSProperties;
  className?: string;
  /** The parent category itself ("All"). */
  all: NavDropdownEntry;
  entries: NavDropdownEntry[];
  studioTarget?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const hoverOpenedAt = useRef(0);

  const items = design?.navDropdownHideAll ? entries : [{ ...all, label: getCopy(copyDesign ?? design, "navDropdownAll") }, ...entries];

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 10, left: Math.max(8, r.left - 12) });
  };
  useLayoutEffect(() => { if (open) place(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const hoverOpen = () => {
    window.clearTimeout(closeTimer.current);
    if (!open) hoverOpenedAt.current = Date.now();
    setOpen(true);
  };
  // A click right after the hover opened it (mouse users) keeps it open instead of toggling shut.
  const clickToggle = () => setOpen((o) => !o || Date.now() - hoverOpenedAt.current < 600);
  const hoverClose = () => { closeTimer.current = window.setTimeout(() => setOpen(false), 150); };
  const pick = (entry: NavDropdownEntry) => { setOpen(false); entry.onSelect?.(); };

  const borderColor = design?.navDropdownBorderColor || design?.borderColor || "rgba(var(--border-rgb, 177, 177, 170), 1)";
  const panelStyle: CSSProperties = {
    position: "fixed",
    top: pos?.top ?? 0,
    left: pos?.left ?? 0,
    zIndex: 70,
    minWidth: 180,
    backgroundColor: design?.navDropdownBg || design?.headerBg || design?.backgroundColor || "var(--background)",
    border: `${Math.max(0, Math.min(8, Number(design?.navDropdownBorderWidth ?? 4)))}px solid ${borderColor}`,
    padding: "10px 0",
  };
  const itemStyle = (active?: boolean): CSSProperties => ({
    ...linkStyle,
    color: design?.navDropdownTextColor || linkStyle.color,
    textTransform: (design?.navDropdownTransform || linkStyle.textTransform) as CSSProperties["textTransform"],
    opacity: active ? 1 : Math.max(0.1, Math.min(1, Number(design?.navLinkOpacity ?? 0.6)) + 0.25),
    display: "block",
    padding: "10px 24px",
    textAlign: "left",
    width: "100%",
  });

  return (
    <div ref={wrapRef} className="relative shrink-0" onMouseEnter={hoverOpen} onMouseLeave={hoverClose}
      {...(studioTarget ? { "data-studio-target": "menus:categories|style:navlinks", "data-studio-label": "Category drop-down" } : {})}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={clickToggle}
        onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("a,button")?.focus(), 0); } }}
        style={linkStyle}
        className={`inline-flex items-center gap-1.5 ${className || ""}`}
      >
        {label}
        <ChevronDown size={Math.max(10, Number(linkStyle.fontSize ?? 11) + 2)} strokeWidth={3} aria-hidden="true"
          style={{ transition: "transform .15s", transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && pos && (
        <div ref={panelRef} role="menu" style={panelStyle} onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
          {items.map((entry) => entry.to ? (
            <Link key={entry.key} role="menuitem" to={entry.to} onClick={() => pick(entry)} style={itemStyle(entry.active)}
              aria-current={entry.active ? "page" : undefined} className="transition-all hover:!opacity-100 hover-text-accent">
              {entry.label}
            </Link>
          ) : (
            <button key={entry.key} role="menuitem" type="button" onClick={() => pick(entry)} style={itemStyle(entry.active)}
              aria-current={entry.active ? "true" : undefined} className="transition-all hover:!opacity-100 hover-text-accent">
              {entry.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
