import { Shuffle, Star } from "../../components/OwnedIcons";
import { ErrorState } from "../../components/ErrorState";
import { CompactListSkeleton, LoadingState } from "../../components/LoadingState";
import { SectionHeader } from "../../components/SectionHeader";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import {
  useAnimeBrowse,
  useCurrentSeason,
  useTopDecadeAnime,
  useTopAnime
} from "../../hooks/useAnimeQueries";
import { ANIME_DECADES, type AnimeDecade } from "../../services/tenrai/animeService";
import { sampleTopAnime } from "../../domain/anime/sampleTopAnime";
import type { Anime, AnimePage } from "../../domain/anime/types";
import { AiringSchedule } from "./AiringSchedule";
import { Recommendations } from "./Recommendations";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImageWithFallback } from "../../components/ImageWithFallback";

function hasBroadcastTime(anime: Anime) {
  return Boolean(anime.broadcast?.day && anime.broadcast.time && anime.broadcast.timezone);
}

function SeasonTile({ anime, priority = false }: { anime: Anime; priority?: boolean }) {
  const { openAnime } = useAnimePanel();
  const title = anime.titleEnglish || anime.title;

  return (
    <article className="home-season-tile">
      <button type="button" onClick={() => openAnime(anime)} aria-label={`View ${title}`}>
        <ImageWithFallback
          src={anime.imageUrl}
          fallbackSrc={anime.largeImageUrl}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
        />
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
  limit = 5,
  priorityPosters = 0
}: {
  title: string;
  result: {
    data?: AnimePage;
    isPending: boolean;
    isError: boolean;
    refetch: () => unknown;
  };
  limit?: number;
  priorityPosters?: number;
}) {
  return (
    <section className="home-section">
      <SectionHeader title={title} />
      {result.isPending && <LoadingState cards={limit} layout="season" label={`Loading ${title}`} />}
      {result.isError && <ErrorState onRetry={() => void result.refetch()} />}
      {result.data && (
        <div className="home-season-grid">
          {result.data.items.slice(0, limit).map((anime, index) => (
            <SeasonTile anime={anime} key={anime.id} priority={index < priorityPosters} />
          ))}
        </div>
      )}
    </section>
  );
}

function DecadeShelf({ decade }: { decade: AnimeDecade }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(() =>
    typeof IntersectionObserver === "undefined"
  );
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const result = useTopDecadeAnime(decade, enabled);
  const picks = useMemo(
    () => sampleTopAnime(result.data ?? [], 10, seed),
    [result.data, seed]
  );

  useEffect(() => {
    if (enabled || !sectionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setEnabled(true);
        observer.disconnect();
      }
    }, { rootMargin: "600px 0px" });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [enabled]);

  return (
    <section className="home-section home-decade" ref={sectionRef}>
      <SectionHeader
        title={`Top anime of the ${decade}`}
        trailing={
          <button type="button" onClick={() => setSeed((current) => current + 1)} disabled={picks.length < 2}>
            <Shuffle size={16} aria-hidden="true" /> Shuffle
          </button>
        }
      />
      {(!enabled || result.isPending) && (
        <LoadingState cards={10} layout="season" label={`Loading top anime of the ${decade}`} />
      )}
      {result.isError && <ErrorState onRetry={() => void result.refetch()} />}
      {result.data && picks.length === 0 && (
        <p className="home-decade__empty">No anime are available for this decade right now.</p>
      )}
      {picks.length > 0 && (
        <div className="home-season-grid">
          {picks.map((anime) => <SeasonTile anime={anime} key={anime.id} />)}
        </div>
      )}
    </section>
  );
}

export function DashboardPage() {
  const season = useCurrentSeason();
  const airing = useTopAnime("airing");
  const upcoming = useAnimeBrowse("upcoming");
  const airingCandidates = useMemo(() => {
    const byId = new Map<number, Anime>();
    for (const anime of [...(airing.data?.items ?? []), ...(season.data?.items ?? [])]) {
      const existing = byId.get(anime.id);
      if (!existing || (!hasBroadcastTime(existing) && hasBroadcastTime(anime))) {
        byId.set(anime.id, anime);
      }
    }
    return [...byId.values()];
  }, [airing.data?.items, season.data?.items]);
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
      <aside className="home-airing-rail" aria-label="Airing next">
        <SectionHeader title="Airing next" />
        {airing.isPending && season.isPending && <CompactListSkeleton items={5} variant="airing" label="Loading airing schedule" />}
        {airing.isError && season.isError && <ErrorState onRetry={() => { void airing.refetch(); void season.refetch(); }} />}
        {(airing.data || season.data) && <AiringSchedule items={airingCandidates} />}
      </aside>

      <div className="home-feed">
        <Recommendations candidates={recommendationCandidates} />

        <HomeShelf title="Current season" result={season} limit={10} priorityPosters={2} />

        <HomeShelf title="Coming soon" result={upcoming} />

        {ANIME_DECADES.map((decade) => <DecadeShelf decade={decade} key={decade} />)}
      </div>
    </div>
  );
}
