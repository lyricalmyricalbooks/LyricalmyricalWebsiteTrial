import { expect, it } from "vitest";
import { resolveSurfaceDesign } from "./surfaceDesign";

it("inherits cleared page overrides and preserves template stacks", () => {
  const design = { primaryColor: "red", page: { backgroundColor: "black", sections: [1] }, "page:about": { primaryColor: "blue", sections: [2] } };
  expect(resolveSurfaceDesign(design, "/page/about")).toMatchObject({ primaryColor: "blue", backgroundColor: "black", "page:about": { sections: [2] } });
  expect(resolveSurfaceDesign({ ...design, "page:about": { sections: [2] } }, "/page/about").primaryColor).toBe("red");
  expect(resolveSurfaceDesign(design, "/account")).toBe(design);
});

it("uses the correct product and checkout surfaces without touching commerce settings", () => {
  const design = { primaryColor: "red", productPage: { primaryColor: "green" }, cartPage: { primaryColor: "blue" } };
  expect(resolveSurfaceDesign(design, "/books/poems").primaryColor).toBe("green");
  expect(resolveSurfaceDesign(design, "/checkout").primaryColor).toBe("blue");
});
