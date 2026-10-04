import { useEffect, useState } from 'react';
import { adminApi } from './api';
import type { LocalFulfillmentConfig } from '../features/site/types';
import { quoteLocalFulfillment, validateLocalFulfillment } from '../features/site/localFulfillment';
import { PrimaryButton, SecondaryButton, DestructiveButton, SectionCard, TextField, TextArea, Toggle } from './riso/components';

export function useLocalFulfillmentDraft(load = true) {
  const [config, setConfig] = useState<LocalFulfillmentConfig>({ enabled: false, pickupLocations: [], deliveryZones: [] });
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!load) return;
    let active = true;
    adminApi.getSettings().then(settings => {
      if (!active) return;
      const raw = settings.localFulfillment ?? { enabled: false, pickupLocations: [], deliveryZones: [] };
      const text = (value: unknown) => typeof value === 'string' ? value : '';
      const records = (value: unknown) => Array.isArray(value) ? value : [];
      const common = (record: any) => ({ ...record, id: text(record?.id) || crypto.randomUUID(), enabled: record?.enabled === true, name: text(record?.name), price: typeof record?.price === 'number' ? record.price : NaN, instructions: text(record?.instructions), estimate: text(record?.estimate) });
      setConfig({ enabled: raw.enabled === true, pickupLocations: records(raw.pickupLocations).map(record => ({ ...common(record), hours: text(record?.hours), address: Object.fromEntries(['street', 'city', 'state', 'zip', 'country'].map(field => [field, text(record?.address?.[field])])) as any })), deliveryZones: records(raw.deliveryZones).map(record => ({ ...common(record), minimumSubtotal: typeof record?.minimumSubtotal === 'number' ? (record as any).minimumSubtotal : NaN, postalPrefixes: records(record?.postalPrefixes).map(text), postalCodes: records(record?.postalCodes).map(text) })) });
      if (validateLocalFulfillment(raw).length) setNotice('Saved local configuration needs repair. Review all fields before saving.');
      setLoaded(true);
    }).catch(() => { if (active) setNotice('Could not load local fulfillment. Reload before saving.'); });
    return () => { active = false; };
  }, [load]);
  return { config, setConfig, notice, setNotice, busy, setBusy, loaded };
}

