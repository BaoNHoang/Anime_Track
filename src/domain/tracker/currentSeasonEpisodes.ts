import type { ReleaseNotification } from "../notifications/releaseNotifications.js";
import type { TrackedAnime } from "./types.js";

const SEASONS = ["winter", "spring", "summer", "fall"] as const;

export function currentSeasonEpisodes(
  notifications: ReleaseNotification[],
  airingItems: TrackedAnime[],
  now = new Date()
) {
  const season = SEASONS[Math.floor(now.getUTCMonth() / 3)];
  const year = now.getUTCFullYear();
  const watchingIds = new Set(
    airingItems
      .filter((item) => {
        if (item.status !== "watching" || item.anime.status !== "Currently Airing") {
          return false;
        }
        if (item.anime.season && item.anime.year) {
          return item.anime.season.toLowerCase() === season && item.anime.year === year;
        }
        const premiere = item.anime.startDate ? new Date(item.anime.startDate) : undefined;
        return premiere && !Number.isNaN(premiere.getTime()) &&
          premiere.getUTCFullYear() === year &&
          Math.floor(premiere.getUTCMonth() / 3) === Math.floor(now.getUTCMonth() / 3);
      })
      .map((item) => item.anime.id)
  );

  return notifications
    .filter((notification) =>
      notification.kind === "episode" &&
      watchingIds.has(notification.animeId) &&
      Date.parse(notification.releasedAt) <= now.getTime()
    )
    .sort((left, right) => right.releasedAt.localeCompare(left.releasedAt))
    .slice(0, 6);
}
