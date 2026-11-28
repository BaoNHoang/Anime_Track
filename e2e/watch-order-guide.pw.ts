import { expect, test } from "@playwright/test";

test("the detail drawer labels catalog relationships and personal tracking status", async ({ page }) => {
  const anime = (id: number, title: string, type: string) => ({
    mal_id: id, title, type, status: "Finished Airing",
    images: { jpg: { image_url: "", large_image_url: "" } }, url: `https://myanimelist.net/anime/${id}`
  });
  const season = anime(921, "First season", "TV");
  const sequel = anime(922, "Second season", "TV");
  const movie = anime(923, "The movie", "Movie");
  const special = anime(924, "The special", "Special");
  const relation = (entry: typeof season) => ({ mal_id: entry.mal_id, type: "anime", name: entry.title });
  const library = [{
    anime: {
      id: sequel.mal_id, title: sequel.title, genres: [], studios: [],
      imageUrl: "", largeImageUrl: "", url: "", synopsis: "", status: "Finished Airing", type: "TV"
    },
    status: "completed", progress: 1, notes: "", addedAt: "2026-10-01", updatedAt: "2026-10-01"
  }];
  await page.addInitScript((items) => localStorage.setItem("banime:library:v1", JSON.stringify(items)), library);
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: {
    id: "watch-order-test", email: "watch-order@example.test", username: "Watch order test",
    provider: "email", favorites: { anime: [], characters: [], studios: [], directors: [] }
  } } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items: library, total: 1 } }));
  await page.route("**/v1/**", (route) => route.fulfill({
    json: { data: [season], pagination: { current_page: 1, has_next_page: false } }
  }));
  await page.route("**/v1/anime/921/full", (route) => route.fulfill({ json: {
    data: { ...season, relations: [
      { relation: "Sequel", entry: [relation(sequel), relation(sequel), relation(season)] },
      { relation: "Side Story", entry: [relation(movie), relation(special)] },
      { relation: "Adaptation", entry: [{ mal_id: 925, type: "manga", name: "The manga" }] }
    ] }
  } }));
  await page.route("**/v1/anime/923/full", (route) => route.fulfill({ json: { data: movie } }));

  await page.goto("/");
  await page.getByRole("button", { name: "View First season", exact: true }).first().click();
  const drawer = page.getByRole("dialog");
  const guide = drawer.locator(".related-anime");
  await guide.getByText("Watch-order guide").click();
  await expect(guide.getByText("Catalog relationships do not establish a viewing order.")).toBeVisible();
  await expect(guide.getByRole("button")).toHaveCount(3);
  await expect(guide.getByRole("button", { name: /Second season/ })).toContainText("Sequel · Completed");
  await expect(guide.getByRole("button", { name: /The special/ })).toContainText("Side Story · Not in library");
  await guide.getByRole("button", { name: /The movie/ }).click();
  await expect(drawer.getByRole("heading", { name: "The movie", exact: true })).toBeFocused();
  await expect(drawer.getByText("Movie", { exact: true })).toBeVisible();
  await expect(guide).toHaveCount(0);
});
