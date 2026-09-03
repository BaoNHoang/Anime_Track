import {
  Check,
  ExternalLink,
  Heart,
  Play,
  Plus,
  Star,
  Trash2,
  X
} from "../../components/OwnedIcons";
import { useEffect, useState } from "react";
import { formatNextAiring } from "../../domain/anime/airing";
import {
  RELEASE_NOTIFICATION_LABELS,
  RELEASE_NOTIFICATION_MODES,
  STATUS_LABELS,
  TRACKING_STATUSES,
  type ReleaseNotificationMode,
  type TrackingStatus
} from "../../domain/tracker/types";
import { useAnimeDetails } from "../../hooks/useAnimeQueries";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useTracker } from "../../app/providers/useTracker";
import { useWatchProvider } from "../../app/providers/useWatchProvider";
import { useAuthPrompt } from "../../app/providers/useAuthPrompt";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useLocalProfile } from "../../hooks/useLocalProfile";
import { MAX_FAVORITES_PER_KIND } from "../../domain/account/favorites";
import {
  MAX_USER_SCORE,
  MIN_USER_SCORE,
  normalizeUserScore
} from "../../domain/tracker/score";
import { watchedEpisodeNumbers } from "../../domain/tracker/episodes";

export function AnimeDetailPanel() {
  const { selectedAnime, closeAnime } = useAnimePanel();
  const details = useAnimeDetails(selectedAnime?.id);
  const anime = details.data ?? selectedAnime;
  const {
    addAnime,
    canManage,
    getTracked,
    updateAnime,
    removeAnime,
    setEpisodeWatched
  } = useTracker();
  const { requestSignIn } = useAuthPrompt();
  const { configured, user, updateFavorites } = useCloudAuth();
  const { profile: localProfile, updateProfile } = useLocalProfile();
  const { provider, getWatchUrl } = useWatchProvider();
  const tracked = anime ? getTracked(anime.id) : undefined;
  const scoreStep = user?.scoreStep ?? 0.5;
  const [scoreDraft, setScoreDraft] = useState<{
    animeId: number;
    value: string;
  }>();
  const [visibleEpisodes, setVisibleEpisodes] = useState<{
    animeId: number;
    count: number;
  }>();
  const scoreValue =
    scoreDraft && scoreDraft.animeId === anime?.id
      ? scoreDraft.value
      : tracked?.userScore?.toString() ?? "";
  const nextAiring = anime ? formatNextAiring(anime) : undefined;
  const watchUrl = anime ? getWatchUrl(anime) : "";
  const favorites = user?.favorites ?? localProfile.favorites;
  const isFavorite = anime
    ? favorites.anime.some((item) => item.id === anime.id)
    : false;
  const episodeCount = tracked
    ? anime?.episodes ?? Math.max(tracked.progress + 1, 1)
    : 0;
  const requestedEpisodeCount =
    visibleEpisodes && visibleEpisodes.animeId === anime?.id
      ? visibleEpisodes.count
      : 24;
  const shownEpisodeCount = Math.min(
    episodeCount,
    requestedEpisodeCount
  );
  const watchedEpisodes = tracked
    ? watchedEpisodeNumbers(tracked)
    : new Set<number>();
  const watchedDates = new Map(
    tracked?.episodeHistory?.map((entry) => [entry.episode, entry.watchedAt]) ?? []
  );

  const toggleFavorite = () => {
    if (!anime) return;
    if (!canManage) {
      closeAnime();
      requestSignIn(`Sign in to favorite ${anime.titleEnglish || anime.title}.`);
      return;
    }
    const nextAnime = isFavorite
      ? favorites.anime.filter((item) => item.id !== anime.id)
      : favorites.anime.length >= MAX_FAVORITES_PER_KIND
        ? favorites.anime
        : [...favorites.anime, {
            id: anime.id,
            name: anime.titleEnglish || anime.title,
            ...(anime.imageUrl ? { imageUrl: anime.imageUrl } : {})
          }];
    const next = { ...favorites, anime: nextAnime };
    if (!configured) updateProfile({ favorites: next });
    else void updateFavorites(next);
  };

  const saveScore = () => {
    if (!anime || !tracked) return;
    const nextScore = scoreValue
      ? normalizeUserScore(Number(scoreValue), scoreStep)
      : undefined;
    setScoreDraft(undefined);
    if (nextScore === tracked.userScore) return;
    updateAnime(anime.id, { userScore: nextScore });
  };

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
            <button
              className={`detail-panel__favorite${isFavorite ? " is-active" : ""}`}
              type="button"
              onClick={toggleFavorite}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
              {isFavorite ? "Favorited" : "Favorite"}
            </button>
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
                <span>Release notifications</span>
                <select
                  value={tracked.releaseNotificationMode ?? "every_episode"}
                  onChange={(event) =>
                    updateAnime(anime.id, {
                      releaseNotificationMode:
                        event.target.value as ReleaseNotificationMode
                    })
                  }
                >
                  {RELEASE_NOTIFICATION_MODES.map((mode) => (
                    <option value={mode} key={mode}>
                      {RELEASE_NOTIFICATION_LABELS[mode]}
                    </option>
                  ))}
                </select>
                {tracked.releaseNotificationMode === "dubbed_only" && (
                  <small className="field__hint">
                    Original broadcast alerts are paused. Dubbed alerts appear
                    when the catalog provides a dubbed release time.
                  </small>
                )}
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
              <div className="episode-checklist">
                <div className="episode-checklist__heading">
                  <div>
                    <strong>Episode checklist</strong>
                    <span>Add an optional watch date to any completed episode.</span>
                  </div>
                  <span>{watchedEpisodes.size} watched</span>
                </div>
                <div className="episode-checklist__list">
                  {Array.from({ length: shownEpisodeCount }, (_, index) => {
                    const episode = index + 1;
                    const watched = watchedEpisodes.has(episode);
                    return (
                      <div className="episode-checklist__row" key={episode}>
                        <label>
                          <input
                            type="checkbox"
                            checked={watched}
                            onChange={(event) =>
                              setEpisodeWatched(
                                anime.id,
                                episode,
                                event.target.checked,
                                watchedDates.get(episode)
                              )
                            }
                          />
                          <span className="episode-checklist__check">
                            {watched && <Check size={12} />}
                          </span>
                          <strong>Episode {episode}</strong>
                        </label>
                        <input
                          type="date"
                          value={watchedDates.get(episode) ?? ""}
                          disabled={!watched}
                          aria-label={`Watch date for episode ${episode}`}
                          onChange={(event) =>
                            setEpisodeWatched(
                              anime.id,
                              episode,
                              true,
                              event.target.value || undefined
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>
                {shownEpisodeCount < episodeCount && (
                  <button
                    type="button"
                    className="text-link episode-checklist__more"
                    onClick={() =>
                      setVisibleEpisodes({
                        animeId: anime.id,
                        count: Math.min(episodeCount, shownEpisodeCount + 24)
                      })
                    }
                  >
                    Show more episodes
                  </button>
                )}
              </div>
              <label className="field">
                <span>Your score</span>
                <input
                  type="number"
                  min={MIN_USER_SCORE}
                  max={MAX_USER_SCORE}
                  step={scoreStep}
                  value={scoreValue}
                  placeholder="Not scored"
                  inputMode="decimal"
                  onFocus={() =>
                    setScoreDraft({ animeId: anime.id, value: scoreValue })
                  }
                  onChange={(event) =>
                    setScoreDraft({
                      animeId: anime.id,
                      value: event.target.value
                    })
                  }
                  onBlur={saveScore}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") {
                      setScoreDraft(undefined);
                      event.currentTarget.blur();
                    }
                  }}
                />
              </label>
            </section>
          ) : (
            <button
              className="button button--full"
              onClick={() => {
                if (!canManage) {
                  closeAnime();
                  requestSignIn(
                    `Sign in to add ${anime.titleEnglish || anime.title} to your library.`
                  );
                  return;
                }
                addAnime(anime, "plan_to_watch");
              }}
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
