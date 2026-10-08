// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { CartProvider, useCart } from "./CartContext";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// "Added ✓" on the product page is shown only when addToCart returns true, so it must
// return false when the line is already at its stock / 99-copy cap and nothing changed.
it("addToCart reports false when nothing could be added", async () => {
  localStorage.clear();
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  let cart: ReturnType<typeof useCart> | null = null;
  function Probe() { cart = useCart(); return null; }
  const root = createRoot(container);
  await act(async () => { root.render(<CartProvider><Probe /></CartProvider>); });
  const book = { id: "zine", title: "Zine", retailPrice: 10, stockLevel: 2 };
  let first = false, second = false, third = true;
  await act(async () => { first = cart!.addToCart(book, undefined, 2); });
  await act(async () => { second = cart!.addToCart(book); });
  expect(first).toBe(true);
  expect(second).toBe(false);
  expect(cart!.cart[0].quantity).toBe(2);
  await act(async () => { third = cart!.addToCart({ ...book, id: "unpriced", retailPrice: undefined }); });
  expect(third).toBe(false);
  await act(async () => root.unmount());
});
