import { useEffect, useState, useCallback } from "react";

const KEY = "fm_recently_viewed_v1";
const MAX = 8;

function read(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  } catch {}
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => (typeof window === "undefined" ? [] : read()));

  const track = useCallback((id: string) => {
    if (!id) return;
    const current = read();
    const next = [id, ...current.filter(x => x !== id)].slice(0, MAX);
    write(next);
    setIds(next);
  }, []);

  return { ids, track };
}

export function trackBookView(id: string) {
  if (!id || typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(KEY);
    const current: string[] = raw ? JSON.parse(raw) : [];
    const next = [id, ...current.filter(x => x !== id)].slice(0, MAX);
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}
