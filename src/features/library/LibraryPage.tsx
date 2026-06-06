import { LibraryBig, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTracker } from "../../context/TrackerContext";
import {
  STATUS_LABELS,
  TRACKING_STATUSES,
  type TrackingStatus
} from "../../domain/tracker/types";
import { LibraryCard } from "./LibraryCard";

type Filter = "all" | TrackingStatus;

export function LibraryPage() {
  const { items } = useTracker();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter = filter === "all" || item.status === filter;
      const matchesQuery =
        !normalizedQuery ||
        item.anime.title.toLowerCase().includes(normalizedQuery) ||
        item.anime.titleEnglish?.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [filter, items, query]);

  return (
    <div className="page-stack">
      <header className="page-heading page-heading--row">
        <div>
          <span className="eyebrow">Your collection</span>
          <h1>Library</h1>
          <p>{items.length} titles saved on this device.</p>
        </div>
        <div className="library-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter library"
            aria-label="Filter library"
          />
        </div>
      </header>

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
            <span>{items.filter((item) => item.status === status).length}</span>
          </button>
        ))}
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
            {items.length ? "Nothing matches this view." : "Your library is empty."}
          </strong>
          <p>
            {items.length
              ? "Change the status filter or search."
              : "Discover a title and add it to start tracking."}
          </p>
          {!items.length && (
            <Link className="button" to="/discover">
              Browse anime
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
