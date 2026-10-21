import { ChevronRight, Star } from "../../components/OwnedIcons";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import { SectionHeader } from "../../components/SectionHeader";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import {
  useAnimeBrowse,
  useCurrentSeason,
  useTopAnime
} from "../../hooks/useAnimeQueries";
import type { Anime } from "../../domain/anime/types";
import type { AnimePage } from "../../domain/anime/types";
import { ContinueWatching } from "./ContinueWatching";
import { Recommendations } from "./Recommendations";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "../../components/ImageWithFallback";

function SeasonTile({ anime }: { anime: Anime }) {
  const { openAnime } = useAnimePanel();
  const title = anime.titleEnglish || anime.title;

  return (
    <article className="home-season-tile">
      <button type="button" onClick={() => openAnime(anime)}>
        <ImageWithFallback src={anime.imageUrl} fallbackSrc={anime.largeImageUrl} loading="lazy" />
      </button>
      <div>
        <button type="button" onClick={() => openAnime(anime)} title={title}>
          {title}
        </button>
        <span>
          {anime.type || "Anime"}
          {anime.score ? <><Star size={11} fill="currentColor" /> {anime.score.toFixed(1)}</> : null}
        </span>
      </div>
    </article>
  );
}

function HomeShelf({
  title,
  result,
  limit = 5
}: {
  title: string;
  result: {
    data?: AnimePage;
    isLoading: boolean;
    isError: boolean;
    refetch: () => unknown;
  };
  limit?: number;
}) {
  return (
    <section className="home-section home-section--shelf">
      <SectionHeader title={title} action={{ label: "Browse", to: "/discover" }} />
      {result.isLoading && <LoadingState cards={limit} layout="season" label={`Loading ${title}`} />}
      {result.isError && <ErrorState onRetry={() => void result.refetch()} />}
      {result.data && (
        <div className="home-season-grid">
          {result.data.items.slice(0, limit).map((anime) => (
            <SeasonTile anime={anime} key={anime.id} />
          ))}
        </div>
      )}
    </section>
  );
}

export function DashboardPage() {
  const season = useCurrentSeason();
  const airing = useTopAnime("airing");
  const upcoming = useAnimeBrowse("upcoming");
  const recommendationCandidates = useMemo(
    () => [
      ...(season.data?.items ?? []),
      ...(airing.data?.items ?? []),
      ...(upcoming.data?.items ?? [])
    ],
    [airing.data?.items, season.data?.items, upcoming.data?.items]
  );

  return (
    <div className="home-page">
      <h1 className="visually-hidden">Home</h1>

      <ContinueWatching />

      <Recommendations candidates={recommendationCandidates} />

      <section className="home-section">
        <SectionHeader
          title="Current season"
          action={{ label: "Browse season", to: "/discover" }}
        />
        {season.isPending && <LoadingState cards={10} layout="season" label="Loading current season" />}
        {season.isError && <ErrorState onRetry={() => season.refetch()} />}
        {season.data && (
          <div className="home-season-grid">
            {season.data.items.slice(0, 10).map((anime) => (
              <SeasonTile anime={anime} key={anime.id} />
            ))}
          </div>
        )}
      </section>

      <HomeShelf title="Coming soon" result={upcoming} />

      <Link className="home-classics-link" to="/discover?feed=classics">
        <span>
          <strong>Explore classics</strong>
          <small>Find something from an earlier era.</small>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
