import { expect, it, vi } from "vitest";
import { getPublisherNews } from "./newsService";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("./client", () => ({ tenraiGet: get }));

it("loads a cached global MyAnimeList page and excludes unsafe or undated news", async () => {
  const article = { mal_id: 4, title: "News", date: "2026-11-23T12:00:00Z", url: "https://myanimelist.net/news/4", comments: 2 };
  get.mockResolvedValue({ data: [article, article, { ...article, url: "https://evil.test/news/4" }, { ...article, date: null }], pagination: { has_next_page: true } });
  const result = await getPublisherNews(2);
  expect(get).toHaveBeenCalledWith("/news?page=2&limit=24&sfw=true", expect.objectContaining({ cacheStorage: "local", cacheMs: 900_000 }));
  expect(result.items).toEqual([expect.objectContaining({ title: "News", author: "MyAnimeList", imageUrl: undefined })]);
  expect(result.hasNextPage).toBe(true);
});
