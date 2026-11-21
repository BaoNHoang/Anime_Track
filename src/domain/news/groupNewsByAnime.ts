import type { AnimeNewsArticle } from "./types";

export interface AnimeNewsGroup {
  article: AnimeNewsArticle;
  related: AnimeNewsArticle[];
}

/** Preserve feed order: each title's first story is its main headline. */
export function groupNewsByAnime(articles: AnimeNewsArticle[]): AnimeNewsGroup[] {
  const groups = new Map<number, AnimeNewsGroup>();
  for (const article of articles) {
    const group = groups.get(article.animeId);
    if (group) group.related.push(article);
    else groups.set(article.animeId, { article, related: [] });
  }
  return [...groups.values()];
}
