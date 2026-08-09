import { Check, Hash, Play, Star } from "lucide-react";
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
  const statCards = [
    {
      label: "Watching",
      value: stats.watching,
      icon: Play
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: Check
    },
    {
      label: "Episodes",
      value: stats.episodesWatched,
      icon: Hash
    },
    {
      label: "Mean score",
      value: stats.averageScore?.toFixed(1) ?? "-",
      icon: Star
    }
  ];

  return (
    <div className="dashboard-page">
      <header className="page-heading dashboard-heading">
        <div>
          <h1>Home</h1>
          <p>{today}</p>
        </div>
        <span className="broadcast-status">
          <span aria-hidden="true" /> Schedule updated every 15 minutes
        </span>
      </header>

      {showPersonalTracking && (
        <section className="watch-summary" aria-label="Library summary">
          {statCards.map(({ label, value, icon: Icon }) => (
            <article className="watch-summary__item" key={label}>
              <span className="watch-summary__icon" aria-hidden="true">
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="dashboard-section dashboard-section--schedule">
        <SectionHeader
          title="Airing next"
          action={{ label: "Browse airing", to: "/discover" }}
        />
        {airing.isLoading && <LoadingState />}
        {airing.isError && <ErrorState onRetry={() => airing.refetch()} />}
        {airing.data && <AiringSchedule items={airing.data.items} />}
      </section>

      {showPersonalTracking && (
        <section className="dashboard-section">
          <SectionHeader
            title="Continue watching"
            action={{ label: "Open library", to: "/library" }}
          />
          <ContinueWatching />
        </section>
      )}

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
