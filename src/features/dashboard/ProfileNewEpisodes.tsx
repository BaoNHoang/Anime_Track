import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useNotifications } from "../../app/providers/useNotifications";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { SectionHeader } from "../../components/SectionHeader";
import { currentSeasonEpisodes } from "../../domain/tracker/currentSeasonEpisodes";
import type { TrackedAnime } from "../../domain/tracker/types";

const releaseTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
});

export function ProfileNewEpisodes({ items }: { items: TrackedAnime[] }) {
  const { notifications } = useNotifications();
  const { openAnime } = useAnimePanel();
  const episodes = currentSeasonEpisodes(notifications, items);
  const animeById = new Map(items.map((item) => [item.anime.id, item.anime]));

  return (
    <section className="dashboard-section dashboard-new-episodes">
      <SectionHeader
        title="New episodes"
        action={{ label: "All alerts", to: "/notifications" }}
      />
      {episodes.length ? (
        <div className="profile-release-list">
          {episodes.map((episode) => {
            const anime = animeById.get(episode.animeId)!;
            return (
              <button
                className="profile-release"
                type="button"
                key={episode.id}
                onClick={() => openAnime(anime)}
              >
                <span className="profile-release__poster">
                  <ImageWithFallback src={anime.imageUrl} fallbackSrc={anime.largeImageUrl} loading="lazy" fallback={<span className="small-image-fallback" aria-hidden="true" />} />
                </span>
                <span className="profile-release__copy">
                  <strong>{anime.titleEnglish || anime.title}</strong>
                  <span>{episode.episodeNumber ? `Episode ${episode.episodeNumber} aired` : "A scheduled episode aired"}</span>
                  <time dateTime={episode.releasedAt}>{releaseTimeFormatter.format(new Date(episode.releasedAt))}</time>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="schedule-empty">No new episodes for your current-season shows.</p>
      )}
    </section>
  );
}
