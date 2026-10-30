import { ErrorState } from "../../components/ErrorState";
import { RouteSkeleton } from "../../components/LoadingState";
import { SectionHeader } from "../../components/SectionHeader";
import { useTracker } from "../../app/providers/useTracker";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { profileAvatar, profileAvatarSrc } from "../../domain/account/avatars";
import { profileBanner, profileBannerSrc } from "../../domain/account/banners";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { RecentActivity } from "./RecentActivity";
import { ProfileNewEpisodes } from "./ProfileNewEpisodes";
import { useLocalProfile } from "../../hooks/useLocalProfile";
import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FavoriteEditor } from "./FavoriteEditor";
import { ProfileSettings } from "./ProfileSettings";
import type { FavoriteKind } from "../../domain/account/favorites";
import type { TrackedAnime } from "../../domain/tracker/types";
import { LibrarySyncControl } from "../library/LibrarySyncControl";
import { displayUserScore } from "../../domain/tracker/score";

const GENRE_COLORS = [
  "var(--genre-1)",
  "var(--genre-2)",
  "var(--genre-3)",
  "var(--genre-4)",
  "var(--genre-5)"
];
const EMPTY_TRACKED_ITEMS: TrackedAnime[] = [];

export function ProfilePage() {
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get("edit");
  const { items, profileSummary, syncError, syncStatus } = useTracker();
  const { configured, initialized, user } = useCloudAuth();
  const { profile: localProfile } = useLocalProfile();
  const scoreScale = user?.scoreScale ?? localProfile.scoreScale;
  const showPersonalTracking = initialized && (!configured || Boolean(user));
  const displayProfile = user ?? (!configured ? localProfile : undefined);
  const stats = profileSummary?.stats ?? {
    total: 0,
    watching: 0,
    completed: 0,
    episodesWatched: 0,
    daysWatched: 0,
    averageScore: undefined
  };
  const completedCount = items.filter((item) => item.status === "completed").length;
  const plannedCount = items.filter((item) => item.status === "plan_to_watch").length;
  const completionPercent = stats.total
    ? Math.round((completedCount / stats.total) * 100)
    : 0;
  const statCards = [
    {
      label: "Total anime",
      value: stats.total,
      to: "/library"
    },
    {
      label: "Watching",
      value: stats.watching,
      to: "/library?status=watching"
    },
    {
      label: "Completed",
      value: completedCount,
      to: "/library?status=completed"
    },
    {
      label: "Plan to watch",
      value: plannedCount,
      to: "/library?status=plan_to_watch"
    }
  ];
  const favoriteGenres = profileSummary?.favoriteGenres ?? [];
  const favoriteGenreTotal = favoriteGenres.reduce(
    (total, item) => total + item.count,
    0
  );
  const trackedAiringItems = profileSummary?.airingItems ?? EMPTY_TRACKED_ITEMS;

  const favorites = displayProfile?.favorites;
  const favoriteGroups: Array<{ kind: FavoriteKind; label: string }> = [
    { kind: "anime", label: "Anime" },
    { kind: "characters", label: "Characters" },
    { kind: "studios", label: "Studios" },
    { kind: "directors", label: "Directors" }
  ];
  const populatedFavoriteGroups = favoriteGroups.filter(
    ({ kind }) => favorites?.[kind].length
  );

  if (editMode === "favorites") return <FavoriteEditor />;
  if (editMode === "profile") return <ProfileSettings />;

  if (showPersonalTracking && !profileSummary) {
    if (syncStatus === "error") {
      return (
        <ErrorState
          message={syncError ?? "Your profile data could not be loaded."}
          onRetry={() => window.location.reload()}
        />
      );
    }
    return <RouteSkeleton label="Loading your profile" />;
  }

  return (
    <div className="dashboard-page">
      <LibrarySyncControl />
      {showPersonalTracking && displayProfile ? (
        <header className="profile-hero">
          <ImageWithFallback
            className="profile-hero__banner"
            src={profileBannerSrc(displayProfile)}
            fallbackSrc={profileBanner(displayProfile.bannerId).src}
            fallback={<span className="small-image-fallback" aria-hidden="true" />}
          />
          <div className="profile-hero__shade" />
          <div className="profile-hero__identity">
            <ImageWithFallback src={profileAvatarSrc(displayProfile)} fallbackSrc={profileAvatar(displayProfile.avatarId).src} fallback={<span className="small-image-fallback" aria-hidden="true" />} />
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
            {statCards.map(({ label, value, to }) => (
              <Link className="watch-summary__item" key={label} to={to}>
                <strong>{value}</strong>
                <span>{label}</span>
              </Link>
            ))}
          </div>
          <div className="watch-summary__progress">
            <div>
              <strong>{completedCount} / {stats.total} completed</strong>
              <span>{completionPercent}%</span>
            </div>
            <div
              className="watch-summary__track"
              role="progressbar"
              aria-label="Library completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionPercent}
              aria-valuetext={`${completedCount} of ${stats.total} anime completed`}
            >
              <span style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="watch-summary__lifetime">
              {stats.episodesWatched} episodes watched · {stats.daysWatched.toFixed(1)} days · {stats.averageScore === undefined ? "—" : `${displayUserScore(stats.averageScore, scoreScale)}/${scoreScale}`} mean score
            </p>
            <Link className="watch-summary__review" to="/year-in-review">
              View year in review
            </Link>
          </div>
        </section>
      )}

      {showPersonalTracking && (
        <div className="dashboard-workspace">
          <section className="dashboard-section dashboard-activity">
            <SectionHeader
              title="Recently updated"
              action={{ label: "Open library", to: "/library" }}
            />
            <RecentActivity items={profileSummary?.recentItems} />
          </section>
          <ProfileNewEpisodes items={trackedAiringItems} />
        </div>
      )}

      {showPersonalTracking && favoriteGenres.length > 0 && (
        <section className="profile-overview profile-overview--genres">
          {favoriteGenres.length > 0 && (
            <div className="profile-genres">
              <h2>Genre overview</h2>
              <div className="profile-genres__legend">
                {favoriteGenres.map(({ genre, count }, index) => (
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
                {favoriteGenres.map(({ genre, count }, index) => (
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
          {populatedFavoriteGroups.length ? <div className="profile-favorites__groups">
            {populatedFavoriteGroups.map(({ kind, label }) => (
              <div key={kind}>
                <h3>{label}</h3>
                <div className="profile-favorites__items">
                  {favorites[kind].map((item, index) => (
                    <article key={item.id}>
                      <span>{index + 1}</span>
                      <ImageWithFallback src={item.imageUrl} loading="lazy" fallback={<div aria-hidden="true">{item.name.slice(0, 1)}</div>} />
                      <strong title={item.name}>{item.name}</strong>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div> : <p className="profile-favorites__empty">Add a favorite anime, character, studio, or director to make this space yours.</p>}
        </section>
      )}
    </div>
  );
}
