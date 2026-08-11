import type { FavoriteEntry, FavoriteKind } from "../../domain/account/favorites";
import { safeAnimeImageUrl, truncateExternalText } from "../../domain/security/validation";
import { searchAnime } from "./animeService";
import { tenraiGet } from "./client";

interface CatalogEntityDto {
  mal_id: number;
  name?: string;
  titles?: Array<{ title?: string }>;
  images?: {
    jpg?: { image_url?: string | null };
    webp?: { image_url?: string | null };
  };
}

interface CatalogEntityResponse {
  data: CatalogEntityDto[];
}

function mapEntity(item: CatalogEntityDto): FavoriteEntry | undefined {
  const name = item.name || item.titles?.find((title) => title.title)?.title;
  if (!Number.isSafeInteger(item.mal_id) || item.mal_id <= 0 || !name) return undefined;
  const imageUrl = safeAnimeImageUrl(
    item.images?.webp?.image_url ?? item.images?.jpg?.image_url
  );
  return {
    id: item.mal_id,
    name: truncateExternalText(name, 200),
    ...(imageUrl ? { imageUrl } : {})
  };
}

export async function searchFavoriteCatalog(
  kind: FavoriteKind,
  query: string,
  signal?: AbortSignal
): Promise<FavoriteEntry[]> {
  const normalizedQuery = query.trim().slice(0, 200);
  if (normalizedQuery.length < 2) return [];
  if (kind === "anime") {
    const result = await searchAnime(normalizedQuery, 1, signal);
    return result.items.slice(0, 10).map((anime) => ({
      id: anime.id,
      name: anime.titleEnglish || anime.title,
      ...(anime.imageUrl ? { imageUrl: anime.imageUrl } : {})
    }));
  }

  const endpoint = kind === "studios"
    ? "producers"
    : kind === "characters"
      ? "characters"
      : "people";
  const params = new URLSearchParams({
    q: normalizedQuery,
    limit: "10",
    order_by: "favorites",
    sort: "desc"
  });
  const response = await tenraiGet<CatalogEntityResponse>(
    `/${endpoint}?${params.toString()}`,
    { signal, cacheMs: 30 * 60 * 1000, cacheStorage: "local" }
  );
  return response.data
    .map(mapEntity)
    .filter((item): item is FavoriteEntry => Boolean(item));
}
