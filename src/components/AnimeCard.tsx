import { Check, Plus, Star } from "lucide-react";
import { formatAiringRelative } from "../domain/anime/airing";
import type { Anime } from "../domain/anime/types";
import { useAnimePanel } from "../app/providers/useAnimePanel";
import { useTracker } from "../app/providers/useTracker";

export function AnimeCard({ anime }: { anime: Anime }) {
  const { openAnime } = useAnimePanel();
  const { addAnime, canManage, getTracked } = useTracker();
  const tracked = getTracked(anime.id);
  const nextAiring = formatAiringRelative(anime);

  return (
    <article className="anime-card">
      <button
        className="anime-card__poster-button"
        onClick={() => openAnime(anime)}
        aria-label={`View ${anime.title}`}
      >
        {anime.imageUrl ? (
          <img
            className="anime-card__poster"
            src={anime.imageUrl}
            alt=""
            loading="lazy"
          />
        ) : (
          <span className="poster-placeholder">No image</span>
        )}
      </button>
      <div className="anime-card__body">
        <div className="anime-card__topline">
          <span>{anime.type}</span>
          {anime.score && (
            <span className="score">
              <Star size={13} fill="currentColor" />
              {anime.score.toFixed(1)}
            </span>
          )}
        </div>
        <button
          className="anime-card__title"
          onClick={() => openAnime(anime)}
        >
          {anime.titleEnglish || anime.title}
        </button>
        <div className="anime-card__footer">
          <span>
            {nextAiring
              ? `Next ${nextAiring}`
              : anime.episodes
                ? `${anime.episodes} eps`
                : anime.status}
          </span>
          <button
            className={`quick-add${tracked ? " is-added" : ""}`}
            onClick={() => addAnime(anime)}
            disabled={Boolean(tracked) || !canManage}
            aria-label={
              tracked
                ? `${anime.title} is in your library`
                : canManage
                  ? `Add ${anime.title}`
                  : "Sign in to add anime to your library"
            }
          >
            {tracked ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </article>
  );
}
