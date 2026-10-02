import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { FulfillmentWorkbench } from "./FulfillmentWorkbench";
import { addressKey, packingKey } from "./fulfillment";
const base = () => ({
  paymentStatus: "paid",
  status: "open",
  customer: {
    name: "Reader",
    address: {
      street: "1 Main",
      city: "Toronto",
      state: "ON",
      zip: "M6G3H1",
      country: "Canada",
    },
  },
  items: [{ id: "book", title: "Book", quantity: 2 }],
  operations: {} as any,
});
const render = (o: any, checked = new Set<number>()) =>
  renderToStaticMarkup(
    <FulfillmentWorkbench
      order={o}
      checked={checked}
      busy={false}
      onCheck={() => {}}
      onReview={() => {}}
      onCorrect={() => {}}
      onPack={() => {}}
      onLabel={() => {}}
      onDispatch={() => {}}
      onRelease={() => {}}
    />,
  );
describe("focused publisher workflow", () => {
  it("starts at the address with no premature shipping actions", () => {
    const html = render(base());
    expect(html).toContain("Confirm address");
    expect(html).not.toContain("Choose shipping label");
    expect(html).not.toContain("Preset name");
    expect(html).not.toContain("Refund");
  });
  it("makes packing the only primary action after review", () => {
    const o = base();
    o.operations.addressReviewed = addressKey(o);
    const html = render(o);
    expect(html).toContain("Confirm packed");
    expect(html).not.toContain("Confirm address</button>");
    expect(html).not.toContain("Choose shipping label");
    expect(html.match(/rp-btn-primary/g)).toHaveLength(1);
  });
  it("shows one label action and a secondary manual-carrier path", () => {
    const o = base();
    o.operations = { addressReviewed: addressKey(o), packed: packingKey(o) };
    const html = render(o);
    expect(html.match(/Choose shipping label/g)).toHaveLength(1);
    expect(html).toContain("Use my own tracking");
  });
  it("offers dispatch rather than another label purchase after purchase", () => {
    const o: any = base();
    o.operations = { addressReviewed: addressKey(o), packed: packingKey(o) };
    o.labelUrl = "https://example.com/label";
    const html = render(o);
    expect(html).toContain("Confirm dispatch");
    expect(html).not.toContain("Choose shipping label");
  });
  it("does not show address blockers or shipping prompts on cancelled orders", () => {
    const o = { ...base(), status: "cancelled", customer: {} };
    const html = render(o);
    expect(html).not.toContain("Confirm address");
    expect(html).not.toContain("Confirm dispatch");
  });
});

it("keeps purchased labels accessible on held and dispatched orders", () => {
  const reviewed = base();
  reviewed.operations = {
    addressReviewed: addressKey(reviewed),
    packed: packingKey(reviewed),
  };
  for (const patch of [
    { operations: { ...reviewed.operations, hold: "Await reply" } },
    { status: "completed", fulfillmentStatus: "shipped" },
    { status: "completed", fulfillmentStatus: "delivered" },
    { paymentStatus: "refunded" },
  ]) {
    expect(
      render({ ...reviewed, labelUrl: "https://example.com/label", ...patch }),
    ).toContain("Reprint label");
  }
});
