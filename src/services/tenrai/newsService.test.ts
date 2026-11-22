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

import {
  getNewsForAnime,
  getPopularPromos,
  prepareLatestNews,
  selectNewsAnime
} from "./newsService";

describe("Tenrai news service", () => {
  beforeEach(() => {
    getCurrentSeasonMock.mockReset();
    tenraiGetMock.mockReset();
  });

  it("balances source feeds within eight unique title requests", () => {
    const anime = (id: number) => ({
      id, title: `Anime ${id}`, imageUrl: "", largeImageUrl: "", synopsis: "",
      status: "", type: "TV", genres: [], studios: [], url: ""
    });
    const seasonal = Array.from({ length: 18 }, (_, index) => anime(index + 1));
    const upcoming = Array.from({ length: 24 }, (_, index) => anime(index + 101));
    const popular = Array.from({ length: 24 }, (_, index) => anime(index + 201));
    expect(selectNewsAnime([seasonal, upcoming, popular]).map((item) => item.id))
      .toEqual([1, 101, 201, 2, 102, 202, 3, 103]);
    expect(selectNewsAnime([seasonal, seasonal, []]).map((item) => item.id))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(selectNewsAnime([[], upcoming, []])).toHaveLength(8);
    expect(selectNewsAnime([[], [], []])).toEqual([]);
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
      expect.objectContaining({ cacheMs: 15 * 60 * 1000, cacheStorage: "local" })
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

  it("sorts newest first, deduplicates URLs, and avoids repeated artwork", () => {
    const article = (url: string, publishedAt: string, imageUrl?: string) => ({
      id: Number(url.at(-1)),
      animeId: Number(url.at(-1)),
      animeTitle: "Signal", animeImageUrl: "https://cdn.example.test/poster.jpg",
      title: url, url, publishedAt, author: "editor", imageUrl,
      excerpt: "Details", comments: 0
    });
    const feed = prepareLatestNews([
      article("https://news.example/1", "2026-09-01T10:00:00.000Z"),
      article("https://news.example/2", "2026-09-02T10:00:00.000Z"),
      article("https://news.example/2", "2026-09-03T10:00:00.000Z"),
      article("https://news.example/3", "2026-09-04T10:00:00.000Z", "https://cdn.example.test/unique.jpg")
    ]);

    expect(feed.map((entry) => entry.url)).toEqual([
      "https://news.example/3", "https://news.example/2", "https://news.example/1"
    ]);
    expect(feed.map((entry) => entry.imageUrl)).toEqual([
      "https://cdn.example.test/unique.jpg", "https://cdn.example.test/poster.jpg", undefined
    ]);
  });

  it("keeps only the newest headline per anime without crowding out quieter titles", () => {
    const article = (id: number, animeId: number) => ({
      id, animeId, animeTitle: `Anime ${animeId}`, animeImageUrl: "", title: `Story ${id}`,
      url: `https://myanimelist.net/news/${id}`, publishedAt: new Date(id * 60_000).toISOString(),
      author: "editor", excerpt: "Details", comments: 0
    });
    const feed = prepareLatestNews([
      ...Array.from({ length: 30 }, (_, index) => article(index + 10, 1)),
      article(1, 2), article(2, 3)
    ]);
    expect(feed.map((article) => article.animeId)).toEqual([1, 3, 2]);
    expect(feed.map((article) => article.id)).toEqual([39, 2, 1]);
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
