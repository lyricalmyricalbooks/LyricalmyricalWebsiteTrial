import { expect, it } from "vitest";
import { isLiveBook } from "./liveBook";

it("hides drafts, archived and not-yet-released books", () => {
  const now = "2026-10-06T12:00:00.000Z";
  expect(isLiveBook({ status: "published" }, now)).toBe(true);
  expect(isLiveBook({}, now)).toBe(true);
  expect(isLiveBook({ status: "draft" }, now)).toBe(false);
  expect(isLiveBook({ status: "archived" }, now)).toBe(false);
  expect(isLiveBook({ status: "published", scheduleDate: "2026-10-07" }, now)).toBe(false);
  expect(isLiveBook({ status: "published", scheduleDate: "2026-10-06" }, now)).toBe(true);
});

import { applyBackorderPolicy } from "./backorder";
it("books with inventory tracking off, or editions on backorder, are not shown as sold out", () => {
  expect((applyBackorderPolicy({ trackInventory: false, stockLevel: 0 } as any) as any).stockLevel).toBe(999);
  const b: any = applyBackorderPolicy({ trackInventory: true, allowBackorder: true, stockLevel: 0, variants: [{ id: "a", stock: 0 }] } as any);
  expect(b.stockLevel).toBe(999);
  expect(b.variants[0].onBackorder).toBe(true);
  expect((applyBackorderPolicy({ trackInventory: true, stockLevel: 0 } as any) as any).stockLevel).toBe(0);
});
