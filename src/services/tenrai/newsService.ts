import type {
  AnimeNewsArticle,
  AnimePromo
} from "../../domain/news/types";
import {
  safeExternalUrl,
  truncateExternalText
} from "../../domain/security/validation";
import { tenraiGet } from "./client";
import { getCurrentSeason } from "./animeService";
import type { TenraiNewsResponse } from "./newsDto";

export async function getNewsForAnime(
  animeId: number,
  animeTitle: string,
  animeImageUrl: string,
  signal?: AbortSignal
): Promise<AnimeNewsArticle[]> {
  const response = await tenraiGet<TenraiNewsResponse>(
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
  const season = await getCurrentSeason(signal);

  return season.items
    .filter((anime) => anime.trailerUrl)
    .slice(0, 8)
    .map((anime) => ({
      animeId: anime.id,
      animeTitle: anime.title,
      animeUrl: anime.url,
      imageUrl: anime.largeImageUrl || anime.imageUrl,
      promoTitle: truncateExternalText(`${anime.title} trailer`, 500),
      videoUrl: anime.trailerUrl,
      embedUrl: ""
    }))
    .filter((promo) => promo.videoUrl || promo.embedUrl);
}
