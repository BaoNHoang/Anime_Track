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
  type ReleaseNotification
} from "../../domain/notifications/releaseNotifications";
import { notificationRepository } from "../../services/storage/notificationRepository";
import { notificationCloudRepository } from "../../services/notifications/notificationCloudRepository";
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

    if (configured) {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const cloud = await notificationCloudRepository.get();
        if (activeOwnerRef.current !== ownerId) return;
        const legacy = cloud.lastCheckedAt
          ? { notifications: [] as ReleaseNotification[] }
          : notificationRepository.get(ownerId);
        const now = new Date();
        const released = findReleasedAnime(
          itemsRef.current,
          cloud.lastCheckedAt ?? legacy.lastCheckedAt,
          now
        );
        const synced = await notificationCloudRepository.sync(
          now.toISOString(),
          mergeReleaseNotifications(legacy.notifications, released),
          ownerId
        );
        if (activeOwnerRef.current !== ownerId) return;
        notificationRepository.remove(ownerId);
        setNotifications(synced.notifications);
      } catch {
        // Keep the last successfully synchronized inbox and retry on the next check.
      } finally {
        checkingRef.current = false;
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
    const next = {
      lastCheckedAt: now.toISOString(),
      notifications: mergeReleaseNotifications(
        current.notifications,
        released
      )
    };
    notificationRepository.save(ownerId, next);
    setNotifications(next.notifications);
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
      const next = notifications.filter(
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
            setNotifications(state.notifications);
          }
        })
        .catch(() => void checkForReleases());
    },
    [checkForReleases, configured, notifications, ownerId, saveNotifications]
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
          setNotifications(state.notifications);
        }
      })
      .catch(() => void checkForReleases());
  }, [checkForReleases, configured, ownerId, saveNotifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.length,
      clearNotification,
      clearAllNotifications
    }),
    [clearAllNotifications, clearNotification, notifications]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
