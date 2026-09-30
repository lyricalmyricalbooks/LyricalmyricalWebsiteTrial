import { describe, expect, it } from "vitest";
import { navNeedsOwnRow } from "./headerNav";

describe("navNeedsOwnRow", () => {
  it("keeps a comfortable buffer when the header fits inline", () => {
    expect(navNeedsOwnRow(400, 300, 900)).toBe(false);
  });

  it("moves the navigation below before it can collide with fixed controls", () => {
    expect(navNeedsOwnRow(520, 430, 1000)).toBe(true);
  });

  it("treats an exact fit including the buffer as inline", () => {
    expect(navNeedsOwnRow(404, 300, 800)).toBe(false);
  });
});
