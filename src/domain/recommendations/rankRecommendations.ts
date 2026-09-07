import type { FavoriteEntry } from "../account/favorites";
import type { Anime } from "../anime/types";
import type { TrackedAnime } from "../tracker/types";

export interface RankedRecommendation {
  anime: Anime;
  reason: string;
  score: number;
}

function addWeight(target: Map<string, number>, values: string[], weight: number) {
  for (const value of values) {
    const key = value.trim().toLocaleLowerCase();
    if (key) target.set(key, (target.get(key) ?? 0) + weight);
  }
}

function strongestMatch(values: string[], weights: Map<string, number>) {
  return values
    .map((value) => ({ value, weight: weights.get(value.toLocaleLowerCase()) ?? 0 }))
    .sort((left, right) => right.weight - left.weight)[0];
}

export function rankRecommendations(
  library: TrackedAnime[],
  candidates: Anime[],
  favoriteStudios: FavoriteEntry[] = [],
  limit = 5
): RankedRecommendation[] {
  const trackedIds = new Set(library.map((item) => item.anime.id));
  const genreWeights = new Map<string, number>();
  const studioWeights = new Map<string, number>();

  for (const item of library) {
    if (item.status === "plan_to_watch") continue;
    const scoreWeight = item.userScore === undefined
      ? 1
      : (item.userScore - 5) / 2.5;
    const statusWeight = item.status === "completed" ? 1.5 : 1;
    const weight = item.status === "dropped" ? -1 : scoreWeight * statusWeight;
    addWeight(genreWeights, item.anime.genres, weight);
    addWeight(studioWeights, item.anime.studios, weight * 1.5);
  }

  const favoriteStudioNames = new Set(
    favoriteStudios.map((entry) => entry.name.toLocaleLowerCase())
  );
  for (const studio of favoriteStudioNames) {
    studioWeights.set(studio, (studioWeights.get(studio) ?? 0) + 6);
  }

  if (!genreWeights.size && !studioWeights.size) return [];

  const uniqueCandidates = [...new Map(candidates
    .filter((candidate) => !trackedIds.has(candidate.id))
    .map((candidate) => [candidate.id, candidate])).values()];

  return uniqueCandidates
    .map((anime): RankedRecommendation | undefined => {
      const genre = strongestMatch(anime.genres, genreWeights);
      const studio = strongestMatch(anime.studios, studioWeights);
      const affinity = (genre?.weight ?? 0) + (studio?.weight ?? 0);
      if (affinity <= 0) return undefined;

      const favoriteStudio = anime.studios.find((name) =>
        favoriteStudioNames.has(name.toLocaleLowerCase())
      );
      const reason = favoriteStudio
        ? `From favorite studio ${favoriteStudio}`
        : studio && studio.weight > (genre?.weight ?? 0)
          ? `More from ${studio.value}`
          : `Because you watch ${genre?.value ?? anime.genres[0] ?? "similar anime"}`;
      return {
        anime,
        reason,
        score: affinity + (anime.score ?? 0) / 20
      };
    })
    .filter((item): item is RankedRecommendation => Boolean(item))
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.anime.popularity ?? Number.MAX_SAFE_INTEGER) -
          (right.anime.popularity ?? Number.MAX_SAFE_INTEGER)
    )
    .slice(0, Math.max(0, limit));
}
