import { describe, expect, it } from "vitest";
import type { Anime } from "./types";
import { dedupeAnimeById } from "./dedupe";

const anime: Anime = {
  id: 62568,
  title: "Dr. Stone: Science Future Part 3",
  imageUrl: "",
  largeImageUrl: "",
  synopsis: "",
  status: "Currently Airing",
  type: "TV",
  genres: [],
  studios: [],
  url: ""
};

describe("dedupeAnimeById", () => {
  it("keeps the first anime when Tenrai returns the same ID twice", () => {
    const result = dedupeAnimeById([anime, { ...anime }]);

    expect(result).toEqual([anime]);
  });
});
