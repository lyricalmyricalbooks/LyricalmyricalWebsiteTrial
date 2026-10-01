import { useState, useEffect } from "react";
import { ArrowLeft, Copy, ExternalLink, Truck, Plus } from "lucide-react";
import { adminApi } from "./api";
import toast from "react-hot-toast";
import { orderApi, FULFILLMENT_FLOW, FULFILLMENT_LABELS, type FulfillmentStatus } from "../lib/commerce";
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
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "event" | "note">("all");
  const [confirming, setConfirming] = useState<null | "paid" | "refund" | "cancel">(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function loadOrder() {
    try {
      const data = await adminApi.getOrderById(orderId);
      setOrder(data);
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

  const markAsShipped = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number.");
      return;
    }
    setIsShipping(true);
    try {
      await adminApi.updateOrder(orderId, {
        status: "completed",
        fulfillmentStatus: "shipped",
        trackingCarrier,
        trackingNumber: trackingNumber.trim(),
        shippedAt: new Date().toISOString(),
      });
      await adminApi.addOrderEvent(
        orderId,
        `Order shipped via ${trackingCarrier}. Tracking: ${trackingNumber.trim()}`
      );
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
    window.print();
  };

  const handlePushToShippo = async () => {
    setIsGeneratingLabel(true);
    try {
      const result = await adminApi.getCanadaPostLabelRates(orderId);
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
    } finally {
      setIsBuyingLabel(false);
    }
  };

  const handleAddNote = async () => {
    if (!note) return;
    await adminApi.addOrderNote(orderId, note);
    setNote("");
    loadOrder();
    toast.success("Note added");
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

  const handleMarkAsPaid = async () => {
    setConfirming(null);
    setIsMarkingPaid(true);
    try {
      await adminApi.markOrderPaid(orderId);
      toast.success("Order marked as paid — confirmation email sent");
      loadOrder();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to mark order as paid.");
    } finally {
      setIsMarkingPaid(false);
    }
  };


  if (loading) return <LoadingState label="Retrieving order…" />;

  if (!order) return (
    <EmptyState title="Order not found" description="This order may have been deleted. Go back to the orders list and pick another."
      action={<SecondaryButton onClick={onClose}>Back to orders</SecondaryButton>} />
  );

  const current: FulfillmentStatus = (order.fulfillmentStatus || (order.status === "completed" ? "delivered" : "paid")) as FulfillmentStatus;
  const currentIdx = FULFILLMENT_FLOW.indexOf(current);
  const paid = order.paymentStatus === "paid";
  const payTone: BadgeTone = paid ? "success" : order.paymentStatus === "refunded" || order.paymentStatus === "refund_pending" ? "info" : "danger";
  const addr = order.customer?.address || {};
  const isManualPayment = order.paymentMethod && order.paymentMethod !== "Stripe" && order.paymentMethod !== "PayPal";
  const activity = (order.activity || []).filter((e: any) => timelineFilter === "all" || e.type === timelineFilter);
  const money = (n?: number) => `CA$${Number(n || 0).toFixed(2)}`;

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

      {/* Fulfillment pipeline */}
      <SectionCard title="Fulfillment" data-print="hide"
        actions={
          <SelectField label="Set fulfillment status" hideLabel value={current}
            onChange={async (e) => {
              const next = e.target.value as FulfillmentStatus;
              await orderApi.setFulfillmentStatus(orderId, next);
              loadOrder();
              toast.success(`Status: ${FULFILLMENT_LABELS[next]}`);
            }}>
            {(Object.keys(FULFILLMENT_LABELS) as FulfillmentStatus[]).map(k => <option key={k} value={k}>{FULFILLMENT_LABELS[k]}</option>)}
          </SelectField>
        }>
        <ol aria-label="Fulfillment progress" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))", gap: 12, listStyle: "none", margin: 0, padding: 0 }}>
          {FULFILLMENT_FLOW.map((step, idx) => {
            const reached = idx <= currentIdx;
            return (
              <li key={step} aria-current={step === current ? "step" : undefined} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 6, background: reached ? "var(--rp-primary)" : "var(--rp-surface-inset)", border: "1px solid var(--rp-border-strong)" }} />
                <span className="rp-label" style={{ color: reached ? "var(--rp-text)" : "var(--rp-text-subtle)" }}>
                  {reached ? "✓ " : ""}{FULFILLMENT_LABELS[step]}
                </span>
              </li>
            );
          })}
        </ol>
      </SectionCard>

      <div className="rp-split">
        <div className="rp-stack" style={{ minWidth: 0 }}>
          {/* Item ledger */}
          <SectionCard flush title="Item ledger" description={order.status === "completed" ? "Dispatched" : "Awaiting fulfillment"}>
            <div className="rp-table-wrap" role="region" aria-label="Order items" tabIndex={0}>
              <table className="rp-table">
                <caption className="rp-sr-only">Items in this order</caption>
                <thead><tr><th scope="col">Item</th><th scope="col" className="rp-num">Qty</th><th scope="col" className="rp-num">Price</th></tr></thead>
                <tbody>
                  {order.items?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="rp-lead">
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          {item.photoUrl && <img src={item.photoUrl} alt="" width={40} height={56} style={{ objectFit: "cover", border: "1px solid var(--rp-border-strong)" }} />}
                          <span style={{ overflowWrap: "anywhere" }}>{item.title}</span>
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
              {order.labelUrl ? (
                <a className="rp-btn rp-btn-ink" href={order.labelUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} aria-hidden /> Download shipping label
                </a>
              ) : (
                <SecondaryButton onClick={handlePushToShippo} disabled={isGeneratingLabel}>
                  {isGeneratingLabel ? "Finding Canada Post rates…" : "Choose Canada Post label"}
                </SecondaryButton>
              )}
              {order.status !== "completed" && !showShipForm && (
                <PrimaryButton icon={<Truck size={16} aria-hidden />} onClick={() => setShowShipForm(true)}>Initiate dispatch</PrimaryButton>
              )}
              <SecondaryButton icon={<Copy size={16} aria-hidden />} onClick={handlePrintPackingSlip}>Print packing slip</SecondaryButton>
            </div>

            {showShipForm && order.status !== "completed" && (
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
                      <PrimaryButton onClick={markAsShipped} disabled={isShipping || !trackingNumber.trim()}>
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
                  <StatusBadge tone="success">In transit</StatusBadge>
                  <p className="rp-mono" style={{ margin: "8px 0 0" }}>{order.trackingCarrier} — {order.trackingNumber}</p>
                </div>
                <a className="rp-btn rp-btn-secondary" href={getTrackingUrl(order.trackingCarrier, order.trackingNumber)} target="_blank" rel="noopener noreferrer" data-print="hide">Live tracking</a>
              </div>
            )}
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
              <PrimaryButton icon={<Plus size={16} aria-hidden />} onClick={handleAddNote} disabled={!note.trim()}>Add note</PrimaryButton>
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
          <SectionCard title="Customer">
            <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "var(--rp-text-md)", overflowWrap: "anywhere" }}>{order.customer?.name}</p>
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
              <SecondaryButton size="sm" icon={<Copy size={14} aria-hidden />} onClick={() => { navigator.clipboard.writeText(`${addr.street}, ${addr.city}`); toast.success("Address copied"); }}>Copy address</SecondaryButton>
            </div>
          </SectionCard>

          <SectionCard title="Administrative actions" description="These change money or inventory — each asks you to confirm.">
            <div style={{ display: "grid", gap: 12 }} data-print="hide">
              {(order.paymentStatus === "pending" || order.paymentStatus === "unpaid") && order.status !== "cancelled" && (
                <PrimaryButton onClick={() => setConfirming("paid")} disabled={isMarkingPaid}>{isMarkingPaid ? "Processing…" : "Mark as paid"}</PrimaryButton>
              )}
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

      <ConfirmDialog open={confirming === "paid"} title="Mark this order as paid?" confirmLabel="Mark as paid"
        message="This will decrement inventory, record revenue, and send the customer a confirmation email."
        onConfirm={handleMarkAsPaid} onCancel={() => setConfirming(null)} />
      <ConfirmDialog open={confirming === "refund"} title="Refund this order?" confirmLabel="Refund order"
        message={`${isManualPayment ? "Refund this paid manual order?" : "Refund this paid order through Stripe?"}${restockOnRefund ? " The purchased quantities will also be restocked." : ""} This action is irreversible.`}
        onConfirm={handleRefund} onCancel={() => setConfirming(null)} />
      <ConfirmDialog open={confirming === "cancel"} title="Cancel this unpaid order?" confirmLabel="Cancel order"
        message="No Stripe refund will be created."
        onConfirm={handleCancelUnpaid} onCancel={() => setConfirming(null)} />
    </div>
  );
}
