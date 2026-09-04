import type { ReleaseNotification } from "../../domain/notifications/releaseNotifications";
import type { TrackedAnime } from "../../domain/tracker/types";
import { getAnimeById, getAnimeSequels } from "./animeService";

export interface SeasonNotificationResult {
  notifications: ReleaseNotification[];
  seenSeasonIds: number[];
}

function isUpcoming(status: string, startDate: string | undefined, now: Date) {
  if (/not yet aired|upcoming/i.test(status)) return true;
  if (!startDate) return false;
  const premiere = new Date(startDate);
  return !Number.isNaN(premiere.getTime()) && premiere.getTime() > now.getTime();
}

export async function findUpcomingSeasonNotifications(
  items: TrackedAnime[],
  previouslySeenIds: number[],
  now = new Date()
): Promise<SeasonNotificationResult> {
  const trackedIds = new Set(items.map((item) => item.anime.id));
  const seenIds = new Set(previouslySeenIds);
  const sequelSources = new Map<number, TrackedAnime>();

  // Keep this background scan sequential. Enqueuing the whole library at once
  // would place foreground Discover requests behind one rate-limit slot per
  // tracked title on a cold cache.
  for (const item of items) {
    if (item.status === "dropped") continue;
    let sequels: number[];
    try {
      sequels = await getAnimeSequels(item.anime.id);
    } catch {
      sequels = [];
    }
    for (const sequelId of sequels) {
      if (!sequelSources.has(sequelId)) sequelSources.set(sequelId, item);
    }
  }

  const notifications: ReleaseNotification[] = [];
  for (const [sequelId, source] of sequelSources) {
    if (source.status === "dropped") continue;
    if (seenIds.has(sequelId)) continue;
    if (trackedIds.has(sequelId)) {
      seenIds.add(sequelId);
      continue;
    }
    try {
      const sequel = await getAnimeById(sequelId);
      if (!isUpcoming(sequel.status, sequel.startDate, now)) {
        if (/finished airing/i.test(sequel.status) || sequel.startDate) {
          seenIds.add(sequelId);
        }
        continue;
      }
      if (sequel.type !== "TV" && sequel.type !== "ONA") {
        seenIds.add(sequelId);
        continue;
      }
      seenIds.add(sequelId);
      notifications.push({
        id: `season:${source.anime.id}:${sequel.id}`,
        kind: "season",
        animeId: sequel.id,
        title: sequel.titleEnglish || sequel.title,
        imageUrl: sequel.imageUrl,
        releasedAt: now.toISOString(),
        trackingStatus: source.status,
        sourceAnimeId: source.anime.id,
        sourceTitle: source.anime.titleEnglish || source.anime.title,
        premiereAt: sequel.startDate
      });
    } catch {
      // Retry unresolved sequel metadata on a later notification check.
    }
  }

  return {
    notifications,
    seenSeasonIds: [...seenIds].slice(-500)
  };
}
