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

import { libraryOutbox } from "../../services/storage/libraryOutbox";

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
  const syncedUserRef = useRef<string | undefined>(undefined);
  const { configured, user, initialized } = useCloudAuth();
  const activeUserIdRef = useRef(user?.id);
  const canManage = !configured || Boolean(user && hydratedUserId === user.id);
  const isReady =
    !configured || Boolean(user && hydratedUserId === user.id);

  useEffect(() => {
    activeUserIdRef.current = user?.id;
  }, [user?.id]);

  const saveItems = useCallback((next: TrackedAnime[], trackChanges = true) => {
    const owner = activeUserIdRef.current;
    if (owner && trackChanges) {
      try { libraryOutbox.record(owner, itemsRef.current, next); }
      catch {
        setSyncStatus("error");
        setSyncError("This device could not save the edit. Free site storage or export a backup and try again.");
        return false;
      }
    }
    itemsRef.current = next;
    setItems(next);
    setRemoteProfileSummary(undefined);
    const activeUserId = activeUserIdRef.current;
    if (activeUserId) {
      void cloudLibraryCache.save(activeUserId, next);
    } else {
      trackerRepository.save(next);
    }
    return true;
  }, []);

  const enqueueCloud = useCallback(() => {
    if (!user) return;
    const owner = user.id;
    setSyncStatus("syncing");
    setSyncError(undefined);
    void libraryOutbox.flush(owner, () => activeUserIdRef.current === owner)
      .then(() => { if (activeUserIdRef.current === owner) setSyncStatus("synced"); })
      .catch((error: unknown) => {
        if (activeUserIdRef.current !== owner) return;
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Sync failed.");
      });
  }, [user]);

  useEffect(() => {
    window.addEventListener("online", enqueueCloud);
    return () => window.removeEventListener("online", enqueueCloud);
  }, [enqueueCloud]);

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
        const restored = libraryOutbox.overlay(user.id, cachedLibrary);
        itemsRef.current = restored;
        setItems(restored);
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
      const libraryAtRequest = itemsRef.current;
      const libraryPromise = trackerCloudRepository.getAll();
      try {
        const cloudItems = await libraryPromise;
        libraryFinished = true;
        if (cancelled) return;
        // A response started before a local edit must not undo that edit,
        // including a deletion already acknowledged while this read was pending.
        if (itemsRef.current === libraryAtRequest) {
          saveItems(libraryOutbox.overlay(user.id, cloudItems), false);
        }
        setHydratedUserId(user.id);
        enqueueCloud();
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
  }, [configured, initialized, saveItems, user, enqueueCloud]);

  const addAnime = useCallback(
    (anime: Anime, status: TrackingStatus = "plan_to_watch") => {
      if (!canManage) return;
      if (itemsRef.current.some((item) => item.anime.id === anime.id)) return;
      const created = trackerRepository.create(anime, status);
      if (!saveItems([created, ...itemsRef.current])) return;
      if (user) {
        enqueueCloud();
      }
    },
    [canManage, enqueueCloud, saveItems, user]
  );

  const updateAnime = useCallback(
    (
      animeId: number,
      updates: Partial<
        Pick<TrackedAnime, "status" | "progress" | "episodeHistory" | "releaseNotificationMode" | "userScore" | "notes" | "customLists">
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
      if (!saveItems(next)) return;
      if (user) {
        enqueueCloud();
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
      if (!saveItems(
        itemsRef.current.filter((item) => item.anime.id !== animeId)
      )) return;
      if (user) {
        enqueueCloud();
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
      if (!saveItems(merged)) return { added: 0, updated: 0, total: itemsRef.current.length };
      if (user) {
        enqueueCloud();
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
