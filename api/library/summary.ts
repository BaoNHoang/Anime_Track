import type { ServerResponse } from "node:http";
import type { ProfileSummary } from "../../src/domain/tracker/profileSummary.js";
import { durationMinutes } from "../../src/domain/tracker/stats.js";
import type {
  TrackedAnime,
  TrackerStats,
  TrackingStatus
} from "../../src/domain/tracker/types.js";
import {
  ApiError,
  requireMethod,
  sendError,
  sendJson,
  type ApiRequest
} from "../_lib/http.js";
import { authenticateRequest } from "../_lib/supabase.js";

const METRIC_PAGE_SIZE = 1000;

interface MetricRow {
  tracking_status: TrackingStatus;
  user_score: number | null;
  progress: number;
  duration?: unknown;
  genres?: unknown;
}

function rowItems(rows: Array<{ item?: unknown }> | null): TrackedAnime[] {
  return (rows ?? [])
    .map((row) => row.item)
    .filter(
      (item): item is TrackedAnime =>
        typeof item === "object" && item !== null && "anime" in item
    );
}

function genresFrom(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((genre): genre is string => typeof genre === "string")
    : [];
}

function summarizeMetrics(rows: MetricRow[]) {
  const genreCounts = new Map<string, number>();
  let watching = 0;
  let completed = 0;
  let episodesWatched = 0;
  let minutesWatched = 0;
  let scoredTotal = 0;
  let scoredCount = 0;

  for (const row of rows) {
    if (row.tracking_status === "watching") watching += 1;
    if (row.tracking_status === "completed") completed += 1;
    episodesWatched += row.progress;
    minutesWatched +=
      row.progress *
      durationMinutes(typeof row.duration === "string" ? row.duration : undefined);
    if (typeof row.user_score === "number") {
      scoredTotal += row.user_score;
      scoredCount += 1;
    }
    for (const genre of genresFrom(row.genres)) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }

  const stats: TrackerStats = {
    total: rows.length,
    watching,
    completed,
    episodesWatched,
    daysWatched: minutesWatched / (60 * 24),
    averageScore: scoredCount ? scoredTotal / scoredCount : undefined
  };
  const favoriteGenres = [...genreCounts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.genre.localeCompare(right.genre)
    )
    .slice(0, 5);

  return { stats, favoriteGenres };
}

export default async function handler(
  request: ApiRequest,
  response: ServerResponse
) {
  try {
    requireMethod(request, ["GET"]);
    const auth = await authenticateRequest(request, response);

    const metricsPromise = (async () => {
      const rows: MetricRow[] = [];
      for (let offset = 0; ; offset += METRIC_PAGE_SIZE) {
        const { data, error } = await auth.client
          .from("tracked_anime")
          .select(
            "tracking_status,user_score,progress,duration:item->anime->>duration,genres:item->anime->genres"
          )
          .eq("user_id", auth.user.id)
          .order("updated_at", { ascending: false })
          .range(offset, offset + METRIC_PAGE_SIZE - 1);
        if (error) throw new ApiError(502, "Profile summary could not be loaded.");
        const page = (data ?? []) as unknown as MetricRow[];
        rows.push(...page);
        if (page.length < METRIC_PAGE_SIZE) break;
      }
      return rows;
    })();

    const recentPromise = auth.client
      .from("tracked_anime")
      .select("item")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false })
      .order("anime_id", { ascending: true })
      .limit(12);
    const airingPromise = auth.client
      .from("tracked_anime")
      .select("item")
      .eq("user_id", auth.user.id)
      .in("tracking_status", ["watching", "plan_to_watch"])
      .eq("item->anime->>status", "Currently Airing")
      .order("updated_at", { ascending: false })
      .limit(100);

    const [metricRows, recentResult, airingResult] = await Promise.all([
      metricsPromise,
      recentPromise,
      airingPromise
    ]);
    if (recentResult.error || airingResult.error) {
      throw new ApiError(502, "Profile summary could not be loaded.");
    }

    const metrics = summarizeMetrics(metricRows);
    const summary: ProfileSummary = {
      ...metrics,
      recentItems: rowItems(recentResult.data),
      airingItems: rowItems(airingResult.data)
    };
    response.setHeader("Cache-Control", "private, no-store");
    sendJson(response, 200, { summary });
  } catch (error) {
    sendError(response, error);
  }
}
