import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

vi.mock("./OrderDetail", () => ({ OrderDetail: (p: any) => <div data-order-detail={p.orderId} /> }));
vi.mock("./Orders", () => ({ Orders: () => <div>table</div>, refreshOrdersCache: () => new Promise(() => {}), patchOrdersCache: (o: any) => [o], loadOrderSearchCatalog: () => Promise.resolve(null) }));

import { OrdersDesk } from "./OrdersDesk.tsx";

describe("OrdersDesk", () => {
  it("renders the list chrome and the full order page for the selected order", () => {
    const html = renderToStaticMarkup(<OrdersDesk selectedId="ABC" onSelect={() => {}} />);
    expect(html).toContain("Needs me");
    expect(html).toContain("Table view");
    // The right side is the real order page (Stripe sync, refunds, labels).
    expect(html).toContain('data-order-detail="ABC"');
    // The view switch has one column per tab, and the shortcuts are spelled out.
    expect(html).toContain("repeat(3, minmax(0, 1fr))");
    expect(html).toContain("Shortcuts:");
  });
});
