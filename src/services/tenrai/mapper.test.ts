import { describe, expect, it } from "vitest";
import { mapTenraiAnime } from "./mapper";

describe("mapTenraiAnime", () => {
  it("normalizes nullable API fields", () => {
    const result = mapTenraiAnime({
      mal_id: 5114,
      url: "https://example.com",
      title: "Fullmetal Alchemist: Brotherhood",
      title_english: null,
      images: {
        jpg: {
          image_url: "small.jpg",
          large_image_url: "large.jpg"
        }
      },
      trailer: {
        images: {
          maximum_image_url: "https://img.youtube.com/banner.jpg"
        }
      },
      episodes: null,
      aired: { from: "2009-04-05T00:00:00+00:00" },
      synopsis: null,
      genres: [{ name: "Action" }],
      studios: [{ name: "Bones" }]
    });

    expect(result.id).toBe(5114);
    expect(result.episodes).toBeUndefined();
    expect(result.startDate).toBe("2009-04-05T00:00:00+00:00");
    expect(result.synopsis).toBe("No synopsis is available yet.");
    expect(result.bannerImageUrl).toBe(
      "https://img.youtube.com/banner.jpg"
    );
    expect(result.genres).toEqual(["Action"]);
    expect(result.studios).toEqual(["Bones"]);
  });

  it("keeps only reviewed streaming-provider destinations", () => {
    const result = mapTenraiAnime({
      mal_id: 5114,
      url: "https://myanimelist.net/anime/5114",
      title: "Fullmetal Alchemist: Brotherhood",
      images: { jpg: { image_url: "", large_image_url: "" } },
      streaming: [
        { name: "Crunchyroll", url: "http://www.crunchyroll.com/series/abc" },
        { name: "Unreviewed", url: "https://streaming.example/watch/abc" },
        { name: "Netflix lookalike", url: "https://www.netflix.com.evil.example/title/1" }
      ]
    });

    expect(result.streaming).toEqual([
      {
        provider: "Crunchyroll",
        url: "https://www.crunchyroll.com/series/abc",
        regionStatus: "catalog"
      }
    ]);
  });
});
