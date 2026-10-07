import { Check, Play } from "../../components/OwnedIcons";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useTracker } from "../../app/providers/useTracker";
import { nextEpisodeNumber } from "../../domain/tracker/episodes";
import { ImageWithFallback } from "../../components/ImageWithFallback";

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function ContinueWatching() {
  const { items, setEpisodeWatched } = useTracker();
  const { openAnime } = useAnimePanel();
  const queue = items
    .filter((item) => item.status === "watching")
    .map((item) => ({ item, nextEpisode: nextEpisodeNumber(item) }))
    .filter((entry): entry is typeof entry & { nextEpisode: number } =>
      entry.nextEpisode !== undefined
    )
    .sort((left, right) => right.item.updatedAt.localeCompare(left.item.updatedAt))
    .slice(0, 4);

  if (!queue.length) return null;

  return (
    <section className="continue-watching" aria-labelledby="continue-watching-title">
      <header className="continue-watching__header">
        <div>
          <span>Up next</span>
          <h2 id="continue-watching-title">Continue watching</h2>
        </div>
        <p>Your most recently updated shows.</p>
      </header>
      <div className="continue-watching__grid">
        {queue.map(({ item, nextEpisode }) => (
          <article className="continue-card" key={item.anime.id}>
            <button
              className="continue-card__poster"
              type="button"
              onClick={() => openAnime(item.anime)}
              aria-label={`Open ${item.anime.titleEnglish || item.anime.title}`}
            >
              <ImageWithFallback src={item.anime.imageUrl} fallbackSrc={item.anime.largeImageUrl} fallback={<span className="small-image-fallback" aria-hidden="true" />} />
              <Play size={18} />
            </button>
            <div className="continue-card__copy">
              <button type="button" onClick={() => openAnime(item.anime)}>
                <strong>{item.anime.titleEnglish || item.anime.title}</strong>
                <span>{item.previousWatches?.length ? `Rewatch ${item.previousWatches.length} · ` : ""}Episode {nextEpisode}</span>
              </button>
              <button
                className="continue-card__done"
                type="button"
                onClick={() =>
                  setEpisodeWatched(item.anime.id, nextEpisode, true, today())
                }
              >
                <Check size={14} /> Watched
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
