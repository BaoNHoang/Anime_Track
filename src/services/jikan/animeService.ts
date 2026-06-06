import type { Anime, AnimePage } from "../../domain/anime/types";
import { jikanGet } from "./client";
import type { JikanItemResponse, JikanListResponse } from "./dto";
import { mapJikanAnime } from "./mapper";

function mapPage(response: JikanListResponse): AnimePage {
  return {
    items: response.data.map(mapJikanAnime),
    currentPage: response.pagination.current_page,
    hasNextPage: response.pagination.has_next_page
  };
}

export async function getCurrentSeason(
  signal?: AbortSignal
): Promise<AnimePage> {
  const response = await jikanGet<JikanListResponse>(
    "/seasons/now?limit=18&sfw=true",
    { signal, cacheMs: 15 * 60 * 1000 }
  );
  return mapPage(response);
}

export async function getTopAnime(
  filter: "airing" | "upcoming" | "bypopularity",
  signal?: AbortSignal
): Promise<AnimePage> {
  const response = await jikanGet<JikanListResponse>(
    `/top/anime?filter=${filter}&limit=18&sfw=true`,
    { signal, cacheMs: 15 * 60 * 1000 }
  );
  return mapPage(response);
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
  const response = await jikanGet<JikanListResponse>(
    `/anime?${params.toString()}`,
    { signal, cacheMs: 10 * 60 * 1000 }
  );
  return mapPage(response);
}

export async function getAnimeById(
  id: number,
  signal?: AbortSignal
): Promise<Anime> {
  const response = await jikanGet<JikanItemResponse>(`/anime/${id}/full`, {
    signal,
    cacheMs: 30 * 60 * 1000
  });
  return mapJikanAnime(response.data);
}
