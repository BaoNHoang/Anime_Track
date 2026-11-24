import { beforeEach, expect, it, vi } from "vitest";
import { getMangaReleases } from "./mangaService";
import { safeMyAnimeListMangaUrl } from "../../domain/security/validation";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("./client", () => ({ tenraiGet: get }));
beforeEach(() => get.mockReset());

it("loads bounded cached manga and rejects unsafe supplied links and images", async () => {
  get.mockResolvedValue({ data: [
    { mal_id: 12, title: "Manga", url: "https://evil.test/manga/12", images: { jpg: { image_url: "javascript:alert(1)" } }, published: null },
    { mal_id: 12, title: "Duplicate" }, { mal_id: -1, title: "Invalid" }
  ], pagination: { has_next_page: true } });
  const result = await getMangaReleases("upcoming", 2);
  expect(get).toHaveBeenCalledWith(expect.stringContaining("/manga?"), expect.objectContaining({ cacheStorage: "local", cacheMs: 21_600_000 }));
  const params = new URL(get.mock.calls[0][0], "https://api.tenrai.org").searchParams;
  expect(Object.fromEntries(params)).toMatchObject({ status: "upcoming", page: "2", sfw: "true", limit: "24" });
  expect(result.items).toEqual([expect.objectContaining({ id: 12, url: "https://myanimelist.net/manga/12", imageUrl: undefined, publication: "Publication date not announced" })]);
  expect(result.hasNextPage).toBe(true);
});

it("uses the popularity endpoint and keeps manga links distinct from anime links", async () => {
  get.mockResolvedValue({ data: [] });
  await getMangaReleases("popular");
  expect(get.mock.calls[0][0]).toContain("/top/manga?");
  expect(get.mock.calls[0][0]).toContain("filter=bypopularity");
  expect(safeMyAnimeListMangaUrl("https://myanimelist.net/manga/12/Title")).toBeDefined();
  for (const url of ["https://myanimelist.net/anime/12", "http://myanimelist.net/manga/12", "https://myanimelist.net.evil.test/manga/12", "https://user@myanimelist.net/manga/12"]) {
    expect(safeMyAnimeListMangaUrl(url)).toBeUndefined();
  }
});
