import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublisherNews } from "../../services/tenrai/newsService";
import { NewsGridSkeleton } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { NewsStoryCard } from "./NewsStoryCard";
import { NewsPreviewControls } from "./NewsPreviewControls";
import { useNewsPreviews } from "./useNewsPreviews";
import { NewsPagination } from "./NewsPagination";

export function MyAnimeListNews() {
  const [page, setPage] = useState(1);
  const previews = useNewsPreviews();
  const result = useQuery({ queryKey: ["news", "myanimelist", page],
    queryFn: ({ signal }) => getPublisherNews(page, signal), staleTime: 15 * 60 * 1000, gcTime: 60 * 60 * 1000 });
  return <div className="page-stack">
    <NewsPreviewControls hidden={previews.hidePreviews} onChange={previews.toggle} />
    <p className="news-tab-note">More anime and manga reporting from MyAnimeList, beyond the titles in the main feed.</p>
    {result.isPending && <NewsGridSkeleton label="Loading MyAnimeList news" />}
    {result.isError && <ErrorState message="MyAnimeList news could not be loaded." onRetry={() => void result.refetch()} />}
    {result.data?.items.length === 0 && <p className="schedule-empty">No current MyAnimeList stories were found.</p>}
    {result.data && <div className="news-grid">{result.data.items.map((article) => (
      <NewsStoryCard key={article.url} article={article} previewHidden={previews.hidden(article)} onReveal={previews.reveal} />
    ))}</div>}
    <NewsPagination page={page} loading={result.isFetching} hasNextPage={result.data?.hasNextPage ?? false} onPage={setPage} />
    <nav className="news-calendar-links" aria-label="MyAnimeList news source"><a href="https://myanimelist.net/news" target="_blank" rel="noreferrer">More on MyAnimeList</a></nav>
  </div>;
}
