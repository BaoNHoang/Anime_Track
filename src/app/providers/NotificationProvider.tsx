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
import { NotificationContext } from "./notificationContext";
import { useCloudAuth } from "./useCloudAuth";
import { useTracker } from "./useTracker";

const CHECK_INTERVAL_MS = 60 * 1000;

export function NotificationProvider({ children }: PropsWithChildren) {
  const { configured, initialized, user } = useCloudAuth();
  const { isReady, items } = useTracker();
  const itemsRef = useRef(items);
  const [notifications, setNotifications] = useState<ReleaseNotification[]>([]);
  const ownerId = initialized
    ? configured
      ? user?.id
      : "local-profile"
    : undefined;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const checkForReleases = useCallback(() => {
    if (!ownerId || !isReady) {
      setNotifications([]);
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
  }, [isReady, ownerId]);

  useEffect(() => {
    const initialCheck = window.setTimeout(checkForReleases, 0);
    return () => window.clearTimeout(initialCheck);
  }, [checkForReleases, items]);

  useEffect(() => {
    if (!ownerId || !isReady) return;
    const interval = window.setInterval(checkForReleases, CHECK_INTERVAL_MS);
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") checkForReleases();
    };
    document.addEventListener("visibilitychange", checkWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [checkForReleases, isReady, ownerId]);

  const saveNotifications = useCallback(
    (next: ReleaseNotification[]) => {
      if (!ownerId) return;
      const current = notificationRepository.get(ownerId);
      notificationRepository.save(ownerId, {
        ...current,
        notifications: next
      });
      setNotifications(next);
    },
    [ownerId]
  );

  const clearNotification = useCallback(
    (notificationId: string) => {
      saveNotifications(
        notifications.filter((notification) => notification.id !== notificationId)
      );
    },
    [notifications, saveNotifications]
  );

  const clearAllNotifications = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

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
