import { cleanTrackingLink } from "../lib/tracking";
// Publisher workflow state is private; public order/payment records remain authoritative.
export const WORK_QUEUES = ["Needs attention", "Ready to pack", "Ready to ship", "Ready for pickup", "Ready for local delivery", "In transit", "Completed", "Unpaid", "All orders"];
const terminal = (o: any) => o.status === "cancelled" || ["refunded", "refund_pending"].includes(o.paymentStatus) || ["cancelled", "refunded"].includes(o.fulfillmentStatus);
// Firestore does not guarantee map key order. Compare the address fields that
// drive shipping in a fixed order so equivalent addresses do not look stale.
export const addressKey = (o: any) => {
 const address = o.customer?.address || {};
 return JSON.stringify(["street", "city", "state", "zip", "country"].map(key => String(address[key] || "").trim()));
};
export const packingKey = (o: any) => JSON.stringify((o.items || []).map((i: any) => [i.id || i.bookId || i.title, i.variantId || i.variant || "", i.quantity]));
export function addressIssues(o: any): string[] {
 const a = o.customer?.address || {};
 const issues: string[] = [];
 if (![a.street, a.city, a.state, a.zip, a.country].every(v => String(v || "").trim())) issues.push("Complete the street, city, province/state, postal code and country.");
 const country = String(a.country || "").trim().toUpperCase();
 const ca = ["CA", "CANADA"].includes(country);
 const us = ["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"].includes(country);
 const province = String(a.state || "").trim().toUpperCase();
 const canadian = /^(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|ONTARIO|QUEBEC|BRITISH COLUMBIA|ALBERTA|MANITOBA|SASKATCHEWAN|NOVA SCOTIA|NEW BRUNSWICK|NEWFOUNDLAND AND LABRADOR|PRINCE EDWARD ISLAND|YUKON|NUNAVUT|NORTHWEST TERRITORIES)$/.test(province);
 const postal = String(a.zip || "").replace(/\s/g, "").toUpperCase();
 if (us && (canadian || /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(postal))) issues.push("The country conflicts with a Canadian province or postal code. Correct the address with the customer.");
 if (ca && (!canadian || !/^[ABCEGHJ-NPRSTVXY]\d[A-Z]\d[A-Z]\d$/.test(postal))) issues.push("Check the Canadian province and postal code.");
 if (us && !/^\d{5}(-\d{4})?$/.test(postal)) issues.push("Check the US ZIP code.");
 if (o.addressVerified === false) issues.push(o.addressError || "Postal verification failed. Confirm the address with the customer.");
 return issues;
}
export const isDigitalItem = (i: any) => i?.digital === true || i?.isDigital === true || /digital|e-book|ebook|epub|pdf|audiobook/.test(String(i.format || "").toLowerCase());
export const physicalItems = (o: any) => (o.items || []).filter((i: any) => !isDigitalItem(i));
export const fulfillmentMethod = (o: any) => ["pickup", "local_delivery"].includes(o.fulfillmentSelection?.method) ? o.fulfillmentSelection.method : "shipping";
export function queueOf(o: any): string {
 if (terminal(o)) return "Completed";
 if (o.paymentStatus !== "paid") return "Unpaid";
 if (o.items?.length && !physicalItems(o).length) return "Completed";
 const method = fulfillmentMethod(o);
 if (["delivered", "collected"].includes(o.fulfillmentStatus)) return "Completed";
 if (o.fulfillmentStatus === "out_for_delivery" || (method === "shipping" && o.fulfillmentStatus === "shipped") || o.status === "completed") return "In transit";
 if (o.fulfillmentStatus === "ready_for_pickup") return "Ready for pickup";
 if (o.fulfillmentStatus === "ready_for_delivery") return "Ready for local delivery";
 const needsAddressReview = method !== "pickup" && (addressIssues(o).length || o.operations?.addressReviewed !== addressKey(o));
 if (!o.items?.length || o.isTest || o.operations?.hold || needsAddressReview) return "Needs attention";
 if (o.operations?.packed !== packingKey(o)) return "Ready to pack";
 return method === "pickup" ? "Ready for pickup" : method === "local_delivery" ? "Ready for local delivery" : "Ready to ship";
}
export function dispatchProblem(o: any): string {
 if (o.isTest) return "Test orders cannot be fulfilled.";
 if (terminal(o) || o.paymentStatus !== "paid") return "Only active paid orders can be dispatched.";
 const q = queueOf(o);
 if (fulfillmentMethod(o) !== "shipping") return "Local pickup and delivery orders cannot use carrier dispatch.";
 if (q === "In transit" || q === "Completed") return "This order has already been dispatched.";
 if (o.operations?.hold) return `Order on hold: ${o.operations.hold}`;
 if (addressIssues(o).length || o.operations?.addressReviewed !== addressKey(o)) return "Review and confirm the shipping address first.";
 if (o.operations?.packed !== packingKey(o)) return "Complete the packing checklist first.";
 return "";
}
// Carrier, tracking number and optional tracking link typed by the publisher
// (for parcels sent without a Shippo label). The link replaces the built-in
// carrier page in emails, the customer account and order tracking.
export function trackingFields(payload: any) {
 const trackingCarrier = String(payload?.trackingCarrier || "").trim().slice(0, 80);
 const trackingNumber = String(payload?.trackingNumber || "").trim().slice(0, 100);
 if (!trackingCarrier || !trackingNumber) throw new Error("Enter the carrier and tracking number.");
 const raw = String(payload?.trackingUrl || "").trim();
 const trackingUrl = cleanTrackingLink(raw);
 if (raw && !trackingUrl) throw new Error("The tracking link must start with https://");
 return { trackingCarrier, trackingNumber, trackingUrl };
}
// The checkout saves live carrier choices as "<provider> <service>" (e.g.
// "Canada Post Expedited Parcel"); label rates name only the service.
const serviceName = (name: unknown) => String(name || "").toLowerCase().replace(/^\s*canada post\s*/, "").replace(/[^a-z0-9]+/g, " ").trim();
export function matchesCustomerService(rateName: unknown, shippingMethod: unknown): boolean {
 const rate = serviceName(rateName);
 const chosen = serviceName(shippingMethod);
 return !!rate && !!chosen && rate === chosen;
}
// Shipped parcels still not delivered after this many days get flagged so lost ones are chased early.
export const OVERDUE_TRANSIT_DAYS = 14;
export function daysInTransit(o: any, now: number = Date.now()): number | null {
 if (fulfillmentMethod(o) !== "shipping" || queueOf(o) !== "In transit") return null;
 const shipped = Date.parse(o.shippedAt || "");
 if (!Number.isFinite(shipped)) return null;
 return Math.max(0, Math.floor((now - shipped) / 86400000));
}
export const isOverdueInTransit = (o: any, now?: number) => (daysInTransit(o, now) ?? 0) >= OVERDUE_TRANSIT_DAYS;
// Default parcel weight for the label dialog: catalog weights saved on the order
// (grams per copy) plus packaging. Copies without a weight count as 1.5 lb (680 g).
export const PACKAGING_GRAMS = 150;
export function suggestedParcelWeightLb(o: any): string {
 const grams = physicalItems(o).reduce((sum: number, item: any) => {
  const each = Number(item.weightGrams);
  return sum + (Number.isFinite(each) && each > 0 ? each : 680) * Math.max(1, Number(item.quantity || 1));
 }, 0);
 if (!grams) return "1.5";
 return Math.max(0.1, (grams + PACKAGING_GRAMS) / 453.592).toFixed(1);
}
export function buildPickList(orders: any[]) {
 const items = new Map<string, any>();
 for (const o of orders) for (const i of physicalItems(o)) {
  const key = JSON.stringify([i.id || i.bookId || i.title, i.variantId || i.variant || "", i.sku || ""]);
  const existing = items.get(key);
  if (existing) existing.quantity += Number(i.quantity || 0);
  else items.set(key, { ...i, quantity: Number(i.quantity || 0) });
 }
 return [...items.values()];
}

