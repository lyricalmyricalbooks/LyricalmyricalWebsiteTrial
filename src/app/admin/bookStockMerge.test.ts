import { describe, expect, it } from "vitest";
import { keepLiveStock } from "./bookStockMerge";

describe("keepLiveStock", () => {
  it("keeps the live stock when the owner didn't touch it (a sale happened meanwhile)", () => {
    const initial = { title: "A", stockLevel: 5, variants: [{ id: "p", stock: 3, stockLevel: 3 }] };
    const form = { title: "A fixed", stockLevel: 5, variants: [{ id: "p", stock: 3, stockLevel: 3, name: "PB" }] };
    const live = { stockLevel: 4, variants: [{ id: "p", stock: 2, stockLevel: 2 }] };
    const out = keepLiveStock(form, initial, live);
    expect(out.title).toBe("A fixed");
    expect(out.stockLevel).toBe(4);
    expect(out.variants[0]).toMatchObject({ name: "PB", stock: 2, stockLevel: 2 });
  });
  it("saves stock the owner changed, and new editions as typed", () => {
    const initial = { stockLevel: 5, variants: [{ id: "p", stock: 3 }] };
    const form = { stockLevel: 10, variants: [{ id: "p", stock: 8 }, { id: "n", stock: 1 }] };
    const live = { stockLevel: 4, variants: [{ id: "p", stock: 2 }] };
    const out = keepLiveStock(form, initial, live);
    expect(out.stockLevel).toBe(10);
    expect(out.variants[0].stock).toBe(8);
    expect(out.variants[1].stock).toBe(1);
  });
  it("treats '5' and 5 as unchanged", () => {
    expect(keepLiveStock({ stockLevel: "5" }, { stockLevel: 5 }, { stockLevel: 3 }).stockLevel).toBe(3);
  });
});
