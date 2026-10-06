import { describe, it, expect } from "vitest";
import { launchReadiness, readinessSummary } from "./launchReadiness";

const goodSettings = {
  payments: { testMode: false, stripe: { connected: true, publicKey: "pk_live_" + "a".repeat(24), secretKeyStored: true } },
  policies: { shipping: "x", returns: "x", privacy: "x", terms: "x" },
};
const goodBook = { title: "A", status: "published", retailPrice: 20, photos: [{ url: "u" }], description: "d" };
const status = (items: any[], id: string) => items.find(i => i.id === id)?.status;

describe("launchReadiness", () => {
  it("is all green for a ready shop", () => {
    const items = launchReadiness({ settings: goodSettings, books: [goodBook], shippingProfiles: [{}], emailLog: [{ status: "sent" }], orders: [{ paymentStatus: "paid" }] });
    expect(items.filter(i => i.status !== "ok")).toEqual([]);
    expect(readinessSummary(items)).toBe("ok");
  });

  it("flags the launch blockers", () => {
    const items = launchReadiness({ settings: { payments: {} }, books: [], shippingProfiles: [], emailLog: [{ status: "failed", error: "bad key" }], orders: [{ paymentStatus: "paid", isTest: true }] });
    expect(status(items, "payments")).toBe("block");
    expect(status(items, "books")).toBe("block");
    expect(status(items, "email")).toBe("block");
    expect(status(items, "shipping")).toBe("warn");
    expect(status(items, "policies")).toBe("warn");
    expect(status(items, "first-sale")).toBe("warn");
    expect(readinessSummary(items)).toBe("block");
  });

  it("names incomplete books and ignores drafts", () => {
    const items = launchReadiness({ settings: goodSettings, books: [goodBook, { title: "No price", retailPrice: 0, photos: [{}], description: "d" }, { title: "Draft", status: "draft" }], shippingProfiles: [{}], emailLog: [{ status: "sent" }], orders: [] });
    const books = items.find(i => i.id === "books")!;
    expect(books.status).toBe("warn");
    expect(books.detail).toBe("No price");
  });

  it("warns in sandbox mode and when no secret key is stored", () => {
    const items = launchReadiness({ settings: { ...goodSettings, payments: { testMode: true, stripe: { connected: true, testPublicKey: "pk_test_" + "a".repeat(24) } } }, books: [goodBook], shippingProfiles: [{}], emailLog: [{ status: "sent" }], orders: [] });
    expect(status(items, "payments")).toBe("warn");
    expect(status(items, "stripe-secret")).toBe("warn");
  });
});
