import type { TrackedAnime } from "./types";
import { durationMinutes } from "./stats";

export interface ReviewFavorite {
  name: string;
  count: number;
}

export interface YearInReview {
  year: number;
  episodesWatched: number;
  minutesWatched: number;
  completedTitles: number;
  activeTitles: number;
  completionRate: number;
  monthlyEpisodes: number[];
  favoriteGenres: ReviewFavorite[];
  favoriteStudios: ReviewFavorite[];
}

function yearOf(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return undefined;
  const year = Number(value.slice(0, 4));
  return Number.isInteger(year) ? year : undefined;
}

function topFavorites(counts: Map<string, number>): ReviewFavorite[] {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 3);
}

export function availableReviewYears(
  items: TrackedAnime[],
  currentYear = new Date().getFullYear()
) {
  const years = new Set<number>([currentYear]);
  for (const item of items) {
    item.episodeHistory?.forEach((entry) => {
      const year = yearOf(entry.watchedAt);
      if (year) years.add(year);
    });
  }
  return [...years].sort((left, right) => right - left);
}

export function createYearInReview(
  items: TrackedAnime[],
  year: number
): YearInReview {
  const monthlyEpisodes = Array.from({ length: 12 }, () => 0);
  const genreCounts = new Map<string, number>();
  const studioCounts = new Map<string, number>();
  const activeAnimeIds = new Set<number>();
  let minutesWatched = 0;
  let completedTitles = 0;

  for (const item of items) {
    const watchedThisYear = (item.episodeHistory ?? []).filter(
      (entry) => yearOf(entry.watchedAt) === year
    );
    for (const entry of watchedThisYear) {
      const month = Number(entry.watchedAt?.slice(5, 7));
      if (month >= 1 && month <= 12) monthlyEpisodes[month - 1] += 1;
    }

    const latestDatedWatch = [...(item.episodeHistory ?? [])]
      .filter((entry) => entry.watchedAt)
      .sort((left, right) =>
        (right.watchedAt ?? "").localeCompare(left.watchedAt ?? "")
      )[0]?.watchedAt;
    const completedThisYear =
      item.status === "completed" &&
      yearOf(latestDatedWatch ?? item.updatedAt) === year;
    if (watchedThisYear.length || completedThisYear) {
      activeAnimeIds.add(item.anime.id);
    }
    if (completedThisYear) completedTitles += 1;

    const activityWeight = watchedThisYear.length || (completedThisYear ? 1 : 0);
    if (!activityWeight) continue;
    minutesWatched += watchedThisYear.length * durationMinutes(item.anime.duration);
    for (const genre of item.anime.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + activityWeight);
    }
    for (const studio of item.anime.studios) {
      studioCounts.set(studio, (studioCounts.get(studio) ?? 0) + activityWeight);
    }
  }

  const episodesWatched = monthlyEpisodes.reduce((sum, count) => sum + count, 0);
  const activeTitles = activeAnimeIds.size;
  return {
    year,
    episodesWatched,
    minutesWatched,
    completedTitles,
    activeTitles,
    completionRate: activeTitles
      ? Math.round((completedTitles / activeTitles) * 100)
      : 0,
    monthlyEpisodes,
    favoriteGenres: topFavorites(genreCounts),
    favoriteStudios: topFavorites(studioCounts)
  };
}

export function serializeYearInReview(review: YearInReview, username?: string) {
  const params = new URLSearchParams({
    share: "1",
    year: String(review.year),
    episodes: String(review.episodesWatched),
    minutes: String(review.minutesWatched),
    completed: String(review.completedTitles),
    active: String(review.activeTitles),
    rate: String(review.completionRate),
    months: review.monthlyEpisodes.join(","),
    genres: JSON.stringify(review.favoriteGenres),
    studios: JSON.stringify(review.favoriteStudios)
  });
  if (username) params.set("by", username.slice(0, 24));
  return params;
}

function boundedInteger(value: string | null, maximum: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= maximum
    ? number
    : undefined;
}

function parseFavorites(value: string | null): ReviewFavorite[] | undefined {
  if (!value || value.length > 1000) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.length > 3) return undefined;
    const favorites = parsed.filter(
      (item): item is ReviewFavorite =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as ReviewFavorite).name === "string" &&
        (item as ReviewFavorite).name.length <= 200 &&
        Number.isInteger((item as ReviewFavorite).count) &&
        (item as ReviewFavorite).count >= 0 &&
        (item as ReviewFavorite).count <= 100_000
    );
    return favorites.length === parsed.length ? favorites : undefined;
  } catch {
    return undefined;
  }
}

export function parseSharedYearInReview(params: URLSearchParams) {
  if (params.get("share") !== "1") return undefined;
  const year = boundedInteger(params.get("year"), 2100);
  const episodesWatched = boundedInteger(params.get("episodes"), 100_000);
  const minutesWatched = boundedInteger(params.get("minutes"), 10_000_000);
  const completedTitles = boundedInteger(params.get("completed"), 5000);
  const activeTitles = boundedInteger(params.get("active"), 5000);
  const completionRate = boundedInteger(params.get("rate"), 100);
  const monthlyEpisodes = params.get("months")?.split(",").map(Number);
  const favoriteGenres = parseFavorites(params.get("genres"));
  const favoriteStudios = parseFavorites(params.get("studios"));
  const username = params.get("by");
  if (
    !year || year < 2000 ||
    episodesWatched === undefined ||
    minutesWatched === undefined ||
    completedTitles === undefined ||
    activeTitles === undefined ||
    completionRate === undefined ||
    monthlyEpisodes?.length !== 12 ||
    monthlyEpisodes.some((count) => !Number.isInteger(count) || count < 0 || count > 100_000) ||
    monthlyEpisodes.reduce((sum, count) => sum + count, 0) !== episodesWatched ||
    completedTitles > activeTitles ||
    completionRate !== (activeTitles
      ? Math.round((completedTitles / activeTitles) * 100)
      : 0) ||
    (username !== null && !/^[A-Za-z0-9_]{3,24}$/.test(username)) ||
    !favoriteGenres || !favoriteStudios
  ) return undefined;
  return {
    review: {
      year,
      episodesWatched,
      minutesWatched,
      completedTitles,
      activeTitles,
      completionRate,
      monthlyEpisodes,
      favoriteGenres,
      favoriteStudios
    } satisfies YearInReview,
    username: username ?? undefined
  };
}
