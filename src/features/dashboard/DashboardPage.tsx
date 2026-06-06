import { BookOpen, CheckCircle2, ListVideo, Star } from "lucide-react";
import { AnimeCard } from "../../components/AnimeCard";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { SectionHeader } from "../../components/SectionHeader";
import { useTracker } from "../../context/TrackerContext";
import { useCurrentSeason } from "../../hooks/useAnimeQueries";
import { ContinueWatching } from "./ContinueWatching";

export function DashboardPage() {
  const { stats } = useTracker();
  const season = useCurrentSeason();

  const statCards = [
    {
      label: "Watching",
      value: stats.watching,
      icon: ListVideo,
      tone: "coral"
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      tone: "mint"
    },
    {
      label: "Episodes",
      value: stats.episodesWatched,
      icon: BookOpen,
      tone: "blue"
    },
    {
      label: "Mean score",
      value: stats.averageScore?.toFixed(1) ?? "—",
      icon: Star,
      tone: "gold"
    }
  ];

  return (
    <div className="page-stack">
      <section className="hero">
        <div>
          <span className="eyebrow">Saturday, your watchlist awaits</span>
          <h1>Pick up where you left off.</h1>
          <p>
            Keep your season organized, one episode at a time.
          </p>
        </div>
        <div className="hero__stamp" aria-hidden="true">
          <span>今</span>
          <small>NOW</small>
        </div>
      </section>

      <section className="stats-grid" aria-label="Library summary">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
          <article className="stat-card" key={label}>
            <span className={`stat-card__icon stat-card__icon--${tone}`}>
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </section>

      <section>
        <SectionHeader
          eyebrow="Your queue"
          title="Continue watching"
          action={{ label: "Open library", to: "/library" }}
        />
        <ContinueWatching />
      </section>

      <section>
        <SectionHeader
          eyebrow="Fresh picks"
          title="This season"
          action={{ label: "Discover all", to: "/discover" }}
        />
        {season.isLoading && <LoadingState />}
        {season.isError && <ErrorState onRetry={() => season.refetch()} />}
        {season.data && (
          <div className="anime-grid">
            {season.data.items.slice(0, 6).map((anime) => (
              <AnimeCard anime={anime} key={anime.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
