import { useSyncExternalStore } from "react";
import { useCloudAuth } from "../app/providers/useCloudAuth";

const EMPTY_IDS: ReadonlySet<number> = new Set();
const idsByKey = new Map<string, ReadonlySet<number>>();
const listeners = new Set<() => void>();

function readIds(key: string): ReadonlySet<number> {
  try {
    const ids: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    if (Array.isArray(ids)) {
      return new Set(ids.filter((id): id is number => Number.isSafeInteger(id) && id > 0));
    }
  } catch {
    // Recommendations still work when browser storage is unavailable.
  }
  return EMPTY_IDS;
}

function getIds(key: string) {
  const cached = idsByKey.get(key);
  if (cached) return cached;
  const ids = readIds(key);
  idsByKey.set(key, ids);
  return ids;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function saveIds(key: string, ids: ReadonlySet<number>) {
  idsByKey.set(key, ids);
  try {
    if (ids.size) window.localStorage.setItem(key, JSON.stringify([...ids]));
    else window.localStorage.removeItem(key);
  } catch {
    // Keep the preference for this session even if it cannot be saved.
  }
  listeners.forEach((listener) => listener());
}

export function useHiddenRecommendations() {
  const { user, configured } = useCloudAuth();
  const owner = user ? `account:${user.id}` : configured ? "guest" : "local";
  const key = `banime:hidden-recommendations:v1:${owner}`;
  const hiddenIds = useSyncExternalStore(subscribe, () => getIds(key), () => EMPTY_IDS);
  return {
    hiddenIds,
    hide: (id: number) => saveIds(key, new Set([...getIds(key), id])),
    reset: () => saveIds(key, EMPTY_IDS)
  };
}
