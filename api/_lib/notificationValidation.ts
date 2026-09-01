import { ApiError } from "./http.js";

interface ReleaseNotificationInput {
  id: string;
  animeId: number;
  title: string;
  imageUrl: string;
  releasedAt: string;
  trackingStatus: "watching" | "plan_to_watch";
}

const MAX_NOTIFICATIONS = 100;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "Notification request is invalid.");
  }
  return value as Record<string, unknown>;
}

function boundedText(value: unknown, field: string, maximum: number) {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum) {
    throw new ApiError(400, `${field} is invalid.`);
  }
  return value;
}

function isoDate(value: unknown, field: string, allowFuture = true) {
  const text = boundedText(value, field, 40);
  const date = new Date(text);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString() !== text ||
    (!allowFuture && date.getTime() > Date.now() + MAX_FUTURE_SKEW_MS)
  ) {
    throw new ApiError(400, `${field} is invalid.`);
  }
  return text;
}

export function notificationId(value: unknown) {
  const id = boundedText(value, "Notification ID", 80);
  if (!/^\d{1,8}:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(id)) {
    throw new ApiError(400, "Notification ID is invalid.");
  }
  return id;
}

export function notificationSync(value: unknown): {
  lastCheckedAt: string;
  notifications: ReleaseNotificationInput[];
} {
  const body = record(value);
  if (!Array.isArray(body.notifications) || body.notifications.length > MAX_NOTIFICATIONS) {
    throw new ApiError(400, "Notifications are invalid.");
  }
  const notifications = body.notifications.map((entry): ReleaseNotificationInput => {
    const item = record(entry);
    const animeId = item.animeId;
    if (!Number.isInteger(animeId) || Number(animeId) < 1 || Number(animeId) > 10_000_000) {
      throw new ApiError(400, "Anime ID is invalid.");
    }
    const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl : "";
    if (imageUrl.length > 2048 || (imageUrl && !/^https:\/\//i.test(imageUrl))) {
      throw new ApiError(400, "Notification image is invalid.");
    }
    const trackingStatus = item.trackingStatus;
    if (trackingStatus !== "watching" && trackingStatus !== "plan_to_watch") {
      throw new ApiError(400, "Tracking status is invalid.");
    }
    return {
      id: notificationId(item.id),
      animeId: Number(animeId),
      title: boundedText(item.title, "Notification title", 500),
      imageUrl,
      releasedAt: isoDate(item.releasedAt, "Release time"),
      trackingStatus
    };
  });
  return {
    lastCheckedAt: isoDate(body.lastCheckedAt, "Last checked time", false),
    notifications
  };
}
