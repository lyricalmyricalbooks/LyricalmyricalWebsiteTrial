// Pure return transitions. Stock and refunds stay in the verified refund path.
const fail = message => { const error = new Error(message); error.status = 409; throw error; };
function physicalLines(order) {
  return (order.items || []).map((item, index) => ({ ...item, index })).filter(item => !item.digital && !item.isDigital && !/digital|ebook|e-book|pdf/i.test(String(item.format || item.variantName || "")));
}
function returnTransition(order, current, action, input, now, actor) {
  if (!["approved", "rejected", "received", "inspected"].includes(action)) fail("Invalid return action.");
  if (order.customerRequest?.type !== "return") fail("This order has no return request.");
  if (order.paymentStatus !== "paid") fail("Only paid orders can progress through a return.");
  if (order.refundRequest) fail("A refund has already been requested. Reconcile it before changing the return.");
  const state = current?.state || "requested";
  if (action === state) return current;
  const next = { ...(current || {}), state: action, updatedAt: now, actor };
  if (action === "approved" && state === "requested") {
    if (!physicalLines(order).length) fail("This order has no physical books to return. Use the refund workflow instead.");
    const instructions = String(input.instructions || "").trim();
    if (!instructions || instructions.length > 3000) fail("Enter return instructions (up to 3000 characters).");
    return { ...next, instructions, approvedAt: now };
  }
  if (action === "rejected" && state === "requested") {
    const instructions = String(input.instructions || "").trim();
    if (!instructions || instructions.length > 3000) fail("Explain the decision to the customer.");
    return { ...next, instructions, rejectedAt: now };
  }
  if (action === "received" && state === "approved") return { ...next, receivedAt: now };
  if (action === "inspected" && state === "received") {
    const lines = physicalLines(order);
    if (!Array.isArray(input.inspection) || input.inspection.length !== lines.length) fail("Inspect every physical order line before a full-order refund.");
    const inspection = lines.map(item => {
      const rows = input.inspection.filter(row => row?.index === item.index);
      const row = rows[0];
      if (rows.length !== 1 || !["resellable", "damaged", "mixed"].includes(row?.condition) || row.quantity !== Number(item.quantity)) fail("Confirm receipt of the full ordered quantity and select each line’s condition. Partial returns require a separate provider refund.");
      const restockQuantity = row.condition === "resellable" ? row.quantity : row.condition === "damaged" ? 0 : row.restockQuantity;
      if (!Number.isInteger(restockQuantity) || restockQuantity < 0 || restockQuantity > row.quantity) fail("Enter how many inspected copies can be resold, between zero and the received quantity.");
      return { index: item.index, id: item.id, variantId: item.variantId || null, quantity: row.quantity, condition: row.condition, restockQuantity };
    });
    return { ...next, inspectedAt: now, inspection };
  }
  fail("The return changed or this step is out of order. Refresh the order.");
}
function publicReturn(current) {
  return Object.fromEntries(["state", "instructions", "approvedAt", "rejectedAt", "receivedAt", "inspectedAt", "updatedAt"].filter(key => current?.[key] !== undefined).map(key => [key, current[key]]));
}
function returnRestockItems(order, returnCase) {
  if (order.returnProgress?.state === "rejected" || (!order.returnProgress && !(order.customerRequest?.type === "return" && order.customerRequest.status === "open"))) return order.items || [];
  if (returnCase?.state !== "inspected") return [];
  return (returnCase.inspection || []).map(row => ({ id: row.id, variantId: row.variantId, quantity: row.restockQuantity ?? (row.condition === "resellable" ? row.quantity : 0) })).filter(row => row.quantity > 0);
}
module.exports = { physicalLines, returnTransition, publicReturn, returnRestockItems };
