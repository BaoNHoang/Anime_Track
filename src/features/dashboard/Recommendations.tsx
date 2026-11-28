import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useTracker } from "../../app/providers/useTracker";
import { Sparkles } from "../../components/OwnedIcons";
import { ImageWithFallback } from "../../components/ImageWithFallback";
import { SectionHeader } from "../../components/SectionHeader";
import type { Anime } from "../../domain/anime/types";
import { recommendationGenres } from "../../domain/recommendations/recommendationGenres";
import { sampleRecommendations } from "../../domain/recommendations/sampleRecommendations";
import { useAnimeGenre } from "../../hooks/useAnimeQueries";
import { useLocalProfile } from "../../hooks/useLocalProfile";
import { useHiddenRecommendations } from "../../hooks/useHiddenRecommendations";
import { HideRecommendationButton } from "../discover/HideRecommendationButton";

export function Recommendations({ candidates }: { candidates: Anime[] }) {
  const { items, isReady } = useTracker();
  const { configured, user } = useCloudAuth();
  const { profile } = useLocalProfile();
  const { hiddenIds, hide } = useHiddenRecommendations();
  const { openAnime } = useAnimePanel();
  const [visitSeed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const genres = useMemo(() => recommendationGenres(items), [items]);
  const genre = genres[visitSeed % genres.length];
  const genreFeed = useAnimeGenre(isReady ? genre : undefined);
  const recommendations = useMemo(
    () => sampleRecommendations(
      items,
      [...candidates, ...(genreFeed.data?.items ?? [])].filter((anime) => !hiddenIds.has(anime.id)),
      (user ?? (!configured ? profile : undefined))?.favorites.studios ?? [],
      visitSeed
    ),
    [candidates, configured, genreFeed.data?.items, hiddenIds, items, profile, user, visitSeed]
  );

  if (!isReady || (!items.length && configured && !user)) return null;

  return (
    <section className="home-section recommendation-section">
      <SectionHeader
        title="Recommended for you"
        action={{ label: "Explore more", to: "/recommendations" }}
      />
      {recommendations.length ? (
        <div className="recommendation-strip">
          {recommendations.map(({ anime, reason }) => (
            <article key={anime.id}>
              <button className="recommendation-strip__card" type="button" onClick={() => openAnime(anime)}>
                <span className="recommendation-strip__poster">
                  <ImageWithFallback src={anime.imageUrl} fallbackSrc={anime.largeImageUrl} loading="lazy" fallback={<Sparkles size={22} />} />
                </span>
                <span className="recommendation-strip__copy">
                  <strong>{anime.titleEnglish || anime.title}</strong>
                  <small><Sparkles size={11} /> {reason}</small>
                </span>
              </button>
              <HideRecommendationButton anime={anime} onHide={hide} />
            </article>
          ))}
        </div>
      ) : (
        hiddenIds.size ? (
          <p className="recommendation-empty">No more matches. <Link to="/recommendations">Browse suggestions or reset hidden titles</Link></p>
        ) : <p className="recommendation-empty">
          Finish or score a few titles to shape your recommendations. {" "}
          <Link to="/library">Open your library</Link>
        </p>
      )}
    </section>
  );
}
