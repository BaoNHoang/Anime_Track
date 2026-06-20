import { describe, expect, it } from "vitest";
import type { Anime } from "../anime/types";
import { mergeTrackedAnime } from "./merge";
import type { TrackedAnime } from "./types";

const anime: Anime = {
  id: 1,
  title: "Test",
  imageUrl: "",
  largeImageUrl: "",
  synopsis: "",
  status: "Airing",
  type: "TV",
  genres: [],
  studios: [],
  url: ""
};

function item(
  progress: number,
  updatedAt: string,
  animeTitle = anime.title
): TrackedAnime {
  return {
    anime: { ...anime, title: animeTitle },
    status: "watching",
    progress,
    notes: "",
    addedAt: updatedAt,
    updatedAt
  };
}

describe("mergeTrackedAnime", () => {
  it("keeps the newest version from local or cloud", () => {
    const result = mergeTrackedAnime(
      [item(2, "2026-06-01T00:00:00.000Z")],
      [item(5, "2026-06-02T00:00:00.000Z")]
    );

    expect(result).toHaveLength(1);
    expect(result[0].progress).toBe(5);
  });

  it("keeps same-timestamp local data unless replacement is requested", () => {
    const result = mergeTrackedAnime(
      [item(2, "2026-06-01T00:00:00.000Z", "Local title")],
      [item(2, "2026-06-01T00:00:00.000Z", "Jikan title")]
    );

    expect(result[0].anime.title).toBe("Local title");
  });

  it("can replace same-timestamp data for catalog enrichment imports", () => {
    const result = mergeTrackedAnime(
      [item(2, "2026-06-01T00:00:00.000Z", "Imported MAL title")],
      [item(2, "2026-06-01T00:00:00.000Z", "Jikan title")],
      { replaceOnEqualUpdatedAt: true }
    );

    expect(result[0].anime.title).toBe("Jikan title");
  });
});
