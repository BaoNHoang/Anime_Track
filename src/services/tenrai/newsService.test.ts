import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSeasonMock, tenraiGetMock } = vi.hoisted(() => ({
  getCurrentSeasonMock: vi.fn(),
  tenraiGetMock: vi.fn()
}));

vi.mock("./animeService", () => ({
  getCurrentSeason: getCurrentSeasonMock
}));

vi.mock("./client", () => ({
  tenraiGet: tenraiGetMock
}));

import { getNewsForAnime, getPopularPromos } from "./newsService";

describe("Tenrai news service", () => {
  beforeEach(() => {
    getCurrentSeasonMock.mockReset();
    tenraiGetMock.mockReset();
  });

  it("loads title news from Tenrai", async () => {
    tenraiGetMock.mockResolvedValue({
      data: [
        {
          mal_id: 42,
          url: "https://myanimelist.net/news/42",
          title: "Anime announcement",
          date: "2026-07-29T12:00:00+00:00",
          author_username: "editor",
          images: { jpg: { image_url: "https://cdn.example.test/news.jpg" } },
          comments: 7,
          excerpt: "Announcement details."
        }
      ]
    });

    const articles = await getNewsForAnime(
      1,
      "Cowboy Bebop",
      "https://cdn.example.test/anime.jpg"
    );

    expect(tenraiGetMock).toHaveBeenCalledWith(
      "/anime/1/news",
      expect.objectContaining({ cacheMs: 2 * 60 * 60 * 1000 })
    );
    expect(articles).toEqual([
      expect.objectContaining({
        id: 42,
        animeId: 1,
        title: "Anime announcement",
        author: "editor"
      })
    ]);
  });

  it("builds the promo feed from supported seasonal trailer data", async () => {
    getCurrentSeasonMock.mockResolvedValue({
      currentPage: 1,
      hasNextPage: false,
      items: [
        {
          id: 1,
          title: "Trailer title",
          titleEnglish: "English trailer title",
          imageUrl: "https://cdn.example.test/small.jpg",
          largeImageUrl: "https://cdn.example.test/large.jpg",
          synopsis: "",
          status: "Currently Airing",
          type: "TV",
          genres: [],
          studios: [],
          trailerUrl: "https://www.youtube.com/watch?v=example",
          url: "https://myanimelist.net/anime/1"
        },
        {
          id: 2,
          title: "No trailer",
          imageUrl: "",
          largeImageUrl: "",
          synopsis: "",
          status: "Currently Airing",
          type: "TV",
          genres: [],
          studios: [],
          url: "https://myanimelist.net/anime/2"
        }
      ]
    });

    const promos = await getPopularPromos();

    expect(promos).toEqual([
      {
        animeId: 1,
        animeTitle: "Trailer title",
        animeUrl: "https://myanimelist.net/anime/1",
        imageUrl: "https://cdn.example.test/large.jpg",
        promoTitle: "Trailer title trailer",
        videoUrl: "https://www.youtube.com/watch?v=example",
        embedUrl: ""
      }
    ]);
  });
});
