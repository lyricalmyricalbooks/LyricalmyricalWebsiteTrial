// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, expect, it, vi } from 'vitest';
const { getSettings } = vi.hoisted(() => ({ getSettings: vi.fn() }));
vi.mock('./api', () => ({ adminApi: { getSettings, updateLocalFulfillment: vi.fn() } }));
import { LocalFulfillmentSettings, useLocalFulfillmentDraft } from './LocalFulfillmentSettings';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
beforeEach(() => { container = document.createElement('div'); document.body.replaceChildren(container); getSettings.mockReset(); });
it('blocks all configuration editing while initial settings are loading', async () => {
  getSettings.mockReturnValue(new Promise(() => {}));
  const root = createRoot(container);
  await act(async () => { root.render(<LocalFulfillmentSettings />); });
  const add = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Add pickup location')!;
  expect(add.matches(':disabled')).toBe(true);
  expect(container.querySelector<HTMLButtonElement>('[role="switch"]')!.matches(':disabled')).toBe(true);
  await act(async () => root.unmount());
});
it('repairs malformed disabled addresses without a render crash', async () => {
  getSettings.mockResolvedValue({ localFulfillment: { enabled: false, pickupLocations: [{ id: 'old', enabled: false, name: 'Old', price: 0, address: null }], deliveryZones: [] } });
  const root = createRoot(container);
  await act(async () => { root.render(<LocalFulfillmentSettings />); });
  expect(container.textContent).toContain('Street address');
  await act(async () => root.unmount());
});

it('keeps unsaved records when the parent switches Shipping views', async () => {
  getSettings.mockResolvedValue({ localFulfillment: { enabled: false, pickupLocations: [], deliveryZones: [] } });
  function ShippingViews() {
    const draft = useLocalFulfillmentDraft();
    const [local, setLocal] = useState(true);
    return <><button onClick={() => setLocal(value => !value)}>Switch view</button>{local ? <LocalFulfillmentSettings draft={draft} /> : <p>Overview</p>}</>;
  }
  const root = createRoot(container);
  await act(async () => root.render(<ShippingViews />));
  const button = (label: string) => Array.from(container.querySelectorAll('button')).find(b => b.textContent === label)!;
  await act(async () => button('Add pickup location').click());
  expect(container.textContent).toContain('New pickup location');
  await act(async () => button('Switch view').click());
  expect(container.textContent).toContain('Overview');
  await act(async () => button('Switch view').click());
  expect(container.textContent).toContain('New pickup location');
  expect(getSettings).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
});
it('does not accept edits before delayed settings arrive', async () => {
  let resolve: (value: any) => void = () => {};
  getSettings.mockReturnValue(new Promise(done => { resolve = done; }));
  const root = createRoot(container);
  await act(async () => root.render(<LocalFulfillmentSettings />));
  const add = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Add pickup location')!;
  await act(async () => add.click());
  expect(container.textContent).not.toContain('New pickup location');
  await act(async () => resolve({ localFulfillment: { enabled: false, pickupLocations: [], deliveryZones: [] } }));
  expect(add.matches(':disabled')).toBe(false);
  await act(async () => add.click());
  expect(container.textContent).toContain('New pickup location');
  await act(async () => root.unmount());
});
