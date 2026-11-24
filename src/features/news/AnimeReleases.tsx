import { useState } from "react";
import { useTopAnime } from "../../hooks/useAnimeQueries";
import { ErrorState } from "../../components/ErrorState";
import { NewsGridSkeleton } from "../../components/LoadingState";
import { CatalogReleaseCard } from "./CatalogReleaseCard";
import { ViewAnimeButton } from "./NewsStoryCard";
import { NewsPagination } from "./NewsPagination";

const dateFormatter = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });

export function AnimeReleases() {
  const [page, setPage] = useState(1);
  const result = useTopAnime("upcoming", page);
  return <div className="page-stack">
    <p className="news-tab-note">Upcoming series and films. Premiere dates may change.</p>
    {result.isPending && <NewsGridSkeleton label="Loading upcoming anime" />}
    {result.isError && <ErrorState message="Upcoming anime could not be loaded." onRetry={() => void result.refetch()} />}
    {result.data?.items.length === 0 && <p className="schedule-empty">No upcoming anime were found.</p>}
    {result.data && <div className="news-release-grid">{result.data.items.map((anime) => (
      <CatalogReleaseCard key={anime.id} title={anime.titleEnglish || anime.title} imageUrl={anime.imageUrl}
        status={anime.status} description={anime.synopsis} url={anime.url}
        publication={anime.startDate && Number.isFinite(Date.parse(anime.startDate)) ? `Premiere: ${dateFormatter.format(new Date(anime.startDate))}` : "Premiere date not announced"}>
        <ViewAnimeButton anime={anime} />
      </CatalogReleaseCard>
    ))}</div>}
    <NewsPagination page={page} loading={result.isFetching} hasNextPage={result.data?.hasNextPage ?? false} onPage={setPage} />
  </div>;
}
