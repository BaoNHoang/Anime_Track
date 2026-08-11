import type { Anime, AnimePage } from "../../domain/anime/types";
import { dedupeAnimeById } from "../../domain/anime/dedupe";
import { tenraiGet } from "./client";
import type { TenraiItemResponse, TenraiListResponse } from "./dto";
import { mapTenraiAnime } from "./mapper";

const SHORT_LIST_CACHE_MS = 15 * 60 * 1000;
const POPULAR_LIST_CACHE_MS = 6 * 60 * 60 * 1000;

export type AnimeBrowsePreset =
  | "airing"
  | "upcoming"
  | "popular"
  | "classics"
  | "ghibli"
  | "family"
  | "movies"
  | "favorites"
  | "past"
  | "2000s"
  | "2010s"
  | "2020s";

const BROWSE_PRESETS: Record<AnimeBrowsePreset, Record<string, string>> = {
  airing: { status: "airing", order_by: "popularity", sort: "asc" },
  upcoming: { status: "upcoming", order_by: "popularity", sort: "asc" },
  popular: { order_by: "popularity", sort: "asc" },
  classics: {
    start_date: "1900-01-01",
    end_date: "1999-12-31",
    order_by: "score",
    sort: "desc"
  },
  ghibli: { producers: "21", order_by: "score", sort: "desc" },
  family: { rating: "g,pg", order_by: "popularity", sort: "asc" },
  movies: { type: "movie", order_by: "score", sort: "desc" },
  favorites: { order_by: "favorites", sort: "desc" },
  past: {
    start_date: "1970-01-01",
    end_date: "1999-12-31",
    order_by: "score",
    sort: "desc"
  },
  "2000s": {
    start_date: "2000-01-01",
    end_date: "2009-12-31",
    order_by: "score",
    sort: "desc"
  },
  "2010s": {
    start_date: "2010-01-01",
    end_date: "2019-12-31",
    order_by: "score",
    sort: "desc"
  },
  "2020s": {
    start_date: "2020-01-01",
    end_date: "2029-12-31",
    order_by: "score",
    sort: "desc"
  }
};

export function getTopAnimeCacheMs(
  filter: "airing" | "upcoming" | "bypopularity"
) {
  return filter === "bypopularity"
    ? POPULAR_LIST_CACHE_MS
    : SHORT_LIST_CACHE_MS;
}

function mapPage(response: TenraiListResponse): AnimePage {
  return {
    items: dedupeAnimeById(response.data.slice(0, 100).map(mapTenraiAnime)),
    currentPage: response.pagination.current_page,
    hasNextPage: response.pagination.has_next_page,
    lastPage: response.pagination.last_visible_page
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
  page = 1,
  signal?: AbortSignal
): Promise<AnimePage> {
  const cacheMs = getTopAnimeCacheMs(filter);
  const response = await tenraiGet<TenraiListResponse>(
    `/top/anime?filter=${filter}&limit=24&page=${page}&sfw=true`,
    {
      signal,
      cacheMs,
      cacheStorage: "local"
    }
  );
  return mapPage(response);
}

export async function searchAnime(
  query: string,
  page = 1,
  signal?: AbortSignal
): Promise<AnimePage> {
  const params = new URLSearchParams({
    q: query,
    limit: "20",
    sfw: "true",
    order_by: "popularity",
    sort: "asc",
    page: String(page)
  });
  const response = await tenraiGet<TenraiListResponse>(
    `/anime?${params.toString()}`,
    {
      signal,
      cacheMs: 30 * 60 * 1000,
      cacheStorage: "local"
    }
  );
  return mapPage(response);
}

export async function browseAnime(
  preset: AnimeBrowsePreset,
  page = 1,
  signal?: AbortSignal
): Promise<AnimePage> {
  const params = new URLSearchParams({
    ...BROWSE_PRESETS[preset],
    limit: "24",
    sfw: "true",
    page: String(page)
  });
  const response = await tenraiGet<TenraiListResponse>(
    `/anime?${params.toString()}`,
    { signal, cacheMs: POPULAR_LIST_CACHE_MS, cacheStorage: "local" }
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
