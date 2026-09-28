import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimeCard } from "../../components/AnimeCard";
import { parseSharedList, sharedTitleAnime } from "../../domain/tracker/sharedList";

export function SharedListPage() {
  const { hash } = useLocation();
  const list = useMemo(() => parseSharedList(hash), [hash]);
  if (!list) return (
    <div className="page-stack">
      <h1>This shared list could not be opened</h1>
      <p>The link is incomplete or invalid. Ask the sender for a new link.</p>
      <Link className="text-link" to="/discover">Discover anime</Link>
    </div>
  );
  return (
    <div className="page-stack">
      <header className="page-heading">
        <h1>{list.name}</h1>
        <p>Shared recommendations · {list.titles.length} title{list.titles.length === 1 ? "" : "s"}. This is a snapshot of the list when it was shared.</p>
      </header>
      <p>Open a title to see its details and add it to your library.</p>
      <div className="anime-grid">
        {list.titles.map((title) => <AnimeCard key={title.id} anime={sharedTitleAnime(title)} quickAdd={false} />)}
      </div>
    </div>
  );
}
