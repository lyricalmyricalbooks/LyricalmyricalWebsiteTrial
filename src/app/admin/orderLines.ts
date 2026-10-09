// How admin order views describe the newer kinds of order line: paid add-ons (signed copy,
// inscription, gift wrap), box sets and their books, gift cards and the free gift, plus the
// automatic-discount label and gift-card payments. Pure, tested; shared by Order detail, the
// packing checklist, packing slips / pick lists and the Orders CSV.

const money = (n: any) => `CA$${(Number(n) || 0).toFixed(2)}`;

/** "Signed copy" / "Personal inscription: “For Sam, love Mum”" — one entry per add-on. */
export function addOnLines(item: any): string[] {
  return (Array.isArray(item?.addOns) ? item.addOns : [])
    .filter((a: any) => a && a.label)
    .map((a: any) => (a.text ? `${a.label}: “${a.text}”` : String(a.label)));
}

/** Books inside one set, e.g. "2 × Title A, 1 × Title B (Hardcover)". */
export function bundlePartsText(item: any): string {
  if (!Array.isArray(item?.components) || !item.components.length) return "";
  return item.components
    .filter((p: any) => p)
    .map((p: any) => `${Math.max(1, Number(p.quantity) || 1)} × ${p.title || p.id}${p.variantName ? ` (${p.variantName})` : ""}`)
    .join(", ");
}

export const isGiftCardLine = (item: any) => item?.giftCard === true;
export const isFreeGiftLine = (item: any) => item?.promoGift === true;

/** "Gift card for sam@x.com" (or the buyer's own email when no recipient was given). */
export function giftCardLineText(item: any, order?: any): string {
  if (!isGiftCardLine(item)) return "";
  const d = item.giftCardDetails || {};
  const to = d.recipientEmail || order?.customer?.email || "";
  const name = d.recipientName ? `${d.recipientName}${to ? ` <${to}>` : ""}` : to;
  return name ? `Gift card for ${name} — emailed, nothing to ship` : "Gift card — emailed, nothing to ship";
}

/** Every extra line of detail to print under an order line, in reading order. */
export function lineDetails(item: any, order?: any): string[] {
  const out: string[] = [];
  if (isFreeGiftLine(item)) out.push("Free gift");
  const parts = bundlePartsText(item);
  if (parts) out.push(`Includes: ${parts}${Number(item?.quantity) > 1 ? " (per set)" : ""}`);
  for (const addOn of addOnLines(item)) out.push(`Add-on: ${addOn}`);
  const gift = giftCardLineText(item, order);
  if (gift) out.push(gift);
  return out;
}

/** "SPRING25" for a code; the shopper-facing title for an automatic offer. */
export function discountLabel(order: any): string {
  const d = order?.appliedDiscount;
  if (!d) return "";
  if (d.automatic || (!d.code && d.title)) return d.title ? `${d.title} (automatic)` : "Automatic offer";
  return String(d.code || "");
}

export const giftCardPaid = (order: any) => Math.max(0, Number(order?.giftCardAmount) || 0);

export type IssuedCard = { id: string; last4: string; minor: number; recipientEmail?: string; lineIndex?: number };
export function issuedGiftCards(order: any): IssuedCard[] {
  return (Array.isArray(order?.giftCardsIssued) ? order.giftCardsIssued : []).filter((c: any) => c && c.id);
}

/** A gift card payment arrived but a card could no longer cover its part: order not marked paid. */
export const giftCardConflictOpen = (order: any) => !!order?.giftCardConflict && !order.giftCardConflict.resolvedAt && order.paymentStatus !== "paid";

/** One CSV-friendly summary of the special lines ("Box Set: Includes …; Book: Add-on: Signed copy"). */
export function lineDetailsSummary(order: any): string {
  return (Array.isArray(order?.items) ? order.items : [])
    .map((item: any) => {
      const details = lineDetails(item, order);
      return details.length ? `${item.title || item.id}: ${details.join("; ")}` : "";
    })
    .filter(Boolean)
    .join(" | ");
}

export { money as cad };
