import { ExternalLink, Minus, Plus, Star, Trash2 } from "lucide-react";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useTracker } from "../../app/providers/useTracker";
import { useWatchProvider } from "../../app/providers/useWatchProvider";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import {
  STATUS_LABELS,
  TRACKING_STATUSES,
  type TrackedAnime,
  type TrackingStatus
} from "../../domain/tracker/types";
import {
  MAX_USER_SCORE,
  MIN_USER_SCORE,
  normalizeUserScore
} from "../../domain/tracker/score";

export function LibraryCard({ item }: { item: TrackedAnime }) {
  const { openAnime } = useAnimePanel();
  const { updateAnime, removeAnime } = useTracker();
  const { provider, getWatchUrl } = useWatchProvider();
  const { user } = useCloudAuth();
  const scoreStep = user?.scoreStep ?? 0.5;
  const watchUrl = getWatchUrl(item.anime);

  return (
    <article className="library-card">
      <button
        className="library-card__poster"
        onClick={() => openAnime(item.anime)}
      >
        {item.anime.imageUrl ? (
          <img src={item.anime.imageUrl} alt="" />
        ) : (
          <span className="poster-placeholder">No image</span>
        )}
      </button>
      <div className="library-card__content">
        <div>
          <span className="library-card__meta">
            {item.anime.type} / {item.anime.year ?? "Year unknown"}
          </span>
          <button
            className="library-card__title"
            onClick={() => openAnime(item.anime)}
          >
            {item.anime.titleEnglish || item.anime.title}
          </button>
        </div>

        <label className="field">
          <span>Status</span>
          <select
            value={item.status}
            onChange={(event) =>
              updateAnime(item.anime.id, {
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

        <div className="library-card__metrics">
          <div>
            <span>Progress</span>
            <div className="stepper">
              <button
                onClick={() =>
                  updateAnime(item.anime.id, {
                    progress: item.progress - 1
                  })
                }
                aria-label="Decrease progress"
              >
                <Minus size={14} />
              </button>
              <strong>
                {item.progress}
                {item.anime.episodes ? ` / ${item.anime.episodes}` : ""}
              </strong>
              <button
                onClick={() =>
                  updateAnime(item.anime.id, {
                    progress: item.progress + 1
                  })
                }
                aria-label="Increase progress"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <label>
            <span>Your score</span>
            <div className="score-input">
              <Star size={14} />
              <input
                type="number"
                min={MIN_USER_SCORE}
                max={MAX_USER_SCORE}
                step={scoreStep}
                value={item.userScore ?? ""}
                placeholder="-"
                onChange={(event) =>
                  updateAnime(item.anime.id, {
                    userScore: event.target.value
                      ? normalizeUserScore(
                          event.target.valueAsNumber,
                          scoreStep
                        )
                      : undefined
                  })
                }
                aria-label="Your score"
              />
            </div>
          </label>
        </div>
        <a
          className="library-card__watch"
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={13} />
          Find on {provider.label}
        </a>
      </div>
      <button
        className="library-card__remove"
        onClick={() => removeAnime(item.anime.id)}
        aria-label={`Remove ${item.anime.title} from library`}
      >
        <Trash2 size={17} />
      </button>
    </article>
  );
}
