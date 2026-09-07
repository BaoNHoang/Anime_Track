import { useState } from "react";
import { useTopAnime, useCurrentSeason } from "../../hooks/useAnimeQueries";
import { useTracker } from "../../app/providers/useTracker";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useLocalProfile } from "../../hooks/useLocalProfile";
import { rankRecommendations } from "../../domain/recommendations/rankRecommendations";
import { AnimeCard } from "../../components/AnimeCard";
import { LibraryTools } from "../library/LibraryTools";

export function RecommendationsPage() {
  const { items } = useTracker();
  const { user, configured } = useCloudAuth();
  const { profile } = useLocalProfile();
  const [page, setPage] = useState(1);
  const popular = useTopAnime("bypopularity", page);
  const season = useCurrentSeason();
  const candidates = [...(popular.data?.items ?? []), ...(season.data?.items ?? [])];
  const ranked = rankRecommendations(items, candidates, (user ?? (!configured ? profile : undefined))?.favorites.studios ?? [], 24);
  return <div className="page-stack"><h1>For you</h1><LibraryTools />
    <p>Recommendations reflect your completed shows, personal scores, genres, and favorite studios. Titles already in your library are excluded.</p>
    {popular.isPending && <p role="status">Finding recommendations…</p>}
    {popular.isError && <button className="button" onClick={() => void popular.refetch()}>Retry recommendations</button>}
    {!popular.isPending && !ranked.length && <p>No matches yet. Rate or complete some shows, choose favorite studios, or browse another set.</p>}
    <div className="anime-grid">{ranked.map(({ anime, reason }) => <div key={anime.id}><AnimeCard anime={anime} /><p>{reason}</p></div>)}</div>
    <div className="filter-chips"><button disabled={page === 1 || popular.isFetching} onClick={() => setPage(page - 1)}>Previous set</button>
      <button disabled={!popular.data?.hasNextPage || popular.isFetching} onClick={() => setPage(page + 1)}>More suggestions</button></div>
  </div>;
}
