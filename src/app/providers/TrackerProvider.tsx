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
import {
  historyForProgress,
  updateEpisodeHistory
} from "../../domain/tracker/episodes";
import { normalizeUserScore } from "../../domain/tracker/score";
import {
  createProfileSummary,
  type ProfileSummary
} from "../../domain/tracker/profileSummary";
import type {
  TrackedAnime,
  TrackingStatus
} from "../../domain/tracker/types";
import { trackerRepository } from "../../services/storage/trackerRepository";
import { trackerCloudRepository } from "../../services/supabase/trackerCloudRepository";
import { cloudLibraryCache } from "../../services/storage/cloudLibraryCache";
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
  const [hydratedUserId, setHydratedUserId] = useState<string>();
  const [remoteProfileSummary, setRemoteProfileSummary] =
    useState<ProfileSummary>();
  const itemsRef = useRef(items);
  const syncQueueRef = useRef(Promise.resolve());
  const syncedUserRef = useRef<string | undefined>(undefined);
  const { configured, user, initialized } = useCloudAuth();
  const activeUserIdRef = useRef(user?.id);
  const canManage = !configured || Boolean(user);
  const isReady =
    !configured || Boolean(user && hydratedUserId === user.id);

  useEffect(() => {
    activeUserIdRef.current = user?.id;
  }, [user?.id]);

  const saveItems = useCallback((next: TrackedAnime[]) => {
    itemsRef.current = next;
    setItems(next);
    setRemoteProfileSummary(undefined);
    const activeUserId = activeUserIdRef.current;
    if (activeUserId) {
      void cloudLibraryCache.save(activeUserId, next);
    } else {
      trackerRepository.save(next);
    }
  }, []);

  const enqueueCloud = useCallback(
    (operation: (expectedUserId: string) => Promise<void>) => {
      if (!user) return;
      const expectedUserId = user.id;
      setSyncStatus("syncing");
      setSyncError(undefined);
      syncQueueRef.current = syncQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (activeUserIdRef.current !== expectedUserId) return;
          await operation(expectedUserId);
          if (activeUserIdRef.current === expectedUserId) {
            setSyncStatus("synced");
          }
        })
        .catch((error: unknown) => {
          if (activeUserIdRef.current !== expectedUserId) return;
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
      const previousUserId = syncedUserRef.current;
      syncedUserRef.current = undefined;
      if (previousUserId) void cloudLibraryCache.clear(previousUserId);
      trackerRepository.clear();
      void Promise.resolve().then(() => {
        itemsRef.current = [];
        setItems([]);
        setRemoteProfileSummary(undefined);
        setHydratedUserId(undefined);
        setSyncStatus("local");
        setSyncError(undefined);
      });
      return;
    }
    if (syncedUserRef.current === user.id) return;
    syncedUserRef.current = user.id;

    let cancelled = false;
    const synchronize = async () => {
      await Promise.resolve();
      if (cancelled) return;
      itemsRef.current = [];
      setItems([]);
      setRemoteProfileSummary(undefined);
      setHydratedUserId(undefined);
      setSyncStatus("syncing");
      setSyncError(undefined);

      const cachedLibrary = await cloudLibraryCache.get(user.id);
      if (cancelled) return;
      if (cachedLibrary) {
        itemsRef.current = cachedLibrary;
        setItems(cachedLibrary);
        setHydratedUserId(user.id);
      }

      let libraryFinished = false;
      if (!cachedLibrary) {
        void trackerCloudRepository
          .getProfileSummary()
          .then((summary) => {
            if (!cancelled && !libraryFinished) {
              setRemoteProfileSummary(summary);
            }
          })
          .catch(() => undefined);
      }
      const libraryPromise = trackerCloudRepository.getAll();
      try {
        const cloudItems = await libraryPromise;
        libraryFinished = true;
        if (cancelled) return;
        saveItems(cloudItems);
        setHydratedUserId(user.id);
        setSyncStatus("synced");
        return;
      } catch (error: unknown) {
        libraryFinished = true;
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
  }, [configured, initialized, saveItems, user]);

  const addAnime = useCallback(
    (anime: Anime, status: TrackingStatus = "plan_to_watch") => {
      if (!canManage) return;
      if (itemsRef.current.some((item) => item.anime.id === anime.id)) return;
      const created = trackerRepository.create(anime, status);
      saveItems([created, ...itemsRef.current]);
      if (user) {
        enqueueCloud((expectedUserId) =>
          trackerCloudRepository.upsert(created, expectedUserId)
        );
      }
    },
    [canManage, enqueueCloud, saveItems, user]
  );

  const updateAnime = useCallback(
    (
      animeId: number,
      updates: Partial<
        Pick<TrackedAnime, "status" | "progress" | "episodeHistory" | "userScore" | "notes">
      >
    ) => {
      if (!canManage) return;
      let updatedItem: TrackedAnime | undefined;
      const next = itemsRef.current.map((item) => {
        if (item.anime.id !== animeId) return item;
        const progress = resolveTrackingProgress(item, updates);
        const normalizedUpdates =
          "userScore" in updates
            ? {
                ...updates,
                userScore: normalizeUserScore(updates.userScore)
              }
            : updates;
        const episodeHistory = "episodeHistory" in normalizedUpdates
          ? normalizedUpdates.episodeHistory
          : "progress" in normalizedUpdates
            ? historyForProgress(item, progress)
            : item.episodeHistory;
        updatedItem = {
          ...item,
          ...normalizedUpdates,
          progress,
          episodeHistory,
          updatedAt: new Date().toISOString()
        };
        return updatedItem;
      });
      if (!updatedItem) return;
      saveItems(next);
      if (user) {
        const itemToSync = updatedItem;
        enqueueCloud((expectedUserId) =>
          trackerCloudRepository.upsert(itemToSync, expectedUserId)
        );
      }
    },
    [canManage, enqueueCloud, saveItems, user]
  );

  const setEpisodeWatched = useCallback(
    (animeId: number, episode: number, watched: boolean, watchedAt?: string) => {
      const item = itemsRef.current.find((entry) => entry.anime.id === animeId);
      if (!item) return;
      updateAnime(
        animeId,
        updateEpisodeHistory(item, episode, watched, watchedAt)
      );
    },
    [updateAnime]
  );

  const removeAnime = useCallback(
    (animeId: number) => {
      if (!canManage) return;
      saveItems(
        itemsRef.current.filter((item) => item.anime.id !== animeId)
      );
      if (user) {
        enqueueCloud((expectedUserId) =>
          trackerCloudRepository.remove(animeId, expectedUserId)
        );
      }
    },
    [canManage, enqueueCloud, saveItems, user]
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
      saveItems(merged);
      if (user) {
        enqueueCloud((expectedUserId) =>
          trackerCloudRepository.upsertMany(merged, expectedUserId)
        );
      }

      return { added, updated, total: merged.length };
    },
    [canManage, enqueueCloud, saveItems, user]
  );

  const profileSummary = useMemo(
    () =>
      remoteProfileSummary ??
      (isReady ? createProfileSummary(items) : undefined),
    [isReady, items, remoteProfileSummary]
  );

  const value = useMemo<TrackerContextValue>(
    () => ({
      items,
      canManage,
      isReady,
      profileSummary,
      syncStatus: user ? syncStatus : "local",
      syncError: user ? syncError : undefined,
      getTracked: (animeId) =>
        items.find((item) => item.anime.id === animeId),
      addAnime,
      updateAnime,
      setEpisodeWatched,
      removeAnime,
      importItems
    }),
    [
      addAnime,
      canManage,
      importItems,
      isReady,
      items,
      profileSummary,
      removeAnime,
      syncError,
      syncStatus,
      updateAnime,
      setEpisodeWatched,
      user
    ]
  );

  return (
    <TrackerContext.Provider value={value}>
      {children}
    </TrackerContext.Provider>
  );
}
