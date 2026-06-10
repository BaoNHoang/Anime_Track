import { describe, expect, it } from "vitest";
import type { TrackedAnime } from "../src/domain/tracker/types";
import { applyLibraryUpdates } from "./libraryRepository";

const existing: TrackedAnime = {
  anime: {
    id: 1,
    title: "Test",
    imageUrl: "",
    largeImageUrl: "",
    synopsis: "",
    episodes: 12,
    status: "Finished Airing",
    type: "TV",
    genres: [],
    studios: [],
    url: "https://myanimelist.net/anime/1"
  },
  status: "watching",
  progress: 4,
  userScore: 8,
  notes: "Keep this",
  addedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("applyLibraryUpdates", () => {
  it("preserves omitted fields in a partial update", () => {
    const result = applyLibraryUpdates(
      existing,
      { progress: 7 },
      "2026-06-10T00:00:00.000Z"
    );

    expect(result).toMatchObject({
      status: "watching",
      progress: 7,
      userScore: 8,
      notes: "Keep this",
      updatedAt: "2026-06-10T00:00:00.000Z"
    });
  });

  it("clears a score and clamps progress to the episode count", () => {
    const result = applyLibraryUpdates(existing, {
      progress: 99,
      userScore: null
    });

    expect(result.progress).toBe(12);
    expect(result.userScore).toBeUndefined();
  });
});
