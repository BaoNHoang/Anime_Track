import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAnimePanel } from "../../app/providers/useAnimePanel";
import { useCloudAuth } from "../../app/providers/useCloudAuth";
import { useTracker } from "../../app/providers/useTracker";
import { Sparkles } from "../../components/OwnedIcons";
import { SectionHeader } from "../../components/SectionHeader";
import type { Anime } from "../../domain/anime/types";
import { rankRecommendations } from "../../domain/recommendations/rankRecommendations";
import { useLocalProfile } from "../../hooks/useLocalProfile";

export function Recommendations({ candidates }: { candidates: Anime[] }) {
  const { items, isReady } = useTracker();
  const { configured, user } = useCloudAuth();
  const { profile } = useLocalProfile();
  const { openAnime } = useAnimePanel();
  const recommendations = useMemo(
    () => rankRecommendations(
      items,
      candidates,
      (user ?? (!configured ? profile : undefined))?.favorites.studios ?? []
    ),
    [candidates, configured, items, profile, user]
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
              <button type="button" onClick={() => openAnime(anime)}>
                <span className="recommendation-strip__poster">
                  {anime.imageUrl ? (
                    <img src={anime.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <Sparkles size={22} />
                  )}
                </span>
                <span className="recommendation-strip__copy">
                  <strong>{anime.titleEnglish || anime.title}</strong>
                  <small><Sparkles size={11} /> {reason}</small>
                </span>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="recommendation-empty">
          Finish or score a few titles to shape your recommendations. {" "}
          <Link to="/library">Open your library</Link>
        </p>
      )}
    </section>
  );
}
