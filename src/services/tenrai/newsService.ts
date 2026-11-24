import type {
  AnimeNewsArticle,
  AnimePromo
} from "../../domain/news/types";
import { truncateExternalText } from "../../domain/security/validation";
import { tenraiGet } from "./client";
import { getCurrentSeason } from "./animeService";
import type { TenraiNewsResponse } from "./newsDto";
import type { Anime } from "../../domain/anime/types";
import { dedupeAnimeById } from "../../domain/anime/dedupe";
import { mapNewsArticle } from "./newsMapper";

const NEWS_CACHE_MS = 15 * 60 * 1000;
export const NEWS_SOURCE_BATCH_SIZE = 8;
export const MAX_NEWS_SOURCES = 24;
const MAX_STORIES_PER_ANIME = 3;

export function selectNewsAnime(feeds: Anime[][], limit = NEWS_SOURCE_BATCH_SIZE): Anime[] {
  const candidates: Anime[] = [];
  const longestFeed = Math.max(0, ...feeds.map((feed) => feed.length));
  for (let index = 0; index < longestFeed; index += 1) {
    for (const feed of feeds) {
      if (feed[index]) candidates.push(feed[index]);
    }
  }
  return dedupeAnimeById(candidates).slice(0, limit);
}

export function prepareLatestNews(
  articles: AnimeNewsArticle[],
  limit = MAX_NEWS_SOURCES * MAX_STORIES_PER_ANIME
): AnimeNewsArticle[] {
  const seenUrls = new Set<string>();
  const storiesPerAnime = new Map<number, number>();
  const seenImages = new Set<string>();

  const candidates = [...articles]
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .filter((article) => {
      const count = storiesPerAnime.get(article.animeId) ?? 0;
      if (seenUrls.has(article.url) || count >= MAX_STORIES_PER_ANIME) return false;
      seenUrls.add(article.url);
      storiesPerAnime.set(article.animeId, count + 1);
      return true;
    })
    .slice(0, limit);
  const feed: AnimeNewsArticle[] = [];
  while (candidates.length) {
    // Prefer the newest story from another title to avoid long repeated runs.
    const next = candidates.findIndex((article) => article.animeId !== feed.at(-1)?.animeId);
    const [article] = candidates.splice(Math.max(0, next), 1);
    feed.push(article);
  }
  return feed.map((article) => {
    const imageUrl = article.imageUrl || article.animeImageUrl;
    if (!imageUrl || seenImages.has(imageUrl)) {
      return { ...article, imageUrl: undefined };
    }
    seenImages.add(imageUrl);
    return { ...article, imageUrl };
  });
}

export async function getNewsForAnime(
  animeId: number,
  animeTitle: string,
  animeImageUrl: string,
  signal?: AbortSignal
): Promise<AnimeNewsArticle[]> {
  const response = await tenraiGet<TenraiNewsResponse>(
    `/anime/${animeId}/news`,
    { signal, cacheMs: NEWS_CACHE_MS, cacheStorage: "local" }
  );

  return response.data.slice(0, 100).flatMap((dto) => {
    const article = mapNewsArticle(dto);
    return article ? [{ ...article, animeId, animeTitle, animeImageUrl }] : [];
  });
}

export async function getPublisherNews(page = 1, signal?: AbortSignal) {
  const response = await tenraiGet<TenraiNewsResponse>(`/news?page=${page}&limit=24&sfw=true`,
    { signal, cacheMs: NEWS_CACHE_MS, cacheStorage: "local" });
  const seen = new Set<string>();
  const items = response.data.slice(0, 24).flatMap((dto) => {
    const article = mapNewsArticle(dto);
    if (!article || seen.has(article.url)) return [];
    seen.add(article.url);
    return [article];
  });
  return { items, hasNextPage: Boolean(response.pagination?.has_next_page) };
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
