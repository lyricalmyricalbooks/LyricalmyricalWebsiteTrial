import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ adminApi: { getFulfillmentOrders: vi.fn(async () => [{ id: "default" }]) } }));

import { getOrdersCached, invalidateOrders, peekOrders, setOrdersLoader, ORDERS_CACHE_MS } from "./ordersCache";

afterEach(() => setOrdersLoader());

describe("ordersCache", () => {
  it("shares one in-flight load and reuses it for a minute", async () => {
    const load = vi.fn(async () => [{ id: "a" }]);
    setOrdersLoader(load);
    const [x, y] = await Promise.all([getOrdersCached(), getOrdersCached()]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(x).toBe(y);
    await getOrdersCached();
    expect(load).toHaveBeenCalledTimes(1);
    await getOrdersCached({ now: Date.now() + ORDERS_CACHE_MS + 1 });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("force and invalidate load again", async () => {
    const load = vi.fn(async () => [{ id: "a" }]);
    setOrdersLoader(load);
    await getOrdersCached();
    await getOrdersCached({ force: true });
    expect(load).toHaveBeenCalledTimes(2);
    invalidateOrders();
    expect(peekOrders()).toBeNull();
    await getOrdersCached();
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("an older answer never overwrites a newer one, and failures are not cached", async () => {
    let resolveSlow: (v: any[]) => void = () => {};
    const slow = new Promise<any[]>((r) => { resolveSlow = r; });
    const load = vi.fn().mockReturnValueOnce(slow).mockResolvedValueOnce([{ id: "new" }]).mockRejectedValueOnce(new Error("x"));
    setOrdersLoader(load);
    const first = getOrdersCached();
    await getOrdersCached({ force: true });
    resolveSlow([{ id: "old" }]);
    await first;
    expect(peekOrders()).toEqual([{ id: "new" }]);
    invalidateOrders();
    await expect(getOrdersCached()).rejects.toThrow("x");
    expect(peekOrders()).toBeNull();
  });

  it("uses the paginated fulfillment loader by default", async () => {
    expect(await getOrdersCached({ force: true })).toEqual([{ id: "default" }]);
  });
});
