import { LibraryBig, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  STATUS_LABELS,
  TRACKING_STATUSES,
  type TrackingStatus
} from "../../domain/tracker/types";
import { useTracker } from "../../hooks/useTracker";
import { LibraryCard } from "./LibraryCard";

type Filter = "all" | TrackingStatus;
type Sort = "updated" | "title" | "score" | "progress" | "added";

export function LibraryPage() {
  const { items } = useTracker();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [genre, setGenre] = useState("all");
  const [minimumScore, setMinimumScore] = useState("0");
  const [sort, setSort] = useState<Sort>("updated");

  const indexedItems = useMemo(
    () =>
      items.map((item) => ({
        item,
        searchText: [
          item.anime.title,
          item.anime.titleEnglish,
          ...item.anime.studios,
          ...item.anime.genres,
          item.notes
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      })),
    [items]
  );
  const types = useMemo(
    () => [...new Set(items.map((item) => item.anime.type))].sort(),
    [items]
  );
  const genres = useMemo(
    () =>
      [...new Set(items.flatMap((item) => item.anime.genres))].sort(),
    [items]
  );
  const statusCounts = useMemo(() => {
    const counts: Record<TrackingStatus, number> = {
      watching: 0,
      completed: 0,
      on_hold: 0,
      dropped: 0,
      plan_to_watch: 0
    };
    items.forEach((item) => {
      counts[item.status] += 1;
    });
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return indexedItems
      .filter(({ item, searchText }) => {
        const matchesStatus = filter === "all" || item.status === filter;
        const matchesQuery =
          !normalizedQuery || searchText.includes(normalizedQuery);
        const matchesType = type === "all" || item.anime.type === type;
        const matchesGenre =
          genre === "all" || item.anime.genres.includes(genre);
        const matchesScore =
          (item.userScore ?? 0) >= Number(minimumScore);
        return (
          matchesStatus &&
          matchesQuery &&
          matchesType &&
          matchesGenre &&
          matchesScore
        );
      })
      .map(({ item }) => item)
      .sort((left, right) => {
        if (sort === "title") {
          return (left.anime.titleEnglish || left.anime.title).localeCompare(
            right.anime.titleEnglish || right.anime.title
          );
        }
        if (sort === "score") {
          return (right.userScore ?? 0) - (left.userScore ?? 0);
        }
        if (sort === "progress") return right.progress - left.progress;
        if (sort === "added") return right.addedAt.localeCompare(left.addedAt);
        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [
    filter,
    genre,
    indexedItems,
    minimumScore,
    query,
    sort,
    type
  ]);

  const hasFilters =
    query.trim() ||
    filter !== "all" ||
    type !== "all" ||
    genre !== "all" ||
    minimumScore !== "0" ||
    sort !== "updated";
  const clearFilters = () => {
    setQuery("");
    setFilter("all");
    setType("all");
    setGenre("all");
    setMinimumScore("0");
    setSort("updated");
  };

  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">Saved anime</span>
        <h1>Library</h1>
        <p>{items.length} titles stored on this device.</p>
      </header>

      <section className="query-panel">
        <div className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, studios, genres, or notes"
            aria-label="Search library"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear library search">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="filter-chips filter-chips--library">
          <button
            className={filter === "all" ? "is-active" : ""}
            onClick={() => setFilter("all")}
          >
            All <span>{items.length}</span>
          </button>
          {TRACKING_STATUSES.map((status) => (
            <button
              key={status}
              className={filter === status ? "is-active" : ""}
              onClick={() => setFilter(status)}
            >
              {STATUS_LABELS[status]}
              <span>{statusCounts[status]}</span>
            </button>
          ))}
        </div>

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
            <span>Your score</span>
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
              <option value="updated">Recently updated</option>
              <option value="added">Recently added</option>
              <option value="title">Title A-Z</option>
              <option value="score">Highest score</option>
              <option value="progress">Most progress</option>
            </select>
          </label>
          {hasFilters && (
            <button className="clear-filters" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </section>

      <div className="results-summary">
        <strong>{filteredItems.length}</strong>
        <span>matching title{filteredItems.length === 1 ? "" : "s"}</span>
      </div>

      {filteredItems.length ? (
        <section className="library-list">
          {filteredItems.map((item) => (
            <LibraryCard item={item} key={item.anime.id} />
          ))}
        </section>
      ) : (
        <section className="empty-state empty-state--large">
          <span className="empty-state__icon">
            <LibraryBig size={28} />
          </span>
          <strong>
            {items.length ? "No titles match these filters." : "Your library is empty."}
          </strong>
          <p>
            {items.length
              ? "Change the search text or clear a filter."
              : "Search the catalog and add an anime."}
          </p>
          {!items.length && (
            <Link className="button" to="/discover">
              Search anime
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
