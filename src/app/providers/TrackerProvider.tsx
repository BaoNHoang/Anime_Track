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
import { previewLibraryImport } from "../../domain/tracker/importPreview";
import { MAX_LIBRARY_ITEMS } from "../../domain/tracker/import";
import { resolveTrackingProgress } from "../../domain/tracker/progress";
import {
  historyForProgress,
  updateEpisodeHistory,
  watchedEpisodeNumbers
} from "../../domain/tracker/episodes";
import { startRewatch as createRewatch } from "../../domain/tracker/rewatch";
import { undoEpisodeUpdate } from "../../domain/tracker/undoEpisode";
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
import { cloudLibraryCache, isFreshCloudLibrary } from "../../services/storage/cloudLibraryCache";
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
  const undoToken = useRef(0);
  const importUndoToken = useRef(0);
  const importUndoRef = useRef<{
    token: number; owner?: string; before: TrackedAnime[]; after: TrackedAnime[];
  } | undefined>(undefined);
  const [episodeUndo, setEpisodeUndo] = useState<{
    token: number;
    message: string;
    owner?: string;
    before: TrackedAnime;
    after: TrackedAnime;
  }>();
  const itemsRef = useRef(items);
  const syncedUserRef = useRef<string | undefined>(undefined);
  const lastCloudReadRef = useRef(0);
  const refreshFlightRef = useRef<{ owner: string; promise: Promise<boolean> } | undefined>(undefined);
  const { configured, user, initialized } = useCloudAuth();
  const userId = user?.id;
  const activeUserIdRef = useRef(userId);
  const canManage = !configured || Boolean(user && hydratedUserId === user.id);
  const isReady =
    !configured || Boolean(user && hydratedUserId === user.id);

  useEffect(() => {
    activeUserIdRef.current = userId;
  }, [userId]);

  const saveItems = useCallback((next: TrackedAnime[], trackChanges = true, verifiedAt?: number) => {
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
      void cloudLibraryCache.save(activeUserId, next, verifiedAt);
    } else {
      trackerRepository.save(next);
    }
    return true;
  }, []);

  const enqueueCloud = useCallback(() => {
    if (!userId) return;
    const owner = userId;
    setSyncStatus("syncing");
    setSyncError(undefined);
    void libraryOutbox.flush(owner, () => activeUserIdRef.current === owner)
      .then(() => { if (activeUserIdRef.current === owner) setSyncStatus("synced"); })
      .catch((error: unknown) => {
        if (activeUserIdRef.current !== owner) return;
        setSyncStatus("error");
        setSyncError(error instanceof Error ? error.message : "Sync failed.");
      });
  }, [userId]);

  useEffect(() => {
    window.addEventListener("online", enqueueCloud);
    return () => window.removeEventListener("online", enqueueCloud);
  }, [enqueueCloud]);

  const refreshLibrary = useCallback((): Promise<boolean> => {
    const owner = userId;
    if (!owner || hydratedUserId !== owner || !navigator.onLine) return Promise.resolve(false);
    if (refreshFlightRef.current?.owner === owner) return refreshFlightRef.current.promise;
    setSyncStatus("syncing");
    setSyncError(undefined);
    const beforeRequest = itemsRef.current;
    const flight = trackerCloudRepository.getAll()
      .then((cloudItems) => {
        if (activeUserIdRef.current !== owner) return false;
        if (itemsRef.current !== beforeRequest) {
          // A local edit made during this request must keep its current snapshot.
          enqueueCloud();
          return false;
        }
        const verifiedAt = Date.now();
        saveItems(libraryOutbox.overlay(owner, cloudItems), false, verifiedAt);
        lastCloudReadRef.current = verifiedAt;
        enqueueCloud();
        return true;
      })
      .catch((error: unknown) => {
        if (activeUserIdRef.current === owner) {
          setSyncStatus("error");
          setSyncError(error instanceof Error ? error.message : "Cloud sync failed.");
        }
        return false;
      })
      .finally(() => {
        if (refreshFlightRef.current?.owner === owner) refreshFlightRef.current = undefined;
      });
    refreshFlightRef.current = { owner, promise: flight };
    return flight;
  }, [enqueueCloud, hydratedUserId, saveItems, userId]);

  useEffect(() => {
    if (!userId || hydratedUserId !== userId) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine || syncStatus === "syncing") return;
      if (!isFreshCloudLibrary({ verifiedAt: lastCloudReadRef.current })) void refreshLibrary();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [hydratedUserId, refreshLibrary, syncStatus, userId]);

  useEffect(() => {
    if (!initialized) return;
    if (!configured) return;
    if (!userId) {
      const previousUserId = syncedUserRef.current;
      syncedUserRef.current = undefined;
      lastCloudReadRef.current = 0;
      importUndoRef.current = undefined;
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
    if (syncedUserRef.current !== userId) {
      lastCloudReadRef.current = 0;
      importUndoRef.current = undefined;
    }
    syncedUserRef.current = userId;

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

      const cachedLibrary = await cloudLibraryCache.get(userId);
      if (cancelled) return;
      if (cachedLibrary) {
        const restored = libraryOutbox.overlay(userId, cachedLibrary.items);
        itemsRef.current = restored;
        setItems(restored);
        setHydratedUserId(userId);
        if (navigator.onLine && isFreshCloudLibrary(cachedLibrary)) {
          lastCloudReadRef.current = cachedLibrary.verifiedAt ?? 0;
          enqueueCloud();
          return;
        }
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
          const verifiedAt = Date.now();
          saveItems(libraryOutbox.overlay(userId, cloudItems), false, verifiedAt);
          lastCloudReadRef.current = verifiedAt;
        }
        setHydratedUserId(userId);
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
  }, [configured, initialized, saveItems, userId, enqueueCloud]);

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
      if (!canManage) return false;
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
          completedAt: (normalizedUpdates.status ?? item.status) === "completed"
            ? item.status === "completed" ? item.completedAt ?? item.updatedAt : new Date().toISOString()
            : undefined,
          updatedAt: new Date().toISOString()
        };
        return updatedItem;
      });
      if (!updatedItem) return false;
      if (!saveItems(next)) return false;
      if (user) {
        enqueueCloud();
      }
      return true;
    },
    [canManage, enqueueCloud, saveItems, user]
  );

  const setEpisodeWatched = useCallback(
    (animeId: number, episode: number, watched: boolean, watchedAt?: string) => {
      const item = itemsRef.current.find((entry) => entry.anime.id === animeId);
      if (!item) return;
      const newlyWatched = watched && !watchedEpisodeNumbers(item).has(episode);
      const saved = updateAnime(
        animeId,
        updateEpisodeHistory(item, episode, watched, watchedAt)
      );
      if (saved && newlyWatched) {
        const after = itemsRef.current.find((entry) => entry.anime.id === animeId)!;
        setEpisodeUndo({
          token: ++undoToken.current,
          message: `Episode ${episode} watched · ${item.anime.titleEnglish || item.anime.title}`,
          owner: activeUserIdRef.current,
          before: item,
          after
        });
      }
    },
    [updateAnime]
  );

  const startRewatch = useCallback((animeId: number) => {
    if (!canManage) return;
    const item = itemsRef.current.find((entry) => entry.anime.id === animeId);
    if (!item) return;
    const rewatch = createRewatch(item);
    if (!saveItems(itemsRef.current.map((entry) => entry === item ? rewatch : entry))) return;
    setEpisodeUndo(undefined);
    if (user) enqueueCloud();
  }, [canManage, enqueueCloud, saveItems, user]);

  const dismissEpisodeUndo = useCallback(() => setEpisodeUndo(undefined), []);
  const undoEpisode = useCallback(() => {
    if (!canManage || !episodeUndo || episodeUndo.owner !== activeUserIdRef.current) return;
    const current = itemsRef.current.find((item) => item.anime.id === episodeUndo.before.anime.id);
    const restored = current && undoEpisodeUpdate(current, episodeUndo.before, episodeUndo.after);
    if (current && restored) {
      const next = { ...current, ...restored, updatedAt: new Date().toISOString() };
      if (!saveItems(itemsRef.current.map((item) => item === current ? next : item))) return;
      if (user) enqueueCloud();
    }
    setEpisodeUndo(undefined);
  }, [canManage, enqueueCloud, episodeUndo, saveItems, user]);

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
      options: { replaceOnEqualUpdatedAt?: boolean; continueUndoToken?: number } = {}
    ) => {
      const preview = previewLibraryImport(itemsRef.current, importedItems, options);
      if (!canManage || preview.total > MAX_LIBRARY_ITEMS) {
        return { ...preview, applied: false };
      }
      const previousUndo = importUndoRef.current;
      if (options.continueUndoToken &&
        (previousUndo?.token !== options.continueUndoToken ||
          previousUndo.after !== itemsRef.current || previousUndo.owner !== activeUserIdRef.current)) {
        return { ...preview, applied: false };
      }
      if (!preview.added && !preview.updated) return { ...preview, applied: false };

      const merged = mergeTrackedAnime(itemsRef.current, importedItems, {
        replaceOnEqualUpdatedAt: options.replaceOnEqualUpdatedAt
      });
      const before = options.continueUndoToken ? previousUndo!.before : itemsRef.current;
      if (!saveItems(merged)) return { ...preview, applied: false };
      const token = options.continueUndoToken ?? ++importUndoToken.current;
      importUndoRef.current = { token, owner: activeUserIdRef.current, before, after: merged };
      if (user) {
        enqueueCloud();
      }

      return { ...preview, total: merged.length, applied: true, undoToken: token };
    },
    [canManage, enqueueCloud, saveItems, user]
  );

  const undoImport = useCallback((token: number) => {
    const undo = importUndoRef.current;
    if (!canManage || !undo || undo.token !== token || undo.owner !== activeUserIdRef.current ||
      undo.after !== itemsRef.current) return false;
    if (!saveItems(undo.before)) return false;
    importUndoRef.current = undefined;
    if (user) enqueueCloud();
    return true;
  }, [canManage, enqueueCloud, saveItems, user]);

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
      refreshLibrary,
      getTracked: (animeId) =>
        items.find((item) => item.anime.id === animeId),
      addAnime,
      updateAnime,
      setEpisodeWatched,
      startRewatch,
      episodeUndo: episodeUndo && episodeUndo.owner === user?.id && canManage &&
        items.some((item) => item.anime.id === episodeUndo?.before.anime.id &&
          undoEpisodeUpdate(item, episodeUndo.before, episodeUndo.after))
        ? { token: episodeUndo.token, message: episodeUndo.message } : undefined,
      undoEpisode,
      dismissEpisodeUndo,
      removeAnime,
      importItems,
      undoImport
    }),
    [
      addAnime,
      canManage,
      importItems,
      undoImport,
      isReady,
      items,
      profileSummary,
      refreshLibrary,
      removeAnime,
      syncError,
      syncStatus,
      updateAnime,
      setEpisodeWatched,
      startRewatch,
      episodeUndo,
      undoEpisode,
      dismissEpisodeUndo,
      user
    ]
  );

  return (
    <TrackerContext.Provider value={value}>
      {children}
    </TrackerContext.Provider>
  );
}
