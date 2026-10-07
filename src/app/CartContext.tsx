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
  /** false when nothing could be added (sold out or no usable price). */
  addToCart: (product: any, variant?: any, quantity?: number) => boolean;
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
  const next = Math.min(MAX_LINE_QUANTITY, Math.max(0, existingQty) + req);
  return typeof stockLimit === "number" && stockLimit !== 999 ? Math.min(next, stockLimit) : next;
}

/** The server charges at most 99 copies per line (functions/index.js recalculateOrder). */
export const MAX_LINE_QUANTITY = 99;

/** How many copies a shopper may have of a line: stock when it is tracked, never above 99. */
export function lineQuantityCap(stockLimit?: number): number {
  return typeof stockLimit === "number" && stockLimit !== 999 ? Math.min(MAX_LINE_QUANTITY, Math.max(0, stockLimit)) : MAX_LINE_QUANTITY;
}

/**
 * Brings a bag saved earlier in line with the current catalog, the same way the server
 * prices it: current unit price, current stock cap, and books or editions that can no
 * longer be bought removed. `changed` lists what moved so checkout can tell the shopper.
 * Exported for tests.
 */
export function repriceCart(cart: CartItem[], books: any[]): { cart: CartItem[]; changed: boolean; removed: string[]; repriced: string[] } {
  const byId = new Map((books || []).map((b: any) => [b.id, b]));
  const out: CartItem[] = [];
  const removed: string[] = [];
  const repriced: string[] = [];
  let changed = false;
  for (const line of cart) {
    const book = byId.get(line.id);
    const variant = line.variantId ? (book?.variants || []).find((v: any) => v.id === line.variantId) : undefined;
    const price = book ? catalogUnitPrice(book, variant) : NaN;
    if (!book || (line.variantId && !variant) || !Number.isFinite(price) || price < 0) {
      removed.push(line.title || line.id);
      changed = true;
      continue;
    }
    const tracked = book.trackInventory === true && book.allowBackorder !== true && !(variant?.allowBackorder);
    const stock = Number(variant ? (variant.stock ?? variant.stockLevel) : book.stockLevel);
    const stockLimit = tracked && Number.isFinite(stock) ? Math.max(0, stock) : 999;
    if (stockLimit === 0) {
      removed.push(line.title || line.id);
      changed = true;
      continue;
    }
    const quantity = Math.min(line.quantity, lineQuantityCap(stockLimit));
    if (Math.abs(price - line.price) > 0.0001) repriced.push(line.title || line.id);
    if (Math.abs(price - line.price) > 0.0001 || quantity !== line.quantity || stockLimit !== line.stockLimit) changed = true;
    out.push({ ...line, price, quantity, stockLimit });
  }
  return { cart: changed ? out : cart, changed, removed, repriced };
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

  const addToCart = (product: any, variant?: any, quantity: number = 1): boolean => {
    const stockLimit = variant ? (variant.stockLevel ?? variant.stock) : product.stockLevel;
    if (typeof stockLimit === "number" && stockLimit <= 0) return false;
    const price = catalogUnitPrice(product, variant);
    // A book with no usable price can't be charged; never put a NaN line in the bag.
    if (!Number.isFinite(price) || price < 0) return false;

    setCart(prev => {
      const existing = prev.find(i => i.id === product.id && i.variantId === variant?.id);
      if (existing) {
        if (existing.quantity >= lineQuantityCap(stockLimit)) {
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
    return true;
  };

  const removeFromCart = (id: string, variantId?: string) => {
    setCart(prev => prev.filter(i => !(i.id === id && i.variantId === variantId)));
  };

  const updateQuantity = (id: string, variantId: string | undefined, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id && i.variantId === variantId) {
        const newQty = Math.min(Math.max(1, i.quantity + delta), Math.max(1, lineQuantityCap(i.stockLimit)));
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
