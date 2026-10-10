import { describe, expect, it } from "vitest";
import { buildInventory, inventorySummary, inventoryToCsv, parseStock, statusOf } from "./inventoryInsights";

const NOW = new Date("2026-09-29").getTime();
describe("inventoryInsights", () => {
  it("classifies status", () => {
    expect(statusOf(0, null, 5, false)).toBe("out");
    expect(statusOf(3, null, 5, false)).toBe("low");
    expect(statusOf(20, 10, 5, false)).toBe("reprint");
    expect(statusOf(20, null, 5, false)).toBe("ok");
    expect(statusOf(0, null, 5, true)).toBe("digital");
  });
  it("builds rows with velocity and summary", () => {
    const books = [{ id: "a", title: "A", trackInventory: true, stockLevel: 10, price: 10, status: "published" }, { id: "d", title: "D", status: "draft" }, { id: "e", title: "E", format: "E-book (PDF)", stockLevel: 99, price: 5 }];
    const orders = [{ createdAt: "2026-09-20", items: [{ id: "a", quantity: 10 }] }];
    const rows = buildInventory(books, orders, 5, NOW);
    expect(rows.map((r) => r.id)).toEqual(["a", "e"]);
    expect(rows[0]).toMatchObject({ sold30: 10, status: "reprint", value: 100 });
    expect(inventorySummary(rows)).toMatchObject({ units: 10, value: 100, reprint: 1 });
    expect(inventoryToCsv(rows).split("\n")).toHaveLength(3);
  });
  it("parses manual stock", () => {
    expect(parseStock("12")).toBe(12);
    expect(parseStock("-4")).toBe(0);
    expect(parseStock("2.6")).toBe(3);
    expect(parseStock("")).toBeNull();
    expect(parseStock("abc")).toBeNull();
  });
});
