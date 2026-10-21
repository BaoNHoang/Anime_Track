import { describe, expect, it } from "vitest";
import type { Anime } from "./types";
import { sampleTopAnime } from "./sampleTopAnime";

const anime = Array.from({ length: 60 }, (_, index) => ({ id: index + 1 })) as Anime[];

describe("sampleTopAnime", () => {
  it("returns ten unique choices from only the top 50 without changing the source", () => {
    const originalIds = anime.map((item) => item.id);
    const picks = sampleTopAnime(anime, 10, 123);
    expect(picks).toHaveLength(10);
    expect(new Set(picks.map((item) => item.id)).size).toBe(10);
    expect(picks.every((item) => item.id <= 50)).toBe(true);
    expect(anime.map((item) => item.id)).toEqual(originalIds);
  });

  it("reshuffles with a new seed and handles short lists", () => {
    expect(sampleTopAnime(anime, 10, 123).map((item) => item.id))
      .not.toEqual(sampleTopAnime(anime, 10, 124).map((item) => item.id));
    expect(sampleTopAnime(anime.slice(0, 3), 10, 123)).toHaveLength(3);
  });
});
