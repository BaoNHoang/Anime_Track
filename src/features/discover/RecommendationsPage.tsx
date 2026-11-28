import { useMemo, useState } from "react";
import { useAnimeGenre, useCurrentSeason, useTopAnime } from "../../hooks/useAnimeQueries";
import { useTracker } from "../../app/providers/useTracker";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useLocalProfile } from "../../hooks/useLocalProfile";
import { rankRecommendations } from "../../domain/recommendations/rankRecommendations";
import { recommendationGenres } from "../../domain/recommendations/recommendationGenres";
import { shuffleRecommendations } from "../../domain/recommendations/sampleRecommendations";
import { AnimeCard } from "../../components/AnimeCard";
import { LibraryTools } from "../library/LibraryTools";
import { useHiddenRecommendations } from "../../hooks/useHiddenRecommendations";
import { HideRecommendationButton } from "./HideRecommendationButton";

export function RecommendationsPage() {
  const { items } = useTracker();
  const { user, configured } = useCloudAuth();
  const { profile } = useLocalProfile();
  const { hiddenIds, hide, reset } = useHiddenRecommendations();
  const [page, setPage] = useState(1);
  const [variety, setVariety] = useState(0);
  const genres = useMemo(() => recommendationGenres(items), [items]);
  const genre = genres[variety % genres.length];
  const genreFeed = useAnimeGenre(genre, page);
  const popular = useTopAnime("bypopularity", page);
  const season = useCurrentSeason();
  const ranked = useMemo(() => {
    const candidates = [
      ...(popular.data?.items ?? []),
      ...(season.data?.items ?? []),
      ...(genreFeed.data?.items ?? [])
    ].filter((anime) => !hiddenIds.has(anime.id));
    const matches = rankRecommendations(
      items, candidates, (user ?? (!configured ? profile : undefined))?.favorites.studios ?? [], 72
    );
    const seed = variety + (page - 1) * 1009;
    return (seed ? shuffleRecommendations(matches, seed) : matches).slice(0, 24);
  }, [items, popular.data, season.data, genreFeed.data, user, configured, profile, variety, page, hiddenIds]);

  return <div className="page-stack">
    <LibraryTools />
    <h1 className="visually-hidden">For you</h1>
    {popular.isPending && <p role="status">Finding recommendations…</p>}
    {popular.isError && <button className="button" onClick={() => void popular.refetch()}>Retry recommendations</button>}
    {genreFeed.isFetching && genre ? <p role="status">Finding more {genre} anime…</p> : null}
    {genreFeed.isError && genre ? <p role="status">The {genre} feed is unavailable. Showing other recommendations.</p> : null}
    {!popular.isPending && !ranked.length && <p>{hiddenIds.size
      ? "No more matches in this set. Browse another set or reset hidden titles."
      : "No matches yet. Rate or complete some shows, choose favorite studios, or browse another set."}</p>}
    <div className="anime-grid">{ranked.map(({ anime, reason }) =>
      <div key={anime.id}>
        <AnimeCard anime={anime} />
        <p>{reason}</p>
        <HideRecommendationButton anime={anime} onHide={hide} />
      </div>
    )}</div>
    <div className="filter-chips">
      <button disabled={page === 1 || popular.isFetching} onClick={() => setPage(page - 1)}>Previous set</button>
      <button disabled={!popular.data?.hasNextPage || popular.isFetching} onClick={() => setPage(page + 1)}>More suggestions</button>
      <button type="button" disabled={!ranked.length && !genre} onClick={() => setVariety((current) => current + 1)}>Show me something different</button>
      {hiddenIds.size > 0 && <button type="button" onClick={reset}>Reset hidden titles</button>}
    </div>
  </div>;
}
