import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { useCart } from "../CartContext";
import { useSiteData } from "../features/site/useSiteData";
import { getCopy } from "../features/site/storeCopy";
import { useCurrency } from "../CurrencyContext";
import { StorefrontThemeStyle } from "../features/site/StorefrontThemeStyle";
import { X, ShoppingBag, Minus, Plus as PlusIcon, Trash2, ArrowRight, ShieldCheck, Truck, Lock } from "lucide-react";

export function CartDrawer() {
  const { cart, addToCart, removeFromCart, updateQuantity, cartTotal, isCartOpen, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const { books, settings } = useSiteData();
  const { formatPrice } = useCurrency();

  // Find a recommended book for "Complete your collection"
  const cartIds = new Set(cart.map((i) => i.id));
  const candidateBooks = (books || []).filter((b) => !cartIds.has(b.id) && b.status === "published");
  
  // Find match in same category if possible
  const cartCategories = new Set(
    cart.flatMap((i) => {
      const match = (books || []).find((b) => b.id === i.id);
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            data-fm-store
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full max-w-md bg-white text-black shadow-2xl z-[70] flex flex-col pt-24"
          >
            <StorefrontThemeStyle design={design} />
            <div className="px-8 pb-4 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-2xl font-light tracking-tight">{getCopy(design, "cartTitle")}</h3>
                <p className="text-[10px] tracking-widest text-neutral-400 uppercase mt-1">{cart.length} unique entries</p>
              </div>
              <button onClick={() => setIsCartOpen(false)} aria-label="Close cart" className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Free shipping progress */}
            {cart.length > 0 && showFreeShipBar && (
              <div className="px-8 pb-4">
                <div className="flex items-center gap-2 text-[10px] tracking-widest text-neutral-500 uppercase mb-2">
                  <Truck size={12} />
                  {remaining > 0 ? (
                    <span>{formatPrice(remaining)} away from free shipping</span>
                  ) : (
                    <span style={{ color: "var(--success)" }}>You qualify for free shipping</span>
                  )}
                </div>
                <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${remaining > 0 ? "bg-black" : "fm-success-solid"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-8 space-y-8 scrollbar-hide py-4">
              {cart.map((item) => (
                <div key={`${item.id}-${item.variantId || ""}`} className="flex gap-6 group">
                  <div className="w-24 aspect-[3/4] bg-neutral-100 overflow-hidden flex-shrink-0">
                    <img src={item.photoUrl} alt={item.title || ""} loading="lazy" decoding="async" className="w-full h-full object-cover grayscale" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="text-[11px] font-bold tracking-widest uppercase mb-1 leading-tight">{item.title}</h4>
                      {item.variantName && (
                        <p className="text-[9px] text-neutral-400 tracking-widest uppercase mb-1">{item.variantName}</p>
                      )}
                      <p className="text-[10px] text-neutral-400">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-4 bg-neutral-50 px-3 py-1.5 rounded-full">
                        <button onClick={() => updateQuantity(item.id, item.variantId, -1)} aria-label="Decrease quantity" className="hover:text-neutral-400 transition-colors"><Minus size={12} /></button>
                        <span className="text-[10px] font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.variantId, 1)} aria-label="Increase quantity" className="hover:text-neutral-400 transition-colors"><PlusIcon size={12} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id, item.variantId)} aria-label="Remove item from cart" className="text-neutral-300 hover:text-black transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="py-20 text-center space-y-4">
                   <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto">
                      <ShoppingBag size={24} className="text-neutral-200" />
                   </div>
                   <p className="text-[10px] tracking-[.3em] text-neutral-300 uppercase italic">{getCopy(design, "cartEmpty")}</p>
                </div>
              )}

              {/* Complete your Collection recommendation card */}
              {cart.length > 0 && recommendedBook && (
                <div className="pt-6 border-t border-neutral-100 mt-8">
                  <p className="text-[9px] font-black tracking-[0.25em] text-neutral-400 uppercase mb-4">Complete your collection</p>
                  <div className="flex gap-6 bg-neutral-50 p-4 rounded-2xl group/rec relative">
                    <div className="w-16 aspect-[3/4] bg-neutral-200 overflow-hidden flex-shrink-0">
                      <img
                        src={recommendedBook.photos?.[0]?.url || ""}
                        alt={recommendedBook.title}
                        className="w-full h-full object-cover grayscale group-hover/rec:grayscale-0 transition-all duration-500"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h4 className="text-[10px] font-bold tracking-widest uppercase mb-1 leading-tight">{recommendedBook.title}</h4>
                        <p className="text-[9px] text-neutral-400">{formatPrice(recommendedBook.isOnSale ? recommendedBook.salePrice! : recommendedBook.retailPrice)}</p>
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
                        + Add to Bag
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-neutral-100 bg-white space-y-4">
               <div className="flex justify-between items-end">
                  <span className="text-[10px] tracking-[.4em] text-neutral-400 uppercase">{getCopy(design, "cartTotalLabel")}</span>
                  <span className="text-3xl font-light">{formatPrice(cartTotal)}</span>
               </div>

               {/* Trust signals */}
               {showTrustBadges && (
               <div className="grid grid-cols-3 gap-2 text-[8px] tracking-widest text-neutral-400 uppercase">
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
               <p className="text-center text-[9px] text-neutral-400 tracking-widest">
                 {getCopy(design, "cartDeliveryNote")}
               </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
