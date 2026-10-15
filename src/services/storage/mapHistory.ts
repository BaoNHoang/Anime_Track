import type { Anime } from "../../domain/anime/types";

export interface MapHistoryEntry { id: number; title: string }
const KEY_PREFIX = "banime:map-history:v1:";
const MAX_HISTORY = 8;
const snapshots = new Map<string, MapHistoryEntry[]>();
const listeners = new Map<string, Set<() => void>>();

function key(owner: string) { return `${KEY_PREFIX}${owner}`; }

function readStorage(owner: string): MapHistoryEntry[] {
    try {
      const value: unknown = JSON.parse(sessionStorage.getItem(key(owner)) ?? "[]");
      if (!Array.isArray(value)) return [];
      return value.filter((entry): entry is MapHistoryEntry =>
        typeof entry === "object" && entry !== null &&
        Number.isSafeInteger(entry.id) && entry.id > 0 && entry.id <= 10_000_000 &&
        typeof entry.title === "string" && entry.title.length > 0 && entry.title.length <= 120
      ).slice(0, MAX_HISTORY);
    } catch { return []; }
}

function publish(owner: string, entries: MapHistoryEntry[]) {
  snapshots.set(owner, entries);
  for (const listener of listeners.get(owner) ?? []) listener();
}

export const mapHistory = {
  read(owner: string): MapHistoryEntry[] {
    let snapshot = snapshots.get(owner);
    if (!snapshot) {
      snapshot = readStorage(owner);
      snapshots.set(owner, snapshot);
    }
    return snapshot;
  },
  subscribe(owner: string, listener: () => void) {
    const subscribers = listeners.get(owner) ?? new Set<() => void>();
    subscribers.add(listener);
    listeners.set(owner, subscribers);
    return () => {
      subscribers.delete(listener);
      if (!subscribers.size) listeners.delete(owner);
    };
  },
  add(owner: string, anime: Anime): MapHistoryEntry[] {
    const entry = { id: anime.id, title: (anime.titleEnglish || anime.title).slice(0, 120) };
    const previous = this.read(owner);
    if (previous[0]?.id === entry.id && previous[0]?.title === entry.title) return previous;
    const next = [entry, ...previous.filter((item) => item.id !== entry.id)].slice(0, MAX_HISTORY);
    try { sessionStorage.setItem(key(owner), JSON.stringify(next)); }
    catch { /* The in-memory trail remains available for this view. */ }
    publish(owner, next);
    return next;
  },
  clear(owner: string) {
    try { sessionStorage.removeItem(key(owner)); }
    catch { /* Ignore unavailable browser storage. */ }
    publish(owner, []);
  }
};
