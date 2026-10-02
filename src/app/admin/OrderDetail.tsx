import { addressKey, addressIssues, packingKey, queueOf, dispatchProblem, isDigitalItem, physicalItems } from "./fulfillment";
import { printOrders } from "./orderPrint";
import { useState, useEffect } from "react";
import { ArrowLeft, Copy, ExternalLink, Truck, Plus } from "lucide-react";
import { adminApi } from "./api";
import toast from "react-hot-toast";
import {
  Checkbox, ConfirmDialog, Dialog, EmptyState, LoadingState, PrimaryButton, SecondaryButton, DestructiveButton,
  SectionCard, SectionHead, SelectField, StatusBadge, Tabs, TextField, type BadgeTone,
} from "./riso/components";

const getTrackingUrl = (carrier: string, trackingNum: string) => {
  const cleanCarrier = (carrier || "").trim().toLowerCase();
  const cleanNum = (trackingNum || "").trim();
  if (cleanCarrier.includes("canada post")) {
    return `https://www.canadapost-postescanada.ca/track-reperage/en#/resultList?searchKeys=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("fedex")) {
    return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${encodeURIComponent(cleanNum)}`;
  }
  if (cleanCarrier.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(cleanNum)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(carrier + " " + cleanNum)}`;
};

export function OrderDetail({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [labelRates, setLabelRates] = useState<any[]>([]);
  const [labelShipmentId, setLabelShipmentId] = useState("");
  const [selectedLabelRate, setSelectedLabelRate] = useState("");
  const [showLabelRates, setShowLabelRates] = useState(false);
  const [isBuyingLabel, setIsBuyingLabel] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [restockOnRefund, setRestockOnRefund] = useState(true);
  const [refundReason, setRefundReason] = useState("Customer request");
  const [working, setWorking] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [holdReason, setHoldReason] = useState("");
  const [editAddress, setEditAddress] = useState<any>(null);
  const [parcel, setParcel] = useState({ length: "10", width: "8", height: "2", weight: "1.5", distance_unit: "in", mass_unit: "lb" });
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem("publisher-parcels") || "[]"); } catch { return []; } });
  const [timelineFilter, setTimelineFilter] = useState<"all" | "event" | "note">("all");
  const [confirming, setConfirming] = useState<null | "refund" | "cancel">(null);

  useEffect(() => {
    setChecked(new Set());
    loadOrder();
  }, [orderId]);

  async function loadOrder() {
    try {
      const data = await adminApi.getOrderById(orderId);
      setOrder(data);
      if (data) { setTrackingCarrier((data as any).trackingCarrier || "Canada Post"); setTrackingNumber((data as any).trackingNumber || ""); }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingCarrier, setTrackingCarrier] = useState("Canada Post");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isShipping, setIsShipping] = useState(false);

  useEffect(() => { setChecked(new Set()); }, [order ? packingKey(order) : ""]);

  const markAsShipped = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number.");
      return;
    }
    setIsShipping(true);
    try {
      await adminApi.fulfillmentAction(orderId, "dispatch", { trackingCarrier, trackingNumber });
      setShowShipForm(false);
      setTrackingNumber("");
      loadOrder();
      toast.success("Order marked as shipped");
    } catch (err) {
      toast.error("Error updating order.");
    } finally {
      setIsShipping(false);
    }
  };

  const handlePrintPackingSlip = () => {
    printOrders([order]);
  };

  const handlePushToShippo = async () => {
    setIsGeneratingLabel(true);
    try {
      const result = await adminApi.getCanadaPostLabelRates(orderId, parcel);
      setLabelRates(result.rates || []);
      setLabelShipmentId(result.shipmentId || "");
      setSelectedLabelRate(result.rates?.[0]?.id || "");
      setShowLabelRates(true);
    } catch (err: any) {
      toast.error(err.message || "Couldn't load Canada Post rates.");
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const handleBuyLabel = async () => {
    if (!selectedLabelRate || !labelShipmentId) return;
    setIsBuyingLabel(true);
    try {
      await adminApi.buyCanadaPostLabel(orderId, labelShipmentId, selectedLabelRate);
      setShowLabelRates(false);
      await loadOrder();
      toast.success("Canada Post label purchased.");
    } catch (err: any) {
      toast.error(err.message || "Couldn't purchase the label.");
      await loadOrder();
    } finally {
      setIsBuyingLabel(false);
    }
  };

  const handleAddNote = async () => {
    if (!note.trim() || working) return;
    setWorking(true);
    try { await adminApi.addOrderNote(orderId, note); setNote(""); await loadOrder(); toast.success("Note added"); }
    catch (err: any) { toast.error(err.message || "Could not save note."); }
    finally { setWorking(false); }
  };

  const handleRefund = async () => {
    const isManual = order.paymentMethod && order.paymentMethod !== "Stripe" && order.paymentMethod !== "PayPal";
    setConfirming(null);
    setIsVoiding(true);
    try {
      await adminApi.refundOrder(orderId, { reason: refundReason, restock: restockOnRefund });
      toast.success(isManual ? "Manual order marked as refunded" : "Stripe refund issued and order cancelled");
      loadOrder();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to refund order.");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleCancelUnpaid = async () => {
    setConfirming(null);
    setIsVoiding(true);
    try {
      await adminApi.updateOrder(orderId, { status: "cancelled" });
      await adminApi.addOrderEvent(orderId, "Unpaid order cancelled by administrator.");
      await loadOrder();
      toast.success("Unpaid order cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel unpaid order.");
    } finally {
      setIsVoiding(false);
    }
  };

  const perform = async (action: "review" | "pack" | "hold" | "release", payload: any = {}) => {
    if (working) return;
    setWorking(true);
    try { await adminApi.fulfillmentAction(orderId, action, payload); await loadOrder(); toast.success("Fulfillment updated"); }
    catch (err: any) { toast.error(err.message || "Could not save fulfillment."); }
    finally { setWorking(false); }
  };
  const saveAddress = async () => {
    if (!editAddress || working) return;
    setWorking(true);
    try { await adminApi.correctOrderAddress(orderId, editAddress, addressKey(order)); setEditAddress(null); await loadOrder(); toast.success("Address corrected. Review it before packing."); }
    catch (err: any) { toast.error(err.message || "Could not correct address."); }
    finally { setWorking(false); }
  };

  if (loading) return <LoadingState label="Retrieving order…" />;

  if (!order) return (
    <EmptyState title="Order not found" description="This order may have been deleted. Go back to the orders list and pick another."
      action={<SecondaryButton onClick={onClose}>Back to orders</SecondaryButton>} />
  );

  const paid = order.paymentStatus === "paid";
  const payTone: BadgeTone = paid ? "success" : order.paymentStatus === "refunded" || order.paymentStatus === "refund_pending" ? "info" : "danger";
  const addr = order.customer?.address || {};
  const isManualPayment = order.paymentMethod && order.paymentMethod !== "Stripe" && order.paymentMethod !== "PayPal";
  const activity = [...(order.activity || []), ...(order.operations?.activity || [])].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).filter((e: any) => timelineFilter === "all" || e.type === timelineFilter);
  const money = (n?: number) => `CA$${Number(n || 0).toFixed(2)}`;

  const queue = queueOf(order);
  const issues = addressIssues(order);
  const problem = dispatchProblem(order);
  const packed = order.operations?.packed === packingKey(order);
  const parcelValid = [parcel.length, parcel.width, parcel.height, parcel.weight].every(v => Number.isFinite(Number(v)) && Number(v) > 0);

  return (
    <div className="rp-stack">
      <div className="rp-page-actions" data-print="hide">
        <SecondaryButton icon={<ArrowLeft size={16} aria-hidden />} onClick={onClose}>Back to orders</SecondaryButton>
      </div>

      <SectionHead kicker="Order" title={order.orderId}
        subcopy={new Date(order.createdAt).toLocaleString()}
        actions={<>
          <StatusBadge tone={payTone}>{paid ? "Paid" : String(order.paymentStatus || "unpaid")}</StatusBadge>
          <StatusBadge tone={order.status === "completed" ? "success" : order.status === "cancelled" ? "danger" : "warning"}>{String(order.status)}</StatusBadge>
          {order.isTest === true && <StatusBadge tone="danger">Test order</StatusBadge>}
        </>} />

      <SectionCard title={order.items?.length && !physicalItems(order).length ? "Digital delivery" : queue} description={order.items?.length && !physicalItems(order).length ? "Digital download access is provided by the paid-order workflow. No shipping label is needed." : queue === "Ready to ship" ? (order.labelUrl ? "Label ready. Hand the parcel to the carrier, then confirm dispatch." : "Books packed. Choose a label or enter tracking from your own carrier.") : queue === "Ready to pack" ? "Check every book and quantity, then confirm packed." : queue === "Unpaid" ? "Waiting for verified payment. Stripe's webhook confirms payment automatically." : "Review the checklist and resolve any blockers below."} data-print="hide">
        {order.operations?.hold && <p role="alert"><strong>On hold:</strong> {order.operations.hold}</p>}
        {issues.length > 0 && <ul role="alert">{issues.map(i => <li key={i}>{i}</li>)}</ul>}
        {physicalItems(order).length > 0 && <ol style={{ display: "flex", flexWrap: "wrap", gap: 24 }} aria-label="Publisher fulfillment steps">
          <li>{order.operations?.addressReviewed === addressKey(order) ? "✓" : "○"} Review address</li>
          <li>{packed ? "✓" : "○"} Pack books</li>
          <li>{order.labelUrl ? "✓" : "○"} Shipping label</li>
          <li>{["In transit", "Completed"].includes(queue) ? "✓" : "○"} Dispatch</li>
        </ol>}
        {queue === "Needs attention" && <PrimaryButton disabled={working} onClick={() => order.operations?.hold ? document.getElementById("order-hold")?.scrollIntoView({ behavior: "smooth" }) : document.getElementById("order-address")?.scrollIntoView({ behavior: "smooth" })}>{order.operations?.hold ? "Review fulfillment hold" : "Review shipping address"}</PrimaryButton>}
        {queue === "Ready to pack" && <PrimaryButton onClick={() => document.getElementById("order-items")?.scrollIntoView({ behavior: "smooth" })}>Start packing checklist</PrimaryButton>}
        {queue === "Ready to ship" && <PrimaryButton disabled={working} onClick={() => order.labelUrl ? setShowShipForm(true) : document.getElementById("parcel-tools")?.scrollIntoView({ behavior: "smooth", block: "center" })}>{order.labelUrl ? "Confirm dispatch" : "Choose shipping label"}</PrimaryButton>}
      </SectionCard>

      <div className="rp-split">
        <div className="rp-stack" style={{ minWidth: 0 }}>
          {/* Item ledger */}
          <SectionCard flush title="Item ledger" description={packed ? "All books packed" : "Check the title, edition and quantity for each line"}>
            <div id="order-items" className="rp-table-wrap" role="region" aria-label="Order items" tabIndex={0}>
              <table className="rp-table">
                <caption className="rp-sr-only">Items in this order</caption>
                <thead><tr><th scope="col" data-print="hide">Packed</th><th scope="col">Item</th><th scope="col" className="rp-num">Qty</th><th scope="col" className="rp-num">Price</th></tr></thead>
                <tbody>
                  {order.items?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td data-print="hide">{isDigitalItem(item) ? <StatusBadge>Digital</StatusBadge> : <Checkbox label="" aria-label={`Packed ${item.quantity} × ${item.title}`} checked={packed || checked.has(i)} disabled={working || queue !== "Ready to pack"} onChange={() => setChecked(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; })} />}</td>
                      <td className="rp-lead">
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          {item.photoUrl && <img src={item.photoUrl} alt="" width={40} height={56} style={{ objectFit: "cover", border: "1px solid var(--rp-border-strong)" }} />}
                          <span style={{ overflowWrap: "anywhere" }}>{item.title}{item.variantName && <small className="rp-hint" style={{ display: "block" }}>{item.variantName}</small>}{item.sku && <small className="rp-mono" style={{ display: "block" }}>{item.sku}</small>}</span>
                        </div>
                      </td>
                      <td className="rp-num">{item.quantity}</td>
                      <td className="rp-num">{money(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: 20, borderTop: "1px solid var(--rp-divider)" }} data-print="hide">
              {queue === "Ready to pack" && <PrimaryButton disabled={working || !physicalItems(order).length || checked.size !== physicalItems(order).length} onClick={() => perform("pack", { packingKey: packingKey(order) })}>Confirm all items packed</PrimaryButton>}
              {order.labelUrl ? (
                <a className="rp-btn rp-btn-ink" href={order.labelUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} aria-hidden /> Download shipping label
                </a>
              ) : (
                <SecondaryButton onClick={handlePushToShippo} disabled={isGeneratingLabel || !!problem || !parcelValid || !!order.operations?.labelPurchasePending}>
                  {isGeneratingLabel ? "Finding Canada Post rates…" : "Choose Canada Post label"}
                </SecondaryButton>
              )}
              {queue === "Ready to ship" && !showShipForm && (
                <PrimaryButton icon={<Truck size={16} aria-hidden />} onClick={() => setShowShipForm(true)}>Enter dispatch details</PrimaryButton>
              )}
              <SecondaryButton icon={<Copy size={16} aria-hidden />} onClick={handlePrintPackingSlip}>Print packing slip</SecondaryButton>
            </div>

            {showShipForm && queue === "Ready to ship" && (
              <div style={{ padding: "0 20px 20px" }} data-print="hide">
                <div className="rp-card" style={{ padding: 20, boxShadow: "none" }}>
                  <div className="rp-sect">Dispatch details</div>
                  <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    <SelectField label="Carrier" value={trackingCarrier} onChange={(e) => setTrackingCarrier(e.target.value)}>
                      {["Canada Post", "USPS", "UPS", "FedEx", "DHL", "Purolator", "Other"].map(c => <option key={c}>{c}</option>)}
                    </SelectField>
                    <TextField label="Tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. 1234 5678 9012" style={{ fontFamily: "var(--rp-font-mono)" }} />
                  </div>
                  <div className="rp-card-actions">
                    <span className="rp-hint">The customer is emailed when the order is marked shipped.</span>
                    <span style={{ display: "flex", gap: 8 }}>
                      <SecondaryButton onClick={() => setShowShipForm(false)}>Cancel</SecondaryButton>
                      <PrimaryButton onClick={markAsShipped} disabled={isShipping || !!problem || !trackingNumber.trim()}>
                        {isShipping ? "Processing…" : "Confirm dispatch"}
                      </PrimaryButton>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {order.status === "completed" && order.trackingNumber && (
              <div style={{ padding: "0 20px 20px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <StatusBadge tone="success">{queue}</StatusBadge>
                  <p className="rp-mono" style={{ margin: "8px 0 0" }}>{order.trackingCarrier} — {order.trackingNumber}</p>
                </div>
                <a className="rp-btn rp-btn-secondary" href={getTrackingUrl(order.trackingCarrier, order.trackingNumber)} target="_blank" rel="noopener noreferrer" data-print="hide">Live tracking</a>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Parcel & shipping" description="Measure the packed parcel. Saved presets stay on this browser." data-print="hide">
            <div id="parcel-tools" className="rp-stack">
              <SelectField label="Saved parcel preset" value="" onChange={e => { const p = presets.find(p => p.name === e.target.value); if (p) setParcel(p.parcel); }}><option value="">Choose a saved parcel…</option>{presets.map(p => <option key={p.name}>{p.name}</option>)}</SelectField>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                {(["length", "width", "height", "weight"] as const).map(k => <TextField key={k} label={`${k[0].toUpperCase() + k.slice(1)} (${k === "weight" ? "lb" : "in"})`} type="number" min="0.01" step="0.01" value={parcel[k]} onChange={e => setParcel(prev => ({ ...prev, [k]: e.target.value }))} />)}
              </div>
              <TextField label="Preset name" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="e.g. Two paperbacks" />
              <SecondaryButton disabled={!presetName.trim() || !parcelValid} onClick={() => { const next = [...presets.filter(p => p.name !== presetName.trim()), { name: presetName.trim(), parcel }]; try { localStorage.setItem("publisher-parcels", JSON.stringify(next)); setPresets(next); toast.success("Parcel preset saved"); } catch { toast.error("Browser storage unavailable."); } }}>Save parcel preset</SecondaryButton>
              <SecondaryButton disabled={isGeneratingLabel || !!problem || !parcelValid || !!order.labelUrl || !!order.operations?.labelPurchasePending} onClick={handlePushToShippo}>{isGeneratingLabel ? "Finding rates…" : "Compare Canada Post services"}</SecondaryButton>
              {problem && <p className="rp-hint">{problem}</p>}
              {order.operations?.labelPurchasePending && <p role="alert">A label purchase needs reconciliation. <a href="https://app.goshippo.com/orders" target="_blank" rel="noopener noreferrer">Check Shippo</a> before buying again; contact support to reconcile this order.</p>}
              {order.labelUrl && <p className="rp-hint">A label is already purchased. Reprint it above; buying a label does not dispatch this order.</p>}
            </div>
          </SectionCard>

          {/* Totals: recorded values, never recomputed here */}
          <SectionCard title="Totals" description="As recorded by the payment webhook — the client only displays them.">
            <dl style={{ margin: 0, display: "grid", gap: 10 }}>
              {[["Subtotal", money(order.subtotal)], ["Shipping", money(order.shipping)],
                ...(order.tax > 0 ? [["Tax", money(order.tax)]] : []),
                ...(order.discount > 0 ? [["Discount", `− ${money(order.discount)}`]] : [])].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                  <dt className="rp-label">{k}</dt><dd className="rp-mono" style={{ margin: 0 }}>{v}</dd>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12, borderTop: "1px solid var(--rp-border)" }}>
                <dt className="rp-label">Total</dt>
                <dd className="rp-metric-value" style={{ margin: 0 }}>{money(order.total)}</dd>
              </div>
            </dl>
            {order.stripePaymentIntentId && (
              <div className="rp-card-actions">
                <span className="rp-hint">Paid via Stripe · <span className="rp-mono">{order.stripePaymentIntentId}</span></span>
                <a className="rp-btn rp-btn-secondary rp-btn-sm" data-print="hide" href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`} target="_blank" rel="noopener noreferrer">
                  View in Stripe <ExternalLink size={12} aria-hidden />
                </a>
              </div>
            )}
          </SectionCard>

          {/* Activity */}
          <SectionCard title="Activity & internal notes" data-print="hide">
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <TextField label="Add an internal note" value={note} onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()} placeholder="Only administrators can see notes" />
              </div>
              <PrimaryButton icon={<Plus size={16} aria-hidden />} onClick={handleAddNote} disabled={working || !note.trim()}>Add note</PrimaryButton>
            </div>
            <Tabs<"all" | "event" | "note"> label="Activity filter" value={timelineFilter} onChange={setTimelineFilter}
              tabs={[{ id: "all", label: "All" }, { id: "event", label: "System events" }, { id: "note", label: "Notes only" }]} />
            {activity.length === 0 ? (
              <EmptyState title="No entries yet" description="System events and notes for this order appear here." />
            ) : (
              <ol className="rp-list" style={{ marginTop: 16 }} aria-label="Order activity">
                {[...activity].reverse().map((event: any, i: number) => (
                  <li key={i} style={{ padding: "12px 0" }}>
                    <div className="rp-row-meta" style={{ marginBottom: 4 }}>
                      <StatusBadge tone={event.type === "note" ? "warning" : "neutral"}>{event.type === "note" ? "Note" : "Event"}</StatusBadge>
                      <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
                    </div>
                    <p style={{ margin: 0, overflowWrap: "anywhere" }}>{event.message}</p>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        {/* Customer & overrides */}
        <div className="rp-stack" style={{ minWidth: 0 }}>
          <SectionCard title="Shipping address" description="Confirm the destination before packing.">
            {paid && !["In transit", "Completed"].includes(queue) && <div className="rp-stack" data-print="hide">
              <SecondaryButton disabled={working || !!order.labelUrl || !!order.operations?.labelPurchasePending} onClick={() => setEditAddress({ ...addr })}>Correct address</SecondaryButton>
              <PrimaryButton disabled={working || issues.length > 0 || order.isTest || order.operations?.addressReviewed === addressKey(order)} onClick={() => perform("review", { addressKey: addressKey(order) })}>{order.operations?.addressReviewed === addressKey(order) ? "Address reviewed" : "Confirm address reviewed"}</PrimaryButton>
            </div>}

            <p id="order-address" style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "var(--rp-text-md)", overflowWrap: "anywhere" }}>{order.customer?.name}</p>
            <address style={{ fontStyle: "normal", lineHeight: 1.6 }}>
              {addr.street}<br />{addr.city}, {addr.state} {addr.zip}<br />{addr.country}
            </address>
            {order.addressVerified === false && (
              <p role="alert" style={{ margin: "12px 0 0", padding: 12, background: "var(--rp-danger-tint)", color: "var(--rp-danger)", border: "1px solid var(--rp-danger)" }}>
                <strong>✕ Unverified address.</strong> <span className="rp-mono">{order.addressError || "Could not verify address with postal systems."}</span>
              </p>
            )}
            {order.addressVerified === true && <p style={{ margin: "12px 0 0" }}><StatusBadge tone="success">Address verified</StatusBadge></p>}
            {order.ipCountryMatchesShipping === false && (
              <p role="alert" style={{ margin: "12px 0 0", padding: 12, background: "var(--rp-warning-tint)", color: "var(--rp-warning)", border: "1px solid var(--rp-warning)" }}>
                <strong>⚠ IP location mismatch.</strong> Placed from an IP in {order.ipCountry || "Unknown"} but shipping to {addr.country}.
              </p>
            )}
            <dl style={{ margin: "16px 0 0", display: "grid", gap: 10 }}>
              <div><dt className="rp-label">Email</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{order.customer?.email}</dd></div>
              <div><dt className="rp-label">Phone</dt><dd style={{ margin: 0 }}>{order.customer?.phone || "Not provided"}</dd></div>
              {order.orderNote && <div><dt className="rp-label">Customer note</dt><dd style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{order.orderNote}</dd></div>}
            </dl>
            <div className="rp-card-actions" data-print="hide">
              <SecondaryButton size="sm" icon={<Copy size={14} aria-hidden />} onClick={() => { navigator.clipboard.writeText(order.customer?.email); toast.success("Email copied"); }}>Copy email</SecondaryButton>
              <SecondaryButton size="sm" icon={<Copy size={14} aria-hidden />} onClick={() => { navigator.clipboard.writeText(`${order.customer?.name || ""}\n${addr.street}\n${addr.city}, ${addr.state} ${addr.zip}\n${addr.country}`); toast.success("Address copied"); }}>Copy address</SecondaryButton>
            </div>
          </SectionCard>

          {paid && !["In transit", "Completed"].includes(queue) && <SectionCard title="Fulfillment hold" description="Keep a customer issue or stock problem visible without changing payment.">
            {order.operations?.hold ? <SecondaryButton disabled={working} onClick={() => perform("release")}>Release hold</SecondaryButton> : <><span id="order-hold" /><TextField label="Hold reason" value={holdReason} onChange={e => setHoldReason(e.target.value)} maxLength={500} /><SecondaryButton disabled={working || !holdReason.trim()} onClick={() => perform("hold", { reason: holdReason })}>Place order on hold</SecondaryButton></>}
          </SectionCard>}
          <SectionCard title="Administrative actions" description="These change money or inventory — each asks you to confirm.">
            <div style={{ display: "grid", gap: 12 }} data-print="hide">
              {paid ? (
                <>
                  <DestructiveButton onClick={() => setConfirming("refund")} disabled={isVoiding}>{isVoiding ? "Refunding…" : "Refund paid order"}</DestructiveButton>
                  <SelectField label="Refund reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)}>
                    {["Customer request", "Damaged in transit", "Out of stock", "Wrong item sent", "Duplicate order", "Other"].map(r => <option key={r} value={r}>{r}</option>)}
                  </SelectField>
                  <Checkbox label="Restock items" checked={restockOnRefund} onChange={(e) => setRestockOnRefund(e.target.checked)} />
                </>
              ) : order.paymentStatus === "refunded" || order.paymentStatus === "refund_pending" ? (
                <StatusBadge tone="info">{order.paymentStatus === "refund_pending" ? "Refund pending" : "Refunded"}{order.inventoryRestockedAt ? " · items restocked" : ""}</StatusBadge>
              ) : (
                <DestructiveButton onClick={() => setConfirming("cancel")} disabled={isVoiding || order.status === "cancelled"}>
                  {isVoiding ? "Cancelling…" : order.status === "cancelled" ? "Unpaid order cancelled" : "Cancel unpaid order"}
                </DestructiveButton>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <Dialog open={!!editAddress} onClose={() => !working && setEditAddress(null)} title="Correct shipping address" description="Use the address confirmed by the customer. Corrections require a new address review." footer={<><SecondaryButton disabled={working} onClick={() => setEditAddress(null)}>Cancel</SecondaryButton><PrimaryButton disabled={working} onClick={saveAddress}>Save corrected address</PrimaryButton></>}>
        {editAddress && <div className="rp-stack">{["street", "city", "state", "zip", "country"].map(k => <TextField key={k} label={k === "state" ? "Province / state" : k === "zip" ? "Postal / ZIP code" : k[0].toUpperCase() + k.slice(1)} value={editAddress[k] || ""} onChange={e => setEditAddress((prev: any) => ({ ...prev, [k]: e.target.value }))} />)}</div>}
      </Dialog>
      <Dialog open={showLabelRates} onClose={() => !isBuyingLabel && setShowLabelRates(false)}
        title="Choose a Canada Post label"
        description="The five cheapest Canada Post services are shown first. Buying a label charges your Shippo account."
        footer={<>
          <SecondaryButton onClick={() => setShowLabelRates(false)} disabled={isBuyingLabel}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleBuyLabel} disabled={!selectedLabelRate || isBuyingLabel}>
            {isBuyingLabel ? "Buying label…" : "Buy selected label"}
          </PrimaryButton>
        </>}>
        {labelRates.length === 0 ? (
          <EmptyState title="No Canada Post rates available" description="Canada Post did not return a service for this parcel and address. Check the address or parcel details, then try again." />
        ) : (
          <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
            <legend className="rp-sr-only">Canada Post label choices</legend>
            <div style={{ display: "grid", gap: 10 }}>
              {labelRates.map((rate, index) => {
                const selected = selectedLabelRate === rate.id;
                const days = rate.estimatedDays ? `${rate.estimatedDays} day${rate.estimatedDays === 1 ? "" : "s"}` : "Delivery estimate unavailable";
                return (
                  <label key={rate.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center", padding: 16, cursor: "pointer", border: `2px solid ${selected ? "var(--rp-primary)" : "var(--rp-border)"}`, background: selected ? "var(--rp-primary-tint)" : "var(--rp-surface)" }}>
                    <input type="radio" name="label-rate" value={rate.id} checked={selected} onChange={() => setSelectedLabelRate(rate.id)} />
                    <span>
                      <strong style={{ display: "block" }}>{rate.name}</strong>
                      <span className="rp-hint">{days}{rate.durationTerms ? ` · ${rate.durationTerms}` : ""}</span>
                    </span>
                    <span style={{ textAlign: "right" }}>
                      {index === 0 && <StatusBadge tone="success">Cheapest</StatusBadge>}
                      <strong className="rp-mono" style={{ display: "block", marginTop: index === 0 ? 6 : 0 }}>
                        {new Intl.NumberFormat("en-CA", { style: "currency", currency: rate.currency || "CAD" }).format(rate.amount)}
                      </strong>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </Dialog>

      <ConfirmDialog open={confirming === "refund"} title="Refund this order?" confirmLabel="Refund order"
        message={`${isManualPayment ? "Refund this paid manual order?" : "Refund this paid order through Stripe?"}${restockOnRefund ? " The purchased quantities will also be restocked." : ""} This action is irreversible.`}
        onConfirm={handleRefund} onCancel={() => setConfirming(null)} />
      <ConfirmDialog open={confirming === "cancel"} title="Cancel this unpaid order?" confirmLabel="Cancel order"
        message="No Stripe refund will be created."
        onConfirm={handleCancelUnpaid} onCancel={() => setConfirming(null)} />
    </div>
  );
}
