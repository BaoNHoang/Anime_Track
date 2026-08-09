import { ExternalLink, Minus, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
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

export function LibraryCard({
  item,
  onScoreEditStart
}: {
  item: TrackedAnime;
  onScoreEditStart?: () => void;
}) {
  const { openAnime } = useAnimePanel();
  const { updateAnime, removeAnime } = useTracker();
  const { provider, getWatchUrl } = useWatchProvider();
  const { user } = useCloudAuth();
  const scoreStep = user?.scoreStep ?? 0.5;
  const watchUrl = getWatchUrl(item.anime);
  const [scoreDraft, setScoreDraft] = useState<string>();
  const scoreValue = scoreDraft ?? item.userScore?.toString() ?? "";

  const saveScore = () => {
    const nextScore = scoreValue
      ? normalizeUserScore(Number(scoreValue), scoreStep)
      : undefined;
    setScoreDraft(undefined);
    if (nextScore === item.userScore) return;
    updateAnime(item.anime.id, { userScore: nextScore });
  };

  return (
    <article className={`library-card library-card--${item.status}`}>
      <div className="library-card__visual">
        <button
          className="library-card__poster"
          onClick={() => openAnime(item.anime)}
          aria-label={`Open ${item.anime.titleEnglish || item.anime.title}`}
        >
          {item.anime.imageUrl ? (
            <img src={item.anime.imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="poster-placeholder">No image</span>
          )}
        </button>
        <span
          className="library-card__status-dot"
          aria-label={STATUS_LABELS[item.status]}
          title={STATUS_LABELS[item.status]}
        />
        <div className="library-card__overlay">
          <strong>{item.anime.titleEnglish || item.anime.title}</strong>
          <span>
            {item.progress}
            {item.anime.episodes ? ` / ${item.anime.episodes}` : " episodes"}
            {item.userScore !== undefined ? `  |  ${item.userScore}/10` : ""}
          </span>
        </div>
        <button
          className="library-card__remove"
          onClick={() => removeAnime(item.anime.id)}
          aria-label={`Remove ${item.anime.title} from library`}
          title="Remove from library"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="library-card__content">
        <select
          className="library-card__status"
          value={item.status}
          onChange={(event) =>
            updateAnime(item.anime.id, {
              status: event.target.value as TrackingStatus
            })
          }
          aria-label={`Status for ${item.anime.title}`}
        >
          {TRACKING_STATUSES.map((status) => (
            <option value={status} key={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <div className="library-card__controls">
          <div className="stepper">
            <button
              onClick={() =>
                updateAnime(item.anime.id, {
                  progress: item.progress - 1
                })
              }
              aria-label="Decrease progress"
              title="Decrease episode"
            >
              <Minus size={14} />
            </button>
            <strong>{item.progress}</strong>
            <button
              onClick={() =>
                updateAnime(item.anime.id, {
                  progress: item.progress + 1
                })
              }
              aria-label="Increase progress"
              title="Increase episode"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="score-input">
            <Star size={13} />
            <input
              type="number"
              min={MIN_USER_SCORE}
              max={MAX_USER_SCORE}
              step={scoreStep}
              value={scoreValue}
              placeholder="-"
              inputMode="decimal"
              onFocus={() => {
                setScoreDraft(scoreValue);
                onScoreEditStart?.();
              }}
              onChange={(event) => setScoreDraft(event.target.value)}
              onBlur={saveScore}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") setScoreDraft(undefined);
              }}
              aria-label={`Score for ${item.anime.title}`}
            />
          </div>
          <a
            className="library-card__watch"
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Find ${item.anime.title} on ${provider.label}`}
            title={`Find on ${provider.label}`}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </article>
  );
}
