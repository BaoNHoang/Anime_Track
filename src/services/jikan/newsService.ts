import type {
  AnimeNewsArticle,
  AnimePromo
} from "../../domain/news/types";
import {
  safeExternalUrl,
  truncateExternalText
} from "../../domain/security/validation";
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

  return response.data
    .map((article) => ({
      id: article.mal_id,
      animeId,
      animeTitle,
      animeImageUrl,
      title: truncateExternalText(article.title, 500),
      url: safeExternalUrl(article.url) ?? "",
      publishedAt: article.date,
      author: truncateExternalText(
        article.author_username ?? "MyAnimeList",
        200
      ),
      imageUrl: safeExternalUrl(article.images.jpg.image_url),
      excerpt: truncateExternalText(
        article.excerpt ?? "Open the article to read the full story.",
        2000
      ),
      comments: article.comments
    }))
    .filter((article) => article.url);
}

export async function getPopularPromos(
  signal?: AbortSignal
): Promise<AnimePromo[]> {
  const response = await jikanGet<JikanPromoResponse>(
    "/watch/promos/popular?limit=8",
    { signal, cacheMs: 2 * 60 * 60 * 1000 }
  );

  return response.data
    .map((promo) => ({
      animeId: promo.entry.mal_id,
      animeTitle: truncateExternalText(promo.entry.title, 500),
      animeUrl: safeExternalUrl(promo.entry.url) ?? "",
      imageUrl:
        safeExternalUrl(promo.entry.images.jpg.large_image_url) ||
        safeExternalUrl(promo.entry.images.jpg.image_url) ||
        "",
      promoTitle: truncateExternalText(promo.title, 500),
      videoUrl: safeExternalUrl(promo.trailer.url),
      embedUrl: safeExternalUrl(promo.trailer.embed_url) ?? ""
    }))
    .filter((promo) => promo.videoUrl || promo.embedUrl);
}
