import { useEffect, useState } from "react";
import {
  formatAiringRelative,
  formatNextAiring,
  formatPremiereDate,
} from "../../domain/anime/airing";
import { selectNextAirings } from "../../domain/anime/nextAirings";
import type { Anime } from "../../domain/anime/types";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { ImageWithFallback } from "../../components/ImageWithFallback";

export function AiringSchedule({
  items
}: {
  items: Anime[];
}) {
  const [now, setNow] = useState(() => new Date());
  const { openAnime } = useAnimePanel();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60 * 1000);
    const refresh = () => setNow(new Date());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const upcoming = selectNextAirings(items, now);

  if (!upcoming.length) {
    return (
      <p className="schedule-empty">
        Broadcast times are still being announced.
      </p>
    );
  }

  return (
    <div className="airing-next-list">
      {upcoming.map(({ anime, date }) => (
        <button
          className="airing-next-item"
          type="button"
          onClick={() => openAnime(anime)}
          key={anime.id}
        >
          <span className="airing-next-item__poster">
            <ImageWithFallback src={anime.imageUrl} fallbackSrc={anime.largeImageUrl} loading="lazy" />
          </span>
          <span className="airing-next-item__copy">
            <strong>{anime.titleEnglish || anime.title}</strong>
            <span>{formatAiringRelative(anime, now)}</span>
            <time dateTime={date.toISOString()}>{formatNextAiring(anime, now)?.split(" - ")[0]}</time>
          </span>
        </button>
      ))}
    </div>
  );
}

export function UpcomingSchedule({ items }: { items: Anime[] }) {
  const { openAnime } = useAnimePanel();
  const [now] = useState(() => Date.now());
  const upcoming = items
    .filter((anime) => {
      const startTime = anime.startDate ? Date.parse(anime.startDate) : Number.NaN;
      return !anime.status.toLowerCase().includes("airing") &&
        (Number.isNaN(startTime) || startTime > now);
    })
    .slice(0, 8);

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
            <ImageWithFallback src={anime.imageUrl} fallbackSrc={anime.largeImageUrl} loading="lazy" />
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
