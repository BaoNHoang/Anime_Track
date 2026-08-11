import { useEffect, useMemo, useState } from "react";
import {
  formatAiringRelative,
  formatNextAiring,
  formatPremiereDate,
  getNextAiringAt
} from "../../domain/anime/airing";
import type { Anime } from "../../domain/anime/types";
import { useAnimePanel } from "../../app/providers/useAnimePanel";

export function AiringSchedule({
  items,
  priorityByAnimeId,
  compact = false
}: {
  items: Anime[];
  priorityByAnimeId?: ReadonlyMap<number, { rank: number; label?: string }>;
  compact?: boolean;
}) {
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
        .sort((left, right) => {
          const priorityDifference =
            (priorityByAnimeId?.get(left.anime.id)?.rank ?? 3) -
            (priorityByAnimeId?.get(right.anime.id)?.rank ?? 3);
          return priorityDifference || left.date.getTime() - right.date.getTime();
        })
        .slice(0, compact ? 6 : 10),
    [compact, items, now, priorityByAnimeId]
  );

  if (!upcoming.length) {
    return (
      <p className="schedule-empty">
        Broadcast times are still being announced.
      </p>
    );
  }

  if (compact) {
    return (
      <div className="airing-list">
        {upcoming.map(({ anime }) => (
          <button
            className="airing-list__item"
            onClick={() => openAnime(anime)}
            key={anime.id}
          >
            <span className="airing-list__poster">
              {anime.imageUrl ? (
                <img src={anime.imageUrl} alt="" loading="lazy" />
              ) : (
                <span className="poster-placeholder">No image</span>
              )}
            </span>
            <span className="airing-list__content">
              <strong>{anime.titleEnglish || anime.title}</strong>
              <small>
                {priorityByAnimeId?.get(anime.id)?.label && (
                  <em>{priorityByAnimeId.get(anime.id)?.label}</em>
                )}
                {formatNextAiring(anime, now)?.split(" - ")[0]}
              </small>
            </span>
            <span className="airing-list__time">
              {formatAiringRelative(anime, now) ?? "TBA"}
            </span>
          </button>
        ))}
      </div>
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
