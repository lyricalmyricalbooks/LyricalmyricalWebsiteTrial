import type { ReactNode } from "react";
import { CreditCard } from "lucide-react";
import { getCopy } from "./storeCopy";
import { regionProps, regionVisible } from "./storefrontRegions";

/** Payment fields must live outside the radio label: label activation and
 * preventDefault handlers interfere with Stripe's own interactive iframe. */
export function StripePaymentSection({ design, selected, inline, canUseHostedFallback, busy, onSelect, onHostedFallback, children }: {
  design: any;
  selected: boolean;
  inline: boolean;
  canUseHostedFallback: boolean;
  busy: boolean;
  onSelect: () => void;
  onHostedFallback: () => void;
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
            {brands.map((brand, index) => <span key={index} className="rounded border border-slate-300 bg-white px-1.5 py-1 text-[9px] font-bold text-slate-600">{brand}</span>)}
          </div>
        )}
      </div>
      {selected && (
        <div className="border-t border-slate-200 px-4 py-4">
          {inline ? children : regionVisible(design, "stripePaymentHelp") && (
            <div {...regionProps("stripePaymentHelp")} className="py-3 text-center">
              <CreditCard aria-hidden="true" size={34} strokeWidth={1.4} className="mx-auto mb-3 text-slate-400" />
              <p className="text-sm leading-6 text-slate-600">{c("coStripeNote")}</p>
            </div>
          )}
          {canUseHostedFallback && (
            <div {...regionProps("stripePaymentRecovery")} className="mt-3">
              <p className="mb-3 text-sm leading-6 text-slate-600">{c("coStripeFallbackNote")}</p>
              <button type="button" disabled={busy} onClick={onHostedFallback} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
                {c("coStripeHostedFallback")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
