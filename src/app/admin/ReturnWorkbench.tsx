import { useState } from "react";
import toast from "react-hot-toast";
import { adminApi } from "./api";
import { SectionCard, TextArea, TextField, SelectField, PrimaryButton, SecondaryButton, ConfirmDialog } from "./riso/components";

export function ReturnWorkbench({ order, onUpdated }: { order: any; onUpdated: () => Promise<void> }) {
  const saved = order.operations?.returnCase;
  const state = order.returnProgress?.state || "requested";
  const [instructions, setInstructions] = useState(saved?.instructions || "");
  const [inspection, setInspection] = useState<Record<number, { quantity: number; condition: string; restockQuantity?: number }>>({});
  const [busy, setBusy] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const lines = (order.items || []).map((item: any, index: number) => ({ ...item, index })).filter((item: any) => !item.digital && !item.isDigital && !/digital|ebook|e-book|pdf/i.test(String(item.format || item.variantName || "")));
  const run = async (action: string) => {
    setBusy(true);
    try {
      if (action === "refund") await adminApi.refundOrder(order.id, { reason: "Customer return", restock: true });
      else await adminApi.manageReturn(order.id, action, { instructions, inspection: lines.map((item: any) => ({ index: item.index, ...inspection[item.index] })) });
      toast.success(action === "refund" ? "Refund recorded; provider status determines completion." : "Return updated.");
      await onUpdated();
    } catch (error: any) { toast.error(error.message || "Could not update return."); }
    finally { setBusy(false); }
  };
  const completeInspection = lines.length > 0 && lines.every((item: any) => inspection[item.index]?.quantity === Number(item.quantity) && ["resellable", "damaged", "mixed"].includes(inspection[item.index]?.condition) && (inspection[item.index]?.condition !== "mixed" || (Number.isInteger(inspection[item.index]?.restockQuantity) && Number(inspection[item.index]?.restockQuantity) >= 0 && Number(inspection[item.index]?.restockQuantity) <= Number(item.quantity))));
  return <SectionCard title="Customer return" description={`Status: ${state.replace(/_/g, " ")}`}>
    <div className="rp-stack">
      {order.customerRequest?.message && <blockquote className="fw-summary">{order.customerRequest.message}</blockquote>}
      <p className="rp-hint">This workflow refunds the entire order, including shipping, tax and any digital items. Partial returns require a separate provider refund. Inventory returns only for inspected, resellable physical copies.</p>
      {state === "requested" && <>
        <TextArea label="Customer-visible instructions or decision" hint="Include the return address, packing instructions, deadline and who pays postage. These appear on the secure order tracking page." maxLength={3000} value={instructions} onChange={event => setInstructions(event.target.value)} />
        <PrimaryButton disabled={busy || !instructions.trim() || !lines.length} onClick={() => run("approved")}>Approve and publish instructions</PrimaryButton>
        <SecondaryButton disabled={busy || !instructions.trim()} onClick={() => run("rejected")}>Decline with explanation</SecondaryButton>
      </>}
      {saved?.instructions && state !== "requested" && <p style={{ whiteSpace: "pre-wrap" }}>{saved.instructions}</p>}
      {state === "approved" && <PrimaryButton disabled={busy} onClick={() => run("received")}>Record parcel received</PrimaryButton>}
      {state === "received" && <>
        {lines.map((item: any) => <div key={item.index} className="rp-stack">
          <strong>{item.title}{item.variantName ? ` · ${item.variantName}` : ""} · {item.quantity} ordered</strong>
          <TextField label="Copies received" type="number" min={0} max={item.quantity} step={1} value={inspection[item.index]?.quantity ?? ""} onChange={event => setInspection(previous => ({ ...previous, [item.index]: { ...previous[item.index], condition: previous[item.index]?.condition || "", quantity: Number(event.target.value) } }))} />
          <SelectField label="Condition" value={inspection[item.index]?.condition || ""} onChange={event => setInspection(previous => ({ ...previous, [item.index]: { ...previous[item.index], quantity: previous[item.index]?.quantity ?? 0, condition: event.target.value } }))}>
            <option value="">Choose condition</option><option value="resellable">Resellable — restock on refund</option><option value="damaged">Damaged — do not restock</option><option value="mixed">Mixed condition — select resellable count</option>
          </SelectField>
          {inspection[item.index]?.condition === "mixed" && <TextField label="Resellable copies to restock" type="number" min={0} max={item.quantity} step={1} value={inspection[item.index]?.restockQuantity ?? ""} onChange={event => setInspection(previous => ({ ...previous, [item.index]: { ...previous[item.index], restockQuantity: Number(event.target.value) } }))} />}
        </div>)}
        <PrimaryButton disabled={busy || !completeInspection} onClick={() => run("inspected")}>Save full-order inspection</PrimaryButton>
      </>}
      {saved?.inspection && <ul>{saved.inspection.map((line: any) => <li key={line.index}>{order.items[line.index]?.title} · {line.quantity} · {line.restockQuantity ?? (line.condition === "resellable" ? line.quantity : 0)} to restock on refund</li>)}</ul>}
      {state === "inspected" && <PrimaryButton disabled={busy} onClick={() => setConfirmRefund(true)}>Refund and restock eligible copies</PrimaryButton>}
      {state === "refund_pending" && <p role="status">The provider is processing the refund. Inventory has already been handled; do not refund again.</p>}
      {state === "completed" && <p role="status">Refund completed. Returned inventory has been handled once.</p>}
    </div>
    <ConfirmDialog open={confirmRefund} title="Refund the full order?" message="The full payment will be refunded. Inspected resellable physical copies will be returned to inventory once; damaged copies will stay out of stock. For cash or e-Transfer, send the money back first: this action only records the manual refund." confirmLabel="Refund full order" onCancel={() => setConfirmRefund(false)} onConfirm={() => { setConfirmRefund(false); run("refund"); }} />
  </SectionCard>;
}
