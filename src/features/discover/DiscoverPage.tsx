import { ChevronLeft, ChevronRight, Search, X } from "../../components/OwnedIcons";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimeCard } from "../../components/AnimeCard";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useAnimeBrowse, useAnimeSearch } from "../../hooks/useAnimeQueries";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useTracker } from "../../app/providers/useTracker";
import { LibraryTools } from "../library/LibraryTools";
import type { AnimeBrowsePreset } from "../../services/tenrai/animeService";

type Sort = "default" | "score" | "popularity" | "title" | "year";

const feeds: Array<{ value: AnimeBrowsePreset; label: string }> = [
  { value: "airing", label: "Airing now" },
  { value: "upcoming", label: "Coming soon" },
  { value: "popular", label: "Most popular" },
  { value: "classics", label: "Classics" },
  { value: "ghibli", label: "Studio Ghibli" },
  { value: "family", label: "Family" },
  { value: "movies", label: "Movies" },
  { value: "favorites", label: "Most favorited" }
];

export function DiscoverPage() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [queryState, setQueryState] = useState(() => ({
    source: urlQuery,
    value: urlQuery
  }));
  const query = queryState.source === urlQuery ? queryState.value : urlQuery;
  const [feed, setFeed] = useState<AnimeBrowsePreset>("airing");
  const { items: library } = useTracker();
  const [year, setYear] = useState("");
  const [season, setSeason] = useState("");
  const [studio, setStudio] = useState("");
  const [maxEpisodes, setMaxEpisodes] = useState("");
  const [hideTracked, setHideTracked] = useState(false);
  const [type, setType] = useState("all");
  const [genre, setGenre] = useState("all");
  const [minimumScore, setMinimumScore] = useState("0");
  const [sort, setSort] = useState<Sort>("default");
  const [pageState, setPageState] = useState(() => ({ source: urlQuery, value: 1 }));
  const page = pageState.source === urlQuery ? pageState.value : 1;
  const debouncedQuery = useDebouncedValue(query.trim(), 500);
  const search = useAnimeSearch(debouncedQuery, page);
  const browse = useAnimeBrowse(feed, page);
  const isSearching = debouncedQuery.length >= 2;
  const result = isSearching ? search : browse;

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
      return matchesType && matchesGenre && matchesScore &&
        (!year || anime.year === Number(year)) &&
        (!season || anime.season === season) &&
        (!studio || anime.studios.some((name) => name.toLowerCase().includes(studio.toLowerCase()))) &&
        (!maxEpisodes || (anime.episodes !== undefined && anime.episodes <= Number(maxEpisodes))) &&
        (!hideTracked || !library.some((item) => item.anime.id === anime.id));
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
  }, [genre, minimumScore, result.data, sort, type, year, season, studio, maxEpisodes, hideTracked, library]);

  const clearFilters = () => {
    setType("all");
    setGenre("all");
    setMinimumScore("0");
    setSort("default");
    setYear(""); setSeason(""); setStudio(""); setMaxEpisodes(""); setHideTracked(false);
  };
  const updateQuery = (value: string) => {
    setQueryState({ source: urlQuery, value });
    setPageState({ source: urlQuery, value: 1 });
    setType("all");
    setGenre("all");
  };
  const updateFeed = (value: AnimeBrowsePreset) => {
    setFeed(value);
    setPageState({ source: urlQuery, value: 1 });
    setType("all");
    setGenre("all");
  };
  const changePage = (nextPage: number) => {
    setPageState({ source: urlQuery, value: nextPage });
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
    sort !== "default" || Boolean(year || season || studio || maxEpisodes || hideTracked);

  return (
    <div className="page-stack">
      <h1 className="visually-hidden">Discover anime</h1>
      <LibraryTools />

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
          <label><span>Year</span><input type="number" min="1900" max="2100" value={year} onChange={(e) => setYear(e.target.value)} /></label>
          <label><span>Season</span><select value={season} onChange={(e) => setSeason(e.target.value)}><option value="">Any</option>{["winter", "spring", "summer", "fall"].map((s) => <option key={s}>{s}</option>)}</select></label>
          <label><span>Studio</span><input value={studio} onChange={(e) => setStudio(e.target.value)} /></label>
          <label><span>Maximum episodes</span><input type="number" min="1" max="100000" value={maxEpisodes} onChange={(e) => setMaxEpisodes(e.target.value)} /></label>
          <label><span>Hide library titles</span><input type="checkbox" checked={hideTracked} onChange={(e) => setHideTracked(e.target.checked)} /></label>
          {hasFilters && (
            <button className="clear-filters" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </section>

      <p>Filters apply to the current catalog page. Try another page for more matches. Streaming and dub availability are not supplied by this catalog.</p>
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
            <span className="result-count" aria-live="polite">
              {`${filteredItems.length} shown on this page${
                result.isFetching ? " · Updating…" : ""
              }`}
            </span>
          )}
        </div>

        {result.isPending && <LoadingState cards={8} label="Loading anime results" />}
        {result.isError && !result.data && <ErrorState onRetry={() => result.refetch()} />}
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
