import { describe, expect, it } from "vitest";
import type { Anime } from "../anime/types";
import {
  buildWatchSearchUrl,
  DEFAULT_WATCH_PROVIDER_ID,
  getWatchProvider
} from "./providers";

const anime: Anime = {
  id: 1,
  title: "Sousou no Frieren",
  titleEnglish: "Frieren: Beyond Journey's End",
  imageUrl: "",
  largeImageUrl: "",
  synopsis: "",
  status: "Finished Airing",
  type: "TV",
  genres: [],
  studios: [],
  url: ""
};

describe("watch providers", () => {
  it("builds an Anikoto filter URL", () => {
    expect(buildWatchSearchUrl("anikoto", anime)).toBe(
      "https://anikototv.to/filter?keyword=Frieren%3A%20Beyond%20Journey%27s%20End"
    );
  });

  it("builds a safe encoded watch search URL", () => {
    expect(buildWatchSearchUrl("justwatch", anime)).toBe(
      "https://www.justwatch.com/us/search?q=Frieren%3A%20Beyond%20Journey%27s%20End"
    );
  });

  it("falls back to the default provider for unknown IDs", () => {
    expect(getWatchProvider("unknown").id).toBe(DEFAULT_WATCH_PROVIDER_ID);
  });
});
