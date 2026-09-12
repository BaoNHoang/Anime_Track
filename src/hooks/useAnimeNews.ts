import { useQueries, useQuery } from "@tanstack/react-query";
import { useCurrentSeason } from "./useAnimeQueries";
import {
  getNewsForAnime,
  getPopularPromos,
  prepareLatestNews
} from "../services/tenrai/newsService";

const NEWS_REFRESH_MS = 15 * 60 * 1000;

export function useAnimeNews() {
  const season = useCurrentSeason();
  const featuredAnime = season.data?.items.slice(0, 8) ?? [];
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
  const promos = useQuery({
    queryKey: ["anime", "news", "promos"],
    queryFn: ({ signal }) => getPopularPromos(signal),
    enabled: !season.isPending,
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    refetchInterval: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const articles = prepareLatestNews(
    articleQueries.flatMap((query) => query.data ?? [])
  );
  const articleQueriesPending = articleQueries.some(
    (query) => query.isPending
  );

  return {
    articles,
    promos: promos.data ?? [],
    articlesLoading:
      season.isPending || (articles.length === 0 && articleQueriesPending),
    articlesRefreshing:
      articles.length > 0 &&
      (season.isFetching || articleQueries.some((query) => query.isFetching)),
    articlesError:
      season.isError ||
      (articleQueries.length > 0 &&
        articleQueries.every((query) => query.isError)),
    promosLoading: promos.isPending,
    promosError: promos.isError,
    refetchArticles: async () => {
      await season.refetch();
      await Promise.all(articleQueries.map((query) => query.refetch()));
    },
    refetchPromos: promos.refetch
  };
}
