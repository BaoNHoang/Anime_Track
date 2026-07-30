import {
  ExternalLink,
  Play,
  Plus,
  Star,
  Trash2,
  X
} from "lucide-react";
import { useEffect } from "react";
import { formatNextAiring } from "../../domain/anime/airing";
import {
  STATUS_LABELS,
  TRACKING_STATUSES,
  type TrackingStatus
} from "../../domain/tracker/types";
import { useAnimeDetails } from "../../hooks/useAnimeQueries";
import { useAnimePanel } from "../../hooks/useAnimePanel";
import { useTracker } from "../../hooks/useTracker";
import { useWatchProvider } from "../../hooks/useWatchProvider";

export function AnimeDetailPanel() {
  const { selectedAnime, closeAnime } = useAnimePanel();
  const details = useAnimeDetails(selectedAnime?.id);
  const anime = details.data ?? selectedAnime;
  const { addAnime, getTracked, updateAnime, removeAnime } = useTracker();
  const { provider, getWatchUrl } = useWatchProvider();
  const tracked = anime ? getTracked(anime.id) : undefined;
  const nextAiring = anime ? formatNextAiring(anime) : undefined;
  const watchUrl = anime ? getWatchUrl(anime) : "";

  useEffect(() => {
    if (!selectedAnime) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAnime();
    };
    document.body.classList.add("panel-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("panel-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeAnime, selectedAnime]);

  if (!selectedAnime || !anime) return null;

  return (
    <div className="panel-layer" role="presentation">
      <button
        className="panel-backdrop"
        onClick={closeAnime}
        aria-label="Close anime details"
      />
      <aside
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <button
          className="detail-panel__close"
          onClick={closeAnime}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div className="detail-panel__hero">
          {anime.largeImageUrl ? (
            <img src={anime.largeImageUrl} alt="" />
          ) : (
            <span className="poster-placeholder">No image</span>
          )}
        </div>

        <div className="detail-panel__body">
          <header className="detail-panel__heading">
            <div className="detail-panel__tags">
              <span>{anime.type}</span>
              {anime.year && <span>{anime.year}</span>}
              {anime.score && (
                <span>
                  <Star size={12} fill="currentColor" />
                  {anime.score}
                </span>
              )}
            </div>
            <h2 id="detail-title">
              {anime.titleEnglish || anime.title}
            </h2>
            {anime.titleEnglish && anime.titleEnglish !== anime.title && (
              <p className="detail-panel__alt-title">{anime.title}</p>
            )}
          </header>
          <div className="detail-panel__facts">
            <div>
              <span>Episodes</span>
              <strong>{anime.episodes ?? "TBA"}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{anime.status}</strong>
            </div>
            <div>
              <span>Studio</span>
              <strong>{anime.studios[0] ?? "Unknown"}</strong>
            </div>
          </div>

          <div className="genre-row">
            {anime.genres.map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>

          {nextAiring && (
            <div className="airing-callout">
              <span className="detail-label">Next scheduled broadcast</span>
              <strong>{nextAiring}</strong>
              {anime.broadcast?.label && <small>{anime.broadcast.label}</small>}
            </div>
          )}

          <section>
            <h3>Synopsis</h3>
            <p className="synopsis">{anime.synopsis}</p>
          </section>

          {tracked ? (
            <section className="tracking-box">
              <div className="tracking-box__header">
                <div>
                  <strong>Update tracking</strong>
                </div>
                <button
                  className="danger-button"
                  onClick={() => removeAnime(anime.id)}
                  aria-label="Remove from library"
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <label className="field">
                <span>Status</span>
                <select
                  value={tracked.status}
                  onChange={(event) =>
                    updateAnime(anime.id, {
                      status: event.target.value as TrackingStatus
                    })
                  }
                >
                  {TRACKING_STATUSES.map((status) => (
                    <option value={status} key={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="tracking-box__progress-label">
                  <span>Episodes watched</span>
                  <strong>
                    {tracked.progress}
                    {anime.episodes ? ` / ${anime.episodes}` : ""}
                  </strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max={anime.episodes ?? Math.max(100, tracked.progress + 1)}
                  value={tracked.progress}
                  onChange={(event) =>
                    updateAnime(anime.id, {
                      progress: Number(event.target.value)
                    })
                  }
                />
              </label>
            </section>
          ) : (
            <button
              className="button button--full"
              onClick={() => addAnime(anime, "plan_to_watch")}
            >
              <Plus size={18} />
              Add to library
            </button>
          )}

          <div className="detail-panel__links">
            {watchUrl && (
              <a href={watchUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> Find on {provider.label}
              </a>
            )}
            {anime.trailerUrl && (
              <a href={anime.trailerUrl} target="_blank" rel="noreferrer">
                <Play size={16} /> Trailer
              </a>
            )}
            {anime.url && (
              <a href={anime.url} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> MyAnimeList
              </a>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
