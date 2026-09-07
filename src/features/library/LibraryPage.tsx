import {
  ChevronLeft,
  ChevronRight,
  LibraryBig,
  Search,
  X
} from "../../components/OwnedIcons";
import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LibraryTools } from "./LibraryTools";
import {
  STATUS_LABELS,
  TRACKING_STATUSES,
  type TrackingStatus
} from "../../domain/tracker/types";
import { useTracker } from "../../app/providers/useTracker";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { LibraryCard } from "./LibraryCard";
import { RouteSkeleton } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";

type Filter = "all" | TrackingStatus;
type Sort = "updated" | "title" | "score" | "progress" | "added";
const LIBRARY_PAGE_SIZE = 60;

export function LibraryPage() {
  const { isReady, items, syncError, syncStatus } = useTracker();
  const { configured, initialized, user } = useCloudAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [genre, setGenre] = useState("all");
  const [minimumScore, setMinimumScore] = useState("0");
  const [sort, setSort] = useState<Sort>("updated");
  const [page, setPage] = useState(1);
  const [frozenRecentOrder, setFrozenRecentOrder] = useState<number[]>();
  const deferredQuery = useDeferredValue(query);
  const frozenRecentPositions = useMemo(
    () =>
      frozenRecentOrder
        ? new Map(frozenRecentOrder.map((animeId, index) => [animeId, index]))
        : undefined,
    [frozenRecentOrder]
  );

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
    const normalizedQuery = deferredQuery.trim().toLowerCase();
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
        if (frozenRecentPositions) {
          const leftPosition = frozenRecentPositions.get(left.anime.id);
          const rightPosition = frozenRecentPositions.get(right.anime.id);
          if (leftPosition !== undefined && rightPosition !== undefined) {
            return leftPosition - rightPosition;
          }
          if (leftPosition !== undefined) return 1;
          if (rightPosition !== undefined) return -1;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [
    filter,
    frozenRecentPositions,
    genre,
    indexedItems,
    minimumScore,
    deferredQuery,
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
    setFrozenRecentOrder(undefined);
    setPage(1);
  };
  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / LIBRARY_PAGE_SIZE)
  );
  const activePage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice(
    (activePage - 1) * LIBRARY_PAGE_SIZE,
    activePage * LIBRARY_PAGE_SIZE
  );
  const changePage = (nextPage: number) => {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
    window.requestAnimationFrame(() => {
      document.getElementById("library-results")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start"
      });
    });
  };

  if (configured && (!initialized || !user)) {
    if (!initialized) return <RouteSkeleton label="Loading your library" />;

    return (
      <div className="page-stack">
        <h1 className="visually-hidden">Library</h1>
        <section className="empty-state empty-state--large">
          <span className="empty-state__icon">
            <LibraryBig size={28} />
          </span>
          <strong>Sign in to view your library.</strong>
          <Link className="button" to="/account">
            Sign in
          </Link>
        </section>
      </div>
    );
  }

  if (configured && user && !isReady) {
    if (syncStatus === "error") {
      return (
        <ErrorState
          message={syncError ?? "Your library could not be loaded."}
          onRetry={() => window.location.reload()}
        />
      );
    }
    return <RouteSkeleton label="Loading your library" />;
  }

  return (
    <div className="page-stack">
      <LibraryTools />
      <h1 className="visually-hidden">Library</h1>

      <section className="query-panel" id="library-results">
        <div className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search titles, studios, genres, or notes"
            aria-label="Search library"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              aria-label="Clear library search"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="filter-chips filter-chips--library">
          <button
            className={filter === "all" ? "is-active" : ""}
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
          >
            All <span>{items.length}</span>
          </button>
          {TRACKING_STATUSES.map((status) => (
            <button
              key={status}
              className={filter === status ? "is-active" : ""}
              onClick={() => {
                setFilter(status);
                setPage(1);
              }}
            >
              {STATUS_LABELS[status]}
              <span>{statusCounts[status]}</span>
            </button>
          ))}
        </div>

        <div className="query-controls">
          <label>
            <span>Type</span>
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All types</option>
              {types.map((item) => (
                <option value={item} key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Genre</span>
            <select
              value={genre}
              onChange={(event) => {
                setGenre(event.target.value);
                setPage(1);
              }}
            >
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
              onChange={(event) => {
                setMinimumScore(event.target.value);
                setPage(1);
              }}
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
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as Sort);
                setFrozenRecentOrder(undefined);
                setPage(1);
              }}
            >
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
        <section className="library-grid">
          {visibleItems.map((item) => (
            <LibraryCard
              item={item}
              key={item.anime.id}
              onEditStart={() =>
                setFrozenRecentOrder(
                  (current) =>
                    current ?? filteredItems.map((entry) => entry.anime.id)
                )
              }
            />
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
      {filteredItems.length > LIBRARY_PAGE_SIZE && (
        <nav className="pagination" aria-label="Library pages">
          <button
            className="pagination__button"
            type="button"
            onClick={() => changePage(activePage - 1)}
            disabled={activePage === 1}
          >
            <ChevronLeft size={17} /> Previous
          </button>
          <span className="pagination__status" aria-live="polite">
            Page {activePage} of {totalPages}
          </span>
          <button
            className="pagination__button"
            type="button"
            onClick={() => changePage(activePage + 1)}
            disabled={activePage === totalPages}
          >
            Next <ChevronRight size={17} />
          </button>
        </nav>
      )}
    </div>
  );
}
