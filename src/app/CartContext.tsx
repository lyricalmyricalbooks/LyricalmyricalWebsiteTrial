import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";

interface CartItem {
  id: string;
  variantId?: string;
  variantName?: string;
  title: string;
  price: number;
  quantity: number;
  photoUrl: string;
  stripePriceId?: string;
  stockLimit?: number;
  shippingProfileId?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any, variant?: any, quantity?: number) => void;
  removeFromCart: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, variantId: string | undefined, delta: number) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Pure quantity merge: existing line quantity + requested amount, clamped to
 * the stock limit (999 = untracked stock). Exported for tests.
 */
export function nextCartQuantity(existingQty: number, requested: number, stockLimit?: number): number {
  const req = Math.max(1, Math.floor(requested) || 1);
  const next = Math.max(0, existingQty) + req;
  return typeof stockLimit === "number" && stockLimit !== 999 ? Math.min(next, stockLimit) : next;
}

/**
 * Validates a cart restored from storage: drops anything that isn't a line with
 * an id, a finite non-negative price and a positive whole quantity, so a stale
 * or tampered `fm_cart` can never put NaN into totals. Exported for tests.
 */
export function sanitizeCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CartItem[] = [];
  for (const line of raw) {
    if (!line || typeof line !== "object") continue;
    const i = line as any;
    const price = Number(i.price);
    const quantity = Math.floor(Number(i.quantity));
    if (typeof i.id !== "string" || !i.id) continue;
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity < 1) continue;
    out.push({ ...i, price, quantity, title: String(i.title ?? ""), photoUrl: String(i.photoUrl ?? "") });
  }
  return out;
}

/**
 * The unit price the server charges (functions/index.js): a variant's own price,
 * else the sale price only when it is a positive number, else the retail price.
 * NaN when the catalog has no usable price (the server refuses those too).
 * Exported for tests and for checkout cart recovery.
 */
export function catalogUnitPrice(book: any, variant?: any): number {
  const bookPrice = book?.isOnSale && Number(book?.salePrice) > 0 ? Number(book.salePrice) : Number(book?.retailPrice);
  if (variant) {
    const own = variant.price;
    return own === undefined || own === null || own === "" ? NaN : Number(own);
  }
  return bookPrice;
}

const CART_KEY = "fm_cart";

function readStoredCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? sanitizeCart(JSON.parse(saved)) : [];
  } catch {
    // Storage blocked (private mode) or corrupt JSON: start with an empty bag.
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Restored synchronously so the save effect below never writes an empty bag over the saved one.
  const [cart, setCart] = useState<CartItem[]>(readStoredCart);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Keep other open tabs in step (e.g. the bag emptied after a purchase in another tab).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CART_KEY) return;
      try { setCart(e.newValue ? sanitizeCart(JSON.parse(e.newValue)) : []); } catch { /* ignore corrupt value */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Save to local storage
  useEffect(() => {
    try {
      const next = JSON.stringify(cart);
      if (localStorage.getItem(CART_KEY) !== next) localStorage.setItem(CART_KEY, next);
    } catch {
      // Quota exceeded / storage unavailable: the in-memory cart still works.
    }
  }, [cart]);

  const addToCart = (product: any, variant?: any, quantity: number = 1) => {
    const stockLimit = variant ? (variant.stockLevel ?? variant.stock) : product.stockLevel;
    if (stockLimit === 0) return;
    const price = catalogUnitPrice(product, variant);
    // A book with no usable price can't be charged; never put a NaN line in the bag.
    if (!Number.isFinite(price) || price < 0) return;

    setCart(prev => {
      const existing = prev.find(i => i.id === product.id && i.variantId === variant?.id);
      if (existing) {
        if (typeof stockLimit === "number" && stockLimit !== 999 && existing.quantity >= stockLimit) {
          return prev;
        }
        return prev.map(i => i === existing
          ? { ...i, quantity: nextCartQuantity(existing.quantity, quantity, stockLimit) }
          : i
        );
      }
      const initial = nextCartQuantity(0, quantity, stockLimit);
      return [...prev, {
        id: product.id,
        variantId: variant?.id,
        variantName: variant?.name,
        title: product.title,
        price,
        quantity: initial,
        photoUrl: (variant && variant.photoUrl) ? variant.photoUrl : (product.photos?.[0]?.url || ""),
        stripePriceId: variant?.stripePriceId || product.stripePriceId || "",
        stockLimit: typeof stockLimit === "number" ? stockLimit : undefined,
        shippingProfileId: product.shippingProfileId || "",
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
        let newQty = Math.max(1, i.quantity + delta);
        if (typeof i.stockLimit === "number" && i.stockLimit !== 999) {
          newQty = Math.min(newQty, i.stockLimit);
        }
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  // ⚡ Bolt: Cache derived calculations using `useMemo`
  // Measured impact: prevents O(N) recalculations on provider renders caused by unrelated state changes (like `isCartOpen`)
  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, removeFromCart, updateQuantity, clearCart, setCart,
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
