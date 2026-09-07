import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import {
  findReleasedAnime,
  mergeReleaseNotifications,
  pruneReleaseNotifications,
  type ReleaseNotification
} from "../../domain/notifications/releaseNotifications";
import { notificationRepository } from "../../services/storage/notificationRepository";
import { notificationCloudRepository } from "../../services/notifications/notificationCloudRepository";
import { findUpcomingSeasonNotifications } from "../../services/tenrai/seasonNotifications";
import { NotificationContext } from "./notificationContext";
import { useCloudAuth } from "./useCloudAuth";
import { useTracker } from "./useTracker";

const CHECK_INTERVAL_MS = 60 * 1000;
const SEASON_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function NotificationProvider({ children }: PropsWithChildren) {
  const { configured, initialized, user } = useCloudAuth();
  const { isReady, items } = useTracker();
  const itemsRef = useRef(items);
  const activeOwnerRef = useRef<string | undefined>(undefined);
  const checkingRef = useRef(false);
  const seasonOffsetRef = useRef(0);
  const seasonAbortRef = useRef<AbortController | undefined>(undefined);
  const seasonCheckRef = useRef<{ owner: string; at: number } | undefined>(undefined);
  const [error, setError] = useState<string>();
  const [notifications, setNotifications] = useState<ReleaseNotification[]>([]);
  const [inboxOwner, setInboxOwner] = useState<string>();
  const ownerId = initialized
    ? configured
      ? user?.id
      : "local-profile"
    : undefined;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    activeOwnerRef.current = ownerId;
    seasonOffsetRef.current = 0;
    return () => {
      activeOwnerRef.current = undefined;
      seasonAbortRef.current?.abort();
    };
  }, [ownerId]);

  const checkForReleases = useCallback(async () => {
    if (!ownerId || !isReady) {
      setNotifications([]);
      return;
    }

    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      const current = configured
        ? await notificationCloudRepository.get()
        : notificationRepository.get(ownerId);
      if (activeOwnerRef.current !== ownerId) return;
      setInboxOwner(ownerId);
      const now = new Date();
      const released = findReleasedAnime(itemsRef.current, current.lastCheckedAt, now);
      const merged = pruneReleaseNotifications(
        mergeReleaseNotifications(current.notifications, released), itemsRef.current
      );
      setNotifications(merged);
      const ids = new Set(merged.map((entry) => entry.id));
      const state = configured
        ? await notificationCloudRepository.sync(
            now.toISOString(), merged, current.seenSeasonIds,
            current.notifications.filter((entry) => !ids.has(entry.id)).map((entry) => entry.id),
            ownerId
          )
        : { ...current, lastCheckedAt: now.toISOString(), notifications: merged };
      if (activeOwnerRef.current !== ownerId) return;
      notificationRepository.save(ownerId, state);
      setNotifications(pruneReleaseNotifications(state.notifications, itemsRef.current));
      setError(undefined);

      // Episode delivery and inbox hydration finish before the optional catalog scan.
      const last = seasonCheckRef.current;
      if ((!last || last.owner !== ownerId || Date.now() - last.at >= SEASON_CHECK_INTERVAL_MS)
        && navigator.onLine) {
        seasonCheckRef.current = { owner: ownerId, at: Date.now() };
        const controller = new AbortController();
        seasonAbortRef.current?.abort();
        seasonAbortRef.current = controller;
        const offset = seasonOffsetRef.current;
        seasonOffsetRef.current += 25;
        void findUpcomingSeasonNotifications(itemsRef.current, state.seenSeasonIds, now, {
          offset, limit: 25, signal: controller.signal
        })
          .then(async (seasons) => {
            if (activeOwnerRef.current !== ownerId) return;
            const latest = configured
              ? await notificationCloudRepository.get()
              : notificationRepository.get(ownerId);
            if (activeOwnerRef.current !== ownerId) return;
            const combined = pruneReleaseNotifications(
              mergeReleaseNotifications(latest.notifications, seasons.notifications), itemsRef.current
            );
            const updated = configured
              ? await notificationCloudRepository.sync(
                  latest.lastCheckedAt ?? now.toISOString(), combined,
                  [...new Set([...latest.seenSeasonIds, ...seasons.seenSeasonIds])].slice(-500),
                  [], ownerId
                )
              : { ...latest, notifications: combined, seenSeasonIds: seasons.seenSeasonIds };
            if (activeOwnerRef.current !== ownerId) return;
            notificationRepository.save(ownerId, updated);
            setNotifications(pruneReleaseNotifications(updated.notifications, itemsRef.current));
          }).catch(() => {
            if (activeOwnerRef.current === ownerId) {
              seasonCheckRef.current = undefined;
              setError("Season announcements could not refresh. Episode checks will continue.");
            }
          });
      }
    } catch (failure) {
      if (activeOwnerRef.current !== ownerId) return;
      setInboxOwner(ownerId);
      setNotifications(pruneReleaseNotifications(
        notificationRepository.get(ownerId).notifications, itemsRef.current
      ));
      setError(failure instanceof Error ? failure.message : "Notifications could not refresh.");
    } finally {
      checkingRef.current = false;
    }
  }, [configured, isReady, ownerId]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void checkForReleases(), 0);
    return () => window.clearTimeout(initialCheck);
  }, [checkForReleases, items]);

  useEffect(() => {
    if (!ownerId || !isReady) return;
    const interval = window.setInterval(
      () => void checkForReleases(),
      CHECK_INTERVAL_MS
    );
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") void checkForReleases();
    };
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [checkForReleases, isReady, ownerId]);

  const visibleNotifications = useMemo(
    () => inboxOwner === ownerId ? pruneReleaseNotifications(notifications, items) : [],
    [items, notifications, inboxOwner, ownerId]
  );

  const saveNotifications = useCallback(
    (next: ReleaseNotification[]) => {
      if (!ownerId || configured) return;
      const current = notificationRepository.get(ownerId);
      notificationRepository.save(ownerId, {
        ...current,
        notifications: next
      });
      setNotifications(next);
    },
    [configured, ownerId]
  );

  const clearNotification = useCallback(
    (notificationId: string) => {
      if (!ownerId) return;
      const next = visibleNotifications.filter(
        (notification) => notification.id !== notificationId
      );
      if (!configured) {
        saveNotifications(next);
        return;
      }
      setNotifications(next);
      void notificationCloudRepository
        .remove(notificationId, ownerId)
        .then((state) => {
          if (activeOwnerRef.current === ownerId) {
            setNotifications(
              pruneReleaseNotifications(state.notifications, itemsRef.current)
            );
          }
        })
        .catch(() => void checkForReleases());
    },
    [checkForReleases, configured, ownerId, saveNotifications, visibleNotifications]
  );

  const clearAllNotifications = useCallback(() => {
    if (!ownerId) return;
    if (!configured) {
      saveNotifications([]);
      return;
    }
    setNotifications([]);
    void notificationCloudRepository
      .clear(ownerId)
      .then((state) => {
        if (activeOwnerRef.current === ownerId) {
          setNotifications(
            pruneReleaseNotifications(state.notifications, itemsRef.current)
          );
        }
      })
      .catch(() => void checkForReleases());
  }, [checkForReleases, configured, ownerId, saveNotifications]);

  const value = useMemo(
    () => ({
      notifications: visibleNotifications,
      unreadCount: visibleNotifications.length,
      error,
      refresh: checkForReleases,
      clearNotification,
      clearAllNotifications
    }),
    [clearAllNotifications, clearNotification, visibleNotifications, error, checkForReleases]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
