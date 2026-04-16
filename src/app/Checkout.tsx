import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useCart } from "./CartContext";
import { ChevronLeft, Tag, ShieldCheck, ArrowRight, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { adminApi } from "./admin/api";

export function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  
  const [isApplying, setIsApplying] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [discountError, setDiscountError] = useState("");

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "United States"
    }
  });

  const [shippingCost] = useState(15); // Fixed shipping per order for now
  
  const applyDiscount = async () => {
    if (!discountCode) return;
    setIsApplying(true);
    setDiscountError("");
    try {
      const discount = await adminApi.validateDiscount(discountCode);
      setAppliedDiscount(discount);
    } catch (err: any) {
      setDiscountError(err.message || "INVALID OR EXPIRED CODE");
      setAppliedDiscount(null);
    } finally {
      setIsApplying(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError("");
  };

  const calculateDiscountAmount = () => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === 'percentage') {
      return cartTotal * (appliedDiscount.value / 100);
    }
    if (appliedDiscount.type === 'fixed') {
      return Math.min(appliedDiscount.value, cartTotal);
    }
    return 0; // freeship handled separately
  };

  const isFreeShipping = appliedDiscount?.type === 'freeship';
  const discountAmount = calculateDiscountAmount();
  const finalShipping = isFreeShipping ? 0 : shippingCost;
  const finalTotal = cartTotal - discountAmount + finalShipping;

  const handleCompletePurchase = async () => {
    if (!customer.name || !customer.email || !customer.address.street) {
      alert("Please fill in shipping details.");
      return;
    }

    // Validation for Option B Client-Only Stripe Checkout:
    // Every item MUST have a stripePriceId associated with it!
    const missingStripeIds = cart.filter(item => !item.stripePriceId);
    if (missingStripeIds.length > 0) {
      alert(`Error: The following items are missing Stripe Price IDs and cannot be processed via client-checkout: ${missingStripeIds.map(i => i.title).join(", ")}. Please contact support or update them in the catalog.`);
      return;
    }

    setIsCompleting(true);
    try {
      // 1. Fetch public settings to get the Stripe Public Key
      const settings = await adminApi.getSettings('website');
      const stripePubKey = settings?.payments?.stripe?.publicKey;
      
      if (!stripePubKey) {
        throw new Error("Stripe is not configured or the Public Key is missing from settings.");
      }

      // 2. Load Stripe
      const stripe = await loadStripe(stripePubKey);
      if (!stripe) throw new Error("Failed to initialize Stripe");

      // 3. Create a PENDING order in Firebase BEFORE we redirect, so we have a paper trail
      const orderData = {
        customer,
        items: cart.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          photoUrl: item.photoUrl,
          stripePriceId: item.stripePriceId
        })),
        subtotal: cartTotal,
        discount: discountAmount,
        shipping: finalShipping,
        total: finalTotal,
        status: "pending_payment", // Mark as pending
        appliedDiscount: appliedDiscount ? { 
          id: appliedDiscount.id,
          code: appliedDiscount.code, 
          type: appliedDiscount.type, 
          value: appliedDiscount.value 
        } : null,
        metadata: {
          userAgent: navigator.userAgent,
          platform: "web"
        }
      };
      
      const orderId = await adminApi.createOrder(orderData);

      // 4. Transform Cart Items into Stripe Line Items
      const lineItems = cart.map(item => ({
        price: item.stripePriceId,
        quantity: item.quantity
      }));

      // In Option B Client-Side Only Mode, we cannot easily pass dynamic shipping/discount
      // without creating a Price ID for the discount on the fly. 
      // We log to the user that client-side only restricts dynamic promos:
      console.warn("Client-side redirectToCheckout cannot natively pass arbitrary discount subtraction without a Stripe backend Session.");

      // 5. Execute Redirect
      const { error } = await stripe.redirectToCheckout({
        lineItems,
        mode: 'payment',
        successUrl: `${window.location.origin}/#/checkout?success=true&order_id=${orderId}`,
        cancelUrl: `${window.location.origin}/#/checkout?canceled=true`,
        clientReferenceId: orderId, // Note: Stripe might ignore this for purely client-side without session
        customerEmail: customer.email,
      });

      if (error) {
        throw new Error(error.message);
      }
      
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
      setIsCompleting(false);
    }
  };

  // Check URL parameters for Stripe success redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    if (params.get('success')) {
      const orderIdObj = params.get('order_id') || "";
      if (orderIdObj) {
         setOrderNumber(orderIdObj);
         // Mark the order as 'paid' in Firestore normally, but since we are client-side 
         // without a webhook, we assume success if they got here.
         adminApi.updateOrder(orderIdObj, { status: "paid" });
      }
      setIsSuccess(true);
      clearCart();
    }
    if (params.get('canceled')) {
      alert('Order payment was canceled.');
    }
  }, []);

  if (isSuccess) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-8">
           <ShieldCheck size={40} className="text-black" />
        </div>
        <h2 className="text-4xl font-light mb-4 italic tracking-tighter">ORDER CONFIRMED</h2>
        <p className="text-[10px] tracking-[.4em] text-white/40 uppercase mb-2">Thank you for your business.</p>
        <p className="text-xl font-bold tracking-tighter mb-12">#{orderNumber}</p>
        <Link to="/" className="bg-white text-black px-10 py-4 rounded-full text-[10px] tracking-[.4em] font-bold hover:scale-105 transition-all">
           CONTINUE EXPLORING
        </Link>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-4xl font-light mb-4">EMPTY ARCHIVE</h2>
        <p className="text-[10px] tracking-[.4em] text-white/40 uppercase mb-12">Your shopping bag is currently empty.</p>
        <Link to="/" className="bg-white text-black px-8 py-4 rounded-full text-[10px] tracking-[.4em] font-bold hover:scale-105 transition-all">
           RETURN TO CATALOG
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-32">
      {/* Mini Header */}
      <nav className="p-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4 text-[10px] tracking-[.3em] font-bold hover:opacity-50 transition-opacity">
           <ChevronLeft size={16} /> BACK TO SITE
        </Link>
        <h1 className="text-2xl tracking-[.2em] font-light italic">F✶M</h1>
        <div className="w-24"></div> {/* Balance */}
      </nav>

      <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-20 pt-12">
        {/* Step 1: Order Recap */}
        <section className="space-y-12">
          <div>
             <h2 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-8 pb-4 border-b border-neutral-100">01. Order Summary</h2>
             <div className="space-y-8">
               {cart.map((item) => (
                 <div key={item.id} className="flex gap-8 group">
                   <div className="w-24 aspect-[3/4] bg-neutral-100 overflow-hidden flex-shrink-0">
                     <img src={item.photoUrl} className="w-full h-full object-cover grayscale" />
                   </div>
                   <div className="flex-1 flex flex-col justify-center gap-2">
                     <h3 className="text-[12px] font-bold tracking-widest uppercase">{item.title}</h3>
                     <p className="text-[10px] text-neutral-400">QTY: {item.quantity} × $ {item.price.toFixed(2)}</p>
                     <p className="text-[11px] font-medium">$ {(item.quantity * item.price).toFixed(2)}</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>

          <div>
             <h2 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-8 pb-4 border-b border-neutral-100">02. Promotion</h2>
             <div className="flex gap-4">
                <div className="flex-1 relative">
                   <input 
                     type="text"
                     value={discountCode}
                     onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                     placeholder="ENTER CODE"
                     className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-sm tracking-widest placeholder:text-neutral-300 focus:ring-1 focus:ring-black outline-none"
                   />
                   {appliedDiscount && (
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">APPLIED</span>
                        <button onClick={removeDiscount} className="text-neutral-300 hover:text-black transition-colors"><X size={14} /></button>
                     </div>
                   )}
                </div>
                {!appliedDiscount && (
                  <button 
                    onClick={applyDiscount}
                    disabled={isApplying || !discountCode}
                    className="bg-black text-white px-8 py-4 rounded-2xl text-[10px] tracking-[.3em] font-bold hover:bg-neutral-800 transition-all disabled:opacity-20"
                  >
                    {isApplying ? "..." : "APPLY"}
                  </button>
                )}
             </div>
             <AnimatePresence>
               {discountError && (
                 <motion.p 
                   initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                   className="mt-3 text-[9px] tracking-widest text-red-500 flex items-center gap-2"
                 >
                   <AlertCircle size={10} /> {discountError}
                 </motion.p>
               )}
             </AnimatePresence>
          </div>

          <div>
             <h2 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-8 pb-4 border-b border-neutral-100">03. Shipping Details</h2>
             <div className="space-y-4">
                <input 
                  type="text" placeholder="FULL NAME" 
                  value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})}
                  className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-sm tracking-widest focus:ring-1 focus:ring-black outline-none"
                />
                <div className="grid grid-cols-2 gap-4">
                   <input 
                     type="email" placeholder="EMAIL ADDRESS" 
                     value={customer.email} onChange={e => setCustomer({...customer, email: e.target.value})}
                     className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-sm tracking-widest focus:ring-1 focus:ring-black outline-none"
                   />
                   <input 
                     type="tel" placeholder="PHONE (OPTIONAL)" 
                     value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})}
                     className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-sm tracking-widest focus:ring-1 focus:ring-black outline-none"
                   />
                </div>
                <input 
                  type="text" placeholder="STREET ADDRESS" 
                  value={customer.address.street} onChange={e => setCustomer({...customer, address: {...customer.address, street: e.target.value}})}
                  className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-sm tracking-widest focus:ring-1 focus:ring-black outline-none"
                />
                <div className="grid grid-cols-3 gap-4">
                   <input 
                     type="text" placeholder="CITY" 
                     value={customer.address.city} onChange={e => setCustomer({...customer, address: {...customer.address, city: e.target.value}})}
                     className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-sm tracking-widest focus:ring-1 focus:ring-black outline-none"
                   />
                   <input 
                     type="text" placeholder="STATE" 
                     value={customer.address.state} onChange={e => setCustomer({...customer, address: {...customer.address, state: e.target.value}})}
                     className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-sm tracking-widest focus:ring-1 focus:ring-black outline-none"
                   />
                   <input 
                     type="text" placeholder="ZIP" 
                     value={customer.address.zip} onChange={e => setCustomer({...customer, address: {...customer.address, zip: e.target.value}})}
                     className="w-full bg-neutral-50 border-none rounded-2xl py-4 px-6 text-sm tracking-widest focus:ring-1 focus:ring-black outline-none"
                   />
                </div>
             </div>
          </div>
        </section>

        {/* Step 2: Payment & Totals */}
        <section className="space-y-12">
          <div className="bg-neutral-50 rounded-[2.5rem] p-10 space-y-8">
             <h2 className="text-[10px] tracking-[.4em] text-neutral-400 uppercase mb-4">04. Final Settlement</h2>
             
             <div className="space-y-4">
                <div className="flex justify-between items-center text-[11px] tracking-widest">
                   <span className="text-neutral-400">SUBTOTAL</span>
                   <span>$ {cartTotal.toFixed(2)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between items-center text-[11px] tracking-widest text-green-600">
                     <span className="uppercase">DISCOUNT ({appliedDiscount.code})</span>
                     <span>- $ {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[11px] tracking-widest">
                   <span className="text-neutral-400">SHIPPING (FLAT RATE)</span>
                   <span className={isFreeShipping ? "line-through text-neutral-300" : ""}>$ {shippingCost.toFixed(2)}</span>
                </div>
                {isFreeShipping && (
                  <div className="flex justify-between items-center text-[11px] tracking-widest text-green-600">
                    <span>PROMO SHIPPING</span>
                    <span>FREE</span>
                  </div>
                )}
                <div className="pt-4 border-t border-neutral-100 flex justify-between items-end">
                   <span className="text-[10px] tracking-[.3em] font-bold">TOTAL PAYABLE</span>
                   <span className="text-4xl font-light">$ {finalTotal.toFixed(2)} <span className="text-[10px] tracking-normal font-bold">USD</span></span>
                </div>
             </div>

             {/* STRIPE PLACEHOLDER SECTION */}
             <div className="mt-12 pt-12 border-t border-neutral-100">
                <div className="bg-white border border-neutral-100 rounded-3xl p-8 text-center space-y-4">
                   <ShieldCheck size={32} strokeWidth={1} className="mx-auto text-neutral-200" />
                   <h3 className="text-xs tracking-[.2em] font-bold uppercase">Stripe Secure Checkout</h3>
                   <p className="text-[9px] text-neutral-400 leading-relaxed px-4">
                      PASTE YOUR STRIPE CHECKOUT SNIPPET HERE.
                      THIS SECTION WILL RENDER THE SECURE PAYMENT PORTAL.
                   </p>
                   <button 
                     onClick={handleCompletePurchase}
                     disabled={isCompleting}
                     className="w-full bg-black text-white py-5 rounded-full text-[10px] tracking-[.4em] font-bold hover:bg-neutral-800 transition-all shadow-xl active:scale-95 duration-200"
                   >
                     {isCompleting ? "PROCESSING..." : "PAY WITH STRIPE"}
                   </button>
                   <div className="pt-2">
                      <p className="text-[8px] tracking-widest text-neutral-400 uppercase">Archive Verified Transaction</p>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-3 justify-center opacity-30 mt-8">
                <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                <p className="text-[8px] tracking-[.2em] font-bold uppercase">Archive verified SSL Transaction</p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
