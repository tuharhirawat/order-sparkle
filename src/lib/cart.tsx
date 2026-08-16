import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  sku: string;
  variantLabel: string | null;
  /** Display price only. Authoritative pricing is recalculated server-side. */
  price: number;
  imageUrl: string | null;
  quantity: number;
  maxQuantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  hydrated: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clear: () => void;
}

const STORAGE_KEY = "aurelia-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

const sameLine = (a: CartItem, productId: string, variantId: string | null) =>
  a.productId === productId && (a.variantId ?? null) === (variantId ?? null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed as CartItem[]);
      }
    } catch {
      /* corrupt cart — start empty */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => sameLine(i, item.productId, item.variantId));
      if (existing) {
        return prev.map((i) =>
          sameLine(i, item.productId, item.variantId)
            ? { ...i, ...item, quantity: Math.min(i.quantity + quantity, item.maxQuantity || 99) }
            : i,
        );
      }
      return [...prev, { ...item, quantity: Math.min(quantity, item.maxQuantity || 99) }];
    });
  }, []);

  const removeItem = useCallback((productId: string, variantId: string | null) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, productId, variantId)));
  }, []);

  const setQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (!sameLine(i, productId, variantId)) return [i];
        const next = Math.max(0, Math.min(quantity, i.maxQuantity || 99));
        return next === 0 ? [] : [{ ...i, quantity: next }];
      }),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      hydrated,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      addItem,
      removeItem,
      setQuantity,
      clear,
    }),
    [items, hydrated, addItem, removeItem, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
