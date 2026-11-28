import type { Anime } from "../../domain/anime/types";

export function HideRecommendationButton({ anime, onHide }: {
  anime: Anime;
  onHide: (id: number) => void;
}) {
  return (
    <button className="recommendation-dismiss" type="button"
      aria-label={`Not interested in ${anime.titleEnglish || anime.title}`}
      onClick={() => onHide(anime.id)}>
      Not interested
    </button>
  );
}
