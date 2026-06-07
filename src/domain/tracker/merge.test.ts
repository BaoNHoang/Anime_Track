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

function item(progress: number, updatedAt: string): TrackedAnime {
  return {
    anime,
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
});
