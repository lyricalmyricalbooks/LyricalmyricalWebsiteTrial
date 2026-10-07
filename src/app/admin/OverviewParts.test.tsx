import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReadinessPanel } from "./OverviewParts";

describe("ReadinessPanel", () => {
  it("shows unknown readiness with a retry after a source read fails", () => {
    const html = renderToStaticMarkup(<ReadinessPanel error items={null} onRetry={() => {}} onOpen={() => {}} />);
    expect(html).toContain("Launch checks unavailable");
    expect(html).toContain("Readiness is unknown");
    expect(html).toContain("Try again");
  });
  it("keeps deployment checks actionable through an external link", () => {
    const html = renderToStaticMarkup(<ReadinessPanel error={false} items={[{ id: "deployment", status: "warn", label: "Deployment unverified", detail: "Review release", tab: "general", action: "Check deployments", href: "https://example.com/releases" }]} onRetry={() => {}} onOpen={() => {}} />);
    expect(html).toContain('href="https://example.com/releases"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Check deployments");
  });
});
