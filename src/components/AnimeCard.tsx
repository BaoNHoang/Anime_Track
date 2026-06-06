import { Check, Plus, Star } from "lucide-react";
import type { Anime } from "../domain/anime/types";
import { useAnimePanel } from "../context/AnimePanelContext";
import { useTracker } from "../context/TrackerContext";

export function AnimeCard({ anime }: { anime: Anime }) {
  const { openAnime } = useAnimePanel();
  const { addAnime, getTracked } = useTracker();
  const tracked = getTracked(anime.id);

  return (
    <article className="anime-card">
      <button
        className="anime-card__poster-button"
        onClick={() => openAnime(anime)}
        aria-label={`View ${anime.title}`}
      >
        <img
          className="anime-card__poster"
          src={anime.imageUrl}
          alt=""
          loading="lazy"
        />
        <span className="anime-card__overlay">View details</span>
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
            {anime.episodes ? `${anime.episodes} eps` : anime.status}
          </span>
          <button
            className={`quick-add${tracked ? " is-added" : ""}`}
            onClick={() => addAnime(anime)}
            disabled={Boolean(tracked)}
            aria-label={
              tracked ? `${anime.title} is in your library` : `Add ${anime.title}`
            }
          >
            {tracked ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </article>
  );
}
