// Kept in parity with admin/fulfillment.ts; money-spending label operations recheck fresh records.
function labelProblem(order, operations = {}) {
 if (order.isTest || order.paymentStatus !== "paid" || ["cancelled", "completed"].includes(order.status) || ["shipped", "out_for_delivery", "delivered", "cancelled", "refunded"].includes(order.fulfillmentStatus)) return "Only active paid, undispatched production orders can buy labels.";
 if (!(order.items || []).some(i => !/e-book|epub|pdf|audiobook/.test(String(i.format || "").toLowerCase()))) return "This order has no physical books to ship.";
 if (order.labelUrl) return "A label already exists. Reprint the existing label.";
 if (operations.labelPurchasePending) return "A label purchase is pending. Check Shippo before attempting another purchase.";
 if (operations.hold) return "Release the fulfillment hold before buying a label.";
 if (operations.addressReviewed !== JSON.stringify(order.customer?.address || {})) return "Review the address before buying a label.";
 const key = JSON.stringify((order.items || []).map(i => [i.id || i.bookId || i.title, i.variantId || i.variant || "", i.quantity]));
 if (operations.packed !== key) return "Complete the packing checklist before buying a label.";
 return "";
}
module.exports = { labelProblem };
