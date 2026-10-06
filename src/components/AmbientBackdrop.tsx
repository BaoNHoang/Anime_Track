import { useEffect, useMemo, useState } from "react";
import { useCurrentSeason } from "../hooks/useAnimeQueries";

const ROTATION_MS = 12_000;
const BACKDROP_COUNT = 2;

export function AmbientBackdrop() {
  const season = useCurrentSeason();
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const images = useMemo(() => {
    const urls = season.data?.items
      .map(
        (anime) =>
          anime.bannerImageUrl || anime.largeImageUrl || anime.imageUrl
      )
      .filter((url): url is string => Boolean(url));

    return [...new Set(urls)].slice(0, BACKDROP_COUNT);
  }, [season.data?.items]);
  const availableImages = images.filter((url) => !failedImages.includes(url));

  useEffect(() => {
    if (availableImages.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % availableImages.length);
    }, ROTATION_MS);

    return () => window.clearInterval(interval);
  }, [availableImages.length]);

  if (availableImages.length === 0) {
    return null;
  }

  const displayedIndex = activeIndex % availableImages.length;

  return (
    <div className="ambient-backdrop" aria-hidden="true">
      {availableImages.map((src, index) => (
        <img
          className={index === displayedIndex ? "is-active" : ""}
          src={src}
          alt=""
          decoding="async"
          key={src}
          onError={() => setFailedImages((current) => current.includes(src) ? current : [...current, src])}
        />
      ))}
    </div>
  );
}
