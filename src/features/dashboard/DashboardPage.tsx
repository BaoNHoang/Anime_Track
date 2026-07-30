import { Check, Hash, Play, Star } from "lucide-react";
import { AnimeCard } from "../../components/AnimeCard";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { SectionHeader } from "../../components/SectionHeader";
import { useCurrentSeason } from "../../hooks/useAnimeQueries";
import { useTracker } from "../../hooks/useTracker";
import { ContinueWatching } from "./ContinueWatching";
import { NextAiring } from "./NextAiring";

export function DashboardPage() {
  const { stats } = useTracker();
  const season = useCurrentSeason();
  const featureAnime = season.data?.items[0];
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
      <section className="dashboard-masthead">
        {(featureAnime?.bannerImageUrl ||
          featureAnime?.largeImageUrl ||
          featureAnime?.imageUrl) && (
          <img
            className="dashboard-masthead__image"
            src={
              featureAnime.bannerImageUrl ||
              featureAnime.largeImageUrl ||
              featureAnime.imageUrl
            }
            alt=""
          />
        )}
        <div className="dashboard-masthead__content">
          <p className="dashboard-masthead__label">Your watch desk</p>
          <h1>
            {featureAnime?.titleEnglish ||
              featureAnime?.title ||
              "Keep the next episode in sight."}
          </h1>
          <p>
            {featureAnime?.synopsis ||
              "Pick up where you left off, then find something worth adding."}
          </p>
        </div>
      </section>

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

      <div className="dashboard-columns">
        <div className="dashboard-columns__main">
          <section>
            <SectionHeader
              title="Continue watching"
              action={{ label: "Open library", to: "/library" }}
            />
            <ContinueWatching />
          </section>

          <section>
            <SectionHeader
              title="Current season"
              action={{ label: "Discover all", to: "/discover" }}
            />
            {season.isLoading && <LoadingState />}
            {season.isError && <ErrorState onRetry={() => season.refetch()} />}
            {season.data && (
              <div className="anime-grid">
                {season.data.items.slice(0, 8).map((anime) => (
                  <AnimeCard anime={anime} key={anime.id} />
                ))}
              </div>
            )}
          </section>
        </div>
        {season.data && <NextAiring items={season.data.items} />}
      </div>
    </div>
  );
}
