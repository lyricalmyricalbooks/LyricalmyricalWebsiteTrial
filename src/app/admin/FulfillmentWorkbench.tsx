import React from "react";
import { Check, MapPin, Package, Truck, ExternalLink } from "lucide-react";
import {
  addressIssues,
  addressKey,
  packingKey,
  physicalItems,
  isDigitalItem,
  queueOf,
} from "./fulfillment";
import {
  Checkbox,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from "./riso/components";
import "./fulfillment.css";

type Props = {
  order: any;
  checked: Set<number>;
  busy: boolean;
  onCheck: (index: number) => void;
  onReview: () => void;
  onCorrect: () => void;
  onPack: () => void;
  onLabel: () => void;
  onDispatch: () => void;
  onRelease: () => void;
};
export function FulfillmentWorkbench({
  order,
  checked,
  busy,
  onCheck,
  onReview,
  onCorrect,
  onPack,
  onLabel,
  onDispatch,
  onRelease,
}: Props) {
  const queue = queueOf(order);
  const addr = order.customer?.address || {};
  const reviewed = order.operations?.addressReviewed === addressKey(order);
  const packed = order.operations?.packed === packingKey(order);
  const shipping = physicalItems(order).length > 0;
  const active =
    ["Needs attention", "Ready to pack", "Ready to ship"].includes(queue) &&
    !order.isTest;
  const hold = order.operations?.hold;
  const issues = active ? addressIssues(order) : [];
  const labelPending = order.operations?.labelPurchasePending;
  const addressActive = active && !reviewed && !hold;
  const packingActive = queue === "Ready to pack";
  const shippingActive = queue === "Ready to ship";
  return (
    <section
      className="rp-card fw-workbench"
      aria-label="Fulfillment workspace"
    >
      <div className="fw-panel-head">
        <h2>Fulfillment</h2>
        <StatusBadge
          tone={
            queue === "Needs attention"
              ? "warning"
              : queue === "Completed"
                ? "success"
                : "neutral"
          }
        >
          {queue}
        </StatusBadge>
      </div>
      {hold && active && (
        <div className="fw-notice" role="status">
          <div>
            <strong>Order on hold</strong>
            <p>{hold}</p>
          </div>
          <SecondaryButton disabled={busy} onClick={onRelease}>
            Release hold
          </SecondaryButton>
        </div>
      )}
      {queue === "Unpaid" && (
        <p className="fw-notice">
          Payment has not been confirmed. Fulfillment will unlock when payment
          clears.
        </p>
      )}
      {!shipping && order.items?.length > 0 && (
        <p className="fw-notice">
          Digital order — download access is handled automatically after
          payment. No parcel is required.
        </p>
      )}
      {order.status === "cancelled" && (
        <p className="fw-notice">This order is cancelled.</p>
      )}
      {shipping && (
        <div className="fw-step" data-active={addressActive}>
          <div className="fw-step-heading">
            <span className="fw-step-icon" aria-hidden="true">
              {reviewed ? <Check size={18} /> : <MapPin size={18} />}
            </span>
            <div>
              <h3>Shipping address</h3>
              {reviewed && <span className="rp-hint">Reviewed</span>}
            </div>
            {active && reviewed && !order.labelUrl && !labelPending && (
              <SecondaryButton size="sm" onClick={onCorrect} disabled={busy}>
                Edit
              </SecondaryButton>
            )}
          </div>
          {!reviewed || !active ? (
            <address className="fw-address">
              <strong>{order.customer?.name}</strong>
              <span>{addr.street}</span>
              <span>
                {addr.city}
                {addr.state ? `, ${addr.state}` : ""} {addr.zip}
              </span>
              <span>{addr.country}</span>
            </address>
          ) : (
            <details className="fw-address-details">
              <summary>
                {addr.city}, {addr.state} {addr.zip} · {addr.country}
              </summary>
              <address className="fw-address">
                <strong>{order.customer?.name}</strong>
                <span>{addr.street}</span>
                <span>
                  {addr.city}, {addr.state} {addr.zip}
                </span>
                <span>{addr.country}</span>
              </address>
            </details>
          )}
          {addressActive && (
            <>
              {issues.length > 0 && (
                <ul className="fw-problems" role="alert">
                  {issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
              <div className="fw-actions">
                {issues.length ? (
                  <PrimaryButton disabled={busy} onClick={onCorrect}>
                    Correct address
                  </PrimaryButton>
                ) : (
                  <PrimaryButton disabled={busy} onClick={onReview}>
                    Confirm address
                  </PrimaryButton>
                )}
                {!issues.length && (
                  <SecondaryButton disabled={busy} onClick={onCorrect}>
                    Edit address
                  </SecondaryButton>
                )}
              </div>
            </>
          )}
        </div>
      )}
      <div className="fw-step" data-active={packingActive}>
        <div className="fw-step-heading">
          <span className="fw-step-icon" aria-hidden="true">
            {packed ? <Check size={18} /> : <Package size={18} />}
          </span>
          <div>
            <h3>{shipping ? "Books to pack" : "Order items"}</h3>
            <span className="rp-hint">
              {packed
                ? "All books packed"
                : `${(order.items || []).reduce((n: number, i: any) => n + Number(i.quantity || 0), 0)} items`}
            </span>
          </div>
        </div>
        <ul className="fw-items" aria-label="Order items">
          {(order.items || []).map((item: any, index: number) => (
            <li key={index}>
              {packingActive && !isDigitalItem(item) ? (
                <Checkbox
                  label=""
                  aria-label={`Packed ${item.quantity} × ${item.title}`}
                  checked={checked.has(index)}
                  disabled={busy}
                  onChange={() => onCheck(index)}
                />
              ) : packed && !isDigitalItem(item) ? (
                <Check
                  className="fw-item-check"
                  size={16}
                  aria-label="Packed"
                />
              ) : null}
              {item.photoUrl && (
                <img src={item.photoUrl} alt="" width="36" height="48" />
              )}
              <div className="fw-item-name">
                <strong>{item.title}</strong>
                <span className="rp-hint">
                  {[item.variantName, item.format, item.sku]
                    .filter(Boolean)
                    .join(" · ")}
                  {isDigitalItem(item) ? " · Digital" : ""}
                </span>
              </div>
              <span className="fw-quantity">× {item.quantity}</span>
            </li>
          ))}
        </ul>
        {!order.items?.length && (
          <p className="fw-problems" role="alert">
            This order has no items. Resolve the order data before fulfillment.
          </p>
        )}
        {packingActive && (
          <div className="fw-actions">
            <PrimaryButton
              disabled={busy || checked.size !== physicalItems(order).length}
              onClick={onPack}
            >
              Confirm packed
            </PrimaryButton>
            <span className="rp-hint">
              {checked.size} of {physicalItems(order).length} lines checked
            </span>
          </div>
        )}
      </div>
      {shipping && (
        <div className="fw-step" data-active={shippingActive}>
          <div className="fw-step-heading">
            <span className="fw-step-icon" aria-hidden="true">
              <Truck size={18} />
            </span>
            <div>
              <h3>Shipping & dispatch</h3>
              <span className="rp-hint">
                {queue === "In transit"
                  ? "Handed to carrier"
                  : queue === "Completed"
                    ? "Closed"
                    : order.labelUrl
                      ? "Label purchased · awaiting dispatch"
                      : "After packing"}
              </span>
            </div>
          </div>
          {labelPending && active && !order.labelUrl ? (
            <p className="fw-problems" role="alert">
              A label purchase needs checking.{" "}
              <a
                href="https://app.goshippo.com/orders"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Shippo
              </a>{" "}
              before trying again.
            </p>
          ) : (
            shippingActive && (
              <>
                <p className="fw-summary">
                  {order.labelUrl
                    ? `${order.trackingCarrier || "Carrier"} · ${order.trackingNumber || "Tracking pending"}`
                    : "Buy a Canada Post label, or use tracking from a label you already have."}
                </p>
                <div className="fw-actions">
                  {order.labelUrl ? (
                    <>
                      <PrimaryButton onClick={onDispatch} disabled={busy}>
                        Confirm dispatch
                      </PrimaryButton>
                    </>
                  ) : (
                    <>
                      <PrimaryButton disabled={busy} onClick={onLabel}>
                        Choose shipping label
                      </PrimaryButton>
                      <SecondaryButton disabled={busy} onClick={onDispatch}>
                        Use my own tracking
                      </SecondaryButton>
                    </>
                  )}
                </div>
              </>
            )
          )}
          {order.labelUrl && (
            <div className="fw-actions">
              {" "}
              <a
                className="rp-btn rp-btn-secondary rp-btn-sm"
                href={order.labelUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} aria-hidden="true" />
                Reprint label
              </a>
            </div>
          )}
          {queue === "In transit" && (
            <p className="fw-summary">
              {order.trackingCarrier || "Carrier"} ·{" "}
              {order.trackingNumber || "No tracking recorded"}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
