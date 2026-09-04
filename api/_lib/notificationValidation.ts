import { ApiError } from "./http.js";

interface ReleaseNotificationInput {
  id: string;
  kind: "episode" | "season";
  animeId: number;
  title: string;
  imageUrl: string;
  releasedAt: string;
  trackingStatus: "watching" | "plan_to_watch" | "completed" | "on_hold";
  episodeNumber?: number;
  sourceAnimeId?: number;
  sourceTitle?: string;
  premiereAt?: string;
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
  if (!/^(?:\d{1,8}:episode:\d{1,6}|season:\d{1,8}:\d{1,8}|\d{1,8}:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)$/.test(id)) {
    throw new ApiError(400, "Notification ID is invalid.");
  }
  return id;
}

export function notificationSync(value: unknown): {
  lastCheckedAt: string;
  notifications: ReleaseNotificationInput[];
  seenSeasonIds: number[];
  removedNotificationIds: string[];
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
    if (
      trackingStatus !== "watching" && trackingStatus !== "plan_to_watch" &&
      trackingStatus !== "completed" && trackingStatus !== "on_hold"
    ) {
      throw new ApiError(400, "Tracking status is invalid.");
    }
    const id = notificationId(item.id);
    const kind = item.kind === undefined ? "episode" : item.kind;
    if (kind !== "episode" && kind !== "season") {
      throw new ApiError(400, "Notification type is invalid.");
    }
    const episodeNumber = item.episodeNumber;
    const sourceAnimeId = item.sourceAnimeId;
    const legacyEpisode = /^\d{1,8}:\d{4}-/.test(id);
    if (
      kind === "episode" && !legacyEpisode &&
      (!Number.isInteger(episodeNumber) || Number(episodeNumber) < 1 || Number(episodeNumber) > 100_000)
    ) {
      throw new ApiError(400, "Episode number is invalid.");
    }
    if (
      kind === "episode" && !legacyEpisode &&
      id !== `${Number(animeId)}:episode:${Number(episodeNumber)}`
    ) {
      throw new ApiError(400, "Episode notification ID does not match its message.");
    }
    if (
      kind === "season" &&
      (!Number.isInteger(sourceAnimeId) || Number(sourceAnimeId) < 1 || Number(sourceAnimeId) > 10_000_000)
    ) {
      throw new ApiError(400, "Source anime ID is invalid.");
    }
    if (
      kind === "season" &&
      id !== `season:${Number(sourceAnimeId)}:${Number(animeId)}`
    ) {
      throw new ApiError(400, "Season notification ID does not match its message.");
    }
    const sourceTitle = item.sourceTitle === undefined
      ? undefined
      : boundedText(item.sourceTitle, "Source title", 500);
    const premiereAt = item.premiereAt === undefined
      ? undefined
      : isoDate(item.premiereAt, "Premiere time");
    return {
      id,
      kind,
      animeId: Number(animeId),
      title: boundedText(item.title, "Notification title", 500),
      imageUrl,
      releasedAt: isoDate(item.releasedAt, "Release time", false),
      trackingStatus,
      episodeNumber: episodeNumber === undefined ? undefined : Number(episodeNumber),
      sourceAnimeId: sourceAnimeId === undefined ? undefined : Number(sourceAnimeId),
      sourceTitle,
      premiereAt
    };
  });
  const rawSeenSeasonIds = body.seenSeasonIds ?? [];
  if (!Array.isArray(rawSeenSeasonIds) || rawSeenSeasonIds.length > 500) {
    throw new ApiError(400, "Seen seasons are invalid.");
  }
  const seenSeasonIds = [...new Set(rawSeenSeasonIds.map((value) => {
    if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 10_000_000) {
      throw new ApiError(400, "Seen season ID is invalid.");
    }
    return Number(value);
  }))];
  const rawRemovedIds = body.removedNotificationIds ?? [];
  if (!Array.isArray(rawRemovedIds) || rawRemovedIds.length > MAX_NOTIFICATIONS) {
    throw new ApiError(400, "Removed notifications are invalid.");
  }
  const removedNotificationIds = [...new Set(
    rawRemovedIds.map(notificationId)
  )];
  return {
    lastCheckedAt: isoDate(body.lastCheckedAt, "Last checked time", false),
    notifications,
    seenSeasonIds,
    removedNotificationIds
  };
}
