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

test("news loads cached eight-title batches up to 24 sources without reshuffling earlier stories", async ({ page }) => {
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
  const earlierHeadlines = await page.locator(".news-lead h2, .news-card h3").allTextContents();
  await page.getByRole("button", { name: "Load more news", exact: true }).click();
  await expect(actions).toHaveCount(16, { timeout: 15_000 });
  expect((await page.locator(".news-lead h2, .news-card h3").allTextContents()).slice(0, 8))
    .toEqual(earlierHeadlines);
  await page.getByRole("button", { name: "Load more news", exact: true }).click();
  await expect(actions).toHaveCount(24, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Load more news", exact: true })).toHaveCount(0);
  expect(newsRequests()).toHaveLength(27);
  await page.reload();
  await expect(actions).toHaveCount(8);
  expect(newsRequests()).toHaveLength(27);
});

test("news shows multiple distinct stories as full cards without related-story expanders", async ({ page }) => {
  await mockNewsFeeds(page, 2);
  await page.goto("/news");
  const animeActions = page.getByRole("button", { name: /^View anime:/ });
  await expect(animeActions).toHaveCount(24, { timeout: 15_000 });
  await expect(page.locator(".news-card")).toHaveCount(23);
  await expect(page.locator(".news-card p")).toHaveCount(23);
  const titles = await animeActions.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
  expect(titles.every((title, index) => !index || title !== titles[index - 1])).toBe(true);
  await expect(page.locator("main details")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Follow-up 1-1", exact: true })).toBeVisible();
  await expect(page.getByText(/More about this title/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
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
  await expect(page.locator(".news-card p")).toHaveCount(7);
  await page.reload();
  await expect(toggle).not.toBeChecked();
});

test("compact thumbnails fall back to anime artwork and remain hidden until revealed", async ({ page }) => {
  await mockNewsFeeds(page, 0, true);
  await page.route("https://cdn.myanimelist.net/images/news/**", (route) => route.fulfill({ status: 404 }));
  await page.goto("/news");
  await expect(page.getByRole("button", { name: /^View anime:/ })).toHaveCount(8, { timeout: 15_000 });
  const card = page.locator(".news-card").first();
  const thumbnail = card.locator(".news-card__thumbnail");
  const image = thumbnail.locator("img");
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute("src", /\/images\/anime\//);
  await expect(image).toHaveAttribute("loading", "lazy");
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  const mediaBox = await thumbnail.boundingBox();
  const headingBox = await card.getByRole("heading").boundingBox();
  expect(mediaBox!.width).toBe(64);
  expect(headingBox!.x).toBeGreaterThan(mediaBox!.x + mediaBox!.width);
  await page.getByRole("checkbox", { name: "Hide article previews" }).check();
  await expect(page.locator(".news-card__thumbnail")).toHaveCount(0);
  await card.getByRole("button", { name: /^Reveal preview:/ }).click();
  await expect(thumbnail).toBeVisible();
  await expect(page.locator(".news-card__thumbnail")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("readers can load another batch when the first titles have no news", async ({ page }) => {
  await mockNewsFeeds(page);
  const initialIds = new Set([1, 2, 3, 101, 102, 103, 201, 202]);
  await page.route("**/v1/anime/*/news", (route) => {
    const id = Number(new URL(route.request().url()).pathname.match(/\/anime\/(\d+)/)?.[1]);
    return initialIds.has(id) ? route.fulfill({ json: { data: [] } }) : route.fallback();
  });
  await page.goto("/news");
  await expect(page.getByText("No current headlines were found.")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Load more news", exact: true }).click();
  await expect(page.getByRole("button", { name: /^View anime:/ })).toHaveCount(8, { timeout: 15_000 });
  await expect(page.getByText("No current headlines were found.")).toHaveCount(0);
});
