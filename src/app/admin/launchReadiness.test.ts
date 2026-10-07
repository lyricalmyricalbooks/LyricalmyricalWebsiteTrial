import { describe, it, expect } from "vitest";
import { launchReadiness, readinessProgress, readinessSummary } from "./launchReadiness";

const goodSettings = {
  payments: { testMode: false, stripe: { connected: true, publicKey: "pk_live_" + "a".repeat(24), secretKeyStored: true } },
  policies: { shipping: "x", returns: "x", privacy: "x", terms: "x" },
  taxes: { rates: [{ country: "CA", rate: 13 }] },
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
    expect(status(items, "tax")).toBe("warn");
    expect(readinessSummary(items)).toBe("block");
  });

  it("names incomplete books and ignores drafts", () => {
    const items = launchReadiness({ settings: goodSettings, books: [goodBook, { title: "No price", retailPrice: 0, photos: [{}], description: "d" }, { title: "Draft", status: "draft" }], shippingProfiles: [{}], emailLog: [{ status: "sent" }], orders: [] });
    const books = items.find(i => i.id === "books")!;
    expect(books.status).toBe("warn");
    expect(books.detail).toBe("No price");
  });

  it("warns in sandbox mode; a missing test secret key blocks (no fallback in test mode)", () => {
    const items = launchReadiness({ settings: { ...goodSettings, payments: { testMode: true, stripe: { connected: true, testPublicKey: "pk_test_" + "a".repeat(24) } } }, books: [goodBook], shippingProfiles: [{}], emailLog: [{ status: "sent" }], orders: [] });
    expect(status(items, "payments")).toBe("warn");
    expect(status(items, "stripe-secret")).toBe("block");
  });
  it("only warns when live mode has no secret key here (the Functions secret may cover it)", () => {
    const items = launchReadiness({ settings: { ...goodSettings, payments: { stripe: { connected: true, publicKey: "pk_live_" + "a".repeat(24) } } }, books: [goodBook], shippingProfiles: [{}], emailLog: [{ status: "sent" }], orders: [] });
    expect(status(items, "stripe-secret")).toBe("warn");
  });
});

describe("readinessProgress", () => {
  it("counts green checks and lists the open ones, blocking first", () => {
    const items = launchReadiness({ settings: { ...goodSettings, policies: {} }, books: [goodBook], shippingProfiles: [], emailLog: [{ status: "failed", error: "x" }], orders: [] });
    const p = readinessProgress(items);
    expect(p.total).toBe(items.length);
    expect(p.done + p.open.length).toBe(p.total);
    expect(p.completed.every(i => i.status === "ok")).toBe(true);
    expect(p.open[0].status).toBe("block");
    expect(p.open.map(i => i.id)).toEqual(expect.arrayContaining(["shipping", "policies", "email", "first-sale"]));
  });
  it("is complete when everything is green", () => {
    const items = launchReadiness({ settings: goodSettings, books: [goodBook], shippingProfiles: [{}], emailLog: [{ status: "sent" }], orders: [{ paymentStatus: "paid" }] });
    expect(readinessProgress(items)).toMatchObject({ done: items.length, total: items.length, open: [] });
  });
});

describe("launch readiness: test-only email sender", () => {
  it("does not call Resend's onboarding sender 'working'", () => {
    const items = launchReadiness({ settings: {}, books: [], shippingProfiles: [], orders: [], emailLog: [{ status: "sent", from: "onboarding@resend.dev" }] });
    const email = items.find(i => i.id === "email")!;
    expect(email.status).toBe("block");
    expect(email.label).toMatch(/only reach you/);
  });
});
