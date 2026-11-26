import { expect, test, type Page } from "@playwright/test";

async function mockReleaseCatalogs(page: Page) {
  const requests: string[] = [];
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: null } }));
  await page.route("**/v1/**", (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname + url.search);
    if (url.pathname.endsWith("/news")) return route.fulfill({ json: {
      data: [{ mal_id: 800, title: "Publisher announcement", url: "https://myanimelist.net/news/800", date: "2026-11-23T12:00:00Z", comments: 2, images: { jpg: {} }, excerpt: "Publisher article details." }],
      pagination: { has_next_page: url.searchParams.get("page") !== "2" }
    } });
    if (url.pathname.endsWith("/manga")) return route.fulfill({ json: {
      data: url.searchParams.get("page") === "2" ? [] : [{
        mal_id: 71, title: "Manga seventy-one", url: "https://myanimelist.net/manga/71", images: { jpg: {} },
        status: "Publishing", synopsis: "Manga synopsis.", published: null
      }], pagination: { has_next_page: url.searchParams.get("page") !== "2" }
    } });
    return route.fulfill({ json: { data: [{
      mal_id: 51, title: "Anime fifty-one", url: "https://myanimelist.net/anime/51", images: { jpg: {} },
      status: "Not yet aired", synopsis: "Anime synopsis.", trailer: { url: "https://www.youtube.com/watch?v=abc123" },
      aired: { from: "2027-04" }, type: "TV", genres: [], studios: []
    }], pagination: { has_next_page: false } } });
  });
  return requests;
}

test("release tabs are linkable, lazy, cached, and keep manga separate from the anime tracker", async ({ page }) => {
  const requests = await mockReleaseCatalogs(page);
  await page.goto("/news?tab=figures");
  const tabs = page.getByRole("tablist", { name: "News categories" });
  await expect(tabs.getByRole("tab")).toHaveText(["Headlines", "MyAnimeList", "Trailers", "Anime releases", "Manga", "Figures"]);
  await expect(page.getByRole("region", { name: "Official figure release calendars" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Good Smile Company release calendar" })).toHaveAttribute("href", "https://www.goodsmile.com/en/releaseinfo");
  expect(requests.filter((path) => !path.includes("filter=airing"))).toEqual([]);
  await tabs.getByRole("tab", { name: "Manga", exact: true }).click();
  await expect(page).toHaveURL(/tab=manga/);
  await expect(page.getByRole("heading", { name: "Manga seventy-one" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View Manga seventy-one on MyAnimeList" })).toHaveAttribute("href", "https://myanimelist.net/manga/71");
  await expect(page.getByRole("button", { name: /^View anime:/ })).toHaveCount(0);
  await expect(page.getByText("Publication date not announced")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Manga publisher calendars" }).getByRole("link")).toHaveCount(3);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(/No publishing manga were found/)).toBeVisible();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Manga seventy-one" })).toBeVisible();
  const beforeUpcoming = requests.length;
  await page.getByRole("button", { name: "Upcoming volumes", exact: true }).click();
  const upcoming = page.getByRole("region", { name: "Upcoming manga volume releases" });
  await expect(upcoming.getByRole("link")).toHaveCount(3);
  await expect(upcoming.getByRole("link", { name: /VIZ/ })).toHaveAttribute("href", "https://www.viz.com/calendar");
  await expect(upcoming.getByRole("link", { name: /Seven Seas/ })).toHaveAttribute("href", "https://sevenseasentertainment.com/release-dates/");
  await expect(upcoming.getByRole("link", { name: /TOKYOPOP/ })).toHaveAttribute("href", "https://tokyopop.com/pages/release-calendar");
  await expect(page.getByText(/No upcoming manga were found/)).toHaveCount(0);
  expect(requests).toHaveLength(beforeUpcoming);
  await tabs.getByRole("tab", { name: "Anime releases", exact: true }).click();
  await expect(page.getByRole("button", { name: "View anime: Anime fifty-one" })).toBeVisible();
  await expect(page.getByText("Premiere: Apr 2027")).toBeVisible();
  await tabs.getByRole("tab", { name: "Trailers", exact: true }).click();
  await expect(page.locator(".promo-card")).toHaveAttribute("href", "https://www.youtube.com/watch?v=abc123");
  const mangaRequestCount = requests.filter((path) => path.includes("/manga?")).length;
  await tabs.getByRole("tab", { name: "Manga", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Manga seventy-one" })).toBeVisible();
  expect(requests.filter((path) => path.includes("/manga?")).length).toBe(mangaRequestCount);
  await page.goBack();
  await expect(tabs.getByRole("tab", { name: "Trailers", exact: true })).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("tabs support manual keyboard selection and publisher news shows article excerpts", async ({ page }) => {
  await mockReleaseCatalogs(page);
  await page.goto("/news?tab=figures");
  const selected = page.getByRole("tab", { name: "Figures", exact: true });
  await selected.focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Headlines", exact: true })).toBeFocused();
  await expect(selected).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/tab=myanimelist/);
  await expect(page.getByRole("heading", { name: "Publisher announcement" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Hide article previews" })).toHaveCount(0);
  await expect(page.getByText("Publisher article details.")).toBeVisible();
  await page.getByRole("tab", { name: "MyAnimeList", exact: true }).focus();
  await page.keyboard.press("End");
  await page.keyboard.press(" ");
  await expect(page).toHaveURL(/tab=figures/);
  const controlsExist = await page.getByRole("tab").evaluateAll((buttons) => buttons.every((button) =>
    Boolean(document.getElementById(button.getAttribute("aria-controls") ?? ""))));
  expect(controlsExist).toBe(true);
});

test("manga failures can be retried without requesting inactive news feeds", async ({ page }) => {
  const requests = await mockReleaseCatalogs(page);
  let fail = true;
  await page.route("**/v1/manga?*", (route) => fail ? route.fulfill({ status: 503, json: {} }) : route.fallback());
  await page.goto("/news?tab=manga");
  await expect(page.getByText("Manga could not be loaded.")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Manga seventy-one" })).toBeVisible();
  expect(requests.some((path) => path.includes("/news") || path.includes("seasons/now"))).toBe(false);
});
