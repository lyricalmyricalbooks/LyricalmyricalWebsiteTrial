import { describe, expect, it } from "vitest";
import { policyHtml, policyPageFor } from "./policyPages";

describe("policyPages", () => {
  it("escapes HTML and builds paragraphs", () => {
    expect(policyHtml("a <script>x</script>\nb\n\nc")).toBe("<p>a &lt;script&gt;x&lt;/script&gt;<br>b</p><p>c</p>");
  });
  it("resolves only known, non-empty policies", () => {
    expect(policyPageFor("policy-returns", { returns: "30 days" })).toMatchObject({ title: "Returns Policy", status: "published" });
    expect(policyPageFor("policy-returns", { returns: "  " })).toBeNull();
    expect(policyPageFor("policy-bogus", { returns: "x" } as any)).toBeNull();
    expect(policyPageFor("about", {})).toBeNull();
  });
});
