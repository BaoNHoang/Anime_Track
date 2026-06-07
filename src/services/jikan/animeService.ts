import type { Anime, AnimePage } from "../../domain/anime/types";
import { dedupeAnimeById } from "../../domain/anime/dedupe";
import { jikanGet } from "./client";
import type { JikanItemResponse, JikanListResponse } from "./dto";
import { mapJikanAnime } from "./mapper";

function mapPage(response: JikanListResponse): AnimePage {
  return {
    items: dedupeAnimeById(response.data.map(mapJikanAnime)),
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
  const isPopular = filter === "bypopularity";
  const pageCount = isPopular ? 4 : 1;
  const limit = isPopular ? 25 : 18;
  const cacheMs = isPopular ? 60 * 60 * 1000 : 15 * 60 * 1000;
  const responses = await Promise.all(
    Array.from({ length: pageCount }, (_, index) =>
      jikanGet<JikanListResponse>(
        `/top/anime?filter=${filter}&limit=${limit}&page=${index + 1}&sfw=true`,
        { signal, cacheMs }
      )
    )
  );
  const items = dedupeAnimeById(
    responses.flatMap((response) => response.data.map(mapJikanAnime))
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
