import { expect, test } from "@playwright/test";

test("anime backgrounds persist and seasonal mode restores poster rotation", async ({ page }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: {
    user: {
      id: "appearance-test-user", email: "appearance@example.test", username: "Appearance test",
      provider: "email", avatarId: "", bannerId: "", scoreStep: 1,
      favorites: { anime: [], genres: [], studios: [] }
    }
  } }));
  await page.route("**/api/library/summary", (route) => route.fulfill({ json: { summary: {} } }));
  await page.route("**/api/library?*", (route) => route.fulfill({ json: { items: [], total: 0 } }));

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  const backgrounds = page.getByRole("group", { name: "Anime-inspired background" });
  await backgrounds.getByRole("button", { name: /Attack on Titan/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-anime-theme", "aot");
  await expect(page.locator(".ambient-backdrop--anime")).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-anime-theme", "aot");
  await backgrounds.getByRole("button", { name: /One Piece/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-anime-theme", "one-piece");
  await backgrounds.getByRole("button", { name: /Seasonal/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-anime-theme", "seasonal");
  await expect(page.locator(".ambient-backdrop--anime")).toHaveCount(0);
});
