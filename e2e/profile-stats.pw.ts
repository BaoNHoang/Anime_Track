import { expect, test } from "@playwright/test";

const anime = (id: number, title: string) => ({
  id, title, imageUrl: "", largeImageUrl: "", synopsis: "", status: "Finished Airing",
  type: "TV", genres: [], studios: [], url: ""
});

const items = [
  {
    anime: anime(901, "Currently watching"), status: "watching", progress: 1,
    episodeHistory: [{ episode: 1, watchedAt: "2026-10-18" }], notes: "",
    addedAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-18T00:00:00Z"
  },
  {
    anime: anime(902, "Already completed"), status: "completed", progress: 2,
    completedAt: "2026-10-17T00:00:00Z", notes: "",
    addedAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-17T00:00:00Z"
  }
];

test("profile counts open matching library filters", async ({ page }) => {
  await page.addInitScript((seedItems) => {
    window.localStorage.setItem("banime:library:v1", JSON.stringify(seedItems));
    window.localStorage.setItem("banime.local-profile.v1", JSON.stringify({
      username: "Profile test", avatarId: "", bannerId: "banner-01",
      favorites: { anime: [{ id: 901, name: "Currently watching" }], characters: [], studios: [], directors: [] }
    }));
  }, items);
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: {
    user: {
      id: "profile-stats-user", email: "profile@example.test", username: "Profile test",
      provider: "email", avatarId: "", bannerId: "", scoreStep: 1,
      favorites: { anime: [{ id: 901, name: "Currently watching" }], characters: [], studios: [], directors: [] }
    }
  } }));
  await page.route("**/api/library/summary", (route) => route.fulfill({ json: { summary: {
    stats: { total: 2, watching: 1, completed: 1, episodesWatched: 3, daysWatched: 0.05 },
    recentItems: items, favoriteGenres: [], airingItems: []
  } } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items, total: 2 } }));
  await page.route("**/api/library", (route) => route.fulfill({ json: {} }));

  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  const summary = page.getByRole("region", { name: "Library summary" });
  await expect(summary.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "1 of 2 anime completed");
  await expect(summary).toContainText("1 / 2 completed");
  await expect(summary).toContainText("50%");
  await expect(page.getByRole("heading", { name: "Recently updated" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New episodes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Airing next" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Watch journal" })).toHaveCount(0);
  await expect(page.locator(".activity-item__watch").first()).toContainText("Watched episode 1 · Oct 18, 2026");
  await expect(page.locator(".activity-item__copy strong").first()).toHaveCSS("font-size", "15px");
  await expect(page.locator(".profile-favorites__items strong").first()).toHaveCSS("font-size", "12px");
  await expect(page.locator(".profile-favorites__groups h3")).toHaveText(["Anime"]);

  await summary.getByRole("link", { name: "1 Completed" }).click();
  await expect(page).toHaveURL(/\/library\?status=completed$/);
  const libraryGrid = page.locator(".library-grid");
  await expect(libraryGrid.getByRole("button", { name: /Already completed/ })).toBeVisible();
  await expect(libraryGrid.getByRole("button", { name: /Currently watching/ })).toHaveCount(0);

  await page.goBack();
  await summary.getByRole("link", { name: "1 Watching" }).click();
  await expect(page).toHaveURL(/\/library\?status=watching$/);
  await expect(libraryGrid.getByRole("button", { name: /Currently watching/ })).toBeVisible();
  await expect(libraryGrid.getByRole("button", { name: /Already completed/ })).toHaveCount(0);
});

test("profile shows only new episodes for current-season shows being watched", async ({ page }) => {
  const now = new Date();
  const season = ["winter", "spring", "summer", "fall"][Math.floor(now.getUTCMonth() / 3)];
  const releasedAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const tracked = [
    { ...items[0], anime: { ...anime(910, "Current watch"), status: "Currently Airing", season, year: now.getUTCFullYear() } },
    { ...items[0], anime: { ...anime(911, "Planned show"), status: "Currently Airing", season, year: now.getUTCFullYear() }, status: "plan_to_watch" },
    { ...items[0], anime: { ...anime(912, "Last season watch"), status: "Currently Airing", season: "other", year: now.getUTCFullYear() } }
  ];
  const notifications = tracked.map((item) => ({
    id: `${item.anime.id}:episode`, kind: "episode", animeId: item.anime.id,
    title: item.anime.title, imageUrl: "", releasedAt,
    trackingStatus: item.status, episodeNumber: 3
  }));
  const notificationState = { lastCheckedAt: now.toISOString(), notifications, seenSeasonIds: [] };
  await page.addInitScript(({ seedItems, state }) => {
    window.localStorage.setItem("banime:library:v1", JSON.stringify(seedItems));
    window.localStorage.setItem("banime:release-notifications:v1:local-profile", JSON.stringify(state));
  }, { seedItems: tracked, state: notificationState });
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: {
    id: "profile-episodes-user", email: "episodes@example.test", username: "Profile test",
    provider: "email", avatarId: "", bannerId: "", scoreStep: 1,
    favorites: { anime: [], characters: [], studios: [], directors: [] }
  } } }));
  await page.route("**/api/library/summary", (route) => route.fulfill({ json: { summary: {
    stats: { total: 3, watching: 2, completed: 0, episodesWatched: 3, daysWatched: 0 },
    recentItems: tracked, favoriteGenres: [], airingItems: tracked
  } } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items: tracked, total: 3 } }));
  await page.route("**/api/notifications", (route) => route.fulfill({ json: notificationState }));

  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  const newEpisodes = page.locator(".dashboard-new-episodes");
  await expect(newEpisodes.getByRole("heading", { name: "New episodes" })).toBeVisible();
  await expect(newEpisodes.getByRole("button", { name: /Current watch.*Episode 3 aired/ })).toBeVisible();
  await expect(newEpisodes.getByRole("button", { name: /Planned show/ })).toHaveCount(0);
  await expect(newEpisodes.getByRole("button", { name: /Last season watch/ })).toHaveCount(0);
});

test("profile offers one prompt when no favorites are selected", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("banime:library:v1", "[]");
    window.localStorage.setItem("banime.local-profile.v1", JSON.stringify({
      username: "Profile test", avatarId: "", bannerId: "banner-01",
      favorites: { anime: [], characters: [], studios: [], directors: [] }
    }));
  });
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: {
    user: {
      id: "empty-favorites-user", email: "empty@example.test", username: "Profile test",
      provider: "email", avatarId: "", bannerId: "", scoreStep: 1,
      favorites: { anime: [], characters: [], studios: [], directors: [] }
    }
  } }));
  await page.route("**/api/library/summary", (route) => route.fulfill({ json: { summary: {
    stats: { total: 0, watching: 0, completed: 0, episodesWatched: 0, daysWatched: 0 },
    recentItems: [], favoriteGenres: [], airingItems: []
  } } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items: [], total: 0 } }));
  await page.route("**/api/library", (route) => route.fulfill({ json: {} }));

  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".profile-favorites__empty")).toBeVisible();
  await expect(page.locator(".profile-favorites__groups")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit favorites" })).toBeVisible();
});
