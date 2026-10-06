import { describe, expect, it } from "vitest";
import { applyBackorderPolicy } from "./backorder";

describe("applyBackorderPolicy", () => {
  it("keeps a sold-out tracked book purchasable when backorders are allowed", () => {
    const b = applyBackorderPolicy({ trackInventory: true, allowBackorder: true, stockLevel: 0 } as any) as any;
    expect(b.stockLevel).toBe(999);
    expect(b.onBackorder).toBe(true);
  });
  it("leaves books alone when backorders are off or stock remains", () => {
    const off = { trackInventory: true, allowBackorder: false, stockLevel: 0 } as any;
    expect(applyBackorderPolicy(off)).toBe(off);
    const inStock = applyBackorderPolicy({ trackInventory: true, allowBackorder: true, stockLevel: 4 } as any) as any;
    expect(inStock.stockLevel).toBe(4);
    expect(inStock.onBackorder).toBeUndefined();
  });
  it("flags only the empty variants", () => {
    const b = applyBackorderPolicy({
      trackInventory: true, allowBackorder: true, stockLevel: 0,
      variants: [{ id: "a", stock: 0 }, { id: "b", stock: 3 }],
    } as any) as any;
    expect(b.variants[0].onBackorder).toBe(true);
    expect(b.variants[1].stock).toBe(3);
    // The book itself isn't sold out while its editions can be ordered.
    expect(b.stockLevel).toBe(999);
  });
});
