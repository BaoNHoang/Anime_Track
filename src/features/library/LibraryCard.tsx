import { useAnimePanel } from "../../app/providers/useAnimePanel";
import {
  STATUS_LABELS,
  type TrackedAnime
} from "../../domain/tracker/types";

export function LibraryCard({
  item,
  onEditStart
}: {
  item: TrackedAnime;
  onEditStart?: () => void;
}) {
  const { openAnime } = useAnimePanel();

  return (
    <article className={`library-card library-card--${item.status}`}>
      <button
        className="library-card__poster"
        onClick={() => {
          onEditStart?.();
          openAnime(item.anime);
        }}
        aria-label={`Open and edit ${item.anime.titleEnglish || item.anime.title}`}
      >
        <span className="library-card__visual">
          {item.anime.imageUrl ? (
            <img src={item.anime.imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="poster-placeholder">No image</span>
          )}
          <span
            className="library-card__status-dot"
            aria-label={STATUS_LABELS[item.status]}
            title={STATUS_LABELS[item.status]}
          />
          <span className="library-card__overlay">
            <strong>{item.anime.titleEnglish || item.anime.title}</strong>
            <span>
              {item.progress}
              {item.anime.episodes ? ` / ${item.anime.episodes}` : " episodes"}
              {item.userScore !== undefined ? `  |  ${item.userScore}/10` : ""}
            </span>
          </span>
        </span>
      </button>
    </article>
  );
}
