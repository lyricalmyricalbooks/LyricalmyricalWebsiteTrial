import { regionProps } from "./storefrontRegions";
import { getTrackingUrl } from "../../lib/tracking";
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { 
  ArrowLeft, Lock, Package, Truck, CheckCircle2, 
  MapPin, Calendar, AlertCircle, Loader2, Download, ExternalLink 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { adminApi } from "../../admin/api";
import { functionUrl } from "../../lib/functionsBase";
import { useCurrency } from "../../CurrencyContext";
import { useSiteData } from "./useSiteData";
import { StorefrontThemeStyle } from "./StorefrontThemeStyle";
import { getCopy } from "./storeCopy";
import { GlobalSections, TemplateSections } from "../../components/sectionRender";
import { orderStage, orderStep, shippingDays, stepDates } from "./orderStatus";

export default function OrderTracking() {
  const [orderIdInput, setOrderIdInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [digitalItems, setDigitalItems] = useState<Record<string, boolean>>({});
  
  const { formatPrice, currency: defaultCurrency } = useCurrency();
  const { settings, books } = useSiteData();

  // If order is already found, check if items have digital formats
  useEffect(() => {
    if (!order) return;
    // ⚡ Bolt: Eliminate sequential DB reads by fetching all items in the order concurrently.
    async function checkDigitalAssets() {
      const digitalMap: Record<string, boolean> = {};
      await Promise.all(
        (order.items || []).map(async (item: any) => {
          try {
            const book = await adminApi.getBook(item.id);
            if (book && book.digitalFileName) {
              digitalMap[item.id] = true;
            }
          } catch (err) {
            console.warn("Could not retrieve book metadata for digital check", err);
          }
        })
      );
      setDigitalItems(digitalMap);
    }
    checkDigitalAssets();
  }, [order]);

  // Email links carry ?orderId=…&key=…: a matching key opens the order straight away;
  // otherwise the order number is filled in and the customer confirms their email.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedId = (params.get("orderId") || "").trim();
    const key = (params.get("key") || "").trim();
    if (!linkedId) return;
    setOrderIdInput(linkedId);
    if (!key) return;
    let cancelled = false;
    setLoading(true);
    adminApi.getPublicOrder(linkedId)
      .then((found: any) => { if (!cancelled && found && found.trackingKey === key) setOrder(found); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Order numbers are shown in capitals; accept them typed in any case.
  const findOrder = async (typed: string) => {
    const exact = await adminApi.getPublicOrder(typed);
    if (exact || typed === typed.toUpperCase()) return exact;
    return adminApi.getPublicOrder(typed.toUpperCase());
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdInput.trim() || !emailInput.trim()) {
      setError(getCopy(settings?.design, "trackErrFill"));
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const foundOrder: any = await findOrder(orderIdInput.trim());
      if (!foundOrder) {
        setError(getCopy(settings?.design, "trackErrNotFound"));
        return;
      }

      if (foundOrder.customer?.email?.toLowerCase().trim() !== emailInput.toLowerCase().trim()) {
        setError(getCopy(settings?.design, "trackErrEmail"));
        return;
      }

      setOrder(foundOrder);
    } catch (err: any) {
      setError(getCopy(settings?.design, "trackError"));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (itemId: string) => {
    if (!order || !order.downloadToken) return;
    // The download endpoint authorizes via the secret token issued at
    // payment time, not the (guessable) customer email.
    window.open(
      `${functionUrl("downloadDigitalAsset")}?orderId=${encodeURIComponent(order.id || order.orderId)}&itemId=${encodeURIComponent(itemId)}&token=${encodeURIComponent(order.downloadToken)}`,
      "_blank"
    );
  };

  const fulfillment = order?.fulfillment;
  const fulfillmentStatus = String(order?.fulfillmentStatus || order?.status || "").toLowerCase();
  const isPickup = fulfillment?.method === "pickup";
  const isLocalDelivery = fulfillment?.method === "local_delivery";
  const currentStep = orderStep(order);
  const stage = orderStage(order);
  const dates = stepDates(order);
  const days = shippingDays(order);
  const shipAddress = order?.customer?.address || {};

  const shippingSteps = [
    { label: getCopy(settings?.design, "trackStepPaid"), desc: getCopy(settings?.design, "trackStepPaidDesc"), icon: CheckCircle2 },
    { label: getCopy(settings?.design, "trackStepProcessing"), desc: getCopy(settings?.design, "trackStepProcessingDesc"), icon: Package },
    { label: getCopy(settings?.design, fulfillmentStatus === "out_for_delivery" ? "trackOutForDelivery" : "trackStepShipped"), desc: getCopy(settings?.design, "trackStepShippedDesc"), icon: Truck },
    { label: getCopy(settings?.design, "trackStepDelivered"), desc: getCopy(settings?.design, "trackStepDeliveredDesc"), icon: MapPin },
  ];
  const localSteps = isPickup ? [
    shippingSteps[0],
    shippingSteps[1],
    { label: getCopy(settings?.design, "trackPickupReady"), desc: fulfillment?.estimate || getCopy(settings?.design, "trackStepProcessingDesc"), icon: MapPin },
    { label: getCopy(settings?.design, "trackCollected"), desc: getCopy(settings?.design, "trackStepDeliveredDesc"), icon: CheckCircle2 },
  ] : [
    shippingSteps[0],
    { label: getCopy(settings?.design, "trackReadyForDelivery"), desc: fulfillment?.estimate || getCopy(settings?.design, "trackStepProcessingDesc"), icon: Package },
    { label: getCopy(settings?.design, "trackOutForDelivery"), desc: getCopy(settings?.design, "trackStepShippedDesc"), icon: Truck },
    shippingSteps[3],
  ];
  const steps = isPickup || isLocalDelivery ? localSteps : shippingSteps;

  // Format order prices using checkout currency if available, else fallback
  const orderFormatPrice = (priceInCAD: number) => {
    if (order?.checkoutCurrency && order?.exchangeRate) {
      const symbols: Record<string, string> = { CAD: "CA$ ", USD: "$ ", EUR: "€ " };
      const symbol = symbols[order.checkoutCurrency] || "$ ";
      const converted = priceInCAD * order.exchangeRate;
      return `${symbol}${converted.toFixed(2)}`;
    }
    return formatPrice(priceInCAD);
  };

  return (
    <div data-fm-store data-studio-target="copy:Order tracking|style:colors" data-studio-label="Order tracking page" className="min-h-screen fm-page text-white font-sans selection:bg-[rgba(var(--accent-rgb),0.3)] relative overflow-hidden pb-24">
      <StorefrontThemeStyle design={settings?.design} />
      {/* Ambient background glow */}
      <div {...regionProps("trackingGlow")}
        className="fixed top-0 right-0 w-[600px] h-[600px] blur-[140px] rounded-full pointer-events-none -mr-72 -mt-72"
        style={{ backgroundColor: "rgba(var(--accent-rgb), 0.08)" }}
      />
      <div {...regionProps("trackingGlow")} className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <nav {...regionProps("trackingHeader")} className="relative z-10 px-8 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-black/20">
        <Link to="/" className="flex items-center gap-3 text-[10px] font-black tracking-[0.3em] text-white/40 hover:text-white transition-colors group uppercase">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {getCopy(settings?.design, "trackBack")}
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full fm-accent-bg animate-pulse" />
          <span className="text-[9px] font-black tracking-[0.3em] text-white/60 uppercase">{getCopy(settings?.design, "trackEyebrow")}</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-16 relative z-10">
        <AnimatePresence mode="wait">
          {!order ? (
            /* Search Form */
            <motion.div {...regionProps("trackingForm")}
              key="search-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white/[0.03] border border-white/8 rounded-[2.5rem] p-10 backdrop-blur-xl max-w-lg mx-auto shadow-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] to-transparent pointer-events-none" />
              <div {...regionProps("trackingIntro")} className="text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-6 mx-auto shadow-[0_0_40px_rgba(var(--accent-rgb),0.2)]">
                  <Lock size={24} className="fm-accent-text" />
                </div>
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">{getCopy(settings?.design, "trackTitle")}</h2>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/60 mt-2 font-bold">{getCopy(settings?.design, "trackSubtitle")}</p>
              </div>

              <form onSubmit={handleTrack} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black fm-muted uppercase tracking-[0.2em] block ml-1">{getCopy(settings?.design, "trackOrderLabel")}</label>
                  <input
                    type="text"
                    required
                    placeholder={getCopy(settings?.design, "trackOrderPlaceholder")}
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all font-mono uppercase placeholder:text-[var(--muted)]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black fm-muted uppercase tracking-[0.2em] block ml-1">{getCopy(settings?.design, "trackEmailLabel")}</label>
                  <input
                    type="email"
                    required
                    placeholder={getCopy(settings?.design, "trackEmailPlaceholder")}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all placeholder:text-[var(--muted)]"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-[10px] font-black tracking-widest text-red-400 uppercase">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full fm-accent-bg hover:bg-violet-500 text-white py-5 rounded-2xl text-[10px] font-black tracking-[0.4em] uppercase transition-all active:scale-[0.98] disabled:opacity-60 shadow-[0_15px_40px_rgba(var(--accent-rgb),0.3)] flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> {getCopy(settings?.design, "trackLoading")}</>
                  ) : (
                    getCopy(settings?.design, "trackSubmit")
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* Order Status Display */
            <motion.div
              key="order-display"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              {/* Reset button */}
              <button 
                onClick={() => setOrder(null)} 
                className="flex items-center gap-2 text-[9px] font-black tracking-[0.25em] text-white/60 hover:text-white uppercase transition-colors"
              >
                <ArrowLeft size={12} /> {getCopy(settings?.design, "trackAnother")}
              </button>

              {/* Order Header Summary */}
              <div {...regionProps("trackingSummary")} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] font-black tracking-[0.3em] fm-accent-text uppercase mb-2">{getCopy(settings?.design, "trackFound")}</p>
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">{getCopy(settings?.design, "coOrderNumber", { number: order.orderId })}</h2>
                  <p className="text-[10px] font-mono text-white/60 mt-3 uppercase tracking-widest flex items-center gap-3">
                    <Calendar size={12} /> {getCopy(settings?.design, "trackCreated")} {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 self-stretch md:self-auto border-t md:border-t-0 border-white/5 pt-6 md:pt-0">
                  <span className="text-[9px] font-black fm-muted uppercase tracking-widest">{getCopy(settings?.design, "trackTotalPayable")}</span>
                  <span className="text-3xl font-black text-white">{orderFormatPrice(order.total)}</span>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest mt-1 border ${order.paymentStatus === "paid" ? "fm-success-text bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}>
                    {getCopy(settings?.design, stage === "refunded" ? "accountRefunded" : stage === "cancelled" ? "accountCancelled" : order.paymentStatus === "paid" ? "trackPaid" : "trackUnpaid")}
                  </span>
                </div>
              </div>

              {stage !== "active" && (
                <div {...regionProps("trackingStatusBanner")} role="status" className={`rounded-2xl border p-6 text-sm leading-6 ${stage === "awaiting_payment" ? "border-amber-500/20 bg-amber-500/10 text-amber-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
                  {getCopy(settings?.design, stage === "awaiting_payment" ? "trackAwaitingPayment" : stage === "cancelled" ? "trackCancelledBanner" : "trackRefundedBanner")}
                </div>
              )}

              {!isPickup && !isLocalDelivery && order.shippingMethod && stage === "active" && (
                <section {...regionProps("trackingShipping")} className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 md:p-10">
                  <h3 className="text-xs font-black tracking-[0.3em] uppercase text-white/70 mb-4">{getCopy(settings?.design, "trackShippingHeading")}</h3>
                  <dl className="grid gap-4 sm:grid-cols-3 text-sm">
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-widest fm-muted">{getCopy(settings?.design, "trackShippingMethod")}</dt>
                      <dd className="mt-1 text-white">{order.shippingMethod}</dd>
                    </div>
                    {(days || order.shippingEstimate?.terms) && (
                      <div>
                        <dt className="text-[10px] font-black uppercase tracking-widest fm-muted">{getCopy(settings?.design, "trackExpected")}</dt>
                        <dd className="mt-1 text-white">{days ? getCopy(settings?.design, "trackExpectedDays", { days }) : order.shippingEstimate.terms}</dd>
                      </div>
                    )}
                    {shipAddress.street && (
                      <div>
                        <dt className="text-[10px] font-black uppercase tracking-widest fm-muted">{getCopy(settings?.design, "trackShipTo")}</dt>
                        <dd className="mt-1 not-italic fm-muted">{[shipAddress.street, shipAddress.city, shipAddress.state, shipAddress.zip, shipAddress.country].filter(Boolean).join(", ")}</dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {(isPickup || isLocalDelivery) && fulfillment && (
                <section {...regionProps("trackingFulfillment")} className="rounded-[2rem] border border-violet-500/15 bg-white/[0.02] p-8 md:p-10 space-y-4">
                  <h3 className="text-xs font-black tracking-[0.3em] uppercase text-white/70">{getCopy(settings?.design, "trackFulfillment")}</h3>
                  <p className="text-xl font-bold text-white">{isPickup ? getCopy(settings?.design, "trackPickup") : getCopy(settings?.design, "trackLocalDelivery")} · {fulfillment.name}</p>
                  {(isPickup ? fulfillment.address : fulfillment.destination) && <address className="not-italic text-sm leading-6 fm-muted">
                    {[isPickup ? fulfillment.address.street : fulfillment.destination.street,
                      isPickup ? fulfillment.address.city : fulfillment.destination.city,
                      isPickup ? fulfillment.address.state : fulfillment.destination.state,
                      isPickup ? fulfillment.address.zip : fulfillment.destination.zip,
                      isPickup ? fulfillment.address.country : fulfillment.destination.country].filter(Boolean).join(", ")}
                  </address>}
                  {fulfillment.hours && <p className="text-sm fm-muted">{getCopy(settings?.design, "trackFulfillmentHours")}: {fulfillment.hours}</p>}
                  {fulfillment.estimate && <p className="text-sm fm-muted">{getCopy(settings?.design, "trackFulfillmentEstimate")}: {fulfillment.estimate}</p>}
                  {fulfillment.instructions && <p className="whitespace-pre-wrap text-sm leading-6 fm-muted">{getCopy(settings?.design, "trackFulfillmentInstructions")}: {fulfillment.instructions}</p>}
                </section>
              )}

              {/* Horizontal Progress Steps */}
              {stage === "active" && <div {...regionProps("trackingTimeline")} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-12 backdrop-blur-sm">
                <h3 className="text-xs font-black tracking-[0.4em] uppercase text-white/40 mb-10 pb-4 border-b border-white/5">{getCopy(settings?.design, "trackTimeline")}</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
                  {steps.map((step, index) => {
                    const isCompleted = index <= currentStep;
                    const isActive = index === currentStep;
                    const StepIcon = step.icon;
                    return (
                      <div key={index} className="flex flex-col items-center md:items-start text-center md:text-left relative z-10 space-y-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border
                          ${isCompleted 
                            ? "bg-violet-500/20 border-violet-500/40 fm-accent-text shadow-[0_0_30px_rgba(var(--accent-rgb),0.25)]" 
                            : "bg-white/[0.03] border-white/10 text-white/50"
                          }
                          ${isActive ? "ring-2 ring-violet-500 ring-offset-4 ring-offset-[var(--bg-color,#050506)]" : ""}
                        `}>
                          <StepIcon size={18} />
                        </div>
                        <div>
                          <p className={`text-xs font-black uppercase tracking-wider ${isCompleted ? "text-white" : "text-white/50"}`}>{step.label}</p>
                          <p className={`text-[10px] mt-1 font-medium ${isCompleted ? "fm-muted" : "text-white/50"}`}>{step.desc}</p>
                          {isCompleted && dates[index] && (
                            <p className="text-[10px] mt-1 font-mono fm-muted">{new Date(dates[index] as string).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>}

              {/* Shipping carrier information */}
              {order.trackingNumber && (() => {
                const carrierTrackingUrl = getTrackingUrl(order.trackingCarrier || "", order.trackingNumber, order.trackingUrl);
                return (
                  <div {...regionProps("trackingShipment")} className="bg-gradient-to-r from-violet-950/20 to-cyan-950/20 border border-violet-500/15 rounded-[2.5rem] p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black tracking-[0.3em] fm-accent-text uppercase">{getCopy(settings?.design, "trackLogisticsEyebrow")}</p>
                      <h4 className="text-2xl font-black tracking-tighter uppercase italic leading-none">{getCopy(settings?.design, "trackCarrier")}</h4>
                      <p className="text-xs font-medium fm-muted leading-relaxed max-w-md mt-2">
                        {getCopy(settings?.design, "trackInTransit")} <code className="text-white bg-white/10 px-2 py-0.5 rounded font-mono">{order.trackingNumber}</code>
                        {order.trackingCarrier ? ` (${order.trackingCarrier.toUpperCase()})` : ""}
                      </p>
                    </div>
                    <a
                      href={carrierTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fm-active hover:bg-slate-200 px-8 py-4 rounded-2xl text-[9px] font-black tracking-[0.25em] uppercase transition-all active:scale-95 flex items-center gap-3 shrink-0 shadow-xl"
                    >
                      {getCopy(settings?.design, "trackShipment")} <ExternalLink size={12} />
                    </a>
                  </div>
                );
              })()}

              {/* Digital Ebook Downloads Section */}
              {Object.keys(digitalItems).length > 0 && order.paymentStatus === "paid" && (
                <div {...regionProps("trackingDownloads")} className="bg-violet-900/[0.05] border border-violet-500/20 rounded-[2.5rem] p-10 space-y-6">
                  <div className="space-y-1">
                    <h4 className="text-xl font-black tracking-tighter text-white uppercase italic">{getCopy(settings?.design, "trackDigitalTitle")}</h4>
                    <p className="text-xs font-medium fm-muted leading-relaxed">{getCopy(settings?.design, "trackDigitalText")}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {order.items.map((item: any) => {
                      if (!digitalItems[item.id]) return null;
                      return (
                        <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex justify-between items-center group/download">
                          <div className="truncate pr-4">
                            <p className="text-[10px] font-bold text-white uppercase leading-tight truncate group-hover/download:text-violet-400 transition-colors">{item.title}</p>
                            <p className="text-[9px] fm-muted uppercase tracking-widest mt-2">{getCopy(settings?.design, "trackDigitalFormat")}</p>
                          </div>
                          <button
                            onClick={() => handleDownload(item.id)}
                            className="fm-accent-bg hover:bg-violet-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center shrink-0 active:scale-95 border border-violet-400/20"
                            title={getCopy(settings?.design, "trackDownload")}
                            aria-label={getCopy(settings?.design, "trackDownload")}
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items breakdown list */}
              <div {...regionProps("trackingItems")} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10">
                <h3 className="text-xs font-black tracking-[0.4em] uppercase text-white/40 mb-8 pb-4 border-b border-white/5">{getCopy(settings?.design, "trackItems")}</h3>
                
                <div className="space-y-6">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-6 items-center">
                      <div className="w-14 aspect-[3/4] fm-surface-2 rounded-lg overflow-hidden border border-white/10 shrink-0">
                        <img loading="lazy" decoding="async" src={item.photoUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white uppercase tracking-wider truncate leading-tight">{item.title}</p>
                        {item.variantName && (
                          <p className="text-[9px] fm-muted uppercase tracking-widest mt-1">{item.variantName}</p>
                        )}
                        <p className="text-[10px] fm-muted font-mono mt-2">{getCopy(settings?.design, "qtyLine", { qty: item.quantity })} × {orderFormatPrice(item.price)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white font-mono">{orderFormatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotals list */}
                <div className="border-t border-white/5 mt-8 pt-8 space-y-4 text-sm font-bold text-white/60">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] fm-muted">{getCopy(settings?.design, "summarySubtotal")}</span>
                    <span className="font-mono text-white/80">{orderFormatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between fm-success-text">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em]">{getCopy(settings?.design, "summaryDiscount")}</span>
                      <span className="font-mono">−{orderFormatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] fm-muted">{getCopy(settings?.design, "summaryShipping")}</span>
                    <span className="font-mono text-white/80">{order.shipping > 0 ? orderFormatPrice(order.shipping) : getCopy(settings?.design, "coFree")}</span>
                  </div>
                  {order.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] fm-muted">{getCopy(settings?.design, "summaryTax")}</span>
                      <span className="font-mono text-white/80">{orderFormatPrice(order.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/5 pt-6 text-white text-base">
                    <span className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">{getCopy(settings?.design, "summaryTotal")}</span>
                    <span className="font-mono text-xl font-black text-white">{orderFormatPrice(order.total)}</span>
                  </div>
                </div>
              </div>

              <p {...regionProps("trackingHelp")} className="text-center text-sm leading-6 fm-muted">{getCopy(settings?.design, "trackHelp")}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TemplateSections design={settings?.design} templateId="trackingPage" books={books} />
      <GlobalSections design={settings?.design} books={books} />
    </div>
  );
}
