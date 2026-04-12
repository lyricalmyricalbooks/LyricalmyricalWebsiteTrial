import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { useCart } from "../CartContext";
import { X, ShoppingBag, Minus, Plus as PlusIcon, Trash2, ArrowRight } from "lucide-react";

export function CartDrawer() {
  const { cart, removeFromCart, updateQuantity, cartTotal, isCartOpen, setIsCartOpen } = useCart();
  const navigate = useNavigate();

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
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full max-w-md bg-white text-black shadow-2xl z-[70] flex flex-col pt-24"
          >
            <div className="px-8 pb-8 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-2xl font-light tracking-tight">Shopping Bag</h3>
                <p className="text-[10px] tracking-widest text-neutral-400 uppercase mt-1">{cart.length} unique entries</p>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 space-y-8 scrollbar-hide py-4">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-6 group">
                  <div className="w-24 aspect-[3/4] bg-neutral-100 overflow-hidden flex-shrink-0">
                    <img src={item.photoUrl} className="w-full h-full object-cover grayscale" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h4 className="text-[11px] font-bold tracking-widest uppercase mb-1 leading-tight">{item.title}</h4>
                      <p className="text-[10px] text-neutral-400">$ {item.price.toFixed(2)} USD</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-4 bg-neutral-50 px-3 py-1.5 rounded-full">
                        <button onClick={() => updateQuantity(item.id, -1)} className="hover:text-neutral-400 transition-colors"><Minus size={12} /></button>
                        <span className="text-[10px] font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="hover:text-neutral-400 transition-colors"><PlusIcon size={12} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-neutral-300 hover:text-black transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="py-20 text-center space-y-4">
                   <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto">
                      <ShoppingBag size={24} className="text-neutral-200" />
                   </div>
                   <p className="text-[10px] tracking-[.3em] text-neutral-300 uppercase italic">The archive is empty.</p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-neutral-100 bg-white">
               <div className="flex justify-between items-end mb-8">
                  <span className="text-[10px] tracking-[.4em] text-neutral-400 uppercase">Estimated Total</span>
                  <span className="text-3xl font-light">$ {cartTotal.toFixed(2)}</span>
               </div>
               <button 
                  disabled={cart.length === 0}
                  onClick={() => { setIsCartOpen(false); navigate("/checkout"); }}
                  className="w-full bg-black text-white py-5 rounded-full text-[10px] tracking-[.4em] font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 disabled:opacity-30 shadow-2xl"
               >
                  PROCEED TO CHECKOUT <ArrowRight size={14} />
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
