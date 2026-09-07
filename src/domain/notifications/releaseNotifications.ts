import { getNextAiringAt } from "../anime/airing";
import type { TrackedAnime, TrackingStatus } from "../tracker/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RELEASES_PER_CHECK = 100;

function firstScheduledRelease(item: TrackedAnime) {
  const { startDate } = item.anime;
  if (!startDate) return undefined;
  const premiere = new Date(startDate);
  if (Number.isNaN(premiere.getTime())) return undefined;
  return getNextAiringAt(
    item.anime,
    new Date(premiere.getTime() - 1)
  );
}

function scheduledEpisodeNumber(
  item: TrackedAnime,
  releasedAt: Date,
  fallbackOffset: number
) {
  const firstBroadcast = firstScheduledRelease(item);
  if (!firstBroadcast) return item.progress + fallbackOffset + 1;
  return Math.round(
    (releasedAt.getTime() - firstBroadcast.getTime()) / WEEK_MS
  ) + 1;
}

function isDubbedRelease(item: TrackedAnime) {
  return /\b(?:english\s+)?dub(?:bed)?\b/i.test(
    item.anime.broadcast?.label ?? ""
  );
}

export interface ReleaseNotification {
  id: string;
  kind: "episode" | "season";
  animeId: number;
  title: string;
  imageUrl: string;
  releasedAt: string;
  trackingStatus: Exclude<TrackingStatus, "dropped">;
  episodeNumber?: number;
  sourceAnimeId?: number;
  sourceTitle?: string;
  premiereAt?: string;
}

export interface ReleaseNotificationState {
  lastCheckedAt?: string;
  notifications: ReleaseNotification[];
  seenSeasonIds: number[];
}

function parseReleaseNotification(
  value: unknown
): ReleaseNotification | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Partial<ReleaseNotification>;
  const kind = candidate.kind ?? "episode";
  const valid = (
    (kind === "episode" || kind === "season") &&
    typeof candidate.id === "string" &&
    Number.isInteger(candidate.animeId) &&
    typeof candidate.title === "string" &&
    typeof candidate.imageUrl === "string" &&
    typeof candidate.releasedAt === "string" &&
    (candidate.trackingStatus === "watching" ||
      candidate.trackingStatus === "plan_to_watch" ||
      candidate.trackingStatus === "completed" ||
      candidate.trackingStatus === "on_hold") &&
    (candidate.episodeNumber === undefined ||
      (Number.isInteger(candidate.episodeNumber) && candidate.episodeNumber > 0)) &&
    (candidate.sourceAnimeId === undefined ||
      (Number.isInteger(candidate.sourceAnimeId) && candidate.sourceAnimeId > 0)) &&
    (candidate.sourceTitle === undefined || typeof candidate.sourceTitle === "string") &&
    (candidate.premiereAt === undefined || typeof candidate.premiereAt === "string")
  );
  return valid ? { ...candidate, kind } as ReleaseNotification : undefined;
}

export function normalizeReleaseNotificationState(
  value: unknown
): ReleaseNotificationState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { notifications: [], seenSeasonIds: [] };
  }
  const candidate = value as Partial<ReleaseNotificationState>;
  return {
    lastCheckedAt:
      typeof candidate.lastCheckedAt === "string"
        ? candidate.lastCheckedAt
        : undefined,
    notifications: Array.isArray(candidate.notifications)
      ? candidate.notifications
          .map(parseReleaseNotification)
          .filter((notification): notification is ReleaseNotification => Boolean(notification))
          .slice(0, 100)
      : [],
    seenSeasonIds: Array.isArray(candidate.seenSeasonIds)
      ? [...new Set(candidate.seenSeasonIds.filter(
          (id): id is number => Number.isInteger(id) && id > 0 && id <= 10_000_000
        ))].slice(0, 500)
      : []
  };
}

export function findReleasedAnime(
  items: TrackedAnime[],
  lastCheckedAt: string | undefined,
  now = new Date()
): ReleaseNotification[] {
  if (!lastCheckedAt) return [];

  const previousCheck = new Date(lastCheckedAt);
  if (
    Number.isNaN(previousCheck.getTime()) ||
    previousCheck.getTime() >= now.getTime()
  ) {
    return [];
  }

  return items.flatMap((item) => {
    if (item.status !== "watching" && item.status !== "plan_to_watch") {
      return [];
    }

    const preference = item.releaseNotificationMode ?? "every_episode";
    if (preference === "dubbed_only" && !isDubbedRelease(item)) return [];

    const notifications: ReleaseNotification[] = [];
    let cursor = previousCheck;
    for (let offset = 0; offset < MAX_RELEASES_PER_CHECK; offset += 1) {
      const releasedAt = getNextAiringAt(item.anime, cursor);
      if (!releasedAt || releasedAt.getTime() > now.getTime()) break;
      const episodeNumber = scheduledEpisodeNumber(item, releasedAt, offset);
      if (item.anime.episodes && episodeNumber > item.anime.episodes) break;
      cursor = new Date(releasedAt.getTime() + 1);

      const watched = item.episodeHistory
        ? item.episodeHistory.some((entry) => entry.episode === episodeNumber)
        : item.progress >= episodeNumber;
      const isFinale = Boolean(
        item.anime.episodes && episodeNumber === item.anime.episodes
      );
      if (watched || (preference === "finale_only" && !isFinale)) continue;

      notifications.push({
        id: `${item.anime.id}:episode:${episodeNumber}`,
        kind: "episode",
        animeId: item.anime.id,
        title: item.anime.titleEnglish || item.anime.title,
        imageUrl: item.anime.imageUrl,
        releasedAt: releasedAt.toISOString(),
        trackingStatus: item.status,
        episodeNumber
      });
    }
    return notifications;
  });
}

export function pruneReleaseNotifications(
  notifications: ReleaseNotification[],
  items: TrackedAnime[]
) {
  const trackedById = new Map(items.map((item) => [item.anime.id, item]));
  return notifications.filter((notification) => {
    if (notification.kind === "season") {
      return !trackedById.has(notification.animeId);
    }
    if (!notification.episodeNumber) return false;
    const item = trackedById.get(notification.animeId);
    if (!item || item.status === "dropped" || item.status === "completed") return false;
    return item.episodeHistory
      ? !item.episodeHistory.some((entry) => entry.episode === notification.episodeNumber)
      : item.progress < notification.episodeNumber;
  });
}

export function mergeReleaseNotifications(
  existing: ReleaseNotification[],
  incoming: ReleaseNotification[]
): ReleaseNotification[] {
  const notificationsById = new Map(
    existing.map((notification) => [notification.id, notification])
  );

  for (const notification of incoming) {
    notificationsById.set(notification.id, notification);
  }

  return [...notificationsById.values()]
    .sort((left, right) => right.releasedAt.localeCompare(left.releasedAt))
    .slice(0, 100);
}
