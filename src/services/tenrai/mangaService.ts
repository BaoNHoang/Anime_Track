import type { Manga, MangaCatalogFeed } from "../../domain/manga/types";
import { safeAnimeImageUrl, safeMyAnimeListMangaUrl, truncateExternalText } from "../../domain/security/validation";
import { tenraiGet } from "./client";

interface MangaDto {
  mal_id: number;
  title?: string;
  title_english?: string | null;
  url?: string;
  images?: { jpg?: { image_url?: string | null } };
  synopsis?: string | null;
  status?: string | null;
  published?: { string?: string | null } | null;
  score?: number | null;
}

export async function getMangaReleases(feed: MangaCatalogFeed, page = 1, signal?: AbortSignal) {
  const params = new URLSearchParams({ type: "manga", limit: "24", page: String(page), sfw: "true" });
  if (feed === "popular") params.set("filter", "bypopularity");
  else {
    params.set("status", feed);
    params.set("order_by", "start_date");
    params.set("sort", "desc");
  }
  const response = await tenraiGet<{ data: MangaDto[]; pagination?: { has_next_page?: boolean } }>(
    `${feed === "popular" ? "/top/manga" : "/manga"}?${params}`,
    { signal, cacheMs: 6 * 60 * 60 * 1000, cacheStorage: "local" }
  );
  const seen = new Set<number>();
  const items: Manga[] = [];
  for (const dto of response.data.slice(0, 24)) {
    if (!Number.isInteger(dto.mal_id) || dto.mal_id < 1 || dto.mal_id > 10_000_000 || seen.has(dto.mal_id)) continue;
    seen.add(dto.mal_id);
    items.push({
      id: dto.mal_id,
      title: truncateExternalText(dto.title_english || dto.title || "Untitled manga", 500),
      imageUrl: safeAnimeImageUrl(dto.images?.jpg?.image_url),
      synopsis: truncateExternalText(dto.synopsis || "No synopsis is available yet.", 2000),
      status: truncateExternalText(dto.status || "Status not announced", 100),
      publication: truncateExternalText(dto.published?.string || "Publication date not announced", 200),
      score: typeof dto.score === "number" && Number.isFinite(dto.score) ? dto.score : undefined,
      url: safeMyAnimeListMangaUrl(dto.url) ?? `https://myanimelist.net/manga/${dto.mal_id}`
    });
  }
  return { items, hasNextPage: Boolean(response.pagination?.has_next_page) };
}
