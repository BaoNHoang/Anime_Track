import { ErrorState } from "../../components/ErrorState";
import { CompactListSkeleton } from "../../components/LoadingState";
import { SectionHeader } from "../../components/SectionHeader";
import { useTopAnime } from "../../hooks/useAnimeQueries";
import { useTracker } from "../../app/providers/useTracker";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { profileAvatarSrc } from "../../domain/account/avatars";
import { profileBannerSrc } from "../../domain/account/banners";
import { RecentActivity } from "./RecentActivity";
import { AiringSchedule } from "./NextAiring";
import { useLocalProfile } from "../../hooks/useLocalProfile";
import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FavoriteEditor } from "./FavoriteEditor";
import { ProfileSettings } from "./ProfileSettings";
import type { FavoriteKind } from "../../domain/account/favorites";

const GENRE_COLORS = [
  "var(--genre-1)",
  "var(--genre-2)",
  "var(--genre-3)",
  "var(--genre-4)",
  "var(--genre-5)"
];

export function ProfilePage() {
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get("edit");
  const { items, stats } = useTracker();
  const { configured, initialized, user } = useCloudAuth();
  const { profile: localProfile } = useLocalProfile();
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

  if (editMode === "favorites") return <FavoriteEditor />;
  if (editMode === "profile") return <ProfileSettings />;

  const favorites = displayProfile?.favorites;
  const favoriteGroups: Array<{ kind: FavoriteKind; label: string }> = [
    { kind: "studios", label: "Studios" },
    { kind: "directors", label: "Directors" },
    { kind: "characters", label: "Characters" }
  ];

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
              <h1>{displayProfile.username}</h1>
            </div>
          </div>
          <Link className="profile-hero__edit" to="/profile?edit=profile">Edit profile</Link>
        </header>
      ) : (
        <h1 className="visually-hidden">Profile</h1>
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
          {airing.isLoading && (
            <CompactListSkeleton items={6} variant="airing" label="Loading airing schedule" />
          )}
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

      {showPersonalTracking && favoriteGenres.length > 0 && (
        <section className="profile-overview profile-overview--genres">
          {favoriteGenres.length > 0 && (
            <div className="profile-genres">
              <h2>Genre overview</h2>
              <div className="profile-genres__legend">
                {favoriteGenres.map(([genre, count], index) => (
                  <div key={genre}>
                    <span
                      style={{ "--genre-color": GENRE_COLORS[index] } as CSSProperties}
                    >
                      {genre}
                    </span>
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
        </section>
      )}

      {showPersonalTracking && favorites && (
        <section className="profile-favorites">
          <div className="section-header">
            <div><h2>Favorites</h2></div>
            <Link to="/profile?edit=favorites">Edit favorites</Link>
          </div>
          {favorites.anime.length > 0 ? (
            <div className="profile-favorites__anime">
              {favorites.anime.map((item, index) => (
                <article key={item.id}>
                  <span>{index + 1}</span>
                  {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <div>{item.name.slice(0, 1)}</div>}
                  <strong>{item.name}</strong>
                </article>
              ))}
            </div>
          ) : (
            <p className="profile-favorites__empty">No favorite anime selected yet.</p>
          )}
          <div className="profile-favorites__groups">
            {favoriteGroups.map(({ kind, label }) => (
              <div key={kind}>
                <h3>{label}</h3>
                {favorites[kind].length > 0 ? (
                  <ol>{favorites[kind].map((item) => <li key={item.id}>{item.name}</li>)}</ol>
                ) : <p>None selected</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
