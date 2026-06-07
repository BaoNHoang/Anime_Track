import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import type { Anime } from "../domain/anime/types";
import { mergeTrackedAnime } from "../domain/tracker/merge";
import { calculateTrackerStats } from "../domain/tracker/stats";
import type {
  TrackedAnime,
  TrackingStatus
} from "../domain/tracker/types";
import { trackerRepository } from "../services/storage/trackerRepository";
import { trackerCloudRepository } from "../services/supabase/trackerCloudRepository";
import { useCloudAuth } from "../hooks/useCloudAuth";
import {
  TrackerContext,
  type TrackerContextValue
} from "./trackerContext";

export function TrackerProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState(() => trackerRepository.getAll());
  const [syncStatus, setSyncStatus] = useState<
    "local" | "syncing" | "synced" | "error"
  >("local");
  const [syncError, setSyncError] = useState<string>();
  const itemsRef = useRef(items);
  const syncQueueRef = useRef(Promise.resolve());
  const syncedUserRef = useRef<string | undefined>(undefined);
  const { user, initialized } = useCloudAuth();

  const saveLocal = useCallback((next: TrackedAnime[]) => {
    itemsRef.current = next;
    setItems(next);
    trackerRepository.save(next);
  }, []);

  const enqueueCloud = useCallback(
    (operation: () => Promise<void>) => {
      if (!user) return;
      setSyncStatus("syncing");
      setSyncError(undefined);
      syncQueueRef.current = syncQueueRef.current
        .catch(() => undefined)
        .then(operation)
        .then(() => setSyncStatus("synced"))
        .catch((error: unknown) => {
          setSyncStatus("error");
          setSyncError(
            error instanceof Error ? error.message : "Cloud sync failed."
          );
        });
    },
    [user]
  );

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      syncedUserRef.current = undefined;
      return;
    }
    if (syncedUserRef.current === user.id) return;

    let cancelled = false;
    const synchronize = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setSyncStatus("syncing");
      setSyncError(undefined);

      try {
        const cloudItems = await trackerCloudRepository.getAll(user.id);
        if (cancelled) return;
        const merged = mergeTrackedAnime(itemsRef.current, cloudItems);
        saveLocal(merged);
        await trackerCloudRepository.upsertMany(user.id, merged);
        if (cancelled) return;
        syncedUserRef.current = user.id;
        setSyncStatus("synced");
      } catch (error: unknown) {
        if (cancelled) return;
        setSyncStatus("error");
        setSyncError(
          error instanceof Error ? error.message : "Cloud sync failed."
        );
      }
    };

    void synchronize();

    return () => {
      cancelled = true;
    };
  }, [initialized, saveLocal, user]);

  const addAnime = useCallback(
    (anime: Anime, status: TrackingStatus = "plan_to_watch") => {
      if (itemsRef.current.some((item) => item.anime.id === anime.id)) return;
      const created = trackerRepository.create(anime, status);
      saveLocal([created, ...itemsRef.current]);
      if (user) {
        enqueueCloud(() => trackerCloudRepository.upsert(user.id, created));
      }
    },
    [enqueueCloud, saveLocal, user]
  );

  const updateAnime = useCallback(
    (
      animeId: number,
      updates: Partial<
        Pick<TrackedAnime, "status" | "progress" | "userScore" | "notes">
      >
    ) => {
      let updatedItem: TrackedAnime | undefined;
      const next = itemsRef.current.map((item) => {
        if (item.anime.id !== animeId) return item;
        const progress = Math.max(
          0,
          Math.min(
            updates.progress ?? item.progress,
            item.anime.episodes ?? Number.MAX_SAFE_INTEGER
          )
        );
        updatedItem = {
          ...item,
          ...updates,
          progress,
          updatedAt: new Date().toISOString()
        };
        return updatedItem;
      });
      if (!updatedItem) return;
      saveLocal(next);
      if (user) {
        const itemToSync = updatedItem;
        enqueueCloud(() =>
          trackerCloudRepository.upsert(user.id, itemToSync)
        );
      }
    },
    [enqueueCloud, saveLocal, user]
  );

  const removeAnime = useCallback(
    (animeId: number) => {
      saveLocal(
        itemsRef.current.filter((item) => item.anime.id !== animeId)
      );
      if (user) {
        enqueueCloud(() => trackerCloudRepository.remove(user.id, animeId));
      }
    },
    [enqueueCloud, saveLocal, user]
  );

  const importItems = useCallback(
    (importedItems: TrackedAnime[]) => {
      const currentById = new Map(
        itemsRef.current.map((item) => [item.anime.id, item])
      );
      let added = 0;
      let updated = 0;

      for (const item of importedItems) {
        const existing = currentById.get(item.anime.id);
        if (!existing) {
          added += 1;
        } else if (item.updatedAt > existing.updatedAt) {
          updated += 1;
        }
      }

      const merged = mergeTrackedAnime(itemsRef.current, importedItems);
      saveLocal(merged);
      if (user) {
        enqueueCloud(() =>
          trackerCloudRepository.upsertMany(user.id, merged)
        );
      }

      return { added, updated, total: merged.length };
    },
    [enqueueCloud, saveLocal, user]
  );

  const value = useMemo<TrackerContextValue>(
    () => ({
      items,
      stats: calculateTrackerStats(items),
      syncStatus: user ? syncStatus : "local",
      syncError: user ? syncError : undefined,
      getTracked: (animeId) =>
        items.find((item) => item.anime.id === animeId),
      addAnime,
      updateAnime,
      removeAnime,
      importItems
    }),
    [
      addAnime,
      importItems,
      items,
      removeAnime,
      syncError,
      syncStatus,
      updateAnime,
      user
    ]
  );

  return (
    <TrackerContext.Provider value={value}>
      {children}
    </TrackerContext.Provider>
  );
}
