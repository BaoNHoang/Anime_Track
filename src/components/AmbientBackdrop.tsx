import { useEffect, useMemo, useState } from "react";
import { useCurrentSeason } from "../hooks/useAnimeQueries";

const ROTATION_MS = 12_000;
const BACKDROP_COUNT = 2;

export function AmbientBackdrop() {
  const season = useCurrentSeason();
  const [activeIndex, setActiveIndex] = useState(0);
  const images = useMemo(() => {
    const urls = season.data?.items
      .map(
        (anime) =>
          anime.bannerImageUrl || anime.largeImageUrl || anime.imageUrl
      )
      .filter((url): url is string => Boolean(url));

    return [...new Set(urls)].slice(0, BACKDROP_COUNT);
  }, [season.data?.items]);

  useEffect(() => {
    if (images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, ROTATION_MS);

    return () => window.clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return null;
  }

  const displayedIndex = activeIndex % images.length;

  return (
    <div className="ambient-backdrop" aria-hidden="true">
      {images.map((src, index) => (
        <img
          className={index === displayedIndex ? "is-active" : ""}
          src={src}
          alt=""
          decoding="async"
          key={src}
        />
      ))}
    </div>
  );
}
