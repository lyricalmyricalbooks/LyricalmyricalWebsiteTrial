// Store policies (settings.policies) are plain text; they are served as public pages at /page/policy-<key>.
export const POLICY_KEYS = ["shipping", "returns", "privacy", "terms"] as const;
export type PolicyKey = (typeof POLICY_KEYS)[number];

export const POLICY_TITLES: Record<PolicyKey, string> = {
  shipping: "Shipping Policy", returns: "Returns Policy", privacy: "Privacy Policy", terms: "Terms of Service",
};

export const policySlug = (key: PolicyKey) => `policy-${key}`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain text → safe HTML: blank lines split paragraphs, single newlines become <br>. */
export function policyHtml(text: string): string {
  return String(text || "").trim().split(/\n{2,}/).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
}

/** Resolves /page/policy-<key> to a synthetic published page, or null when unknown/empty. */
export function policyPageFor(slug: string | undefined, policies: Partial<Record<PolicyKey, string>> | undefined) {
  const m = /^policy-(.+)$/.exec(slug || "");
  const key = m?.[1] as PolicyKey | undefined;
  if (!key || !POLICY_KEYS.includes(key)) return null;
  const text = policies?.[key];
  if (!text || !text.trim()) return null;
  return { id: `policy-${key}`, title: POLICY_TITLES[key], slug: slug!, body: policyHtml(text), status: "published" as const };
}
