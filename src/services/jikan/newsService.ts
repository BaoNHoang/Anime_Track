import type {
  AnimeNewsArticle,
  AnimePromo
} from "../../domain/news/types";
import { jikanGet } from "./client";
import type {
  JikanNewsResponse,
  JikanPromoResponse
} from "./newsDto";

export async function getNewsForAnime(
  animeId: number,
  animeTitle: string,
  animeImageUrl: string,
  signal?: AbortSignal
): Promise<AnimeNewsArticle[]> {
  const response = await jikanGet<JikanNewsResponse>(
    `/anime/${animeId}/news`,
    { signal, cacheMs: 2 * 60 * 60 * 1000 }
  );

  return response.data.map((article) => ({
    id: article.mal_id,
    animeId,
    animeTitle,
    animeImageUrl,
    title: article.title,
    url: article.url,
    publishedAt: article.date,
    author: article.author_username ?? "MyAnimeList",
    imageUrl: article.images.jpg.image_url ?? undefined,
    excerpt: article.excerpt ?? "Open the article to read the full story.",
    comments: article.comments
  }));
}

export async function getPopularPromos(
  signal?: AbortSignal
): Promise<AnimePromo[]> {
  const response = await jikanGet<JikanPromoResponse>(
    "/watch/promos/popular?limit=8",
    { signal, cacheMs: 2 * 60 * 60 * 1000 }
  );

  return response.data.map((promo) => ({
    animeId: promo.entry.mal_id,
    animeTitle: promo.entry.title,
    animeUrl: promo.entry.url,
    imageUrl:
      promo.entry.images.jpg.large_image_url ||
      promo.entry.images.jpg.image_url,
    promoTitle: promo.title,
    videoUrl: promo.trailer.url ?? undefined,
    embedUrl: promo.trailer.embed_url
  }));
}
