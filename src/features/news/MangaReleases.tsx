import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMangaReleases } from "../../services/tenrai/mangaService";
import type { MangaFeed } from "../../domain/manga/types";
import { MANGA_RELEASE_SOURCES } from "../../domain/news/releaseSources";
import { ErrorState } from "../../components/ErrorState";
import { NewsGridSkeleton } from "../../components/LoadingState";
import { CatalogReleaseCard } from "./CatalogReleaseCard";
import { NewsPagination } from "./NewsPagination";

export function MangaReleases() {
  const [selection, setSelection] = useState<{ feed: MangaFeed; page: number }>({ feed: "publishing", page: 1 });
  const { feed, page } = selection;
  const result = useQuery({ queryKey: ["manga", "releases", feed, page],
    queryFn: ({ signal }) => getMangaReleases(feed, page, signal), staleTime: 6 * 60 * 60 * 1000, gcTime: 6 * 60 * 60 * 1000 });
  return <div className="page-stack">
    <div className="filter-chips" role="group" aria-label="Manga feed">
      {([['publishing', 'Publishing'], ['upcoming', 'Upcoming'], ['popular', 'Popular']] as const).map(([value, label]) => (
        <button key={value} type="button" className={feed === value ? "is-active" : ""} aria-pressed={feed === value}
          onClick={() => setSelection({ feed: value, page: 1 })}>{label}</button>
      ))}
    </div>
    <nav className="news-calendar-links" aria-label="Manga publisher calendars">{MANGA_RELEASE_SOURCES.map((source) => (
      <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name}</a>
    ))}</nav>
    {result.isPending && <NewsGridSkeleton label="Loading manga" />}
    {result.isError && <ErrorState message="Manga could not be loaded." onRetry={() => void result.refetch()} />}
    {result.data?.items.length === 0 && <p className="schedule-empty">No {feed} manga were found. Try another feed or a publisher calendar.</p>}
    {result.data && <div className="news-release-grid">{result.data.items.map((manga) => (
      <CatalogReleaseCard key={manga.id} title={manga.title} imageUrl={manga.imageUrl} status={manga.status}
        description={manga.synopsis} publication={manga.publication} url={manga.url} />
    ))}</div>}
    <NewsPagination page={page} loading={result.isFetching} hasNextPage={result.data?.hasNextPage ?? false}
      onPage={(next) => setSelection((current) => ({ ...current, page: next }))} />
  </div>;
}
