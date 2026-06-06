import { Search, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { AnimeCard } from "../../components/AnimeCard";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { useAnimeSearch, useTopAnime } from "../../hooks/useAnimeQueries";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

type Feed = "airing" | "bypopularity" | "upcoming";

const feeds: Array<{ value: Feed; label: string }> = [
  { value: "airing", label: "Airing now" },
  { value: "bypopularity", label: "Most popular" },
  { value: "upcoming", label: "Upcoming" }
];

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [feed, setFeed] = useState<Feed>("airing");
  const debouncedQuery = useDebouncedValue(query.trim(), 500);
  const search = useAnimeSearch(debouncedQuery);
  const top = useTopAnime(feed);
  const isSearching = debouncedQuery.length >= 2;
  const result = isSearching ? search : top;

  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">Explore the catalog</span>
        <h1>Find your next obsession.</h1>
        <p>Search thousands of titles or browse what people are watching.</p>
      </header>

      <section className="search-panel">
        <div className="search-box">
          <Search size={21} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title..."
            aria-label="Search anime"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
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
                onClick={() => setFeed(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="results-heading">
          <div>
            <span className="eyebrow">
              {isSearching ? "Search results" : "Curated feed"}
            </span>
            <h2>
              {isSearching ? `Results for “${debouncedQuery}”` : feeds.find((item) => item.value === feed)?.label}
            </h2>
          </div>
          {!isSearching && <Sparkles size={22} />}
        </div>

        {result.isLoading && <LoadingState cards={8} />}
        {result.isError && <ErrorState onRetry={() => result.refetch()} />}
        {result.data && result.data.items.length === 0 && (
          <div className="empty-state">
            <strong>No titles found.</strong>
            <p>Try another spelling or a broader search.</p>
          </div>
        )}
        {result.data && (
          <div className="anime-grid anime-grid--wide">
            {result.data.items.map((anime) => (
              <AnimeCard anime={anime} key={anime.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
