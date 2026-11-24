import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { useCurrentSeason, useTopAnime } from "./useAnimeQueries";
import {
  getNewsForAnime,
  prepareLatestNews,
  selectNewsAnime,
  NEWS_SOURCE_BATCH_SIZE,
  MAX_NEWS_SOURCES
} from "../services/tenrai/newsService";

const NEWS_REFRESH_MS = 15 * 60 * 1000;

export function useAnimeNews() {
  const [sourceLimit, setSourceLimit] = useState(NEWS_SOURCE_BATCH_SIZE);
  const season = useCurrentSeason();
  const upcoming = useTopAnime("upcoming");
  const popular = useTopAnime("bypopularity");
  const catalogQueries = [season, upcoming, popular];
  const catalogPending = catalogQueries.some((query) => query.isPending);
  // Settle the bounded source feeds first so partial arrivals cannot start
  // article requests for titles that will immediately leave the selection.
  const candidates = catalogPending ? [] : selectNewsAnime(
    catalogQueries.map((query) => query.data?.items ?? []), MAX_NEWS_SOURCES
  );
  const featuredAnime = candidates.slice(0, sourceLimit);
  const articleQueries = useQueries({
    queries: featuredAnime.map((anime) => ({
      queryKey: ["anime", "news", "title", anime.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getNewsForAnime(
          anime.id,
          anime.titleEnglish || anime.title,
          anime.imageUrl,
          signal
        ),
      staleTime: NEWS_REFRESH_MS,
      gcTime: 60 * 60 * 1000,
      refetchInterval: NEWS_REFRESH_MS,
      refetchOnWindowFocus: false
    }))
  });
  const seenUrls = new Set<string>();
  const articles = [];
  // Append each source batch so loading more cannot reshuffle earlier stories.
  for (let offset = 0; offset < articleQueries.length; offset += NEWS_SOURCE_BATCH_SIZE) {
    const batch = prepareLatestNews(articleQueries
      .slice(offset, offset + NEWS_SOURCE_BATCH_SIZE)
      .flatMap((query) => query.data ?? []));
    for (const article of batch) {
      if (!seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        articles.push(article);
      }
    }
  }
  const articleQueriesPending = articleQueries.some(
    (query) => query.isPending
  );

  return {
    articles,
    sourceAnime: featuredAnime,
    hasMoreArticles: featuredAnime.length < candidates.length,
    articlesLoadingMore: articleQueriesPending,
    loadMoreArticles: () => setSourceLimit((current) => Math.min(
      current + NEWS_SOURCE_BATCH_SIZE, candidates.length
    )),
    articlesLoading:
      catalogPending || (articles.length === 0 && articleQueriesPending),
    articlesRefreshing:
      articles.length > 0 &&
      (catalogQueries.some((query) => query.isFetching) || articleQueries.some((query) => query.isFetching)),
    articlesError:
      catalogQueries.every((query) => query.isError) ||
      (!articleQueriesPending && articleQueries.some((query) => query.isError)),
    refetchArticles: async () => {
      await Promise.all(catalogQueries.map((query) => query.refetch()));
      await Promise.all(articleQueries.map((query) => query.refetch()));
    }
  };
}
