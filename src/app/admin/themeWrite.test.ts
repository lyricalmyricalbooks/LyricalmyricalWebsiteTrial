import { describe, expect, it } from "vitest";
import { themeWrite } from "./themeWrite";

describe("theme persistence contract", () => {
  it("replaces the entire draft map so cleared overrides do not reappear", () => {
    const write = themeWrite({ design: { heroPage: { sections: [], primaryColor: undefined } } });
    expect(write.payload).toEqual({ draftDesign: { heroPage: { sections: [] } } });
    expect(write.options).toEqual({ mergeFields: ["draftDesign"] });
  });
  it("publishes identical clean snapshots without replacing unrelated settings", () => {
    const write = themeWrite({ design: { primaryColor: "red", unused: undefined }, savedThemes: [] }, true);
    expect(write.payload).toEqual({ design: { primaryColor: "red" }, draftDesign: { primaryColor: "red" }, savedThemes: [] });
    expect(write.options.mergeFields.sort()).toEqual(["design", "draftDesign", "savedThemes"]);
  });
});
