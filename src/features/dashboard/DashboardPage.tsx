import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { SectionHeader } from "../../components/SectionHeader";
import { useTopAnime } from "../../hooks/useAnimeQueries";
import { useTracker } from "../../app/providers/useTracker";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { ContinueWatching } from "./ContinueWatching";
import { AiringSchedule, UpcomingSchedule } from "./NextAiring";

export function DashboardPage() {
  const { stats } = useTracker();
  const { initialized, user } = useCloudAuth();
  const airing = useTopAnime("airing");
  const upcoming = useTopAnime("upcoming");
  const showPersonalTracking = initialized && Boolean(user);
  const today = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date());
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

  return (
    <div className="dashboard-page">
      <header className="page-heading dashboard-heading">
        <div>
          <h1>Home</h1>
          <p>{today}</p>
        </div>
        <span className="broadcast-status" aria-label="Live schedule">
          <span aria-hidden="true" />
        </span>
      </header>

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
            <ContinueWatching />
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
            <AiringSchedule items={airing.data.items} compact />
          )}
        </section>
      </div>

      <section className="dashboard-section dashboard-section--schedule">
        <SectionHeader
          title="Coming soon"
          action={{ label: "Browse upcoming", to: "/discover" }}
        />
        {upcoming.isLoading && <LoadingState />}
        {upcoming.isError && (
          <ErrorState onRetry={() => upcoming.refetch()} />
        )}
        {upcoming.data && <UpcomingSchedule items={upcoming.data.items} />}
      </section>
    </div>
  );
}
