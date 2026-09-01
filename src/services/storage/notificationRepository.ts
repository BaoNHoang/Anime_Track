import type {
  ReleaseNotificationState
} from "../../domain/notifications/releaseNotifications";
import { normalizeReleaseNotificationState } from "../../domain/notifications/releaseNotifications";

const STORAGE_PREFIX = "banime:release-notifications:v1:";

function storageKey(ownerId: string) {
  return `${STORAGE_PREFIX}${encodeURIComponent(ownerId)}`;
}

export const notificationRepository = {
  get(ownerId: string): ReleaseNotificationState {
    try {
      const stored = window.localStorage.getItem(storageKey(ownerId));
      if (!stored) return { notifications: [] };
      return normalizeReleaseNotificationState(JSON.parse(stored) as unknown);
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
  },

  remove(ownerId: string) {
    try {
      window.localStorage.removeItem(storageKey(ownerId));
    } catch {
      // A failed cleanup does not affect the cloud notification source of truth.
    }
  }
};
