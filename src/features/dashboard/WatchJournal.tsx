import { useMemo } from "react";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useTracker } from "../../app/providers/useTracker";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { createWatchJournal } from "../../domain/tracker/watchJournal";

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC"
});

export function WatchJournal() {
  const { items } = useTracker();
  const { openAnime } = useAnimePanel();
  const events = useMemo(() => createWatchJournal(items), [items]);

  if (!events.length) {
    return <div className="empty-inline"><div>
      <strong>No dated watches yet.</strong>
      <p>Give an episode a watch date to start your journal. Older, undated progress is still in your library.</p>
    </div></div>;
  }

  return <ol className="watch-journal">
    {events.map((event) => <li key={event.key}>
      <button className="watch-journal__entry" type="button" onClick={() => openAnime(event.anime)}>
        <span className="watch-journal__poster">
          <ImageWithFallback src={event.anime.imageUrl} fallbackSrc={event.anime.largeImageUrl} loading="lazy" fallback={<span className="small-image-fallback" aria-hidden="true" />} />
        </span>
        <span className="watch-journal__details">
          <strong>{event.anime.titleEnglish || event.anime.title}</strong>
          <span>{event.kind === "completion" ? "Completed watch" : `Watched episode ${event.episode}`}{event.rewatch > 0 ? ` · Rewatch ${event.rewatch}` : ""}</span>
        </span>
        <time dateTime={event.at}>{dayFormatter.format(new Date(`${event.day}T12:00:00Z`))}</time>
      </button>
    </li>)}
  </ol>;
}
