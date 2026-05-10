import { useEffect, useState, useCallback } from "react";

const KEY = "fm_wishlist_v1";
const EVENT = "fm_wishlist_change";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {}
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>(() => (typeof window === "undefined" ? [] : read()));

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    write(next);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter(x => x !== id));
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, remove, has, count: ids.length };
}
