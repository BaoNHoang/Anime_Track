import type { Anime } from "./types";

export interface ConnectionFacet {
  key: string;
  kind: "genre" | "studio";
  label: string;
}

export interface ConnectedAnime {
  anime: Anime;
  sharedKeys: string[];
  via: string;
}

const facetKey = (kind: ConnectionFacet["kind"], label: string) =>
  `${kind}:${label.trim().toLocaleLowerCase()}`;

export function buildAnimeConnections(center: Anime, catalog: Anime[]) {
  const others = [...new Map(catalog
    .filter((anime) => anime.id !== center.id)
    .map((anime) => [anime.id, anime])).values()];

  const studios = [...new Set(center.studios.filter(Boolean))]
    .map((label) => ({ key: facetKey("studio", label), kind: "studio" as const, label }))
    .sort((left, right) => {
      const count = (facet: ConnectionFacet) => others.filter((anime) =>
        anime.studios.some((studio) => facetKey("studio", studio) === facet.key)
      ).length;
      return count(right) - count(left) || left.label.localeCompare(right.label);
    })
    .slice(0, 2);
  const genres = [...new Set(center.genres.filter(Boolean))]
    .map((label) => ({ key: facetKey("genre", label), kind: "genre" as const, label }))
    .sort((left, right) => {
      const count = (facet: ConnectionFacet) => others.filter((anime) =>
        anime.genres.some((genre) => facetKey("genre", genre) === facet.key)
      ).length;
      return count(right) - count(left) || left.label.localeCompare(right.label);
    });
  const facets = [...studios, ...genres.slice(0, 4 - studios.length)];

  const candidates = others.flatMap((anime) => {
    const sharedKeys = facets
      .filter((facet) => facet.kind === "studio"
        ? anime.studios.some((name) => facetKey("studio", name) === facet.key)
        : anime.genres.some((name) => facetKey("genre", name) === facet.key))
      .map((facet) => facet.key);
    return sharedKeys.length ? [{ anime, sharedKeys, via: sharedKeys[0] }] : [];
  }).sort((left, right) => {
    const strength = (entry: ConnectedAnime) =>
      entry.sharedKeys.length + (entry.sharedKeys.some((key) => key.startsWith("studio:")) ? 3 : 0);
    return strength(right) - strength(left) ||
      (right.anime.score ?? 0) - (left.anime.score ?? 0) ||
      left.anime.id - right.anime.id;
  });

  // Give each visible connection a chance to lead somewhere before filling by relevance.
  const neighbors: ConnectedAnime[] = [];
  for (const facet of facets) {
    const match = candidates.find((entry) =>
      entry.sharedKeys.includes(facet.key) && !neighbors.some((chosen) => chosen.anime.id === entry.anime.id)
    );
    if (match) neighbors.push({ ...match, via: facet.key });
  }
  for (const candidate of candidates) {
    if (neighbors.length >= 6) break;
    if (!neighbors.some((chosen) => chosen.anime.id === candidate.anime.id)) {
      neighbors.push(candidate);
    }
  }

  return { facets, neighbors };
}
