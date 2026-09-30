import { describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("react-quill", () => ({ default: () => null }));
vi.mock("react-quill/dist/quill.snow.css", () => ({}));

const { CurrentPageContext, PageContentSection } = await import("../../components/SectionComponents");
const { sitePageStyle } = await import("./PageView");

const render = (settings: any, design: any) =>
  renderToStaticMarkup(
    h(CurrentPageContext.Provider, { value: { title: "History of LM", body: "<p>ssss</p>", pageStyle: sitePageStyle(design, "Page") } },
      h(PageContentSection, { settings, enableAnimations: false })),
  );

describe("custom pages share one Studio-controlled look", () => {
  const design = { pageTitleSize: "xl", pageAlign: "center", pageWidth: "wide", pageTextColor: "#123456" };
  const drifted = { titleSize: "sm", align: "left", maxWidth: "full", textColor: "#ff0000", showEyebrow: false };

  it("a page's Page content section follows Style › Custom pages, ignoring stale per-page styling", () => {
    const html = render(drifted, design);
    expect(html).toContain("text-6xl");
    expect(html).toContain("max-w-6xl");
    expect(html).toContain("#123456");
    expect(html).not.toContain("#ff0000");
    expect(html).toContain(">Page<");
  });

  it("“Style this page on its own” keeps the section's own values", () => {
    const html = render({ ...drifted, ownStyle: true }, design);
    expect(html).toContain("text-3xl");
    expect(html).toContain("#ff0000");
  });

  it("falls back to the standard look when nothing is set", () => {
    expect(sitePageStyle({}, "Page")).toMatchObject({ showEyebrow: true, titleSize: "md", titleUppercase: true, maxWidth: "narrow", align: "left" });
  });
});
