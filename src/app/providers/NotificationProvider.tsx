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

export function NotificationProvider({ children }: PropsWithChildren) {
  const { configured, initialized, user } = useCloudAuth();
  const { isReady, items } = useTracker();
  const itemsRef = useRef(items);
  const activeOwnerRef = useRef<string | undefined>(undefined);
  const checkingRef = useRef(false);
  const [notifications, setNotifications] = useState<ReleaseNotification[]>([]);
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
  }, [ownerId]);

  const checkForReleases = useCallback(async () => {
    if (!ownerId || !isReady) {
      setNotifications([]);
      return;
    }

    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      if (configured) {
      try {
        const cloud = await notificationCloudRepository.get();
        if (activeOwnerRef.current !== ownerId) return;
        const legacy = cloud.lastCheckedAt
          ? {
              notifications: [] as ReleaseNotification[],
              seenSeasonIds: [] as number[],
              lastCheckedAt: undefined
            }
          : notificationRepository.get(ownerId);
        const now = new Date();
        const released = findReleasedAnime(
          itemsRef.current,
          cloud.lastCheckedAt ?? legacy.lastCheckedAt,
          now
        );
        const seasons = await findUpcomingSeasonNotifications(
          itemsRef.current,
          cloud.seenSeasonIds,
          now
        );
        const existingNotifications = [
          ...cloud.notifications,
          ...legacy.notifications
        ];
        const merged = pruneReleaseNotifications(
          mergeReleaseNotifications(
            existingNotifications,
            [...released, ...seasons.notifications]
          ),
          itemsRef.current
        );
        const mergedIds = new Set(merged.map((notification) => notification.id));
        const synced = await notificationCloudRepository.sync(
          now.toISOString(),
          merged,
          seasons.seenSeasonIds,
          existingNotifications
            .filter((notification) => !mergedIds.has(notification.id))
            .map((notification) => notification.id),
          ownerId
        );
        if (activeOwnerRef.current !== ownerId) return;
        notificationRepository.remove(ownerId);
        setNotifications(
          pruneReleaseNotifications(synced.notifications, itemsRef.current)
        );
      } catch {
        // Keep the last successfully synchronized inbox and retry on the next check.
      }
      return;
      }

      const current = notificationRepository.get(ownerId);
      const now = new Date();
      const released = findReleasedAnime(
        itemsRef.current,
        current.lastCheckedAt,
        now
      );
      const seasons = await findUpcomingSeasonNotifications(
        itemsRef.current,
        current.seenSeasonIds,
        now
      );
      const next = {
        lastCheckedAt: now.toISOString(),
        notifications: pruneReleaseNotifications(
          mergeReleaseNotifications(
            current.notifications,
            [...released, ...seasons.notifications]
          ),
          itemsRef.current
        ),
        seenSeasonIds: seasons.seenSeasonIds
      };
      notificationRepository.save(ownerId, next);
      setNotifications(next.notifications);
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
    () => pruneReleaseNotifications(notifications, items),
    [items, notifications]
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
      clearNotification,
      clearAllNotifications
    }),
    [clearAllNotifications, clearNotification, visibleNotifications]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
