import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import type { Anime } from "../../domain/anime/types";
import { mergeTrackedAnime } from "../../domain/tracker/merge";
import { resolveTrackingProgress } from "../../domain/tracker/progress";
import { calculateTrackerStats } from "../../domain/tracker/stats";
import type {
  TrackedAnime,
  TrackingStatus
} from "../../domain/tracker/types";
import { trackerRepository } from "../../services/storage/trackerRepository";
import { trackerCloudRepository } from "../../services/supabase/trackerCloudRepository";
import { useCloudAuth } from "./useCloudAuth";
import {
  TrackerContext,
  type TrackerContextValue
} from "./trackerContext";

const accountAuthEnabled =
  import.meta.env.VITE_ACCOUNT_AUTH_ENABLED === "true";

export function TrackerProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<TrackedAnime[]>(() =>
    accountAuthEnabled ? [] : trackerRepository.getAll()
  );
  const [syncStatus, setSyncStatus] = useState<
    "local" | "syncing" | "synced" | "error"
  >("local");
  const [syncError, setSyncError] = useState<string>();
  const itemsRef = useRef(items);
  const syncQueueRef = useRef(Promise.resolve());
  const syncedUserRef = useRef<string | undefined>(undefined);
  const { configured, user, initialized } = useCloudAuth();
  const canManage = !configured || Boolean(user);

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
    if (!configured) return;
    if (!user) {
      syncedUserRef.current = undefined;
      trackerRepository.clear();
      void Promise.resolve().then(() => {
        itemsRef.current = [];
        setItems([]);
        setSyncStatus("local");
        setSyncError(undefined);
      });
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
        const cloudItems = await trackerCloudRepository.getAll();
        if (cancelled) return;
        saveLocal(cloudItems);
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
  }, [configured, initialized, saveLocal, user]);

  const addAnime = useCallback(
    (anime: Anime, status: TrackingStatus = "plan_to_watch") => {
      if (!canManage) return;
      if (itemsRef.current.some((item) => item.anime.id === anime.id)) return;
      const created = trackerRepository.create(anime, status);
      saveLocal([created, ...itemsRef.current]);
      if (user) {
        enqueueCloud(() => trackerCloudRepository.upsert(created));
      }
    },
    [canManage, enqueueCloud, saveLocal, user]
  );

  const updateAnime = useCallback(
    (
      animeId: number,
      updates: Partial<
        Pick<TrackedAnime, "status" | "progress" | "userScore" | "notes">
      >
    ) => {
      if (!canManage) return;
      let updatedItem: TrackedAnime | undefined;
      const next = itemsRef.current.map((item) => {
        if (item.anime.id !== animeId) return item;
        const progress = resolveTrackingProgress(item, updates);
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
          trackerCloudRepository.upsert(itemToSync)
        );
      }
    },
    [canManage, enqueueCloud, saveLocal, user]
  );

  const removeAnime = useCallback(
    (animeId: number) => {
      if (!canManage) return;
      saveLocal(
        itemsRef.current.filter((item) => item.anime.id !== animeId)
      );
      if (user) {
        enqueueCloud(() => trackerCloudRepository.remove(animeId));
      }
    },
    [canManage, enqueueCloud, saveLocal, user]
  );

  const importItems = useCallback(
    (
      importedItems: TrackedAnime[],
      options: { replaceOnEqualUpdatedAt?: boolean } = {}
    ) => {
      if (!canManage) {
        return { added: 0, updated: 0, total: itemsRef.current.length };
      }
      const currentById = new Map(
        itemsRef.current.map((item) => [item.anime.id, item])
      );
      let added = 0;
      let updated = 0;

      for (const item of importedItems) {
        const existing = currentById.get(item.anime.id);
        if (!existing) {
          added += 1;
        } else if (
          item.updatedAt > existing.updatedAt ||
          (options.replaceOnEqualUpdatedAt &&
            item.updatedAt === existing.updatedAt)
        ) {
          updated += 1;
        }
      }

      const merged = mergeTrackedAnime(itemsRef.current, importedItems, {
        replaceOnEqualUpdatedAt: options.replaceOnEqualUpdatedAt
      });
      saveLocal(merged);
      if (user) {
        enqueueCloud(() =>
          trackerCloudRepository.upsertMany(merged)
        );
      }

      return { added, updated, total: merged.length };
    },
    [canManage, enqueueCloud, saveLocal, user]
  );

  const value = useMemo<TrackerContextValue>(
    () => ({
      items,
      canManage,
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
      canManage,
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
