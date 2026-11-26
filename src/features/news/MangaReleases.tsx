import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMangaReleases } from "../../services/tenrai/mangaService";
import type { MangaCatalogFeed, MangaFeed } from "../../domain/manga/types";
import { MANGA_RELEASE_SOURCES } from "../../domain/news/releaseSources";
import { ErrorState } from "../../components/ErrorState";
import { NewsGridSkeleton } from "../../components/LoadingState";
import { CatalogReleaseCard } from "./CatalogReleaseCard";
import { NewsPagination } from "./NewsPagination";
import { ReleaseCalendarList } from "./ReleaseCalendarList";

function MangaCatalog({ feed }: { feed: MangaCatalogFeed }) {
  const [page, setPage] = useState(1);
  const result = useQuery({ queryKey: ["manga", "releases", feed, page],
    queryFn: ({ signal }) => getMangaReleases(feed, page, signal), staleTime: 6 * 60 * 60 * 1000, gcTime: 6 * 60 * 60 * 1000 });
  return <div className="page-stack">
    <nav className="news-calendar-links" aria-label="Manga publisher calendars">{MANGA_RELEASE_SOURCES.map((source) => (
      <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} release calendar</a>
    ))}</nav>
    {result.isPending && <NewsGridSkeleton label="Loading manga" />}
    {result.isError && <ErrorState message="Manga could not be loaded." onRetry={() => void result.refetch()} />}
    {result.data?.items.length === 0 && <p className="schedule-empty">No {feed} manga were found. Try another feed or a publisher calendar.</p>}
    {result.data && <div className="news-release-grid">{result.data.items.map((manga) => (
      <CatalogReleaseCard key={manga.id} title={manga.title} imageUrl={manga.imageUrl} status={manga.status}
        description={manga.synopsis} publication={manga.publication} url={manga.url} />
    ))}</div>}
    <NewsPagination page={page} loading={result.isFetching} hasNextPage={result.data?.hasNextPage ?? false}
      onPage={setPage} />
  </div>;
}

export function MangaReleases() {
  const [feed, setFeed] = useState<MangaFeed>("publishing");
  return <div className="page-stack">
    <div className="filter-chips" role="group" aria-label="Manga feed">
      {([['publishing', 'Publishing'], ['upcoming', 'Upcoming volumes'], ['popular', 'Popular']] as const).map(([value, label]) => (
        <button key={value} type="button" className={feed === value ? "is-active" : ""} aria-pressed={feed === value}
          onClick={() => setFeed(value)}>{label}</button>
      ))}
    </div>
    {feed === "upcoming"
      ? <section aria-label="Upcoming manga volume releases"><ReleaseCalendarList sources={MANGA_RELEASE_SOURCES} /></section>
      : <MangaCatalog key={feed} feed={feed} />}
  </div>;
}
