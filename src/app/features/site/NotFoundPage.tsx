import { Link } from "react-router";
import { getCopy } from "./storeCopy";
import { useLiveDesign } from "./useSiteData";
import { StorefrontThemeStyle } from "./StorefrontThemeStyle";

export function NotFoundContent({ design }: { design: any }) {
  return <main data-fm-store data-studio-target="style:customPages|copy:Custom pages & 404" data-studio-label="Not-found page" className="fm-page min-h-screen flex flex-col items-center justify-center gap-6 px-6" style={{ color: "var(--text)", background: "var(--background)" }}>
    <StorefrontThemeStyle design={design} />
    {design?.showNotFoundMessage !== false && <><p className="text-7xl font-bold opacity-40">{getCopy(design, "notFoundCode")}</p><h1>{getCopy(design, "notFoundTitle")}</h1></>}
    {design?.showNotFoundBack !== false && <Link to="/" className="min-h-11 px-6 py-3 underline">{getCopy(design, "notFoundBack")}</Link>}
  </main>;
}
export default function NotFoundPage() { return <NotFoundContent design={useLiveDesign()} />; }
