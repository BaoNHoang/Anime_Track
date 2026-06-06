import { Check, Minus, Plus } from "lucide-react";
import { useAnimePanel } from "../../context/AnimePanelContext";
import { useTracker } from "../../context/TrackerContext";
import type { TrackedAnime } from "../../domain/tracker/types";

function ContinueItem({ item }: { item: TrackedAnime }) {
  const { updateAnime } = useTracker();
  const { openAnime } = useAnimePanel();
  const total = item.anime.episodes;
  const progressPercent = total
    ? Math.min(100, (item.progress / total) * 100)
    : 0;

  return (
    <article className="continue-card">
      <button
        className="continue-card__image"
        onClick={() => openAnime(item.anime)}
      >
        <img src={item.anime.imageUrl} alt="" />
      </button>
      <div className="continue-card__content">
        <span className="eyebrow">Episode progress</span>
        <button
          className="continue-card__title"
          onClick={() => openAnime(item.anime)}
        >
          {item.anime.titleEnglish || item.anime.title}
        </button>
        <div className="progress-meta">
          <span>
            Episode {item.progress}
            {total ? ` of ${total}` : ""}
          </span>
          {total && <span>{Math.round(progressPercent)}%</span>}
        </div>
        <div className="progress-track">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="episode-controls">
          <button
            className="icon-button icon-button--small"
            onClick={() =>
              updateAnime(item.anime.id, { progress: item.progress - 1 })
            }
            aria-label="Decrease episode progress"
          >
            <Minus size={15} />
          </button>
          <button
            className="button button--compact"
            onClick={() =>
              updateAnime(item.anime.id, {
                progress: item.progress + 1,
                status:
                  total && item.progress + 1 >= total
                    ? "completed"
                    : "watching"
              })
            }
          >
            {total && item.progress >= total ? (
              <>
                <Check size={15} /> Complete
              </>
            ) : (
              <>
                <Plus size={15} /> Episode
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ContinueWatching() {
  const { items } = useTracker();
  const watching = items
    .filter((item) => item.status === "watching")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  if (!watching.length) {
    return (
      <div className="empty-inline">
        <div className="empty-inline__mark">01</div>
        <div>
          <strong>Your next episode starts here.</strong>
          <p>Add an anime and mark it as watching to track progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="continue-grid">
      {watching.map((item) => (
        <ContinueItem item={item} key={item.anime.id} />
      ))}
    </div>
  );
}
