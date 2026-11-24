import type { NewsArticle } from "../../domain/news/types";
import { safeAnimeImageUrl, safeMyAnimeListNewsUrl, truncateExternalText } from "../../domain/security/validation";
import type { TenraiNewsDto } from "./newsDto";

export function mapNewsArticle(dto: TenraiNewsDto): NewsArticle | undefined {
  const url = safeMyAnimeListNewsUrl(dto.url);
  if (!url || !dto.date || !Number.isFinite(Date.parse(dto.date))) return undefined;
  return {
    id: dto.mal_id,
    title: truncateExternalText(dto.title, 500),
    url,
    publishedAt: dto.date,
    author: truncateExternalText(dto.author_username || "MyAnimeList", 200),
    imageUrl: safeAnimeImageUrl(dto.images?.jpg?.image_url),
    excerpt: truncateExternalText(dto.excerpt || "Open the article to read the full story.", 2000),
    comments: Number.isFinite(dto.comments) ? Math.max(0, dto.comments) : 0
  };
}
