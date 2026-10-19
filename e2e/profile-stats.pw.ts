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
  await expect(page.locator(".watch-journal__details strong").first()).toHaveCSS("font-size", "13px");
  await expect(page.locator(".activity-item__copy strong").first()).toHaveCSS("font-size", "13px");
  await expect(page.locator(".profile-favorites__items strong").first()).toHaveCSS("font-size", "12px");

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