export function LocalFulfillmentSettings({ draft }: { draft?: ReturnType<typeof useLocalFulfillmentDraft> } = {}) {
  const localDraft = useLocalFulfillmentDraft(!draft);
  const { config, setConfig, notice, setNotice, busy, setBusy, loaded } = draft ?? localDraft;
  const [postal, setPostal] = useState('');
  const [subtotal, setSubtotal] = useState('0');
  const errors = validateLocalFulfillment(config);
  function patch(kind: 'pickupLocations' | 'deliveryZones', id: string, change: any) {
    setConfig(current => ({ ...current, [kind]: current[kind].map(record => record.id === id ? { ...record, ...change } : record) }));
  }
  function move(kind: 'pickupLocations' | 'deliveryZones', index: number, offset: number) {
    setConfig(current => { const records = [...current[kind]]; const target = index + offset; if (target < 0 || target >= records.length) return current; [records[index], records[target]] = [records[target], records[index]]; return { ...current, [kind]: records }; });
  }
  const quotes = quoteLocalFulfillment(config, { country: 'CA', zip: postal }, subtotal === '' ? NaN : Number(subtotal), [{ quantity: 1 }]);
  return <div className="rp-stack">
    <fieldset disabled={!loaded || busy} style={{ border: 0, padding: 0, margin: 0 }} className="rp-stack">
    <SectionCard title="Pickup & local delivery" description="Configure real collection locations and Canadian postal service areas. Services start disabled. Public names, instructions, hours and estimates are editable here; storefront labels and presentation are in Studio.">
      <Toggle label="Enable local fulfillment" checked={config.enabled} onChange={enabled => setConfig({ ...config, enabled })} />
      <p className="rp-hint">Delivery minimums use discounted physical merchandise before delivery and tax. Digital books never qualify. Prefixes cover an entire three-character postal area; exact codes cover one complete postal code.</p>
      <SecondaryButton onClick={() => setConfig({ ...config, pickupLocations: [...config.pickupLocations, { id: crypto.randomUUID(), enabled: false, name: '', price: 0, address: { street: '', city: '', state: '', zip: '', country: 'Canada' }, instructions: '', hours: '', estimate: '' }] })}>Add pickup location</SecondaryButton>
      <SecondaryButton onClick={() => setConfig({ ...config, deliveryZones: [...config.deliveryZones, { id: crypto.randomUUID(), enabled: false, name: '', price: 0, minimumSubtotal: 0, postalPrefixes: [], postalCodes: [], instructions: '', estimate: '' }] })}>Add delivery zone</SecondaryButton>
    </SectionCard>
    {(['pickupLocations', 'deliveryZones'] as const).map(kind => config[kind].map((record, index) => <SectionCard key={record.id} title={record.name || (kind === 'pickupLocations' ? 'New pickup location' : 'New delivery zone')}>
      <div className="rp-stack">
        <Toggle label="Enabled" checked={record.enabled} onChange={enabled => patch(kind, record.id, { enabled })} />
        <TextField label="Public name" value={record.name} onChange={e => patch(kind, record.id, { name: e.target.value })} />
        <TextField label="Fee (CAD)" type="number" min={0} step="0.01" value={Number.isFinite(record.price) ? record.price : ''} onChange={e => patch(kind, record.id, { price: e.target.value === '' ? NaN : Number(e.target.value) })} />
        {kind === 'pickupLocations' ? <>
          {(['street', 'city', 'state', 'zip', 'country'] as const).map(field => <TextField key={field} label={{ street: 'Street address', city: 'City', state: 'Province (Canadian code or name)', zip: 'Postal code', country: 'Country (Canada)' }[field]} value={(record as any).address[field]} onChange={e => patch(kind, record.id, { address: { ...(record as any).address, [field]: e.target.value } })} />)}
          <TextArea label="Public opening hours" value={(record as any).hours ?? ''} onChange={e => patch(kind, record.id, { hours: e.target.value })} />
        </> : <>
          <TextField label="Minimum physical merchandise subtotal (CAD)" type="number" min={0} step="0.01" value={Number.isFinite((record as any).minimumSubtotal) ? (record as any).minimumSubtotal : ''} onChange={e => patch(kind, record.id, { minimumSubtotal: e.target.value === '' ? NaN : Number(e.target.value) })} />
          <TextArea label="Postal prefixes" hint="Three characters each, separated by commas or new lines." value={(record as any).postalPrefixes.join(', ')} onChange={e => patch(kind, record.id, { postalPrefixes: e.target.value.split(/[,\n]/).map(v => v.trim()).filter(Boolean) })} />
          <TextArea label="Exact postal codes" hint="Six characters each; spaces are accepted. Separated by commas or new lines." value={(record as any).postalCodes.join(', ')} onChange={e => patch(kind, record.id, { postalCodes: e.target.value.split(/[,\n]/).map(v => v.trim()).filter(Boolean) })} />
        </>}
        <TextArea label="Public instructions" value={record.instructions ?? ''} onChange={e => patch(kind, record.id, { instructions: e.target.value })} />
        <TextField label={kind === 'pickupLocations' ? 'Public preparation estimate' : 'Public delivery estimate'} value={record.estimate ?? ''} onChange={e => patch(kind, record.id, { estimate: e.target.value })} />
        <div className="rp-actions"><SecondaryButton disabled={index === 0} onClick={() => move(kind, index, -1)}>Move up</SecondaryButton><SecondaryButton disabled={index === config[kind].length - 1} onClick={() => move(kind, index, 1)}>Move down</SecondaryButton><DestructiveButton onClick={() => setConfig({ ...config, [kind]: config[kind].filter(item => item.id !== record.id) })}>Remove</DestructiveButton></div>
      </div>
    </SectionCard>))}
    <SectionCard title="Destination tester" description="Uses the unsaved configuration above. This is a quote preview, not a customer order.">
      <TextField label="Canadian postal code" value={postal} onChange={e => setPostal(e.target.value)} />
      <TextField label="Discounted physical merchandise subtotal (CAD)" type="number" min={0} step="0.01" value={subtotal} onChange={e => setSubtotal(e.target.value)} />
      <p role="status">{quotes.length ? quotes.map(q => `${q.name}: CAD ${q.price.toFixed(2)}`).join(' · ') : 'No eligible local options.'}</p>
    </SectionCard>
    {!!errors.length && <SectionCard title="Fix before saving"><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></SectionCard>}
    <p role="status">{notice}</p>
    <PrimaryButton disabled={!loaded || busy || errors.length > 0} onClick={async () => { setBusy(true); try { await adminApi.updateLocalFulfillment(config); setNotice('Local fulfillment saved.'); } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save local fulfillment.'); } finally { setBusy(false); } }}>Save local fulfillment</PrimaryButton>
    </fieldset>
  </div>;
}
