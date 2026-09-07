import { createContext } from "react";
import type { ReleaseNotification } from "../../domain/notifications/releaseNotifications";

export interface NotificationContextValue {
  notifications: ReleaseNotification[];
  unreadCount: number;
  error?: string;
  refresh: () => Promise<void>;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

export const NotificationContext = createContext<
  NotificationContextValue | undefined
>(undefined);
