import { CalendarClock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatNextAiring,
  getNextAiringAt
} from "../../domain/anime/airing";
import type { Anime } from "../../domain/anime/types";
import { useAnimePanel } from "../../hooks/useAnimePanel";

export function NextAiring({ items }: { items: Anime[] }) {
  const [now, setNow] = useState(() => new Date());
  const { openAnime } = useAnimePanel();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const upcoming = useMemo(
    () =>
      items
        .map((anime) => ({ anime, date: getNextAiringAt(anime, now) }))
        .filter(
          (
            item
          ): item is {
            anime: Anime;
            date: Date;
          } => Boolean(item.date)
        )
        .sort((left, right) => left.date.getTime() - right.date.getTime())
        .slice(0, 4),
    [items, now]
  );

  if (!upcoming.length) return null;

  return (
    <aside className="next-airing">
      <div className="section-header">
        <div>
          <h2>On deck</h2>
        </div>
        <CalendarClock size={22} />
      </div>
      <div className="airing-grid">
        {upcoming.map(({ anime }) => (
          <button
            className="airing-card"
            onClick={() => openAnime(anime)}
            key={anime.id}
          >
            <img src={anime.imageUrl} alt="" />
            <span>
              <strong>{anime.titleEnglish || anime.title}</strong>
              <small>{formatNextAiring(anime, now)}</small>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
