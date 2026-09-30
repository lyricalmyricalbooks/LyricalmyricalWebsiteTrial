import { useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { useCart } from "../CartContext";
import { useSiteData } from "../features/site/useSiteData";
import { getCopy } from "../features/site/storeCopy";
import { useCurrency } from "../CurrencyContext";
import { StorefrontThemeStyle } from "../features/site/StorefrontThemeStyle";
import { useFocusTrap } from "../lib/useFocusTrap";
import { X, ShoppingBag, Minus, Plus as PlusIcon, Trash2, ArrowRight, ShieldCheck, Truck, Lock } from "lucide-react";

export function CartDrawer() {
  const { cart, addToCart, removeFromCart, updateQuantity, cartTotal, isCartOpen, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const { books, settings } = useSiteData();
  const { formatPrice } = useCurrency();
  const drawerRef = useRef<HTMLDivElement>(null);
  // Dialog behaviour: focus moves in, Tab is contained, Escape closes, focus returns to the opener.
  useFocusTrap(drawerRef, isCartOpen, () => setIsCartOpen(false));

  // ⚡ Bolt: Cache books by ID for O(1) lookups during cart iteration
  // Measured impact: Eliminates O(N*M) complexity when finding cart item categories.
  const booksMap = useMemo(() => {
    return new Map((books || []).map(b => [b.id, b]));
  }, [books]);

  // Find a recommended book for "Complete your collection"
  const cartIds = new Set(cart.map((i) => i.id));
  const candidateBooks = (books || []).filter((b) => !cartIds.has(b.id) && b.status === "published");

  // Find match in same category if possible
  const cartCategories = new Set(
    cart.flatMap((i) => {
      const match = booksMap.get(i.id);
      return match?.categories || [];
    })
  );

  let recommendedBook = candidateBooks.find((b) =>
    b.categories?.some((cat) => cartCategories.has(cat))
  );

  if (!recommendedBook && candidateBooks.length > 0) {
    recommendedBook = candidateBooks[0]; // fallback
  }

  // Resolve storefront design settings (flat or nested under `.storefront`).
  const rawDesign = (settings as any)?.design || {};
  const design = rawDesign.storefront && Object.keys(rawDesign.storefront).length > 0 ? rawDesign.storefront : rawDesign;
  const showFreeShipBar = design.showFreeShipBar ?? true;
  const showTrustBadges = design.showCartTrustBadges ?? true;

  const buttonBg = design?.buttonColor || design?.primaryColor || "#000000";
  const buttonText = design?.buttonTextColor || "#ffffff";
  const buttonRadius = Math.max(0, Math.min(999, design?.buttonRadius ?? 999));
  const buttonStyle = design?.buttonStyle || "solid";
  const buttonUppercase = design?.buttonUppercase ?? true;
  const buttonShadow = design?.buttonShadow ?? true;

  // Drawer surface theming — all optional; without cartDrawerBg the drawer
  // renders exactly as before (white panel, neutral greys).
  const drawerDark = !!design?.cartDrawerBg;
  const drawerBg = design?.cartDrawerBg || "#ffffff";
  const drawerText = design?.cartDrawerText || "#000000";
  const drawerMuted = design?.cartDrawerMuted || (drawerDark ? "rgba(255,255,255,0.5)" : undefined);
  const drawerSurface = design?.cartDrawerSurface || (drawerDark ? "rgba(255,255,255,0.06)" : undefined);
  const drawerBorder = design?.cartDrawerBorder || (drawerDark ? "rgba(255,255,255,0.12)" : undefined);
  const headingFontFamily = design?.headingFont ? `'${design.headingFont}', serif` : undefined;
  // Thumbnails stay grayscale on the classic white drawer; a themed drawer
  // shows covers in color unless the merchant re-enables grayscale.
  const grayscaleThumbs = design?.cartDrawerGrayscaleThumbs ?? !drawerDark;

  const mutedStyle = drawerMuted ? { color: drawerMuted } : undefined;
  const surfaceStyle = drawerSurface ? { backgroundColor: drawerSurface } : undefined;
  const borderStyle = drawerBorder ? { borderColor: drawerBorder } : undefined;

  const FREE_SHIP_THRESHOLD = Math.max(0, design.freeShipThreshold ?? 100);
  const remaining = Math.max(0, FREE_SHIP_THRESHOLD - cartTotal);
  const progress = FREE_SHIP_THRESHOLD > 0 ? Math.min(100, (cartTotal / FREE_SHIP_THRESHOLD) * 100) : 100;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={getCopy(design, "cartTitle")}
            tabIndex={-1}
            data-fm-store
            data-fm-checkout
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full max-w-md z-[70] flex flex-col pt-24"
            style={{ backgroundColor: drawerBg, color: drawerText, borderLeft: drawerDark ? "var(--rp-outline-w, 2px) solid var(--rp-outline, currentColor)" : undefined, boxShadow: drawerDark ? "-6px 0 0 var(--rp-shadow-color, transparent)" : "0 25px 50px -12px rgba(0,0,0,.25)" }}
          >
            <StorefrontThemeStyle design={design} />
            <div className="px-8 pb-4 flex justify-between items-center" style={{ backgroundColor: drawerBg }}>
              <div>
                <h3 className="text-2xl font-light tracking-tight" style={headingFontFamily ? { fontFamily: headingFontFamily } : undefined}>
                  {getCopy(design, "cartTitle")}
                </h3>
                <p className="text-[10px] tracking-widest text-neutral-400 uppercase mt-1" style={mutedStyle}>{getCopy(design, "cartCountLabel", { count: cart.length })}</p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                aria-label={getCopy(design, "cartCloseAria")}
                className={`p-3 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${drawerDark ? "hover:bg-white/10" : "hover:bg-neutral-50"}`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Free shipping progress */}
            {cart.length > 0 && showFreeShipBar && (
              <div className="px-8 pb-4">
                <div className="flex items-center gap-2 text-[10px] tracking-widest text-neutral-500 uppercase mb-2" style={mutedStyle}>
                  <Truck size={12} />
                  {remaining > 0 ? (
                    <span>{getCopy(design, "cartFreeShipAway", { amount: formatPrice(remaining) })}</span>
                  ) : (
                    <span style={{ color: "var(--success)" }}>{getCopy(design, "cartFreeShipQualified")}</span>
                  )}
                </div>
                <div className="h-1 bg-neutral-100 rounded-full overflow-hidden" style={surfaceStyle}>
                  <div
                    className={`h-full transition-all duration-500 ${remaining > 0 ? (drawerDark ? "" : "bg-black") : "fm-success-solid"}`}
                    style={{
                      width: `${progress}%`,
                      ...(drawerDark && remaining > 0 ? { backgroundColor: "var(--accent, #e8402a)" } : {}),
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-8 space-y-8 scrollbar-hide py-4">
              {cart.map((item) => (
                <div key={`${item.id}-${item.variantId || ""}`} className="flex gap-6 group">
                  <div className="w-24 aspect-[3/4] bg-neutral-100 overflow-hidden flex-shrink-0" style={surfaceStyle}>
                    <img src={item.photoUrl} alt={item.title || ""} loading="lazy" decoding="async" className={`w-full h-full object-cover ${grayscaleThumbs ? "grayscale" : ""}`} />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="text-[11px] font-bold tracking-widest uppercase mb-1 leading-tight">{item.title}</h4>
                      {item.variantName && (
                        <p className="text-[9px] text-neutral-400 tracking-widest uppercase mb-1" style={mutedStyle}>{item.variantName}</p>
                      )}
                      <p className="text-[10px] text-neutral-400" style={mutedStyle}>{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      {(() => {
                        const atLimit = typeof item.stockLimit === "number" && item.stockLimit !== 999 && item.quantity >= item.stockLimit;
                        return (
                          <div>
                            <div className="flex items-center gap-1 bg-neutral-50 px-1 rounded-full" style={surfaceStyle} role="group" aria-label={getCopy(design, "cartQtyAria", { title: item.title })}>
                              <button onClick={() => updateQuantity(item.id, item.variantId, -1)} disabled={item.quantity <= 1} aria-label={getCopy(design, "cartDecreaseAria", { title: item.title })} className="hover:text-neutral-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-30"><Minus size={12} /></button>
                              <span className="text-[11px] font-bold w-6 text-center" aria-live="polite" aria-atomic="true">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, item.variantId, 1)} disabled={atLimit} aria-label={getCopy(design, "cartIncreaseAria", { title: item.title })} className="hover:text-neutral-400 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-30"><PlusIcon size={12} /></button>
                            </div>
                            {atLimit && <p className="text-[9px] tracking-widest uppercase mt-1" role="status" style={{ color: "var(--low-inventory-color, #b4271a)" }}>{getCopy(design, "cartOnlyAvailable", { count: item.stockLimit as number })}</p>}
                          </div>
                        );
                      })()}
                      <button
                        onClick={() => removeFromCart(item.id, item.variantId)}
                        aria-label={getCopy(design, "cartRemoveAria", { title: item.title })}
                        className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${drawerDark ? "text-white/40 hover:text-white" : "text-neutral-300 hover:text-black"}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="py-20 text-center space-y-4">
                   <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto" style={surfaceStyle}>
                      <ShoppingBag size={24} className={drawerDark ? "text-white/30" : "text-neutral-200"} />
                   </div>
                   <p className="text-[10px] tracking-[.3em] text-neutral-300 uppercase italic" style={mutedStyle}>{getCopy(design, "cartEmpty")}</p>
                   <button
                     onClick={() => { setIsCartOpen(false); navigate("/"); }}
                     className="mt-2 px-6 py-3 min-h-[44px] text-[10px] tracking-[.3em] font-bold uppercase border"
                     style={{ borderColor: buttonBg, color: drawerText }}
                   >
                     {getCopy(design, "cartContinue")}
                   </button>
                </div>
              )}

              {/* Complete your Collection recommendation card */}
              {cart.length > 0 && recommendedBook && (
                <div className="pt-6 border-t border-neutral-100 mt-8" style={borderStyle}>
                  <p className="text-[9px] font-black tracking-[0.25em] text-neutral-400 uppercase mb-4" style={mutedStyle}>{getCopy(design, "cartUpsellHeading")}</p>
                  <div className="flex gap-6 bg-neutral-50 p-4 rounded-2xl group/rec relative" style={surfaceStyle}>
                    <div className="w-16 aspect-[3/4] bg-neutral-200 overflow-hidden flex-shrink-0" style={surfaceStyle}>
                      <img
                        src={recommendedBook.photos?.[0]?.url || ""}
                        alt={recommendedBook.title}
                        className={`w-full h-full object-cover transition-all duration-500 ${grayscaleThumbs ? "grayscale group-hover/rec:grayscale-0" : ""}`}
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h4 className="text-[10px] font-bold tracking-widest uppercase mb-1 leading-tight">{recommendedBook.title}</h4>
                        <p className="text-[9px] text-neutral-400" style={mutedStyle}>{formatPrice(recommendedBook.isOnSale ? recommendedBook.salePrice! : recommendedBook.retailPrice)}</p>
                      </div>
                      <button
                        onClick={() => addToCart(recommendedBook)}
                        className={`mt-3 w-fit text-[8px] font-black tracking-widest px-4 py-2 transition-all ${
                          buttonShadow ? "shadow-md" : ""
                        } ${buttonUppercase ? "uppercase" : ""}`}
                        style={{
                          backgroundColor: buttonStyle === "solid" ? buttonBg : "transparent",
                          color: buttonStyle === "solid" ? buttonText : buttonBg,
                          border: buttonStyle !== "solid" ? `1px solid ${buttonBg}` : "none",
                          borderRadius: buttonRadius,
                        }}
                      >
                        {getCopy(design, "cartUpsellAdd")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-neutral-100 space-y-4" style={{ backgroundColor: drawerBg, ...(borderStyle || {}) }}>
               <div className="flex justify-between items-end">
                  <span className="text-[10px] tracking-[.4em] text-neutral-400 uppercase" style={mutedStyle}>{getCopy(design, "cartTotalLabel")}</span>
                  <span className="text-3xl font-light">{formatPrice(cartTotal)}</span>
               </div>

               {/* Trust signals */}
               {showTrustBadges && (
               <div className="grid grid-cols-3 gap-2 text-[8px] tracking-widest text-neutral-400 uppercase" style={mutedStyle}>
                  <div className="flex flex-col items-center gap-1 py-2">
                    <Lock size={12} />
                    <span>{getCopy(design, "trustSecureLabel")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 py-2">
                    <Truck size={12} />
                    <span>{getCopy(design, "trustTrackedLabel")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 py-2">
                    <ShieldCheck size={12} />
                    <span>{getCopy(design, "trustReturnsLabel")}</span>
                  </div>
               </div>
               )}

                <button
                  disabled={cart.length === 0}
                  onClick={() => { setIsCartOpen(false); navigate("/checkout"); }}
                  className={`w-full py-5 text-[10px] tracking-[.4em] font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-30 hover:scale-[1.01] ${
                    buttonShadow ? "shadow-2xl" : ""
                  } ${buttonUppercase ? "uppercase" : ""}`}
                  style={{
                    backgroundColor: buttonStyle === "solid" ? buttonBg : "transparent",
                    color: buttonStyle === "solid" ? buttonText : buttonBg,
                    border: buttonStyle !== "solid" ? `1px solid ${buttonBg}` : "none",
                    borderRadius: buttonRadius,
                  }}
                >
                  {getCopy(design, "cartCheckoutButton")} <ArrowRight size={14} />
                </button>
               <p className="text-center text-[9px] text-neutral-400 tracking-widest" style={mutedStyle}>
                 {getCopy(design, "cartDeliveryNote")}
               </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
