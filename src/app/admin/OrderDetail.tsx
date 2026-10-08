import { ReturnWorkbench } from "./ReturnWorkbench";
import { FulfillmentWorkbench } from "./FulfillmentWorkbench";
import { CARRIERS, cleanTrackingLink, getTrackingUrl } from "../lib/tracking";
import {
  addressKey,
  packingKey,
  queueOf,
  dispatchProblem,
  matchesCustomerService,
  suggestedParcelWeightLb,
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

export function OrderDetail({
  orderId,
  onClose,
  queueIds = [],
  onNavigate,
  onChanged,
}: {
  orderId: string;
  onClose: () => void;
  queueIds?: string[];
  onNavigate?: (id: string) => void;
  /** Called whenever the order is (re)loaded — after any action or a Stripe sync — so a list beside it can refresh. */
  onChanged?: (order: any) => void;
}) {
  const queueIndex = queueIds.indexOf(orderId);
  const prevId = queueIndex > 0 ? queueIds[queueIndex - 1] : "";
  const nextId = queueIndex >= 0 && queueIndex < queueIds.length - 1 ? queueIds[queueIndex + 1] : "";
  // After finishing an order, move straight to the next one in the same queue.
  const goToNext = () => {
    if (!nextId || !onNavigate) return false;
    onNavigate(nextId);
    return true;
  };
  const [order, setOrder] = useState<any>(null);
  useEffect(() => { if (order) onChanged?.(order); }, [order]);
  // Catalog records for the order's books: current cover + shelf location on the packing checklist.
  const [books, setBooks] = useState<Record<string, any>>({});
  const bookIds = Array.from(new Set((order?.items || []).map((i: any) => i?.id).filter((id: any) => typeof id === "string" && id))).sort().join("|");
  useEffect(() => {
    if (!bookIds) return;
    let alive = true;
    Promise.all(bookIds.split("|").map((id) => adminApi.getBook(id).catch(() => null)))
      .then((list) => { if (alive) setBooks(Object.fromEntries(list.filter(Boolean).map((b: any) => [b.id, b]))); });
    return () => { alive = false; };
  }, [bookIds]);
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
  const parcelTouched = useRef(false);
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

  // Any order paid (or being paid) through Stripe: ask Stripe (server-side) once per
  // visit for the truth — payment received, refunded or disputed — so a missed
  // webhook never leaves the order out of step with Stripe.
  const autoChecked = useRef<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const hasStripePayment = (o: any) =>
    !!o && ["unpaid", "paid"].includes(o.paymentStatus) && (String(o.stripePaymentIntentId || "").startsWith("pi_") || String(o.stripeCheckoutSessionId || "").startsWith("cs_"));

  async function checkStripePayment(manual: boolean) {
    setCheckingPayment(true);
    const before = order?.paymentStatus;
    try {
      const report = await adminApi.recheckStripePayment(orderId);
      const fresh = await adminApi.getOrderById(orderId);
      if (fresh) setOrder(fresh);
      if (fresh?.paymentStatus === "refunded" && before !== "refunded") toast.success("Stripe shows this payment was refunded — order updated and stock returned.");
      else if (fresh?.paymentStatus === "paid" && before === "unpaid") toast.success("Stripe confirmed the payment — order marked paid.");
      else if (fresh?.paymentMismatch && fresh?.paymentStatus !== "paid") toast.error("Stripe's amount doesn't match this order. Review it in Stripe before fulfilling.");
      else if (manual) toast((report as any).awaitingWebhook ? "Stripe received payment. The order is awaiting its verified webhook; review Webhook health before shipping." : fresh?.paymentStatus === "paid" ? "Order payment was confirmed by the webhook." : "Stripe has not confirmed this payment yet.");
    } catch (err: any) {
      if (manual) toast.error(err.message || "Couldn't reach Stripe.");
    } finally {
      setCheckingPayment(false);
    }
  }

  async function loadOrder() {
    setLoadFailed(false);
    try {
      const data = await adminApi.getOrderById(orderId);
      setOrder(data);
      if (hasStripePayment(data) && autoChecked.current !== orderId) {
        autoChecked.current = orderId;
        void checkStripePayment(false);
      }
      if (data) {
        fillTracking(data);
        // Start the label dialog from the books' catalog weights, not a fixed 1.5 lb.
        if (!parcelTouched.current) setParcel((p) => ({ ...p, weight: suggestedParcelWeightLb(data) }));
      }
    } catch (err) {
      console.error(err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  // "dispatch" = first hand-off to the carrier; "edit" = correct tracking on a parcel already in transit.
  const [showShipForm, setShowShipForm] = useState<false | "dispatch" | "edit">(false);
  const [trackingCarrier, setTrackingCarrier] = useState("Canada Post");
  const [otherCarrier, setOtherCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingLink, setTrackingLink] = useState("");
  const [isShipping, setIsShipping] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<null | "out_for_delivery" | "delivered">(null);
  const [confirmResend, setConfirmResend] = useState(false);
  // Pickup / local delivery hand-off waiting for confirmation (e.g. "mark the order ready for pickup").
  const [localStep, setLocalStep] = useState<string | null>(null);
  const [emailSettings, setEmailSettings] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    adminApi.getNotificationSettings().then(setEmailSettings).catch(() => setEmailSettings(null));
  }, []);
  const emailOn = (id: string) => emailSettings?.[id]?.enabled !== false;
  const carrierName = trackingCarrier === "Other" ? otherCarrier.trim() : trackingCarrier;

  function fillTracking(data: any) {
    const carrier = String(data?.trackingCarrier || "").trim();
    const known = !carrier || CARRIERS.includes(carrier);
    setTrackingCarrier(known ? carrier || "Canada Post" : "Other");
    setOtherCarrier(known ? "" : carrier);
    setTrackingNumber(data?.trackingNumber || "");
    setTrackingLink(data?.trackingUrl || "");
  }

  useEffect(() => {
    setChecked(new Set());
  }, [order ? packingKey(order) : ""]);

  const markAsShipped = async () => {
    if (!trackingNumber.trim() || !carrierName) {
      toast.error("Enter the carrier and tracking number.");
      return;
    }
    const editing = showShipForm === "edit";
    setIsShipping(true);
    try {
      await adminApi.fulfillmentAction(orderId, editing ? "edit_tracking" : "dispatch", {
        trackingCarrier: carrierName,
        trackingNumber,
        trackingUrl: trackingLink,
      });
      setShowShipForm(false);
      toast.success(editing ? "Tracking updated" : "Order marked as shipped");
      if (editing || !goToNext()) loadOrder();
    } catch (err: any) {
      toast.error(err?.message || "Error updating order.");
    } finally {
      setIsShipping(false);
    }
  };

  // Shippo label already holds the carrier and number: one click marks it shipped
  // and sends the customer's Shipping confirmation email.
  const handOverToCarrier = async () => {
    if (!order?.labelUrl || !order.trackingNumber) {
      fillTracking(order);
      setShowShipForm("dispatch");
      return;
    }
    setIsShipping(true);
    try {
      await adminApi.fulfillmentAction(orderId, "dispatch", {
        trackingCarrier: order.trackingCarrier || "Canada Post",
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl || "",
      });
      toast.success(
        emailOn("shipping_confirmation")
          ? `Shipped — tracking emailed to ${order.customer?.email || "the customer"}`
          : "Marked shipped (shipping email is switched off)",
      );
      if (!goToNext()) loadOrder();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't mark the order shipped.");
    } finally {
      setIsShipping(false);
    }
  };

  const resendShippingEmail = async () => {
    setIsShipping(true);
    try {
      await adminApi.fulfillmentAction(orderId, "resend_shipping_email");
      setConfirmResend(false);
      loadOrder();
      toast.success("Shipping email sent again");
    } catch (err: any) {
      toast.error(err?.message || "Couldn't resend the email.");
    } finally {
      setIsShipping(false);
    }
  };

  const updateDeliveryStatus = async () => {
    if (!deliveryStatus) return;
    setIsShipping(true);
    try {
      await adminApi.fulfillmentAction(orderId, "delivery_status", { status: deliveryStatus });
      setDeliveryStatus(null);
      loadOrder();
      toast.success(deliveryStatus === "delivered" ? "Marked delivered" : "Marked out for delivery");
    } catch (err: any) {
      toast.error(err?.message || "Error updating order.");
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
      // Pre-select the service the customer paid for at checkout; never silently swap it.
      const chosen = (result.rates || []).find((r: any) => matchesCustomerService(r.name, order?.shippingMethod));
      setSelectedLabelRate(chosen?.id || (order?.shippingMethod ? "" : result.rates?.[0]?.id || ""));
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
    setConfirming(null);
    setIsVoiding(true);
    try {
      const result = await adminApi.refundOrder(orderId, {
        reason: refundReason,
        restock: restockOnRefund,
      });
      const pending = result?.status === "pending";
      toast.success(
        result?.provider === "manual"
          ? "Order marked as refunded. Send the money back the way the customer paid."
          : `${result?.provider === "paypal" ? "PayPal" : "Stripe"} refund ${pending ? "started — the order updates when it completes" : "issued and order cancelled"}`,
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
    action: "review" | "pack" | "hold" | "release" | "local_transition",
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
                : action === "release"
                  ? "Hold released"
                  : "Local fulfillment updated",
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
        {onNavigate && queueIndex >= 0 && queueIds.length > 1 && (
          <div className="fw-toolbar-actions" aria-label="Order navigation">
            <SecondaryButton size="sm" disabled={!prevId} onClick={() => prevId && onNavigate(prevId)}>
              ← Previous
            </SecondaryButton>
            <span className="rp-hint">
              Order {queueIndex + 1} of {queueIds.length}
            </span>
            <SecondaryButton size="sm" disabled={!nextId} onClick={() => nextId && onNavigate(nextId)}>
              Next →
            </SecondaryButton>
          </div>
        )}
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
          books={books}
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
          onDispatch={() => {
            fillTracking(order);
            setShowShipForm("dispatch");
          }}
          onEditTracking={() => {
            fillTracking(order);
            setShowShipForm("edit");
          }}
          onDeliveryStatus={setDeliveryStatus}
          onResendEmail={() => setConfirmResend(true)}
          onCheckAll={(indices) => setChecked(new Set(indices))}
          onPackingSlip={handlePrintPackingSlip}
          onHandedOver={handOverToCarrier}
          onLocalAdvance={() => {
            const next = order.fulfillmentSelection?.method === "pickup"
              ? order.fulfillmentStatus === "ready_for_pickup" ? "record customer collection" : "mark the order ready for pickup"
              : order.fulfillmentStatus === "ready_for_delivery" ? "start local delivery" : order.fulfillmentStatus === "out_for_delivery" ? "mark the order delivered" : "mark the order ready for delivery";
            setLocalStep(next);
          }}
          onRelease={() => perform("release")}
        />
        <aside className="rp-stack" aria-label="Order summary">
          {order.customerRequest?.type === "return" && <ReturnWorkbench key={`${order.id}-${order.returnProgress?.state || "requested"}`} order={order} onUpdated={loadOrder} />}
          {order.customerRequest?.status === "open" && order.customerRequest.type !== "return" && (
            <SectionCard title={order.customerRequest.type === "cancel" ? "Customer asks to cancel" : "Customer asks to return"}>
              <p className="fw-summary">
                Asked {new Date(order.customerRequest.createdAt).toLocaleString()}.
                {order.customerRequest.type === "cancel"
                  ? " Cancel or refund it from More order actions, or reply to explain why it has already gone out."
                  : " Agree the return with the customer, then refund from More order actions when the books are back."}
              </p>
              {order.customerRequest.message && <blockquote className="fw-summary">“{order.customerRequest.message}”</blockquote>}
              <SecondaryButton
                disabled={working}
                onClick={async () => {
                  try {
                    await adminApi.updateOrder(order.id, { customerRequest: { ...order.customerRequest, status: "handled", handledAt: new Date().toISOString() } });
                    toast.success("Request marked handled.");
                    await loadOrder();
                  } catch (err: any) {
                    toast.error(err?.message || "Couldn't update the request.");
                  }
                }}
              >
                Mark request handled
              </SecondaryButton>
            </SectionCard>
          )}
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
                      `${order.customer?.name || ""}\n${[addr.street, addr.unit].filter(Boolean).join(", ")}\n${addr.city || ""}, ${addr.state || ""} ${addr.zip || ""}\n${addr.country || ""}`,
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
            {hasStripePayment(order) && (
              <div className="fw-actions">
                <SecondaryButton size="sm" disabled={checkingPayment} onClick={() => checkStripePayment(true)}>
                  {checkingPayment ? "Checking with Stripe…" : "Sync with Stripe"}
                </SecondaryButton>
              </div>
            )}
            {order.stripePaymentIntentId && (
              <div className="fw-actions">
                <a
                  className="rp-btn rp-btn-secondary rp-btn-sm"
                  href={`https://dashboard.stripe.com/${order.stripeMode === "test" ? "test/" : ""}payments/${order.stripePaymentIntentId}`}
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
                    order.trackingUrl,
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
                if (selected) {
                  parcelTouched.current = true;
                  // Keep the box size; the weight still comes from this order's books.
                  setParcel({ ...selected.parcel, weight: suggestedParcelWeightLb(order) });
                }
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
                onChange={(e) => {
                  parcelTouched.current = true;
                  setParcel((prev) => ({ ...prev, [k]: e.target.value }));
                }}
                hint={k === "weight" ? `Suggested ${suggestedParcelWeightLb(order)} lb from the books' catalog weights plus packaging.` : undefined}
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
        open={!!showShipForm}
        onClose={() => !isShipping && setShowShipForm(false)}
        title={showShipForm === "edit" ? "Correct tracking" : "Confirm dispatch"}
        description={
          showShipForm === "edit"
            ? "Fix the carrier, tracking number or link. The customer is not emailed again; their account and order tracking page show the new details."
            : "Confirm only after handing the parcel to the carrier. This sends the customer's shipping notification."
        }
        footer={
          <>
            <SecondaryButton
              disabled={isShipping}
              onClick={() => setShowShipForm(false)}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              disabled={
                isShipping ||
                (showShipForm === "dispatch" && !!problem) ||
                !trackingNumber.trim() ||
                !carrierName ||
                (!!trackingLink.trim() && !cleanTrackingLink(trackingLink))
              }
              onClick={markAsShipped}
            >
              {isShipping
                ? "Saving…"
                : showShipForm === "edit"
                  ? "Save tracking"
                  : "Mark as shipped"}
            </PrimaryButton>
          </>
        }
      >
        <div className="rp-stack">
          {order.labelUrl && showShipForm === "dispatch" ? (
            <p className="fw-summary" style={{ margin: 0 }}>
              <strong>Shippo label:</strong> {order.trackingCarrier || "Carrier"} ·{" "}
              {order.trackingNumber || "Tracking pending"}
            </p>
          ) : (
          <>
          <SelectField
            label="Carrier"
            value={trackingCarrier}
            onChange={(e) => setTrackingCarrier(e.target.value)}
          >
            {[...CARRIERS, "Other"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          {trackingCarrier === "Other" && (
            <TextField
              label="Carrier name"
              value={otherCarrier}
              onChange={(e) => setOtherCarrier(e.target.value)}
              maxLength={80}
              placeholder="e.g. Intelcom"
            />
          )}
          <TextField
            label="Tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            maxLength={100}
            placeholder="Enter the carrier tracking number"
          />
          <TextField
            label="Tracking link (optional)"
            value={trackingLink}
            onChange={(e) => setTrackingLink(e.target.value)}
            placeholder="https://…"
            error={
              trackingLink.trim() && !cleanTrackingLink(trackingLink)
                ? "The link must start with https://"
                : undefined
            }
            hint="Leave blank to use the carrier's own tracking page. Paste a link for carriers we don't recognise."
          />
          {trackingNumber.trim() && carrierName && (
            <a
              className="rp-btn rp-btn-secondary rp-btn-sm"
              href={getTrackingUrl(carrierName, trackingNumber, trackingLink)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ alignSelf: "flex-start" }}
            >
              Test tracking link <ExternalLink size={12} aria-hidden />
            </a>
          )}
          </>
          )}
          {showShipForm === "dispatch" && (
            <p className="rp-hint" role="status" style={{ margin: 0 }}>
              {emailOn("shipping_confirmation")
                ? `Customer will be emailed: Shipping confirmation to ${order.customer?.email || "their address"}, with the tracking link.`
                : "The Shipping confirmation email is switched off (Settings › Notifications), so the customer will not be emailed."}
            </p>
          )}
        </div>
      </Dialog>
      <Dialog
        open={!!deliveryStatus}
        onClose={() => !isShipping && setDeliveryStatus(null)}
        title={deliveryStatus === "delivered" ? "Mark delivered?" : "Mark out for delivery?"}
        description={
          deliveryStatus === "delivered"
            ? "Use this when the carrier shows the parcel as delivered. The order moves to Completed and the customer gets the Delivery update email (if it is switched on)."
            : "Use this when the carrier shows the parcel out for delivery. The customer gets the Delivery update email (if it is switched on)."
        }
        footer={
          <>
            <SecondaryButton disabled={isShipping} onClick={() => setDeliveryStatus(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton disabled={isShipping} onClick={updateDeliveryStatus}>
              {isShipping
                ? "Saving…"
                : deliveryStatus === "delivered"
                  ? "Mark delivered"
                  : "Mark out for delivery"}
            </PrimaryButton>
          </>
        }
      >
        <p className="rp-hint" style={{ margin: 0 }}>
          {order.trackingCarrier || "Carrier"} · {order.trackingNumber || "No tracking recorded"}
        </p>
      </Dialog>
      <Dialog
        open={!!localStep}
        onClose={() => !working && setLocalStep(null)}
        title="Confirm this step?"
        description={localStep ? `You're about to ${localStep}.` : ""}
        footer={
          <>
            <SecondaryButton disabled={working} onClick={() => setLocalStep(null)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              disabled={working}
              onClick={async () => {
                await perform("local_transition", { expectedStatus: order.fulfillmentStatus || "" });
                setLocalStep(null);
              }}
            >
              Confirm
            </PrimaryButton>
          </>
        }
      >
        <p className="rp-hint" style={{ margin: 0 }}>
          {order.fulfillment?.name || "Local order"}
        </p>
      </Dialog>
      <Dialog
        open={confirmResend}
        onClose={() => !isShipping && setConfirmResend(false)}
        title="Resend shipping email?"
        description={`Sends the Shipping confirmation email to ${order.customer?.email || "the customer"} again with the current tracking.`}
        footer={
          <>
            <SecondaryButton disabled={isShipping} onClick={() => setConfirmResend(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton disabled={isShipping || !emailOn("shipping_confirmation")} onClick={resendShippingEmail}>
              {isShipping ? "Sending…" : "Resend email"}
            </PrimaryButton>
          </>
        }
      >
        <p className="rp-hint" style={{ margin: 0 }}>
          {emailOn("shipping_confirmation")
            ? `${order.trackingCarrier || "Carrier"} · ${order.trackingNumber || "No tracking recorded"}`
            : "The Shipping confirmation email is switched off in Settings › Notifications."}
        </p>
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
            {["street", "unit", "city", "state", "zip", "country"].map((k) => (
              <TextField
                key={k}
                label={
                  k === "unit" ? "Apartment / unit (optional)" : k === "state"
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
        description="The service the customer paid for is pre-selected. Buying a label charges your Shippo account. The customer is emailed only when you confirm dispatch."
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
            {order.shippingMethod && (
              <p className="rp-hint" style={{ margin: "0 0 10px" }}>
                Customer chose <strong>{order.shippingMethod}</strong> and paid {money(order.shipping)} for shipping.
              </p>
            )}
            {order.shippingMethod && !labelRates.some((r) => matchesCustomerService(r.name, order.shippingMethod)) && (
              <p className="fw-problems" role="alert">
                The customer's service isn't offered for this parcel. Choose the closest service yourself.
              </p>
            )}
            {(() => {
              const picked = labelRates.find((r) => r.id === selectedLabelRate);
              return picked && Number(picked.amount) > Number(order.shipping || 0) ? (
                <p className="rp-hint" role="status" style={{ margin: "0 0 10px" }}>
                  This label costs more than the customer paid for shipping.
                </p>
              ) : null;
            })()}
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
                      {matchesCustomerService(rate.name, order.shippingMethod) ? (
                        <StatusBadge tone="info">Customer chose</StatusBadge>
                      ) : index === 0 ? (
                        <StatusBadge tone="success">Cheapest</StatusBadge>
                      ) : null}
                      <strong
                        className="rp-mono"
                        style={{
                          display: "block",
                          marginTop: index === 0 || matchesCustomerService(rate.name, order.shippingMethod) ? 6 : 0,
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
