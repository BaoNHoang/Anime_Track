import type {
  ReleaseNotification,
  ReleaseNotificationState
} from "../../domain/notifications/releaseNotifications";

const STORAGE_PREFIX = "banime:release-notifications:v1:";

function storageKey(ownerId: string) {
  return `${STORAGE_PREFIX}${encodeURIComponent(ownerId)}`;
}

function isNotification(value: unknown): value is ReleaseNotification {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ReleaseNotification>;
  return (
    typeof candidate.id === "string" &&
    Number.isInteger(candidate.animeId) &&
    typeof candidate.title === "string" &&
    typeof candidate.imageUrl === "string" &&
    typeof candidate.releasedAt === "string" &&
    (candidate.trackingStatus === "watching" ||
      candidate.trackingStatus === "plan_to_watch")
  );
}

export const notificationRepository = {
  get(ownerId: string): ReleaseNotificationState {
    try {
      const stored = window.localStorage.getItem(storageKey(ownerId));
      if (!stored) return { notifications: [] };
      const parsed = JSON.parse(stored) as Partial<ReleaseNotificationState>;
      return {
        lastCheckedAt:
          typeof parsed.lastCheckedAt === "string"
            ? parsed.lastCheckedAt
            : undefined,
        notifications: Array.isArray(parsed.notifications)
          ? parsed.notifications.filter(isNotification).slice(0, 100)
          : []
      };
    } catch {
      return { notifications: [] };
    }
  },

  save(ownerId: string, state: ReleaseNotificationState) {
    try {
      window.localStorage.setItem(storageKey(ownerId), JSON.stringify(state));
    } catch {
      // The in-memory state still works when browser storage is unavailable.
    }
  }
};
