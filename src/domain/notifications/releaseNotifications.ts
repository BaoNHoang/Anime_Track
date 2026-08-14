import { getNextAiringAt } from "../anime/airing";
import type { TrackedAnime, TrackingStatus } from "../tracker/types";

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

    const releasedAt = getNextAiringAt(item.anime, previousCheck);
    if (!releasedAt || releasedAt.getTime() > now.getTime()) return [];

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
