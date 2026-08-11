import { Shuffle } from "./OwnedIcons";
import { useAnimePanel } from "../app/providers/useAnimePanel";
import { useTopAnime } from "../hooks/useAnimeQueries";

export function HeaderShuffle() {
  const airing = useTopAnime("airing");
  const { openAnime } = useAnimePanel();

  return (
    <button
      className="topbar__icon-button"
      type="button"
      aria-label="Open a random airing anime"
      title="Surprise me"
      disabled={!airing.data?.items.length}
      onClick={() => {
        const items = airing.data?.items;
        if (!items?.length) return;
        openAnime(items[Math.floor(Math.random() * items.length)]);
      }}
    >
      <Shuffle size={18} />
    </button>
  );
}
