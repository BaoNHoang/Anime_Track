import { describe, expect, it } from "vitest";
import {
  MAX_FAVORITES_PER_KIND,
  normalizeProfileFavorites
} from "./favorites";

describe("normalizeProfileFavorites", () => {
  it("deduplicates, bounds, and sanitizes stored favorites", () => {
    const anime = Array.from({ length: MAX_FAVORITES_PER_KIND + 5 }, (_, index) => ({
      id: index + 1,
      name: `Anime ${index + 1}`,
      imageUrl: "javascript:alert(1)"
    }));
    anime.splice(1, 0, { id: 1, name: "Duplicate", imageUrl: "" });

    const result = normalizeProfileFavorites({ anime, studios: [], directors: [], characters: [] });

    expect(result.anime).toHaveLength(MAX_FAVORITES_PER_KIND);
    expect(result.anime[0]).toEqual({ id: 1, name: "Anime 1" });
    expect(new Set(result.anime.map((item) => item.id)).size).toBe(result.anime.length);
  });

  it("returns complete empty collections for malformed input", () => {
    expect(normalizeProfileFavorites("invalid")).toEqual({
      anime: [], studios: [], directors: [], characters: []
    });
  });
});
