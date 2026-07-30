import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimeCard } from "../../components/AnimeCard";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useAnimeSearch, useTopAnime } from "../../hooks/useAnimeQueries";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

type Feed = "airing" | "bypopularity" | "upcoming";
type Sort = "default" | "score" | "popularity" | "title" | "year";

const feeds: Array<{ value: Feed; label: string }> = [
  { value: "airing", label: "Airing now" },
  { value: "bypopularity", label: "Most popular" },
  { value: "upcoming", label: "Upcoming" }
];

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [feed, setFeed] = useState<Feed>("airing");
  const [type, setType] = useState("all");
  const [genre, setGenre] = useState("all");
  const [minimumScore, setMinimumScore] = useState("0");
  const [sort, setSort] = useState<Sort>("default");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query.trim(), 500);
  const search = useAnimeSearch(debouncedQuery, page);
  const top = useTopAnime(feed, page);
  const isSearching = debouncedQuery.length >= 2;
  const result = isSearching ? search : top;

  const types = useMemo(
    () =>
      [...new Set(result.data?.items.map((anime) => anime.type) ?? [])].sort(),
    [result.data]
  );
  const genres = useMemo(
    () =>
      [
        ...new Set(
          result.data?.items.flatMap((anime) => anime.genres) ?? []
        )
      ].sort(),
    [result.data]
  );

  const filteredItems = useMemo(() => {
    const items = result.data?.items.filter((anime) => {
      const matchesType = type === "all" || anime.type === type;
      const matchesGenre =
        genre === "all" || anime.genres.includes(genre);
      const matchesScore = (anime.score ?? 0) >= Number(minimumScore);
      return matchesType && matchesGenre && matchesScore;
    }) ?? [];

    return [...items].sort((left, right) => {
      if (sort === "score") return (right.score ?? 0) - (left.score ?? 0);
      if (sort === "popularity") {
        return (
          (left.popularity ?? Number.MAX_SAFE_INTEGER) -
          (right.popularity ?? Number.MAX_SAFE_INTEGER)
        );
      }
      if (sort === "title") {
        return (left.titleEnglish || left.title).localeCompare(
          right.titleEnglish || right.title
        );
      }
      if (sort === "year") return (right.year ?? 0) - (left.year ?? 0);
      return 0;
    });
  }, [genre, minimumScore, result.data, sort, type]);

  const clearFilters = () => {
    setType("all");
    setGenre("all");
    setMinimumScore("0");
    setSort("default");
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
    setType("all");
    setGenre("all");
  };
  const updateFeed = (value: Feed) => {
    setFeed(value);
    setPage(1);
    setType("all");
    setGenre("all");
  };
  const changePage = (nextPage: number) => {
    setPage(nextPage);
    window.requestAnimationFrame(() => {
      document.getElementById("discover-results")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start"
      });
    });
  };
  const hasFilters =
    type !== "all" ||
    genre !== "all" ||
    minimumScore !== "0" ||
    sort !== "default";

  return (
    <div className="page-stack">
      <header className="page-heading">
        <h1>Search anime</h1>
        <p>Search by title, then narrow the results.</p>
      </header>

      <section className="query-panel">
        <div className="search-box">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search by title"
            aria-label="Search anime"
          />
          {query && (
            <button onClick={() => updateQuery("")} aria-label="Clear search">
              <X size={18} />
            </button>
          )}
        </div>

        {!isSearching && (
          <div className="filter-chips" aria-label="Browse categories">
            {feeds.map((option) => (
              <button
                key={option.value}
                className={feed === option.value ? "is-active" : ""}
                onClick={() => updateFeed(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <div className="query-controls">
          <label>
            <span>Type</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">All types</option>
              {types.map((item) => (
                <option value={item} key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Genre</span>
            <select value={genre} onChange={(event) => setGenre(event.target.value)}>
              <option value="all">All genres</option>
              {genres.map((item) => (
                <option value={item} key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Minimum score</span>
            <select
              value={minimumScore}
              onChange={(event) => setMinimumScore(event.target.value)}
            >
              <option value="0">Any score</option>
              <option value="6">6+</option>
              <option value="7">7+</option>
              <option value="8">8+</option>
              <option value="9">9+</option>
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              <option value="default">Default order</option>
              <option value="score">Highest score</option>
              <option value="popularity">Most popular</option>
              <option value="title">Title A-Z</option>
              <option value="year">Newest year</option>
            </select>
          </label>
          {hasFilters && (
            <button className="clear-filters" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </section>

      <section id="discover-results">
        <div className="results-heading">
          <div>
            <h2>
              {isSearching
                ? `Results for "${debouncedQuery}"`
                : feeds.find((item) => item.value === feed)?.label}
            </h2>
          </div>
          {result.data && (
            <span className="result-count">
              {result.isFetching
                ? "Loading page..."
                : `${filteredItems.length} shown on this page`}
            </span>
          )}
        </div>

        {result.isLoading && <LoadingState cards={8} />}
        {result.isError && <ErrorState onRetry={() => result.refetch()} />}
        {result.data && filteredItems.length === 0 && (
          <div className="empty-state">
            <strong>No titles match these filters.</strong>
            <p>Change the search text or clear a filter.</p>
          </div>
        )}
        {result.data && filteredItems.length > 0 && (
          <div className="anime-grid anime-grid--wide">
            {filteredItems.map((anime) => (
              <AnimeCard anime={anime} key={anime.id} />
            ))}
          </div>
        )}
        {result.data && (page > 1 || result.data.hasNextPage) && (
          <nav className="pagination" aria-label="Anime results pages">
            <button
              className="pagination__button"
              onClick={() => changePage(page - 1)}
              disabled={page <= 1 || result.isFetching}
              aria-label="Previous results page"
            >
              <ChevronLeft size={17} />
              Previous
            </button>
            <span className="pagination__status" aria-live="polite">
              Page {page}
              {result.data.lastPage ? ` of ${result.data.lastPage}` : ""}
            </span>
            <button
              className="pagination__button"
              onClick={() => changePage(page + 1)}
              disabled={!result.data.hasNextPage || result.isFetching}
              aria-label="Next results page"
            >
              Next
              <ChevronRight size={17} />
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
