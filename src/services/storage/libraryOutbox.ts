import { parseLibraryImport } from "../../domain/tracker/import";
import type { TrackedAnime } from "../../domain/tracker/types";
import { trackerCloudRepository } from "../supabase/trackerCloudRepository";

interface Change { id: number; item?: TrackedAnime; revision: string }
const key = (owner: string) => `banime:library-outbox:v1:${owner}`;
const flights = new Map<string, Promise<void>>();

function read(owner: string): Change[] {
  const value: unknown = JSON.parse(localStorage.getItem(key(owner)) ?? "[]");
  if (!Array.isArray(value) || value.length > 5000) throw new Error("Offline changes could not be read.");
  return value.map((entry: Change) => {
    if (!Number.isInteger(entry.id) || entry.id <= 0 || entry.id > 10000000 ||
      typeof entry.revision !== "string") throw new Error("Invalid offline change.");
    return { ...entry, item: entry.item ? parseLibraryImport([entry.item])[0] : undefined };
  });
}

export const libraryOutbox = {
  record(owner: string, before: TrackedAnime[], after: TrackedAnime[]) {
    const pending = new Map(read(owner).map((entry) => [entry.id, entry]));
    const previous = new Map(before.map((item) => [item.anime.id, item]));
    const next = new Map(after.map((item) => [item.anime.id, item]));
    for (const item of after) if (previous.get(item.anime.id) !== item) {
      pending.set(item.anime.id, { id: item.anime.id, item, revision: crypto.randomUUID() });
    }
    for (const item of before) if (!next.has(item.anime.id)) {
      pending.set(item.anime.id, { id: item.anime.id, revision: crypto.randomUUID() });
    }
    localStorage.setItem(key(owner), JSON.stringify([...pending.values()]));
  },
  overlay(owner: string, items: TrackedAnime[]) {
    const result = new Map(items.map((item) => [item.anime.id, item]));
    for (const entry of read(owner)) {
      if (entry.item) result.set(entry.id, entry.item);
      else result.delete(entry.id);
    }
    return [...result.values()];
  },
  flush(owner: string, isCurrent: () => boolean): Promise<void> {
    const existing = flights.get(owner);
    if (existing) return existing;
    const flight = (async () => {
      while (navigator.onLine && isCurrent()) {
        const entry = read(owner)[0];
        if (!entry) return;
        if (entry.item) await trackerCloudRepository.upsert(entry.item, owner);
        else await trackerCloudRepository.remove(entry.id, owner);
        // A newer edit made during the request must remain queued.
        localStorage.setItem(key(owner), JSON.stringify(
          read(owner).filter((current) => current.revision !== entry.revision)
        ));
        if (read(owner).length) await new Promise((resolve) => setTimeout(resolve, 1100));
      }
      if (read(owner).length) throw new Error("Offline changes saved on this device. Reconnect to sync.");
    })().finally(() => flights.delete(owner));
    flights.set(owner, flight);
    return flight;
  }
};
