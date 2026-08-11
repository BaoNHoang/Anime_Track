import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { SectionHeader } from "../../components/SectionHeader";
import { useTopAnime } from "../../hooks/useAnimeQueries";
import { useTracker } from "../../app/providers/useTracker";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { profileAvatarSrc } from "../../domain/account/avatars";
import { profileBannerSrc } from "../../domain/account/banners";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { RecentActivity } from "./RecentActivity";
import { AiringSchedule } from "./NextAiring";
import { useLocalProfile } from "../../hooks/useLocalProfile";

const GENRE_COLORS = ["#62d83f", "#18acef", "#8e4de8", "#f06a9b", "#e85770"];

export function DashboardPage() {
  const { items, stats } = useTracker();
  const { configured, initialized, user } = useCloudAuth();
  const { profile: localProfile } = useLocalProfile();
  const { openAnime } = useAnimePanel();
  const airing = useTopAnime("airing");
  const showPersonalTracking = initialized && (!configured || Boolean(user));
  const displayProfile = user ?? (!configured ? localProfile : undefined);
  const completionPercent = stats.total
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;
  const statCards = [
    {
      label: "Total anime",
      value: stats.total
    },
    {
      label: "Days watched",
      value: stats.daysWatched.toFixed(1)
    },
    {
      label: "Episodes",
      value: stats.episodesWatched
    },
    {
      label: "Mean score",
      value: stats.averageScore?.toFixed(1) ?? "-"
    }
  ];
  const recentItems = [...items]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const genreCounts = items
    .flatMap((item) => item.anime.genres)
    .reduce<Map<string, number>>((counts, genre) => {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
      return counts;
    }, new Map());
  const favoriteGenres = [...genreCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5);
  const favoriteGenreTotal = favoriteGenres.reduce(
    (total, [, count]) => total + count,
    0
  );
  const airingPriority = new Map(
    items.map((item) => [
      item.anime.id,
      {
        rank: item.status === "watching" ? 0 : item.status === "plan_to_watch" ? 1 : 2,
        label: item.status === "watching" ? "Watching" : item.status === "plan_to_watch" ? "Planning" : undefined
      }
    ])
  );
  const prioritizedAiringItems = airing.data
    ? [
        ...items
          .filter(
            (item) =>
              (item.status === "watching" || item.status === "plan_to_watch") &&
              item.anime.status.toLowerCase().includes("currently airing")
          )
          .map((item) => item.anime),
        ...airing.data.items
      ].filter(
        (anime, index, merged) =>
          merged.findIndex((candidate) => candidate.id === anime.id) === index
      )
    : [];

  return (
    <div className="dashboard-page">
      {showPersonalTracking && displayProfile ? (
        <header className="profile-hero">
          <img
            className="profile-hero__banner"
            src={profileBannerSrc(displayProfile)}
            alt=""
          />
          <div className="profile-hero__shade" />
          <div className="profile-hero__identity">
            <img src={profileAvatarSrc(displayProfile)} alt="" />
            <div>
              <span>Your Banime profile</span>
              <h1>{displayProfile.username}</h1>
              <p>{stats.watching} watching, {stats.completed} completed</p>
            </div>
          </div>
        </header>
      ) : (
        <header className="page-heading"><h1>Home</h1></header>
      )}

      {showPersonalTracking && (
        <section className="watch-summary" aria-label="Library summary">
          <div className="watch-summary__stats">
            {statCards.map(({ label, value }) => (
              <div className="watch-summary__item" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="watch-summary__progress">
            <div>
              <span>{stats.completed} completed</span>
              <span>{stats.watching} watching</span>
            </div>
            <div
              className="watch-summary__track"
              role="progressbar"
              aria-label="Library completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionPercent}
            >
              <span style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
        </section>
      )}

      <div
        className={`dashboard-workspace${
          showPersonalTracking ? "" : " dashboard-workspace--public"
        }`}
      >
        {showPersonalTracking && (
          <section className="dashboard-section dashboard-activity">
            <SectionHeader
              title="My activity"
              action={{ label: "Open library", to: "/library" }}
            />
            <RecentActivity />
          </section>
        )}
        <section className="dashboard-section dashboard-airing">
          <SectionHeader
            title="Airing next"
            action={{ label: "Browse", to: "/discover" }}
          />
          {airing.isLoading && <LoadingState />}
          {airing.isError && <ErrorState onRetry={() => airing.refetch()} />}
          {airing.data && (
            <AiringSchedule
              items={prioritizedAiringItems}
              priorityByAnimeId={airingPriority}
              compact
            />
          )}
        </section>
      </div>

      {showPersonalTracking && (favoriteGenres.length > 0 || recentItems.length > 0) && (
        <section className="profile-overview">
          {favoriteGenres.length > 0 && (
            <div className="profile-genres">
              <h2>Genre overview</h2>
              <div className="profile-genres__legend">
                {favoriteGenres.map(([genre, count], index) => (
                  <div key={genre}>
                    <span style={{ backgroundColor: GENRE_COLORS[index] }}>{genre}</span>
                    <strong>{count} <small>anime</small></strong>
                  </div>
                ))}
              </div>
              <div className="profile-genres__bar" aria-label="Favorite genre distribution">
                {favoriteGenres.map(([genre, count], index) => (
                  <span
                    key={genre}
                    title={`${genre}: ${count}`}
                    style={{
                      width: `${(count / favoriteGenreTotal) * 100}%`,
                      backgroundColor: GENRE_COLORS[index]
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {recentItems.length > 0 && (
            <div className="profile-library">
              <h2>Anime</h2>
              <div>
                {recentItems.slice(0, 8).map((item) => (
                  <button
                    key={item.anime.id}
                    onClick={() => openAnime(item.anime)}
                    title={item.anime.titleEnglish || item.anime.title}
                    aria-label={`Open ${item.anime.titleEnglish || item.anime.title}`}
                  >
                    <img src={item.anime.imageUrl} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
