import { expect, test } from "@playwright/test";

test("dismissed suggestions stay hidden on Home and For you until reset", async ({ page }) => {
  const library = [{
    anime: {
      id: 901, title: "Completed action show", genres: ["Action"], studios: [],
      imageUrl: "", largeImageUrl: "", url: "", synopsis: "", status: "Finished Airing", type: "TV"
    },
    status: "completed", progress: 1, notes: "", addedAt: "2026-10-01", updatedAt: "2026-10-01"
  }];
  const candidate = {
    mal_id: 902, title: "Action suggestion", type: "TV", genres: [{ name: "Action" }],
    images: { jpg: { image_url: "", large_image_url: "" } }, url: "https://myanimelist.net/anime/902"
  };
  await page.addInitScript((items) => localStorage.setItem("banime:library:v1", JSON.stringify(items)), library);
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { user: {
    id: "dismissal-test", email: "dismissal@example.test", username: "Dismissal test",
    provider: "email", favorites: { anime: [], characters: [], studios: [], directors: [] }
  } } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items: library, total: 1 } }));
  await page.route("**/v1/**", (route) => route.fulfill({
    json: { data: [candidate], pagination: { current_page: 1, has_next_page: false } }
  }));

  await page.goto("/recommendations");
  const dismissal = page.getByRole("button", { name: "Not interested in Action suggestion" });
  await dismissal.click();
  await expect(page.getByRole("button", { name: "View Action suggestion" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Reset hidden titles" })).toBeVisible();

  await page.goto("/");
  const homeRecommendations = page.locator(".recommendation-section");
  await expect(homeRecommendations.getByText("No more matches.")).toBeVisible();
  await expect(homeRecommendations.getByText("Action suggestion")).toHaveCount(0);
  await homeRecommendations.getByRole("link", { name: "Browse suggestions or reset hidden titles" }).click();
  await page.getByRole("button", { name: "Reset hidden titles" }).click();
  await expect(page.getByRole("button", { name: "View Action suggestion" })).toBeVisible();
});
