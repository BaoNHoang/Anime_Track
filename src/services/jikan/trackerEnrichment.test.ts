import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackedAnime } from "../../domain/tracker/types";

const { getAnimeByIdMock } = vi.hoisted(() => ({
  getAnimeByIdMock: vi.fn()
}));

vi.mock("./animeService", () => ({
  getAnimeById: getAnimeByIdMock
}));

import { enrichTrackedAnimeFromJikan } from "./trackerEnrichment";

const importedItem: TrackedAnime = {
  anime: {
    id: 1,
    title: "Imported title",
    imageUrl: "",
    largeImageUrl: "",
    synopsis: "Imported from MyAnimeList.",
    episodes: 12,
    status: "Imported from MyAnimeList",
    type: "TV",
    genres: [],
    studios: [],
    url: "https://myanimelist.net/anime/1"
  },
  status: "watching",
  progress: 8,
  notes: "",
  addedAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z"
};

describe("enrichTrackedAnimeFromJikan", () => {
  beforeEach(() => {
    getAnimeByIdMock.mockReset();
  });

  it("replaces imported MAL anime snapshots with Jikan details", async () => {
    getAnimeByIdMock.mockResolvedValue({
      ...importedItem.anime,
      title: "Jikan title",
      imageUrl: "https://cdn.example.test/poster.jpg",
      largeImageUrl: "https://cdn.example.test/large.jpg",
      synopsis: "Current Jikan synopsis.",
      genres: ["Action"],
      studios: ["Bones"]
    });

    const result = await enrichTrackedAnimeFromJikan([importedItem], {
      delayMs: 0
    });

    expect(result.enriched).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.items[0]).toMatchObject({
      status: "watching",
      progress: 8,
      anime: {
        title: "Jikan title",
        imageUrl: "https://cdn.example.test/poster.jpg",
        genres: ["Action"]
      }
    });
  });

  it("keeps MAL data when a Jikan lookup fails", async () => {
    getAnimeByIdMock.mockRejectedValue(new Error("Not found"));

    const result = await enrichTrackedAnimeFromJikan([importedItem], {
      delayMs: 0
    });

    expect(result.enriched).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.items[0]).toEqual(importedItem);
  });
});
