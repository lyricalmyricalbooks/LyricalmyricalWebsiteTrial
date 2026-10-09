import { buildPickList, physicalItems } from "./fulfillment";
import { lineDetails } from "./orderLines";
const escape = (v: any) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
// Add-ons (sign / inscribe / wrap) and the books inside a box set print under their line, in bold
// enough to notice: the packer has to act on them.
const details = (i: any, o?: any) => {
 const tally = Object.entries(i.addOnCounts || {}).map(([label, n]) => `Add-on: ${label} × ${n}`);
 const lines = [...lineDetails(i, o), ...tally];
 return lines.length ? `<ul class="extras">${lines.map(l => `<li>${escape(l)}</li>`).join("")}</ul>` : "";
};
const rows = (items: any[], o?: any) => items.map(i => `<tr><td>${escape(i.title)}${i.variantName ? ` — ${escape(i.variantName)}` : ""}${i.sku ? `<br><small>${escape(i.sku)}</small>` : ""}${details(i, o)}</td><td>${escape(i.quantity)}</td><td>&#9633;</td></tr>`).join("");
export function printOrders(orders: any[], pickList = false) {
 const table = (items: any[], o?: any) => `<table><thead><tr><th>Book / edition</th><th>Quantity</th><th>Packed</th></tr></thead><tbody>${rows(items, o)}</tbody></table>`;
 const body = pickList ? `<section><h1>Publisher pick list</h1><p>${orders.length} orders</p>${table(buildPickList(orders))}<p>Orders: ${orders.map(o => escape(o.orderId || o.id)).join(", ")}</p></section>` : orders.map(o => {
  const a = o.customer?.address || {};
  return `<section><h1>Packing slip</h1><h2>${escape(o.orderId || o.id)}</h2><p>${escape(o.customer?.name)}<br>${escape([a.street, a.unit].filter(Boolean).join(", "))}<br>${escape(a.city)}, ${escape(a.state)} ${escape(a.zip)}<br>${escape(a.country)}</p>${table(physicalItems(o), o)}${o.orderNote ? `<p>Customer note: ${escape(o.orderNote)}</p>` : ""}</section>`;
 }).join("");
 const frame = document.createElement("iframe");
 frame.title = "Packing documents"; frame.style.cssText = "position:fixed;width:1px;height:1px;left:-9999px";
 frame.onload = () => { frame.contentWindow?.addEventListener("afterprint", () => frame.remove(), { once: true }); frame.contentWindow?.focus(); frame.contentWindow?.print(); };
 frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>Packing documents</title><style>body{font:16px Arial;margin:30px;color:#000}table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;border-bottom:1px solid #aaa}.extras{margin:6px 0 0;padding-left:18px;font-weight:bold}section{break-after:page}section:last-child{break-after:auto}</style></head><body>${body}</body></html>`;
 document.body.appendChild(frame);
}
