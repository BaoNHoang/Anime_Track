import type { Anime } from "./types";

export interface ConnectionFacet {
  key: string;
  kind: "genre" | "studio";
  label: string;
  parentKey?: string;
}

export interface ConnectedAnime {
  anime: Anime;
  sharedKeys: string[];
  via: string;
}

export function shuffleMapItems<T>(items: T[], seed: number): T[] {
  const shuffled = [...items];
  let state = seed >>> 0;
  for (let index = shuffled.length - 1; index > 0; index--) {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    const swap = Math.floor(random * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

const facetKey = (kind: ConnectionFacet["kind"], label: string) =>
  `${kind}:${label.trim().toLocaleLowerCase()}`;

const hasFacet = (anime: Anime, facet: ConnectionFacet) =>
  (facet.kind === "studio" ? anime.studios : anime.genres)
    .some((name) => facetKey(facet.kind, name) === facet.key);

function seriesKey(anime: Anime) {
  const words = (anime.titleEnglish || anime.title)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (["a", "an", "the"].includes(words[0])) words.shift();
  return words.slice(0, 2).join(" ") || String(anime.id);
}

export function buildAnimeConnections(
  center: Anime,
  catalog: Anime[],
  options: { facet?: ConnectionFacet; bridgeGenre?: ConnectionFacet; seed?: number } = {}
) {
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
  const active = options.facet;
  let facets: ConnectionFacet[];
  if (active?.kind === "genre") {
    const matching = others.filter((anime) => hasFacet(anime, active));
    const centerStudios = new Set(center.studios.map((name) => facetKey("studio", name)));
    const linkedStudios = [...new Map(matching.flatMap((anime) => anime.studios
      .filter(Boolean)
      .map((label) => {
        const facet: ConnectionFacet = { key: facetKey("studio", label), kind: "studio", label, parentKey: active.key };
        return [facet.key, facet] as const;
      }))).values()];
    const alternateStudios = shuffleMapItems(
      linkedStudios.filter((studio) => !centerStudios.has(studio.key)), options.seed ?? 0
    );
    const familiarStudios = shuffleMapItems(
      linkedStudios.filter((studio) => centerStudios.has(studio.key)), options.seed ?? 0
    );
    facets = [active, ...[...alternateStudios, ...familiarStudios].slice(0, 3)];
  } else if (active?.kind === "studio") {
    const bridge = options.bridgeGenre?.kind === "genre" && hasFacet(center, options.bridgeGenre)
      ? options.bridgeGenre
      : undefined;
    facets = [
      ...(bridge ? [bridge] : []),
      { ...active, parentKey: bridge?.key },
      ...genres.filter((genre) => genre.key !== bridge?.key).slice(0, bridge ? 2 : 3)
    ];
  } else {
    facets = [...studios, ...genres.slice(0, 4 - studios.length)];
  }

  const candidates = others.flatMap((anime) => {
    const sharedKeys = facets
      .filter((facet) => hasFacet(anime, facet))
      .map((facet) => facet.key);
    return sharedKeys.length ? [{ anime, sharedKeys, via: sharedKeys[0] }] : [];
  }).filter((entry) => !active || entry.sharedKeys.includes(active.key));
  const randomized = shuffleMapItems(candidates, options.seed ?? 0);

  const neighbors: ConnectedAnime[] = [];
  const seenSeries = new Set<string>();
  const seenStudios = new Set<string>();
  const add = (entry: ConnectedAnime, via: string) => {
    neighbors.push({ ...entry, via });
    seenSeries.add(seriesKey(entry.anime));
    for (const studio of entry.anime.studios) seenStudios.add(facetKey("studio", studio));
  };
  const featuredFacets = active?.kind === "genre"
    ? facets.filter((facet) => facet.kind === "studio")
    : active ? [] : facets;
  for (const facet of featuredFacets) {
    const match = randomized.find((entry) =>
      entry.sharedKeys.includes(facet.key) &&
      !seenSeries.has(seriesKey(entry.anime)) &&
      !neighbors.some((chosen) => chosen.anime.id === entry.anime.id)
    );
    if (match) add(match, facet.key);
  }
  for (const preference of ["newStudio", "newSeries", "any"] as const) {
    for (const candidate of randomized) {
      if (neighbors.length >= 6) break;
      if (neighbors.some((chosen) => chosen.anime.id === candidate.anime.id)) continue;
      if (preference !== "any" && seenSeries.has(seriesKey(candidate.anime))) continue;
      if (preference === "newStudio" && candidate.anime.studios.some((studio) =>
        seenStudios.has(facetKey("studio", studio)))) continue;
      const studioFacet = active?.kind === "genre"
        ? facets.find((facet) => facet.kind === "studio" && candidate.sharedKeys.includes(facet.key))
        : undefined;
      add(candidate, studioFacet?.key ?? active?.key ?? candidate.via);
    }
  }

  return { facets, neighbors };
}
