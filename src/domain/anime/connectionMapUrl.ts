import type { ConnectionFacet } from "./connectionMap";

export interface ConnectionMapUrlState {
  animeId?: number;
  facet?: ConnectionFacet;
  bridgeGenre?: ConnectionFacet;
  page: number;
  seed: number;
}

const MAX_ANIME_ID = 10_000_000;
const MAX_PAGE = 50;

function positiveInteger(value: string | null, max: number) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= max ? number : undefined;
}

export function parseMapFacet(value: string | null): ConnectionFacet | undefined {
  if (!value || value.length > 210) return undefined;
  const separator = value.indexOf(":");
  if (separator < 0) return undefined;
  const kind = value.slice(0, separator);
  const label = value.slice(separator + 1).trim();
  if ((kind !== "genre" && kind !== "studio") || !label || label.length > 200) return undefined;
  return { kind, label, key: `${kind}:${label.toLocaleLowerCase()}` };
}

export function mapFacetParam(facet: ConnectionFacet) {
  return `${facet.kind}:${facet.label}`;
}

export function readConnectionMapUrl(params: URLSearchParams): ConnectionMapUrlState {
  const facet = parseMapFacet(params.get("facet"));
  const bridge = parseMapFacet(params.get("bridge"));
  return {
    animeId: positiveInteger(params.get("anime"), MAX_ANIME_ID),
    facet,
    bridgeGenre: facet?.kind === "studio" && bridge?.kind === "genre" ? bridge : undefined,
    page: positiveInteger(params.get("mapPage"), MAX_PAGE) ?? 1,
    seed: positiveInteger(params.get("mapSeed"), 0xffffffff) ?? 1
  };
}
