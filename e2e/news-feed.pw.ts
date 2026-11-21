import { expect, test, type Page } from "@playwright/test";

async function mockNewsFeeds(page: Page, extraStories = 0, withImages = false) {
  const requests: string[] = [];
  const title = (id: number) => ({
    mal_id: id, title: `Feed anime ${id}`, images: { jpg: {
      image_url: withImages ? `https://cdn.myanimelist.net/images/anime/${id}.jpg` : undefined
    } },
    synopsis: "Catalog synopsis.", status: "Currently Airing", type: "TV", genres: [], studios: []
  });
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: null } }));
  await page.route("https://cdn.myanimelist.net/**", (route) => route.fulfill({
    contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><rect width="80" height="120" fill="#536375"/></svg>'
  }));
  await page.route("**/v1/**", (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname + url.search);
    const id = Number(url.pathname.match(/\/anime\/(\d+)\/news/)?.[1]);
    if (id) return route.fulfill({ json: { data: Array.from({ length: extraStories + 1 }, (_, index) => ({
      mal_id: id * 10 + index,
      title: index ? `Follow-up ${id}-${index}` : `Announcement ${id}`,
      url: `https://myanimelist.net/news/${id * 10 + index}`,
      date: new Date(Date.parse("2026-11-20T12:00:00Z") - index * 60_000).toISOString(),
      images: { jpg: {
        image_url: withImages ? `https://cdn.myanimelist.net/images/news/${id}.jpg` : undefined
      } }, comments: 0, excerpt: "Announcement details."
    })) } });
    const start = url.pathname.endsWith("/seasons/now") ? 1
      : url.searchParams.get("filter") === "upcoming" ? 101 : 201;
    return route.fulfill({ json: {
      data: Array.from({ length: 18 }, (_, index) => title(start + index)),
      pagination: { current_page: 1, has_next_page: false }
    } });
  });
  return requests;
}

test("news balances three cached catalogs without exceeding eight title requests", async ({ page }) => {
  const requests = await mockNewsFeeds(page);
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

test("news shows one headline per title and expands related stories without more requests", async ({ page }) => {
  const requests = await mockNewsFeeds(page, 2);
  await page.goto("/news");
  await expect(page.getByRole("button", { name: /^View anime:/ })).toHaveCount(8, { timeout: 15_000 });
  const mainStories = page.locator(".news-lead, .briefing-story, .news-card");
  await expect(mainStories).toHaveCount(8);
  await expect(page.locator(".news-related")).toHaveCount(8);
  const lead = page.locator(".news-lead");
  const extra = lead.getByRole("link", { name: "Follow-up 1-1", exact: true });
  await expect(extra).toBeHidden();
  const before = requests.length;
  const summary = lead.locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(extra).toBeVisible();
  await expect(extra).toHaveAttribute("href", "https://myanimelist.net/news/11");
  await expect(extra).toHaveAttribute("target", "_blank");
  await summary.click();
  await expect(extra).toBeHidden();
  expect(requests).toHaveLength(before);
});

test("hidden previews persist and only revealed stories load images and show excerpts", async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem("banime:news:hide-previews:v1") === null) {
      localStorage.setItem("banime:news:hide-previews:v1", "true");
    }
  });
  await mockNewsFeeds(page, 0, true);
  const imageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("cdn.myanimelist.net")) imageRequests.push(request.url());
  });
  await page.goto("/news");
  await expect(page.getByRole("button", { name: /^View anime:/ })).toHaveCount(8, { timeout: 15_000 });
  const toggle = page.getByRole("checkbox", { name: "Hide article previews" });
  const lead = page.locator(".news-lead");
  await expect(toggle).toBeChecked();
  await expect(page.getByText("Headlines and trailers may still contain spoilers.")).toBeVisible();
  await expect(lead.getByRole("heading")).toBeVisible();
  await expect(lead.locator("img, p")).toHaveCount(0);
  await expect(page.locator(".news-card p")).toHaveCount(0);
  expect(imageRequests).toEqual([]);
  const reveal = lead.getByRole("button", { name: /^Reveal preview:/ });
  await reveal.focus();
  await page.keyboard.press("Enter");
  await expect(lead.locator("img")).toBeVisible();
  await expect(lead.locator("p")).toHaveText("Announcement details.");
  await expect(page.locator(".news-card p")).toHaveCount(0);
  await page.reload();
  await expect(toggle).toBeChecked();
  await expect(lead.locator("img, p")).toHaveCount(0);
  await toggle.uncheck();
  await expect(lead.locator("img")).toBeVisible();
  await expect(page.locator(".news-card p")).toHaveCount(3);
  await page.reload();
  await expect(toggle).not.toBeChecked();
});
