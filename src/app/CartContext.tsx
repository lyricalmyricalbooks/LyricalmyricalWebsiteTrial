import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CartItem {
  id: string;
  variantId?: string;
  variantName?: string;
  title: string;
  price: number;
  quantity: number;
  photoUrl: string;
  stripePriceId?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any, variant?: any) => void;
  removeFromCart: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, variantId: string | undefined, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("fm_cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem("fm_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: any, variant?: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id && i.variantId === variant?.id);
      if (existing) {
        return prev.map(i => (i.id === product.id && i.variantId === variant?.id) 
          ? { ...i, quantity: i.quantity + 1 } 
          : i
        );
      }
      return [...prev, {
        id: product.id,
        variantId: variant?.id,
        variantName: variant?.name,
        title: product.title,
        price: variant ? variant.price : (product.isOnSale ? product.salePrice : product.retailPrice),
        quantity: 1,
        photoUrl: product.photos?.[0]?.url || "",
        stripePriceId: variant?.stripePriceId || product.stripePriceId || ""
      }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string, variantId?: string) => {
    setCart(prev => prev.filter(i => !(i.id === id && i.variantId === variantId)));
  };

  const updateQuantity = (id: string, variantId: string | undefined, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id && i.variantId === variantId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, updateQuantity, clearCart, 
      cartTotal, cartCount, isCartOpen, setIsCartOpen 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
