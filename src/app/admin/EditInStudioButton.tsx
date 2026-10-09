import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { loadAuth, maySavedSignIn } from "../../lib/authSession";
import { locationForPath, studioHash } from "../lib/studioLocation";

const OWNER = "lyricalmyricalbooks@gmail.com";

/**
 * Owner-only (admin) shortcut on the live site (like Shopify's "Customize"): when the shop owner is signed
 * in on this browser, a small button opens the Design studio on the page being viewed. Shoppers,
 * the Studio preview and prerendered HTML never show it.
 */
export function EditInStudioButton() {
  const location = useLocation();
  const [owner, setOwner] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("preview") === "true") return;
    // Auth is loaded only when this browser may hold a saved sign-in, so shoppers never download it.
    let stop: (() => void) | undefined;
    let cancelled = false;
    maySavedSignIn().then(maybe => maybe ? loadAuth() : null).then(auth => {
      if (!auth || cancelled) return;
      stop = auth.onAuthStateChanged(user => setOwner(!!user && user.email === OWNER && user.emailVerified));
    }).catch(() => {});
    return () => { cancelled = true; stop?.(); };
  }, []);
  if (!owner || location.pathname.startsWith("/admin")) return null;
  const base = import.meta.env.BASE_URL;
  const href = `${base}admin${studioHash(locationForPath(base.replace(/\/$/, "") + location.pathname, base))}`;
  return (
    <a href={href} className="fm-edit-in-studio" data-edit-in-studio
      style={{ position: "fixed", left: 16, bottom: 16, zIndex: 9990, padding: "10px 14px", fontSize: 12, fontWeight: 800,
        letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none",
        background: "var(--accent, #e8402a)", color: "var(--on-accent, #100f0d)", border: "2px solid var(--fg, #ffffff)" }}>
      Edit in Studio
    </a>
  );
}
