import type { Anime } from "../src/domain/anime/types";
import type { TrackedAnime } from "../src/domain/tracker/types";

export interface RecommendationFilters {
  genres?: string[];
  type?: string;
  minScore?: number;
  yearFrom?: number;
}

export interface RankedRecommendation {
  anime: Anime;
  matchScore: number;
  reasons: string[];
}

function normalized(value: string) {
  return value.trim().toLowerCase();
}

export function rankRecommendationCandidates(
  library: TrackedAnime[],
  candidates: Anime[],
  filters: RecommendationFilters,
  limit: number
): RankedRecommendation[] {
  const trackedIds = new Set(library.map((item) => item.anime.id));
  const genreWeights = new Map<string, number>();
  const studioWeights = new Map<string, number>();

  for (const item of library) {
    if (item.status === "dropped") continue;
    const preferenceWeight =
      (item.userScore ?? 6) + (item.status === "completed" ? 2 : 0);
    for (const genre of item.anime.genres) {
      const key = normalized(genre);
      genreWeights.set(key, (genreWeights.get(key) ?? 0) + preferenceWeight);
    }
    for (const studio of item.anime.studios) {
      const key = normalized(studio);
      studioWeights.set(
        key,
        (studioWeights.get(key) ?? 0) + preferenceWeight
      );
    }
  }

  const requestedGenres = (filters.genres ?? []).map(normalized);
  const requestedType = filters.type ? normalized(filters.type) : undefined;

  return candidates
    .filter((anime) => !trackedIds.has(anime.id))
    .filter(
      (anime) =>
        !requestedType || normalized(anime.type) === requestedType
    )
    .filter(
      (anime) =>
        filters.minScore === undefined ||
        (anime.score ?? 0) >= filters.minScore
    )
    .filter(
      (anime) =>
        filters.yearFrom === undefined ||
        (anime.year ?? 0) >= filters.yearFrom
    )
    .filter(
      (anime) =>
        requestedGenres.length === 0 ||
        requestedGenres.every((genre) =>
          anime.genres.some((item) => normalized(item) === genre)
        )
    )
    .map((anime) => {
      const genreMatches = anime.genres
        .map((genre) => ({
          genre,
          weight: genreWeights.get(normalized(genre)) ?? 0
        }))
        .filter((item) => item.weight > 0)
        .sort((a, b) => b.weight - a.weight);
      const studioMatches = anime.studios
        .map((studio) => ({
          studio,
          weight: studioWeights.get(normalized(studio)) ?? 0
        }))
        .filter((item) => item.weight > 0)
        .sort((a, b) => b.weight - a.weight);
      const matchScore =
        genreMatches.reduce((sum, item) => sum + item.weight, 0) * 2 +
        studioMatches.reduce((sum, item) => sum + item.weight, 0) +
        (anime.score ?? 0) * 3 -
        Math.min(anime.popularity ?? 10_000, 10_000) / 5_000;
      const reasons: string[] = [];

      if (genreMatches.length) {
        reasons.push(
          `Matches preferred genres: ${genreMatches
            .slice(0, 3)
            .map((item) => item.genre)
            .join(", ")}`
        );
      }
      if (studioMatches.length) {
        reasons.push(`From ${studioMatches[0].studio}`);
      }
      if (anime.score) {
        reasons.push(`MyAnimeList score ${anime.score}`);
      }

      return { anime, matchScore, reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
