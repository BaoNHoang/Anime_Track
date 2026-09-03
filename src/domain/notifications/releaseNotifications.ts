import { getNextAiringAt } from "../anime/airing";
import type { TrackedAnime, TrackingStatus } from "../tracker/types";

function isFinaleRelease(item: TrackedAnime, releasedAt: Date) {
  const { episodes, startDate } = item.anime;
  if (!episodes || !startDate) return false;
  const premiere = new Date(startDate);
  if (Number.isNaN(premiere.getTime())) return false;
  const firstBroadcast = getNextAiringAt(
    item.anime,
    new Date(premiere.getTime() - 1)
  );
  if (!firstBroadcast) return false;
  const weeksSincePremiere = Math.round(
    (releasedAt.getTime() - firstBroadcast.getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  return weeksSincePremiere + 1 >= episodes;
}

function isDubbedRelease(item: TrackedAnime) {
  return /\b(?:english\s+)?dub(?:bed)?\b/i.test(
    item.anime.broadcast?.label ?? ""
  );
}

export interface ReleaseNotification {
  id: string;
  animeId: number;
  title: string;
  imageUrl: string;
  releasedAt: string;
  trackingStatus: Extract<TrackingStatus, "watching" | "plan_to_watch">;
}

export interface ReleaseNotificationState {
  lastCheckedAt?: string;
  notifications: ReleaseNotification[];
}

export function isReleaseNotification(
  value: unknown
): value is ReleaseNotification {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
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

export function normalizeReleaseNotificationState(
  value: unknown
): ReleaseNotificationState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { notifications: [] };
  }
  const candidate = value as Partial<ReleaseNotificationState>;
  return {
    lastCheckedAt:
      typeof candidate.lastCheckedAt === "string"
        ? candidate.lastCheckedAt
        : undefined,
    notifications: Array.isArray(candidate.notifications)
      ? candidate.notifications.filter(isReleaseNotification).slice(0, 100)
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

    const releasedAt = getNextAiringAt(item.anime, previousCheck);
    if (!releasedAt || releasedAt.getTime() > now.getTime()) return [];
    if (preference === "finale_only" && !isFinaleRelease(item, releasedAt)) {
      return [];
    }

    return [{
      id: `${item.anime.id}:${releasedAt.toISOString()}`,
      animeId: item.anime.id,
      title: item.anime.titleEnglish || item.anime.title,
      imageUrl: item.anime.imageUrl,
      releasedAt: releasedAt.toISOString(),
      trackingStatus: item.status
    }];
  });
}

export function mergeReleaseNotifications(
  existing: ReleaseNotification[],
  incoming: ReleaseNotification[]
): ReleaseNotification[] {
  const latestByAnime = new Map(
    existing.map((notification) => [notification.animeId, notification])
  );

  for (const notification of incoming) {
    latestByAnime.set(notification.animeId, notification);
  }

  return [...latestByAnime.values()]
    .sort((left, right) => right.releasedAt.localeCompare(left.releasedAt))
    .slice(0, 100);
}
