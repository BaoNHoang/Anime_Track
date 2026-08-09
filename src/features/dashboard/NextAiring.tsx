import { useEffect, useMemo, useState } from "react";
import {
  formatAiringRelative,
  formatNextAiring,
  formatPremiereDate,
  getNextAiringAt
} from "../../domain/anime/airing";
import type { Anime } from "../../domain/anime/types";
import { useAnimePanel } from "../../app/providers/useAnimePanel";

export function AiringSchedule({ items }: { items: Anime[] }) {
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
        .slice(0, 10),
    [items, now]
  );

  if (!upcoming.length) {
    return (
      <p className="schedule-empty">
        Broadcast times are still being announced.
      </p>
    );
  }

  return (
    <div className="schedule-grid schedule-grid--airing">
      {upcoming.map(({ anime }) => (
        <button
          className="schedule-card schedule-card--airing"
          onClick={() => openAnime(anime)}
          key={anime.id}
        >
          <span className="schedule-card__poster">
            {anime.imageUrl ? (
              <img src={anime.imageUrl} alt="" loading="lazy" />
            ) : (
              <span className="poster-placeholder">No image</span>
            )}
            <span className="schedule-card__timing">
              <strong>{formatAiringRelative(anime, now) ?? "Time TBA"}</strong>
              <small>{formatNextAiring(anime, now)?.split(" - ")[0]}</small>
            </span>
          </span>
          <span className="schedule-card__title">
            {anime.titleEnglish || anime.title}
          </span>
        </button>
      ))}
    </div>
  );
}

export function UpcomingSchedule({ items }: { items: Anime[] }) {
  const { openAnime } = useAnimePanel();
  const upcoming = items.slice(0, 8);

  if (!upcoming.length) {
    return (
      <p className="schedule-empty">No upcoming premieres are available.</p>
    );
  }

  return (
    <div className="schedule-grid schedule-grid--upcoming">
      {upcoming.map((anime) => (
        <button
          className="schedule-card schedule-card--upcoming"
          onClick={() => openAnime(anime)}
          key={anime.id}
        >
          <span className="schedule-card__poster">
            {anime.imageUrl ? (
              <img src={anime.imageUrl} alt="" loading="lazy" />
            ) : (
              <span className="poster-placeholder">No image</span>
            )}
            <span className="schedule-card__timing">
              <strong>{formatPremiereDate(anime)}</strong>
              <small>{anime.type}</small>
            </span>
          </span>
          <span className="schedule-card__title">
            {anime.titleEnglish || anime.title}
          </span>
        </button>
      ))}
    </div>
  );
}
