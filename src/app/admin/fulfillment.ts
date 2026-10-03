// Publisher workflow state is private; public order/payment records remain authoritative.
export const WORK_QUEUES = ["Needs attention", "Ready to pack", "Ready to ship", "In transit", "Completed", "Unpaid", "All orders"];
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
export const isDigitalItem = (i: any) => /e-book|epub|pdf|audiobook/.test(String(i.format || "").toLowerCase());
export const physicalItems = (o: any) => (o.items || []).filter((i: any) => !isDigitalItem(i));
export function queueOf(o: any): string {
 if (terminal(o)) return "Completed";
 if (o.paymentStatus !== "paid") return "Unpaid";
 if (o.items?.length && !physicalItems(o).length) return "Completed";
 if (o.fulfillmentStatus === "delivered") return "Completed";
 if (["shipped", "out_for_delivery"].includes(o.fulfillmentStatus) || o.status === "completed") return "In transit";
 if (!o.items?.length || o.isTest || o.operations?.hold || addressIssues(o).length || o.operations?.addressReviewed !== addressKey(o)) return "Needs attention";
 return o.operations?.packed === packingKey(o) ? "Ready to ship" : "Ready to pack";
}
export function dispatchProblem(o: any): string {
 if (o.isTest) return "Test orders cannot be fulfilled.";
 if (terminal(o) || o.paymentStatus !== "paid") return "Only active paid orders can be dispatched.";
 const q = queueOf(o);
 if (q === "In transit" || q === "Completed") return "This order has already been dispatched.";
 if (o.operations?.hold) return `Order on hold: ${o.operations.hold}`;
 if (addressIssues(o).length || o.operations?.addressReviewed !== addressKey(o)) return "Review and confirm the shipping address first.";
 if (o.operations?.packed !== packingKey(o)) return "Complete the packing checklist first.";
 return "";
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

