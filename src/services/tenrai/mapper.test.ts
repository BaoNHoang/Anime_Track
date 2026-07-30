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
      episodes: null,
      synopsis: null,
      genres: [{ name: "Action" }],
      studios: [{ name: "Bones" }]
    });

    expect(result.id).toBe(5114);
    expect(result.episodes).toBeUndefined();
    expect(result.synopsis).toBe("No synopsis is available yet.");
    expect(result.genres).toEqual(["Action"]);
    expect(result.studios).toEqual(["Bones"]);
  });
});
