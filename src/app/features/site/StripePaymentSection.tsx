import type { ReactNode } from "react";
import { getCopy } from "./storeCopy";
import { regionProps, regionVisible } from "./storefrontRegions";

/** Payment fields must live outside the radio label: label activation and
 * preventDefault handlers interfere with Stripe's own interactive iframe. */
export function StripePaymentSection({ design, selected, configured, canRetry, busy, onSelect, onRetry, children }: {
  design: any;
  selected: boolean;
  configured: boolean;
  canRetry: boolean;
  busy: boolean;
  onSelect: () => void;
  onRetry: () => void;
  children: ReactNode;
}) {
  const c = (key: string) => getCopy(design, key);
  const brands = c("coCardBrands").split(",").map(brand => brand.trim()).filter(Boolean);
  return (
    <div {...regionProps("stripePaymentPanel")}>
      <div {...regionProps("stripePaymentHeader")} className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="radio" name="payment-method" checked={selected} onChange={onSelect} disabled={busy} className="h-4 w-4 accent-[color:var(--accent)]" />
          <span className="text-sm font-medium">{c("coCard")}</span>
        </label>
        {regionVisible(design, "stripeBrands") && brands.length > 0 && (
          <div {...regionProps("stripeBrands")} className="flex flex-wrap items-center gap-1.5" aria-label={c("coCardsAria")}>
            {brands.map((brand, index) => <span key={index} className="inline-flex items-center gap-0.5 rounded border border-slate-300 bg-white px-1.5 py-1 text-[9px] font-bold text-slate-600">
              {/^apple\s*pay$/i.test(brand) ? <><AppleMark /><span className="sr-only">{brand.split(/\s+/)[0]}</span>{brand.replace(/^apple\s*/i, "")}</> : brand}
            </span>)}
          </div>
        )}
      </div>
      {selected && (
        <div className="border-t border-slate-200 px-4 py-4">
          {configured ? children : (
            <p {...regionProps("stripePaymentRecovery")} role="alert" className="py-3 text-sm leading-6">{c("coStripeConfigError")}</p>
          )}
          {canRetry && (
            <div {...regionProps("stripePaymentRecovery")} className="mt-3">
              <p className="mb-3 text-sm leading-6 text-slate-600">{c("coStripeRetryNote")}</p>
              <button type="button" disabled={busy} onClick={onRetry} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
                {c("coStripeRetry")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Apple logo for the Apple Pay badge; inherits the badge's Studio text colour. */
function AppleMark() {
  return <svg viewBox="0 0 384 512" aria-hidden="true" className="h-[10px] w-[9px]" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>;
}
