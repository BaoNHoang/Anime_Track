import { useMemo, useState } from "react";
import { useAnimeFacet, useCurrentSeason, useTopAnime } from "../../hooks/useAnimeQueries";
import { useTracker } from "../../app/providers/useTracker";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useLocalProfile } from "../../hooks/useLocalProfile";
import { rankRecommendations } from "../../domain/recommendations/rankRecommendations";
import { recommendationGenres } from "../../domain/recommendations/recommendationGenres";
import { shuffleMapItems } from "../../domain/anime/connectionMap";
import { AnimeCard } from "../../components/AnimeCard";
import { LibraryTools } from "../library/LibraryTools";

export function RecommendationsPage() {
  const { items } = useTracker();
  const { user, configured } = useCloudAuth();
  const { profile } = useLocalProfile();
  const [page, setPage] = useState(1);
  const [variety, setVariety] = useState(0);
  const genres = useMemo(() => recommendationGenres(items), [items]);
  const genre = genres[variety % genres.length];
  const facet = useAnimeFacet(genre ? {
    kind: "genre", label: genre, key: `genre:${genre.toLocaleLowerCase()}`
  } : undefined, page);
  const popular = useTopAnime("bypopularity", page);
  const season = useCurrentSeason();
  const ranked = useMemo(() => {
    const candidates = [
      ...(popular.data?.items ?? []),
      ...(season.data?.items ?? []),
      ...(facet.data?.items ?? [])
    ];
    const matches = rankRecommendations(
      items, candidates, (user ?? (!configured ? profile : undefined))?.favorites.studios ?? [], 72
    );
    const seed = variety + (page - 1) * 1009;
    return (seed ? shuffleMapItems(matches, seed) : matches).slice(0, 24);
  }, [items, popular.data, season.data, facet.data, user, configured, profile, variety, page]);

  return <div className="page-stack">
    <h1>For you</h1>
    <LibraryTools />
    <p>Recommendations reflect your completed shows, personal scores, genres, and favorite studios. Titles already in your library are excluded.</p>
    {genre ? <p className="recommendation-source">Exploring more {genre} anime alongside current and popular shows.</p> : null}
    {popular.isPending && <p role="status">Finding recommendations…</p>}
    {popular.isError && <button className="button" onClick={() => void popular.refetch()}>Retry recommendations</button>}
    {facet.isFetching && genre ? <p role="status">Finding more {genre} anime…</p> : null}
    {facet.isError && genre ? <p role="status">The {genre} feed is unavailable. Showing other recommendations.</p> : null}
    {!popular.isPending && !ranked.length && <p>No matches yet. Rate or complete some shows, choose favorite studios, or browse another set.</p>}
    <div className="anime-grid">{ranked.map(({ anime, reason }) =>
      <div key={anime.id}><AnimeCard anime={anime} /><p>{reason}</p></div>
    )}</div>
    <div className="filter-chips">
      <button disabled={page === 1 || popular.isFetching} onClick={() => setPage(page - 1)}>Previous set</button>
      <button disabled={!popular.data?.hasNextPage || popular.isFetching} onClick={() => setPage(page + 1)}>More suggestions</button>
      <button type="button" disabled={!ranked.length} onClick={() => setVariety((current) => current + 1)}>Show me something different</button>
    </div>
  </div>;
}
