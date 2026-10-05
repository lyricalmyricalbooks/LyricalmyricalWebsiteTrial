import type { LocalFulfillmentQuote } from './localFulfillment';
import { regionProps } from './storefrontRegions';

export type FulfillmentSelection = { method: 'shipping' | 'pickup' | 'local_delivery'; optionId: string };
type ShippingChoice = { id: string; name: string; price: number; deliveryDays?: string; carrierEstimate?: boolean; durationTerms?: string };
type Words = { group?: string; shipping: string; pickup: string; local_delivery: string; review: string; free: string; unavailable?: string; addressPrompt?: string; loading?: string; instructions?: string; hours?: string; estimate?: string; carrierTransit?: string; carrierUnavailable?: string; deliveryDays?: string };
const transitDays = (c: ShippingChoice) => { const n = Number(c.deliveryDays); return c.deliveryDays && Number.isFinite(n) ? n : Infinity; };
/** Best options first: cheapest, then quickest; an option with no delivery estimate goes after one that has it. */
export const bestFirst = (a: ShippingChoice, b: ShippingChoice) => (a.price - b.price) || (transitDays(a) - transitDays(b)) || 0;
export function FulfillmentMethodPicker({ method, optionId, onSelect, shippingQuotes, localQuotes, words, formatPrice, loading = false, availableMethods = ['shipping', 'pickup', 'local_delivery'] }: {
  method: FulfillmentSelection['method']; optionId: string; onSelect: (value: FulfillmentSelection) => void;
  shippingQuotes: ShippingChoice[]; localQuotes: LocalFulfillmentQuote[]; words: Words;
  formatPrice: (amount: number) => string; loading?: boolean; availableMethods?: FulfillmentSelection['method'][];
}) {
  const choices = method === 'shipping' ? [...shippingQuotes].sort(bestFirst) : localQuotes.filter(quote => quote.method === method);
  return <div {...regionProps('checkoutFulfillment')} className="space-y-4">
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label={words.group}>
      {availableMethods.map(value =>
        <button key={value} type="button" data-method={value} aria-pressed={method === value}
          onClick={() => onSelect({ method: value, optionId: '' })}
          className={`rounded-lg border px-4 py-3 text-sm font-semibold text-left ${method === value ? 'border-[color:var(--accent)] bg-white text-slate-950' : 'border-slate-300 bg-slate-50 text-slate-700'}`}>{words[value]}</button>)}
    </div>
    {loading && method === 'shipping' ? <p className="text-sm text-slate-600" role="status">{words.loading}</p> : choices.length ?
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
        {choices.map((choice, index) => <label key={choice.id} className={`flex cursor-pointer items-start justify-between gap-4 px-4 py-4 ${index ? 'border-t border-slate-200' : ''}`}>
          <span className="flex items-start gap-3">
            <input type="radio" name="fulfillment-option" value={choice.id} checked={optionId === choice.id}
              onChange={() => onSelect({ method, optionId: choice.id })} className="mt-1 h-4 w-4 accent-[color:var(--accent)]" />
            <span className="space-y-1 text-sm text-slate-700">
              <strong className="block text-slate-950">{choice.name}</strong>
              {'address' in choice && choice.address && <span className="block">{choice.address.street}, {choice.address.city}, {choice.address.state} {choice.address.zip}</span>}
              {'hours' in choice && choice.hours && <span className="block">{words.hours} {choice.hours}</span>}
              {'instructions' in choice && choice.instructions && <span className="block whitespace-pre-wrap">{words.instructions} {choice.instructions}</span>}
              {'estimate' in choice && choice.estimate && <span className="block">{words.estimate} {choice.estimate}</span>}
              {method === 'shipping' && 'price' in choice && (() => {
                const days = (choice as ShippingChoice).deliveryDays;
                const template = (choice as ShippingChoice).carrierEstimate ? words.carrierTransit : words.deliveryDays;
                if (days) return template ? <span className="block" data-delivery-estimate>{template.replace('{days}', days)}</span> : null;
                return (choice as ShippingChoice).carrierEstimate && !(choice as ShippingChoice).durationTerms && words.carrierUnavailable
                  ? <span className="block" data-delivery-estimate>{words.carrierUnavailable}</span> : null;
              })()}
              {'durationTerms' in choice && choice.durationTerms && <span className="block">{choice.durationTerms}</span>}
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-slate-950">{choice.price === 0 ? words.free : formatPrice(choice.price)}</span>
        </label>)}
      </div> : <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">{method === 'local_delivery' ? words.addressPrompt || words.unavailable : words.unavailable}</p>}
    {!optionId && <p role="status" className="text-sm font-medium text-amber-700">{words.review}</p>}
  </div>;
}
