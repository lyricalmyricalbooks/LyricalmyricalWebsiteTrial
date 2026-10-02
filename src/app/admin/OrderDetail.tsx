import { FulfillmentWorkbench } from "./FulfillmentWorkbench";
import {
  addressKey,
  packingKey,
  queueOf,
  dispatchProblem,
} from "./fulfillment";
import { printOrders } from "./orderPrint";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { adminApi } from "./api";
import toast from "react-hot-toast";
import {
  ActionMenu,
  Checkbox,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  DestructiveButton,
  SectionCard,
  SectionHead,
  SelectField,
  StatusBadge,
  Tabs,
  TextField,
  TextArea,
  type BadgeTone,
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

export function OrderDetail({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [note, setNote] = useState("");
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [labelRates, setLabelRates] = useState<any[]>([]);
  const [labelShipmentId, setLabelShipmentId] = useState("");
  const [selectedLabelRate, setSelectedLabelRate] = useState("");
  const [showLabelRates, setShowLabelRates] = useState(false);
  const [showParcel, setShowParcel] = useState(false);
  const [showHold, setShowHold] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [isBuyingLabel, setIsBuyingLabel] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const voidingRef = useRef(false);
  const [restockOnRefund, setRestockOnRefund] = useState(true);
  const [refundReason, setRefundReason] = useState("Customer request");
  const [working, setWorking] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [holdReason, setHoldReason] = useState("");
  const [editAddress, setEditAddress] = useState<any>(null);
  const [parcel, setParcel] = useState({
    length: "10",
    width: "8",
    height: "2",
    weight: "1.5",
    distance_unit: "in",
    mass_unit: "lb",
  });
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("publisher-parcels") || "[]");
    } catch {
      return [];
    }
  });
  const [timelineFilter, setTimelineFilter] = useState<
    "all" | "event" | "note"
  >("all");
  const [confirming, setConfirming] = useState<null | "refund" | "cancel">(
    null,
  );

  useEffect(() => {
    setChecked(new Set());
    setLoading(true);
    loadOrder();
  }, [orderId]);

  async function loadOrder() {
    setLoadFailed(false);
    try {
      const data = await adminApi.getOrderById(orderId);
      setOrder(data);
      if (data) {
        setTrackingCarrier((data as any).trackingCarrier || "Canada Post");
        setTrackingNumber((data as any).trackingNumber || "");
      }
    } catch (err) {
      console.error(err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingCarrier, setTrackingCarrier] = useState("Canada Post");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isShipping, setIsShipping] = useState(false);

  useEffect(() => {
    setChecked(new Set());
  }, [order ? packingKey(order) : ""]);

  const markAsShipped = async () => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number.");
      return;
    }
    setIsShipping(true);
    try {
      await adminApi.fulfillmentAction(orderId, "dispatch", {
        trackingCarrier,
        trackingNumber,
      });
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
      setShowParcel(false);
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
      await adminApi.buyCanadaPostLabel(
        orderId,
        labelShipmentId,
        selectedLabelRate,
      );
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
    try {
      await adminApi.addOrderNote(orderId, note);
      setNote("");
      await loadOrder();
      toast.success("Note added");
    } catch (err: any) {
      toast.error(err.message || "Could not save note.");
    } finally {
      setWorking(false);
    }
  };

  const handleRefund = async () => {
    if (voidingRef.current) return;
    voidingRef.current = true;
    const isManual =
      order.paymentMethod &&
      order.paymentMethod !== "Stripe" &&
      order.paymentMethod !== "PayPal";
    setConfirming(null);
    setIsVoiding(true);
    try {
      await adminApi.refundOrder(orderId, {
        reason: refundReason,
        restock: restockOnRefund,
      });
      toast.success(
        isManual
          ? "Manual order marked as refunded"
          : "Stripe refund issued and order cancelled",
      );
      loadOrder();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to refund order.");
    } finally {
      voidingRef.current = false;
      setIsVoiding(false);
    }
  };

  const handleCancelUnpaid = async () => {
    if (voidingRef.current) return;
    voidingRef.current = true;
    setConfirming(null);
    setIsVoiding(true);
    try {
      await adminApi.updateOrder(orderId, { status: "cancelled" });
      await adminApi.addOrderEvent(
        orderId,
        "Unpaid order cancelled by administrator.",
      );
      await loadOrder();
      toast.success("Unpaid order cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel unpaid order.");
    } finally {
      voidingRef.current = false;
      setIsVoiding(false);
    }
  };

  const perform = async (
    action: "review" | "pack" | "hold" | "release",
    payload: any = {},
  ) => {
    if (working) return;
    setWorking(true);
    try {
      await adminApi.fulfillmentAction(orderId, action, payload);
      await loadOrder();
      setShowHold(false);
      toast.success(
        action === "pack"
          ? "Books packed"
          : action === "review"
            ? "Address confirmed"
            : action === "hold"
              ? "Order held"
              : "Hold released",
      );
    } catch (err: any) {
      toast.error(err.message || "Could not save fulfillment.");
    } finally {
      setWorking(false);
    }
  };
  const saveAddress = async () => {
    if (!editAddress || working) return;
    setWorking(true);
    try {
      await adminApi.correctOrderAddress(
        orderId,
        editAddress,
        addressKey(order),
      );
      setEditAddress(null);
      await loadOrder();
      toast.success("Address corrected. Review it before packing.");
    } catch (err: any) {
      toast.error(err.message || "Could not correct address.");
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <LoadingState label="Retrieving order…" />;

  if (loadFailed && !order)
    return (
      <ErrorState
        description="This order could not be loaded. Check your connection and try again."
        onRetry={() => {
          setLoading(true);
          loadOrder();
        }}
      />
    );

  if (!order)
    return (
      <EmptyState
        title="Order not found"
        description="This order may have been deleted. Go back to the orders list and pick another."
        action={
          <SecondaryButton onClick={onClose}>Back to orders</SecondaryButton>
        }
      />
    );

  const paid = order.paymentStatus === "paid";
  const payTone: BadgeTone = paid
    ? "success"
    : order.paymentStatus === "refunded" ||
        order.paymentStatus === "refund_pending"
      ? "info"
      : "danger";
  const addr = order.customer?.address || {};
  const isManualPayment =
    order.paymentMethod &&
    order.paymentMethod !== "Stripe" &&
    order.paymentMethod !== "PayPal";
  const activity = [
    ...(order.activity || []),
    ...(order.operations?.activity || []),
  ]
    .sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .filter((e: any) => timelineFilter === "all" || e.type === timelineFilter);
  const money = (n?: number) => `CA$${Number(n || 0).toFixed(2)}`;

  const queue = queueOf(order);
  const problem = dispatchProblem(order);
  const parcelValid = [
    parcel.length,
    parcel.width,
    parcel.height,
    parcel.weight,
  ].every((v) => Number.isFinite(Number(v)) && Number(v) > 0);

  return (
    <div className="rp-stack fw-detail">
      <div className="fw-toolbar" data-print="hide">
        <SecondaryButton
          icon={<ArrowLeft size={16} aria-hidden />}
          onClick={onClose}
        >
          Back to orders
        </SecondaryButton>
        <div className="fw-toolbar-actions">
          <SecondaryButton size="sm" onClick={handlePrintPackingSlip}>
            Print packing slip
          </SecondaryButton>
          {!isVoiding &&
            (paid ||
              (order.paymentStatus !== "refunded" &&
                order.paymentStatus !== "refund_pending" &&
                order.status !== "cancelled")) && (
              <ActionMenu
                label="More order actions"
                actions={[
                  ...(paid &&
                  [
                    "Needs attention",
                    "Ready to pack",
                    "Ready to ship",
                  ].includes(queue)
                    ? [
                        {
                          label: order.operations?.hold
                            ? "Release hold"
                            : "Place on hold",
                          onSelect: () =>
                            order.operations?.hold
                              ? perform("release")
                              : setShowHold(true),
                        },
                      ]
                    : []),
                  ...(paid
                    ? [
                        {
                          label: "Refund order",
                          tone: "danger" as const,
                          onSelect: () => setShowRefund(true),
                        },
                      ]
                    : order.paymentStatus !== "refunded" &&
                        order.paymentStatus !== "refund_pending" &&
                        order.status !== "cancelled"
                      ? [
                          {
                            label: "Cancel unpaid order",
                            tone: "danger" as const,
                            onSelect: () => setConfirming("cancel"),
                          },
                        ]
                      : []),
                ]}
              />
            )}
        </div>
      </div>
      <SectionHead
        kicker="Order"
        title={order.orderId}
        subcopy={new Date(order.createdAt).toLocaleString()}
        actions={
          <>
            <StatusBadge tone={payTone}>
              {paid
                ? "Paid"
                : String(order.paymentStatus || "unpaid").replace(/_/g, " ")}
            </StatusBadge>
            {order.isTest && (
              <StatusBadge tone="danger">Test order</StatusBadge>
            )}
          </>
        }
      />
      {loadFailed && (
        <ErrorState
          description="The latest order could not be loaded. Retry before continuing."
          onRetry={loadOrder}
        />
      )}
      <div className="fw-layout">
        <FulfillmentWorkbench
          order={order}
          checked={checked}
          busy={
            working || isShipping || isBuyingLabel || isVoiding || loadFailed
          }
          onCheck={(i) =>
            setChecked((prev) => {
              const next = new Set(prev);
              next.has(i) ? next.delete(i) : next.add(i);
              return next;
            })
          }
          onReview={() => perform("review", { addressKey: addressKey(order) })}
          onCorrect={() => setEditAddress({ ...addr })}
          onPack={() => perform("pack", { packingKey: packingKey(order) })}
          onLabel={() => setShowParcel(true)}
          onDispatch={() => setShowShipForm(true)}
          onRelease={() => perform("release")}
        />
        <aside className="rp-stack" aria-label="Order summary">
          <SectionCard title="Customer">
            <strong>{order.customer?.name || "Guest customer"}</strong>
            <p className="fw-summary">
              {order.customer?.email}
              <br />
              {order.customer?.phone || ""}
            </p>
            {order.orderNote && (
              <div className="fw-notice" style={{ marginTop: 16 }}>
                <div>
                  <span className="rp-label">Customer note</span>
                  <p
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {order.orderNote}
                  </p>
                </div>
              </div>
            )}
            <div className="fw-actions">
              <SecondaryButton
                size="sm"
                icon={<Copy size={14} aria-hidden />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      order.customer?.email || "",
                    );
                    toast.success("Email copied");
                  } catch {
                    toast.error("Could not copy email");
                  }
                }}
              >
                Copy email
              </SecondaryButton>
              <SecondaryButton
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${order.customer?.name || ""}\n${addr.street || ""}\n${addr.city || ""}, ${addr.state || ""} ${addr.zip || ""}\n${addr.country || ""}`,
                    );
                    toast.success("Address copied");
                  } catch {
                    toast.error("Could not copy address");
                  }
                }}
              >
                Copy address
              </SecondaryButton>
            </div>
            {order.ipCountryMatchesShipping === false && (
              <p className="fw-problems">
                Location mismatch: placed from {order.ipCountry || "unknown"};
                shipping to {addr.country}.
              </p>
            )}
          </SectionCard>
          <SectionCard title="Payment summary">
            <dl style={{ margin: 0, display: "grid", gap: 12 }}>
              {[
                ["Subtotal", money(order.subtotal)],
                ["Shipping", money(order.shipping)],
                ...(order.tax > 0 ? [["Tax", money(order.tax)]] : []),
                ...(order.discount > 0
                  ? [["Discount", `− ${money(order.discount)}`]]
                  : []),
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <dt>{k}</dt>
                  <dd className="rp-mono" style={{ margin: 0 }}>
                    {v}
                  </dd>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  borderTop: "1px solid var(--rp-divider)",
                  paddingTop: 16,
                }}
              >
                <dt>
                  <strong>Total</strong>
                </dt>
                <dd className="rp-mono" style={{ margin: 0, fontWeight: 700 }}>
                  {money(order.total)}
                </dd>
              </div>
            </dl>
            {order.stripePaymentIntentId && (
              <div className="fw-actions">
                <a
                  className="rp-btn rp-btn-secondary rp-btn-sm"
                  href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View payment in Stripe <ExternalLink size={12} aria-hidden />
                </a>
              </div>
            )}
            {order.status === "completed" && order.trackingNumber && (
              <div className="fw-actions">
                <a
                  className="rp-btn rp-btn-secondary rp-btn-sm"
                  href={getTrackingUrl(
                    order.trackingCarrier,
                    order.trackingNumber,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Track parcel <ExternalLink size={12} aria-hidden />
                </a>
              </div>
            )}
          </SectionCard>
        </aside>
      </div>
      <details className="fw-notes" data-print="hide">
        <summary>
          Activity & internal notes{" "}
          <span className="rp-hint">({activity.length})</span>
        </summary>
        <div className="fw-note-form">
          <div>
            <TextArea
              rows={2}
              label="Internal note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="Visible to your team only"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
            />
          </div>
          <SecondaryButton
            disabled={working || !note.trim()}
            onClick={handleAddNote}
          >
            Add note
          </SecondaryButton>
        </div>
        <Tabs<"all" | "event" | "note">
          label="Activity filter"
          value={timelineFilter}
          onChange={setTimelineFilter}
          tabs={[
            { id: "all", label: "All entries" },
            { id: "event", label: "Events" },
            { id: "note", label: "Notes" },
          ]}
        />
        {activity.length ? (
          <ol className="fw-activity" aria-label="Order activity">
            {[...activity].reverse().map((e: any, i: number) => (
              <li key={i}>
                <time className="rp-hint" dateTime={e.createdAt}>
                  {new Date(e.createdAt).toLocaleString()}
                </time>
                <p>{e.message}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rp-hint">No activity recorded yet.</p>
        )}
      </details>
      <Dialog
        open={showParcel}
        onClose={() => !isGeneratingLabel && setShowParcel(false)}
        title="Set up your parcel"
        description="Measure and weigh the packed books before comparing Canada Post rates."
        footer={
          <>
            <SecondaryButton
              onClick={() => setShowParcel(false)}
              disabled={isGeneratingLabel}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              disabled={isGeneratingLabel || !parcelValid || !!problem}
              onClick={handlePushToShippo}
            >
              {isGeneratingLabel ? "Finding rates…" : "Compare rates"}
            </PrimaryButton>
          </>
        }
      >
        <div className="rp-stack">
          {presets.length > 0 && (
            <SelectField
              label="Saved parcel"
              value=""
              onChange={(e) => {
                const selected = presets.find((p) => p.name === e.target.value);
                if (selected) setParcel(selected.parcel);
              }}
            >
              <option value="">Choose a saved parcel…</option>
              {presets.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </SelectField>
          )}
          <div className="fw-dialog-grid">
            {(["length", "width", "height", "weight"] as const).map((k) => (
              <TextField
                key={k}
                label={`${k[0].toUpperCase() + k.slice(1)} (${k === "weight" ? "lb" : "in"})`}
                type="number"
                min="0.01"
                step="0.01"
                value={parcel[k]}
                onChange={(e) =>
                  setParcel((prev) => ({ ...prev, [k]: e.target.value }))
                }
              />
            ))}
          </div>
          <details className="fw-notes">
            <summary>Save as a parcel preset</summary>
            <div className="fw-note-form">
              <div>
                <TextField
                  label="Preset name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g. Two paperbacks"
                />
              </div>
              <SecondaryButton
                disabled={!presetName.trim() || !parcelValid}
                onClick={() => {
                  const next = [
                    ...presets.filter((p) => p.name !== presetName.trim()),
                    { name: presetName.trim(), parcel },
                  ];
                  try {
                    localStorage.setItem(
                      "publisher-parcels",
                      JSON.stringify(next),
                    );
                    setPresets(next);
                    toast.success("Parcel preset saved");
                  } catch {
                    toast.error("Could not save preset");
                  }
                }}
              >
                Save preset
              </SecondaryButton>
            </div>
          </details>
        </div>
      </Dialog>
      <Dialog
        open={showShipForm}
        onClose={() => !isShipping && setShowShipForm(false)}
        title="Confirm dispatch"
        description="Confirm only after handing the parcel to the carrier. This sends the customer's shipping notification."
        footer={
          <>
            <SecondaryButton
              disabled={isShipping}
              onClick={() => setShowShipForm(false)}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              disabled={isShipping || !!problem || !trackingNumber.trim()}
              onClick={markAsShipped}
            >
              {isShipping ? "Saving…" : "Mark as shipped"}
            </PrimaryButton>
          </>
        }
      >
        <div className="rp-stack">
          <SelectField
            label="Carrier"
            value={trackingCarrier}
            onChange={(e) => setTrackingCarrier(e.target.value)}
          >
            {[
              "Canada Post",
              "USPS",
              "UPS",
              "FedEx",
              "DHL",
              "Purolator",
              "Other",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <TextField
            label="Tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter the carrier tracking number"
          />
        </div>
      </Dialog>
      <Dialog
        open={showHold}
        onClose={() => !working && setShowHold(false)}
        title="Place order on hold"
        description="Pause packing and shipping while you resolve an issue."
        footer={
          <>
            <SecondaryButton
              disabled={working}
              onClick={() => setShowHold(false)}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              disabled={working || !holdReason.trim()}
              onClick={() => perform("hold", { reason: holdReason })}
            >
              Place on hold
            </PrimaryButton>
          </>
        }
      >
        <TextField
          label="Hold reason"
          value={holdReason}
          onChange={(e) => setHoldReason(e.target.value)}
          maxLength={500}
          placeholder="e.g. Confirm replacement address with customer"
        />
      </Dialog>
      <Dialog
        open={showRefund}
        onClose={() => !isVoiding && setShowRefund(false)}
        title="Refund order"
        description="Choose the refund reason and whether books should return to stock. You will review the refund before it is submitted."
        footer={
          <>
            <SecondaryButton onClick={() => setShowRefund(false)}>
              Cancel
            </SecondaryButton>
            <DestructiveButton
              onClick={() => {
                setShowRefund(false);
                setConfirming("refund");
              }}
            >
              Review refund
            </DestructiveButton>
          </>
        }
      >
        <div className="rp-stack">
          <SelectField
            label="Refund reason"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          >
            {[
              "Customer request",
              "Damaged in transit",
              "Out of stock",
              "Wrong item sent",
              "Duplicate order",
              "Other",
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </SelectField>
          <Checkbox
            label="Restock items"
            checked={restockOnRefund}
            onChange={(e) => setRestockOnRefund(e.target.checked)}
          />
        </div>
      </Dialog>
      <Dialog
        open={!!editAddress}
        onClose={() => !working && setEditAddress(null)}
        title="Correct shipping address"
        description="Use the address confirmed by the customer. Corrections require a new address review."
        footer={
          <>
            <SecondaryButton
              disabled={working}
              onClick={() => setEditAddress(null)}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton disabled={working} onClick={saveAddress}>
              Save corrected address
            </PrimaryButton>
          </>
        }
      >
        {editAddress && (
          <div className="rp-stack">
            {["street", "city", "state", "zip", "country"].map((k) => (
              <TextField
                key={k}
                label={
                  k === "state"
                    ? "Province / state"
                    : k === "zip"
                      ? "Postal / ZIP code"
                      : k[0].toUpperCase() + k.slice(1)
                }
                value={editAddress[k] || ""}
                onChange={(e) =>
                  setEditAddress((prev: any) => ({
                    ...prev,
                    [k]: e.target.value,
                  }))
                }
              />
            ))}
          </div>
        )}
      </Dialog>
      <Dialog
        open={showLabelRates}
        onClose={() => !isBuyingLabel && setShowLabelRates(false)}
        title="Choose a Canada Post label"
        description="The five cheapest Canada Post services are shown first. Buying a label charges your Shippo account."
        footer={
          <>
            <SecondaryButton
              onClick={() => setShowLabelRates(false)}
              disabled={isBuyingLabel}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={handleBuyLabel}
              disabled={!selectedLabelRate || isBuyingLabel}
            >
              {isBuyingLabel ? "Buying label…" : "Buy selected label"}
            </PrimaryButton>
          </>
        }
      >
        {labelRates.length === 0 ? (
          <EmptyState
            title="No Canada Post rates available"
            description="Canada Post did not return a service for this parcel and address. Check the address or parcel details, then try again."
          />
        ) : (
          <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
            <legend className="rp-sr-only">Canada Post label choices</legend>
            <div style={{ display: "grid", gap: 10 }}>
              {labelRates.map((rate, index) => {
                const selected = selectedLabelRate === rate.id;
                const days = rate.estimatedDays
                  ? `${rate.estimatedDays} day${rate.estimatedDays === 1 ? "" : "s"}`
                  : "Delivery estimate unavailable";
                return (
                  <label
                    key={rate.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 14,
                      alignItems: "center",
                      padding: 16,
                      cursor: "pointer",
                      border: `2px solid ${selected ? "var(--rp-primary)" : "var(--rp-border)"}`,
                      background: selected
                        ? "var(--rp-primary-tint)"
                        : "var(--rp-surface)",
                    }}
                  >
                    <input
                      type="radio"
                      name="label-rate"
                      value={rate.id}
                      checked={selected}
                      onChange={() => setSelectedLabelRate(rate.id)}
                    />
                    <span>
                      <strong style={{ display: "block" }}>{rate.name}</strong>
                      <span className="rp-hint">
                        {days}
                        {rate.durationTerms ? ` · ${rate.durationTerms}` : ""}
                      </span>
                    </span>
                    <span style={{ textAlign: "right" }}>
                      {index === 0 && (
                        <StatusBadge tone="success">Cheapest</StatusBadge>
                      )}
                      <strong
                        className="rp-mono"
                        style={{
                          display: "block",
                          marginTop: index === 0 ? 6 : 0,
                        }}
                      >
                        {new Intl.NumberFormat("en-CA", {
                          style: "currency",
                          currency: rate.currency || "CAD",
                        }).format(rate.amount)}
                      </strong>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </Dialog>

      <ConfirmDialog
        open={confirming === "refund"}
        title="Refund this order?"
        confirmLabel="Refund order"
        message={`${money(order.total)} — ${isManualPayment ? "Refund this paid manual order?" : "Refund this paid order through Stripe?"}${restockOnRefund ? " The purchased quantities will also be restocked." : ""} This action is irreversible.`}
        onConfirm={handleRefund}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === "cancel"}
        title="Cancel this unpaid order?"
        confirmLabel="Cancel order"
        message="No Stripe refund will be created."
        onConfirm={handleCancelUnpaid}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
