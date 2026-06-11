// Central resolver for Cloud Function endpoints so the project/region is
// defined in exactly one place. Override with VITE_FUNCTIONS_BASE when the
// backend moves (e.g. a different project or a proxy domain).
const PROJECT_ID = "lyricalmyrical-web-v2";
const REGION = "us-central1";

export function functionUrl(name: string): string {
  const override = import.meta.env.VITE_FUNCTIONS_BASE as string | undefined;
  if (override) return `${override.replace(/\/$/, "")}/${name}`;
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/${name}`;
  }
  return `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${name}`;
}
