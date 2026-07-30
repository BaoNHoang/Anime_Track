import type { Anime, AnimePage } from "../../domain/anime/types";
import { dedupeAnimeById } from "../../domain/anime/dedupe";
import { tenraiGet } from "./client";
import type { TenraiItemResponse, TenraiListResponse } from "./dto";
import { mapTenraiAnime } from "./mapper";

const SHORT_LIST_CACHE_MS = 15 * 60 * 1000;
const POPULAR_LIST_CACHE_MS = 6 * 60 * 60 * 1000;

export function getTopAnimeCacheMs(
  filter: "airing" | "upcoming" | "bypopularity"
) {
  return filter === "bypopularity"
    ? POPULAR_LIST_CACHE_MS
    : SHORT_LIST_CACHE_MS;
}

function mapPage(response: TenraiListResponse): AnimePage {
  return {
    items: dedupeAnimeById(response.data.map(mapTenraiAnime)),
    currentPage: response.pagination.current_page,
    hasNextPage: response.pagination.has_next_page
  };
}

export async function getCurrentSeason(
  signal?: AbortSignal
): Promise<AnimePage> {
  const response = await tenraiGet<TenraiListResponse>(
    "/seasons/now?limit=18&sfw=true",
    { signal, cacheMs: SHORT_LIST_CACHE_MS }
  );
  return mapPage(response);
}

export async function getTopAnime(
  filter: "airing" | "upcoming" | "bypopularity",
  signal?: AbortSignal
): Promise<AnimePage> {
  const isPopular = filter === "bypopularity";
  const pageCount = isPopular ? 4 : 1;
  const limit = isPopular ? 25 : 18;
  const cacheMs = getTopAnimeCacheMs(filter);
  const responses = await Promise.all(
    Array.from({ length: pageCount }, (_, index) =>
      tenraiGet<TenraiListResponse>(
        `/top/anime?filter=${filter}&limit=${limit}&page=${index + 1}&sfw=true`,
        {
          signal,
          cacheMs,
          cacheStorage: isPopular ? "local" : "session"
        }
      )
    )
  );
  const items = dedupeAnimeById(
    responses.flatMap((response) => response.data.map(mapTenraiAnime))
  ).slice(0, isPopular ? 100 : limit);

  return {
    items,
    currentPage: 1,
    hasNextPage: isPopular
      ? responses.at(-1)?.pagination.has_next_page ?? false
      : responses[0].pagination.has_next_page
  };
}

export async function searchAnime(
  query: string,
  signal?: AbortSignal
): Promise<AnimePage> {
  const params = new URLSearchParams({
    q: query,
    limit: "20",
    sfw: "true",
    order_by: "popularity",
    sort: "asc"
  });
  const response = await tenraiGet<TenraiListResponse>(
    `/anime?${params.toString()}`,
    { signal, cacheMs: 10 * 60 * 1000 }
  );
  return mapPage(response);
}

export async function getAnimeById(
  id: number,
  signal?: AbortSignal
): Promise<Anime> {
  const response = await tenraiGet<TenraiItemResponse>(`/anime/${id}/full`, {
    signal,
    cacheMs: 30 * 60 * 1000
  });
  return mapTenraiAnime(response.data);
}
