import { expect, test } from "@playwright/test";

test("news balances three cached catalogs without exceeding eight title requests", async ({ page }) => {
  const requests: string[] = [];
  const title = (id: number) => ({
    mal_id: id, title: `Feed anime ${id}`, images: { jpg: {} },
    synopsis: "Catalog synopsis.", status: "Currently Airing", type: "TV", genres: [], studios: []
  });
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: null } }));
  await page.route("**/v1/**", (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname + url.search);
    const id = Number(url.pathname.match(/\/anime\/(\d+)\/news/)?.[1]);
    if (id) return route.fulfill({ json: { data: [{
      mal_id: id, title: `Announcement ${id}`, url: `https://myanimelist.net/news/${id}`,
      date: "2026-11-20T12:00:00Z", images: { jpg: {} }, comments: 0, excerpt: "Announcement details."
    }] } });
    const start = url.pathname.endsWith("/seasons/now") ? 1
      : url.searchParams.get("filter") === "upcoming" ? 101 : 201;
    return route.fulfill({ json: {
      data: Array.from({ length: 18 }, (_, index) => title(start + index)),
      pagination: { current_page: 1, has_next_page: false }
    } });
  });

  await page.goto("/news");
  const actions = page.getByRole("button", { name: /^View anime:/ });
  await expect(actions).toHaveCount(8, { timeout: 15_000 });
  const articleRequests = requests.filter((path) => path.endsWith("/news"));
  expect(articleRequests.map((path) => Number(path.match(/\/anime\/(\d+)/)?.[1])).sort((a, b) => a - b))
    .toEqual([1, 2, 3, 101, 102, 103, 201, 202]);
  // The shared header independently loads its airing shuffle candidates.
  const newsRequests = () => requests.filter((path) => !path.includes("filter=airing"));
  expect(newsRequests()).toHaveLength(11);
  await page.reload();
  await expect(actions).toHaveCount(8);
  expect(newsRequests()).toHaveLength(11);
});
